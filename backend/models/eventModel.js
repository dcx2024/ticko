const db = require('../config/db');

// Create Event
const createEvent = async (admin_id, name, description, image, location, start_time, end_time, status, admin_email, business_name, business_account_number, business_bank) => {
  const result = await db.query(
    `INSERT INTO events (admin_id, name, description, image, location, start_time, end_time, status, admin_email, business_name, business_account_number, business_bank)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [admin_id, name, description, image, location, start_time, end_time, status, admin_email, business_name, business_account_number, business_bank]
  );

  return result.rows[0];
};

// Get All Events
const getAllEvents = async () => {
  const result = await db.query('SELECT * FROM events ORDER BY start_time ASC');
  return result.rows;
};

// Get Event by ID
const getEventById = async (eventId) => {
  const eventResult = await db.query('SELECT * FROM events WHERE id=$1', [eventId]);
  if (eventResult.rows.length === 0) return null;

  const ticketResult = await db.query('SELECT * FROM ticket_types WHERE event_id = $1', [eventId]);

  return {
    event: eventResult.rows[0],
    tickets: ticketResult.rows
  };
};

module.exports = { createEvent, getAllEvents, getEventById };
