const { userAuth } = require('../authMIddleWare/authMiddleware')
const{initializePayment, verifyPayment} = require('../Controllers/paymentController')
const express = require('express')
const router = express.Router()

router.post('/initialize', initializePayment)
router.get('/verify/',verifyPayment)

module.exports=router