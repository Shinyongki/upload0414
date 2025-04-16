// 인증 관련 함수들

let isAuthenticated = false;
let currentUser = null;
let authToken = null;

// 토큰 관리
const setToken = (token) => {
  authToken = token;
  localStorage.setItem('authToken', token);
};

const getToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
};

const removeToken = () => {
  authToken = null;
  localStorage.removeItem('authToken');
};

// API 요청에 토큰 추가
const getAuthHeaders = () => {
  const token = getToken();
  return token ? {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  } : {
    'Content-Type': 'application/json'
  };
};

// 로그인 처리
const login = async (committeeName) => {
  try {
    console.log('로그인 시도:', committeeName);
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ committeeName })
    });
    
    const data = await response.json();
    
    if (data.status === 'success' && data.data && data.data.committee) {
      isAuthenticated = true;
      currentUser = data.data.committee;
      setToken(data.data.token);
      
      // 로컬 스토리지에 정보 저장
      localStorage.setItem('currentCommittee', JSON.stringify(currentUser));
    }
    
    return data;
  } catch (error) {
    console.error('로그인 중 오류 발생:', error);
    return { status: 'error', message: '로그인 중 오류가 발생했습니다. 다시 시도해주세요.' };
  }
};

// 로그아웃 처리
const logout = async () => {
  try {
    const response = await fetch('/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    
    // 로컬 상태 초기화
    isAuthenticated = false;
    currentUser = null;
    removeToken();
    localStorage.removeItem('currentCommittee');
    
    // UI 업데이트
    updateAuthUI(false);
    
    // 메인 화면으로 돌아가기
    window.location.href = '/';
    
    return data;
  } catch (error) {
    console.error('로그아웃 중 오류 발생:', error);
    // 오류가 발생해도 로컬 상태 초기화 및 UI 업데이트
    isAuthenticated = false;
    currentUser = null;
    removeToken();
    localStorage.removeItem('currentCommittee');
    updateAuthUI(false);
    window.location.href = '/';
    return { status: 'error', message: '로그아웃 중 오류가 발생했습니다.' };
  }
};

// 현재 인증 상태 확인
const checkAuth = async () => {
  try {
    const token = getToken();
    if (!token) {
      isAuthenticated = false;
      currentUser = null;
      updateAuthUI(false);
      return { status: 'error', message: '인증되지 않은 사용자입니다.' };
    }

    // 서버에 인증 상태 확인 요청
    const response = await fetch('/auth/current', {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    
    if (data.status === 'success' && data.data && data.data.committee) {
      isAuthenticated = true;
      currentUser = data.data.committee;
      
      // 로컬 스토리지에 정보 저장
      localStorage.setItem('currentCommittee', JSON.stringify(currentUser));
    } else {
      isAuthenticated = false;
      currentUser = null;
      removeToken();
      localStorage.removeItem('currentCommittee');
    }
    
    // UI 업데이트
    updateAuthUI(isAuthenticated);
    
    return data;
  } catch (error) {
    console.error('인증 상태 확인 중 오류 발생:', error);
    isAuthenticated = false;
    currentUser = null;
    removeToken();
    localStorage.removeItem('currentCommittee');
    updateAuthUI(false);
    return { status: 'error', message: '인증 상태 확인 중 오류가 발생했습니다.' };
  }
};

// 현재 사용자 정보 가져오기
const getCurrentUser = () => {
  return currentUser;
};

// 인증이 필요한 화면인지 확인
const requireAuth = () => {
  if (!isAuthenticated) {
    // 로그인 화면으로 리다이렉트
    window.location.href = '/';
    return false;
  }
  return true;
};

// 마스터 권한 확인
const isMaster = () => {
  return isAuthenticated && currentUser && currentUser.role === 'master';
};

// 인증 UI 업데이트
const updateAuthUI = (isAuthenticated = false) => {
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const userNameElement = document.getElementById('user-name');
  
  if (isAuthenticated && currentUser) {
    // 로그인 성공 시 UI 업데이트
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    
    // 사용자 이름 표시
    if (userNameElement) {
      userNameElement.textContent = `${currentUser.name} 위원님`;
    }
    
    // 마스터 계정이면 마스터 대시보드 표시
    if (isMaster()) {
      showMasterDashboard();
    }
  } else {
    // 로그아웃 상태 UI 업데이트
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    
    // 로그인 폼 초기화
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.reset();
    }
  }
}; 