const express = require('express')
const router = express.Router()
const {userAuth}= require('../authMIddleWare/authMiddleware')
        const {getUser,deleteUser} = require('../Controllers/userProfileController')



router.get('/profile',userAuth,getUser)
router.delete('/deleteProfile',userAuth,deleteUser)

module.exports = router