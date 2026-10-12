/**
 * 시연용 시드 데이터 — 실데이터·개인정보 미포함(가상 값). 결정적 난수로 새로고침해도 동일하다.
 * V2.4 수정안 반영: 프로젝트코드 YYYY-NNNNN, 영업상태 11종, 계약구분, 제품분류 기반 제품라인(HyBoost 수량),
 * 서티 승인, 계약 지급조건, 매출채권, 라이선스 발급·HyBoost 출고 요청, 통합문서함, 직출·일정, 공지·자료실.
 */
import type {
  AuditLog, CommonCode, Contract, ContractParty, Customer, CustomerHistory, Document, FulfillRequest, GoldmineAlias, Notice, Partner,
  ProductItem, Receivable, Resource, SalesLine, SalesOpportunity, SalesStatus, SalesType, Schedule, Team, TqsReconException, User, Relation, VisitLog,
} from '@/types';
import { SALES_STATUS, SALES_TYPE_LABEL, DOC_PREFIX, CREDIT_GRADES } from '@/types';
import productJson from './productItems.json';

let seed = 20260929;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const addDays = (date: string, n: number) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const TODAY = '2026-10-12';

export const productItems: ProductItem[] = (productJson as { items: ProductItem[] }).items;
export const hyboostModels: string[] = (productJson as { hyboostModels: string[] }).hyboostModels;

export const teams: Team[] = [
  ['T01', '공공1팀'], ['T02', '공공2팀'], ['T03', '공공3팀'], ['T04', '공공4팀'], ['T05', '기업1팀'], ['T06', '기업2팀'],
  ['T07', '금융1팀'], ['T08', '금융2팀'], ['T09', 'SC1팀'], ['T10', '채널영업팀'],
].map(([id, name]) => ({ id, name, division: '영업본부' })).concat([{ id: 'T90', name: '영업지원팀', division: '경영지원' }]);

const roster: Record<string, string[]> = {
  T01: ['김도윤', '윤서연', '신도현'], T02: ['이서준', '장민호', '권나연'], T03: ['박지훈', '임수빈', '황지민'], T04: ['최민재', '한지우', '안태윤'],
  T05: ['정하늘', '오세훈', '송하준'], T06: ['강유진', '서예린', '류채원'], T07: ['조현우', '홍시우', '문서진'], T08: ['전다은', '양지호', '심건우'],
  T09: ['고은찬', '배수아', '노유나'], T10: ['남소연', '차민준', '주하린'],
};
let uSeq = 1;
export const users: User[] = [
  ...Object.entries(roster).flatMap(([teamId, names]) => names.map((name, i) => ({ id: `U${pad(uSeq++)}`, name, teamId, role: (i === 0 ? 'team_lead' : 'sales') as User['role'], email: `u${uSeq}@example.com`, active: true }))),
  { id: 'U80', name: '강민정', teamId: 'T90', role: 'sales_support', email: 'support@example.com', active: true },
  { id: 'U81', name: '조현민', teamId: 'T90', role: 'finance', email: 'finance@example.com', active: true },
  { id: 'U82', name: '서지훈', teamId: 'T90', role: 'ma', email: 'ma@example.com', active: true },
  { id: 'U83', name: '임본부', teamId: 'T90', role: 'exec', email: 'exec@example.com', active: true },
  { id: 'U99', name: '백원광', teamId: 'T90', role: 'admin', email: 'admin@example.com', active: true },
];
const salesUsers = users.filter((u) => u.role === 'sales' || u.role === 'team_lead');

const customerNames: [string, string, string?][] = [
  ['한빛전자', '기업', '한빛그룹'], ['대한생명보험', '금융'], ['서울중앙병원', '의료'], ['한국교육정보원', '공공'], ['미래산업', '기업', '미래그룹'], ['나라은행', '금융'],
  ['경기도청', '공공'], ['푸른대학교', '교육'], ['동해화학', '기업', '동해그룹'], ['아침식품', '기업'], ['국민카드', '금융'], ['부산광역시', '공공'],
  ['하늘항공', '기업'], ['새벽증권', '금융'], ['한강대학교병원', '의료'], ['남부발전', '공공'], ['바다물류', '기업'], ['강남세무법인', '기업'],
  ['해양수산연구원', '공공'], ['빛고을저축은행', '금융'], ['초록에너지', '기업', '초록그룹'], ['성실건설', '기업'], ['우리교육청', '공공'], ['참좋은병원', '의료'],
  ['새봄전자', '기업'], ['다온은행', '금융'], ['한결산업', '기업'], ['누리교육재단', '교육'], ['새빛도시공사', '공공'], ['온누리의료원', '의료'],
];
const roads = ['서울특별시 강남구 테헤란로', '서울특별시 서초구 서초대로', '경기도 성남시 분당구 판교역로', '부산광역시 해운대구 센텀중앙로', '대전광역시 유성구 대학로', '서울특별시 영등포구 여의대로'];

