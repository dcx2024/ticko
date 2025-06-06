const db = require('../config/db');
const { getOrSetCache, invalidateCache } = require('../utils/cache');

// Create Event
const createEvent = async (name, description, image, location, start_time, end_time, status,admin_id,admin_email,business_name,business_account_number,business_bank) => {
    const result = await db.query(
        `INSERT INTO events (admin_id, name, description, image, location, start_time, end_time, status,admin_email,business_name,business_account_number,business_bank)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,$10,$11,$12) RETURNING *`,
        [ name, description, image, location, start_time, end_time, status,admin_id,admin_email,business_name,business_account_number,business_bank]
    );

    // Invalidate events list cache
    await invalidateCache('all_events');

    return result.rows[0];
};

// Get All Events
const getAllEvents = async () => {
    return getOrSetCache('all_events', 3600, async () => {
        const result = await db.query('SELECT * FROM events ORDER BY start_time ASC');
        return result.rows;
    });
   
};

// Get Event by ID
const getEventById = async (eventId) => {
    const cacheKey = `event:${eventId}`;

    return getOrSetCache(cacheKey, 3600, async () => {
        const eventResult = await db.query('SELECT * FROM events WHERE id=$1', [eventId]);
        if (eventResult.rows.length === 0) return null;

        const ticketResult = await db.query('SELECT * FROM ticket_types WHERE event_id = $1', [eventId]);

        return {
            event: eventResult.rows[0],
            tickets: ticketResult.rows
        };
    });
   
};

module.exports = { createEvent, getAllEvents, getEventById };
