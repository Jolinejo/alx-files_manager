import dbClient from '../utils/db';
import redisClient from '../utils/redis';

function getStatus(req, res) {
  const dbStatus = dbClient.isAlive();
  const redisClientStatus = redisClient.isAlive();
  res.json({ redis: redisClientStatus, db: dbStatus });
}

async function getStats(req, res) {
  const users = await dbClient.nbUsers();
  const files = await dbClient.nbFiles();
  res.json({ users, files });
}

module.exports = { getStatus, getStats };
