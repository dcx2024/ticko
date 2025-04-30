const express = require('express');
const router = express.Router();
const { requestEmailReset, requestPasswordReset } = require('../Controllers/passwordController');

// Route for email reset
router.post('/reset/email', requestEmailReset);

// Route for password reset
router.post('/reset/password', requestPasswordReset);

module.exports = router;
