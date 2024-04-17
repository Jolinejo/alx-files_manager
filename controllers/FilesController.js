import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

async function postUpload(req, res) {
  const token = req.header('X-Token');
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const {
    name, type, parentId = 0, isPublic = false, data,
  } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }
  if (!type || !['folder', 'file', 'image'].includes(type)) {
    return res.status(400).json({ error: 'Missing type' });
  }
  if (!data && type !== 'folder') {
    return res.status(400).json({ error: 'Missing data' });
  }
  if (parentId !== 0) {
    const parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
    if (!parentFile) {
      return res.status(400).json({ error: 'Parent not found' });
    }
    if (parentFile.type !== 'folder') {
      return res.status(400).json({ error: 'Parent is not a folder' });
    }
  }
  if (type === 'folder') {
    const newFolder = {
      userId,
      name,
      type,
      parentId,
      isPublic,
    };
    const result = await dbClient.db.collection('files').insertOne(newFolder);
    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      parentId,
      isPublic,
    });
  }
  const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
  const fileName = uuidv4();
  const localPath = path.join(folderPath, fileName);
  const buff = Buffer.from(data, 'base64');
  await fs.promises.mkdir(folderPath, { recursive: true });
  await fs.promises.writeFile(localPath, buff);
  const newFile = {
    userId,
    name,
    type,
    isPublic,
    parentId,
    localPath,
  };
  const result = await dbClient.db.collection('files').insertOne(newFile);
  return res.status(201).json({
    id: result.insertedId,
    userId,
    name,
    type,
    parentId,
    isPublic,
  });
}

async function getShow(req, res) {
  const token = req.header('X-Token');

  const key = `auth_${token}`;
  const userIdString = await redisClient.get(key);
  if (!userIdString) return res.status(401).json({ error: 'Unauthorized' });

  const userId = new ObjectId(userIdString);
  const fileId = req.params.id;
  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });

  if (!file) return res.status(404).json({ error: 'Not found' });

  return res.json(file);
}

async function getIndex(req, res) {
  const token = req.header('X-Token');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const key = `auth_${token}`;
  const userIdString = await redisClient.get(key);
  if (!userIdString) return res.status(401).json({ error: 'Unauthorized' });

  const userId = ObjectId(userIdString);
  const parentId = req.query.parentId ? ObjectId(req.query.parentId) : '0';
  const page = parseInt(req.query.page, 10) || 0;
  const itemsPerPage = 20;

  const pipeline = [
    {
      $match: { userId, parentId },
    },
    {
      $skip: page * itemsPerPage,
    },
    {
      $limit: itemsPerPage,
    },
  ];

  const files = await dbClient.db.collection('files').aggregate(pipeline).toArray();
  const result = files.map(({ _id, ...rest }) => ({
    ...rest,
    id: _id,
  }));

  return res.json(result);
}

async function putPublish(req, res) {
  const token = req.header('X-Token');

  const key = `auth_${token}`;
  const userIdString = await redisClient.get(key);
  if (!userIdString) return res.status(401).json({ error: 'Unauthorized' });
  const userId = ObjectId(userIdString);
  const fileId = req.params.id;
  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });

  if (!file) return res.status(404).json({ error: 'Not found' });

  await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });

  const newFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
  return res.status(200).json(newFile);
}

async function putUnpublish(req, res) {
  const token = req.header('X-Token');
  const key = `auth_${token}`;
  const userIdString = await redisClient.get(key);
  if (!userIdString) return res.status(401).json({ error: 'Unauthorized' });
  const userId = ObjectId(userIdString);
  const fileId = req.params.id;
  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });

  if (!file) return res.status(404).json({ error: 'Not found' });

  await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });

  const newFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
  return res.status(200).json(newFile);
}

module.exports = {
  postUpload, getIndex, getShow, putPublish, putUnpublish,
};
