const nodemailer = require('nodemailer');
const db = require('../config/db');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const emailQueue = require('../email-worker/queue');
const { finished } = require('stream');

const ticketsDir = path.join(__dirname, '../tickets');
if (!fs.existsSync(ticketsDir)) {
    fs.mkdirSync(ticketsDir, { recursive: true });
}

const createPDF = (data, filePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4' });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        const {
            event_name, name, email, typeName, price, payload, qr_code_data, isFriend
        } = data;

        const logoPath = path.resolve(__dirname, '../..', 'images/1744162770374.jpg');
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1f2937');
        doc.image(logoPath, 50, 20, { width: 100, height: 50 });

        doc.fillColor('#facc15').fontSize(22).text(`${event_name}`, 50, 80);

        doc.fillColor('#ffffff').fontSize(16)
            .text(`Name: ${name}${isFriend ? ' (for Friend)' : ''}`, 50, 120)
            .text(`Email: ${email}`, 50, 145)
            .text(`Type: ${typeName}`, 50, 170)
            .text(`Price: ₦${price}`, 50, 195)
            .text(`Reference: ${payload.slice(0, 24)}...`, 50, 220);

        doc.fillColor('#f59e0b').fontSize(12).text(`${typeName} Access`, 50, 240, { underline: true });

        doc.image(qr_code_data, doc.page.width - 180, 80, { width: 150, height: 150 });
        doc.end();

        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
};

