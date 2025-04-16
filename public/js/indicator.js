// 지표 관련 함수들

// 현재 선택된 주기
let currentPeriod = null;

// 현재 선택된 지표
let selectedIndicator = null;

// 캐싱을 위한 변수들
let cachedResults = {};  // 기관별 모든 결과 캐싱
let cachedIndicatorResults = {}; // 지표별 월별 결과 캐싱

// 페이지 로드 시 로컬 스토리지에서 저장된 결과 복구
document.addEventListener('DOMContentLoaded', () => {
  try {
    // 로컬 스토리지에서 저장된 모든 결과 불러오기
    const keys = Object.keys(localStorage);
    const resultKeys = keys.filter(key => key.startsWith('indicator_result_'));
    
    // 결과 키에서 기관 코드와 지표 ID 추출
    resultKeys.forEach(key => {
      try {
        // 키 형식: indicator_result_[기관코드]_[지표ID]
        const parts = key.split('_');
        if (parts.length >= 4) {
          const orgCode = parts[2];
          const indicatorId = parts[3];
          
          // 결과 데이터 불러오기
          const resultDataStr = localStorage.getItem(key);
          if (resultDataStr) {
            const resultData = JSON.parse(resultDataStr);
            
            // 캐시 초기화
            if (!cachedResults[orgCode]) {
              cachedResults[orgCode] = [];
            }
            
            // 결과 객체 생성
            const result = {
              지표ID: indicatorId,
              기관코드: orgCode,
              결과: resultData.결과,
              의견: resultData.의견,
              평가월: resultData.평가월,
              평가일자: resultData.평가일자
            };
            
            // 기존 결과 확인
            const existingIdx = cachedResults[orgCode].findIndex(r => 
              r.지표ID === indicatorId && r.평가월 === resultData.평가월);
            
            if (existingIdx >= 0) {
              // 기존 결과 업데이트
              cachedResults[orgCode][existingIdx] = result;
            } else {
              // 새 결과 추가
              cachedResults[orgCode].push(result);
            }
            
            // 월별 결과 캐시 업데이트
            const monthlyKey = `${orgCode}_${indicatorId}`;
            if (!cachedIndicatorResults[monthlyKey]) {
              cachedIndicatorResults[monthlyKey] = {};
            }
            cachedIndicatorResults[monthlyKey][resultData.평가월] = resultData.결과;
          }
        }
      } catch (err) {
        console.warn(`로컬 스토리지 항목 '${key}' 처리 중 오류:`, err);
      }
    });
    
    console.log('로컬 스토리지에서 결과 데이터 복구 완료');
  } catch (e) {
    console.warn('로컬 스토리지에서 결과 복구 중 오류:', e);
  }
});

// 주기별 지표 로드
const loadIndicatorsByPeriod = async (period) => {
  try {
    // 기관 선택 확인
    if (!selectedOrganization) {
      showMessage('기관을 먼저 선택해주세요.', 'error');
      return false;
    }
    
    // 로딩 상태 표시
    document.getElementById('indicators-list-sidebar').innerHTML = '<li class="py-4 px-3 text-gray-500 text-center">지표 목록을 불러오는 중...</li>';
    
    // 주기 설정
    currentPeriod = period;
    
    // 주기 탭 UI 업데이트
    updatePeriodTabsUI(period);
    
    // 주기별 요약 타이틀 업데이트
    document.getElementById('current-period-title').textContent = `${period} 점검 현황`;
    
    console.log(`${period} 지표 요청 시작`);
    
    // 지표 데이터 가져오기
    const response = await indicatorApi.getIndicatorsByPeriod(period);
    console.log('지표 API 응답:', response);
    
    if (response.status === 'success' && response.data && response.data.indicators) {
      console.log(`${period} 지표 ${response.data.indicators.length}개 로드됨`);
      
      if (response.data.indicators.length === 0) {
        document.getElementById('indicators-list-sidebar').innerHTML = 
          `<li class="py-4 px-3 text-gray-500 text-center">${period} 주기에 점검할 지표가 없습니다.</li>`;
        
        // 지표 상세 영역 초기화
        document.getElementById('indicator-detail').innerHTML = 
          `<div class="text-center p-10">
            <p class="text-gray-500">${period} 주기에 점검할 지표가 없습니다.</p>
          </div>`;
          
        // 진행 상황 초기화
        updatePeriodSummary([]);
        return false;
      }
      
      // 기관 코드
      const orgCode = selectedOrganization?.code || selectedOrganization?.기관코드;
      
      // 지표 목록을 렌더링하기 전에 결과 데이터를 미리 가져와서 캐싱
      if (!cachedResults[orgCode] || Object.keys(cachedResults[orgCode]).length === 0) {
        try {
          const resultsResponse = await resultApi.getResultsByOrganization(orgCode);
          if (resultsResponse.status === 'success' && resultsResponse.data.results) {
            cachedResults[orgCode] = resultsResponse.data.results;
          }
        } catch (error) {
          console.error('결과 데이터 사전 로딩 중 오류 발생:', error);
        }
      }
      
      // 지표 목록 렌더링
      await renderIndicatorsSidebar(response.data.indicators);
      
      // 현재 주기의 진행 현황 업데이트
      updatePeriodSummary(response.data.indicators);
      
      return true;
    }
    
    // 응답 오류 처리
    const errorMessage = response.message || '지표 목록을 가져오는데 실패했습니다.';
    console.error('지표 응답 오류:', errorMessage);
    
    document.getElementById('indicators-list-sidebar').innerHTML = 
      `<li class="py-4 px-3 text-red-500 text-center">
        <div>오류가 발생했습니다</div>
        <div class="text-xs mt-1">${errorMessage}</div>
      </li>`;
      
    showMessage(errorMessage, 'error');
    return false;
  } catch (error) {
    console.error('지표 목록 로딩 중 오류 발생:', error);
    
    document.getElementById('indicators-list-sidebar').innerHTML = 
      `<li class="py-4 px-3 text-red-500 text-center">
        <div>오류가 발생했습니다</div>
        <div class="text-xs mt-1">${error.message || '알 수 없는 오류'}</div>
      </li>`;
      
    showMessage('지표 목록을 불러오는 중 오류가 발생했습니다.', 'error');
    return false;
  }
};

// 주기 탭 UI 업데이트
const updatePeriodTabsUI = (period) => {
  const periodTabs = document.querySelectorAll('.period-tab');
  
  periodTabs.forEach(tab => {
    const tabPeriod = tab.dataset.period;
    
    if (tabPeriod === period) {
      tab.classList.add('active');
      tab.classList.add('border-blue-500');
    } else {
      tab.classList.remove('active');
      tab.classList.remove('border-blue-500');
    }
  });
};

