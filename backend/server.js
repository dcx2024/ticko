const express= require('express')
const cors = require('cors')
const path = require('path')
const authRoutes = require('./routes/signUp')
const eventRoutes = require('./routes/eventRoute')
const userResetRoutes = require('./routes/passwordRoute')
const paymentRoutes = require('./routes/paymentRoute')
const dashboardRoute= require('./routes/dashboardRoute')
const userProfileRoute = require('./routes/userProfileRoute')
const ticketTypesRoute = require('./routes/ticketTypesRoute')
const app = express()
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors())

app.use('/api/auth', authRoutes)
app.use('/api/event', eventRoutes)// deals with events
app.use('/api',userResetRoutes) // add user auth and admin auth
app.use('/api/payment',paymentRoutes) // add user auht
app.use('/api',dashboardRoute)
app.use('/api/userProfile',userProfileRoute)
app.use('/api', ticketTypesRoute)

app.listen(3000, ()=>console.log("Server is lisyening on port 3000"))