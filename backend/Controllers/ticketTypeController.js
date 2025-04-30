const {createTicketById,getAllTicketsById} = require('../models/ticketTypesModel')


    const createTicketByIdHandler = async(req, res) => {
        const { event_id, type_name, price, available_tickets } = req.body;
     
        if (!event_id || !type_name || !price || !available_tickets) {
            console.error('Missing required fields:', { event_id, type_name, price, available_tickets });
            return res.status(400).json({ status: false, message: 'Missing required fields' });
        }
        try {
            const ticketType = await createTicketById(event_id, type_name, price, available_tickets);
            res.status(201).json({ status: true, message: "Ticket Type created" });  
        } catch (error) {
            console.error('Server error:', error);
            res.status(500).json({ status: false, error: error.message });
        }
     }
     

const getAllTicketsByIdHandler = async(req,res)=>{
    const eventId = req.params.eventId;
    if(!eventId){
        console.error('Missing required fields',{eventId})
        return res.status(400).json({ status: false, message: 'Missing required fields' });
    }
    try{
        const ticketType = await getAllTicketsById(eventId)
        res.status(201).json({message: "Tickets fetched successfully",
            data:ticketType
        })
    }catch(error){
        res.status(500).json({error: error})
    }
}

module.exports= {createTicketByIdHandler,getAllTicketsByIdHandler}