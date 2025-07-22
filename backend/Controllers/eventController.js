const { createEvent, getAllEvents, getEventById, updateEventById, getPastEventsByAdmin } = require('../models/eventModel');

const createEventHandler = async (req, res) => {
  try {
    const admin_id = req.user.id;
    const admin_email = req.user.email;
    const {
      name,
      description,
      location,
      start_time,
      end_time,
      status,
      business_name,
      business_account_number,
      business_bank,
      subaccount_code
    } = req.body;

    const image = req.file ? `/Uploads/${req.file.filename}` : null;

    const event = await createEvent(
      admin_id,
      name,
      description,
      image,
      location,
      start_time,
      end_time,
      status,
      admin_email,
      business_name,
      business_account_number,
      business_bank,
    );

    res.status(201).json({ id: event.id, message: "Event created" });
    console.log(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getEventsHandler = async (req, res) => {
  try {
    const events = await getAllEvents();
    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getEventByIdHandler = async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const data = await getEventById(eventId);
    console.log('Event fetch result:', data);

    if (!data || !data.event) {
      res.status(404).json({ error: "Event not found" });
    } else {
      res.json({
        id: data.event.id,
        name: data.event.name,
        description: data.event.description,
        start_time: data.event.start_time,
        end_time: data.event.end_time,
        image: data.event.image,
        location: data.event.location,
        ticket_types: data.tickets.map(ticket => ({
          id: ticket.id,
          name: ticket.type_name,
          price: ticket.price,
          available_tickets: ticket.available_tickets
        }))
      });
    }
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateEventHandler = async (req, res) => {
  const eventId = req.params.eventId;
  const updateData = req.body;

  try {
    const updatedEvent = await updateEventById(eventId, updateData);
    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event updated successfully', event: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPastEventsHandler = async (req, res) => {
  const adminId = req.params.adminId;
  try {
    const pastEvents = await getPastEventsByAdmin(adminId);
    res.json(pastEvents);
  } catch (error) {
    console.error('Error fetching past events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createEventHandler, getEventsHandler, getEventByIdHandler, updateEventHandler, getPastEventsHandler };
