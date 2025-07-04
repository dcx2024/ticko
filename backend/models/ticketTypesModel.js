const db = require('../config/db')
const { getOrSetCache,invalidateCache } = require('../utils/cache')

const createTicketById = async(event_id,type_name,price,available_tickets)=>{
    const result= await db.query('INSERT INTO ticket_types(event_id,type_name,price,available_tickets) VALUES($1,$2,$3,$4) RETURNING *',[event_id,type_name,price,available_tickets])
   
    return result.rows[0]
}

const getAllTicketsById = async(event_id)=>{
   
    const result = await db.query('SELECT * FROM ticket_types WHERE event_id=$1',[event_id])
    
    return result.rows


}

module.exports ={createTicketById,getAllTicketsById}