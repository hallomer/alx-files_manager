// controllers/UsersController.js
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import sha1 from 'sha1';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const userExists = await dbClient.db.collection('users').findOne({ email });
    if (userExists) return res.status(400).json({ error: 'Already exist' });

    const hashedPassword = sha1(password);
    const newUser = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });

    res.status(201).json({ id: newUser.insertedId, email });
  }
}

export default UsersController;
