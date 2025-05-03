const db = require('../config/db')
const {schedule} = require('node-cron')

const startEventStatusWorker=()=>{
    schedule('*/5 * * * *',async()=>{
    console.log('Runing scheduled event cleanup and stayus updates')

    try{
        const updateResult =await db.query( `
              UPDATE events
            SET status = 'completed'
            WHERE end_time < NOW()
            AND status != 'completed'`)
    
            console.log(`✅ Marked ${updateResult.rowCount} event(s) as completed.`)

            const deleteResult = await db.query(`
                DELETE FROM events
                WHERE (status ='completed' OR status = 'cancelled')
                AND end_time < NOW() - INTERVAL '7 days'
            `)
            console.log(`🗑️ Deleted ${deleteResult.rowCount} old completed/cancelled event(s).`)
    }catch(err){
         console.error('❌ Worker error:', err)
    }
  
    })
    console.log('🚀 Event status worker started.');
}

module.exports = startEventStatusWorker;