// 사이드바 지표 목록 렌더링
const renderIndicatorsSidebar = async (indicators) => {
  const sidebarContainer = document.getElementById('indicators-list-sidebar');
  
  if (!sidebarContainer) return;
  
  // 지표 목록 초기화
  sidebarContainer.innerHTML = '';
  
  // 디버깅: 받은 데이터 확인
  console.log('====== 지표 데이터 디버깅 ======');
  console.log('indicators 타입:', typeof indicators);
  console.log('indicators 길이:', indicators ? indicators.length : 0);
  if (indicators && indicators.length > 0) {
    console.log('첫 번째 지표:', indicators[0]);
    console.log('첫 번째 지표 키:', Object.keys(indicators[0]).join(', '));
  }
  console.log('===============================');
  
  if (!indicators || indicators.length === 0) {
    sidebarContainer.innerHTML = '<li class="py-4 px-3 text-gray-500 text-center">해당 주기에 점검할 지표가 없습니다.</li>';
    return;
  }
  
  console.log(`사이드바에 ${indicators.length}개 지표 렌더링 중...`);
  
  // 캐시된 결과 데이터
  const orgCode = selectedOrganization?.code || selectedOrganization?.기관코드;
  let cachedResultsForOrg = cachedResults[orgCode] || [];
  
  // 현재 월 가져오기
  const currentMonth = new Date().getMonth() + 1;
  console.log(`현재 월: ${currentMonth}월`);
  
  // 서버에서 최신 결과 가져오기 시도
  try {
    console.log('서버에서 최신 결과 데이터 로드 시도...');
    const resultsResponse = await resultApi.getResultsByOrganization(orgCode);
    if (resultsResponse.status === 'success' && resultsResponse.data.results) {
      cachedResultsForOrg = resultsResponse.data.results;
      cachedResults[orgCode] = cachedResultsForOrg; // 캐시 업데이트
      console.log(`서버에서 ${cachedResultsForOrg.length}개 결과 데이터 로드됨`);
    }
  } catch (error) {
    console.warn('서버에서 결과 데이터 로드 실패, 캐시된 데이터 사용:', error);
  }
  
  // 결과를 지표ID로 맵핑하여 룩업 속도 향상
  const resultsByIndicator = {};
  cachedResultsForOrg.forEach(result => {
    // 지표ID가 같은 결과가 여러 개 있을 수 있으므로 배열로 관리
    if (!resultsByIndicator[result.지표ID]) {
      resultsByIndicator[result.지표ID] = [];
    }
    resultsByIndicator[result.지표ID].push(result);
  });
  
  // 각 지표별 항목 생성
  for (const indicator of indicators) {
    // 구글 시트 데이터의 필드명 사용
    const indicatorId = indicator.id || '';
    const indicatorName = indicator.name || '';
    const indicatorCode = indicator.code || '';
    
    // 연중 지표 또는 특화 지표 여부 확인
    const isYearly = indicator.category === '연중';
    const isSpecial = indicatorName.includes('(특화)');
    const isSemiAnnual = indicator.category === '반기' || 
                       indicatorName.includes('반기') || 
                       indicatorCode.startsWith('H') || 
                       indicatorCode.match(/H\d{3}/);
    
    // 평가연계 지표 여부 확인
    const isEvaluation = indicator.평가연계 === 'O';

    // 명확한 반기 모니터링 여부 판별
    const isSemiAnnualMonitoring = isSemiAnnual || 
                                 (currentPeriod === '반기' && !isYearly) || 
                                 indicatorCode.startsWith('H');
    
    // 디버그 로깅
    console.log(`지표 항목 생성: ID=${indicatorId}, 이름=${indicatorName}, 코드=${indicatorCode}, 연중=${isYearly}, 특화=${isSpecial}, 반기=${isSemiAnnual}, 평가연계=${isEvaluation}`);
    
    // 캐시된 결과에서 이전 결과 조회
    const results = resultsByIndicator[indicatorId] || [];
    
    // 가장 최신 결과 찾기 (평가일자 기준 정렬)
    let previousResult = null;
    if (results.length > 0) {
      // 평가일자 기준으로 결과 정렬
      results.sort((a, b) => {
        const dateA = a.평가일자 ? new Date(a.평가일자) : new Date(0);
        const dateB = b.평가일자 ? new Date(b.평가일자) : new Date(0);
        return dateB - dateA; // 내림차순 정렬 (최신 순)
      });
      
      // 현재 월(4월)의 결과 찾기
      const currentMonthResults = results.filter(r => r.평가월 == currentMonth.toString());
      if (currentMonthResults.length > 0) {
        previousResult = currentMonthResults[0]; // 현재 월의 가장 최신 결과
        console.log(`${indicatorId} 지표의 ${currentMonth}월 결과 찾음:`, previousResult.결과);
      } else {
        // 현재 월 결과가 없으면 가장 최신 결과 사용
        previousResult = results[0];
        console.log(`${indicatorId} 지표의 ${currentMonth}월 결과 없음, 최신 결과 사용:`, previousResult.결과);
      }
    }
    
    // 결과 상태 결정
    let resultStatus = '미점검';
    let statusClass = 'bg-gray-200 text-gray-700';
    let monthText = '';
    
    if (previousResult) {
      const result = previousResult.결과 || previousResult.result;
      const month = previousResult.평가월 || '';
      
      if (result === '충족') {
        resultStatus = '충족';
        statusClass = 'bg-green-500 text-white';
      } else if (result === '미충족') {
        resultStatus = '미충족';
        statusClass = 'bg-yellow-500 text-white';
      } else if (result === '해당없음') {
        resultStatus = '해당없음';
        statusClass = 'bg-gray-400 text-white';
      }
      
      // 월 표시 추가
      if (month) {
        monthText = ` (${month}월)`;
      }
    }
    
    // 카드 클래스 결정
    let cardClass = 'indicator-card border rounded p-3 mb-3';
    if (isYearly) {
        cardClass += ' bg-yellow-50';
    } else if (isSemiAnnualMonitoring) {
        cardClass += ' bg-blue-50';
    } else if (isSpecial) {
        cardClass += ' bg-purple-50';
    } else {
        cardClass += ' bg-gray-50';
    }
    
    // 평가연계 지표는 붉은 배경과 굵은 테두리로 강조
    if (isEvaluation) {
        cardClass = cardClass.replace(/bg-\w+-50/g, 'bg-red-50');
        cardClass += ' border-red-500 border-2';
    }
    
    // 사이드바 항목 생성
    const listItem = document.createElement('li');
    
    listItem.className = cardClass;
    listItem.dataset.indicatorId = indicatorId;
    
    // 지표 유형 표시 추가
    const typeTag = isYearly ? '<span class="text-xs text-red-500 mr-1">[연중]</span>' : '';
    const specialTag = isSpecial ? '<span class="text-xs text-purple-500 mr-1">[특화]</span>' : '';
    const evaluationTag = isEvaluation ? '<span class="text-xs text-red-600 font-bold mr-1">[평가]</span>' : '';
    
    // 사이드바 항목의 HTML 구조를 개선하여 일관성 확보
    listItem.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="indicator-info">
          <div class="text-sm font-medium text-gray-800">${evaluationTag}${typeTag}${specialTag}${indicatorName}</div>
          <div class="text-xs text-gray-500 mt-1">${indicatorCode}</div>
        </div>
        <div class="indicator-status">
          <span class="px-2 py-1 text-xs rounded-full ${statusClass} whitespace-nowrap">${resultStatus}${monthText}</span>
        </div>
      </div>
    `;
    
    // 클릭 이벤트 - 지표 선택
    listItem.addEventListener('click', () => {
      selectIndicator(indicator, previousResult);
      
      // 활성화된 항목 스타일 변경
      document.querySelectorAll('#indicators-list-sidebar li').forEach(item => {
        item.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-500', 'pl-2');
        
        // 평가연계 지표인 경우 기본 스타일 유지
        if (!item.classList.contains('bg-red-50')) {
          item.classList.remove('bg-red-50', 'border-l-4', 'border-red-300');
        }
      });
      
      // 평가연계 지표는 선택 시에도 붉은색 강조 유지하면서 추가 스타일 적용
      if (isEvaluation) {
        listItem.classList.add('bg-red-100', 'pl-2');
      } else {
        listItem.classList.add('bg-blue-50', 'border-l-4', 'border-blue-500', 'pl-2');
      }
    });
    
    sidebarContainer.appendChild(listItem);
  }
  
  // 첫 번째 지표 자동 선택
  if (indicators.length > 0) {
    const firstItem = sidebarContainer.querySelector('li');
    if (firstItem) {
      console.log('첫 번째 지표 자동 선택');
      // 클릭 이벤트 트리거
      firstItem.click();
    }
  }
};

// 주기별 요약 현황 업데이트
const updatePeriodSummary = async (indicators) => {
  if (!indicators || indicators.length === 0) return;
  
  // 기관 코드 가져오기
  const orgCode = selectedOrganization?.code || selectedOrganization?.기관코드;
  if (!orgCode) return;
  
  try {
    // 캐시된 결과가 있으면 사용, 없으면 API 호출
    let results = [];
    if (cachedResults[orgCode]) {
      results = cachedResults[orgCode];
    } else {
      const response = await resultApi.getResultsByOrganization(orgCode);
      if (response.status === 'success' && response.data.results) {
        results = response.data.results;
        cachedResults[orgCode] = results; // 결과 캐싱
      }
    }
    
    let fulfilled = 0;
    let unfulfilled = 0;
    let na = 0;
    let checked = 0;
    
    if (results.length > 0) {
      const resultMap = {};
      
      // 결과 데이터를 지표 ID 기준으로 매핑
      results.forEach(result => {
        resultMap[result.지표ID] = result.결과;
      });
      
      // 각 지표별 결과 상태 집계
      indicators.forEach(indicator => {
        const indicatorId = indicator.id;
        const result = resultMap[indicatorId];
        
        if (result === '충족') {
          fulfilled++;
          checked++;
        } else if (result === '미충족') {
          unfulfilled++;
          checked++;
        } else if (result === '해당없음') {
          na++;
          checked++;
        }
      });
    }
    
    const total = indicators.length;
    // 진행률 계산
    const completionRate = Math.round(((checked) / total) * 100);
    
    // UI 업데이트
    document.getElementById('period-fulfilled-count').textContent = fulfilled;
    document.getElementById('period-unfulfilled-count').textContent = unfulfilled;
    document.getElementById('period-na-count').textContent = na;
    document.getElementById('period-completion-rate').textContent = `${completionRate}% 완료`;
    
    // 프로그레스 바 업데이트
    document.getElementById('period-fulfilled-bar').style.width = `${(fulfilled / total) * 100}%`;
    document.getElementById('period-unfulfilled-bar').style.width = `${(unfulfilled / total) * 100}%`;
    document.getElementById('period-na-bar').style.width = `${(na / total) * 100}%`;
  } catch (error) {
    console.error('지표 요약 데이터 로딩 중 오류 발생:', error);
  }
};

// 지표 선택
const selectIndicator = async (indicator, previousResult) => {
  try {
    console.log('지표 선택 시작:', indicator);
    
    if (!indicator) {
      console.error('선택된 지표 정보가 없습니다.');
      return;
    }
    
    // 기관 코드 확인
    const orgCode = selectedOrganization?.code || selectedOrganization?.기관코드;
    if (!orgCode) {
      console.error('기관 코드를 찾을 수 없습니다.');
      showToast('error', '기관 정보가 없습니다. 기관을 다시 선택해주세요.');
      return;
    }
    
    selectedIndicator = indicator;
    
    // 기본 정보
    const indicatorId = indicator.id || '';
    const indicatorName = indicator.name || '';
    const indicatorCode = indicator.code || '';
    const indicatorDesc = indicator.description || indicator.dataSource || '';
    const characteristic = indicator.field5 === 'O' ? '공통필수' : 
                         (indicator.field6 === 'O' ? '공통선택' : 
                         (indicator.field7 === 'O' ? '평가연계' : ''));
    const checkMethod = indicator.field8 === '필수' || indicator.field8 === '선택' ? '온라인점검' : 
                       (indicator.field9 === '필수' || indicator.field9 === '선택' ? '현장점검' : '서류검토');
    
    // 연중/특화/반기 지표 여부 명확하게 판별
    const isYearly = indicator.category === '연중';
    const isSpecial = indicatorName.includes('(특화)');
    const isSemiAnnual = indicator.category === '반기' || 
                       indicatorName.includes('반기') || 
                       indicatorCode.startsWith('H') || 
                       indicatorCode.match(/H\d{3}/);
    
    // 명확한 반기 모니터링 여부 판별
    const isSemiAnnualMonitoring = isSemiAnnual || 
                                 (currentPeriod === '반기' && !isYearly) || 
                                 indicatorCode.startsWith('H');
    
    // 1~3월 점검 여부 확인
    const isFirstQuarter = currentPeriod === '1~3월';
    
    console.log(`지표 유형 - 이름: ${indicatorName}, 코드: ${indicatorCode}`);
    console.log(`현재 주기: ${currentPeriod}, 반기지표: ${isSemiAnnual}, 모니터링타입: ${isSemiAnnualMonitoring}`);
    console.log(`1~3월 점검 여부: ${isFirstQuarter}`);
    
    // 태그 생성
    const yearlyTag = isYearly ? '<span class="tag tag-yearly mr-2">연중</span>' : '';
    const specialTag = isSpecial ? '<span class="tag tag-special mr-2">특화</span>' : '';
    const semiTag = isSemiAnnual ? '<span class="tag tag-semi mr-2">반기</span>' : '';
    const characteristicTag = characteristic ? getCharacteristicTag(characteristic) : '';
    
    // 현재 월
    const currentMonth = new Date().getMonth() + 1;
    
    // 상세 정보 컨테이너
    const detailContainer = document.getElementById('indicator-detail');
    if (!detailContainer) {
      console.error('상세 정보 컨테이너를 찾을 수 없습니다.');
      return;
    }
    
    // 초기 로딩 UI 표시
    detailContainer.innerHTML = `
      <div class="bg-white p-5 rounded-lg shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">${indicatorName}</h3>
            <div class="text-sm text-gray-500">${indicatorCode}</div>
          </div>
          <div>
            ${yearlyTag}
            ${specialTag}
            ${semiTag}
            ${characteristicTag}
            ${getCheckMethodTag(checkMethod)}
          </div>
        </div>
        <div class="mt-4">
          <h4 class="font-medium mb-2">검토자료</h4>
          <p class="text-gray-700">${indicatorDesc}</p>
        </div>
        <div class="mt-4">
          <h4 class="font-medium mb-2">데이터 로딩 중...</h4>
          <div class="flex justify-center items-center py-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    `;
    
    try {
      // 월별 결과 가져오기
      console.log('월별 결과 조회 시작');
      const monthlyResults = await getMonthlyResults(orgCode, indicatorId);
      console.log('월별 결과:', monthlyResults);
      
      // 이전 결과 데이터 처리
      let prevResult = '';
      let prevOpinion = '';
      let resultDate = '';
      let category = indicator.category || '';
      let region = selectedOrganization?.region || selectedOrganization?.지역 || '';
      
      if (previousResult) {
        prevResult = previousResult.결과 || previousResult.result || '';
        prevOpinion = previousResult.의견 || previousResult.opinion || '';
        resultDate = previousResult.평가일자 || previousResult.평가월 || '';
        category = previousResult.category || category;
        region = region || previousResult.지역 || '';
      }
      
      // 월별 결과 표시 방식을 결정 (반기점검인 경우 상반기/하반기로 표시)
      let monitoringTableHtml = '';
      
      // 반기 지표 여부를 강력하게 확인
      const mustShowAsSemiAnnual = 
        indicatorCode.startsWith('H') || 
        indicator.isSemiAnnual === true || 
        indicator.category === '반기' || 
        indicatorName.includes('반기') ||
        currentPeriod === '반기';  // 현재 '반기' 탭에 있는 모든 지표는 반기별로 표시
      
      // 1~3월 점검 여부 확인
      const isFirstQuarter = currentPeriod === '1~3월';
      
      console.log(`반기 표시 여부 결정 - ${indicatorCode}: ${mustShowAsSemiAnnual}, 현재 주기: ${currentPeriod}`);
      console.log(`1~3월 점검 여부: ${isFirstQuarter}`);
      
      // 1~3월 점검인 경우 특별한 형식으로 표시
      if (isFirstQuarter) {
        console.log(`${indicatorCode}는 1~3월 점검 형식으로 표시합니다`);
        
        // 월별 결과 가져오기
        console.log('월별 결과 조회 시작');
        const monthlyResults = await getMonthlyResults(orgCode, indicatorId);
        console.log('월별 결과:', monthlyResults);
        
        // 1~3월 결과 통합 (1~3월 중 어느 하나라도 결과가 있으면 그 결과를 사용)
        let quarterResult = '미점검';
        for (let i = 1; i <= 3; i++) {
          const monthResult = monthlyResults[i.toString()];
          if (monthResult && monthResult !== '미점검') {
            quarterResult = monthResult;
            break;
          }
        }
        
        const isEditable = true; // 항상 편집 가능하도록 설정
        const cellClass = getResultClassName(quarterResult) + (isEditable ? ' cursor-pointer hover:opacity-80' : '');
        
        monitoringTableHtml = `
          <h4 class="font-medium mb-2">1~3월 점검 현황</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 border">
              <thead>
                <tr>
                  <th class="py-2 px-3 text-center text-xs bg-gray-100 text-gray-600">1~3월 점검 결과</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="py-2 px-3 text-center text-xs ${cellClass}" 
                    data-period="first-quarter" 
                    data-editable="${isEditable}"
                    ${isEditable ? `onclick="editMonthlyResult('${indicatorId}', 'first-quarter', '${quarterResult}')"` : ''}
                  >${quarterResult}</td>
                </tr>
              </tbody>
            </table>
            <div class="text-xs text-gray-500 mt-1">* 1~3월 사이에 한 번만 점검하는 지표입니다.</div>
          </div>
        `;
      }
      // 반기 형태로 강제 표시
      else if (mustShowAsSemiAnnual) {
        console.log(`${indicatorCode}는 반기 형식으로 표시합니다`);
        
        // 월별 결과 가져오기
        console.log('월별 결과 조회 시작');
        const monthlyResults = await getMonthlyResults(orgCode, indicatorId);
        console.log('월별 결과:', monthlyResults);
        
        // 상반기/하반기 결과 계산
        const firstHalfResult = calculateHalfYearResult(monthlyResults, 1, 6);
        const secondHalfResult = calculateHalfYearResult(monthlyResults, 7, 12);
        
        // 항상 편집 가능하도록 설정
        const isFirstHalfEditable = true;
        const isSecondHalfEditable = true;
        
        const firstHalfCellClass = getResultClassName(firstHalfResult) + (isFirstHalfEditable ? ' cursor-pointer hover:opacity-80' : '');
        const secondHalfCellClass = getResultClassName(secondHalfResult) + (isSecondHalfEditable ? ' cursor-pointer hover:opacity-80' : '');
        
        monitoringTableHtml = `
          <h4 class="font-medium mb-2">반기별 모니터링 현황</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 border">
              <thead>
                <tr>
                  <th class="py-2 px-3 text-center text-xs bg-gray-100 text-gray-600" style="width: 50%">상반기 (1~6월)</th>
                  <th class="py-2 px-3 text-center text-xs bg-gray-100 text-gray-600" style="width: 50%">하반기 (7~12월)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="py-2 px-3 text-center text-xs ${firstHalfCellClass}" 
                    data-period="first-half" 
                    data-editable="${isFirstHalfEditable}"
                    ${isFirstHalfEditable ? `onclick="editMonthlyResult('${indicatorId}', 'first-half', '${firstHalfResult}')"` : ''}
                  >${firstHalfResult}</td>
                  <td class="py-2 px-3 text-center text-xs ${secondHalfCellClass}" 
                    data-period="second-half" 
                    data-editable="${isSecondHalfEditable}"
                    ${isSecondHalfEditable ? `onclick="editMonthlyResult('${indicatorId}', 'second-half', '${secondHalfResult}')"` : ''}
                  >${secondHalfResult}</td>
                </tr>
              </tbody>
            </table>
            <div class="text-xs text-gray-500 mt-1">* 반기 점검 결과는 반기별로 표시됩니다. 상반기(1~6월), 하반기(7~12월)</div>
          </div>
        `;
      } else {
        // 일반 지표인 경우 월별 표시
        const monthlyResultsHtml = Array.from({length: 12}, (_, i) => {
          const month = (i + 1).toString();
          const result = monthlyResults[month] || '미점검';
          const isEditable = i + 1 <= currentMonth;
          const cellClass = getResultClassName(result) + (isEditable ? ' cursor-pointer hover:opacity-80' : '');
          
          return `<td class="py-2 px-3 text-center text-xs ${cellClass}" 
            data-month="${month}" 
            data-editable="${isEditable}"
            ${isEditable ? `onclick="editMonthlyResult('${indicatorId}', ${month}, '${result}')"` : ''}
          >${result}</td>`;
        }).join('');
        
        monitoringTableHtml = `
          <h4 class="font-medium mb-2">월별 모니터링 현황</h4>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 border">
              <thead>
                <tr>
                  ${Array.from({length: 12}, (_, i) => 
                    `<th class="py-2 px-3 text-center text-xs ${i + 1 > currentMonth ? 'bg-gray-50 text-gray-400' : 'bg-gray-100 text-gray-600'}">${i + 1}월</th>`
                  ).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>${monthlyResultsHtml}</tr>
              </tbody>
            </table>
            <div class="text-xs text-gray-500 mt-1">* 월별 점검 결과는 현재 월(${currentMonth}월)까지만 표시됩니다.</div>
          </div>
        `;
      }
      
      // 최종 UI 업데이트
      detailContainer.innerHTML = `
        <div class="bg-white p-5 rounded-lg shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <div>
              <h3 class="text-lg font-semibold text-gray-800">${indicatorName}</h3>
              <div class="text-sm text-gray-500">${indicatorCode}</div>
              <div class="text-xs text-gray-500 mt-1">
                ${category ? `<span class="mr-2">분류: ${category}</span>` : ''}
                ${region ? `<span>지역: ${region}</span>` : ''}
              </div>
            </div>
            <div>
              ${yearlyTag}
              ${specialTag}
              ${semiTag}
              ${characteristicTag}
              ${getCheckMethodTag(checkMethod)}
            </div>
          </div>
          
          <div class="mt-4">
            <h4 class="font-medium mb-2">검토자료</h4>
            <p class="text-gray-700">${indicatorDesc}</p>
          </div>
          
          <div class="mt-4">
            ${monitoringTableHtml}
          </div>
          
          <div class="mt-6 p-4 border border-gray-200 rounded-lg">
            <h4 class="font-medium mb-3">점검 결과 입력</h4>
            
            <div class="mb-4">
              <label class="block font-medium mb-2 text-gray-700">결과 선택</label>
              <div class="flex space-x-4">
                <label class="inline-flex items-center">
                  <input type="radio" id="result-fulfilled-${indicatorId}" name="result-${indicatorId}" value="충족" class="form-radio text-green-500">
                  <span class="ml-2">충족</span>
                </label>
                <label class="inline-flex items-center">
                  <input type="radio" id="result-unfulfilled-${indicatorId}" name="result-${indicatorId}" value="미충족" class="form-radio text-yellow-500">
                  <span class="ml-2">미충족</span>
                </label>
                <label class="inline-flex items-center">
                  <input type="radio" id="result-na-${indicatorId}" name="result-${indicatorId}" value="해당없음" class="form-radio text-gray-400">
                  <span class="ml-2">해당없음</span>
                </label>
              </div>
            </div>
            
            <div>
              <label for="region-input" class="block font-medium mb-2 text-gray-700">지역</label>
              <input type="text" id="region-input" class="w-full border border-gray-300 rounded-md p-2 mb-3" 
                placeholder="지역명을 입력하세요" value="${region || ''}">
            </div>
            
            <div>
              <label for="opinion-${indicatorId}" class="block font-medium mb-2 text-gray-700">의견</label>
              <textarea id="opinion-${indicatorId}" class="w-full border border-gray-300 rounded-md p-3 h-20"
                placeholder="의견 또는 메모를 입력하세요">${prevOpinion}</textarea>
            </div>
            
            <div class="text-right space-x-2 mt-4">
              <button class="save-result-btn bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                data-indicator-id="${indicatorId}">
                저장
              </button>
            </div>
          </div>
        </div>
      `;
      
      // 이전 결과가 있는 경우 라디오 버튼 선택
      if (prevResult) {
        const radio = document.getElementById(`result-${prevResult === '충족' ? 'fulfilled' : prevResult === '미충족' ? 'unfulfilled' : 'na'}-${indicatorId}`);
        if (radio) {
          radio.checked = true;
        }
      }
      
      // 저장 버튼 이벤트 연결
      const saveButton = detailContainer.querySelector('.save-result-btn');
      if (saveButton) {
        saveButton.addEventListener('click', (event) => {
          saveIndicatorResult(indicatorId, false, event);
        });
      }
      
      // 직접 조회한 월별 결과를 UI에 반영 (기존에 캐시된 값만 사용하면 새로 고침 후에 문제 발생)
      updateMonthlyResultsUI(monthlyResults);
      
    } catch (error) {
      console.error('데이터 로딩 중 오류:', error);
      detailContainer.innerHTML = `
        <div class="bg-white p-5 rounded-lg shadow-sm">
          <div class="p-4 bg-red-50 text-red-700 rounded">
            <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
            <p class="text-sm mt-1">${error.message || '알 수 없는 오류'}</p>
            <p class="text-xs mt-2">브라우저 콘솔에서 자세한 오류 내용을 확인할 수 있습니다.</p>
          </div>
        </div>
      `;
    }
    
  } catch (error) {
    console.error('지표 선택 처리 중 오류:', error);
    const detailContainer = document.getElementById('indicator-detail');
    if (detailContainer) {
      detailContainer.innerHTML = `
        <div class="bg-white p-5 rounded-lg shadow-sm">
          <div class="p-4 bg-red-50 text-red-700 rounded">
            <p>지표 정보를 처리하는 중 오류가 발생했습니다.</p>
            <p class="text-sm mt-1">${error.message || '알 수 없는 오류'}</p>
            <p class="text-xs mt-2">브라우저 콘솔에서 자세한 오류 내용을 확인할 수 있습니다.</p>
          </div>
        </div>
      `;
    }
  }
};

