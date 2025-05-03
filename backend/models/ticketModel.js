const nodemailer = require('nodemailer');
const db = require('../config/db');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const emailQueue = require('../email-worker/queue');

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

const createTicket = async (event_id, user_id, ticket_type_id, quantity = 1) => {
    const createdTickets = [];

    try {
        const [eventResult, userNameResult, userEmailResult, typeResult] = await Promise.all([
            db.query('SELECT name,admin_email FROM events WHERE id = $1', [event_id]),
            db.query('SELECT name FROM users WHERE id = $1', [user_id]),
            db.query('SELECT email FROM users WHERE id = $1', [user_id]),
            db.query('SELECT type_name, price, available_tickets FROM ticket_types WHERE id = $1', [ticket_type_id]),
        ]);

        if (
            !eventResult.rows.length || !userEmailResult.rows.length ||
            !typeResult.rows.length || !userNameResult.rows.length
        ) throw new Error('Invalid event, user, or ticket type ID');

        const event_name = eventResult.rows[0].name;
        const userName = userNameResult.rows[0].name;
        const email = userEmailResult.rows[0].email;
        const admin_email = eventResult.rows[0].admin_email;
        console.log(admin_email)
        const { type_name: typeName, price, available_tickets: availableTicketsRaw } = typeResult.rows[0];
        let availableTickets = availableTicketsRaw;

        for (let i = 0; i < quantity; i++) {
            if (availableTickets <= 0) throw new Error('Sorry, tickets are sold out.');

            const timestamp = Date.now();
            const payload = `${event_id}-${event_name}-${user_id}--${typeName}--${timestamp}-${i}`;
            const qr_code_data = await QRCode.toDataURL(payload);
            const filePath = path.join(ticketsDir, `ticket_${user_id}_${timestamp}_${i}.pdf`);

            await createPDF({ event_name, name: userName, email, typeName, price, payload, qr_code_data }, filePath);

            const { rows } = await db.query(
                'INSERT INTO tickets (event_id, user_id, ticket_type_id, qr_code, is_valid) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [event_id, user_id, ticket_type_id, qr_code_data, true]
            );

            createdTickets.push(rows[0]);

            // Add email job to queue
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
            

            fs.unlink(filePath, err => {
                if (err) console.error('Error deleting ticket file:', err);
            });

            availableTickets--;
        }

        await db.query('UPDATE ticket_types SET available_tickets = $1 WHERE id = $2', [availableTickets, ticket_type_id]);

        if (availableTickets === 0) {
            await emailQueue.add({
                AdminMailOptions: {
                    from: process.env.GMAIL_USER,
                    to: admin_email,
                    subject: 'Tickets Sold Out',
                    html: `<p>Tickets for event ID ${event_id} are sold out.</p>`
                }
            });
        }

        return createdTickets;

    } catch (error) {
        console.error('Error generating ticket:', error.message || error);
        throw error;
    }
};

const createTicketForAFriend = async (event_id, user_id, ticket_type_id, friend_email) => {
    try {
        const { rows: typeRows } = await db.query('SELECT available_tickets FROM ticket_types WHERE id = $1', [ticket_type_id]);
        if (!typeRows.length || typeRows[0].available_tickets <= 0) {
            await emailQueue.add({
                AdminMailOptions: {
                    from: process.env.GMAIL_USER,
                    to: admin_email,
                    subject: 'Tickets Sold Out',
                    html: `<p>Tickets for event ID ${event_id} are sold out.</p>`
                }
            });
            return { status: 'error', message: 'Sorry, tickets are sold out.' };
        }

        const [eventRes, buyerRes, typeRes] = await Promise.all([
            db.query('SELECT name FROM events WHERE id = $1', [event_id]),
            db.query('SELECT name FROM users WHERE id = $1', [user_id]),
            db.query('SELECT type_name, price FROM ticket_types WHERE id = $1', [ticket_type_id]),
        ]);

        if (!eventRes.rows.length || !buyerRes.rows.length || !typeRes.rows.length)
            throw new Error('Invalid event, user, or ticket type ID');

        const event_name = eventRes.rows[0].name;
        const buyerName = buyerRes.rows[0].name;
        const { type_name: typeName, price } = typeRes.rows[0];

        const timestamp = Date.now();
        const payload = `${event_id}-${event_name}--${typeName}--${timestamp}`;
        const qr_code_data = await QRCode.toDataURL(payload);
        const filePath = path.join(ticketsDir, `ticket_friend_${user_id}_${timestamp}.pdf`);

        await createPDF({
            event_name, name: buyerName, email: friend_email, typeName, price, payload, qr_code_data, isFriend: true
        }, filePath);

        const { rows } = await db.query(
            'INSERT INTO tickets (event_id, user_id, ticket_type_id, qr_code, is_valid, guest_email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [event_id, user_id, ticket_type_id, qr_code_data, true, friend_email]
        );

        await emailQueue.add({
            mailOptions: {
                from: process.env.GMAIL_USER,
                to: email,
                subject: `Your Ticket for ${event_name}`,
                html: `<p>Find your <strong>${typeName}</strong> ticket for <strong>${event_name}</strong> attached.</p>`,
                attachments: [{
                    filename: `ticket-${event_name}-${typeName}.pdf`,
                    content: fs.readFileSync(filePath),
                    encoding: 'base64'
                }]
            }
        });
        
        fs.unlink(filePath, err => {
            if (err) console.error('Error deleting ticket file:', err);
        });
        

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
        const { rows } = await db.query('SELECT * FROM tickets WHERE qr_code = $1', [qr_code]);

        if (!rows.length) {
            return res.status(404).json({ status: false, message: 'Ticket not found' });
        }

        const ticket = rows[0];
        if (!ticket.is_valid) {
            return res.status(400).json({ status: false, message: 'Ticket already used' });
        }

        await db.query('UPDATE tickets SET is_valid = false WHERE id = $1', [ticket.id]);
        return res.json({ status: true, message: 'Ticket validated' });

    } catch (error) {
        console.error('Error scanning ticket:', error.message || error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
};

module.exports = { createTicket, createTicketForAFriend, scanTicket };