export const customers: Customer[] = customerNames.map(([name, sub, group], i) => {
  const custcd = `C${pad(1001 + i, 5)}`;
  const created = iso(int(2014, 2025), int(1, 12), int(1, 28));
  return {
    custcd, legacySalesCustcd: i % 5 === 0 ? `S${pad(2000 + i, 5)}` : custcd, name, corpType: sub === '공공' ? '공공' : '법인',
    corpNo: `${pad(int(100000, 999999), 6)}-${pad(int(1000000, 9999999), 7)}`, bizNo: `${pad(int(100, 999), 3)}-${pad(int(10, 99), 2)}-${pad(int(10000, 99999), 5)}`,
    category: i % 3 === 0 ? 'CRM08' : 'CRM07', subCategory: sub, group,
    contacts: [
      { id: `${custcd}-K1`, name: pick(['김철수', '이영희', '박민수', '정다은', '최준호']), title: pick(['부장', '차장', '과장', '팀장']), dept: pick(['정보보안팀', '구매팀', 'IT기획팀', '전산실']), phone: `010-${pad(int(1000, 9999), 4)}-${pad(int(1000, 9999), 4)}`, email: `contact${i}@example.com`, kind: '구매' },
      { id: `${custcd}-K2`, name: pick(['홍길동', '서연우', '문태양', '배수지']), title: pick(['대리', '주임', '과장']), dept: pick(['정보보안팀', '인프라팀']), phone: `010-${pad(int(1000, 9999), 4)}-${pad(int(1000, 9999), 4)}`, email: `it${i}@example.com`, kind: '검수' },
    ],
    sites: [
      { id: `${custcd}-S1`, name: '본사', roadAddress: `${pick(roads)} ${int(1, 500)}`, buildingCode: `${pad(int(1111000000, 4199999999), 10)}${pad(int(1, 99999), 5)}`, isPrimary: true },
      ...(i % 4 === 0 ? [{ id: `${custcd}-S2`, name: '데이터센터', roadAddress: `${pick(roads)} ${int(1, 500)}`, buildingCode: `${pad(int(1111000000, 4199999999), 10)}${pad(int(1, 99999), 5)}`, isPrimary: false }] : []),
    ],
    tqsSynced: i % 7 !== 3, approval: i === 28 ? '승인대기' : '승인완료', createdAt: created, updatedAt: iso(2026, int(1, 10), int(1, 11)),
  };
});

export const partners: Partner[] = ([
  ['에스디에스', '총판', '영업관리'], ['넥스트원', 'SI', 'TQS'], ['보안나라', '리셀러', '병합'], ['클라우드브릿지', 'MSP', 'TQS'], ['한울정보', 'SI', '영업관리'],
  ['디지털파트너스', '리셀러', '병합'], ['시큐어링크', '총판', 'TQS'], ['데이터로드', 'SI', '영업관리'], ['비전아이티', '리셀러', '병합'], ['오름시스템', 'MSP', 'TQS'],
] as const).map(([name, ct, src], i) => ({
  id: `PT${pad(i + 1, 3)}`, name, bizNo: `${pad(int(100, 999), 3)}-${pad(int(10, 99), 2)}-${pad(int(10000, 99999), 5)}`, channelType: ct,
  paymentTerms: pick(['검수 후 30일', '세금계산서 익월 말', '계약 후 60일', '납품 후 45일']), payDays: pick([30, 45, 60]), contactName: pick(['김파트', '이채널', '박세일즈']),
  phone: `02-${pad(int(100, 999), 3)}-${pad(int(1000, 9999), 4)}`, status: i === 8 ? 'inactive' : 'active', source: src,
}));

/** 계약처 마스터 — 고객 직접거래 + 파트너 경유. 신용등급·직접거래 여부가 매출채권 규칙을 결정 */
export const contractParties: ContractParty[] = [
  ...customers.slice(0, 24).map((c, i) => ({ id: `CP${pad(i + 1, 3)}`, name: c.name, bizNo: c.bizNo, creditRating: pick(CREDIT_GRADES.slice(0, 14)), direct: true, status: '등재' as const, approvedAt: c.createdAt })),
  ...partners.map((p, i) => ({ id: `CP${pad(100 + i, 3)}`, name: p.name, bizNo: p.bizNo, creditRating: pick(['A0', 'A-', 'BBB+', 'BBB0', 'BB+', 'BB0', 'B+', 'CCC']), direct: false, status: '등재' as const, approvedAt: '2025-01-10' })),
  { id: 'CP201', name: '가온물류', bizNo: '512-81-33021', creditRating: 'BB0', direct: false, status: '등재기안', requestedBy: '김도윤', requestedAt: '2026-10-07' },
  { id: 'CP202', name: '이음서비스', bizNo: '402-86-77810', creditRating: 'B0', direct: false, status: '등재기안', requestedBy: '주하린', requestedAt: '2026-10-09' },
];