// 상/하반기 결과 계산 함수 추가
const calculateHalfYearResult = (monthlyResults, startMonth, endMonth) => {
  let hasFullfilled = false;
  let hasUnfulfilled = false;
  let hasNA = false;
  let allNotChecked = true;
  
  for (let i = startMonth; i <= endMonth; i++) {
    const monthResult = monthlyResults[i.toString()];
    if (monthResult === '충족') {
      hasFullfilled = true;
      allNotChecked = false;
    } else if (monthResult === '미충족') {
      hasUnfulfilled = true;
      allNotChecked = false;
    } else if (monthResult === '해당없음') {
      hasNA = true;
      allNotChecked = false;
    }
  }
  
  if (allNotChecked) return '미점검';
  if (hasFullfilled) return '충족';
  if (hasUnfulfilled) return '미충족';
  if (hasNA) return '해당없음';
  return '미점검';
};

// 월별 결과 UI 업데이트 함수 추가
const updateMonthlyResultsUI = (monthlyResults) => {
  if (!monthlyResults) return;
  
  console.log('월별 결과 UI 업데이트:', monthlyResults);
  
  // 현재 월 가져오기
  const currentMonth = new Date().getMonth() + 1;
  
  // 모든 월별 셀 업데이트
  Object.entries(monthlyResults).forEach(([month, result]) => {
    updateMonthlyResultCell(month, result);
  });
  
  // 가장 최근 월의 결과로 점검 결과 입력 폼도 업데이트
  if (selectedIndicator) {
    // 최근 월 찾기 (현재 월부터 역순으로 체크)
    let latestMonth = null;
    let latestResult = null;
    
    for (let i = currentMonth; i >= 1; i--) {
      const monthResult = monthlyResults[i.toString()];
      if (monthResult && monthResult !== '미점검') {
        latestMonth = i;
        latestResult = monthResult;
        break;
      }
    }
    
    // 최근 결과가 있으면 라디오 버튼 업데이트
    if (latestResult) {
      const indicatorId = selectedIndicator.id;
      const radio = document.getElementById(`result-${latestResult === '충족' ? 'fulfilled' : latestResult === '미충족' ? 'unfulfilled' : 'na'}-${indicatorId}`);
      if (radio) {
        radio.checked = true;
      }
    }
  }
  
  console.log('월별 결과 UI 업데이트 완료');
};

