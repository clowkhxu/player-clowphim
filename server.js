require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();

// Thêm dòng này để tin tưởng proxy
app.set('trust proxy', true);

// Thiết lập CORS - chỉ cho phép domain https://demo.clow.fun/
const allowedOrigins = ['https://demo.clow.fun'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // Cho phép yêu cầu không có origin (ví dụ: từ Postman)
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'Domain không được phép truy cập.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());

// Rate limiting - giới hạn số lượng request
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'ZZZZZZZZZZ'
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
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(SECRET_KEY), iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
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

// API endpoint để giải mã link
app.post('/api/concunhonho', (req, res) => {
  const { encryptedData } = req.body;
  
  if (!encryptedData) {
    return res.status(400).json({ error: 'Thiếu dữ liệu cần giải mã' });
  }
  
  try {
    const parts = encryptedData.split(".");
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'Định dạng dữ liệu mã hóa không hợp lệ' });
    }
    
    let ivBase64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    while (ivBase64.length % 4 !== 0) ivBase64 += "=";
    
    let encryptedBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (encryptedBase64.length % 4 !== 0) encryptedBase64 += "=";
    
    const iv = Buffer.from(ivBase64, 'base64');
    const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedBuffer, 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    
    return res.json({ decryptedUrl: decrypted });
  } catch (error) {
    console.error('Lỗi giải mã:', error);
    return res.status(500).json({ error: 'Lỗi khi giải mã dữ liệu' });
  }
});

// Hàm để lấy tham số từ URL
const getQueryParam = (url, param) => {
  const regex = new RegExp(`[?&]${param}=([^&#]*)`);
  const results = regex.exec(url);
  return results ? decodeURIComponent(results[1]) : null;
};

// API endpoint để bao bọc API Google Sheet cho phim lẻ
app.get('/api/phim-le', async (req, res) => {
  const limit = getQueryParam(req.url, 'limit') || 24; // Lấy tham số limit từ query, mặc định là 24
  try {
    const response = await axios.get(`https://script.google.com/macros/echo?user_content_key=AehSKLg4QGreXdQf8IVsI410SNczl4tzhSlUfvgu7U4XfpxcRE-34OV0qCKxGXRuhKxhqX8SqP4-wdDsnb-HhjOItsRL8H1gniqFZAdaJwyEEof8bIjgyfBHuuUNynCPcFiMaVE3OI9bbM1CAyQC9iJA2n5fN5WC1CiKKpSBoIWWhH2gPX86Twafaii8MQRlqDXRqHGSlzg1e5EqD_cicS9MOfx673KDLEyfUFSU2Rtj5UU1VJY0Yx9YW3RKJ79T_Gl3iW7D4Oy7qfYBaMl8imjOS6wkhbnOPqrWBPOYv0QAxHUYZJZV09Yk2DiRPOB-rimwHpac6hFZ4ns-8A2fZEQ&lib=MZlMauPIZAmGYwUUgq90_C5EAwAXbS11g&limit=${limit}`);
    
    // Trả về dữ liệu từ Google Sheet
    return res.json(response.data);
  } catch (error) {
    console.error('Lỗi khi gọi API Google Sheet:', error);
    return res.status(500).json({ error: 'Lỗi khi lấy dữ liệu phim lẻ' });
  }
});

// API endpoint để bao bọc API Google Sheet cho phim bộ
app.get('/api/phim-bo', async (req, res) => {
  const limit = getQueryParam(req.url, 'limit') || 24; // Lấy tham số limit từ query, mặc định là 24
  try {
    const response = await axios.get(`https://script.google.com/macros/s/AKfycbzpvyXYoTtnoJUd4-kipStvBcHu4XPwkbzTahHBIX3L4mhE5Uzzd312kEa2DNZI0IpmUA/exec?path=danh-sach/phim-bo&limit=${limit}`);
    
    // Trả về dữ liệu từ Google Sheet
    return res.json(response.data);
  } catch (error) {
    console.error('Lỗi khi gọi API Google Sheet:', error);
    return res.status(500).json({ error: 'Lỗi khi lấy dữ liệu phim bộ' });
  }
});

// API endpoint để lấy thông tin phim theo slug
app.get('/api/phim/:slug', async (req, res) => {
  const slug = req.params.slug; // Lấy slug từ URL
  try {
    const response = await axios.get(`https://script.google.com/macros/s/AKfycbyR0NYcwIcUlBo2nJA-N95hhbg58YoLUi6V8eb3PQg_yhvX_SBhPgxusfBDdJJ5BKFJzw/exec?path=phim/${slug}`);
    
    // Trả về dữ liệu từ Google Sheet
    return res.json(response.data);
  } catch (error) {
    console.error('Lỗi khi gọi API Google Sheet:', error);
    return res.status(500).json({ error: 'Lỗi khi lấy dữ liệu phim' });
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