const projectWords = ['정보보호 솔루션 구축', 'DLP 고도화', '인터넷 필터링 교체', '개인정보 보호 체계 구축', 'DB 접근제어 도입', 'VDI 보안 구축', '유지관리 갱신', 'AI DLP 도입 PoC', '망분리 보안 강화', '내부정보 유출방지', '서버 보안 증설', '취약점 진단'];
const salesItems = productItems.filter((p) => p.kind === '매출' && p.sub === p.product && productItems.some((x) => x.product === p.product && x.sub === 'HB부품'));
const unitPriceOf = (unit: string) => unit === 'Agent' || unit === 'User' ? pick([30000, 45000, 60000]) : unit === 'Core' ? pick([3000000, 4500000]) : unit === 'EA' ? pick([12000000, 20000000]) : unit === 'MM' ? 9000000 : pick([45000000, 60000000, 80000000]);
const qtyOf = (unit: string) => unit === 'Agent' || unit === 'User' ? pick([100, 300, 500, 1000, 2000]) : unit === 'Core' ? pick([8, 16, 32]) : unit === 'MM' ? pick([2, 3, 6]) : 1;

function makeLines(relation: Relation, prob: number, partner: boolean): SalesLine[] {
  const n = int(1, 2);
  const lines: SalesLine[] = [];
  for (let i = 0; i < n; i++) {
    const it = pick(salesItems.filter((x) => ['Endpoint', 'Network', 'Server & DB'].includes(x.group)));
    const qty = qtyOf(it.unit); const up = unitPriceOf(it.unit); const sales = qty * up;
    const isNet = it.group === 'Network';
    const hb = isNet || rnd() > 0.7 ? pick(hyboostModels.filter((m) => (isNet ? /^NF/.test(m) : /^EF/.test(m)))) : undefined;
    lines.push({ id: `L${int(100000, 999999)}`, kind: '매출', relation, group: it.group, product: it.product, sub: it.sub, itemId: it.id, version: pick(['8.0', '12.0', '6.0', '3.0']), license: `${qty} ${it.unit}`, paidLicense: `${qty} ${it.unit}`, freeLicense: rnd() > 0.6 ? `${Math.round(qty * 0.1)} ${it.unit}` : undefined, network: pick(['내부망', '업무망', '외부망']), hyboost: hb, qty, hyboostQty: hb ? int(1, 2) : 0, mirror: isNet ? pick(['미러', '인라인']) : '미해당', sales, buy: Math.round(sales * pick([0.05, 0.1, 0.15])) });
    if (hb) {
      const hbItem = productItems.find((x) => x.product === it.product && x.sub === 'HB부품');
      lines.push({ id: `L${int(100000, 999999)}`, kind: '내부원가', relation, group: it.group, product: it.product, sub: 'HB부품', itemId: hbItem?.id, qty: 1, hyboost: hb, hyboostQty: 0, mirror: '미해당', sales: 0, buy: pick([4000000, 7000000]) });
    }
  }
  if (partner && prob >= 50) {
    const base = lines[0]; const fee = Math.round(lines.reduce((a, l) => a + l.sales, 0) * 0.1);
    const feeItem = productItems.find((x) => x.product === base.product && x.sub === '영업수수료');
    lines.push({ id: `L${int(100000, 999999)}`, kind: '매입', relation, group: base.group, product: base.product, sub: '영업수수료', itemId: feeItem?.id, qty: 1, hyboostQty: 0, mirror: '미해당', sales: 0, buy: fee });
  }
  if (prob >= 90 && rnd() > 0.5) {
    const base = lines[0]; const ma = productItems.find((x) => x.product === base.product && x.sub === '유지관리');
    lines.push({ id: `L${int(100000, 999999)}`, kind: '서비스', relation, group: base.group, product: base.product, sub: '유지관리', itemId: ma?.id, qty: 1, hyboostQty: 0, mirror: '미해당', sales: Math.round(base.sales * 0.1), buy: 0 });
  }
  return lines;
}

const statusWeights: SalesStatus[] = ['SN02Z', 'SN02Z', 'SN03Z', 'SN03Z', 'SN03Z', 'SN04Z', 'SN04Z', 'SN05Z', 'SN05Z', 'SN05Z', 'SN07Z', 'SN09Z', 'SN10Z', 'SN12M', 'SN12M', 'SN12Z', 'SN12Z', 'SN12Z', 'SN13Z', 'SN14Z'];
const probByStatus = (s: SalesStatus): SalesOpportunity['probability'] => {
  const phase = SALES_STATUS.find((x) => x.code === s)!.phase;
  if (phase === '발굴') return pick([10, 30]);
  if (phase === '진행') return pick([30, 50, 70]);
  if (phase === '수주' || phase === '이행') return pick([90, 100]);
  return s === 'SN14Z' ? 10 : 100;
};

