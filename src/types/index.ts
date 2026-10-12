/**
 * 도메인 타입 — 수행계획서 v1.1 §2-2(1차 범위) · §3(고객정보 공유 구조) + 수정안 V2.4(2026-09-29) 반영.
 * V2.4 반영 항목: 영업상태 5단계 11종, 계약구분 6종, 도입관계 9종(본사업 연결), 제품분류 216 품목 기반 제품라인,
 *               서티 승인, 매출채권, 라이선스 발급·HyBoost 출고 요청, 통합문서함, 직출·일정, 내부보고 스냅샷.
 */

/** 권한 롤 — 1차 6종 + V2.4 시연 역할(팀장·부본부장·본부장은 exec 계열로 흡수) */
export type Role = 'sales' | 'team_lead' | 'sales_support' | 'finance' | 'ma' | 'exec' | 'admin';
export const ROLE_LABEL: Record<Role, string> = {
  sales: '영업담당자',
  team_lead: '팀장',
  sales_support: '영업지원관리자',
  finance: '재무',
  ma: 'MA',
  exec: '본부장·사업부장',
  admin: '시스템관리자',
};

export interface Team { id: string; name: string; division: string; }

export interface User { id: string; name: string; teamId: string; role: Role; email: string; active: boolean; }

/** 고객 대분류 — 현행 CRM07(중요)/CRM08(핵심) 승계 */
export type CustomerCategory = 'CRM07' | 'CRM08';
export const CUSTOMER_CATEGORY_LABEL: Record<CustomerCategory, string> = { CRM07: '중요', CRM08: '핵심' };

export interface Contact { id: string; name: string; title: string; dept: string; phone: string; email: string; kind: '구매' | '검수' | '실무' | '기타'; }
export interface Site { id: string; name: string; roadAddress: string; buildingCode?: string; isPrimary: boolean; }

export interface Customer {
  custcd: string; // TQS custcd 승계
  legacySalesCustcd?: string;
  name: string;
  corpType: '법인' | '개인사업자' | '공공' | '기타';
  corpNo?: string;
  bizNo: string;
  category: CustomerCategory;
  subCategory: string; // 기업/공공/금융/교육/의료
  group?: string;
  contacts: Contact[];
  sites: Site[];
  tqsSynced: boolean;
  approval?: '승인대기' | '승인완료' | '반려'; // V2.4: 고객사 등록 승인함
  createdAt: string;
  updatedAt: string;
}

export interface CustomerHistory { id: string; custcd: string; at: string; by: string; field: string; before: string; after: string; }

/** 계약처(거래처) — V2.4: 계약 등록 단계에서 등재기안 → 승인 후 마스터 등재. 신용등급·직접거래 여부는 매출채권 규칙에 사용 */
export interface ContractParty {
  id: string;
  name: string;
  bizNo: string;
  creditRating?: string; // AAA ~ D
  direct: boolean; // 고객 직접거래
  status: '등재' | '등재기안' | '반려';
  requestedBy?: string;
  requestedAt?: string;
  approvedAt?: string;
  linkedSalescd?: string;
}
export const CREDIT_GRADES = ['AAA', 'AA+', 'AA0', 'AA-', 'A+', 'A0', 'A-', 'BBB+', 'BBB0', 'BBB-', 'BB+', 'BB0', 'BB-', 'B+', 'B0', 'B-', 'CCC', 'CC', 'C', 'D'];

export interface Partner {
  id: string; name: string; bizNo: string; channelType: '총판' | '리셀러' | 'SI' | 'MSP';
  paymentTerms: string; payDays: number; contactName: string; phone: string; status: 'active' | 'inactive'; source: '영업관리' | 'TQS' | '병합';
}

/** 제품분류 품목(V2.4 엑셀 '제품분류' 시트 216개): 제품군 → 제품 → 세부품목, 구분·단위 연동 */
export type LineKind = '매출' | '매입' | '내부원가' | '서비스' | '매출·매입';
export interface ProductItem { id: string; kind: LineKind; group: string; product: string; sub: string; unit: string; versionInput: boolean; networkInput: boolean; }

