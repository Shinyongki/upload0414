const Redis = require('redis');
const RedisStore = require('connect-redis').default;

// Redis 클라이언트 생성
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD
});

// Redis 연결 이벤트 핸들러
redisClient.on('error', (err) => {
  console.error('Redis 연결 오류:', err);
});

redisClient.on('connect', () => {
  console.log('Redis 서버에 연결되었습니다.');
});

// Redis 세션 저장소 설정
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'monitoring:session:',
  ttl: 86400 // 세션 유효 시간 (초) - 24시간
});

module.exports = {
  redisClient,
  redisStore
}; 