export const sales: SalesOpportunity[] = [];
for (let i = 0; i < 64; i++) {
  const c = customers[i % customers.length];
  const owner = pick(salesUsers);
  const status = statusWeights[i % statusWeights.length];
  const prob = probByStatus(status);
  const st = SALES_STATUS.find((x) => x.code === status)!;
  const fm = int(1, 12);
  const created = iso(2026, Math.max(1, fm - int(1, 4)), int(1, 28));
  const partner = rnd() > 0.55 ? pick(partners.filter((p) => p.status === 'active')) : undefined;
  const relation = pick(['신규', '신규', '증설', '고도화', '교차판매', '윈백_신규', '재계약', '기타'] as Relation[]);
  const lines = makeLines(relation, prob, !!partner);
  const salescd = `2026-${pad(i + 1, 5)}`;
  const isOrdered = ['수주', '이행'].includes(st.phase) || status === 'SN12M' || status === 'SN12Z';
  const party = partner ? contractParties.find((p) => p.name === partner.name) : contractParties.find((p) => p.name === c.name);
  const certPending = st.phase === '발굴' && i % 3 === 0;
  sales.push({
    salescd, custcd: c.custcd, name: `${c.name} ${pick(projectWords)}`, tqsProjectCode: rnd() > 0.5 ? `TQ${int(54880000, 54889999)}` : undefined,
    salesType: partner ? pick(['C', 'R', '1C'] as SalesType[]) : pick(['1', '1', '99', 'SM'] as SalesType[]),
    status, probability: prob, forecastYm: `2026-${pad(fm)}`, forecastDate: created, orderDate: isOrdered ? iso(2026, fm, int(1, 28)) : undefined,
    teamId: owner.teamId, ownerId: owner.id, partnerId: partner?.id, partyName: party?.name ?? c.name, partyId: party?.id,
    relation, parentSalescd: ['증설', '고도화', '재계약'].includes(relation) && i > 3 ? `2026-${pad(int(1, Math.max(1, i - 2)), 5)}` : undefined,
    competitor: relation.startsWith('윈백') ? pick(['파수', '소프트캠프', '지란지교소프트', '시큐아이']) : undefined,
    lines,
    taxStatus: status === 'SN12Z' ? 'TBOK' : status === 'SN12M' ? pick(['TBOK', 'TBSTP']) : status === 'SN10Z' ? 'TBREQ' : 'NONE',
    taxDate: ['SN12Z', 'SN12M'].includes(status) ? iso(2026, fm, int(1, 28)) : undefined,
    attachments: prob >= 50 ? [{ id: `A${i}1`, name: `견적서_${salescd}_v1.pdf`, type: '매출견적서', size: 234000, uploadedAt: created, by: owner.name, docNo: `SMS-QUO-26${pad(fm)}-${pad(i + 1, 3)}` }] : [],
    activities: [
      { id: `AC${i}1`, at: created, by: owner.name, kind: '방문', text: '고객 담당자 미팅 — 요구사항 청취' },
      ...(prob >= 50 ? [{ id: `AC${i}2`, at: iso(2026, fm, int(1, 15)), by: owner.name, kind: '메일' as const, text: '견적서 송부, 예산 협의' }] : []),
    ],
    history: [
      { id: `H${i}1`, at: created, by: owner.name, kind: '등록', text: '영업 건 등록 · 서티 자동 상신' },
      { id: `H${i}2`, at: iso(2026, fm, int(1, 11)), by: owner.name, kind: '상태', text: `상태 변경 → ${st.name}` },
    ],
    cert: certPending ? { status: '승인대기', submittedAt: created } : i === 22 ? { status: '반려', submittedAt: created, approver: '사업부장', decidedAt: addDays(created, 2), reason: '예산 근거 보완 필요' } : { status: '승인완료', submittedAt: created, approver: pick(['팀장', '사업부장', '본부장']), decidedAt: addDays(created, 1) },
    inspection: st.phase === '이행' || st.phase === '종결' ? { status: status === 'SN07Z' ? '검수대기' : status === 'SN09Z' ? '검수중' : '검수완료', completedAt: ['SN10Z', 'SN12M', 'SN12Z'].includes(status) ? iso(2026, fm, int(1, 28)) : undefined } : st.phase === '수주' ? { status: '검수대기' } : undefined,
    deliveryStage: st.phase === '이행' ? pick(['장비 입고', '설치 진행', '시험 운영']) : undefined,
    memo: rnd() > 0.75 ? '경쟁사 제안 병행 중. 예산 확정 대기.' : undefined,
    crossCheckWarnings: partner && !lines.some((l) => l.kind === '매입') ? ['파트너 경유 건이나 매입(수수료) 라인이 없습니다 (C-1 경고)'] : undefined,
    createdAt: created, updatedAt: iso(2026, fm, int(1, 11)),
  });
}
// 이전영업현황(OLD) 조회용 이행 표본
for (let i = 0; i < 4; i++) {
  const c = customers[(i * 3) % customers.length]; const y = int(2015, 2022);
  const it = salesItems.find((x) => x.product === 'Privacy-i DLP')!;
  sales.push({
    salescd: `OLD-${y}-${pad(i + 1, 4)}`, custcd: c.custcd, name: `${c.name} ${pick(projectWords)} (이전영업)`, salesType: '1', status: 'SN13Z', probability: 100,
    forecastYm: `${y}-${pad(int(1, 12))}`, forecastDate: iso(y, 1, 10), orderDate: iso(y, 3, 10), teamId: 'T01', ownerId: 'U01', relation: '신규',
    lines: [{ id: `LO${i}`, kind: '매출', relation: '신규', group: it.group, product: it.product, sub: it.sub, itemId: it.id, qty: 300, hyboostQty: 0, license: '300 Agent', sales: 9000000, buy: 900000 }],
    taxStatus: 'TBOK', attachments: [], activities: [], history: [{ id: `HO${i}`, at: TODAY, by: '이행스크립트', kind: '등록', text: 'SQL Server → PostgreSQL 이행 (조회용)' }],
    cert: { status: '승인완료', submittedAt: iso(y, 1, 10) }, legacy: true, createdAt: iso(y, 1, 10), updatedAt: iso(y, 3, 10),
  });
}