/** 영업상태 — V2.4 5단계 11종 (현행 SN 코드 승계, 완료는 수금/미수 분리) */
export type SalesStatus = 'SN02Z' | 'SN03Z' | 'SN04Z' | 'SN05Z' | 'SN07Z' | 'SN09Z' | 'SN10Z' | 'SN12Z' | 'SN12M' | 'SN13Z' | 'SN14Z';
export type Phase = '발굴' | '진행' | '수주' | '이행' | '종결';
export const PHASES: Phase[] = ['발굴', '진행', '수주', '이행', '종결'];
export interface StatusDef { code: SalesStatus; name: string; phase: Phase; color: string; next: SalesStatus[]; }
export const SALES_STATUS: StatusDef[] = [
  { code: 'SN02Z', name: '포케스팅(대기)', phase: '발굴', color: 'default', next: ['SN03Z', 'SN14Z'] },
  { code: 'SN03Z', name: '영업중', phase: '진행', color: 'processing', next: ['SN04Z', 'SN05Z', 'SN14Z', 'SN13Z'] },
  { code: 'SN04Z', name: '분기예측', phase: '진행', color: 'processing', next: ['SN05Z', 'SN14Z', 'SN13Z'] },
  { code: 'SN05Z', name: '수주', phase: '수주', color: 'success', next: ['SN07Z', 'SN09Z'] },
  { code: 'SN07Z', name: '구축대기', phase: '이행', color: 'warning', next: ['SN09Z'] },
  { code: 'SN09Z', name: '검수중', phase: '이행', color: 'warning', next: ['SN10Z'] },
  { code: 'SN10Z', name: '검수완료', phase: '이행', color: 'warning', next: ['SN12M', 'SN12Z'] },
  { code: 'SN12M', name: '완료(미수)', phase: '종결', color: 'orange', next: ['SN12Z'] },
  { code: 'SN12Z', name: '완료(수금)', phase: '종결', color: 'success', next: [] },
  { code: 'SN13Z', name: '이전영업', phase: '종결', color: 'default', next: [] },
  { code: 'SN14Z', name: '실주', phase: '종결', color: 'error', next: [] },
];
export const statusDef = (code: SalesStatus) => SALES_STATUS.find((s) => s.code === code) ?? SALES_STATUS[0];
export const statusesOfPhase = (p: Phase) => SALES_STATUS.filter((s) => s.phase === p).map((s) => s.code);

/** 계약구분 — V2.4: 현행 영업구분 코드 1/99/R/SM/C/1C 의미 확정 */
export type SalesType = '1' | '99' | 'R' | 'C' | 'SM' | '1C';
export const SALES_TYPE_LABEL: Record<SalesType, string> = { '1': '직접계약', '99': '핵심고객사', R: '리셀러계약', C: '채널사계약', SM: '그룹사계약', '1C': '채널사협업' };

/** 도입관계 — V2.4 9종. 증설·고도화·재계약은 본사업(parentSalescd) 필수 */
export type Relation = '신규' | '증설' | '고도화' | '교차판매' | '윈백_신규' | '윈백_증설' | '윈백_교차판매' | '재계약' | '기타';
export const RELATIONS: Relation[] = ['신규', '증설', '고도화', '교차판매', '윈백_신규', '윈백_증설', '윈백_교차판매', '재계약', '기타'];
export const PARENT_REQUIRED_RELATIONS: Relation[] = ['증설', '고도화', '재계약'];
export const WINBACK_RELATIONS: Relation[] = ['윈백_신규', '윈백_증설', '윈백_교차판매'];
export const COMPETITORS = ['지란지교데이터', '지란지교소프트', '워터월시스템즈', '파수', '소프트캠프', '시큐어링크', '엑스게이트', '시큐아이', '안랩', '이스트시큐리티', '포티넷', '팔로알토네트웍스', '기타 경쟁사'];

export type TaxStatus = 'TBREQ' | 'TBRED' | 'TBOK' | 'TBPDG' | 'TBSTP' | 'TBRRE' | 'NONE';
export const TAX_STATUS_LABEL: Record<TaxStatus, string> = { NONE: '미발행', TBREQ: '요청', TBRED: '대기', TBOK: '완료', TBPDG: 'Pending', TBSTP: '미수', TBRRE: '재요청' };

