const { userAuth } = require('../authMIddleWare/authMiddleware')
const{createSubAccount ,initializePayment, verifyPayment,fetchBanks} = require('../Controllers/paymentController')
const express = require('express')
const router = express.Router()
router.get('/fetchBanks', fetchBanks)
router.post('/initialize', initializePayment)
router.get('/verify/',verifyPayment)
router.post('/createSubAcct', createSubAccount);





module.exports=router