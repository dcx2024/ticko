const emailQueue = require('../email-worker/queue');
const {sendMail,adminSendMail} = require('../email-worker/sendEmail');

emailQueue.process(async (job) => {
    const { mailOptions, AdminMailOptions } = job.data;
  
    try {
      if (mailOptions) {
        await sendMail(mailOptions);
        console.log(`✅ Email sent to ${mailOptions.to}`);
      }
      if (AdminMailOptions) {
        await adminSendMail(AdminMailOptions);
        console.log(`✅ Admin email sent to ${AdminMailOptions.to}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send email: ${error.message}`);
    }
  });
  
