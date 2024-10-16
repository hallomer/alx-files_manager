import { Worker } from 'bullmq';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

// eslint-disable-next-line no-new
new Worker('fileQueue', async (job) => {
  const { fileId, userId } = job.data;
  const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });

  if (!file) throw new Error('File not found');

  const filePath = file.localPath;
  const sizes = [500, 250, 100];

  await Promise.all(sizes.map(async (size) => {
    const thumbnail = await imageThumbnail(filePath, { width: size });
    const thumbnailPath = `${filePath}_${size}`;
    fs.writeFileSync(thumbnailPath, thumbnail);
  }));
});
