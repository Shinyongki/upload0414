const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');

// 홈페이지
router.get('/', (req, res) => {
  res.render('index', {
    title: '노인맞춤돌봄서비스 모니터링',
    user: req.session.committee
  });
});

// 로그인 페이지
router.get('/login', (req, res) => {
  // 이미 로그인된 경우 대시보드로 리다이렉트
  if (req.session.committee) {
    return res.redirect('/dashboard');
  }
  
  // 세션에서 에러 메시지 가져오기
  const errorMessage = req.session.errorMessage || '';
  // 사용 후 세션에서 메시지 삭제
  delete req.session.errorMessage;
  
  res.render('login', {
    title: '로그인 - 노인맞춤돌봄서비스 모니터링',
    message: errorMessage
  });
});

// 대시보드 (로그인 필요)
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', {
    title: '대시보드 - 노인맞춤돌봄서비스 모니터링',
    user: req.session.committee
  });
});

// 관리자 페이지 (로그인 필요)
router.get('/admin', ensureAuthenticated, (req, res) => {
  res.render('admin', {
    title: '관리자 페이지 - 노인맞춤돌봄서비스 모니터링',
    user: req.session.committee
  });
});

// 로그아웃
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router; 