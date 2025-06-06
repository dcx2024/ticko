const { userAuth } = require('../authMIddleWare/authMiddleware')
const{createSubAccount,initializePayment, verifyPayment,fetchBanks} = require('../Controllers/paymentController')
const express = require('express')
const router = express.Router()

router.post('/initialize', initializePayment)
router.get('/verify/',verifyPayment)
router.post('/createSubAcct', (req, res) => {
  if (!req.body.bank) {
    return res.status(400).json({ error: 'Bank code is required' }); // <-- maybe this is your error
  }
});
router.get('/fetchBanks', fetchBanks)




module.exports=router