const createTicket = async (event_id, user_id, ticket_type_id, quantity = 1,guestDetails = null) => {
  const createdTickets = [];
  try {
    // 1. Fetch event, user, ticket type info (including admin email)
    const [eventRes, typeRes] = await Promise.all([
      db.query('SELECT name, admin_email FROM events WHERE id = $1', [event_id]),

      db.query('SELECT type_name, price, available_tickets FROM ticket_types WHERE id = $1', [ticket_type_id]),
    ]);

    if (!eventRes.rows.length  || !typeRes.rows.length) {
      throw new Error('Invalid event, user or ticket type');
    }
let userName, email;
   if (user_id) {
    const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [user_id]);
    if (!userRes.rows.length) throw new Error('user not found');
    userName = userRes.rows[0].name;
    email = userRes.rows[0].email;
} else if (guestDetails && guestDetails.name && guestDetails.email) {
    userName = guestDetails.name;
    email = guestDetails.email;
} else {
    throw new Error('No user or Guest details provided');
}




    const event_name = eventRes.rows[0].name;
    const admin_email = eventRes.rows[0].admin_email;
    
    const { type_name: typeName, price, available_tickets } = typeRes.rows[0];

    // 2. Check if enough tickets available
    if (available_tickets <= 0) {
      // Notify admin sold out or low tickets
      await emailQueue.add({
        AdminMailOptions: {
          from: process.env.GMAIL_USER,
          to: admin_email,
          subject: 'Tickets Sold Out or Low',
          html: `<p>Tickets for event <strong>${event_name}</strong> are sold out or low on availability.</p><p>Please login to restock.</p>`
        }
      });
      return { status: 'error', message: 'Tickets sold out or insufficient quantity available.' };
    }

    // 3. Atomically decrement available tickets by quantity
    const { rows: updatedRows } = await db.query(
      `UPDATE ticket_types SET available_tickets = available_tickets - $1
       WHERE id = $2 AND available_tickets >= $1 RETURNING available_tickets`,
      [quantity, ticket_type_id]
    );

    if (!updatedRows.length) {
      // Failed to decrement - tickets sold out or race condition
      await emailQueue.add({
        AdminMailOptions: {
          from: process.env.GMAIL_USER,
          to: admin_email,
          subject: 'Tickets Sold Out',
          html: `<p>Tickets for event <strong>${event_name}</strong> are sold out.</p><p>Please log in to restock tickets.</p>`
        }
      });
      return { status: 'error', message: 'Sorry, tickets are sold out.' };
    }

    // 4. Generate tickets one by one
    for (let i = 0; i < quantity; i++) {
      const timestamp = Date.now();
      const payload = `${event_id}-${event_name}-${user_id}--${typeName}--${timestamp}-${i}`;
      const qr_code_data = await QRCode.toDataURL(payload);
      const filePath = path.join(ticketsDir, `ticket_${user_id}_${timestamp}_${i}.pdf`);

      await createPDF({ event_name, name: userName, email, typeName, price, payload, qr_code_data }, filePath);

      const { rows } =await db.query(
  `INSERT INTO tickets (event_id, user_id, ticket_type_id, qr_code, is_valid, guest_name, guest_email)
   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
  [event_id, user_id, ticket_type_id, qr_code_data, true, user_id ? null : userName, user_id ? null : email]
);


      createdTickets.push(rows[0]);

      const fileBuffer = fs.readFileSync(filePath);

      await emailQueue.add({
        mailOptions: {
          from: process.env.GMAIL_USER,
          to: email,
          subject: `Your Ticket for ${event_name}`,
          html: `<p>Find your <strong>${typeName}</strong> ticket for <strong>${event_name}</strong> attached.</p>`,
          attachments: [{
            filename: `ticket-${event_name}-${typeName}.pdf`,
            content: fileBuffer.toString('base64'),
            encoding: 'base64'
          }]
        }
      });

      fs.unlink(filePath, err => {
        if (err) console.error('Error deleting ticket file:', err);
      });
    }

    return createdTickets;

  } catch (error) {
    console.error('Error generating ticket:', error.message || error);
    throw error;
  }
};


const createTicketForAFriend = async (event_id, user_id, ticket_type_id, friend_email, guestDetails = null) => {
  try {
    // Get ticket type availability and event info
    const [ticketTypeRes, eventRes] = await Promise.all([
      db.query('SELECT available_tickets FROM ticket_types WHERE id = $1', [ticket_type_id]),
      db.query('SELECT admin_email, name FROM events WHERE id = $1', [event_id])
    ]);

    if (!ticketTypeRes.rows.length || !eventRes.rows.length) {
      throw new Error('Invalid ticket type or event ID');
    }

    const availableTickets = ticketTypeRes.rows[0].available_tickets;
    const admin_email = eventRes.rows[0].admin_email;
    const event_name = eventRes.rows[0].name;

    if (availableTickets <= 0) {
      // Notify admin sold out
      await emailQueue.add({
        AdminMailOptions: {
          from: process.env.GMAIL_USER,
          to: admin_email,
          subject: 'Tickets Sold Out',
          html: `<p>Tickets for event <strong>${event_name}</strong> are sold out.</p><p>Please login to restock.</p>`
        }
      });
      return { status: 'error', message: 'Sorry, tickets are sold out.' };
    }

    // Atomically decrement available tickets
    const { rows: updatedRows } = await db.query(
      `UPDATE ticket_types SET available_tickets = available_tickets - 1 
       WHERE id = $1 AND available_tickets > 0 
       RETURNING available_tickets`,
      [ticket_type_id]
    );

    if (!updatedRows.length) {
      await emailQueue.add({
        AdminMailOptions: {
          from: process.env.GMAIL_USER,
          to: admin_email,
          subject: 'Tickets Sold Out',
          html: `<p>Tickets for event <strong>${event_name}</strong> are sold out.</p><p>Please log in to restock tickets.</p>`
        }
      });
      return { status: 'error', message: 'Sorry, tickets are sold out.' };
    }

    // Fetch event and ticket type info (no need to fetch user if guest)
    const [eventInfoRes, typeRes] = await Promise.all([
      db.query('SELECT name FROM events WHERE id = $1', [event_id]),
      db.query('SELECT type_name, price FROM ticket_types WHERE id = $1', [ticket_type_id])
    ]);

    if (!eventInfoRes.rows.length || !typeRes.rows.length) {
      throw new Error('Invalid event or ticket type ID');
    }

    const event_name_final = eventInfoRes.rows[0].name;
    const { type_name: typeName, price } = typeRes.rows[0];

    // Determine buyer name and email (handle guest or registered user)
    let buyerName, buyerEmail;

    if (user_id) {
      // Registered user - fetch name and email
      const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [user_id]);
      if (!userRes.rows.length) {
        throw new Error('User not found');
      }
      buyerName = userRes.rows[0].name;
      buyerEmail = userRes.rows[0].email;
    } else if (guestDetails && guestDetails.name && guestDetails.email) {
      buyerName = guestDetails.name;
      buyerEmail = guestDetails.email;
    } else {
      throw new Error('No user or guest details provided');
    }

    const timestamp = Date.now();
    const payload = `${event_id}-${event_name_final}--${typeName}--${timestamp}`;
    const qr_code_data = await QRCode.toDataURL(payload);
    const filePath = path.join(ticketsDir, `ticket_friend_${user_id || 'guest'}_${timestamp}.pdf`);

    await createPDF({
      event_name: event_name_final,
      name: buyerName,
      email: friend_email,
      typeName,
      price,
      payload,
      qr_code_data,
      isFriend: true
    }, filePath);

    // Insert ticket into DB
    const { rows } = await db.query(
      `INSERT INTO tickets (event_id, user_id, ticket_type_id, qr_code, is_valid, guest_email, guest_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        event_id,
        user_id || null,
        ticket_type_id,
        qr_code_data,
        true,
        friend_email,
        user_id ? null : buyerName
      ]
    );

    // Send email with ticket attached
    await emailQueue.add({
      mailOptions: {
        from: process.env.GMAIL_USER,
        to: friend_email,
        subject: `Your Ticket for ${event_name_final}`,
        html: `<p>You received a <strong>${typeName}</strong> ticket for <strong>${event_name_final}</strong>!</p>`,
        attachments: [{
          filename: `ticket-${event_name_final}-${typeName}.pdf`,
          content: fs.readFileSync(filePath).toString('base64'),
          encoding: 'base64'
        }]
      }
    });

    // Clean up PDF file
    fs.unlink(filePath, err => {
      if (err) console.error('Error deleting ticket file:', err);
    });

    return rows[0];

  } catch (error) {
    console.error('Error generating ticket for friend:', error.message || error);
    throw error;
  }
};


const scanTicket = async (req, res) => {
    try {
        const { qr_code } = req.body;

        if (!qr_code) {
            return res.status(400).json({ status: false, message: 'QR code is required' });
        }

        const { rows } = await db.query(
            'SELECT id, is_valid FROM tickets WHERE qr_code = $1',
            [qr_code]
        );

        if (!rows.length) {
            return res.status(404).json({ status: false, message: 'Ticket not found' });
        }

        const ticket = rows[0];

        if (!ticket.is_valid) {
            return res.status(400).json({ status: false, message: 'Ticket has already been used or is invalid' });
        }

        await db.query(
            `UPDATE tickets 
             SET is_valid = false, scanned_at = NOW() 
             WHERE id = $1`,
            [ticket.id]
        );

        return res.json({ status: true, message: 'Ticket successfully validated' });

    } catch (error) {
        console.error('Error scanning ticket:', error.message || error);
        return res.status(500).json({ status: false, message: 'Internal server error' });
    }
};

module.exports = { createTicket, createTicketForAFriend, scanTicket };
