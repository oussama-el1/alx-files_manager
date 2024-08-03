/* eslint-disable consistent-return */
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

function hashPassword(password) {
  return crypto.createHash('sha1').update(password).digest('hex');
}

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decodeToken = Buffer.from(token, 'base64').toString('utf-8');
    const [email, password] = decodeToken.split(':');

    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const User = await dbClient.existUser(email);

    if (User.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const signInToken = uuidv4();
    await redisClient.set(`auth_${signInToken}`, User._id.toString(), 86400);
    return res.status(200).json({ token: signInToken });
  }

  static async getDisconnect(req, res) {
    const xToken = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${xToken}`);

    console.log(xToken);
    console.log(userId);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(`auth_${xToken}`);
    return res.status(204).end();
  }

  static async getMe(req, res) {
    const xToken = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${xToken}`);
    const user = await dbClient.UserByid(userId);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ id: user._id, email: user.email });
  }
}

module.exports = AuthController;
