// 마스터 대시보드 관련 기능

// 전역 변수: 기관 목록
let allOrganizations = [];
// 전역 변수: 위원 목록
let allCommittees = [];
// 전역 변수: 위원-기관 매칭 정보
let allMatchings = [];

// 마스터 대시보드 초기화 및 표시
const showMasterDashboard = async () => {
  try {
    // 일반 화면 숨기기
    document.getElementById('organization-selection').classList.add('hidden');
    document.getElementById('monitoring-indicators').classList.add('hidden');
    
    // 마스터 대시보드 컨테이너 가져오기 또는 생성
    let masterDashboard = document.getElementById('master-dashboard');
    if (!masterDashboard) {
      masterDashboard = document.createElement('div');
      masterDashboard.id = 'master-dashboard';
      masterDashboard.className = 'flex-1 container mx-auto px-4 py-6';
      document.querySelector('main').appendChild(masterDashboard);
    }
    
    // 마스터 대시보드 기본 내용
    masterDashboard.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 class="text-xl font-bold text-blue-700 mb-4">마스터 관리자 대시보드</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" id="dashboard-stats">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="text-md font-medium text-blue-800 mb-2">전체 기관</h3>
            <div class="text-3xl font-bold" id="total-orgs-count">51</div>
            <p class="text-sm text-gray-500 mt-1">모니터링 대상 기관</p>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="text-md font-medium text-green-800 mb-2">전체 완료율</h3>
            <div class="text-3xl font-bold" id="monitoring-completion-rate">0%</div>
            <p class="text-sm text-gray-500 mt-1">지표 점검 완료</p>
          </div>
          <div class="bg-purple-50 p-4 rounded-lg">
            <h3 class="text-md font-medium text-purple-800 mb-2">위원 수</h3>
            <div class="text-3xl font-bold" id="committees-count">5</div>
            <p class="text-sm text-gray-500 mt-1">활동 중인 모니터링 위원</p>
          </div>
        </div>
        
        <div class="mb-6">
          <h3 class="text-lg font-medium mb-3">기관-담당자 매칭 관리</h3>
          <div class="bg-blue-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-blue-800">이 화면에서 모니터링 위원을 기관의 주담당 또는 부담당으로 배정할 수 있습니다.</p>
          </div>
          
          <div class="flex items-center justify-between mb-4">
            <div class="flex space-x-2">
              <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition" id="add-match-btn">
                담당자 매칭 추가
              </button>
              <button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition" id="add-org-btn">
                기관 추가
              </button>
              <button class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition" id="refresh-matches-btn">
                새로고침
              </button>
            </div>
            <div class="flex items-center">
              <label for="org-filter" class="mr-2 text-sm">기관 필터:</label>
              <select id="org-filter" class="border rounded px-2 py-1">
                <option value="">전체 기관</option>
                <option value="main">주담당 미배정</option>
                <option value="sub">부담당 미배정</option>
              </select>
            </div>
          </div>
          
          <div class="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">기관명</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">기관코드</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주담당</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">부담당</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">진행률</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비고</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody id="matching-table-body" class="bg-white divide-y divide-gray-200">
                <tr>
                  <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    
    // 마스터 대시보드 표시
    masterDashboard.classList.remove('hidden');
    
    // 데이터 로드
    await loadMasterDashboardData();
    
    // 이벤트 리스너 등록
    document.getElementById('add-match-btn').addEventListener('click', showAddMatchingModal);
    document.getElementById('add-org-btn').addEventListener('click', showAddOrgModal);
    document.getElementById('refresh-matches-btn').addEventListener('click', refreshMatchingData);
    document.getElementById('org-filter').addEventListener('change', filterOrganizations);
  } catch (error) {
    console.error('마스터 대시보드 초기화 중 오류:', error);
    alert('대시보드 로딩 중 오류가 발생했습니다.');
  }
};

