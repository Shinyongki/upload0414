// 위원 관련 모델 (간단한 더미 모델)
// 실제로는 구글 시트나 데이터베이스에 연결하여 데이터를 가져와야 함

// 위원 정보를, 이메일 기준으로 가져오기
const getCommitteeByEmail = async (email) => {
  // 더미 데이터 (실제 구현에서는 데이터베이스나 외부 API 호출)
  const dummyCommittees = [
    {
      id: 'C001',
      email: 'admin@example.com',
      name: '관리자',
      role: 'admin',
      isAdmin: true
    },
    {
      id: 'C002', 
      email: 'monitor1@example.com',
      name: '모니터링위원1',
      role: 'monitor',
      isAdmin: false
    },
    {
      id: 'C003',
      email: 'monitor2@example.com',
      name: '모니터링위원2',
      role: 'monitor',
      isAdmin: false
    }
  ];
  
  // 이메일로 위원 찾기
  const committee = dummyCommittees.find(c => c.email === email);
  return committee || null;
};

// 모든 위원 정보 가져오기
const getAllCommittees = async () => {
  // 더미 데이터
  return [
    {
      id: 'C001',
      email: 'admin@example.com',
      name: '관리자',
      role: 'admin',
      isAdmin: true
    },
    {
      id: 'C002', 
      email: 'monitor1@example.com',
      name: '모니터링위원1',
      role: 'monitor',
      isAdmin: false
    },
    {
      id: 'C003',
      email: 'monitor2@example.com',
      name: '모니터링위원2',
      role: 'monitor',
      isAdmin: false
    }
  ];
};

module.exports = {
  getCommitteeByEmail,
  getAllCommittees
}; 