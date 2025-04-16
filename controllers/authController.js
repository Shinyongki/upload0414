const { google } = require('googleapis');
const { getAuthClient } = require('../config/googleSheets');
const { getCommitteeOrganizations } = require('../services/sheetService');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 위원 정보 조회
const findCommittee = async (committeeName) => {
  try {
    console.log(`구글 시트 연동 시작: 위원 정보 찾기 ${committeeName}`);
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'committees!A:C',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('위원 데이터가 비어있습니다.');
      return null;
    }

    // 헤더 제거 후 위원 찾기
    const headers = rows[0];
    const data = rows.slice(1);
    const committee = data.find(row => row[0] === committeeName);

    if (!committee) {
      console.log(`위원 검색 결과: 위원 찾지 못함`);
      return null;
    }

    console.log(`위원 검색 결과: ${committeeName} 위원 찾음`);
    return {
      name: committee[0],
      id: committee[1],
      role: committee[2]
    };
  } catch (error) {
    console.error('위원 정보 조회 중 오류 발생:', error);
    throw error;
  }
};

// 로그인 처리
const login = async (req, res) => {
  try {
    const { committeeName } = req.body;
    console.log('로그인 요청:', committeeName);

    // 마스터 계정 처리
    if (committeeName === '마스터' || committeeName.toLowerCase() === 'master') {
      const committee = {
        name: '마스터',
        role: 'master',
        id: 'MASTER'
      };
      
      // 세션에 저장
      req.session.committee = committee;
      
      // 세션 저장 확인
      req.session.save((err) => {
        if (err) {
          console.error('세션 저장 중 오류:', err);
          return res.status(500).json({
            status: 'error',
            message: '세션 저장 중 오류가 발생했습니다.'
          });
        }
        
        console.log('마스터 로그인 성공:', req.sessionID);
        return res.json({
          status: 'success',
          data: { committee }
        });
      });
    }
    else {
      // 일반 위원 계정 처리
      const committee = await findCommittee(committeeName);
      if (!committee) {
        return res.status(401).json({
          status: 'error',
          message: '위원 정보를 찾을 수 없습니다.'
        });
      }

      // 담당 기관 정보 조회
      const organizations = await getCommitteeOrganizations(committeeName);
      committee.organizations = organizations;

      // 세션에 위원 정보 저장
      req.session.committee = committee;
      
      // 세션 저장 확인
      req.session.save((err) => {
        if (err) {
          console.error('세션 저장 중 오류:', err);
          return res.status(500).json({
            status: 'error',
            message: '세션 저장 중 오류가 발생했습니다.'
          });
        }
        
        console.log('일반 위원 로그인 성공:', committeeName, req.sessionID);
        return res.json({
          status: 'success',
          data: { committee }
        });
      });
    }
  } catch (error) {
    console.error('로그인 중 오류 발생:', error);
    return res.status(500).json({
      status: 'error',
      message: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

// 로그아웃 처리
const logout = (req, res) => {
  console.log('로그아웃 요청:', req.sessionID);
  
  if (!req.session || !req.session.committee) {
    console.log('이미 로그아웃된 상태');
    return res.json({
      status: 'success',
      message: '이미 로그아웃되었습니다.'
    });
  }
  
  const userName = req.session.committee.name;
  
  req.session.destroy(err => {
    if (err) {
      console.error('로그아웃 중 오류 발생:', err);
      return res.status(500).json({
        status: 'error',
        message: '로그아웃 처리 중 오류가 발생했습니다.'
      });
    }
    
    console.log('로그아웃 성공:', userName);
    // 쿠키 삭제
    res.clearCookie('monitoring.sid');
    
    return res.json({
      status: 'success',
      message: '로그아웃되었습니다.'
    });
  });
};

// 현재 인증 상태 확인
const getCurrentUser = (req, res) => {
  console.log('인증 상태 확인:', req.sessionID);
  console.log('세션 데이터:', req.session);
  
  if (!req.session.committee) {
    console.log('인증되지 않은 사용자 (세션에 committee 없음)');
    return res.status(401).json({
      status: 'error',
      message: '인증되지 않은 사용자입니다.'
    });
  }
  
  console.log('인증된 사용자:', req.session.committee.name);
  res.json({
    status: 'success',
    data: { committee: req.session.committee }
  });
};

module.exports = {
  login,
  logout,
  getCurrentUser
}; 