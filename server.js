require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const app = express();

// Thiết lập CORS - chỉ cho phép các domain cụ thể
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Cho phép requests không có origin (như mobile apps hoặc curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'Đừng cố tìm cách nữa anh bạn à.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());

// Rate limiting - giới hạn số lượng request
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // giới hạn mỗi IP tối đa 100 requests trong 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: 'ZZZZZZZZZZ'
});

app.use('/api/', limiter);

// Lấy secretKey từ biến môi trường
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY || SECRET_KEY.length !== 16) {
  process.exit(1);
}

// API endpoint để mã hóa link
// API endpoint để giải mã link
app.post('/api/concunhonho', (req, res) => {
    const { encryptedData } = req.body;
    
    if (!encryptedData) {
      return res.status(400).json({ error: 'Thiếu dữ liệu cần giải mã' });
    }
  
    try {
      // Tách IV và dữ liệu đã mã hóa
      const parts = encryptedData.split(".");
      if (parts.length !== 2) {
        return res.status(400).json({ error: 'Định dạng dữ liệu mã hóa không hợp lệ' });
      }
      
      // Giải mã base64url
      let ivBase64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
      while (ivBase64.length % 4 !== 0) ivBase64 += "=";
      
      let encryptedBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (encryptedBase64.length % 4 !== 0) encryptedBase64 += "=";
      
      // Chuyển đổi thành Buffer
      const iv = Buffer.from(ivBase64, 'base64');
      const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
      
      // Tạo decipher
      const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(SECRET_KEY), iv);
      
      // Giải mã dữ liệu
      let decrypted = decipher.update(encryptedBuffer, 'binary', 'utf8');
      decrypted += decipher.final('utf8');
      
      return res.json({ decryptedUrl: decrypted });
    } catch (error) {
      console.error('Lỗi giải mã:', error);
      return res.status(500).json({ error: 'Lỗi khi giải mã dữ liệu' });
    }
  });
  

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Xử lý 404
app.use((req, res) => {
  res.status(404).json({ error: 'Nia Nia Mì Ni Sầm Phân Nua!' });
});

// Xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Lỗi server' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});
