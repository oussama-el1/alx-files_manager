const Queue = require('bull');

const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');

module.exports = fileQueue;
