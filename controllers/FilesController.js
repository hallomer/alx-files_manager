import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name, type, isPublic = false, data, parentId = 0,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });

    if (parentId !== 0) {
      const parentFile = await dbClient.client.db().collection('files').findOne({ _id: new ObjectId(parentId), userId });
      if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const filePath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, { recursive: true });

    let localPath = null;
    if (type === 'file' || type === 'image') {
      const fileName = uuidv4();
      localPath = path.join(filePath, fileName);
      fs.writeFileSync(localPath, Buffer.from(data, 'base64'));
    }

    const newFile = {
      userId: new ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? 0 : new ObjectId(parentId),
      localPath,
    };

    const result = await dbClient.client.db().collection('files').insertOne(newFile);
    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic,
      parentId,
    });
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.client.db().collection('files').findOne({ _id: new ObjectId(req.params.id), userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.client.db().collection('files').updateOne({ _id: file._id }, { $set: { isPublic: true } });
    return res.status(200).json({ ...file, isPublic: true });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.client.db().collection('files').findOne({ _id: new ObjectId(req.params.id), userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.client.db().collection('files').updateOne({ _id: file._id }, { $set: { isPublic: false } });
    return res.status(200).json({ ...file, isPublic: false });
  }

  static async getFileData(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.client.db().collection('files').findOne({ _id: new ObjectId(req.params.id), userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    if (!file.isPublic && file.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have data' });
    }

    const data = fs.readFileSync(file.localPath, 'utf-8');
    return res.status(200).send(data);
  }
}

export default FilesController;
