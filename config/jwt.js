const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// JWT 토큰 생성
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      name: user.name,
      role: user.role
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
};

// JWT 토큰 검증
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: '인증이 필요합니다.'
    });
  }

  const result = verifyToken(token);
  if (!result.success) {
    return res.status(403).json({
      status: 'error',
      message: '유효하지 않은 토큰입니다.'
    });
  }

  req.user = result.data;
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken
}; 