const db = require('../config/db')

const createUser = async(name,email,password,role)=>{
  
    const result = await db.query('INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,$4) RETURNING *',[ name,email,password,role])
   return result.rows[0]
}

const getUserByEmail = async (email) => {
    const result = await db.query('SELECT id, name, email, password, role FROM users WHERE email = $1', [email]);
    return result.rows[0];
  };

  const anonymizeAndCleanUser = async (email, archiveEmail = true) => {
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
  
    const userId = userResult.rows[0].id;
  
    // Optional: Archive email before wiping
    if (archiveEmail) {
      await db.query(`
        INSERT INTO deleted_users_archive (user_id, original_email)
        VALUES ($1, $2)
        ON CONFLICT (user_id) DO NOTHING
      `, [userId, email]);
    }
  
    // Delete tickets
    await db.query('DELETE FROM tickets WHERE user_id = $1', [userId]);
  
    // Anonymize user
    await db.query(`
      UPDATE users
      SET
        name = 'Deleted User',
        email = CONCAT('deleted_', id, '@anon.tix'),
        password = 'password_deleted',  
        is_deleted = TRUE
      WHERE id = $1
    `, [userId]);
    
    
  
    return { message: 'User anonymized and tickets deleted' };
  };
  

  
module.exports = { createUser,getUserByEmail,anonymizeAndCleanUser};