import { Queue, Worker } from 'bullmq';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

const worker = new Worker('fileQueue', async (job) => {
  const { fileId, userId } = job.data;
  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });
  
  if (!file) throw new Error('File not found');

  const filePath = file.localPath;
  const sizes = [500, 250, 100];

  for (const size of sizes) {
    const thumbnail = await imageThumbnail(filePath, { width: size });
    const thumbnailPath = `${filePath}_${size}`;
    fs.writeFileSync(thumbnailPath, thumbnail);
  }
});
