const client = require('../config/redis');

// Get from cache or set if not found
const getOrSetCache = async (key, ttl, fetchFunction) => {
    try {
        const cachedData = await client.get(key);
        if (cachedData) {
            console.log(`From Redis Cache: ${key}`);
            return JSON.parse(cachedData);
        }

        // Fetch fresh data
        const freshData = await fetchFunction();

        // Store in Redis
        await client.setEx(key, ttl, JSON.stringify(freshData));

        return freshData;
    } catch (error) {
        console.error(`Redis error: ${error.message}`);
        // Fallback to DB on error
        return await fetchFunction();
    }
};

// Delete cache (for invalidation)
const invalidateCache = async (key) => {
    try {
        await client.del(key);
    } catch (error) {
        console.error(`Cache deletion error: ${error.message}`);
    }
};

module.exports = { getOrSetCache, invalidateCache };
