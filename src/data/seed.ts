/**
 * 시연용 시드 데이터 — 실데이터·개인정보 미포함 (가상 값).
 * 결정적(deterministic) 난수를 사용하므로 새로고침해도 동일한 데이터가 생성된다.
 */
import type {
  AuditLog, CommonCode, Contract, Customer, CustomerHistory, GoldmineAlias, Partner, Product,
  ProductFamily, SalesOpportunity, SalesStatus, SalesType, Team, TqsReconException, User, Relation,
} from '@/types';
import { SALES_STATUS } from '@/types';

let seed = 20260918;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const NOW = '2026-09-18';

export const teams: Team[] = [
  { id: 'T01', name: '기업1팀', division: '영업본부' },
  { id: 'T02', name: '기업2팀', division: '영업본부' },
  { id: 'T03', name: '기업3팀', division: '영업본부' },
  { id: 'T04', name: '공공1팀', division: '영업본부' },
  { id: 'T05', name: '금융팀', division: '영업본부' },
  { id: 'T06', name: '채널팀', division: '영업본부' },
  { id: 'T07', name: '컨설팅1팀', division: '컨설팅본부' },
  { id: 'T90', name: '영업지원팀', division: '경영지원' },
];

export const users: User[] = [
  { id: 'U01', name: '김범식', teamId: 'T01', role: 'sales', email: 'bs.kim@example.com', active: true },
  { id: 'U02', name: '이수진', teamId: 'T01', role: 'sales', email: 'sj.lee@example.com', active: true },
  { id: 'U03', name: '박정호', teamId: 'T02', role: 'sales', email: 'jh.park@example.com', active: true },
  { id: 'U04', name: '최민아', teamId: 'T03', role: 'sales', email: 'ma.choi@example.com', active: true },
  { id: 'U05', name: '정우성', teamId: 'T04', role: 'sales', email: 'ws.jung@example.com', active: true },
  { id: 'U06', name: '한지원', teamId: 'T05', role: 'sales', email: 'jw.han@example.com', active: true },
  { id: 'U07', name: '오세훈', teamId: 'T06', role: 'sales', email: 'sh.oh@example.com', active: true },
  { id: 'U08', name: '윤서연', teamId: 'T07', role: 'sales', email: 'sy.yoon@example.com', active: true },
  { id: 'U10', name: '강민정', teamId: 'T90', role: 'sales_support', email: 'mj.kang@example.com', active: true },
  { id: 'U11', name: '조현우', teamId: 'T90', role: 'finance', email: 'hw.cho@example.com', active: true },
  { id: 'U12', name: '서지훈', teamId: 'T90', role: 'ma', email: 'jh.seo@example.com', active: true },
  { id: 'U13', name: '임대표', teamId: 'T90', role: 'exec', email: 'ceo@example.com', active: true },
  { id: 'U99', name: '백원광', teamId: 'T90', role: 'admin', email: 'admin@example.com', active: true },
];

export const productFamilies: ProductFamily[] = [
  { code: 'EDLP', name: 'Endpoint DLP' },
  { code: 'NDLP', name: 'Network DLP' },
  { code: 'FILTE', name: '인터넷 필터링' },
  { code: 'SDLP', name: 'Server DLP' },
  { code: 'DBI', name: 'DB 보안' },
  { code: 'VDI', name: 'VDI' },
  { code: 'MA', name: '유지관리' },
  { code: 'HB', name: 'HB 장비' },
  { code: 'CST', name: '컨설팅' },
  { code: 'ETC', name: '기타' },
];

