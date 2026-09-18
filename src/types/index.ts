/**
 * 도메인 타입 — 수행계획서 v1.1 §2-2(1차 범위) · §3(고객정보 공유 구조)를 기준으로 정의.
 * 후속 항목(문서번호·지급상태·시리얼 등)은 옵션 필드로 "자리만 확보".
 */

/** 권한 롤 6종 (수행계획서 C-3) */
export type Role = 'sales' | 'sales_support' | 'finance' | 'ma' | 'exec' | 'admin';
export const ROLE_LABEL: Record<Role, string> = {
  sales: '영업',
  sales_support: '영업지원',
  finance: '재무',
  ma: 'MA',
  exec: '경영진',
  admin: '관리자',
};

export interface Team {
  id: string;
  name: string;
  division: string; // 본부
}

export interface User {
  id: string;
  name: string;
  teamId: string;
  role: Role;
  email: string;
  active: boolean;
}

/** 고객 대분류 — 현행 CRM07(중요)/CRM08(핵심) 승계 */
export type CustomerCategory = 'CRM07' | 'CRM08';
export const CUSTOMER_CATEGORY_LABEL: Record<CustomerCategory, string> = { CRM07: '중요', CRM08: '핵심' };

export interface Contact {
  id: string;
  name: string;
  title: string;
  dept: string;
  phone: string; // 개인정보 — 화면에서 마스킹 원칙
  email: string;
  kind: '구매' | '검수' | '실무' | '기타';
}

export interface Site {
  id: string;
  name: string;
  roadAddress: string; // 행안부 주소 API 표준화 결과
  buildingCode?: string; // 건물관리번호 — 중복 탐지 키
  isPrimary: boolean;
}

