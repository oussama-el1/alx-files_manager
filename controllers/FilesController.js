const { v4: uuid4 } = require('uuid');
const fs = require('fs');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const AcceptedTypes = ['folder', 'file', 'image'];

const createDirIfNotexists = async (dir) => {
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
};

const WriteDataToFile = async (dir, file, Base64Data) => {
  await createDirIfNotexists(dir);
  const binaryData = Buffer.from(Base64Data, 'base64');
  await fs.promises.writeFile(file, binaryData);
};

class FilesController {
  static async postUpload(req, res) {
    const xtoken = req.headers['x-token'];
    const UserId = await redisClient.get(`auth_${xtoken}`);
    const user = await dbClient.UserByid(UserId);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, data,
    } = req.body;

    let isPublic;
    let parentId;

    if (!req.body.parentId) {
      parentId = 0;
    } else {
      parentId = req.body.parentId;
    }

    if (!req.body.isPublic) {
      isPublic = false;
    } else {
      isPublic = req.body.isPublic;
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !AcceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId) {
      const parentFile = await dbClient.FileByid(parentId);
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    if (type === 'folder') {
      const newFolder = await dbClient.addFile(name, UserId, type, parentId, isPublic, null);
      return res.status(201).json({
        id: newFolder.insertedId,
        userId: UserId,
        name,
        type,
        isPublic,
        parentId,
      });
    }

    const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
    const FILE_NAME = uuid4();
    const localPath = `${FOLDER_PATH}/${FILE_NAME}`;

    await WriteDataToFile(FOLDER_PATH, localPath, data)
      .then(() => console.log('File Created succesfuly'))
      .catch((err) => console.error('error creating File: ', err));

    const newFile = await dbClient.addFile(name, UserId, type, parentId, isPublic, localPath);
    return res.status(201).json({
      id: newFile.insertedId,
      userId: UserId,
      name,
      type,
      isPublic,
      parentId,
    });
  }
}

module.exports = FilesController;
