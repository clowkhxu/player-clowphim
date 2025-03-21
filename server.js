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
      const msg = 'CORS policy không cho phép truy cập từ origin này.';
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
  message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút'
});

app.use('/api/', limiter);

// Lấy secretKey từ biến môi trường
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY || SECRET_KEY.length !== 16) {
  console.error('Lỗi: SECRET_KEY phải có đúng 16 ký tự cho AES-128-CBC');
  process.exit(1);
}

// API endpoint để mã hóa link
app.post('/api/encrypt', (req, res) => {
  const { data } = req.body;
  
  if (!data) {
    return res.status(400).json({ error: 'Thiếu dữ liệu cần mã hóa' });
  }

  try {
    // Tạo IV ngẫu nhiên
    const iv = crypto.randomBytes(16);
    
    // Tạo cipher
    const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(SECRET_KEY), iv);
    
    // Mã hóa dữ liệu
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Trả về IV và dữ liệu đã mã hóa
    const ivBase64 = iv.toString('base64')
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    
    const encryptedBase64 = encrypted
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    
    return res.json({ 
      encodedLink: `${ivBase64}.${encryptedBase64}`
    });
  } catch (error) {
    console.error('Lỗi mã hóa:', error);
    return res.status(500).json({ error: 'Lỗi khi mã hóa dữ liệu' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Xử lý 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint không tồn tại' });
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
