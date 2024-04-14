import sha1 from 'sha1';
import dbClient from '../utils/db';

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
    return res.status(400).json({ error: 'Email already exists' });
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

module.exports = { postNew };
