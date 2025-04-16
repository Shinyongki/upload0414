const jwt = require('jsonwebtoken');

// 보안을 위해 환경 변수 확인하여 로깅
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
console.log(`JWT 설정: ${JWT_SECRET === 'your-secret-key' ? '기본값 사용 (주의)' : '환경 변수 사용'}`);

// JWT 토큰 생성
const generateToken = (user) => {
  const token = jwt.sign(
    { 
      id: user.id,
      name: user.name,
      role: user.role
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
  console.log(`토큰 생성 완료: ${user.name} (${user.role})`);
  return token;
};

// JWT 토큰 검증
const verifyToken = (token) => {
  console.log('토큰 검증 시작');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`토큰 검증 성공: ${decoded.name} (${decoded.role})`);
    return { success: true, data: decoded };
  } catch (error) {
    console.error(`토큰 검증 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// 인증 미들웨어
const authenticateToken = (req, res, next) => {
  console.log(`인증 요청 경로: ${req.method} ${req.path}`);
  
  const authHeader = req.headers['authorization'];
  console.log(`Authorization 헤더: ${authHeader ? '존재함' : '없음'}`);
  
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.log('토큰이 제공되지 않음');
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
  console.log(`인증 성공: ${req.user.name}`);
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken
}; 