export const products: Product[] = [
  { code: 'P-EDLP-PI', familyCode: 'EDLP', name: 'Privacy-i DLP', version: '8.0', unit: 'Users', active: true },
  { code: 'P-EDLP-DC', familyCode: 'EDLP', name: 'Privacy-i Discover', version: '8.0', unit: 'Users', active: true },
  { code: 'P-NDLP-MW', familyCode: 'NDLP', name: 'Mail-i', version: '7.5', unit: 'Users', active: true },
  { code: 'P-FILTE-NF', familyCode: 'FILTE', name: 'WebKeeper SG NF', version: '12.0', unit: 'Gbps', active: true },
  { code: 'P-FILTE-ND', familyCode: 'FILTE', name: 'WebKeeper SG NDLP', version: '12.0', unit: 'Gbps', active: true },
  { code: 'P-FILTE-AI', familyCode: 'FILTE', name: 'WebKeeper SG AI DLP', version: '1.2', unit: 'Users', active: true },
  { code: 'P-SDLP-SI', familyCode: 'SDLP', name: 'Server-i', version: '5.1', unit: '대', active: true },
  { code: 'P-DBI-DI', familyCode: 'DBI', name: 'DB-i', version: '6.0', unit: '대', active: true },
  { code: 'P-VDI-VI', familyCode: 'VDI', name: 'VD-i', version: '3.0', unit: 'Users', active: true },
  { code: 'P-HB-EF1000', familyCode: 'HB', name: 'HyBoost EF1000', version: '-', unit: '대', hb: true, active: true },
  { code: 'P-HB-NF2000', familyCode: 'HB', name: 'HyBoost NF2000', version: '-', unit: '대', hb: true, active: true },
  { code: 'P-MA-STD', familyCode: 'MA', name: '유지관리(표준)', version: '-', unit: '식', active: true },
  { code: 'P-CST-ISMS', familyCode: 'CST', name: 'ISMS-P 컨설팅', version: '-', unit: '식', active: true },
  { code: 'P-ETC-EDU', familyCode: 'ETC', name: '교육', version: '-', unit: '식', active: false },
];

const customerNames: [string, string, string?][] = [
  ['한빛전자', '기업', '한빛그룹'], ['대한생명보험', '금융'], ['서울중앙병원', '의료'], ['한국교육정보원', '공공'],
  ['미래산업', '기업', '미래그룹'], ['나라은행', '금융'], ['경기도청', '공공'], ['푸른대학교', '교육'],
  ['동해화학', '기업', '동해그룹'], ['아침식품', '기업'], ['국민카드', '금융'], ['부산광역시', '공공'],
  ['하늘항공', '기업'], ['새벽증권', '금융'], ['한강대학교병원', '의료'], ['남부발전', '공공'],
  ['바다물류', '기업'], ['강남세무법인', '기업'], ['해양수산연구원', '공공'], ['빛고을저축은행', '금융'],
  ['초록에너지', '기업', '초록그룹'], ['성실건설', '기업'], ['우리교육청', '공공'], ['참좋은병원', '의료'],
];

const roads = ['서울특별시 강남구 테헤란로', '서울특별시 서초구 서초대로', '경기도 성남시 분당구 판교역로', '부산광역시 해운대구 센텀중앙로', '대전광역시 유성구 대학로', '서울특별시 영등포구 여의대로'];

export const customers: Customer[] = customerNames.map(([name, sub, group], i) => {
  const custcd = `C${pad(1001 + i, 5)}`;
  const y = int(2014, 2025);
  const created = iso(y, int(1, 12), int(1, 28));
  const primaryRoad = pick(roads);
  return {
    custcd,
    legacySalesCustcd: i % 5 === 0 ? `S${pad(2000 + i, 5)}` : custcd,
    name,
    corpType: sub === '공공' ? '공공' : '법인',
    corpNo: `${pad(int(100000, 999999), 6)}-${pad(int(1000000, 9999999), 7)}`,
    bizNo: `${pad(int(100, 999), 3)}-${pad(int(10, 99), 2)}-${pad(int(10000, 99999), 5)}`,
    category: i % 3 === 0 ? 'CRM08' : 'CRM07',
    subCategory: sub,
    group,
    contacts: [
      { id: `${custcd}-K1`, name: pick(['김철수', '이영희', '박민수', '정다은', '최준호']), title: pick(['부장', '차장', '과장', '팀장']), dept: pick(['정보보안팀', '구매팀', 'IT기획팀', '전산실']), phone: `010-${pad(int(1000, 9999), 4)}-${pad(int(1000, 9999), 4)}`, email: `contact${i}@example.com`, kind: '구매' },
      { id: `${custcd}-K2`, name: pick(['홍길동', '서연우', '문태양', '배수지']), title: pick(['대리', '주임', '과장']), dept: pick(['정보보안팀', '인프라팀']), phone: `010-${pad(int(1000, 9999), 4)}-${pad(int(1000, 9999), 4)}`, email: `it${i}@example.com`, kind: '검수' },
    ],
    sites: [
      { id: `${custcd}-S1`, name: '본사', roadAddress: `${primaryRoad} ${int(1, 500)}`, buildingCode: `${pad(int(1111000000, 4199999999), 10)}${pad(int(1, 99999), 5)}`, isPrimary: true },
      ...(i % 4 === 0 ? [{ id: `${custcd}-S2`, name: '데이터센터', roadAddress: `${pick(roads)} ${int(1, 500)}`, buildingCode: `${pad(int(1111000000, 4199999999), 10)}${pad(int(1, 99999), 5)}`, isPrimary: false }] : []),
    ],
    tqsSynced: i % 7 !== 3,
    createdAt: created,
    updatedAt: iso(2026, int(1, 9), int(1, 17)),
  };
});

