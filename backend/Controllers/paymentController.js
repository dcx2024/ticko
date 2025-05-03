  const { createTicket, createTicketForAFriend } = require('../models/ticketModel');
  const db = require('../config/db');
  require('dotenv').config();
  const https = require('https');

  const initializePayment = async (req, res) => {
    const { email, event_id, user_id, ticket_type_id, friend_email, quantity } = req.body;

    // Validate required fields
    if (!email || !event_id || !user_id || !ticket_type_id || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: email, event_id, user_id, ticket_type_id, quantity' });
    }

    try {
      // Retrieve ticket price
      const ticketQuery = await db.query(
        'SELECT price FROM ticket_types WHERE id = $1 AND event_id = $2',
        [ticket_type_id, event_id]
      );

      if (ticketQuery.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket type not found for this event' });
      }

      let baseAmount = parseInt(ticketQuery.rows[0].price)* quantity * 100; // Paystack expects the amount in kobo
      let paystackFee = Math.floor((0.015 * baseAmount) + 30000); // Paystack fee of 1.5% + a fixed fee of 300 NGN
      let amount = baseAmount  + paystackFee;

      const params = JSON.stringify({
        email: email,
        amount: amount, // Paystack expects the amount in kobo
        metadata: { event_id, user_id, ticket_type_id, quantity, ...(friend_email && { friend_email }) },
        callback_url: 'http://localhost:3000/api/payment/verify/',
        transaction_charge : baseAmount,
        //subaccount:
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

              // Insert payment details into the database
              await db.query(
                'INSERT INTO payments (email, amount, reference, event_id, user_id, ticket_type_id, friend_email, quantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [email, amount, reference, event_id, user_id, ticket_type_id, friend_email || null, quantity]
              );

              res.json(result); // Return the Paystack initialization response
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

  const createSubAccount = async(req,res)=>{
    const {businessName, account_number,bank,event_id}=req.body

if(!businessName || !account_number || !bank|| !event_id){
  return res.status(400).json({error:"Missing Fields Required"})
}

try{
  const businessDetails = await db.query('SELECT event_name,account_number,bank FROM events WHERE id=$1',[event_id])

  if(businessDetails.rows.length===0){
    return res.status(404).json({ error: 'Business details not found for this event' });
  }

    const params = JSON.stringify({
      "business_name": businessName,
      "bank": bank,
      "account_number": account_number,
      
    })
    
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/subaccount',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_TEST_SECRET}`,
        'Content-Type': 'application/json'
      }
    }
    
    const subReq = https.request(options, res => {
      let data = ''
    
      res.on('data', (chunk) => {
        data += chunk
      });
    
      res.on('end', () => {
        console.log(JSON.parse(data))
      })
    }).on('error', error => {
      console.error(error)
    })
    
    subReq.write(params)
    subReq.end()
  
} catch (error) {
  console.error('Error during subaccount setup:', error);
  res.status(500).json({ error: 'Server error during subaccount setup' });
}
  }
  const verifyPayment = async (req, res) => {
    console.log('⚡ Verify route hit!');

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
            // Fetch payment record from database
            const paymentResult = await db.query(
              'SELECT event_id, user_id, ticket_type_id, friend_email, quantity FROM payments WHERE reference = $1',
              [paymentReference]
            );

            if (paymentResult.rows.length === 0) {
              return res.status(400).json({ error: 'Payment not found in the database' });
            }

            const { event_id, user_id, ticket_type_id, friend_email, quantity } = paymentResult.rows[0];

            let tickets;

            // Create tickets for the user or their friend
            if (friend_email) {
              tickets = await createTicketForAFriend(event_id, user_id, ticket_type_id, friend_email, quantity);
            } else {
              tickets = await createTicket(event_id, user_id, ticket_type_id, quantity);
            }

            // Update ticket quantity after successful payment
            await db.query(
              'UPDATE ticket_types SET available_tickets = available_tickets - $1 WHERE id = $2',
              [quantity, ticket_type_id]
            );

            // Mark payment as verified
            await db.query(
              'UPDATE payments SET verified = true, verified_at = CURRENT_TIMESTAMP WHERE reference = $1',
              [paymentReference]
            );

            res.json({
              status: 'success',
              message: 'Payment verified and tickets created.',
              tickets,
            });

          } else {
            res.status(400).json({ error: 'Payment failed or pending' });
          }

        } catch (err) {
          console.error('Error verifying payment:', err);
          res.status(500).json({ error: 'Error verifying payment' });
        }
      });
    });

    verifyReq.on('error', (error) => {
      console.error('Verification request error:', error);
      res.status(500).json({ error: 'Payment verification failed' });
    });

    verifyReq.end();
  };


  

  module.exports = { initializePayment, verifyPayment };
