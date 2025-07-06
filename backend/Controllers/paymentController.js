    const { createTicket, createTicketForAFriend } = require('../models/ticketModel');
    const { getEventById } = require('../models/eventModel');
    const {invalidateCache} = require('../utils/cache')
    const db = require('../config/db');
    require('dotenv').config();
    const https = require('https');

  

  const createSubAccount = async (req, res) => {
    const { businessName, account_number, bank, event_id } = req.body;

    if (!businessName || !account_number || !bank || !event_id) {
      return res.status(400).json({ error: "Missing Fields Required" });
    }

    try {
      const eventCheck = await db.query(
        'SELECT id FROM events WHERE id = $1',
        [event_id]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const params = JSON.stringify({
        business_name: businessName,
        account_number: account_number,
        bank_code: bank,
        percentage_charge: 4,
      });

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/subaccount',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET}`,
          'Content-Type': 'application/json',
        },
      };

      const paystackReq = https.request(options, (paystackRes) => {
        let data = '';

        paystackRes.on('data', (chunk) => {
          data += chunk;
        });

        paystackRes.on('end', async () => {
          try {
            const result = JSON.parse(data);

            if (result.status) {
              const subaccountCode = result.data.subaccount_code;

              // ✅ Save everything to the event record
              await db.query(
                `UPDATE events
                SET business_name = $1,
                    business_account_number = $2,
                    business_bank = $3,
                    subaccount_code = $4
                WHERE id = $5`,
                [businessName, account_number, bank, subaccountCode, event_id]
              );

              return res.status(200).json({
                message: 'Subaccount created and saved',
                data: result.data,
              });
            } else {
              return res.status(400).json({ error: result.message || 'Failed to create subaccount' });
            }
          } catch (parseErr) {
            console.error('Parse error:', parseErr);
            return res.status(500).json({ error: 'Error parsing Paystack response' });
          }
        });
      });

      paystackReq.on('error', (error) => {
        console.error('Paystack request error:', error);
        return res.status(500).json({ error: 'Failed to connect to Paystack' });
      });

      paystackReq.write(params);
      paystackReq.end();

    } catch (error) {
      console.error('Error during subaccount setup:', error);
      return res.status(500).json({ error: 'Server error during subaccount setup' });
    }
  };



  const initializePayment = async (req, res) => {
    const { name, email, event_id, user_id, tickets, friend_email } = req.body;

    if (!email || !event_id || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'Missing required fields or no tickets selected' });
    }

    try {
      let baseAmount = 0;

      for (const ticket of tickets) {
        const { ticket_type_id, quantity } = ticket;

        const ticketQuery = await db.query(
          'SELECT price FROM ticket_types WHERE id = $1 AND event_id = $2',
          [ticket_type_id, event_id]
        );

        if (ticketQuery.rows.length === 0) {
          return res.status(404).json({ error: `Ticket type ${ticket_type_id} not found` });
        }

        baseAmount += parseInt(ticketQuery.rows[0].price) * quantity;
      }

      const paystackAmount = baseAmount * 100; // Convert to kobo
      const paystackFee = Math.floor(0.015 * paystackAmount)=Math.floor(0.04*paystackAmount); // NGN 300 fixed
      const totalAmount = paystackAmount+ paystackFee;

      const params = JSON.stringify({
        email,
        amount: totalAmount,
        metadata: { event_id,user_id: user_id || null, tickets,name,email, ...(friend_email && { friend_email }) },
        callback_url: '/api/payment/verify/',
      });

      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: '/transaction/initialize',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET}`,
          'Content-Type': 'application/json',
        },
      };

      const apireq = https.request(options, (apires) => {
        let data = '';

        apires.on('data', (chunk) => { data += chunk; });

        apires.on('end', async () => {
          try {
            const result = JSON.parse(data);

            if (result.status && result.data.reference) {
              const reference = result.data.reference;
await db.query(
  'INSERT INTO payments ( email, name, amount, reference, event_id, user_id, friend_email, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
  [email, name, totalAmount, reference, event_id, user_id || null, friend_email || null, JSON.stringify(tickets)]
);


              res.json(result);
            } else {
              res.status(400).json({ error: 'Failed to initialize payment with Paystack' });
            }

          } catch (e) {
            console.error('Failed to parse Paystack response:', e);
            res.status(500).json({ error: 'Error processing Paystack response' });
          }
        });
      });

      apireq.on('error', (error) => {
        console.error('Payment initialization failed:', error);
        res.status(500).json({ error: 'Payment initialization failed' });
      });

      apireq.write(params);
      apireq.end();

    } catch (err) {
      console.error('Server error during payment initialization:', err);
      res.status(500).json({ error: 'Server error during payment setup' });
    }
  };


// Use this helper for updating tickets and invalidating cache
const updateAvailableTickets = async (event_id, ticket_type_id, quantity) => {
  const updateResult = await db.query(
    `UPDATE ticket_types
     SET available_tickets = available_tickets - $1
     WHERE id = $2 AND available_tickets >= $1
     RETURNING available_tickets`,
    [quantity, ticket_type_id]
  );

  if (updateResult.rows.length === 0) {
    throw new Error('Not enough tickets available or ticket type not found');
  }

  // Invalidate cache for this event's ticket types (adjust cache key if needed)
  await invalidateCache(`event:${event_id}:ticket_types`);
await invalidateCache(`event:${event_id}`)

  return updateResult.rows[0].available_tickets;
};

const verifyPayment = async (req, res) => {
  const { reference, trxref } = req.query;
  const paymentReference = reference || trxref;

  if (!paymentReference) {
    return res.status(400).json({ error: 'Reference is required' });
  }

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/transaction/verify/${encodeURIComponent(paymentReference)}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET}`,
    },
  };

  const verifyReq = https.request(options, (verifyRes) => {
    let data = '';

    verifyRes.on('data', (chunk) => { data += chunk; });

    verifyRes.on('end', async () => {
      try {
        const result = JSON.parse(data);

        if (result.status && result.data.status === 'success') {
          // Fetch payment details from DB
          const paymentResult = await db.query(
            'SELECT event_id, user_id, friend_email, name, email, metadata FROM payments WHERE reference = $1',
            [paymentReference]
          );

          if (paymentResult.rows.length === 0) {
            return res.status(400).json({ error: 'Payment not found in the database' });
          }

          const { event_id, user_id, friend_email, name, email, metadata } = paymentResult.rows[0];

          let ticketArray;
          try {
            if (typeof metadata === 'string') {
              ticketArray = JSON.parse(metadata);
            } else {
              ticketArray = metadata;
            }
          } catch (err) {
            console.error('Failed to parse ticket metadata:', err);
            return res.status(500).json({ error: 'Failed to parse ticket metadata from DB' });
          }

          const createdTickets = [];

          // Process each ticket type in the payment
          for (const ticket of ticketArray) {
            const { ticket_type_id, quantity } = ticket;

            // Double-check ticket availability in DB
            const ticketCheck = await db.query(
              'SELECT available_tickets FROM ticket_types WHERE id = $1',
              [ticket_type_id]
            );

            if (
              ticketCheck.rows.length === 0 ||
              ticketCheck.rows[0].available_tickets < quantity
            ) {
              return res.redirect('/checkout/failure.html');

              return res.status(400).json({
                error: `Not enough tickets available for ticket type ${ticket_type_id}`,
              });
            }

            // Create tickets accordingly
            let ticketResult;
            if (friend_email) {
              if (user_id) {
                // Registered user buying for friend
                ticketResult = await createTicketForAFriend(
                  event_id,
                  user_id,
                  ticket_type_id,
                  friend_email,
                  { quantity }
                );
              } else {
                // Guest buying for friend
                ticketResult = await createTicketForAFriend(
                  event_id,
                  null,
                  ticket_type_id,
                  friend_email,
                  {
                    name,
                    email,
                    quantity,
                  }
                );
              }
            } else {
              // Buying for self
              ticketResult = await createTicket(
                event_id,
                user_id || null,
                ticket_type_id,
                quantity,
                { name, email }
              );
            }

            createdTickets.push(ticketResult);

           
          }

          // Mark payment as verified
          await db.query(
            'UPDATE payments SET verified = true, verified_at = CURRENT_TIMESTAMP WHERE reference = $1',
            [paymentReference]
          );

         return res.redirect(`/checkout/success.html`);

        } else {
         return res.redirect('/checkout/failure.html');

        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        return res.status(500).json({ error: 'Error verifying payment' });
      }
    });
  });

  verifyReq.on('error', (error) => {
    console.error('Verification request error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  });

  verifyReq.end();
};



  const fetchBanks = async (req, res) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/bank',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET}`
      }
    };

    const request = https.request(options, (paystackRes) => {
      let data = '';

      paystackRes.on('data', (chunk) => {
        data += chunk;
      });

      paystackRes.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (result.status) {
  const banks = result.data.map(bank =>({
    name: bank.name,
    code: bank.code
  }))

            return res.status(200).json({status: true, banks}); // Express response
          } else {
            return res.status(400).json({ error: result.message || 'Failed to fetch banks' });
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          return res.status(500).json({ error: 'Error parsing Paystack response' });
        }
      });
    });

    request.on('error', (error) => {
      console.error('Request error:', error);
      return res.status(500).json({ error: 'Failed to connect to Paystack' });
    });

    request.end();
  };


    
    module.exports = { createSubAccount,initializePayment, verifyPayment,fetchBanks};