// 월별 결과 가져오기
const getMonthlyResults = async (orgCode, indicatorId) => {
  try {
    console.log(`getMonthlyResults 호출됨 - 기관: ${orgCode}, 지표: ${indicatorId}`);
    
    // 서버에서 최신 데이터 가져오기 시도
    console.log('서버에서 최신 데이터 요청 중...');
    let results = [];
    
    try {
      // 기관별 결과 데이터 가져오기
      const response = await resultApi.getResultsByOrganization(orgCode);
      console.log('기관 결과 데이터 응답:', response);
      
      if (response.status === 'success' && response.data && response.data.results) {
        results = response.data.results;
        console.log(`서버에서 ${results.length}개 결과 받음:`, results);
        
        // 결과 캐싱
        cachedResults[orgCode] = results;
      } else {
        throw new Error('결과 데이터가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('서버 데이터 로드 실패:', error);
      
      // 캐시된 데이터 확인
      if (cachedResults[orgCode] && cachedResults[orgCode].length > 0) {
        results = cachedResults[orgCode];
        console.log('캐시된 데이터 사용:', results);
      } else {
        // 로컬 스토리지 확인
        try {
          const storedResults = localStorage.getItem(`org_results_${orgCode}`);
          if (storedResults) {
            results = JSON.parse(storedResults);
            console.log('로컬 스토리지 데이터 사용:', results);
          }
        } catch (e) {
          console.warn('로컬 스토리지 데이터 복구 실패:', e);
        }
      }
    }
    
    // 해당 지표의 결과만 필터링
    console.log('결과 필터링 시작 - 지표ID:', indicatorId);
    const indicatorResults = results.filter(r => {
      if (!r || !r.지표ID) return false;
      
      const resultIndicatorId = (r.지표ID || '').replace(/^수정_/, '').trim();
      const targetIndicatorId = (indicatorId || '').replace(/^수정_/, '').trim();
      
      const isMatch = resultIndicatorId === targetIndicatorId;
      if (isMatch) {
        console.log('일치하는 결과 발견:', r);
      }
      return isMatch;
    });
    
    console.log(`${indicatorResults.length}개의 결과 찾음`);
    
    // 월별 결과 객체 초기화
    const monthlyResults = {};
    for (let i = 1; i <= 12; i++) {
      monthlyResults[i.toString()] = '미점검';
    }
    
    // 결과 데이터로 월별 결과 업데이트
    if (indicatorResults && indicatorResults.length > 0) {
      // 평가일자로 정렬하여 최신 데이터가 우선하도록 함
      indicatorResults.sort((a, b) => {
        if (!a.평가일자 && !b.평가일자) return 0;
        if (!a.평가일자) return 1;
        if (!b.평가일자) return -1;
        return new Date(b.평가일자) - new Date(a.평가일자);
      });
      
      // 각 월별 결과 처리
      indicatorResults.forEach(result => {
        if (!result) return;
        
        const month = result.평가월?.toString()?.trim();
        const resultValue = result.결과?.trim();
        
        if (month && !isNaN(month) && parseInt(month) >= 1 && parseInt(month) <= 12 && resultValue) {
          console.log(`${month}월 결과 설정: ${resultValue}`);
          monthlyResults[month] = resultValue;
        }
      });
    }
    
    // 디버그: 최종 월별 결과 출력
    console.log('최종 월별 결과:', monthlyResults);
    
    // 결과 캐싱
    const monthlyKey = `${orgCode}_${indicatorId}`;
    
    // 실제 결과가 있는 경우에만 캐시 업데이트
    const hasResults = Object.values(monthlyResults).some(value => value !== '미점검');
    if (hasResults) {
      cachedIndicatorResults[monthlyKey] = monthlyResults;
      try {
        localStorage.setItem(`monthly_results_${monthlyKey}`, JSON.stringify(monthlyResults));
      } catch (e) {
        console.warn('월별 결과 로컬 스토리지 저장 실패:', e);
      }
    }
    
    return monthlyResults;
  } catch (error) {
    console.error('getMonthlyResults 실행 중 오류:', error);
    throw error; // 오류를 상위로 전파하여 처리할 수 있도록 함
  }
};

// 결과 저장 시 캐시 초기화 함수 수정
const clearIndicatorCache = (orgCode, indicatorId) => {
  console.log(`캐시 초기화 - 기관: ${orgCode}, 지표: ${indicatorId}`);
  
  // 메모리 캐시 초기화
  const monthlyKey = `${orgCode}_${indicatorId}`;
  delete cachedIndicatorResults[monthlyKey];
  delete cachedResults[orgCode];
  
  // 로컬 스토리지 캐시 초기화
  try {
    localStorage.removeItem(`monthly_results_${monthlyKey}`);
    localStorage.removeItem(`org_results_${orgCode}`);
    console.log('캐시 초기화 완료');
  } catch (e) {
    console.warn('캐시 초기화 중 오류:', e);
  }
};

// 토스트 메시지 표시 함수
const showToast = (type, message) => {
  let toastContainer = document.getElementById('toast-container');
  
  // 토스트 컨테이너가 없으면 생성
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-4 right-4 z-50';
    document.body.appendChild(toastContainer);
  }
  
  // 토스트 메시지 요소 생성
  const toast = document.createElement('div');
  let bgColor = 'bg-gray-800';
  
  // 타입에 따른 스타일 설정
  switch (type) {
    case 'success':
      bgColor = 'bg-green-500';
      break;
    case 'error':
      bgColor = 'bg-red-500';
      break;
    case 'warning':
      bgColor = 'bg-yellow-500';
      break;
  }
  
  // 토스트 메시지 스타일 설정
  toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg mb-2 transform transition-all duration-300 ease-in-out translate-y-2 opacity-0`;
  toast.textContent = message;
  
  // 토스트 메시지 추가
  toastContainer.appendChild(toast);
  
  // 애니메이션 효과 적용
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });
  
  // 일정 시간 후 제거
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (toastContainer.contains(toast)) {
        toastContainer.removeChild(toast);
      }
      // 컨테이너가 비어있으면 제거
      if (toastContainer.children.length === 0) {
        document.body.removeChild(toastContainer);
      }
    }, 300);
  }, 3000);
};

// 지표 결과 저장
const saveIndicatorResult = async (indicatorId, isUpdate = false, event) => {
  try {
    // 이벤트 기본 동작 중지 (이벤트가 있는 경우에만)
    if (event) {
      event.preventDefault();
    }
    
    // 선택된 기관 정보와 지표 정보가 없으면 저장 불가
    if (!selectedOrganization || !selectedIndicator || !indicatorId) {
      showToast('warning', '기관과 지표 정보가 없습니다. 다시 시도해주세요.');
      return;
    }
    
    // 기관 코드 가져오기
    const orgCode = selectedOrganization?.code || selectedOrganization?.기관코드;
    if (!orgCode) {
      showToast('warning', '기관 코드를 찾을 수 없습니다.');
      return;
    }
    
    // 선택된 결과 가져오기
    const selectedRadio = document.querySelector(`input[name="result-${indicatorId}"]:checked`);
    if (!selectedRadio) {
      showToast('warning', '점검 결과를 선택해주세요.');
      return;
    }
    
    // 지역 정보 가져오기
    const regionInput = document.getElementById('region-input');
    if (!regionInput) {
      showToast('warning', '지역 입력란을 찾을 수 없습니다.');
      return;
    }
    
    // 입력된 의견 가져오기
    const opinionTextarea = document.getElementById(`opinion-${indicatorId}`);
    if (!opinionTextarea) {
      showToast('warning', '의견 입력란을 찾을 수 없습니다.');
      return;
    }
    
    // 데이터 준비
    const result = selectedRadio.value;
    let region = regionInput.value.trim();
    const opinion = opinionTextarea.value;
    const today = new Date();
    const dateString = today.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }).replace(/\//g, '-').replace(',', ''); // YYYY-MM-DD HH:MM:SS 형식
    
    // 현재 월 (1-12) 구하기
    const currentMonth = today.getMonth() + 1;
    
    // 기관 데이터 가져오기
    const orgId = selectedOrganization.id || selectedOrganization.기관ID;
    const orgName = selectedOrganization.name || selectedOrganization.기관명;
    
    // 지역 정보가 비어있는 경우 기관의 region 또는 지역 필드 사용
    if (!region) {
      region = selectedOrganization.region || selectedOrganization.지역 || '';
      console.log('지역 입력이 없어 기관 정보의 지역 사용:', region);
      
      // UI 업데이트를 위해 입력 필드에도 값을 설정
      if (region && regionInput) {
        regionInput.value = region;
      }
    }
    
    // 지표 카테고리 가져오기
    const category = selectedIndicator.category || '';
    
    // 현재 선택된 월 가져오기
    let selectedMonth = currentMonth.toString();
    
    // 저장 버튼에서 월 정보 가져오기 (이벤트가 있는 경우에만)
    const saveButton = event?.target;
    if (saveButton && saveButton.dataset.month) {
      selectedMonth = saveButton.dataset.month;
    }
    
    // 결과 데이터 객체 생성
    const resultData = {
      기관ID: orgId,
      기관코드: orgCode,
      기관명: orgName,
      지표ID: indicatorId,
      결과: result,
      의견: opinion,
      평가월: selectedMonth,
      평가일자: dateString,
      category: category,
      지역: region,
      isUpdate: isUpdate
    };
    
    console.log('저장할 결과 데이터:', resultData);
    
    // 저장/수정 버튼 비활성화 및 로딩 상태로 변경
    const actionButton = isUpdate 
      ? document.querySelector(`.update-result-btn[data-indicator-id="${indicatorId}"]`)
      : document.querySelector(`.save-result-btn[data-indicator-id="${indicatorId}"]`);
      
    if (actionButton) {
      actionButton.disabled = true;
      actionButton.innerHTML = `<span class="animate-pulse">${isUpdate ? '수정' : '저장'} 중...</span>`;
    }
    
    try {
      // API를 통한 결과 저장
      const response = await resultApi.saveMonitoringResult(resultData);
      console.log(`${isUpdate ? '수정' : '저장'} 응답:`, response);
      
      if (response.status === 'success') {
        // 캐시 초기화
        clearIndicatorCache(orgCode, indicatorId);
        
        // 새로운 결과 조회
        const updatedResults = await getMonthlyResults(orgCode, indicatorId);
        
        // UI 업데이트 - 전체 월별 결과 업데이트
        updateMonthlyResultsUI(updatedResults);
        
        // 월별 모니터링 현황 테이블의 해당 월 셀도 업데이트
        if (selectedMonth) {
          updateMonthlyResultCell(selectedMonth, result, indicatorId);
        }
        
        // 점검 결과 입력 폼 업데이트
        const radioButtons = document.querySelectorAll(`input[name="result-${indicatorId}"]`);
        radioButtons.forEach(radio => {
          radio.checked = radio.value === result;
        });
        
        const opinionTextarea = document.getElementById(`opinion-${indicatorId}`);
        if (opinionTextarea) {
          opinionTextarea.value = opinion || '';
        }
        
        // 로컬 스토리지에 결과 저장
        try {
          const storageKey = `result_${orgCode}_${indicatorId}_${selectedMonth}`;
          localStorage.setItem(storageKey, JSON.stringify(resultData));
        } catch (e) {
          console.warn('로컬 스토리지 저장 실패:', e);
        }
        
        // 성공 메시지 표시
        showToast('success', `${selectedMonth}월 결과가 성공적으로 ${isUpdate ? '수정' : '저장'}되었습니다.`);
        
        // 월 표시 제거
        const monthDisplay = document.querySelector('.text-blue-600');
        if (monthDisplay) {
          monthDisplay.remove();
        }
        
        // 버튼 상태 복원
        if (actionButton) {
          actionButton.disabled = false;
          actionButton.innerHTML = isUpdate ? '수정' : '저장';
        }
        
        // 사이드바 상태 업데이트
        updateSidebarStatus(indicatorId, result, selectedMonth);
        
        // 주기별 요약 현황 업데이트
        await updatePeriodSummary(currentPeriod ? [selectedIndicator] : []);
      } else {
        throw new Error(response.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('결과 저장 중 오류:', error);
      showToast('error', `저장 중 오류가 발생했습니다: ${error.message}`);
      
      // 버튼 상태 복원
      if (actionButton) {
        actionButton.disabled = false;
        actionButton.innerHTML = isUpdate ? '수정' : '저장';
      }
    }
  } catch (error) {
    console.error('결과 저장 처리 중 오류:', error);
    showToast('error', `오류가 발생했습니다: ${error.message}`);
  }
};

// 페이지 로드 시 로컬 스토리지에서 캐시 복원
document.addEventListener('DOMContentLoaded', () => {
  try {
    // 로컬 스토리지에서 모든 키 가져오기
    const keys = Object.keys(localStorage);
    
    // 기관별 결과 복원
    const orgResultKeys = keys.filter(key => key.startsWith('org_results_'));
    orgResultKeys.forEach(key => {
      const orgCode = key.replace('org_results_', '');
      try {
        const storedResults = localStorage.getItem(key);
        if (storedResults) {
          cachedResults[orgCode] = JSON.parse(storedResults);
        }
      } catch (e) {
        console.warn(`기관 ${orgCode}의 결과 복원 중 오류:`, e);
      }
    });
    
    // 월별 결과 복원
    const monthlyResultKeys = keys.filter(key => key.startsWith('monthly_results_'));
    monthlyResultKeys.forEach(key => {
      try {
        const storedResults = localStorage.getItem(key);
        if (storedResults) {
          const monthlyKey = key.replace('monthly_results_', '');
          cachedIndicatorResults[monthlyKey] = JSON.parse(storedResults);
        }
      } catch (e) {
        console.warn(`월별 결과 복원 중 오류:`, e);
      }
    });
    
    console.log('캐시 데이터 복원 완료');
  } catch (e) {
    console.warn('캐시 복원 중 오류:', e);
  }
  
  // 주기 탭 클릭 이벤트 설정
  const periodTabs = document.querySelectorAll('.period-tab');
  periodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const period = tab.dataset.period;
      if (period) {
        loadIndicatorsByPeriod(period);
      }
    });
  });
  
  console.log('지표 페이지 초기화 완료');
});

// 결과 상태에 따른 클래스 이름 반환
const getResultClassName = (result) => {
  switch (result) {
    case '충족':
      return 'bg-green-100 text-green-800';
    case '미충족':
      return 'bg-yellow-100 text-yellow-800';
    case '해당없음':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-50 text-gray-400';
  }
};

// 지표 특성에 따른 태그 생성
const getCharacteristicTag = (characteristic) => {
  switch (characteristic) {
    case '공통필수':
      return '<span class="tag tag-required mr-2">필수</span>';
    case '공통선택':
      return '<span class="tag tag-optional mr-2">선택</span>';
    case '평가연계':
      return '<span class="tag tag-evaluation mr-2 bg-red-100 text-red-800 font-bold border border-red-400">평가</span>';
    default:
      return '';
  }
};

// 점검 방법에 따른 태그 생성
const getCheckMethodTag = (method) => {
  switch (method) {
    case '온라인점검':
      return '<span class="tag tag-online">온라인</span>';
    case '현장점검':
      return '<span class="tag tag-onsite">현장</span>';
    case '서류검토':
      return '<span class="tag tag-document">서류</span>';
    default:
      return '';
  }
};

// 월별 결과 셀 업데이트
const updateMonthlyResultCell = (month, result, indicatorId = null) => {
  try {
    console.log(`월별 결과 셀 업데이트: ${month}월, 결과: ${result}`);
    
    const cell = document.querySelector(`td[data-month="${month}"]`);
    if (!cell) {
      console.warn(`${month}월 셀을 찾을 수 없습니다.`);
      return;
    }

    // 기존 클래스 제거
    cell.classList.remove('bg-gray-50', 'bg-green-100', 'bg-yellow-100', 'bg-gray-100', 
                        'text-gray-400', 'text-green-800', 'text-yellow-800', 'text-gray-600');
    
    // 새로운 결과에 따른 클래스 추가
    if (result === '충족') {
      cell.classList.add('bg-green-100', 'text-green-800', 'font-medium');
    } else if (result === '미충족') {
      cell.classList.add('bg-yellow-100', 'text-yellow-800', 'font-medium');
    } else if (result === '해당없음') {
      cell.classList.add('bg-gray-100', 'text-gray-600', 'font-medium');
    } else {
      cell.classList.add('bg-gray-50', 'text-gray-400');
    }
    
    // 텍스트 업데이트
    cell.textContent = result;
    
    // 지표 ID가 제공된 경우 사이드바도 업데이트
    if (indicatorId) {
      updateSidebarStatus(indicatorId, result, month);
    }
    
    console.log('월별 결과 셀 업데이트 완료');
  } catch (error) {
    console.error('월별 결과 셀 업데이트 중 오류:', error);
  }
};

// 사이드바 상태 업데이트
const updateSidebarStatus = (indicatorId, result, month = null) => {
  try {
    console.log(`사이드바 상태 업데이트: ${indicatorId}, 결과: ${result}, 월: ${month}`);
    
    const sidebarItem = document.querySelector(`#indicators-list-sidebar li[data-indicator-id="${indicatorId}"]`);
    if (!sidebarItem) {
      console.warn('사이드바 항목을 찾을 수 없습니다:', indicatorId);
      return;
    }

    const statusContainer = sidebarItem.querySelector('.indicator-status');
    if (!statusContainer) {
      console.warn('상태 컨테이너를 찾을 수 없습니다:', indicatorId);
      return;
    }

    let statusClass = 'bg-gray-200 text-gray-700';
    let statusText = '미점검';

    // 현재 월 구하기
    const currentMonth = new Date().getMonth() + 1;
    
    // 기관 코드 확인
    const orgCode = selectedOrganization?.code || selectedOrganization?.기관코드;
    if (orgCode && selectedIndicator && selectedIndicator.id === indicatorId) {
      // 현재 월의 결과를 우선적으로 사용
      const cacheKey = `${orgCode}_${indicatorId}`;
      if (cachedIndicatorResults[cacheKey] && cachedIndicatorResults[cacheKey][currentMonth.toString()]) {
        const currentMonthResult = cachedIndicatorResults[cacheKey][currentMonth.toString()];
        if (currentMonthResult && currentMonthResult !== '미점검') {
          result = currentMonthResult;
          month = currentMonth;
        }
      }
    }

    switch (result) {
      case '충족':
        statusClass = 'bg-green-500 text-white';
        statusText = '충족';
        break;
      case '미충족':
        statusClass = 'bg-yellow-500 text-white';
        statusText = '미충족';
        break;
      case '해당없음':
        statusClass = 'bg-gray-400 text-white';
        statusText = '해당없음';
        break;
    }

    // 월 정보 추가
    const monthText = month ? ` (${month}월)` : '';
    statusContainer.innerHTML = `<span class="px-2 py-1 text-xs rounded-full ${statusClass} whitespace-nowrap">${statusText}${monthText}</span>`;
    
    console.log('사이드바 상태 업데이트 완료');
  } catch (error) {
    console.error('사이드바 상태 업데이트 중 오류:', error);
  }
};