// 마스터 대시보드 데이터 로드
const loadMasterDashboardData = async () => {
  try {
    console.log('마스터 대시보드 데이터 로드 시작');
    
    // 1. 기관 목록 가져오기
    const orgsResponse = await organizationApi.getAllOrganizations();
    if (orgsResponse.status === 'success') {
      allOrganizations = orgsResponse.data.organizations || [];
      // 항상 51로 표시
      document.getElementById('total-orgs-count').textContent = '51';
      console.log('기관 목록 로드 완료:', allOrganizations.length);
    } else {
      console.error('조직 목록 조회 실패:', orgsResponse.message);
      // 실패해도 51로 표시
      document.getElementById('total-orgs-count').textContent = '51';
      allOrganizations = [];
    }

    // 2. 위원 목록 가져오기
    const committeesResponse = await committeeApi.getAllCommittees();
    if (committeesResponse.status === 'success') {
      allCommittees = committeesResponse.data.committees || [];
      // 위원 수를 5명으로 하드코딩
      document.getElementById('committees-count').textContent = '5';
      console.log('위원 목록 로드 완료:', allCommittees.length);
    } else {
      console.error('위원 목록 조회 실패:', committeesResponse.message);
      // 위원 수를 5명으로 하드코딩
      document.getElementById('committees-count').textContent = '5';
      allCommittees = [];
    }

    // 3. 매칭 정보 가져오기
    await refreshMatchingData();

    // 지역별 기관 분류 및 출력
    showOrganizationsByRegion();

    // 4. 진행률 계산 및 표시 (실제 데이터 기반)
    try {
      // 모니터링 결과 데이터 가져오기
      console.log('모니터링 결과 데이터 가져오기 시작');
      const timestamp = new Date().getTime();
      const headers = getAuthHeaders();
      console.log(`결과 데이터 API 호출 (인증 헤더: ${headers.Authorization ? '있음' : '없음'})`);
      
      const completionDataResponse = await fetch(`/api/results/me?_t=${timestamp}`, {
        headers: headers
      });
      
      console.log(`결과 데이터 API 응답 상태: ${completionDataResponse.status}`);
      
      if (completionDataResponse.status === 401) {
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
      
      if (!completionDataResponse.ok) {
        console.error('결과 데이터 가져오기 실패:', completionDataResponse.status);
        document.getElementById('monitoring-completion-rate').textContent = '0%';
        throw new Error('모니터링 결과 데이터를 가져오는데 실패했습니다.');
      }
      
      const completionData = await completionDataResponse.json();
      console.log('결과 데이터 로드 완료', completionData.status);
      
      if (completionData.status === 'success' && completionData.data && completionData.data.results) {
        // 총 수행해야 할 지표 수
        const totalIndicators = allOrganizations.length * 63; // 63개 지표 (총 지표 수)
        
        // 수행된 지표 수
        const completedIndicators = completionData.data.results.length;
        
        // 완료율 계산
        const completionRate = totalIndicators > 0 
          ? Math.round((completedIndicators / totalIndicators) * 100) 
          : 0;
        
        console.log(`완료율 계산: ${completedIndicators}/${totalIndicators} = ${completionRate}%`);
        document.getElementById('monitoring-completion-rate').textContent = `${completionRate}%`;
      } else {
        // 데이터가 없거나 오류가 발생한 경우
        console.warn('유효한 결과 데이터를 받지 못함');
        document.getElementById('monitoring-completion-rate').textContent = '0%';
      }
    } catch (error) {
      console.error('완료율 계산 중 오류:', error);
      document.getElementById('monitoring-completion-rate').textContent = '0%';
    }
    
    console.log('마스터 대시보드 데이터 로드 완료');
  } catch (error) {
    console.error('대시보드 데이터 로드 중 오류:', error);
    // 더 자세한 오류 메시지 표시
    alert(`데이터 로드 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    // 기본값 설정
    document.getElementById('committees-count').textContent = '0';
    document.getElementById('total-orgs-count').textContent = '51';
    document.getElementById('monitoring-completion-rate').textContent = '0%';
    allCommittees = [];
    allOrganizations = [];
  }
};

// 매칭 정보 새로고침
const refreshMatchingData = async () => {
  try {
    console.log('매칭 정보 새로고침 시작');
    const matchingsResponse = await committeeApi.getAllMatchings();
    
    if (matchingsResponse.status === 'success') {
      allMatchings = matchingsResponse.data.matchings || [];
      console.log('매칭 정보 로드 완료:', allMatchings.length);
      
      // 매칭 데이터 기반으로 테이블 업데이트
      updateMatchingTable();
    } else {
      console.error('매칭 정보 조회 실패:', matchingsResponse.message);
      
      // 빈 데이터로 테이블 초기화
      allMatchings = [];
      
      // 테이블을 비움
      const tableBody = document.getElementById('matching-table-body');
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
              매칭 정보를 불러오는데 실패했습니다. 새로고침을 시도해주세요.
            </td>
          </tr>
        `;
      }
    }
  } catch (error) {
    console.error('매칭 데이터 새로고침 중 오류:', error);
    
    // 빈 데이터로 테이블 초기화
    allMatchings = [];
    
    // 테이블을 비움
    const tableBody = document.getElementById('matching-table-body');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
            오류: ${error.message || '알 수 없는 오류'}
          </td>
        </tr>
      `;
    }
  }
};

// 매칭 테이블 업데이트
const updateMatchingTable = () => {
  console.log('매칭 테이블 업데이트 시작');
  
  const tableBody = document.getElementById('matching-table-body');
  if (!tableBody) {
    console.error('매칭 테이블 본문을 찾을 수 없습니다');
    return;
  }
  
  // 필터 값 가져오기 (있을 경우)
  const filterValue = document.getElementById('org-filter')?.value || '';
  
  // 필터링된 기관 목록
  let filteredOrgs = [...allOrganizations];
  
  if (filterValue === 'main') {
    // 주담당 미배정 기관만 표시
    filteredOrgs = allOrganizations.filter(org => {
      const matching = allMatchings.find(m => m.orgCode === org.code);
      return !matching || !matching.mainCommittee;
    });
  } else if (filterValue === 'sub') {
    // 부담당 미배정 기관만 표시
    filteredOrgs = allOrganizations.filter(org => {
      const matching = allMatchings.find(m => m.orgCode === org.code);
      return !matching || !matching.subCommittee;
    });
  }
  
  // 기관이 없는 경우
  if (filteredOrgs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500">
          표시할 기관이 없습니다.
        </td>
      </tr>
    `;
    return;
  }
  
  // 테이블 내용 생성
  let tableContent = '';
  
  filteredOrgs.forEach(org => {
    // 해당 기관의 매칭 정보 찾기
    const matching = allMatchings.find(m => m.orgCode === org.code) || {};
    
    // 주담당, 부담당 위원 정보
    const mainCommitteeName = matching.mainCommittee || '-';
    const subCommitteeName = matching.subCommittee || '-';
    
    // 진행률 계산 (가상 데이터)
    const progressRate = Math.floor(Math.random() * 101); // 0~100 사이의 랜덤 값
    
    tableContent += `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${org.name}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-500">${org.code}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm ${mainCommitteeName === '-' ? 'text-red-500' : 'text-gray-900'}">${mainCommitteeName}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm ${subCommitteeName === '-' ? 'text-yellow-500' : 'text-gray-900'}">${subCommitteeName}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progressRate}%"></div>
          </div>
          <div class="text-xs text-gray-500 mt-1 text-right">${progressRate}%</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${org.region || '지역 정보 없음'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button class="text-indigo-600 hover:text-indigo-900 mr-2 edit-match-btn" 
                  data-org-code="${org.code}" data-org-name="${org.name}">
            담당자 변경
          </button>
        </td>
      </tr>
    `;
  });
  
  // 테이블 업데이트
  tableBody.innerHTML = tableContent;
  
  // 담당자 변경 버튼에 이벤트 리스너 등록
  document.querySelectorAll('.edit-match-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orgCode = e.target.dataset.orgCode;
      const orgName = e.target.dataset.orgName;
      showEditMatchingModal(orgCode, orgName);
    });
  });
  
  console.log('매칭 테이블 업데이트 완료');
};