export interface Customer {
  custcd: string; // TQS custcd 승계 (§3-2 ①)
  legacySalesCustcd?: string; // 영업관리 custcd (다를 경우 customer_key_map)
  name: string;
  corpType: '법인' | '개인사업자' | '공공' | '기타';
  corpNo?: string;
  bizNo: string;
  category: CustomerCategory;
  subCategory: string; // 소분류: 기업/공공/금융/교육/의료 …
  group?: string; // 계열
  contacts: Contact[];
  sites: Site[];
  tqsSynced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerHistory {
  id: string;
  custcd: string;
  at: string;
  by: string;
  field: string;
  before: string;
  after: string;
}

export interface Partner {
  id: string;
  name: string;
  bizNo: string;
  channelType: '총판' | '리셀러' | 'SI' | 'MSP';
  paymentTerms: string; // 지급 조건 (v2.3 A-2)
  payDays: number; // 지급 예정일 산정 기준(일)
  contactName: string;
  phone: string;
  status: 'active' | 'inactive';
  source: '영업관리' | 'TQS' | '병합';
}

export interface ProductFamily {
  code: string;
  name: string;
}

export interface Product {
  code: string;
  familyCode: string;
  name: string;
  version: string;
  unit: string; // Users / Gbps / 대 / 식
  hb?: boolean; // HB 장비 여부
  active: boolean;
}

/** 영업상태 15종 — 현행 SN##Z 코드 체계 승계 */
export type SalesStatus =
  | 'SN01Z' | 'SN02Z' | 'SN03Z' | 'SN04Z' | 'SN05Z' | 'SN06Z'
  | 'SN07Z' | 'SN08Z' | 'SN09Z' | 'SN10Z' | 'SN11Z'
  | 'SN12Z' | 'SN13Z' | 'SN14Z' | 'SN99Z';

export interface StatusDef {
  code: SalesStatus;
  name: string;
  phase: '발굴' | '진행' | '수주' | '이행' | '종결';
  color: string;
  next: SalesStatus[]; // 허용 전이
}

export const SALES_STATUS: StatusDef[] = [
  { code: 'SN01Z', name: '영업메모', phase: '발굴', color: 'default', next: ['SN02Z', 'SN99Z'] },
  { code: 'SN02Z', name: '포케스팅(대기)', phase: '발굴', color: 'default', next: ['SN03Z', 'SN99Z'] },
  { code: 'SN03Z', name: '영업중', phase: '진행', color: 'processing', next: ['SN04Z', 'SN05Z', 'SN14Z', 'SN13Z'] },
  { code: 'SN04Z', name: '분기예측', phase: '진행', color: 'processing', next: ['SN05Z', 'SN14Z', 'SN13Z'] },
  { code: 'SN05Z', name: '수주', phase: '수주', color: 'success', next: ['SN06Z', 'SN07Z'] },
  { code: 'SN06Z', name: '당월세금계산서', phase: '수주', color: 'success', next: ['SN07Z', 'SN11Z'] },
  { code: 'SN07Z', name: '구축대기', phase: '이행', color: 'warning', next: ['SN08Z'] },
  { code: 'SN08Z', name: '구축중', phase: '이행', color: 'warning', next: ['SN09Z'] },
  { code: 'SN09Z', name: '검수중', phase: '이행', color: 'warning', next: ['SN10Z'] },
  { code: 'SN10Z', name: '검수완료', phase: '이행', color: 'warning', next: ['SN11Z'] },
  { code: 'SN11Z', name: 'Billing', phase: '이행', color: 'warning', next: ['SN12Z'] },
  { code: 'SN12Z', name: '완료', phase: '종결', color: 'success', next: [] },
  { code: 'SN13Z', name: '이전영업', phase: '종결', color: 'default', next: [] },
  { code: 'SN14Z', name: '실주', phase: '종결', color: 'error', next: [] },
  { code: 'SN99Z', name: '포케스팅(취소)', phase: '종결', color: 'default', next: [] },
];
export const statusDef = (code: SalesStatus) => SALES_STATUS.find((s) => s.code === code)!;

/** 영업구분 — 현행 1/99/R/SM/C/1C (의미는 분석 단계 인터뷰에서 확정; 프로토타입은 가칭) */
export type SalesType = '1' | '99' | 'R' | 'SM' | 'C' | '1C';
export const SALES_TYPE_LABEL: Record<SalesType, string> = {
  '1': '직접영업',
  '99': '기타',
  R: '갱신(MA)',
  SM: 'SM(유지보수)',
  C: '채널영업',
  '1C': '직접+채널',
};

export type Relation = '신규' | '증설' | '고도화' | '교차판매' | '윈백_신규' | '윈백_증설' | '윈백_교차판매' | 'ASP';
export const RELATIONS: Relation[] = ['신규', '증설', '고도화', '교차판매', '윈백_신규', '윈백_증설', '윈백_교차판매', 'ASP'];

/** 세금계산서 상태 — 현행 6종 (오타 Pendding → Pending 정정) */
export type TaxStatus = 'TBREQ' | 'TBRED' | 'TBOK' | 'TBPDG' | 'TBSTP' | 'TBRRE' | 'NONE';
export const TAX_STATUS_LABEL: Record<TaxStatus, string> = {
  NONE: '미발행',
  TBREQ: '요청',
  TBRED: '대기',
  TBOK: '완료',
  TBPDG: 'Pending',
  TBSTP: '미수',
  TBRRE: '재요청',
};

export interface SalesLine {
  id: string;
  kind: '매출' | '매입';
  productCode?: string; // 매입(영업수수료 등)은 제품 없음 가능
  itemName: string; // 라이선스 사양 / 매입 항목명
  relation: Relation;
  qty: number;
  unitPrice: number;
  sales: number; // 매출액
  buy: number; // 매입액
  hbModel?: string;
  serialNo?: string; // 후속(HB 시리얼) — 자리만 확보
}

export interface Attachment {
  id: string;
  name: string;
  type: '견적서' | '제안서' | '계약서' | '원가명세서' | '검수확인서' | '기타';
  size: number;
  uploadedAt: string;
  by: string;
  docNo?: string; // 후속(B-3 문서번호) — 자리만 확보
}

export interface Activity {
  id: string;
  at: string;
  by: string;
  kind: '방문' | '통화' | '메일' | '회의' | '메모';
  text: string;
}

export interface HistoryLog {
  id: string;
  at: string;
  by: string;
  kind: '상태' | '수정' | '등록' | '라인' | '첨부';
  text: string;
}

export interface SalesOpportunity {
  salescd: string; // 내부 Master Key
  custcd: string;
  name: string; // 프로젝트명
  tqsProjectCode?: string; // TQS 프로젝트코드 (1차: 필드만 보관)
  salesType: SalesType;
  status: SalesStatus;
  probability: 10 | 30 | 50 | 70 | 90 | 100;
  forecastYm: string; // 매출시기 YYYY-MM
  forecastDate: string; // 포케스팅 일자
  orderDate?: string; // 수주일
  teamId: string;
  ownerId: string;
  partnerId?: string;
  partyName?: string; // 계약처
  relation: Relation;
  lines: SalesLine[];
  taxStatus: TaxStatus;
  taxDate?: string;
  attachments: Attachment[];
  activities: Activity[];
  history: HistoryLog[];
  contractId?: string;
  memo?: string;
  paymentStatus?: string; // 후속(B-7 매입 대금지급) — 자리만 확보
  crossCheckWarnings?: string[]; // 교차검토(C-1) 경고 — 1차는 경고만
  legacy?: boolean; // 이전영업현황(OLD) 조회용 이행
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  salescd: string;
  type: '신규' | '변경' | '유지관리';
  name: string;
  party: string; // 계약처
  amount: number; // 공급가액
  vat: number;
  signedAt: string;
  start: string;
  end: string;
  maRate?: number; // 유지관리 요율(담당자 입력값)
  freeMaMonths?: number;
  attachments: Attachment[];
  memo?: string;
}

export interface CommonCode {
  group: string;
  groupName: string;
  code: string;
  name: string;
  order: number;
  active: boolean;
}

export interface AuditLog {
  id: string;
  at: string;
  userId: string;
  userName: string;
  action: '로그인' | '조회' | '등록' | '수정' | '삭제' | '상태변경' | '다운로드' | '개인정보열람';
  target: string;
  detail: string;
  ip: string;
}

/** TQS 대사 예외 (§3-2 ③) */
export interface TqsReconException {
  id: string;
  custcd: string;
  customerName: string;
  field: string;
  newSystemValue: string;
  tqsValue: string;
  detectedAt: string;
  status: 'open' | 'accepted_new' | 'accepted_tqs' | 'ignored';
  decidedBy?: string;
  decidedAt?: string;
}

/** 골드마인 고객사명 매핑 (§3-2 ④) */
export interface GoldmineAlias {
  id: string;
  aliasName: string; // 골드마인 자유 텍스트
  issueCount: number;
  custcd?: string;
  confidence: number; // 0~100 (표본 매핑 추정치)
  status: 'mapped' | 'candidate' | 'unmapped';
}