export const partners: Partner[] = [
  ['에스디에스', '총판', '영업관리'], ['넥스트원', 'SI', 'TQS'], ['보안나라', '리셀러', '병합'], ['클라우드브릿지', 'MSP', 'TQS'],
  ['한울정보', 'SI', '영업관리'], ['디지털파트너스', '리셀러', '병합'], ['시큐어링크', '총판', 'TQS'], ['데이터로드', 'SI', '영업관리'],
  ['비전아이티', '리셀러', '병합'], ['오름시스템', 'MSP', 'TQS'],
].map(([name, ct, src], i) => ({
  id: `PT${pad(i + 1, 3)}`,
  name: name as string,
  bizNo: `${pad(int(100, 999), 3)}-${pad(int(10, 99), 2)}-${pad(int(10000, 99999), 5)}`,
  channelType: ct as Partner['channelType'],
  paymentTerms: pick(['검수 후 30일', '세금계산서 익월 말', '계약 후 60일', '납품 후 45일']),
  payDays: pick([30, 45, 60]),
  contactName: pick(['김파트', '이채널', '박세일즈']),
  phone: `02-${pad(int(100, 999), 3)}-${pad(int(1000, 9999), 4)}`,
  status: i === 8 ? 'inactive' : 'active',
  source: src as Partner['source'],
}));

const projectWords = ['정보보호 솔루션 구축', 'DLP 고도화', '인터넷 필터링 교체', '개인정보 보호 체계 구축', 'DB 접근제어 도입', 'VDI 보안 구축', '유지관리 갱신', 'AI DLP 도입 PoC', '망분리 보안 강화', '내부정보 유출방지'];

function makeLines(prob: number): SalesOpportunity['lines'] {
  const n = int(1, 3);
  const lines: SalesOpportunity['lines'] = [];
  for (let i = 0; i < n; i++) {
    const p = pick(products.filter((x) => x.active && x.familyCode !== 'MA' && x.familyCode !== 'HB'));
    const qty = p.unit === 'Users' ? pick([100, 300, 500, 1000, 2000]) : p.unit === 'Gbps' ? 1 : int(1, 4);
    const unitPrice = p.unit === 'Users' ? pick([30000, 45000, 60000]) : p.unit === 'Gbps' ? pick([45000000, 60000000]) : pick([8000000, 15000000]);
    const sales = qty * unitPrice;
    const buy = Math.round(sales * pick([0.1, 0.15, 0.2]));
    lines.push({ id: `L${int(100000, 999999)}`, kind: '매출', productCode: p.code, itemName: `${qty} ${p.unit}`, relation: pick(['신규', '증설', '고도화'] as const), qty, unitPrice, sales, buy });
    if (p.familyCode === 'FILTE' && rnd() > 0.5) {
      const hb = pick(products.filter((x) => x.hb));
      lines.push({ id: `L${int(100000, 999999)}`, kind: '매출', productCode: hb.code, itemName: hb.name, relation: '신규', qty: 1, unitPrice: 12000000, sales: 12000000, buy: 7000000, hbModel: hb.name.replace('HyBoost ', '') });
    }
  }
  if (prob >= 50 && rnd() > 0.4) {
    const fee = Math.round(lines.reduce((a, l) => a + l.sales, 0) * 0.1);
    lines.push({ id: `L${int(100000, 999999)}`, kind: '매입', itemName: '영업수수료(파트너)', relation: '신규', qty: 1, unitPrice: fee, sales: 0, buy: fee });
  }
  return lines;
}

