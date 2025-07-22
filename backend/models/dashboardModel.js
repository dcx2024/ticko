const db = require('../config/db');

const getTotalSales = async (event_id) => {
    const result = await db.query(
        'SELECT SUM(amount) AS total FROM payments WHERE verified = true AND event_id = $1',
        [event_id]
    );
    return result.rows[0].total;
};

const getTotalTicketSales = async (event_id) => {
    const result = await db.query(
        'SELECT COUNT(*) AS total FROM tickets WHERE event_id = $1',
        [event_id]
    );
    return result.rows[0].total;
};

const getStandardTicket = async (event_id, type_name) => {
    const result = await db.query(
        'SELECT type_name, available_tickets FROM ticket_types WHERE event_id = $1 AND type_name = $2',
        [event_id, type_name]
    );
    return result.rows[0];
};

const getEventFromOwner = async (admin_id) => {
    const result = await db.query(
        'SELECT id FROM events WHERE admin_id = $1',
        [admin_id]
    );

    // Check if the event exists
    if (result.rows.length > 0) {
        return result.rows[0].id; // Return the event ID
    } else {
        return null; // Return null if no event is found
    }
};

const getTicketTypeBreakdown = async (event_id) => {
    const result = await db.query(`
        SELECT 
            tt.type_name,
            tt.available_tickets,
            COUNT(t.id) AS sold_tickets
        FROM ticket_types tt
        LEFT JOIN tickets t ON t.ticket_type_id = tt.id
        WHERE tt.event_id = $1
        GROUP BY tt.id
    `, [event_id]);

    return result.rows;
};

const getRecentTransactions = async (event_id) => {
  try {
    const result = await db.query(`
      SELECT 
        p.name,
        p.email,
        p.quantity,
        p.amount AS total_price,
        p.verified_at AS purchase_date,
        tt.type_name AS ticket_type
      FROM payments p
      LEFT JOIN ticket_types tt ON p.ticket_type_id = tt.id
      WHERE p.event_id = $1
        AND p.verified = true
      ORDER BY p.verified_at DESC
      LIMIT 10
    `, [event_id]);

    return result.rows;  // Return the array of rows
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    throw error;  // Let the controller handle the error
  }
};



module.exports = {
    getTotalSales,
    getTotalTicketSales,
    getStandardTicket,
    getEventFromOwner,
    getTicketTypeBreakdown,
    getRecentTransactions
};

