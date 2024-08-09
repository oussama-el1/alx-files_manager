/* eslint-disable consistent-return */
import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.log(`Redis Error : ${err.message || err.toString()}`));
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const asynget = promisify(this.client.GET).bind(this.client);

    try {
      const value = await asynget(key);
      return value;
    } catch (err) {
      console.error(`Error ${err.message || err.toString()} Redis while Get the key : ${key}`);
    }
  }

  async set(key, val, expire) {
    const asynset = promisify(this.client.SETEX).bind(this.client);

    try {
      await asynset(key, expire, val);
    } catch (err) {
      console.error(`Error ${err.message || err.toString()} Redis while SET the key : ${key}`);
    }
  }

  async del(key) {
    const asyncdel = promisify(this.client.DEL).bind(this.client);

    try {
      await asyncdel(key);
    } catch (err) {
      console.error(`Error ${err.message || err.toString()} Redis while DEL the key : ${key}`);
    }
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
