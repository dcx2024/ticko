const { login, signUp,deleteUserHandler } = require('../Controllers/signUpController');
const express = require('express');
const router = express.Router();

router.post('/signup', signUp);
router.post('/deleteUser',deleteUserHandler)

router.post('/login', login);

module.exports = router;