const lineSales = (s: SalesOpportunity) => s.lines.reduce((a, l) => a + l.sales, 0);

export const contracts: Contract[] = sales
  .filter((s) => ['SN05Z', 'SN07Z', 'SN09Z', 'SN10Z', 'SN12M', 'SN12Z'].includes(s.status) && !s.legacy)
  .map((s, i) => {
    const amount = lineSales(s); const start = s.orderDate ?? s.forecastDate; const sy = Number(start.slice(0, 4));
    const id = `CT-2026-${pad(i + 1, 3)}`; s.contractId = id;
    const party = contractParties.find((p) => p.id === s.partyId);
    return {
      id, salescd: s.salescd, type: s.salesType === 'R' ? '유지관리' : '신규', name: `${s.name} 계약`, party: s.partyName ?? '', partyId: party?.id, amount, vat: Math.round(amount * 0.1),
      signedAt: start, start, end: iso(sy + 1, Number(start.slice(5, 7)), Number(start.slice(8, 10))), maRate: pick([8, 10, 12]), freeMaMonths: 12,
      paymentTerms: party?.direct ? pick(['검수 후 30일 현금', '계산서 발행 후 30일']) : pick(['계산서 발행 후 60일', '월말 마감 익월 말 지급']), paymentDueDays: party?.direct ? 30 : 60,
      attachments: [{ id: `CA${i}`, name: `계약서_${id}.pdf`, type: '계약서', size: 512000, uploadedAt: start, by: '강민정', docNo: `SMS-CTR-${start.slice(2, 4)}${start.slice(5, 7)}-${pad(i + 1, 3)}` }],
      memo: i % 4 === 0 ? '하자보증 2년, 검수 후 30일 내 대금 지급' : undefined,
    };
  });

/** 매출채권 — 완료(미수)·완료(수금)·검수완료 건의 세금계산서 기준 */
export const receivables: Receivable[] = sales
  .filter((s) => ['SN12M', 'SN12Z', 'SN10Z'].includes(s.status) && !s.legacy)
  .map((s, i) => {
    const party = contractParties.find((p) => p.id === s.partyId);
    const ct = contracts.find((c) => c.id === s.contractId);
    const amount = Math.round(lineSales(s) * 1.1);
    const invoice = addDays(TODAY, -int(5, 130));
    const due = addDays(invoice, ct?.paymentDueDays ?? 30);
    const paid = s.status === 'SN12Z' ? amount : rnd() > 0.7 ? Math.round(amount * pick([0.3, 0.5])) : 0;
    const overdue = due < TODAY && paid < amount;
    const distress = overdue && rnd() > 0.7;
    return {
      id: `AR-2026-${pad(i + 1, 3)}`, salescd: s.salescd, partyId: party?.id, partyName: s.partyName ?? '', direct: !!party?.direct, creditRating: party?.creditRating,
      approvedRegistration: !party?.direct && rnd() > 0.5, distress, invoiceDate: invoice, contractDue: due, amount, paid,
      registeredAt: overdue && rnd() > 0.4 ? addDays(due, 1) : undefined,
      extension: overdue && i % 5 === 0 ? { status: '승인완료', until: addDays(TODAY, 20), reason: '기능이슈 및 검수지연', requestedAt: addDays(TODAY, -6), decidedAt: addDays(TODAY, -4) } : undefined,
      note: distress ? '차입금 증가 부실징후 포착' : undefined,
    };
  });

