

const db = require('../config/db');

const createDiscount = async (event_id, ticket_types_id, discountPercentage) => {
    try {
        // Get ticket price first
        const ticketRes = await db.query(
            'SELECT price FROM ticket_types WHERE event_id = $1 AND id = $2',
            [event_id, ticket_types_id]
        );

        if (ticketRes.rows.length === 0) {
            throw new Error('Ticket type not found');
        }

        const price = ticketRes.rows[0].price;
        const discount = (discountPercentage / 100) * price;

        const result = await db.query(
            `UPDATE ticket_types 
             SET discountPercentage = $1, isDiscountUsed = false, discount = $2
             WHERE event_id = $3 AND id = $4`,
            [discountPercentage, discount, event_id, ticket_types_id]
        );

        return result;
    } catch (err) {
        throw new Error('Failed to apply discount: ' + err.message);
    }
};
 

const useDiscount = async (event_id, ticket_types_id) => {
    const result = await db.query(
        `UPDATE ticket_types
         SET isDiscountUsed = true 
         WHERE event_id = $1 AND id = $2`,
        [event_id, ticket_types_id]
    );
    return result;
};

module.exports=[createDiscount,useDiscount]