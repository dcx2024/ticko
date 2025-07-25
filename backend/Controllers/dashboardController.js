const {
    getTotalSales,
    getTotalTicketSales,
    getEventFromOwner,
    getTicketTypeBreakdown,
    getRecentTransactions
} = require('../models/dashboardModel');

// Handler to get event by admin
const getEventFromOwnerHandler = async (req, res) => {
    const { admin_id } = req.params;  // Correct way to extract admin_id from params
    try {
        // Fetch the event ID associated with the admin
        const getEventId = await getEventFromOwner(admin_id);
        const event = getEventId;
        console.log(event)
        // If no event is found, return a 404 error
        if (!getEventId || getEventId.length === 0) {
            return res.status(404).json({ error: 'Event not found for this admin.' });
        }

        // Return the event ID (or the entire event details if needed)
        res.status(200).json({
            message: "Event successfully retrieved",
            event_id: event 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error while retrieving event." });
    }
};

const getRecentTransactionsHandler = async (req, res) => {
  const { event_id } = req.params;
  try {
    const transactions = await getRecentTransactions(event_id);
    res.status(200).json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching transactions.' });
  }
};


// Handler to fetch event stats (e.g., total sales, ticket types)
const getDashboardStats = async (req, res) => {
    const { event_id } = req.params;  // Extract event_id from URL params

    try {
        // Fetch all the required event stats concurrently
        const [totalSales, totalTickets, ticketTypes] = await Promise.all([
            getTotalSales(event_id),
            getTotalTicketSales(event_id),
            getTicketTypeBreakdown(event_id)
        ]);

        // Return the event stats
        res.status(200).json({
            event_id,
            totalSales: totalSales || 0,
            totalTickets: parseInt(totalTickets) || 0,
            ticketTypes
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error while fetching event stats.' });
    }
};

module.exports = { getDashboardStats, getEventFromOwnerHandler,getRecentTransactionsHandler };