const statusWeights: SalesStatus[] = ['SN01Z', 'SN02Z', 'SN03Z', 'SN03Z', 'SN03Z', 'SN04Z', 'SN04Z', 'SN05Z', 'SN05Z', 'SN05Z', 'SN06Z', 'SN07Z', 'SN08Z', 'SN09Z', 'SN10Z', 'SN11Z', 'SN12Z', 'SN12Z', 'SN14Z', 'SN99Z'];
const probByStatus = (s: SalesStatus): SalesOpportunity['probability'] => {
  const phase = SALES_STATUS.find((x) => x.code === s)!.phase;
  if (phase === '발굴') return pick([10, 30]);
  if (phase === '진행') return pick([30, 50, 70]);
  if (phase === '수주' || phase === '이행') return pick([90, 100]);
  return s === 'SN12Z' ? 100 : 10;
};

export const sales: SalesOpportunity[] = [];
for (let i = 0; i < 48; i++) {
  const c = customers[i % customers.length];
  const owner = pick(users.filter((u) => u.role === 'sales'));
  const status = statusWeights[i % statusWeights.length];
  const prob = probByStatus(status);
  const fy = 2026;
  const fm = int(1, 12);
  const created = iso(2026, Math.max(1, fm - int(1, 4)), int(1, 28));
  const st = SALES_STATUS.find((x) => x.code === status)!;
  const partner = rnd() > 0.55 ? pick(partners.filter((p) => p.status === 'active')) : undefined;
  const lines = makeLines(prob);
  const salescd = `SO-2026-${pad(i + 1, 4)}`;
  const isOrdered = ['수주', '이행', '종결'].includes(st.phase) && status !== 'SN14Z' && status !== 'SN99Z' && status !== 'SN13Z';
  sales.push({
    salescd,
    custcd: c.custcd,
    name: `${c.name} ${pick(projectWords)}`,
    tqsProjectCode: rnd() > 0.5 ? `TQ${int(54880000, 54889999)}` : undefined,
    salesType: pick(['1', '1', '1', 'C', 'R', 'SM', '1C', '99'] as SalesType[]),
    status,
    probability: prob,
    forecastYm: `${fy}-${pad(fm)}`,
    forecastDate: created,
    orderDate: isOrdered ? iso(2026, fm, int(1, 28)) : undefined,
    teamId: owner.teamId,
    ownerId: owner.id,
    partnerId: partner?.id,
    partyName: partner ? partner.name : c.name,
    relation: pick(['신규', '증설', '고도화', '교차판매', 'ASP'] as Relation[]),
    lines,
    taxStatus: status === 'SN12Z' ? 'TBOK' : status === 'SN11Z' ? 'TBREQ' : status === 'SN06Z' ? pick(['TBREQ', 'TBRED']) : 'NONE',
    attachments: prob >= 50 ? [{ id: `A${i}1`, name: `견적서_${salescd}_v1.pdf`, type: '견적서', size: 234000 + i * 1000, uploadedAt: created, by: owner.name }] : [],
    activities: [
      { id: `AC${i}1`, at: created, by: owner.name, kind: '방문', text: '고객 담당자 미팅 — 요구사항 청취' },
      ...(prob >= 50 ? [{ id: `AC${i}2`, at: iso(2026, fm, int(1, 15)), by: owner.name, kind: '메일' as const, text: '견적서 송부, 예산 협의' }] : []),
    ],
    history: [
      { id: `H${i}1`, at: created, by: owner.name, kind: '등록', text: '영업 건 등록' },
      { id: `H${i}2`, at: iso(2026, fm, int(1, 17)), by: owner.name, kind: '상태', text: `상태 변경 → ${st.name}` },
    ],
    memo: rnd() > 0.7 ? '경쟁사 제안 병행 중. 예산 확정 대기.' : undefined,
    crossCheckWarnings: partner && !lines.some((l) => l.kind === '매입') ? ['파트너 경유 건이나 매입(수수료) 라인이 없습니다 (C-1 경고)'] : undefined,
    createdAt: created,
    updatedAt: iso(2026, fm, int(1, 17)),
  });
}
// 이전영업현황(OLD) 조회용 이행 표본
for (let i = 0; i < 6; i++) {
  const c = customers[(i * 3) % customers.length];
  const y = int(2015, 2022);
  sales.push({
    salescd: `OLD-${y}-${pad(i + 1, 4)}`,
    custcd: c.custcd,
    name: `${c.name} ${pick(projectWords)} (이전영업)`,
    salesType: '1',
    status: 'SN13Z',
    probability: 100,
    forecastYm: `${y}-${pad(int(1, 12))}`,
    forecastDate: iso(y, 1, 10),
    orderDate: iso(y, 3, 10),
    teamId: 'T01',
    ownerId: 'U01',
    relation: '신규',
    lines: [{ id: `LO${i}`, kind: '매출', productCode: 'P-EDLP-PI', itemName: '300 Users', relation: '신규', qty: 300, unitPrice: 30000, sales: 9000000, buy: 900000 }],
    taxStatus: 'TBOK',
    attachments: [],
    activities: [],
    history: [{ id: `HO${i}`, at: NOW, by: '이행스크립트', kind: '등록', text: 'SQL Server → PostgreSQL 이행 (조회용)' }],
    legacy: true,
    createdAt: iso(y, 1, 10),
    updatedAt: iso(y, 3, 10),
  });
}

