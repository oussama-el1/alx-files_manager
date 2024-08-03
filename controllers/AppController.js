const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static getStatus(req, res) {
    res.status(200).json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static async getStats(req, res) {
    const usersNb = await dbClient.nbUsers();
    const filesNb = await dbClient.nbFiles();
    res.status(200).json({ users: usersNb, files: filesNb });
  }
}

module.exports = AppController;
