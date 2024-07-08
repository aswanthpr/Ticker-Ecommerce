const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..','public', 'uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload =multer({
    storage: storage,
    limits: { fileSize: 200 * 1024 * 1024 },
//     limits: { fileSize: 1000000 },
//   fileFilter: (req, file, cb) => {
//     const filetypes = /jpeg|jpg|png/;
//     const mimetype = filetypes.test(file.mimetype);
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

//     if (mimetype && extname) {
//       return cb(null, true);
//     } else {
//       cb('Error: Images Only!');
//     }
//   }

  });

module.exports = upload;
