const db = require('../config/db');
const emailQueue = require('../email-worker/queue');

const checkTicketsAvailability = async () => {
  try {
    const { rows: ticketTypes } = await db.query(`
      SELECT tt.id, tt.available_tickets, tt.type_name, tt.sold_out_notified,
             e.name AS event_name, e.admin_email
      FROM ticket_types tt
      JOIN events e ON tt.event_id = e.id
    `);

    for (const ticket of ticketTypes) {
      const { id, available_tickets, event_name, type_name, admin_email, sold_out_notified } = ticket;

      // If tickets are 0 and notification not yet sent
      if (available_tickets <= 1 && !sold_out_notified) {
        console.log(`[Monitor] Tickets sold out for ${event_name} - ${type_name}, notifying admin...`);

        // Send admin email
        await emailQueue.add({
          AdminMailOptions: {
            from: process.env.GMAIL_USER,
            to: admin_email,
            subject: `Tickets Sold Out for ${event_name}`,
            html: `
              <p>Tickets of type <strong>${type_name}</strong> for event <strong>${event_name}</strong> are sold out.</p>
              <p>Please log in to restock them.</p>
            `
          }
        });

        // Mark as notified
        await db.query(`UPDATE ticket_types SET sold_out_notified = TRUE WHERE id = $1`, [id]);
      }

      // If tickets are restocked, reset the flag
      if (available_tickets > 1 && sold_out_notified) {
        console.log(`[Monitor] Tickets restocked for ${event_name} - ${type_name}, resetting notification flag.`);
        await db.query(`UPDATE ticket_types SET sold_out_notified = FALSE WHERE id = $1`, [id]);
      }
    }

  } catch (error) {
    console.error('[Monitor] Error checking ticket availability:', error.message || error);
  }
};

// Run every minute
setInterval(checkTicketsAvailability, 60 * 1000);

// Optional: Run immediately at startup
module.exports =  checkTicketsAvailability;
