const { userAuth } = require('../authMIddleWare/authMiddleware')
const{createSubAccount,initializePayment, verifyPayment,fetchBanks} = require('../Controllers/paymentController')
const express = require('express')
const router = express.Router()

router.post('/initialize', initializePayment)
router.get('/verify/',verifyPayment)
router.post('/createSubAcct',createSubAccount)
router.get('/fetchBanks', fetchBanks)




module.exports=router