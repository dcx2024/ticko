const {Pool} = require('pg')
require ('dotenv').config()

/*const db = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
})*/


const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Important for Render
  },
});




db.connect().then(()=>console.log('connected to postgresql')).catch((err)=>console.error('Database Connection error'))

module.exports = db;