/** 제품라인 — V2.4 입력체계(제품분류 연동, 라이선스·망·HyBoost 수량·미러/인라인) */
export interface SalesLine {
  id: string;
  kind: LineKind;
  relation: Relation;
  group: string; // 제품군
  product: string; // 제품
  sub: string; // 세부품목
  itemId?: string; // ProductItem.id
  version?: string;
  license?: string; // 라이선스 전체 사양
  paidLicense?: string; // 유상
  freeLicense?: string; // 무상
  network?: string; // 망 구분
  hyboost?: string; // HyBoost 모델 (없음 = undefined)
  qty: number; // 품목 수량
  hyboostQty?: number; // HyBoost 수량 (출고 기준)
  mirror?: '미해당' | '미러' | '인라인';
  detail?: string;
  other?: string;
  sales: number;
  buy: number;
  serialNo?: string; // 후속
}

export type DocType = '계약서' | '매출견적서' | '제안서' | '매입발주서' | '매입견적서' | '계약이행보증보험' | '하자이행보증보험' | '검수완료서' | 'SW 라이선스증서' | '원가명세서' | '기타';
export const DOC_TYPES: DocType[] = ['계약서', '매출견적서', '제안서', '매입발주서', '매입견적서', '계약이행보증보험', '하자이행보증보험', '검수완료서', 'SW 라이선스증서', '원가명세서', '기타'];
export const DOC_PREFIX: Record<DocType, string> = { 계약서: 'CTR', 매출견적서: 'QUO', 제안서: 'PRO', 매입발주서: 'PO', 매입견적서: 'PQT', 계약이행보증보험: 'PBG', 하자이행보증보험: 'WBG', 검수완료서: 'ACC', 'SW 라이선스증서': 'LIC', 원가명세서: 'CST', 기타: 'OTH' };

/** 통합문서함 문서 — 문서번호 SMS-{유형}-{YYMM}-{NNN} */
export interface Document {
  id: string;
  docNo: string;
  type: DocType;
  salescd: string;
  name: string;
  version: string;
  date: string;
  status: string;
  file: string;
  by: string;
}

export interface Attachment { id: string; name: string; type: DocType; size: number; uploadedAt: string; by: string; docNo?: string; }
export interface Activity { id: string; at: string; by: string; kind: '방문' | '통화' | '메일' | '회의' | '메모'; text: string; }
export interface HistoryLog { id: string; at: string; by: string; kind: '상태' | '수정' | '등록' | '라인' | '첨부' | '서티' | '발급' | '출고'; text: string; }

/** 서티(Certification) 승인 — 프로젝트 생성 시 자동 상신 */
export type CertStatus = '승인대기' | '승인완료' | '반려';
export interface Cert { status: CertStatus; submittedAt: string; approver?: string; decidedAt?: string; reason?: string; }
export const CERT_APPROVERS = ['팀장', '사업부장', '부본부장', '본부장', '영업지원관리자'];

export interface SalesOpportunity {
  salescd: string; // 프로젝트코드 YYYY-NNNNN (V2.4) · 이행 데이터는 OLD-… / SO-… 유지
  custcd: string;
  name: string;
  tqsProjectCode?: string;
  salesType: SalesType; // 계약구분
  status: SalesStatus;
  probability: 10 | 30 | 50 | 70 | 90 | 100;
  forecastYm: string;
  forecastDate: string;
  orderDate?: string;
  teamId: string;
  ownerId: string;
  partnerId?: string;
  partyName?: string; // 계약처
  partyId?: string;
  relation: Relation;
  parentSalescd?: string; // 본사업 (증설·고도화·재계약)
  competitor?: string; // 윈백 경쟁사
  lines: SalesLine[];
  taxStatus: TaxStatus;
  taxDate?: string;
  attachments: Attachment[];
  activities: Activity[];
  history: HistoryLog[];
  contractId?: string;
  cert: Cert;
  inspection?: { status: '검수대기' | '검수중' | '검수완료'; completedAt?: string; file?: string };
  deliveryStage?: string; // 납품 단계(직접 입력)
  memo?: string;
  paymentStatus?: string;
  crossCheckWarnings?: string[];
  legacy?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string; salescd: string; type: '신규' | '변경' | '유지관리'; name: string; party: string; partyId?: string;
  amount: number; vat: number; signedAt: string; start: string; end: string; maRate?: number; freeMaMonths?: number;
  paymentTerms: string; // V2.4: 수금·지급 조건 필수
  paymentDueDays: number; // 계산서일 기준 지급기일
  attachments: Attachment[]; memo?: string;
}

