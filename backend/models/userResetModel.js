const bcrypt = require('bcrypt');
const db = require('../config/db.js');

const emailReset = async (email, userId) => {
    try {
        // Ensure email is validated before using it in the query
        if (!email || !userId) {
            throw new Error('Email and User ID are required');
        }

        const result = await db.query('UPDATE users SET email = $1 WHERE id = $2 RETURNING *', [email, userId]);

        if (result.rowCount === 0) {
            throw new Error('User not found');
        }

        console.log('Email updated successfully');
        return result.rows[0];  // Return the updated user information (optional)
    } catch (error) {
        console.error('Error updating email:', error.message);
        throw error;
    }
};

const passwordReset = async (password, userId) => {
    try {
        // Validate the password and userId
        if (!password || !userId) {
            throw new Error('Password and User ID are required');
        }

        // Hash the new password before storing it in the database
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query('UPDATE users SET password = $1 WHERE id = $2 RETURNING *', [hashedPassword, userId]);

        if (result.rowCount === 0) {
            throw new Error('User not found');
        }

        console.log('Password updated successfully');
        return result.rows[0];  // Return the updated user information (optional)
    } catch (error) {
        console.error('Error updating password:', error.message);
        throw error;
    }
};

module.exports = { emailReset, passwordReset };
