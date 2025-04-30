const jwt = require('jsonwebtoken');
require('dotenv').config()
const userAuth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });

        req.user = user; // now you can access req.user.id in your controller
        next();
    });
};

const adminAuth = (req,res,next)=>{
    if(!req.user|| req.user.role !=='admin'){
        return res.status(403).json({error:'forbidden'})
    }
    next()
}

module.exports = {userAuth, adminAuth}