/** 매출채권 — V2.4: 미수 인식일은 시스템 계산, 등급·직접거래·부실징후에 따라 추심기준 60/90일 */
export interface Receivable {
  id: string; // AR-YYYY-NNN
  salescd: string;
  partyId?: string;
  partyName: string;
  direct: boolean;
  creditRating?: string;
  approvedRegistration: boolean; // 승인등록 거래처
  distress: boolean; // 부실징후
  invoiceDate: string; // 계산서일
  contractDue?: string; // 계약 지급일
  amount: number;
  paid: number;
  registeredAt?: string; // 실제 등재일
  extension?: { status: '요청' | '승인완료' | '반려'; until: string; reason: string; requestedAt: string; decidedAt?: string };
  note?: string;
}
export type ReceivableStatus = '정상' | '사전경보' | '등재대상' | '미수채권 관리중' | '추심대상' | '추심유예 승인' | '입금완료';

/** 라이선스 발급 / HyBoost 출고 요청 — 제품라인 단위 */
export interface FulfillRequest {
  id: string;
  no: string; // LIC-2026-0001 / OUT-2026-0001
  kind: 'license' | 'shipment';
  salescd: string;
  lineId: string;
  qty: number;
  date: string; // 요청(희망)일
  status: '요청대기' | '발급완료' | '발급보류' | '출고완료' | '출고보류';
  requestedAt: string;
  completedAt?: string;
  by: string;
  note?: string;
  // shipment only
  purpose?: '판매' | '데모' | '무상납품';
  model?: string;
  address?: string;
  contact?: string;
  demoDays?: number;
  reason?: string;
  // license only
  licenseType?: '신규' | '재발급' | '임시';
}

/** 직출(현장 방문) — 등록된 영업 건에 연결 */
export interface VisitLog { id: string; salescd: string; ownerId: string; date: string; time: string; place: string; customerContact: string; vendorAttend?: string; text: string; createdAt: string; }

/** 영업 일정 */
export interface Schedule { id: string; salescd?: string; ownerId: string; date: string; time: string; kind: '미팅' | '제안' | '통화' | '데모' | '기타'; title: string; memo?: string; status: '예정' | '완료' | '취소'; }

export interface Notice { id: string; title: string; body: string; date: string; urgent: boolean; author: string; }
export interface Resource { id: string; category: string; title: string; file: string; date: string; owner: string; }

/** 내부보고(가마감·마감) 스냅샷 */
export interface ReportSnapshot { month: string; kind: '가마감' | '마감'; savedAt: string; by: string; rows: Record<string, string | number>[]; }

export interface CommonCode { group: string; groupName: string; code: string; name: string; order: number; active: boolean; }
export interface AuditLog { id: string; at: string; userId: string; userName: string; action: '로그인' | '조회' | '등록' | '수정' | '삭제' | '상태변경' | '다운로드' | '개인정보열람' | '승인'; target: string; detail: string; ip: string; }
export interface TqsReconException { id: string; custcd: string; customerName: string; field: string; newSystemValue: string; tqsValue: string; detectedAt: string; status: 'open' | 'accepted_new' | 'accepted_tqs' | 'ignored'; decidedBy?: string; decidedAt?: string; }
export interface GoldmineAlias { id: string; aliasName: string; issueCount: number; custcd?: string; confidence: number; status: 'mapped' | 'candidate' | 'unmapped'; }

/** 대시보드 위젯 설정 (V2.4: 선택·순서 변경 가능) */
export type WidgetKey = 'tasks' | 'favorites' | 'kpis' | 'notices' | 'schedule' | 'visits' | 'pipeline' | 'workflow';
export const WIDGET_LABEL: Record<WidgetKey, string> = { tasks: '내가 처리할 업무', favorites: '즐겨찾기', kpis: '실적 KPI', notices: '공지 · 자료실', schedule: '나의 영업 일정', visits: '직출 등록 · 직출보고', pipeline: '진행 중인 Forecasting', workflow: '업무 진행 현황' };
export interface DashboardPrefs { order: WidgetKey[]; visible: WidgetKey[]; favorites: string[]; }
