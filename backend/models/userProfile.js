// models/userModel.js
const db = require('../config/db'); // Assuming you're using PostgreSQL connection pool

// Get user info by user ID
const getUserById = async (userId) => {
  const result = await db.query('SELECT name, email FROM users WHERE id = $1', [userId]);
  return result.rows[0]; // Assuming only one user returned
};

// Get user's purchased tickets (sorted by purchased_at)
const getUserTickets = async (userId) => {
  const result = await db.query('SELECT * FROM tickets WHERE user_id = $1 ORDER BY purchased_at DESC LIMIT 5', [userId]);
  return result.rows;
};

// Get user's favorite events
const getUserFavourites = async (userId) => {
  const result = await db.query('SELECT * FROM favourites WHERE user_id = $1', [userId]);
  return result.rows;
};

const getEventName = async(userId)=>{
    const result = await db.query('SELECT events.name AS event_name FROM tickets JOIN events ON tickets.event_id = events.id WHERE tickets.user_id= $1',[userId])
return result.rows;
}

const deleteUser = async(id)=>{
  const result = await db.query('DELETE * FROM users WHERE id=$1',[id])
  return result.rowCount >0;
}
module.exports = {
  getUserById,
  getUserTickets,
  getUserFavourites,
  getEventName,
  deleteUser
};