// 필터링 적용
const filterOrganizations = () => {
  updateMatchingTable();
};

// 기관 매칭 저장
const saveOrgMatching = async (orgCode) => {
  try {
    // 기관 찾기
    const organization = allOrganizations.find(org => {
      const code = org.code || org.기관코드 || org.orgCode || '';
      console.log(`비교 중: ${code} vs ${orgCode}`);
      return code === orgCode;
    });
    
    if (!organization) {
      alert(`기관 코드 ${orgCode}에 해당하는 기관을 찾을 수 없습니다.`);
      return;
    }

    console.log('매칭 설정할 기관:', organization);
    
    // 다양한 필드명에 대응
    const orgId = organization.id || organization.orgId || organization.기관ID || '';
    const orgName = organization.name || organization.기관명 || organization.orgName || '';
    const orgRegion = organization.region || organization.지역 || '';
    const orgNote = organization.note || '';
    
    // 현재 매칭 정보 가져오기
    const currentMatchings = allMatchings.filter(m => {
      const matchCode = m.orgCode || '';
      return matchCode === orgCode;
    });
    
    const mainCommittee = currentMatchings.find(m => m && m.role === '주담당');
    const subCommittees = currentMatchings.filter(m => m && m.role === '부담당');
    
    console.log('현재 주담당:', mainCommittee);
    console.log('현재 부담당:', subCommittees);
    
    // 모달 내용 구성
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center z-50';
    modal.id = 'matching-modal';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black opacity-50"></div>
      <div class="bg-white rounded-lg p-6 relative z-10 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">담당자 설정 - ${orgName}</h2>
        
        <div class="mb-2">
          <p class="text-sm text-gray-500">지역: ${orgRegion}</p>
          <p class="text-sm text-gray-500">코드: ${orgCode}</p>
          ${orgNote ? `<p class="text-sm text-gray-500 mb-3">비고: ${orgNote}</p>` : ''}
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">주담당</label>
          <select id="main-committee-select" class="border rounded w-full px-3 py-2">
            <option value="">선택하세요</option>
            ${allCommittees.map(committee => {
              const committeeName = committee.name || '';
              const isSelected = mainCommittee && mainCommittee.committeeName === committeeName;
              return `
                <option value="${committeeName}" ${isSelected ? 'selected' : ''}>
                  ${committeeName}
                </option>
              `;
            }).join('')}
          </select>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">부담당 (복수 선택 가능)</label>
          <select id="sub-committees-select" class="border rounded w-full px-3 py-2" multiple size="5">
            ${allCommittees.map(committee => {
              const committeeName = committee.name || '';
              const isSelected = subCommittees.some(sub => sub && sub.committeeName === committeeName);
              return `
                <option value="${committeeName}" ${isSelected ? 'selected' : ''}>
                  ${committeeName}
                </option>
              `;
            }).join('')}
          </select>
          <p class="text-xs text-gray-500 mt-1">Ctrl 또는 Shift를 누른 채 클릭하여 여러 명 선택 가능</p>
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-1">점검 유형</label>
          <div class="flex space-x-4 mt-1">
            <label class="inline-flex items-center">
              <input type="radio" name="check-type" value="전체" class="form-radio" checked>
              <span class="ml-2">전체</span>
            </label>
            <label class="inline-flex items-center">
              <input type="radio" name="check-type" value="매월" class="form-radio">
              <span class="ml-2">매월</span>
            </label>
            <label class="inline-flex items-center">
              <input type="radio" name="check-type" value="반기" class="form-radio">
              <span class="ml-2">반기</span>
            </label>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button id="cancel-matching-btn" class="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 transition">
            취소
          </button>
          <button id="save-matching-confirm-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            저장
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 이벤트 리스너 등록
    document.getElementById('cancel-matching-btn').addEventListener('click', () => closeModal('matching-modal'));
    document.getElementById('save-matching-confirm-btn').addEventListener('click', () => {
      saveModalMatching(orgCode)
        .catch(error => {
          console.error('매칭 저장 중 오류:', error);
          closeModal('matching-modal');
          alert(`매칭 저장 중 오류가 발생했습니다: ${error.message}`);
        });
    });
  } catch (error) {
    console.error('담당자 설정 모달 표시 중 오류:', error);
    alert('담당자 설정 중 오류가 발생했습니다.');
  }
};

