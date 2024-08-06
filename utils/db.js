const { MongoClient, ObjectId } = require('mongodb');

const { env } = process;

class DBClient {
  constructor() {
    const host = env.DB_HOST || 'localhost';
    const port = env.DB_PORT || 27017;
    const database = env.DB_DATABASE || 'files_manager';

    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true });
    this.dbName = database;

    this.client.connect().catch((err) => {
      console.error('connection error [mongodb]: ', err);
    });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    return this.client.db(this.dbName).collection('users').countDocuments();
  }

  async nbFiles() {
    return this.client.db(this.dbName).collection('files').countDocuments();
  }

  db() {
    return this.client.db(this.dbName);
  }

  async UserByid(userid) {
    return this.db().collection('users').findOne({ _id: new ObjectId(userid) });
  }

  async FileByid(fileid) {
    return this.db().collection('files').findOne({ _id: new ObjectId(fileid) });
  }

  async existUser(useremail) {
    return this.db().collection('users').findOne({ email: useremail });
  }

  // eslint-disable-next-line consistent-return
  async addUser(email, password) {
    try {
      const newUser = { email, password };
      return await this.db().collection('users').insertOne(newUser);
    } catch (error) {
      console.error('Error inserting user:', error);
    }
  }

  // eslint-disable-next-line consistent-return
  async addFile(name, UserId, type, parentId, isPublic, localPath) {
    try {
      let newFile;

      if (type === 'folder') {
        newFile = {
          UserId, name, type, isPublic, parentId,
        };
      } else {
        newFile = {
          UserId, name, type, isPublic, parentId, localPath,
        };
      }
      return await this.db().collection('files').insertOne(newFile);
    } catch (error) {
      console.error('Error inserting File:', error);
    }
  }

  async GetFiles(query, page) {
    const skip = page * 20;

    const aggregationPipeline = [
      { $skip: skip },
      { $limit: 20 },
      { $addFields: { id: '$_id' } },
      {
        $project: {
          _id: 0,
          id: 1,
          userId: 1,
          name: 1,
          type: 1,
          isPublic: 1,
          parentId: 1,
        },
      },
    ];

    if (Object.keys(query).length > 0) {
      aggregationPipeline.push({ $match: query });
    }

    return this.db().collection('files').aggregate(aggregationPipeline).toArray();
  }

  async UpdateFile(FileId, statu) {
    return this.db().collection('files').updateOne({ _id: new ObjectId(FileId) }, { $set: { isPublic: statu } });
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
