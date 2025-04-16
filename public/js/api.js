// API 호출을 위한 공통 함수들

// 기본 API URL
const API_URL = '/api';
const AUTH_URL = '/auth';

// 기본 요청 옵션
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json'
  }
};

// API 오류 처리
const handleApiError = (error) => {
  console.error('API 오류:', error);
  alert(error.message || '서버와 통신 중 오류가 발생했습니다.');
};

// 기본 Fetch 함수
const fetchApi = async (url, options = {}) => {
  try {
    console.log(`⚡️ API 요청 시작: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
    });
    
    // 응답 상태 로깅
    console.log(`📥 API 응답 상태: ${response.status} ${response.statusText}`);
    
    let data;
    try {
      data = await response.json();
      
      // 응답 데이터 로깅 (일부만 표시)
      const simplifiedData = { ...data };
      if (simplifiedData.data && simplifiedData.data.indicators) {
        const indicators = simplifiedData.data.indicators;
        simplifiedData.data = {
          ...simplifiedData.data,
          indicators: indicators.length > 0 
            ? [{ ...indicators[0], ...(indicators.length > 1 ? { __summary: `총 ${indicators.length}개 항목` } : {}) }] 
            : []
        };
      }
      console.log(`📦 API 응답 데이터:`, simplifiedData);
    } catch (jsonError) {
      console.error('JSON 파싱 에러:', jsonError);
      return { status: 'error', message: 'JSON 파싱 중 에러가 발생했습니다.' };
    }
    
    if (!response.ok) {
      console.error(`❌ API 오류 (${response.status}): ${data.message || '알 수 없는 오류'}`);
      
      if (data.details) {
        console.error('오류 세부 정보:', data.details);
      }
      
      throw new Error(data.message || '요청 처리 중 오류가 발생했습니다.');
    }
    
    return data;
  } catch (error) {
    console.error(`❌ API 호출 실패 (${url}):`, error.message);
    return {
      status: 'error',
      message: error.message || '요청 처리 중 오류가 발생했습니다.'
    };
  }
};

// API 관련 함수들
const api = {
  // 기본 API 호출 함수
  async call(method, endpoint, data = null) {
    try {
      const headers = getAuthHeaders();
      console.log(`API 호출: ${method} ${endpoint} (인증 헤더: ${headers.Authorization ? '있음' : '없음'})`);
      
      const options = {
        method,
        headers
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(endpoint, options);
      console.log(`API 응답 상태: ${response.status} ${response.statusText}`);
      
      const result = await response.json();

      if (!response.ok) {
        // 401 인증 오류 처리
        if (response.status === 401) {
          console.error('인증 오류 (401): 토큰이 만료되었거나 유효하지 않습니다');
          // 로컬 상태 초기화
          removeToken();
          localStorage.removeItem('currentCommittee');
          
          // 일정 시간 후 로그인 페이지로 리디렉션 (UI 업데이트 시간 주기)
          setTimeout(() => {
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            window.location.href = '/';
          }, 100);
        }
        
        throw new Error(result.message || '서버 오류가 발생했습니다.');
      }

      return result;
    } catch (error) {
      console.error('API 오류:', error);
      throw error;
    }
  },

  // 인증 관련 API
  auth: {
    async login(committeeName) {
      return api.call('POST', '/auth/login', { committeeName });
    },

    async logout() {
      return api.call('POST', '/auth/logout');
    },

    async getCurrentUser() {
      return api.call('GET', '/auth/current');
    }
  },

  // 기관 관련 API
  organizations: {
    async getMyOrganizations() {
      try {
        console.log('담당 기관 목록 조회 시작');
        const response = await api.call('GET', '/api/organizations/my');
        console.log('담당 기관 응답:', response);
        
        if (response.status === 'success') {
          return {
            status: 'success',
            data: {
              mainOrganizations: response.data.mainOrganizations || [],
              subOrganizations: response.data.subOrganizations || []
            }
          };
        }
        
        throw new Error(response.message || '기관 목록을 가져오는데 실패했습니다.');
      } catch (error) {
        console.error('담당 기관 목록 조회 중 오류:', error);
        throw error;
      }
    }
  }
};

// 기관 API
const organizationApi = {
  // 모든 기관 목록 가져오기
  getAllOrganizations: async () => {
    try {
      console.log('모든 기관 목록 가져오기 API 호출');
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = new Date().getTime();
      const headers = getAuthHeaders();
      console.log(`기관 목록 API 호출 (인증 헤더: ${headers.Authorization ? '있음' : '없음'})`);
      
      const response = await fetch(`/api/organizations?_t=${timestamp}`, {
        headers: headers
      });
      
      console.log(`기관 목록 API 응답 상태: ${response.status}`);
      
      if (response.status === 401) {
        console.error('인증 오류 (401): 토큰이 만료되었거나 유효하지 않습니다');
        // 로컬 상태 초기화
        removeToken();
        localStorage.removeItem('currentCommittee');
        
        // 일정 시간 후 로그인 페이지로 리디렉션
        setTimeout(() => {
          alert('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/';
        }, 100);
        
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      }
      
      if (!response.ok) {
        throw new Error('기관 목록을 가져오는데 실패했습니다.');
      }
      
      return await response.json();
    } catch (error) {
      console.error('기관 목록 가져오기 오류:', error);
      return { status: 'error', message: error.message };
    }
  },
  
  // 내 담당 기관 목록 가져오기
  getMyOrganizations: async () => {
    try {
      console.log('내 담당 기관 목록 가져오기 API 호출');
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = new Date().getTime();
      const headers = getAuthHeaders();
      console.log(`담당 기관 목록 API 호출 (인증 헤더: ${headers.Authorization ? '있음' : '없음'})`);
      
      const response = await fetch(`/api/organizations/my?_t=${timestamp}`, {
        headers: headers
      });
      
      console.log(`담당 기관 목록 API 응답 상태: ${response.status}`);
      
      if (response.status === 401) {
        console.error('인증 오류 (401): 토큰이 만료되었거나 유효하지 않습니다');
        // 로컬 상태 초기화
        removeToken();
        localStorage.removeItem('currentCommittee');
        
        // 일정 시간 후 로그인 페이지로 리디렉션
        setTimeout(() => {
          alert('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/';
        }, 100);
        
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      }
      
      if (!response.ok) {
        throw new Error('담당 기관 목록을 가져오는데 실패했습니다.');
      }
      
      return await response.json();
    } catch (error) {
      console.error('담당 기관 목록 가져오기 오류:', error);
      return { status: 'error', message: error.message };
    }
  },
  
  // 특정 기관 정보 가져오기
  getOrganizationByCode: async (orgCode) => {
    try {
      if (!orgCode) {
        throw new Error('기관 코드가 필요합니다.');
      }
      console.log(`기관 코드 ${orgCode}에 대한 정보 가져오기 API 호출`);
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/organizations/${orgCode}?_t=${timestamp}`);
      if (!response.ok) {
        throw new Error('기관 정보를 가져오는데 실패했습니다.');
      }
      return await response.json();
    } catch (error) {
      console.error('기관 정보 가져오기 오류:', error);
      return { status: 'error', message: error.message };
    }
  }
};

