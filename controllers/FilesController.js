const { v4: uuid4 } = require('uuid');
const fs = require('fs');
const mime = require('mime-types');
const fileQueue = require('../utils/queue');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class FilesController {
  static async postUpload(req, res) {
    try {
      const xtoken = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${xtoken}`);
      const user = await dbClient.UserByid(userId);
  
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
  
      const {
        name, type, data, parentId = 0, isPublic = false,
      } = req.body;
  
      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
  
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type' });
      }
  
      if (!data && type !== 'folder') {
        return res.status(400).json({ error: 'Missing data' });
      }
  
      if (parentId !== 0) {
        const parentFile = await dbClient.FileByid(parentId);
        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }
  
      const isPublicBool = isPublic === 'true' || isPublic === true;
  
      if (type === 'folder') {
        const newFolder = await dbClient.addFile(name, userId, type, parentId, isPublicBool, null);
        return res.status(201).json({
          id: newFolder.insertedId,
          userId,
          name,
          type,
          isPublic: isPublicBool,
          parentId,
        });
      }
  
      const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
      await fs.promises.mkdir(FOLDER_PATH, { recursive: true });
      
      const FILE_NAME = uuid4();
      const localPath = path.join(FOLDER_PATH, FILE_NAME);
  
      try {
        await fs.promises.writeFile(localPath, Buffer.from(data, 'base64'));
      } catch (err) {
        console.error('Error creating file: ', err);
        return res.status(500).json({ error: 'Error creating file' });
      }
  
      const newFile = await dbClient.addFile(name, userId, type, parentId, isPublicBool, localPath);
      
      try {
        await fileQueue.add({ userId, fileId: newFile.insertedId });
      } catch (err) {
        console.error('Error queuing file processing: ', err);
      }
  
      return res.status(201).json({
        id: newFile.insertedId,
        userId,
        name,
        type,
        isPublic: isPublicBool,
        parentId,
      });
    } catch (error) {
      console.error('Internal server error: ', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // eslint-disable-next-line consistent-return
  static async getShow(req, res) {
    try {
      const xtoken = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${xtoken}`);

      // Check if user exists
      const user = await dbClient.UserByid(userId);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const Fileid = req.params.id;
      const File = await dbClient.FileByid(Fileid);

      if (!File || File.userId.toString() !== userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json({
        id: File._id.toString(),
        userId: File.userId,
        name: File.name,
        type: File.type,
        isPublic: File.isPublic,
        parentId: File.parentId,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // eslint-disable-next-line consistent-return
  static async getIndex(req, res) {
    try {
      const xtoken = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${xtoken}`);

      const user = await dbClient.UserByid(userId);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { parentId = 0, page = 0 } = req.query;
      let Files;

      if (parentId === 0) {
        Files = await dbClient.GetFiles({}, parseInt(page, 10));
      } else {
        Files = await dbClient.GetFiles({ parentId }, parseInt(page, 10));
      }
      return res.json(Files);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    const xtoken = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${xtoken}`);

    // Check if user exists
    const user = await dbClient.UserByid(userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const Fileid = req.params.id;
    const File = await dbClient.FileByid(Fileid);

    if (!File || File.userId.toString() !== userId.toString()) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.UpdateFile(Fileid, true);
    return res.status(200).json({
      id: File._id.toString(),
      userId: File.userId,
      name: File.name,
      type: File.type,
      isPublic: true,
      parentId: File.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const xtoken = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${xtoken}`);

    // Check if user exists
    const user = await dbClient.UserByid(userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const Fileid = req.params.id;
    const File = await dbClient.FileByid(Fileid);

    if (!File || File.userId.toString() !== userId.toString()) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.UpdateFile(Fileid, false);
    return res.status(200).json({
      id: File._id.toString(),
      userId: File.userId,
      name: File.name,
      type: File.type,
      isPublic: false,
      parentId: File.parentId,
    });
  }

  // eslint-disable-next-line consistent-return
  static async getFile(req, res) {
    const fileId = req.params.id;
    const size = parseInt(req.query.size, 10);

    try {
      const file = await dbClient.FileByid(fileId);
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
      }

      const filePath = size
        ? `${file.localPath}_${size}`
        : file.localPath;

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      // Read and return the file content
      const data = fs.readFileSync(filePath);
      const mimeType = mime.lookup(filePath);

      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      return res.status(200).send(data);
    } catch (error) {
      console.error('Error fetching file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = FilesController;
