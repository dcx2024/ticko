const express= require('express')
const cors = require('cors')
const path = require('path')
const https = require('https')
const fs = require('fs')
const startEventStatusWorker = require('./worker/eventStatusWorker')
const startEmailWorker = require('./email-worker/emailWorker')
const ticketMonitor = require("./email-worker/ticket-monitor")
const authRoutes = require('./routes/signUp')
const eventRoutes = require('./routes/eventRoute')
const userResetRoutes = require('./routes/passwordRoute')
const paymentRoutes = require('./routes/paymentRoute')
const dashboardRoute= require('./routes/dashboardRoute')
const userProfileRoute = require('./routes/userProfileRoute')
const ticketTypesRoute = require('./routes/ticketTypesRoute')
const app = express()


  ticketMonitor()
startEventStatusWorker();
startEmailWorker();
app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'Frontend')));
app.use('/uploads', express.static(path.join(__dirname,'fileUpload', 'Uploads')));
app.use(cors())

app.use('/api/auth', authRoutes)
app.use('/api/event', eventRoutes)// deals with events
app.use('/api',userResetRoutes) // add user auth and admin auth
app.use('/api/payment',paymentRoutes) // add user auht
app.use('/api',dashboardRoute)
app.use('/api/userProfile',userProfileRoute)
app.use('/api', ticketTypesRoute)


/*https.createServer(options,app).listen(3000,()=>{
    console.log("Server is listening on port 3000")
})*/

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
