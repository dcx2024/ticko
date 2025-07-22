const express = require('express')
const router = express.Router()
const {createEventHandler, getEventsHandler,getEventByIdHandler,updateEventHandler,getPastEventsHandler} = require('../Controllers/eventController')
const { updateTicketsByEventId, getTicketsByEventId } = require('../models/ticketModel');
const {userAuth, adminAuth} = require('../authMIddleWare/authMiddleware')
const fileUpload = require('../fileUpload/fupload')

router.post('/createEvents',userAuth,adminAuth,fileUpload.single('image'), createEventHandler)
router.get('/getEvents',getEventsHandler)
router.get('/:eventId',getEventByIdHandler)
router.put('/update/:eventId', updateEventHandler);
router.get('/past/:adminId',adminAuth, getPastEventsHandler);

router.get('/:eventId/tickets', userAuth, adminAuth, async (req, res) => {
  try {
    const tickets = await getTicketsByEventId(req.params.eventId);
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update tickets for an event
router.put('/:eventId/tickets', userAuth, adminAuth, async (req, res) => {
  const eventId = req.params.eventId;
  const { tickets } = req.body;
  if (!tickets || !Array.isArray(tickets)) {
    return res.status(400).json({ error: 'Invalid tickets data' });
  }
  try {
    await updateTicketsByEventId(eventId, tickets);
    res.json({ message: 'Tickets updated successfully' });
  } catch (error) {
    console.error('Error updating tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



module.exports = router