export const contracts: Contract[] = sales
  .filter((s) => ['SN05Z', 'SN06Z', 'SN07Z', 'SN08Z', 'SN09Z', 'SN10Z', 'SN11Z', 'SN12Z'].includes(s.status) && !s.legacy)
  .slice(0, 14)
  .map((s, i) => {
    const amount = s.lines.reduce((a, l) => a + l.sales, 0);
    const start = s.orderDate ?? s.forecastDate;
    const sy = Number(start.slice(0, 4));
    const id = `CT-2026-${pad(i + 1, 3)}`;
    s.contractId = id;
    return {
      id,
      salescd: s.salescd,
      type: s.salesType === 'R' ? '유지관리' : '신규',
      name: `${s.name} 계약`,
      party: s.partyName ?? '',
      amount,
      vat: Math.round(amount * 0.1),
      signedAt: start,
      start,
      end: iso(sy + 1, Number(start.slice(5, 7)), Number(start.slice(8, 10))),
      maRate: pick([8, 10, 12]),
      freeMaMonths: 12,
      attachments: [{ id: `CA${i}`, name: `계약서_${id}.pdf`, type: '계약서', size: 512000, uploadedAt: start, by: '강민정' }],
      memo: i % 4 === 0 ? '하자보증 2년, 검수 후 30일 내 대금 지급' : undefined,
    };
  });

export const customerHistory: CustomerHistory[] = customers.slice(0, 8).flatMap((c, i) => [
  { id: `CH${i}a`, custcd: c.custcd, at: c.updatedAt, by: '강민정', field: '사이트.주소', before: '(구주소) 서울 강남구 역삼동 123', after: c.sites[0].roadAddress },
  { id: `CH${i}b`, custcd: c.custcd, at: c.createdAt, by: '이행스크립트', field: '(등록)', before: '', after: 'TQS 고객 마스터 승계' },
]);

export const commonCodes: CommonCode[] = [
  ...SALES_STATUS.map((s, i) => ({ group: 'SALES_STATUS', groupName: '영업상태', code: s.code, name: s.name, order: i + 1, active: true })),
  ...(['1', '99', 'R', 'SM', 'C', '1C'] as SalesType[]).map((c, i) => ({ group: 'SALES_TYPE', groupName: '영업구분', code: c, name: ({ '1': '직접영업', '99': '기타', R: '갱신(MA)', SM: 'SM(유지보수)', C: '채널영업', '1C': '직접+채널' })[c], order: i + 1, active: true })),
  ...[10, 30, 50, 70, 90, 100].map((p, i) => ({ group: 'PROBABILITY', groupName: '수주확도', code: String(p), name: `${p}%`, order: i + 1, active: true })),
  { group: 'CUST_CATEGORY', groupName: '고객 대분류', code: 'CRM07', name: '중요', order: 1, active: true },
  { group: 'CUST_CATEGORY', groupName: '고객 대분류', code: 'CRM08', name: '핵심', order: 2, active: true },
  ...['기업', '공공', '금융', '교육', '의료'].map((n, i) => ({ group: 'CUST_SUB', groupName: '고객 소분류', code: `SUB0${i + 1}`, name: n, order: i + 1, active: true })),
  ...['TBREQ', 'TBRED', 'TBOK', 'TBPDG', 'TBSTP', 'TBRRE'].map((c, i) => ({ group: 'TAX_STATUS', groupName: '세금계산서 상태', code: c, name: ['요청', '대기', '완료', 'Pending', '미수', '재요청'][i], order: i + 1, active: true })),
];

