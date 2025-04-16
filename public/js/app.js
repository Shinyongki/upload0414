// 메인 애플리케이션 JavaScript

// 앱 초기화
const initApp = async () => {
  // 로그인 폼 제출 이벤트 리스너
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const committeeNameInput = document.getElementById('committee-name');
      const committeeName = committeeNameInput.value.trim();
      
      if (!committeeName) {
        alert('이름을 입력해주세요.');
        return;
      }
      
      try {
        const response = await login(committeeName);
        
        if (response.status === 'success') {
          // 로그인 성공 후 UI 업데이트
          updateUIAfterLogin();
          
          // 현재 사용자 정보 확인
          const currentUser = getCurrentUser();
          
          // 마스터 관리자인 경우 마스터 대시보드 표시
          if (currentUser && currentUser.role === 'master') {
            initiateMasterDashboard();
          } else {
            // 일반 모니터링 위원인 경우 담당 기관 목록 표시
            loadOrganizations();
          }
        } else {
          alert(response.message || '로그인에 실패했습니다. 이름을 다시 확인해주세요.');
        }
      } catch (error) {
        console.error('로그인 처리 중 오류 발생:', error);
        alert('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    });
  }
  
  // 로그아웃 버튼 이벤트 리스너
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await logout(); // 비동기 로그아웃 함수 호출 및 완료 대기
        // 성공적으로 로그아웃된 경우, updateUIAfterLogout()는 이미 logout() 함수 내에서 호출됨
      } catch (error) {
        console.error('로그아웃 처리 중 오류 발생:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
        // 오류 발생 시에도 UI 업데이트 시도
        updateUIAfterLogout();
      }
    });
  }
  
  // 기관 목록으로 돌아가기 버튼 이벤트 리스너
  const backToOrgsBtn = document.getElementById('back-to-orgs-btn');
  if (backToOrgsBtn) {
    backToOrgsBtn.addEventListener('click', () => {
      // 마스터 관리자일 경우 마스터 대시보드로 돌아가기
      if (isMaster()) {
        initiateMasterDashboard();
      } else {
        // 일반 사용자일 경우 기관 선택 화면으로 돌아가기
        document.getElementById('monitoring-indicators').classList.add('hidden');
        document.getElementById('organization-selection').classList.remove('hidden');
      }
    });
  }
  
  // 페이지 로드 시 인증 상태 확인
  try {
    const authResponse = await checkAuth();
    
    if (authResponse.status === 'success') {
      updateUIAfterLogin();
      
      // 현재 사용자 정보 확인
      const currentUser = getCurrentUser();
      
      // 마스터 관리자인 경우 마스터 대시보드 표시
      if (currentUser && currentUser.role === 'master') {
        initiateMasterDashboard();
      } else {
        // 일반 모니터링 위원인 경우 담당 기관 목록 표시
        loadOrganizations();
      }
    } else {
      updateUIAfterLogout();
    }
  } catch (error) {
    console.error('인증 상태 확인 중 오류 발생:', error);
    updateUIAfterLogout();
  }
};

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', initApp);

// 로그인 후 UI 업데이트
const updateUIAfterLogin = () => {
  document.getElementById('login-container').classList.add('hidden');
  document.getElementById('dashboard-container').classList.remove('hidden');
  
  // 사용자 이름 표시
  const currentUser = getCurrentUser();
  const userNameElement = document.getElementById('user-name');
  
  if (userNameElement && currentUser) {
    // 마스터 관리자인 경우 다르게 표시
    if (currentUser.role === 'master') {
      userNameElement.textContent = `${currentUser.name}`;
    } else {
      userNameElement.textContent = `${currentUser.name} 위원님`;
    }
  }
};

// 로그아웃 후 UI 업데이트
const updateUIAfterLogout = () => {
  document.getElementById('login-container').classList.remove('hidden');
  document.getElementById('dashboard-container').classList.add('hidden');
  
  // 입력 필드 초기화
  const committeeNameInput = document.getElementById('committee-name');
  if (committeeNameInput) {
    committeeNameInput.value = '';
  }
  
  // 마스터 대시보드가 있으면 숨기기
  const masterDashboard = document.getElementById('master-dashboard');
  if (masterDashboard) {
    masterDashboard.classList.add('hidden');
  }
};

// showMasterDashboard 함수는 master.js에 이미 정의되어 있으므로 여기서는 함수 정의를 제거합니다.
// 대신 함수가 존재하는지 확인하고 호출하는 헬퍼 함수를 만듭니다.
const initiateMasterDashboard = () => {
  // master.js에서 정의된 함수 사용
  if (typeof showMasterDashboard === 'function') {
    showMasterDashboard();
  } else {
    console.error('마스터 대시보드 함수를 찾을 수 없습니다. master.js가 로드되었는지 확인하세요.');
    alert('마스터 대시보드를 로드할 수 없습니다.');
  }
};