const express = require('express')
const router = express.Router()
const {createEventHandler, getEventsHandler,getEventByIdHandler} = require('../Controllers/eventController')
const {userAuth, adminAuth} = require('../authMIddleWare/authMiddleware')
const fileUpload = require('../fileUpload/fupload')

router.post('/createEvents',userAuth,adminAuth,fileUpload.single('image'), createEventHandler)
router.get('/getEvents',getEventsHandler)
router.get('/:eventId',getEventByIdHandler)

module.exports = router