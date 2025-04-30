const { emailReset, passwordReset } = require('../models/userResetModel');

// Controller for handling email reset
const requestEmailReset = async (req, res) => {
    const { email, userId } = req.body;

    try {
        // Ensure input is valid
        if (!email || !userId) {
            return res.status(400).json({ message: 'Email and User ID are required' });
        }

        // Call the model function to update email
        const updatedUser = await emailReset(email, userId);

        return res.status(200).json({
            message: 'Email updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating email', error: error.message });
    }
};

// Controller for handling password reset
const requestPasswordReset = async (req, res) => {
    const { password, userId } = req.body;

    try {
        // Ensure input is valid
        if (!password || !userId) {
            return res.status(400).json({ message: 'Password and User ID are required' });
        }

        // Call the model function to update password
        const updatedUser = await passwordReset(password, userId);

        return res.status(200).json({
            message: 'Password updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating password', error: error.message });
    }
};

module.exports = { requestEmailReset, requestPasswordReset };
