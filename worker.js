const imageThumbnail = require('image-thumbnail');
const fs = require('fs');

const fileQueue = require('./utils/queue');
const dbClient = require('./utils/db');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.FileByid(fileId);

  if (!file || file.userId.toString() !== userId.toString()) {
    throw new Error('File not found');
  }

  const filePath = file.localPath;

  try {
    const sizes = [500, 250, 100];
    for (const size of sizes) {
      // eslint-disable-next-line no-await-in-loop
      const thumbnail = await imageThumbnail(filePath, { width: size });
      const thumbnailPath = `${filePath}_${size}`;
      fs.writeFileSync(thumbnailPath, thumbnail);
    }

    console.log('Thumbnails generated successfully');
  } catch (err) {
    console.error('Error generating thumbnails:', err);
    throw err;
  }
});
