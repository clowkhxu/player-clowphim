const axios = require('axios');

// Địa chỉ API cần ping
const API_URL = 'https://api.clow.fun/health'; // Thay đổi địa chỉ nếu cần

// Hàm để ping server
const keepAlive = () => {
  setInterval(async () => {
    try {
      const response = await axios.get(API_URL);
      console.log('Ping thành công:', response.data);
    } catch (error) {
      console.error('Lỗi khi ping:', error.message);
    }
  }, 5 * 60 * 1000); // Ping mỗi 5 phút
};

// Bắt đầu ping server
keepAlive();
