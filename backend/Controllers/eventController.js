
const {createEvent,getAllEvents,getEventById} = require('../models/eventModel')

const createEventHandler = async (req, res) => {
    try {
        const admin_id = req.user.id; // assumes authentication middleware sets req.user
        const { name, description, date, location, start_time, end_time, status } = req.body;
        const image = req.file ? req.file.path : null;

        const event = await createEvent(admin_id, name, description, date, image, location, start_time, end_time, status);
        res.status(201).json({ id: event.id, message: "Event created" });
        console.log(event);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};


const getEventsHandler = async(req,res)=>{
    try{
        const events = await getAllEvents();
        res.json(events)
    }catch(error){
        console.error(err)
        res.status(500).json({error: error.message})
    }
}

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
                date: data.event.date,
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


module.exports = {createEventHandler, getEventsHandler,getEventByIdHandler}


