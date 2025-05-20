const { createDiscount, useDiscount } = require('../models/dicountModel8');

const applyDiscount = async (req, res) => {
    const { event_id, ticket_types_id, discountPercentage, discount } = req.body;

    if (!event_id || !ticket_types_id || discountPercentage == null || discount == null) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await createDiscount(event_id, ticket_types_id, discountPercentage, discount);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ticket type not found for given event.' });
        }
        return res.status(200).json({ message: 'Discount applied successfully' });
    } catch (error) {
        console.error('Error applying discount:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const markDiscountAsUsed = async (req, res) => {
    const { event_id, ticket_types_id } = req.body;

    if (!event_id || !ticket_types_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await useDiscount(event_id, ticket_types_id);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ticket type not found for given event.' });
        }
        return res.status(200).json({ message: 'Discount marked as used' });
    } catch (error) {
        console.error('Error marking discount as used:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    applyDiscount,
    markDiscountAsUsed,
};