/** 라이선스 발급 · HyBoost 출고 요청 — 수주 이후 건의 제품라인 단위 */
export const fulfillRequests: FulfillRequest[] = [];
let licSeq = 1; let outSeq = 1;
sales.filter((s) => ['SN05Z', 'SN07Z', 'SN09Z', 'SN10Z', 'SN12M', 'SN12Z'].includes(s.status) && !s.legacy).forEach((s) => {
  const owner = users.find((u) => u.id === s.ownerId)!;
  s.lines.filter((l) => l.kind === '매출').forEach((l, li) => {
    const done = ['SN10Z', 'SN12M', 'SN12Z'].includes(s.status);
    const r = rnd();
    if (li === 0 || r > 0.4) {
      const st: FulfillRequest['status'] = done ? '발급완료' : r > 0.75 ? '발급보류' : r > 0.5 ? '요청대기' : '발급완료';
      const d = addDays(s.orderDate ?? TODAY, int(3, 20));
      fulfillRequests.push({ id: `FR-L${licSeq}`, no: `LIC-2026-${pad(licSeq++, 4)}`, kind: 'license', salescd: s.salescd, lineId: l.id, qty: l.qty, date: d, status: st, requestedAt: d, completedAt: st === '발급완료' ? addDays(d, 1) : undefined, by: owner.name, licenseType: pick(['신규', '신규', '재발급', '임시']) });
    }
    if (l.hyboost && (l.hyboostQty ?? 0) > 0) {
      const st: FulfillRequest['status'] = done ? '출고완료' : r > 0.7 ? '요청대기' : r > 0.55 ? '출고보류' : '출고완료';
      const d = addDays(s.orderDate ?? TODAY, int(5, 25));
      fulfillRequests.push({ id: `FR-S${outSeq}`, no: `OUT-2026-${pad(outSeq++, 4)}`, kind: 'shipment', salescd: s.salescd, lineId: l.id, qty: l.hyboostQty ?? 1, date: d, status: st, requestedAt: d, completedAt: st === '출고완료' ? addDays(d, 2) : undefined, by: owner.name, purpose: pick(['판매', '판매', '데모', '무상납품']), model: l.hyboost, address: customers.find((c) => c.custcd === s.custcd)?.sites[0].roadAddress, contact: '고객 검수담당자' });
    }
  });
});

/** 통합문서함 — 계약서·견적서·발주서·보증보험·검수완료서·라이선스증서 */
export const documents: Document[] = [];
contracts.forEach((c, i) => {
  const s = sales.find((x) => x.salescd === c.salescd)!; const ym = c.signedAt.slice(2, 4) + c.signedAt.slice(5, 7);
  const add = (type: Document['type'], date: string, status: string, n: number) => documents.push({ id: `D${documents.length + 1}`, docNo: `SMS-${DOC_PREFIX[type]}-${ym}-${pad(n, 3)}`, type, salescd: c.salescd, name: `${s.name} ${type}`, version: '1', date, status, file: `SMS-${DOC_PREFIX[type]}-${ym}-${pad(n, 3)}.pdf`, by: '강민정' });
  add('계약서', c.signedAt, '계약완료', i + 1);
  add('매출견적서', addDays(c.signedAt, -7), '승인완료', i + 1);
  if (s.lines.some((l) => l.kind === '매입')) add('매입발주서', addDays(c.signedAt, 3), '발주완료', i + 1);
  if (c.amount > 100000000) add('계약이행보증보험', addDays(c.signedAt, 5), '발행완료', i + 1);
  if (s.inspection?.status === '검수완료') { add('검수완료서', s.inspection.completedAt ?? c.end, '검수완료', i + 1); add('SW 라이선스증서', s.inspection.completedAt ?? c.end, '발급완료', i + 1); }
  if (['SN12M', 'SN12Z'].includes(s.status)) add('원가명세서', addDays(c.signedAt, -2), '승인완료', i + 1);
});