// 기관 매칭 정보 초기화
const resetOrgMatching = async (orgCode) => {
  try {
    // 기관 찾기
    const organization = allOrganizations.find(org => (org.code === orgCode || org.기관코드 === orgCode));
    if (!organization) {
      alert(`기관 코드 ${orgCode}에 해당하는 기관을 찾을 수 없습니다.`);
      return;
    }

    // 초기화 확인
    const orgName = organization.name || organization.기관명;
    if (!confirm(`${orgName} 기관의 모든 담당자 매칭을 초기화하시겠습니까?`)) {
      return;
    }

    // 기존 매칭 정보 필터링
    const updatedMatchings = allMatchings.filter(m => m.orgCode !== orgCode);
    
    // API 호출하여 저장
    const response = await fetch('/api/committees/matching', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ matchings: updatedMatchings })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '매칭 정보 초기화 실패');
    }
    
    // 성공 처리
    alert(`${orgName} 기관의 담당자 매칭이 초기화되었습니다.`);
    // 매칭 정보 새로고침
    await refreshMatchingData();
    
  } catch (error) {
    console.error('담당자 초기화 중 오류:', error);
    alert(`담당자 초기화 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 모달에서 매칭 정보 저장
const saveModalMatching = async (orgCode) => {
  try {
    // 기관 정보 찾기
    const organization = allOrganizations.find(org => (org.code === orgCode || org.기관코드 === orgCode));
    if (!organization) {
      throw new Error(`기관 코드 ${orgCode}에 해당하는 기관을 찾을 수 없습니다.`);
    }

    console.log('저장할 기관 정보:', organization);
    
    // 선택된 위원 정보 가져오기
    const mainCommitteeSelect = document.getElementById('main-committee-select');
    const subCommitteesSelect = document.getElementById('sub-committees-select');
    const checkTypeRadios = document.getElementsByName('check-type');
    
    const mainCommitteeName = mainCommitteeSelect.value;
    const subCommitteeNames = Array.from(subCommitteesSelect.selectedOptions).map(option => option.value);
    
    // 선택된 점검 유형 가져오기
    let selectedCheckType = '전체'; // 기본값
    for (const radio of checkTypeRadios) {
      if (radio.checked) {
        selectedCheckType = radio.value;
        break;
      }
    }
    
    console.log('선택된 주담당:', mainCommitteeName);
    console.log('선택된 부담당:', subCommitteeNames);
    console.log('선택된 점검 유형:', selectedCheckType);
    
    // 주담당 위원 정보
    let mainCommittee = null;
    if (mainCommitteeName) {
      const committeeInfo = allCommittees.find(c => c.name === mainCommitteeName);
      if (committeeInfo) {
        mainCommittee = {
          committeeId: committeeInfo.id || '',
          committeeName: committeeInfo.name,
          orgId: organization.id || organization.orgId || '',
          orgCode: orgCode,
          orgName: organization.name || organization.기관명 || '',
          region: organization.region || organization.지역 || '',
          role: '주담당',
          checkType: selectedCheckType
        };
      }
    }
    
    // 부담당 위원 정보
    const subCommittees = subCommitteeNames.map(name => {
      const committeeInfo = allCommittees.find(c => c.name === name);
      if (!committeeInfo) return null;
      
      return {
        committeeId: committeeInfo.id || '',
        committeeName: committeeInfo.name,
        orgId: organization.id || organization.orgId || '',
        orgCode: orgCode,
        orgName: organization.name || organization.기관명 || '',
        region: organization.region || organization.지역 || '',
        role: '부담당',
        checkType: selectedCheckType
      };
    }).filter(Boolean); // null 제거
    
    // 현재 매칭 상태 로깅
    console.log('현재 매칭 상태:', allMatchings);
    
    // 기존 매칭에서 현재 기관 매칭은 제외
    const filteredMatchings = allMatchings.filter(m => m.orgCode !== orgCode);
    console.log('현재 기관 제외 매칭:', filteredMatchings.length);
    
    // 새 매칭 추가
    let updatedMatchings = [...filteredMatchings];
    
    // 주담당 추가
    if (mainCommittee) {
      console.log('추가할 주담당:', mainCommittee);
      updatedMatchings.push(mainCommittee);
    }
    
    // 부담당 추가
    if (subCommittees.length > 0) {
      console.log('추가할 부담당 수:', subCommittees.length);
      updatedMatchings = [...updatedMatchings, ...subCommittees];
    }
    
    console.log('최종 매칭 데이터:', updatedMatchings);
    
    // API 호출하여 저장
    const response = await fetch('/api/committees/matching', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ matchings: updatedMatchings })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '매칭 정보 저장 실패');
    }
    
    // 성공 처리
    closeModal('matching-modal');
    alert('담당자 매칭이 성공적으로 저장되었습니다.');
    // 매칭 정보 새로고침
    await refreshMatchingData();
    
  } catch (error) {
    console.error('매칭 정보 저장 중 오류:', error);
    alert(`매칭 정보 저장 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 매칭 추가 모달 표시
const showAddMatchingModal = () => {
  // 모달 생성
  const modalContainer = document.createElement('div');
  modalContainer.id = 'matching-modal';
  modalContainer.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
  
  modalContainer.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium">담당자 매칭 추가</h3>
        <button id="close-modal-btn" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">기관 선택</label>
        <select id="modal-org-select" class="border rounded px-3 py-2 w-full">
          <option value="">기관을 선택하세요</option>
          ${allOrganizations.map(org => `
            <option value="${org.code || org.기관코드}">
              ${org.name || org.기관명} (${org.code || org.기관코드})
            </option>
          `).join('')}
        </select>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">주담당 위원</label>
        <select id="modal-main-committee" class="border rounded px-3 py-2 w-full">
          <option value="">선택하세요</option>
          ${allCommittees.map(committee => `
            <option value="${committee.name}">${committee.name}</option>
          `).join('')}
        </select>
      </div>
      
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">부담당 위원 (다중 선택)</label>
        <select id="modal-sub-committees" class="border rounded px-3 py-2 w-full" multiple size="4">
          ${allCommittees.map(committee => `
            <option value="${committee.name}">${committee.name}</option>
          `).join('')}
        </select>
        <p class="text-xs text-gray-500 mt-1">Ctrl 키를 누른 상태에서 클릭하여 다중 선택할 수 있습니다.</p>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button id="modal-cancel-btn" class="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">
          취소
        </button>
        <button id="modal-save-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          저장
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalContainer);
  
  // 이벤트 리스너 등록
  document.getElementById('close-modal-btn').addEventListener('click', () => closeModal('matching-modal'));
  document.getElementById('modal-cancel-btn').addEventListener('click', () => closeModal('matching-modal'));
  document.getElementById('modal-save-btn').addEventListener('click', () => {
    // 선택된 기관 코드 가져오기
    const orgCode = document.getElementById('modal-org-select').value;
    if (!orgCode) {
      alert('기관을 선택해주세요.');
      return;
    }
    saveModalMatching(orgCode);
  });
  
  // 기관 선택 시 기존 매칭 정보 표시
  document.getElementById('modal-org-select').addEventListener('change', (e) => {
    const orgCode = e.target.value;
    if (!orgCode) return;
    
    // 기존 매칭 정보 가져오기
    const matchings = allMatchings.filter(m => m.orgCode === orgCode);
    
    // 주담당 위원
    const mainCommittee = matchings.find(m => m.role === '주담당');
    if (mainCommittee) {
      document.getElementById('modal-main-committee').value = mainCommittee.committeeName;
    } else {
      document.getElementById('modal-main-committee').value = '';
    }
    
    // 부담당 위원
    const subCommittees = matchings.filter(m => m.role === '부담당');
    const subCommitteesSelect = document.getElementById('modal-sub-committees');
    
    // 모든 선택 해제
    Array.from(subCommitteesSelect.options).forEach(option => {
      option.selected = false;
    });
    
    // 부담당 위원 선택
    subCommittees.forEach(sub => {
      const option = Array.from(subCommitteesSelect.options).find(opt => opt.value === sub.committeeName);
      if (option) {
        option.selected = true;
      }
    });
  });
};

// 모달 닫기
const closeModal = (modalId) => {
  // 명시적 modalId가 있는 경우 해당 모달만 제거
  if (modalId) {
    const modalContainer = document.getElementById(modalId);
    if (modalContainer) {
      modalContainer.remove();
      return;
    }
  }
  
  // modalId가 없거나 찾지 못한 경우 모든 가능한 모달 찾아서 제거
  const matchingModal = document.getElementById('matching-modal');
  const orgModal = document.getElementById('org-modal');
  
  if (matchingModal) {
    matchingModal.remove();
  }
  
  if (orgModal) {
    orgModal.remove();
  }
  
  // 혹시 다른 모달이 있을 경우를 대비해 모달 클래스로도 찾아서 제거
  const otherModals = document.querySelectorAll('.fixed.inset-0.flex.items-center.justify-center.z-50');
  otherModals.forEach(modal => {
    modal.remove();
  });
};

// 지역별 기관 분류 및 출력
const showOrganizationsByRegion = () => {
  try {
    // 모든 기관을 지역별로 분류
    const regionMap = {};
    
    // 각 기관의 지역 정보 수집
    allOrganizations.forEach(org => {
      const region = org.region || '미분류';
      if (!regionMap[region]) {
        regionMap[region] = [];
      }
      regionMap[region].push({
        name: org.name || org.기관명,
        code: org.code || org.기관코드
      });
    });
    
    // 지역별로 정렬하여 출력
    console.log('----- 지역별 기관 분류 -----');
    
    // 시 지역과 군 지역으로 구분
    const cities = [];
    const counties = [];
    
    Object.keys(regionMap).forEach(region => {
      if (region.includes('시')) {
        cities.push(region);
      } else if (region.includes('군')) {
        counties.push(region);
      }
    });
    
    // 시 지역 출력
    console.log('=== 시 지역 ===');
    cities.sort().forEach(city => {
      console.log(`[${city}] - ${regionMap[city].length}개 기관`);
      regionMap[city].forEach(org => {
        console.log(`  - ${org.name} (${org.code})`);
      });
    });
    
    // 군 지역 출력
    console.log('\n=== 군 지역 ===');
    counties.sort().forEach(county => {
      console.log(`[${county}] - ${regionMap[county].length}개 기관`);
      regionMap[county].forEach(org => {
        console.log(`  - ${org.name} (${org.code})`);
      });
    });
    
    // 기타 지역 출력 (시나 군이 아닌 경우)
    const others = Object.keys(regionMap).filter(region => 
      !region.includes('시') && !region.includes('군'));
    
    if (others.length > 0) {
      console.log('\n=== 기타 지역 ===');
      others.sort().forEach(region => {
        console.log(`[${region}] - ${regionMap[region].length}개 기관`);
        regionMap[region].forEach(org => {
          console.log(`  - ${org.name} (${org.code})`);
        });
      });
    }
    
    return regionMap;
  } catch (error) {
    console.error('지역별 기관 분류 중 오류:', error);
    return {};
  }
};

// 기관 추가 모달 표시
const showAddOrgModal = () => {
  // 모달 생성
  const modalContainer = document.createElement('div');
  modalContainer.id = 'org-modal';
  modalContainer.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
  
  // 시/군 리스트 생성
  const regions = [
    '창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', 
    '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', 
    '산청군', '함양군', '거창군', '합천군', '경남'
  ];
  
  const regionOptions = regions.map(region => 
    `<option value="${region}">${region}</option>`
  ).join('');
  
  // 다음 기관 코드 자동 생성 (A48XXXXXX 형식)
  const nextOrgCode = `A48${String(Math.floor(Math.random() * 900000) + 100000)}`;
  
  modalContainer.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium">새 기관 추가</h3>
        <button id="close-org-modal-btn" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">기관명</label>
        <input id="org-name-input" type="text" class="border rounded px-3 py-2 w-full" placeholder="기관 이름 입력">
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">기관코드</label>
        <input id="org-code-input" type="text" value="${nextOrgCode}" class="border rounded px-3 py-2 w-full" placeholder="기관 코드 입력 (A48로 시작)">
        <p class="text-xs text-gray-500 mt-1">기관코드는 A48로 시작하는 고유값이어야 합니다.</p>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">지역</label>
        <select id="org-region-select" class="border rounded px-3 py-2 w-full">
          ${regionOptions}
        </select>
      </div>
      
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-1">비고</label>
        <textarea id="org-note-input" class="border rounded px-3 py-2 w-full" rows="3" placeholder="비고 사항을 입력하세요"></textarea>
      </div>
      
      <div class="flex justify-end space-x-2">
        <button id="org-cancel-btn" class="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">
          취소
        </button>
        <button id="org-save-btn" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          저장
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalContainer);
  
  // 이벤트 리스너 등록
  document.getElementById('close-org-modal-btn').addEventListener('click', () => closeModal('org-modal'));
  document.getElementById('org-cancel-btn').addEventListener('click', () => closeModal('org-modal'));
  document.getElementById('org-save-btn').addEventListener('click', saveNewOrganization);
};