export const auditLogs: AuditLog[] = Array.from({ length: 40 }, (_, i) => {
  const u = pick(users);
  const action = pick(['로그인', '조회', '등록', '수정', '상태변경', '다운로드', '개인정보열람'] as AuditLog['action'][]);
  const s = pick(sales);
  return {
    id: `AL${pad(1000 - i, 4)}`,
    at: `2026-09-${pad(18 - Math.floor(i / 4))} ${pad(int(8, 19))}:${pad(int(0, 59))}:${pad(int(0, 59))}`,
    userId: u.id,
    userName: u.name,
    action,
    target: action === '로그인' ? '-' : action === '개인정보열람' ? `고객담당자 ${s.custcd}` : s.salescd,
    detail: action === '상태변경' ? '영업중 → 수주' : action === '다운로드' ? '영업 건 목록 Excel' : action === '개인정보열람' ? '연락처 마스킹 해제' : '-',
    ip: `10.20.${int(1, 30)}.${int(2, 250)}`,
  };
});

export const tqsRecon: TqsReconException[] = [
  ['C01003', '사업자번호', '123-45-67890', '123-45-67891'],
  ['C01005', '고객사명', '미래산업', '미래산업(주)'],
  ['C01008', '법인구분', '법인', '개인사업자'],
  ['C01011', '소분류', '금융', '기업'],
  ['C01014', '대분류', 'CRM08', 'CRM07'],
  ['C01017', '고객사명', '바다물류', '바다물류주식회사'],
  ['C01020', '사업자번호', '456-78-90123', '(없음)'],
  ['C01022', '계열', '(없음)', '성실그룹'],
].map(([custcd, field, nv, tv], i) => ({
  id: `RX${pad(i + 1, 3)}`,
  custcd,
  customerName: customers.find((c) => c.custcd === custcd)?.name ?? custcd,
  field,
  newSystemValue: nv,
  tqsValue: tv,
  detectedAt: i < 3 ? '2026-09-18 06:00' : '2026-09-17 06:00',
  status: i > 5 ? 'accepted_tqs' : 'open',
  decidedBy: i > 5 ? '강민정' : undefined,
  decidedAt: i > 5 ? '2026-09-17 10:12' : undefined,
}));

export const goldmineAliases: GoldmineAlias[] = [
  ['한빛전자(주)', 180, 'C01001', 98, 'mapped'], ['한빛전자 본사', 42, 'C01001', 95, 'mapped'], ['대한생명', 96, 'C01002', 90, 'mapped'],
  ['서울중앙병원 전산실', 33, 'C01003', 92, 'mapped'], ['교육정보원', 58, 'C01004', 72, 'candidate'], ['미래산업 판교', 27, 'C01005', 80, 'candidate'],
  ['나라은행 IT', 64, 'C01006', 88, 'mapped'], ['경기도청', 39, 'C01007', 99, 'mapped'], ['푸른대', 21, 'C01008', 65, 'candidate'],
  ['동해화학 여수공장', 18, 'C01009', 70, 'candidate'], ['(테스트)', 12, undefined, 0, 'unmapped'], ['고객사 미상', 30, undefined, 0, 'unmapped'],
  ['국민카드', 74, 'C01011', 97, 'mapped'], ['부산시', 26, 'C01012', 60, 'candidate'], ['하늘항공 IT센터', 15, 'C01013', 85, 'mapped'],
  ['새벽증권', 44, 'C01014', 93, 'mapped'], ['ABC상사', 9, undefined, 0, 'unmapped'], ['남부발전(주)', 31, 'C01016', 96, 'mapped'],
].map(([alias, cnt, custcd, conf, status], i) => ({
  id: `GA${pad(i + 1, 3)}`,
  aliasName: alias as string,
  issueCount: cnt as number,
  custcd: custcd as string | undefined,
  confidence: conf as number,
  status: status as GoldmineAlias['status'],
}));
