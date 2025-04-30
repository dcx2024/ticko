const { create } = require('qrcode')
const {createTicketByIdHandler,getAllTicketsByIdHandler}= require('../Controllers/ticketTypeController')
const express= require('express')
const router = express.Router()

router.post('/ticket/createTicketTypes',createTicketByIdHandler)

router.get('/ticket/getTicketType/:eventId',getAllTicketsByIdHandler)

module.exports = router