/* eslint-disable consistent-return */
const crypto = require('crypto');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    try {
      const { email, password } = req.body;

      // Check if email is provided
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }

      // Check if password is provided
      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      // Check if user already exists
      const userExists = await dbClient.existUser(email);
      if (userExists) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Hash the password
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      // Add new user to the database
      const result = await dbClient.addUser(email, hashedPassword);

      // Respond with the new user's ID and email and status code 201
      res.status(201).json({ id: result.insertedId, email });
    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: 'An error occurred while adding the user.' });
    }
  }
}

module.exports = UsersController;