// 월별 결과 편집 모달 표시 함수 수정
const editMonthlyResult = (indicatorId, month, currentResult) => {
  // 기존 모달이 있다면 제거
  const existingModal = document.getElementById('monthly-result-modal');
  if (existingModal) existingModal.remove();
  
  // 모달 HTML 생성
  let modalTitle = '';
  if (month === 'first-half') {
    modalTitle = '상반기(1~6월) 점검 결과 변경';
  } else if (month === 'second-half') {
    modalTitle = '하반기(7~12월) 점검 결과 변경';
  } else if (month === 'first-quarter') {
    modalTitle = '1~3월 점검 결과 변경';
  } else {
    modalTitle = `${month}월 점검 결과 변경`;
  }
  
  const modal = document.createElement('div');
  modal.id = 'monthly-result-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl w-96 p-5 mx-4">
      <h3 class="text-lg font-semibold mb-4">${modalTitle}</h3>
      <div class="mb-4">
        <label class="block font-medium mb-2 text-gray-700">결과 선택</label>
        <div class="flex flex-col space-y-2">
          <label class="inline-flex items-center p-2 border rounded ${currentResult === '충족' ? 'bg-green-50 border-green-300' : ''}">
            <input type="radio" name="monthly-result" value="충족" class="form-radio text-green-500 mr-2" ${currentResult === '충족' ? 'checked' : ''}>
            <span>충족</span>
          </label>
          <label class="inline-flex items-center p-2 border rounded ${currentResult === '미충족' ? 'bg-yellow-50 border-yellow-300' : ''}">
            <input type="radio" name="monthly-result" value="미충족" class="form-radio text-yellow-500 mr-2" ${currentResult === '미충족' ? 'checked' : ''}>
            <span>미충족</span>
          </label>
          <label class="inline-flex items-center p-2 border rounded ${currentResult === '해당없음' ? 'bg-gray-50 border-gray-300' : ''}">
            <input type="radio" name="monthly-result" value="해당없음" class="form-radio text-gray-400 mr-2" ${currentResult === '해당없음' ? 'checked' : ''}>
            <span>해당없음</span>
          </label>
          <label class="inline-flex items-center p-2 border rounded ${currentResult === '미점검' ? 'bg-gray-50 border-gray-300' : ''}">
            <input type="radio" name="monthly-result" value="미점검" class="form-radio text-gray-400 mr-2" ${currentResult === '미점검' ? 'checked' : ''}>
            <span>미점검</span>
          </label>
        </div>
      </div>
      <div class="flex justify-end space-x-2">
        <button id="monthly-result-cancel" class="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
        <button id="monthly-result-save" class="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">저장</button>
      </div>
    </div>
  `;
  
  // 모달 추가
  document.body.appendChild(modal);
  
  // 이벤트 리스너 추가
  document.getElementById('monthly-result-cancel').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('monthly-result-save').addEventListener('click', async () => {
    try {
      const selectedResult = document.querySelector('input[name="monthly-result"]:checked')?.value || '미점검';
      
      // 기관 코드 가져오기
      const orgCode = selectedOrganization?.code || selectedOrganization?.기관코드;
      if (!orgCode) {
        showToast('error', '기관 정보를 찾을 수 없습니다.');
        return;
      }
      
      // 기관 정보 가져오기
      const orgId = selectedOrganization.id || selectedOrganization.기관ID;
      const orgName = selectedOrganization.name || selectedOrganization.기관명;
      const region = selectedOrganization.region || selectedOrganization.지역 || '';
      const today = new Date();
      const dateString = today.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }).replace(/\//g, '-').replace(',', '');
      
      // 반기 또는 1~3월 처리
      if (month === 'first-half' || month === 'second-half' || month === 'first-quarter') {
        let startMonth, endMonth;
        
        if (month === 'first-half') {
          startMonth = 1;
          endMonth = 6;
        } else if (month === 'second-half') {
          startMonth = 7;
          endMonth = 12;
        } else if (month === 'first-quarter') {
          startMonth = 1;
          endMonth = 3;
        }
        
        // 각 월에 대해 서버 API 호출하여 저장
        let successCount = 0;
        for (let i = startMonth; i <= endMonth; i++) {
          // 서버 저장용 결과 데이터 생성
          const resultData = {
            기관ID: orgId,
            기관코드: orgCode,
            기관명: orgName,
            지표ID: indicatorId,
            결과: selectedResult,
            의견: '',  // 모달에서는 의견 입력 없음
            평가월: i.toString(),
            평가일자: dateString,
            category: selectedIndicator?.category || '',
            지역: region
          };
          
          try {
            // 서버 API 호출하여 결과 저장
            const response = await resultApi.saveMonitoringResult(resultData);
            if (response.status === 'success') {
              successCount++;
            }
          } catch (error) {
            console.error(`${i}월 결과 저장 중 오류:`, error);
          }
          
          // UI 업데이트
          updateMonthlyResultCell(i.toString(), selectedResult, indicatorId);
          
          // 로컬 스토리지에도 결과 저장
          try {
            const monthlyKey = `indicator_result_${orgCode}_${indicatorId}_${i}`;
            const resultData = {
              결과: selectedResult,
              의견: '',
              평가월: i.toString(),
              평가일자: dateString
            };
            localStorage.setItem(monthlyKey, JSON.stringify(resultData));
          } catch (e) {
            console.warn('로컬 스토리지 저장 오류:', e);
          }
        }
        
        // 성공 메시지
        if (successCount > 0) {
          if (month === 'first-half') {
            showToast('success', '상반기(1~6월) 결과가 서버에 저장되었습니다.');
          } else if (month === 'second-half') {
            showToast('success', '하반기(7~12월) 결과가 서버에 저장되었습니다.');
          } else {
            showToast('success', '1~3월 결과가 서버에 저장되었습니다.');
          }
        } else {
          showToast('error', '서버에 결과를 저장하지 못했습니다.');
        }
        
        // 월별 결과 캐시 업데이트
        const cacheKey = `${orgCode}_${indicatorId}`;
        if (!cachedIndicatorResults[cacheKey]) {
          cachedIndicatorResults[cacheKey] = {};
        }
        
        for (let i = startMonth; i <= endMonth; i++) {
          cachedIndicatorResults[cacheKey][i.toString()] = selectedResult;
        }
        
        // 사이드바 상태 업데이트
        updateSidebarStatus(indicatorId, selectedResult);
        
      } else {
        // 단일 월 처리
        // 서버 저장용 결과 데이터 생성
        const resultData = {
          기관ID: orgId,
          기관코드: orgCode,
          기관명: orgName,
          지표ID: indicatorId,
          결과: selectedResult,
          의견: '',  // 모달에서는 의견 입력 없음
          평가월: month,
          평가일자: dateString,
          category: selectedIndicator?.category || '',
          지역: region
        };
        
        try {
          // 서버 API 호출하여 결과 저장
          const response = await resultApi.saveMonitoringResult(resultData);
          if (response.status === 'success') {
            showToast('success', `${month}월 결과가 서버에 저장되었습니다.`);
          } else {
            showToast('warning', '서버에 결과를 저장하지 못했습니다.');
          }
        } catch (error) {
          console.error(`${month}월 결과 저장 중 오류:`, error);
          showToast('error', '서버 통신 중 오류가 발생했습니다.');
        }
        
        // UI 업데이트
        updateMonthlyResultCell(month, selectedResult, indicatorId);
        
        // 로컬 스토리지에도 결과 저장
        try {
          const monthlyKey = `indicator_result_${orgCode}_${indicatorId}_${month}`;
          const resultData = {
            결과: selectedResult,
            의견: '',
            평가월: month,
            평가일자: dateString
          };
          localStorage.setItem(monthlyKey, JSON.stringify(resultData));
        } catch (e) {
          console.warn('로컬 스토리지 저장 오류:', e);
        }
        
        // 월별 결과 캐시 업데이트
        const cacheKey = `${orgCode}_${indicatorId}`;
        if (!cachedIndicatorResults[cacheKey]) {
          cachedIndicatorResults[cacheKey] = {};
        }
        cachedIndicatorResults[cacheKey][month] = selectedResult;
        
        // 사이드바 상태 업데이트
        updateSidebarStatus(indicatorId, selectedResult, month);
      }
      
      // 주기별 요약 현황 업데이트
      if (currentPeriod) {
        updatePeriodSummary([selectedIndicator]);
      }
      
      // 캐시 초기화
      clearIndicatorCache(orgCode, indicatorId);
      
    } catch (error) {
      console.error('월별 결과 저장 중 오류:', error);
      showToast('error', '결과 저장 중 오류가 발생했습니다.');
    }
    
    // 모달 닫기
    modal.remove();
  });
  
  // ESC 키로 모달 닫기
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  
  // 모달 외부 클릭 시 닫기
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
};