export const visitLogs: VisitLog[] = sales.filter((s) => !s.legacy).slice(0, 30).map((s, i) => ({
  id: `V${pad(i + 1, 3)}`, salescd: s.salescd, ownerId: s.ownerId, date: `2026-${pad(int(9, 10))}-${pad(int(1, 12))}`, time: `${pad(int(9, 17))}:${pick(['00', '30'])}`,
  place: pick(['고객사 본사 회의실', '고객사 전산실', '데이터센터', '화상회의']), customerContact: customers.find((c) => c.custcd === s.custcd)?.contacts[0].name ?? '', vendorAttend: rnd() > 0.7 ? partners[int(0, 9)].name : undefined,
  text: pick(['신규 보안솔루션 도입 요구사항 협의', '경쟁제품 운영현황 및 윈백 가능성 확인', '검수기준 및 담당자 역할 확인', '예산 확정 일정 확인', 'PoC 결과 보고']), createdAt: TODAY,
}));

export const schedules: Schedule[] = sales.filter((s) => !s.legacy && ['발굴', '진행', '수주'].includes(SALES_STATUS.find((x) => x.code === s.status)!.phase)).slice(0, 24).map((s, i) => ({
  id: `SC${pad(i + 1, 3)}`, salescd: s.salescd, ownerId: s.ownerId, date: `2026-10-${pad(int(5, 24))}`, time: `${pad(int(9, 17))}:00`, kind: pick(['미팅', '제안', '통화', '데모']),
  title: pick(['고객 요구사항 확인 미팅', '제안서 수정본 전달', '견적 협의 통화', 'PoC 데모 시연', '검수 일정 협의']), memo: rnd() > 0.6 ? '회의 결과를 활동이력에 기록' : undefined, status: rnd() > 0.8 ? '완료' : '예정',
}));

export const notices: Notice[] = [
  { id: 'N-20261010', title: '10월 세금계산서 마감 안내', body: '10월 10일 10월 세금계산서 마감합니다.', date: '2026-10-10', urgent: true, author: '영업지원팀' },
  { id: 'N-20261030', title: '10월 가마감 안내', body: '10월 30일(금) 가마감은 오후 2시에 진행합니다. 가마감 실적보고를 확정 저장해 주세요.', date: '2026-10-30', urgent: false, author: '영업지원팀' },
];
export const resources: Resource[] = [
  { id: 'R-001', category: '회사 공통', title: '사업자등록증', file: '소만사_사업자등록증.pdf', date: '2026-09-01', owner: '영업지원팀' },
  { id: 'R-002', category: '회사 공통', title: '통장사본', file: '소만사_통장사본.pdf', date: '2026-09-01', owner: '영업지원팀' },
  { id: 'R-003', category: '제품 인증서', title: 'Privacy-i DLP 인증서', file: 'Privacy-i_DLP_인증서.pdf', date: '2026-09-18', owner: '제품관리자' },
  { id: 'R-004', category: '제품 인증서', title: 'WebKeeper SG 인증서', file: 'WebKeeperSG_인증서.pdf', date: '2026-09-18', owner: '제품관리자' },
  { id: 'R-005', category: '제품 인증서', title: 'HyBoost KC 인증서', file: 'HyBoost_KC_인증서.pdf', date: '2026-09-22', owner: '제품관리자' },
];

export const customerHistory: CustomerHistory[] = customers.slice(0, 8).flatMap((c, i) => [
  { id: `CH${i}a`, custcd: c.custcd, at: c.updatedAt, by: '강민정', field: '사이트.주소', before: '(구주소) 서울 강남구 역삼동 123', after: c.sites[0].roadAddress },
  { id: `CH${i}b`, custcd: c.custcd, at: c.createdAt, by: '이행스크립트', field: '(등록)', before: '', after: 'TQS 고객 마스터 승계' },
]);

export const commonCodes: CommonCode[] = [
  ...SALES_STATUS.map((s, i) => ({ group: 'SALES_STATUS', groupName: '영업상태', code: s.code, name: `${s.name} (${s.phase})`, order: i + 1, active: true })),
  ...(Object.keys(SALES_TYPE_LABEL) as SalesType[]).map((c, i) => ({ group: 'CONTRACT_TYPE', groupName: '계약구분', code: c, name: SALES_TYPE_LABEL[c], order: i + 1, active: true })),
  ...['신규', '증설', '고도화', '교차판매', '윈백_신규', '윈백_증설', '윈백_교차판매', '재계약', '기타'].map((r, i) => ({ group: 'RELATION', groupName: '도입관계', code: `REL${pad(i + 1)}`, name: r, order: i + 1, active: true })),
  ...[10, 30, 50, 70, 90, 100].map((p, i) => ({ group: 'PROBABILITY', groupName: '수주확도', code: String(p), name: `${p}%`, order: i + 1, active: true })),
  { group: 'CUST_CATEGORY', groupName: '고객 대분류', code: 'CRM07', name: '중요', order: 1, active: true },
  { group: 'CUST_CATEGORY', groupName: '고객 대분류', code: 'CRM08', name: '핵심', order: 2, active: true },
  ...['기업', '공공', '금융', '교육', '의료'].map((n, i) => ({ group: 'CUST_SUB', groupName: '고객 소분류', code: `SUB0${i + 1}`, name: n, order: i + 1, active: true })),
  ...['TBREQ', 'TBRED', 'TBOK', 'TBPDG', 'TBSTP', 'TBRRE'].map((c, i) => ({ group: 'TAX_STATUS', groupName: '세금계산서 상태', code: c, name: ['요청', '대기', '완료', 'Pending', '미수', '재요청'][i], order: i + 1, active: true })),
  ...hyboostModels.map((m, i) => ({ group: 'HYBOOST', groupName: 'HyBoost 모델', code: `HB${pad(i + 1)}`, name: m, order: i + 1, active: true })),
  ...['매출', '매입', '내부원가', '서비스', '매출·매입'].map((k, i) => ({ group: 'LINE_KIND', groupName: '제품라인 구분', code: `LK${i + 1}`, name: k, order: i + 1, active: true })),
];

