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

// Update event details by ID
const updateEventById = async (eventId, updateData) => {
  const {
    name,
    description,
    location,
    start_time,
    end_time,
    status,
    business_name,
    business_account_number,
    business_bank
  } = updateData;

  const result = await db.query(
    `UPDATE events SET
      name = $1,
      description = $2,
      location = $3,
      start_time = $4,
      end_time = $5,
      status = $6,
      business_name = $7,
      business_account_number = $8,
      business_bank = $9,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $10
    RETURNING *`,
    [name, description, location, start_time, end_time, status, business_name, business_account_number, business_bank, eventId]
  );

  return result.rows[0];
};

// Get past events by admin ID (events with end_time in the past)
const getPastEventsByAdmin = async (adminId) => {
  const result = await db.query(
    `SELECT id, name, start_time, end_time, status, admin_email, business_name, business_account_number, business_bank
     FROM events
     WHERE admin_id = $1 AND end_time < NOW()
     ORDER BY end_time DESC`,
    [adminId]
  );
  return result.rows;
};



module.exports = { createEvent, getAllEvents, getEventById, updateEventById, getPastEventsByAdmin };