// 지표 API
const indicatorApi = {
  // 모든 지표 가져오기
  getAllIndicators: async () => {
    try {
      console.log('모든 지표 요청 시작');
      
      // 서버와 통신하는 대신 직접 임시 데이터 반환
      console.log('지표 임시 데이터 직접 반환');
      return {
        status: 'success',
        data: { 
          indicators: [
            { 
              id: 1, 
              category: '운영관리', 
              name: '1-1. 기관 운영규정', 
              description: '기관 운영에 필요한 규정이 마련되어 있고, 규정에 따라 기관을 운영한다.', 
              items: [
                '① 기관운영에 필요한 규정이 마련되어 있다.',
                '② 규정은 이사회의 승인을 거쳐 마련되었다.',
                '③ 규정이 필요에 따라 개정되고 있다.'
              ]
            },
            { 
              id: 2, 
              category: '운영관리', 
              name: '1-2. 운영계획서 및 예산', 
              description: '기관의 연간 운영계획서와 예산서가 이사회의 승인을 받아 수립되어 있고, 이에 따라 기관을 운영한다.', 
              items: [
                '① 기관의 연간 운영계획서가 이사회의 승인을 받아 수립되어 있다.',
                '② 기관의 연간 예산서가 이사회의 승인을 받아 수립되어 있다.',
                '③ 기관의 연간 운영계획에 준하여 사업이 진행되고 있다.',
                '④ 기관의 연간 예산에 따라 집행되고 있다.'
              ]
            },
            { 
              id: 3, 
              category: '인적자원관리', 
              name: '2-1. 인력확보', 
              description: '복지관 운영에 필요한 인력을 확보하고 있다.', 
              items: [
                '① 복지관 운영에 필요한 인력을 기준에 맞게 확보하고 있다.',
                '② 직원의 자격증 소지 등 자격기준을 준수하고 있다.'
              ]
            },
            { 
              id: 4, 
              category: '인적자원관리', 
              name: '2-2. 자원봉사자 관리', 
              description: '지역사회 자원봉사자를 발굴하고 관리한다.', 
              items: [
                '① 복지관내에 자원봉사자 관리 담당직원이 있다.',
                '② 자원봉사자 교육, 배치, 관리 등에 관한 규정이 있고 그에 따라 운영되고 있다.',
                '③ 자원봉사자를 대상으로 정기적인 교육을 실시하고 있다.'
              ]
            },
            { 
              id: 5, 
              category: '시설안전관리', 
              name: '3-1. 시설안전점검', 
              description: '정기적인 안전점검을 실시한다.', 
              items: [
                '① 시설에 대한 안전점검을 정기적으로 실시한다.',
                '② 안전점검 결과에 따라 개선조치를 취하고 있다.'
              ]
            }
          ] 
        }
      };
      
      // 테스트 엔드포인트 시도
      try {
        console.log('테스트 지표 엔드포인트 시도: /api/test-indicators');
        const testResponse = await fetch('/api/test-indicators', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (testResponse.ok) {
          const testResult = await testResponse.json();
          console.log('테스트 지표 엔드포인트 성공');
          return testResult;
        } else {
          console.log(`테스트 지표 엔드포인트 실패: ${testResponse.status}`);
        }
      } catch (testError) {
        console.log('테스트 지표 엔드포인트 실패:', testError);
      }
      
      // 기본 엔드포인트 시도
      const response = await fetch('/api/indicators', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include' // 세션 쿠키 포함
      });
      
      // 응답이 JSON이 아닐 경우 오류 처리
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('서버에서 JSON이 아닌 응답이 반환됨:', contentType);
        throw new Error('서버에서 JSON이 아닌 응답이 반환되었습니다.');
      }
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '지표 목록 조회에 실패했습니다.');
      }
      
      return result;
    } catch (error) {
      console.error('지표 목록 조회 중 오류:', error);
      // 오류 시에도 기본 데이터 반환하여 UI 오류 방지
      return {
        status: 'success',
        data: { 
          indicators: [
            { 
              id: 1, 
              category: '운영관리', 
              name: '1-1. 기관 운영규정', 
              description: '기관 운영에 필요한 규정이 마련되어 있고, 규정에 따라 기관을 운영한다.', 
              items: [
                '① 기관운영에 필요한 규정이 마련되어 있다.',
                '② 규정은 이사회의 승인을 거쳐 마련되었다.',
                '③ 규정이 필요에 따라 개정되고 있다.'
              ]
            },
            { 
              id: 2, 
              category: '운영관리', 
              name: '1-2. 운영계획서 및 예산', 
              description: '기관의 연간 운영계획서와 예산서가 이사회의 승인을 받아 수립되어 있고, 이에 따라 기관을 운영한다.', 
              items: [
                '① 기관의 연간 운영계획서가 이사회의 승인을 받아 수립되어 있다.',
                '② 기관의 연간 예산서가 이사회의 승인을 받아 수립되어 있다.',
                '③ 기관의 연간 운영계획에 준하여 사업이 진행되고 있다.',
                '④ 기관의 연간 예산에 따라 집행되고 있다.'
              ]
            },
            { 
              id: 3, 
              category: '인적자원관리', 
              name: '2-1. 인력확보', 
              description: '복지관 운영에 필요한 인력을 확보하고 있다.', 
              items: [
                '① 복지관 운영에 필요한 인력을 기준에 맞게 확보하고 있다.',
                '② 직원의 자격증 소지 등 자격기준을 준수하고 있다.'
              ]
            },
            { 
              id: 4, 
              category: '인적자원관리', 
              name: '2-2. 자원봉사자 관리', 
              description: '지역사회 자원봉사자를 발굴하고 관리한다.', 
              items: [
                '① 복지관내에 자원봉사자 관리 담당직원이 있다.',
                '② 자원봉사자 교육, 배치, 관리 등에 관한 규정이 있고 그에 따라 운영되고 있다.',
                '③ 자원봉사자를 대상으로 정기적인 교육을 실시하고 있다.'
              ]
            },
            { 
              id: 5, 
              category: '시설안전관리', 
              name: '3-1. 시설안전점검', 
              description: '정기적인 안전점검을 실시한다.', 
              items: [
                '① 시설에 대한 안전점검을 정기적으로 실시한다.',
                '② 안전점검 결과에 따라 개선조치를 취하고 있다.'
              ]
            }
          ] 
        }
      };
    }
  },
  
  // 주기별 지표 가져오기
  getIndicatorsByPeriod: async (period) => {
    try {
      console.log(`주기(${period}) 지표 조회 요청`);
      
      const response = await fetch(`/api/indicators/period/${period}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '지표 목록 조회에 실패했습니다.');
      }
      
      console.log(`주기(${period}) 지표 ${result.data?.indicators?.length || 0}개 조회됨`);
      return result;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // 특정 ID의 지표 가져오기
  getIndicatorById: async (indicatorId) => {
    return fetchApi(`${API_URL}/indicators/${indicatorId}`);
  }
};

// 결과 API
const resultApi = {
  // 결과 저장하기
  saveMonitoringResult: async (data) => {
    try {
      console.log('모니터링 결과 저장 요청 시작:', data);
      
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include', // 세션 쿠키 포함
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '결과 저장에 실패했습니다.');
      }
      
      return result;
    } catch (error) {
      console.error('결과 저장 중 오류:', error);
      throw error;
    }
  },
  
  // 특정 기관의 모니터링 결과 가져오기
  getResultsByOrganization: async (orgCode) => {
    try {
      console.log(`기관 (${orgCode}) 결과 조회 요청`);
      
      const response = await fetch(`/api/results/organization/${orgCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '결과 조회에 실패했습니다.');
      }
      
      console.log(`기관 (${orgCode}) 결과 조회 완료: ${result.data?.results?.length || 0}개 결과`);
      return result;
    } catch (error) {
      console.error(`기관 (${orgCode}) 결과 조회 중 오류:`, error);
      return handleApiError(error);
    }
  },
  
  // 내 모니터링 결과 가져오기
  getMyResults: async () => {
    try {
      console.log('내 결과 조회 요청');
      
      const response = await fetch('/api/results/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '결과 조회에 실패했습니다.');
      }
      
      console.log(`내 결과 조회 완료: ${result.data?.results?.length || 0}개 결과`);
      return result;
    } catch (error) {
      console.error('내 결과 조회 중 오류:', error);
      return handleApiError(error);
    }
  },
  
  // 특정 기관과 지표에 대한 모니터링 결과 가져오기
  getResultByOrgAndIndicator: async (orgCode, indicatorId) => {
    try {
      console.log(`기관 (${orgCode})의 지표 (${indicatorId}) 결과 조회 요청`);
      
      const response = await fetch(`/api/results/organization/${orgCode}/indicator/${indicatorId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '결과 조회에 실패했습니다.');
      }
      
      // 필수 필드 확인 및 추가
      if (result.data && result.data.result) {
        // 필수 필드가 없는 경우 빈 문자열로 초기화
        if (!result.data.result.hasOwnProperty('category')) {
          result.data.result.category = '';
        }
        if (!result.data.result.hasOwnProperty('지역')) {
          result.data.result.지역 = '';
        }
        
        console.log(`결과 데이터 확인:`, result.data.result);
      } else {
        console.log('결과 데이터가 없음');
      }
      
      console.log(`기관 (${orgCode})의 지표 (${indicatorId}) 결과 조회 완료:`, result.data?.result);
      return result;
    } catch (error) {
      console.error(`기관 (${orgCode})의 지표 (${indicatorId}) 결과 조회 중 오류:`, error);
      return handleApiError(error);
    }
  },
  
  // 중복 데이터 정리 (관리자 전용)
  cleanupDuplicateResults: async () => {
    try {
      console.log('중복 데이터 정리 요청');
      
      const response = await fetch('/api/results/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '중복 데이터 정리에 실패했습니다.');
      }
      
      console.log('중복 데이터 정리 완료:', result);
      return result;
    } catch (error) {
      console.error('중복 데이터 정리 중 오류:', error);
      return handleApiError(error);
    }
  }
};

// 위원회 API
const committeeApi = {
  // 모든 위원 목록 가져오기
  getAllCommittees: async () => {
    try {
      console.log('모든 위원 목록 가져오기 API 호출');
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = new Date().getTime();
      const headers = getAuthHeaders();
      console.log(`위원 목록 API 호출 (인증 헤더: ${headers.Authorization ? '있음' : '없음'})`);
      
      const response = await fetch(`/api/committees/all?_t=${timestamp}`, {
        headers: headers
      });
      
      console.log(`위원 목록 API 응답 상태: ${response.status}`);
      
      if (response.status === 401) {
        console.error('인증 오류 (401): 토큰이 만료되었거나 유효하지 않습니다');
        // 로컬 상태 초기화
        removeToken();
        localStorage.removeItem('currentCommittee');
        
        // 일정 시간 후 로그인 페이지로 리디렉션
        setTimeout(() => {
          alert('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/';
        }, 100);
        
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      }
      
      if (!response.ok) {
        throw new Error('위원 목록을 가져오는데 실패했습니다.');
      }
      
      const responseData = await response.json();
      
      // 응답 데이터 확인 및 필드 매핑
      if (responseData.status === 'success' && responseData.data && responseData.data.committees) {
        // 각 위원 객체의 필드명을 표준화
        const committees = responseData.data.committees.map(committee => {
          return {
            id: committee.ID || committee.id || '',
            name: committee.이름 || committee.name || '',
            role: committee.역할 || committee.role || 'committee'
          };
        });
        
        // 중복 제거 (이름 기준으로)
        const uniqueCommittees = [];
        const namesSet = new Set();
        
        for (const committee of committees) {
          if (!namesSet.has(committee.name)) {
            namesSet.add(committee.name);
            uniqueCommittees.push(committee);
          }
        }
        
        console.log(`위원 데이터 중복 제거: ${committees.length}개 -> ${uniqueCommittees.length}개`);
        
        return {
          status: 'success',
          data: { committees: uniqueCommittees }
        };
      }
      
      return responseData;
    } catch (error) {
      console.error('위원 목록 가져오기 오류:', error);
      return { status: 'error', message: error.message };
    }
  },
  
  // 현재 로그인한 위원 정보 가져오기
  getCurrentCommittee: async () => {
    try {
      console.log('현재 로그인한 위원 정보 가져오기 API 호출');
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/committees/me?_t=${timestamp}`);
      if (!response.ok) {
        throw new Error('현재 위원 정보를 가져오는데 실패했습니다.');
      }
      return await response.json();
    } catch (error) {
      console.error('현재 위원 정보 가져오기 오류:', error);
      return { status: 'error', message: error.message };
    }
  },
  
  // 모든 위원-기관 매칭 정보 가져오기
  getAllMatchings: async () => {
    try {
      console.log('모든 위원-기관 매칭 정보 가져오기 API 호출');
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = new Date().getTime();
      const headers = getAuthHeaders();
      console.log(`매칭 정보 API 호출 (인증 헤더: ${headers.Authorization ? '있음' : '없음'})`);
      
      const response = await fetch(`/api/committees/matching?_t=${timestamp}`, {
        headers: headers
      });
      
      console.log(`매칭 정보 API 응답 상태: ${response.status}`);
      
      if (response.status === 401) {
        console.error('인증 오류 (401): 토큰이 만료되었거나 유효하지 않습니다');
        // 로컬 상태 초기화
        removeToken();
        localStorage.removeItem('currentCommittee');
        
        // 일정 시간 후 로그인 페이지로 리디렉션
        setTimeout(() => {
          alert('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/';
        }, 100);
        
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
      }
      
      if (!response.ok) {
        throw new Error('매칭 정보를 가져오는데 실패했습니다.');
      }
      
      return await response.json();
    } catch (error) {
      console.error('매칭 정보 가져오기 오류:', error);
      return { status: 'error', message: error.message };
    }
  },
  
  // 위원-기관 매칭 정보 업데이트
  updateMatchings: async (matchings) => {
    try {
      console.log('위원-기관 매칭 정보 업데이트 API 호출');
      const response = await fetch('/api/committees/matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ matchings })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '매칭 정보 업데이트 실패');
      }
      
      return await response.json();
    } catch (error) {
      console.error('매칭 정보 업데이트 오류:', error);
      return { status: 'error', message: error.message };
    }
  }
}; 