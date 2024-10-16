import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import fs from 'fs';
import { Queue } from 'bullmq';

const fileQueue = new Queue('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

    const fileId = uuidv4();
    const filePath = `/tmp/files_manager/${fileId}`;

    if (type !== 'folder') {
      const decodedData = Buffer.from(data, 'base64');
      fs.writeFileSync(filePath, decodedData);
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath: filePath,
    };

    await dbClient.db.collection('files').insertOne(newFile);
    res.status(201).json(newFile);
  }

  static async getShow(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { parentId = 0, page = 0 } = req.query;
    const limit = 20;
    const skip = page * limit;

    const files = await dbClient.db.collection('files')
      .find({ parentId, userId })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: true } });
    file.isPublic = true;
    res.status(200).json(file);
  }

  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic: false } });
    file.isPublic = false;
    res.status(200).json(file);
  }

  static async getFile(req, res) {
    const token = req.header('X-Token');
    const fileId = req.params.id;
    const { size } = req.query;

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    if (!file.isPublic && !token) return res.status(404).json({ error: 'Not found' });
    if (file.type === 'folder') return res.status(400).json({ error: "A folder doesn't have content" });

    let filePath = file.localPath;
    if (size && ['500', '250', '100'].includes(size)) {
      filePath = `${file.localPath}_${size}`;
    }

    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });

    const mimeType = mime.lookup(file.name);
    res.setHeader('Content-Type', mimeType);
    fs.createReadStream(filePath).pipe(res);
  }

  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

    const fileId = uuidv4();
    const filePath = `/tmp/files_manager/${fileId}`;

    if (type !== 'folder') {
      const decodedData = Buffer.from(data, 'base64');
      fs.writeFileSync(filePath, decodedData);
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
      localPath: filePath,
    };

    await dbClient.db.collection('files').insertOne(newFile);

    if (type === 'image') {
      fileQueue.add('thumbnail', { fileId: newFile._id, userId });
    }

    res.status(201).json(newFile);
  }
}

export default FilesController;
