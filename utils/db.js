const { MongoClient } = require('mongodb');

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
}

const dbClient = new DBClient();
module.exports = dbClient;
