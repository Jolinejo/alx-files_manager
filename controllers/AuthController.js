import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const { v4: uuidv4 } = require('uuid');
const sha1 = require('sha1');

async function getConnect(req, res) {
  const authHeader = req.headers.authorization;
  const encodedCredentials = authHeader.split(' ')[1];
  const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString();
  console.log(decodedCredentials);
  const [email, password] = decodedCredentials.split(':');
  console.log(email);
  console.log(password);
  if (!email || !password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const hashedPassword = sha1(password);
  const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const authToken = uuidv4();
  redisClient.set(`auth_${authToken}`, user._id, 24 * 60 * 60);
  return res.status(200).json({ token: authToken });
}

async function getDisconnect(req, res) {
  const token = req.header('X-Token');
  const key = `auth_${token}`;
  const id = await redisClient.get(key);
  if (id) {
    await redisClient.del(key);
    return res.status(204).json({});
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { getConnect, getDisconnect };
