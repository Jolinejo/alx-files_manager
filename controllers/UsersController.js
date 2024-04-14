import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');

async function postNew(req, res) {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Missing password' });
  }
  const existingUser = await dbClient.db.collection('users').findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'Already exist' });
  }
  const hashedPassword = sha1(password);
  const newUser = {
    email,
    password: hashedPassword,
  };
  const result = await dbClient.db.collection('users').insertOne(newUser);
  const { _id, email: _email } = result.ops[0];
  return res.status(201).json({ id: _id, email: _email });
}

async function getMe(req, res) {
  const token = req.header('X-Token');
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.status(200).json({ email: user.email, id: user._id });
}

module.exports = { postNew, getMe };
