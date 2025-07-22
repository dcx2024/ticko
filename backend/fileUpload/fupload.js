const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the upload path
const uploadDir = path.join(__dirname, 'Uploads');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const fileUpload = multer({ storage });

module.exports = fileUpload;
