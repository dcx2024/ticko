const queue = require("bull")

const emailQueue = new queue('emailQueue',{
    redis:{host:'127.0.0.1', port:6379}
})

module.exports = emailQueue;