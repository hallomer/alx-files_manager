import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const b64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(b64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');
    const hashedPassword = sha1(password);

    const user = await dbClient.client.db().collection('users').findOne({ email, password: hashedPassword });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const token = uuidv4();
    await redisClient.set(`auth_${token}`, user._id.toString(), 86400);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

export default AuthController;
