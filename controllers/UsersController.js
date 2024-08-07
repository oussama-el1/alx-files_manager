/* eslint-disable consistent-return */
const crypto = require('crypto');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      const userExists = await dbClient.existUser(email);
      if (userExists) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      const result = await dbClient.addUser(email, hashedPassword);

      res.status(201).json({ id: result.insertedId, email });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred while adding the user.' });
    }
  }
}

module.exports = UsersController;
