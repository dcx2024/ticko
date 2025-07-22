const {getDashboardStats,getEventFromOwnerHandler,getRecentTransactionsHandler} = require('../Controllers/dashboardController')
const express= require('express')
const router = express.Router();


router.get('/dashboard/dashboardStats/:event_id', getDashboardStats);
router.get('/dashboard/:admin_id', getEventFromOwnerHandler)
router.get('/dashboard/recentTransactions/:event_id', getRecentTransactionsHandler);


module.exports = router;