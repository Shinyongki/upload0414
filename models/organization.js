const { readSheetData, writeSheetData } = require('../config/googleSheets');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 기관 목록을 위한 시트 범위
const ORGANIZATIONS_RANGE = '기관_목록!A:E'; // 기관ID, 기관코드, 기관명, 지역, 기타정보

// 모든 기관 목록 가져오기
const getAllOrganizations = async () => {
  try {
    const values = await readSheetData(SPREADSHEET_ID, ORGANIZATIONS_RANGE);
    
    if (!values || values.length === 0) {
      console.log('기관 목록이 비어 있습니다.');
      return [];
    }
    
    // 첫 번째 행은 헤더로 간주
    const headers = values[0];
    console.log('기관 헤더:', headers);
    
    const organizations = values.slice(1).map(row => {
      const organization = {};
      headers.forEach((header, index) => {
        if (row[index] !== undefined) {
          organization[header] = row[index];
        } else {
          organization[header] = '';
        }
      });
      return organization;
    });
    
    console.log(`총 ${organizations.length}개 기관 로드됨`);
    return organizations;
  } catch (error) {
    console.error('Error fetching organizations:', error);
    throw error;
  }
};

// 특정 코드의 기관 가져오기
const getOrganizationByCode = async (orgCode) => {
  try {
    const organizations = await getAllOrganizations();
    return organizations.find(org => org.code === orgCode || org.기관코드 === orgCode) || null;
  } catch (error) {
    console.error(`Error fetching organization by code ${orgCode}:`, error);
    throw error;
  }
};

// 기관 정보 업데이트
const updateOrganization = async (orgCode, updateData) => {
  try {
    // 1단계: 모든 기관 데이터 가져오기
    const values = await readSheetData(SPREADSHEET_ID, ORGANIZATIONS_RANGE);
    
    if (!values || values.length === 0) {
      console.log('기관 목록이 비어 있습니다.');
      return null;
    }
    
    // 2단계: 헤더 및 데이터 처리
    const headers = values[0];
    const organizations = values.slice(1);
    
    // 3단계: 대상 기관 찾기
    const orgIndex = organizations.findIndex(row => {
      // 'code' 또는 '기관코드' 필드 비교
      const codeIndex = headers.indexOf('code') !== -1 ? headers.indexOf('code') : headers.indexOf('기관코드');
      return row[codeIndex] === orgCode;
    });
    
    if (orgIndex === -1) {
      console.log(`기관 코드 ${orgCode}를 찾을 수 없습니다.`);
      return null;
    }
    
    // 4단계: 업데이트 데이터 적용
    const updatedRow = [...organizations[orgIndex]];
    
    Object.keys(updateData).forEach(key => {
      const keyIndex = headers.indexOf(key);
      if (keyIndex !== -1) {
        updatedRow[keyIndex] = updateData[key];
      }
    });
    
    // 5단계: 데이터 업데이트
    organizations[orgIndex] = updatedRow;
    
    // 6단계: 전체 데이터 다시 쓰기
    const updatedValues = [headers, ...organizations];
    const fullRange = `기관_목록!A1:${String.fromCharCode(65 + headers.length - 1)}${updatedValues.length}`;
    await writeSheetData(SPREADSHEET_ID, fullRange, updatedValues);
    
    // 7단계: 업데이트된 기관 객체 반환
    const updatedOrganization = {};
    headers.forEach((header, index) => {
      updatedOrganization[header] = updatedRow[index] || '';
    });
    
    return updatedOrganization;
  } catch (error) {
    console.error(`Error updating organization ${orgCode}:`, error);
    throw error;
  }
};

module.exports = {
  getAllOrganizations,
  getOrganizationByCode,
  updateOrganization
}; 