export const auditLogs: AuditLog[] = Array.from({ length: 40 }, (_, i) => {
  const u = pick(users); const action = pick(['로그인', '조회', '등록', '수정', '상태변경', '다운로드', '개인정보열람', '승인'] as AuditLog['action'][]); const s = pick(sales);
  return { id: `AL${pad(1000 - i, 4)}`, at: `2026-10-${pad(12 - Math.floor(i / 4))} ${pad(int(8, 19))}:${pad(int(0, 59))}:${pad(int(0, 59))}`, userId: u.id, userName: u.name, action, target: action === '로그인' ? '-' : action === '개인정보열람' ? `고객담당자 ${s.custcd}` : s.salescd, detail: action === '상태변경' ? '영업중 → 수주' : action === '다운로드' ? '영업 건 목록 Excel' : action === '개인정보열람' ? '연락처 마스킹 해제' : action === '승인' ? '서티 승인' : '-', ip: `10.20.${int(1, 30)}.${int(2, 250)}` };
});

export const tqsRecon: TqsReconException[] = ([
  ['C01003', '사업자번호', '123-45-67890', '123-45-67891'], ['C01005', '고객사명', '미래산업', '미래산업(주)'], ['C01008', '법인구분', '법인', '개인사업자'], ['C01011', '소분류', '금융', '기업'],
  ['C01014', '대분류', 'CRM08', 'CRM07'], ['C01017', '고객사명', '바다물류', '바다물류주식회사'], ['C01020', '사업자번호', '456-78-90123', '(없음)'], ['C01022', '계열', '(없음)', '성실그룹'],
] as const).map(([custcd, field, nv, tv], i) => ({ id: `RX${pad(i + 1, 3)}`, custcd, customerName: customers.find((c) => c.custcd === custcd)?.name ?? custcd, field, newSystemValue: nv, tqsValue: tv, detectedAt: i < 3 ? '2026-10-12 06:00' : '2026-10-11 06:00', status: (i > 5 ? 'accepted_tqs' : 'open') as TqsReconException['status'], decidedBy: i > 5 ? '강민정' : undefined, decidedAt: i > 5 ? '2026-10-11 10:12' : undefined }));

export const goldmineAliases: GoldmineAlias[] = ([
  ['한빛전자(주)', 180, 'C01001', 98, 'mapped'], ['한빛전자 본사', 42, 'C01001', 95, 'mapped'], ['대한생명', 96, 'C01002', 90, 'mapped'], ['서울중앙병원 전산실', 33, 'C01003', 92, 'mapped'],
  ['교육정보원', 58, 'C01004', 72, 'candidate'], ['미래산업 판교', 27, 'C01005', 80, 'candidate'], ['나라은행 IT', 64, 'C01006', 88, 'mapped'], ['경기도청', 39, 'C01007', 99, 'mapped'],
  ['푸른대', 21, 'C01008', 65, 'candidate'], ['동해화학 여수공장', 18, 'C01009', 70, 'candidate'], ['(테스트)', 12, undefined, 0, 'unmapped'], ['고객사 미상', 30, undefined, 0, 'unmapped'],
  ['국민카드', 74, 'C01011', 97, 'mapped'], ['부산시', 26, 'C01012', 60, 'candidate'], ['하늘항공 IT센터', 15, 'C01013', 85, 'mapped'], ['새벽증권', 44, 'C01014', 93, 'mapped'],
  ['ABC상사', 9, undefined, 0, 'unmapped'], ['남부발전(주)', 31, 'C01016', 96, 'mapped'],
] as const).map(([alias, cnt, custcd, conf, status], i) => ({ id: `GA${pad(i + 1, 3)}`, aliasName: alias, issueCount: cnt, custcd: custcd as string | undefined, confidence: conf, status: status as GoldmineAlias['status'] }));
