const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

const sendMail = async (mailOptions) => {
  mailOptions.attachments = mailOptions.attachments.map(att => ({
    ...att,
    content: Buffer.from(att.content, 'base64') // Convert base64 string back to Buffer
}));
  return transporter.sendMail(mailOptions);
};

const adminSendMail = async(adminMailOptions)=>{
    return transporter.sendMail(adminMailOptions)
}

module.exports = {sendMail,adminSendMail};
