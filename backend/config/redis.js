const redis = require('redis');

// Create Redis client
const client = redis.createClient();

// Handle Redis connection
client.connect()
  .then(() => console.log('Connected to Redis'))
  .catch((error) => console.error('Redis connection error:', error));


module.exports = client;