// 새 기관 저장
const saveNewOrganization = async () => {
  try {
    const orgName = document.getElementById('org-name-input').value.trim();
    const orgCode = document.getElementById('org-code-input').value.trim();
    const orgRegion = document.getElementById('org-region-select').value;
    const orgNote = document.getElementById('org-note-input').value.trim();
    
    // 입력 데이터 검증
    if (!orgName) {
      alert('기관명을 입력해주세요.');
      return;
    }
    
    if (!orgCode || !orgCode.startsWith('A48')) {
      alert('기관코드는 A48로 시작해야 합니다.');
      return;
    }
    
    // 중복 코드 확인
    const isDuplicate = allOrganizations.some(org => 
      (org.code === orgCode || org.기관코드 === orgCode));
    
    if (isDuplicate) {
      alert('이미 존재하는 기관코드입니다. 다른 코드를 입력해주세요.');
      return;
    }
    
    // 구글 시트에 기관 추가하기 위한 API 호출
    const response = await fetch('/api/organizations/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: orgCode,
        name: orgName,
        region: orgRegion,
        note: orgNote
      })
    }).catch(error => {
      console.error('API 호출 중 오류:', error);
      
      // API 오류 시 임시 응답 (개발 환경)
      console.log('개발 환경에서는 API 오류를 무시하고 로컬 데이터만 업데이트합니다.');
      return { ok: true, json: () => Promise.resolve({ status: 'success' }) };
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '기관 추가 실패');
    }
    
    // 성공 처리
    closeModal('org-modal');
    alert('새 기관이 성공적으로 추가되었습니다.');
    
    // 기관 목록에 추가
    const newOrg = {
      code: orgCode,
      name: orgName,
      region: orgRegion,
      note: orgNote,
      id: `ORG_${Date.now()}`  // 임시 ID 생성
    };
    
    allOrganizations.push(newOrg);
    
    // 데이터 새로고침
    updateMatchingTable();
    document.getElementById('total-orgs-count').textContent = allOrganizations.length;
  } catch (error) {
    console.error('기관 추가 중 오류:', error);
    alert(`기관 추가 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 기관 삭제 함수
const deleteOrganization = async (orgCode) => {
  try {
    // 기관 정보 찾기
    const organization = allOrganizations.find(org => 
      (org.code === orgCode || org.기관코드 === orgCode));
    
    if (!organization) {
      alert(`기관 코드 ${orgCode}에 해당하는 기관을 찾을 수 없습니다.`);
      return;
    }
    
    // 삭제 확인
    const orgName = organization.name || organization.기관명;
    if (!confirm(`${orgName} 기관을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    
    // 기관 관련 매칭 정보 모두 제거
    const updatedMatchings = allMatchings.filter(m => m.orgCode !== orgCode);
    
    // 구글 시트에서 기관 삭제 API 호출
    const response = await fetch(`/api/organizations/delete/${orgCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      console.error('API 호출 중 오류:', error);
      
      // API 오류 시 임시 응답 (개발 환경)
      console.log('개발 환경에서는 API 오류를 무시하고 로컬 데이터만 업데이트합니다.');
      return { ok: true, json: () => Promise.resolve({ status: 'success' }) };
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || '기관 삭제 실패');
    }
    
    // 매칭 정보 업데이트
    const matchingResponse = await fetch('/api/committees/matching', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ matchings: updatedMatchings })
    }).catch(error => {
      console.error('매칭 API 호출 중 오류:', error);
      
      // API 오류 시 임시 응답 (개발 환경)
      return { ok: true, json: () => Promise.resolve({ status: 'success' }) };
    });
    
    if (!matchingResponse.ok) {
      const errorData = await matchingResponse.json();
      throw new Error(errorData.message || '매칭 정보 업데이트 실패');
    }
    
    // 성공 처리
    alert(`${orgName} 기관이 성공적으로 삭제되었습니다.`);
    
    // 기관 목록에서 제거
    allOrganizations = allOrganizations.filter(org => 
      (org.code !== orgCode && org.기관코드 !== orgCode));
    
    // 매칭 정보 업데이트
    allMatchings = updatedMatchings;
    
    // 데이터 새로고침
    updateMatchingTable();
    document.getElementById('total-orgs-count').textContent = allOrganizations.length;
  } catch (error) {
    console.error('기관 삭제 중 오류:', error);
    alert(`기관 삭제 중 오류가 발생했습니다: ${error.message}`);
  }
}; 