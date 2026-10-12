/**
 * API 계층 — 화면은 이 모듈만 호출한다.
 * 프로토타입: 인메모리 스토어. 실제 구현: 각 함수 본문을 fetch('/api/v1/...')로 교체.
 * 권한(데이터 범위)·업무 규칙은 서버가 수행해야 하지만, 프로토타입에서는 여기서 흉내 낸다.
 */
import { getDB, mutate, nowStamp, today, uid, addDays } from './store';
import type {
  Activity, AuditLog, Contract, ContractParty, Customer, DashboardPrefs, Document, DocType, FulfillRequest, GoldmineAlias, Receivable, ReceivableStatus,
  SalesLine, SalesOpportunity, SalesStatus, Schedule, TqsReconException, User, VisitLog, ReportSnapshot,
} from '@/types';
import { statusDef, DOC_PREFIX, CREDIT_GRADES, PARENT_REQUIRED_RELATIONS } from '@/types';

/* ---------- 세션 / 권한 ---------- */
export function currentUser(): User {
  const db = getDB();
  return db.users.find((u) => u.id === db.session.userId) ?? db.users[0];
}
export function switchUser(userId: string) {
  mutate((d) => {
    d.session.userId = userId;
    const u = d.users.find((x) => x.id === userId)!;
    d.auditLogs.unshift(audit(u, '로그인', '-', `역할 전환 시연 (${u.role})`));
  });
}
function audit(u: User, action: AuditLog['action'], target: string, detail: string): AuditLog {
  return { id: uid('AL'), at: nowStamp(), userId: u.id, userName: u.name, action, target, detail, ip: '10.20.1.15' };
}
export function logAudit(action: AuditLog['action'], target: string, detail: string) {
  mutate((d) => { const u = d.users.find((x) => x.id === d.session.userId)!; d.auditLogs.unshift(audit(u, action, target, detail)); });
}

/** 데이터 범위 규칙: 영업담당자=본인 팀, 팀장=본인 팀, 그 외=전체 */
export function visibleSales(user: User, all: SalesOpportunity[]): SalesOpportunity[] {
  if (user.role === 'sales' || user.role === 'team_lead') return all.filter((s) => s.teamId === user.teamId);
  return all;
}
export const can = {
  editSales: (u: User) => ['sales', 'team_lead', 'sales_support', 'admin'].includes(u.role),
  readContractFile: (u: User) => ['sales_support', 'finance', 'ma', 'admin', 'exec', 'team_lead'].includes(u.role),
  editMaster: (u: User) => ['sales_support', 'admin'].includes(u.role),
  admin: (u: User) => u.role === 'admin',
  reconDecide: (u: User) => ['sales_support', 'admin'].includes(u.role),
  unmaskPII: (u: User) => ['sales', 'team_lead', 'sales_support', 'admin'].includes(u.role),
  approveCert: (u: User) => ['team_lead', 'exec', 'sales_support', 'admin'].includes(u.role), // 서티 승인권자
  fulfill: (u: User) => ['sales_support', 'admin'].includes(u.role), // 발급·출고 처리
  receivable: (u: User) => ['sales_support', 'finance', 'admin', 'exec'].includes(u.role),
  approvePartner: (u: User) => ['sales_support', 'finance', 'admin', 'exec'].includes(u.role),
};

/* ---------- 영업 건 ---------- */
export const lineTotals = (lines: SalesLine[]) => {
  const sales = lines.reduce((a, l) => a + (l.sales || 0), 0);
  const buy = lines.reduce((a, l) => a + (l.buy || 0), 0);
  return { sales, buy, profit: sales - buy, margin: sales ? Math.round(((sales - buy) / sales) * 1000) / 10 : 0 };
};

/** 프로젝트코드 채번 — 당해연도 + 5자리 순번 (V2.4) */
export function nextSalescd(): string {
  const year = today().slice(0, 4);
  const max = getDB().sales.reduce((m, s) => { const mm = new RegExp(`^${year}-(\\d{5})$`).exec(s.salescd); return mm ? Math.max(m, Number(mm[1])) : m; }, 0);
  return `${year}-${String(max + 1).padStart(5, '0')}`;
}

export type NewSalesInput = Pick<SalesOpportunity, 'custcd' | 'name' | 'salesType' | 'status' | 'probability' | 'forecastYm' | 'forecastDate' | 'teamId' | 'ownerId' | 'relation' | 'lines'> &
  Partial<Pick<SalesOpportunity, 'tqsProjectCode' | 'partnerId' | 'partyName' | 'partyId' | 'memo' | 'taxStatus' | 'parentSalescd' | 'competitor'>>;

export function createSales(input: NewSalesInput): string {
  const salescd = nextSalescd();
  const u = currentUser();
  if (PARENT_REQUIRED_RELATIONS.includes(input.relation) && !input.parentSalescd) throw new Error('증설·고도화·재계약은 본사업을 선택해야 합니다.');
  mutate((d) => {
    d.sales.unshift({
      ...input, salescd, taxStatus: input.taxStatus ?? 'NONE', attachments: [], activities: [],
      history: [{ id: uid('H'), at: nowStamp(), by: u.name, kind: '등록', text: '영업 건 등록' }, { id: uid('H'), at: nowStamp(), by: '시스템', kind: '서티', text: '서티 자동 상신 (승인권자: 팀장·사업부장·부본부장·본부장·영업지원관리자)' }],
      cert: { status: '승인대기', submittedAt: today() }, // 프로젝트 생성 시 자동 상신
      crossCheckWarnings: crossCheck(input.lines, input.partnerId), createdAt: today(), updatedAt: today(),
    });
    d.auditLogs.unshift(audit(u, '등록', salescd, input.name));
  });
  return salescd;
}

export function updateSales(salescd: string, patch: Partial<SalesOpportunity>) {
  const u = currentUser();
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd); if (!s) return;
    Object.assign(s, patch, { updatedAt: today() });
    s.crossCheckWarnings = crossCheck(s.lines, s.partnerId);
    s.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '수정', text: `수정: ${Object.keys(patch).join(', ')}` });
    d.auditLogs.unshift(audit(u, '수정', salescd, Object.keys(patch).join(', ')));
  });
}

/** 서티 승인/반려 */
export function decideCert(salescd: string, decision: '승인완료' | '반려', reason?: string) {
  const u = currentUser();
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd); if (!s) return;
    s.cert = { ...s.cert, status: decision, approver: u.name, decidedAt: today(), reason };
    s.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '서티', text: `서티 ${decision}${reason ? ' — ' + reason : ''}` });
    d.auditLogs.unshift(audit(u, '승인', salescd, `서티 ${decision}`));
  });
}

/** 상태 전이 — 허용 전이만 통과. 서티 미승인 시 수주 전이 차단, 원가명세서·견적서 미첨부는 경고 */
export function transitionSales(salescd: string, to: SalesStatus): { ok: boolean; warnings: string[] } {
  const s = getDB().sales.find((x) => x.salescd === salescd);
  if (!s) return { ok: false, warnings: ['영업 건 없음'] };
  const def = statusDef(s.status);
  if (!def.next.includes(to)) return { ok: false, warnings: [`${def.name} → ${statusDef(to).name} 전이는 허용되지 않습니다.`] };
  if (to === 'SN05Z' && s.cert.status !== '승인완료') return { ok: false, warnings: ['서티 승인완료 전에는 수주로 전이할 수 없습니다.'] };
  if (to === 'SN10Z' && s.inspection?.status !== '검수완료') return { ok: false, warnings: ['검수완료 처리(검수일·검수완료서)가 먼저 필요합니다.'] };
  const warnings: string[] = [];
  if (to === 'SN05Z' && !s.attachments.some((a) => a.type === '원가명세서') && !getDB().documents.some((x) => x.salescd === salescd && x.type === '원가명세서')) warnings.push('원가명세서가 없습니다 (교차검토 경고 — 1차는 경고만 기록).');
  if (to === 'SN05Z' && !s.attachments.some((a) => a.type === '매출견적서')) warnings.push('매출견적서 첨부가 없습니다.');
  const u = currentUser();
  mutate((d) => {
    const t = d.sales.find((x) => x.salescd === salescd)!;
    t.status = to;
    if (to === 'SN05Z') { if (!t.orderDate) t.orderDate = today(); t.probability = 100; if (!t.inspection) t.inspection = { status: '검수대기' }; }
    if (to === 'SN09Z' && t.inspection) t.inspection.status = '검수중';
    if (to === 'SN14Z') t.probability = 10;
    t.updatedAt = today();
    t.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '상태', text: `상태 변경 ${def.name} → ${statusDef(to).name}${warnings.length ? ' (경고 ' + warnings.length + '건)' : ''}` });
    d.auditLogs.unshift(audit(u, '상태변경', salescd, `${def.name} → ${statusDef(to).name}`));
  });
  return { ok: true, warnings };
}

/** 검수완료 처리 — 검수일·검수완료서 파일명 필수 */
export function completeInspection(salescd: string, completedAt: string, file: string) {
  const u = currentUser();
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd); if (!s) return;
    s.inspection = { status: '검수완료', completedAt, file };
    const docNo = nextDocNo(d.documents, '검수완료서', completedAt);
    d.documents.unshift({ id: uid('D'), docNo, type: '검수완료서', salescd, name: `${s.name} 검수완료서`, version: '1', date: completedAt, status: '검수완료', file, by: u.name });
    s.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '수정', text: `검수완료 (${completedAt}) · ${docNo}` });
  });
}

export function addActivity(salescd: string, a: Omit<Activity, 'id' | 'at' | 'by'>) {
  const u = currentUser();
  mutate((d) => { d.sales.find((x) => x.salescd === salescd)?.activities.unshift({ id: uid('AC'), at: nowStamp(), by: u.name, ...a }); });
}

export function upsertLine(salescd: string, line: SalesLine) {
  const u = currentUser();
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd); if (!s) return;
    const i = s.lines.findIndex((l) => l.id === line.id);
    if (i >= 0) s.lines[i] = line; else s.lines.push(line);
    s.crossCheckWarnings = crossCheck(s.lines, s.partnerId);
    s.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '라인', text: `제품라인 ${i >= 0 ? '수정' : '추가'}: ${line.product} / ${line.sub}` });
  });
}
export function removeLine(salescd: string, lineId: string) {
  mutate((d) => { const s = d.sales.find((x) => x.salescd === salescd); if (s) s.lines = s.lines.filter((l) => l.id !== lineId); });
}
export function addAttachment(salescd: string, name: string, type: DocType) {
  const u = currentUser();
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd); if (!s) return;
    const docNo = nextDocNo(d.documents, type, today());
    s.attachments.unshift({ id: uid('A'), name, type, size: 0, uploadedAt: today(), by: u.name, docNo });
    d.documents.unshift({ id: uid('D'), docNo, type, salescd, name: `${s.name} ${type}`, version: String(d.documents.filter((x) => x.salescd === salescd && x.type === type).length + 1), date: today(), status: '등록', file: name, by: u.name });
    s.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '첨부', text: `첨부 추가: ${name} (${docNo})` });
  });
}

function crossCheck(lines: SalesLine[], partnerId?: string): string[] | undefined {
  const w: string[] = [];
  if (partnerId && !lines.some((l) => l.kind === '매입')) w.push('파트너 경유 건이나 매입(수수료) 라인이 없습니다 (C-1 경고)');
  const t = lineTotals(lines);
  if (t.sales > 0 && t.margin < 10) w.push(`이익률 ${t.margin}% — 기준(10%) 미만 (C-1 경고)`);
  if (lines.some((l) => l.hyboost && !(l.hyboostQty && l.hyboostQty > 0))) w.push('HyBoost 모델이 지정된 라인에 HyBoost 수량이 없습니다');
  return w.length ? w : undefined;
}

/* ---------- 통합문서함 ---------- */
export function nextDocNo(docs: Document[], type: DocType, date: string): string {
  const ym = date.slice(2, 4) + date.slice(5, 7); const prefix = `SMS-${DOC_PREFIX[type]}-${ym}-`;
  const n = docs.filter((x) => x.docNo.startsWith(prefix)).length + 1;
  return `${prefix}${String(n).padStart(3, '0')}`;
}
export function registerDocument(input: { type: DocType; salescd: string; name: string; file: string; date: string; status?: string }) {
  const u = currentUser();
  mutate((d) => {
    const docNo = nextDocNo(d.documents, input.type, input.date);
    d.documents.unshift({ id: uid('D'), docNo, type: input.type, salescd: input.salescd, name: input.name, version: String(d.documents.filter((x) => x.salescd === input.salescd && x.type === input.type).length + 1), date: input.date, status: input.status ?? '등록', file: input.file, by: u.name });
    d.auditLogs.unshift(audit(u, '등록', docNo, input.name));
  });
}

/* ---------- 고객사 / 계약처 ---------- */
export function upsertCustomer(c: Customer) {
  const u = currentUser();
  mutate((d) => {
    const i = d.customers.findIndex((x) => x.custcd === c.custcd);
    if (i >= 0) {
      const before = d.customers[i];
      (['name', 'bizNo', 'category', 'subCategory', 'group'] as const).forEach((f) => { if (before[f] !== c[f]) d.customerHistory.unshift({ id: uid('CH'), custcd: c.custcd, at: nowStamp(), by: u.name, field: f, before: String(before[f] ?? ''), after: String(c[f] ?? '') }); });
      d.customers[i] = { ...c, updatedAt: today() };
      d.auditLogs.unshift(audit(u, '수정', c.custcd, c.name));
    } else {
      d.customers.unshift({ ...c, approval: can.editMaster(u) ? '승인완료' : '승인대기', createdAt: today(), updatedAt: today() });
      d.customerHistory.unshift({ id: uid('CH'), custcd: c.custcd, at: nowStamp(), by: u.name, field: '(등록)', before: '', after: can.editMaster(u) ? '신규 등록' : '등록 신청 (승인함 대기)' });
      d.auditLogs.unshift(audit(u, '등록', c.custcd, c.name));
    }
  });
}
export function approveCustomer(custcd: string, decision: '승인완료' | '반려') {
  const u = currentUser();
  mutate((d) => { const c = d.customers.find((x) => x.custcd === custcd); if (c) { c.approval = decision; d.auditLogs.unshift(audit(u, '승인', custcd, `고객사 등록 ${decision}`)); } });
}
export function nextCustcd(): string {
  const max = getDB().customers.reduce((m, c) => Math.max(m, Number(c.custcd.slice(1))), 0);
  return `C${String(max + 1).padStart(5, '0')}`;
}
export function findDuplicateSites(buildingCode: string, exceptCustcd?: string) {
  return getDB().customers.flatMap((c) => c.sites.filter((s) => s.buildingCode === buildingCode && c.custcd !== exceptCustcd).map((s) => ({ customer: c, site: s })));
}
/** 거래처(계약처) 등재기안 — 계약 등록 단계에서 시작 (V2.4) */
export function requestContractParty(input: { name: string; bizNo: string; creditRating?: string; direct: boolean; linkedSalescd?: string }): string {
  const u = currentUser();
  const id = `CP${String(getDB().contractParties.length + 300).padStart(3, '0')}`;
  mutate((d) => { d.contractParties.unshift({ id, ...input, status: '등재기안', requestedBy: u.name, requestedAt: today() }); d.auditLogs.unshift(audit(u, '등록', id, `거래처 등재기안 ${input.name}`)); });
  return id;
}
export function decideContractParty(id: string, decision: '등재' | '반려') {
  const u = currentUser();
  mutate((d) => { const p = d.contractParties.find((x) => x.id === id); if (p) { p.status = decision; p.approvedAt = today(); d.auditLogs.unshift(audit(u, '승인', id, `거래처 ${decision}`)); } });
}

/* ---------- 계약 ---------- */
export function upsertContract(c: Contract) {
  const u = currentUser();
  mutate((d) => {
    const i = d.contracts.findIndex((x) => x.id === c.id);
    if (i >= 0) d.contracts[i] = c; else d.contracts.unshift(c);
    const s = d.sales.find((x) => x.salescd === c.salescd);
    if (s) { s.contractId = c.id; if (c.party) s.partyName = c.party; if (c.partyId) s.partyId = c.partyId; }
    d.auditLogs.unshift(audit(u, i >= 0 ? '수정' : '등록', c.id, c.name));
  });
}
export function nextContractId(): string { return `CT-2026-${String(getDB().contracts.length + 1).padStart(3, '0')}`; }

/* ---------- 매출채권 (V2.4 규칙) ---------- */
const gradeIndex = (g?: string) => { const i = CREDIT_GRADES.indexOf(g ?? ''); return i < 0 ? 999 : i; };
export const isLowGrade = (g?: string) => gradeIndex(g) >= gradeIndex('B+');
export const isSuitableGrade = (g?: string) => gradeIndex(g) <= gradeIndex('BB-');
const minDate = (a?: string, b?: string) => (!a ? b : !b ? a : a < b ? a : b);
export const arWarningDate = (r: Receivable) => minDate(addDays(r.invoiceDate, 30), r.contractDue)!;
/** 미수 인식일 = 계약 지급일(없으면 계산서일+30) + 1 — 사람이 늦출 수 없는 시스템 계산일 */
export const arRecognitionDate = (r: Receivable) => addDays(r.contractDue ?? addDays(r.invoiceDate, 30), 1);
export const arGraceDays = (r: Receivable) => (r.direct ? 90 : r.distress || r.approvedRegistration || isLowGrade(r.creditRating) ? 60 : 90);
export const arCollectionDate = (r: Receivable) => addDays(arRecognitionDate(r), arGraceDays(r));
export const arOutstanding = (r: Receivable) => Math.max(0, r.amount - r.paid);
export function arStatus(r: Receivable, now = today()): ReceivableStatus {
  if (!arOutstanding(r)) return '입금완료';
  if (now < arWarningDate(r)) return '정상';
  if (now < arRecognitionDate(r)) return '사전경보';
  if (r.extension?.status === '승인완료' && r.extension.until >= now) return '추심유예 승인';
  if (now >= arCollectionDate(r)) return '추심대상';
  if (r.registeredAt) return '미수채권 관리중';
  return '등재대상';
}
export function registerReceivable(id: string) {
  const u = currentUser();
  mutate((d) => { const r = d.receivables.find((x) => x.id === id); if (r && !r.registeredAt) { r.registeredAt = today(); d.auditLogs.unshift(audit(u, '등록', id, '미수채권 등재')); } });
}
export function recordPayment(id: string, amount: number) {
  const u = currentUser();
  mutate((d) => {
    const r = d.receivables.find((x) => x.id === id); if (!r) return;
    r.paid = Math.min(r.amount, r.paid + amount);
    const s = d.sales.find((x) => x.salescd === r.salescd);
    if (s && r.paid >= r.amount && s.status === 'SN12M') { s.status = 'SN12Z'; s.history.unshift({ id: uid('H'), at: nowStamp(), by: '시스템', kind: '상태', text: '입금 완료 → 완료(수금) 자동 전환' }); }
    d.auditLogs.unshift(audit(u, '등록', id, `입금 ${amount.toLocaleString()}원`));
  });
}
export function requestExtension(id: string, until: string, reason: string) {
  mutate((d) => { const r = d.receivables.find((x) => x.id === id); if (r) r.extension = { status: '요청', until, reason, requestedAt: today() }; });
}
export function decideExtension(id: string, decision: '승인완료' | '반려') {
  const u = currentUser();
  mutate((d) => { const r = d.receivables.find((x) => x.id === id); if (r?.extension) { r.extension.status = decision; r.extension.decidedAt = today(); d.auditLogs.unshift(audit(u, '승인', id, `추심유예 ${decision}`)); } });
}
export function createReceivable(input: Omit<Receivable, 'id'>) {
  mutate((d) => { d.receivables.unshift({ ...input, id: `AR-2026-${String(d.receivables.length + 1).padStart(3, '0')}` }); });
}

/* ---------- 라이선스 발급 · HyBoost 출고 ---------- */
export function remainingQty(kind: 'license' | 'shipment', s: SalesOpportunity, line: SalesLine): number {
  const total = kind === 'license' ? line.qty : (line.hyboostQty ?? 0);
  const used = getDB().fulfillRequests.filter((r) => r.kind === kind && r.lineId === line.id && r.salescd === s.salescd && !/보류/.test(r.status)).reduce((a, r) => a + r.qty, 0);
  return Math.max(0, total - used);
}
export function createFulfillRequest(input: Omit<FulfillRequest, 'id' | 'no' | 'status' | 'requestedAt' | 'by'>): { ok: boolean; message?: string } {
  const db = getDB(); const s = db.sales.find((x) => x.salescd === input.salescd); const line = s?.lines.find((l) => l.id === input.lineId);
  if (!s || !line) return { ok: false, message: '제품라인을 찾을 수 없습니다.' };
  if (!['수주', '이행', '종결'].includes(statusDef(s.status).phase)) return { ok: false, message: '수주 이후 상태에서만 요청할 수 있습니다.' };
  if (db.fulfillRequests.some((r) => r.kind === input.kind && r.lineId === input.lineId && r.status === '요청대기')) return { ok: false, message: '해당 제품라인에 처리 대기 중인 요청이 있습니다.' };
  const remain = remainingQty(input.kind, s, line);
  if (!Number.isInteger(input.qty) || input.qty < 1 || input.qty > remain) return { ok: false, message: `수량은 1 이상 남은 수량(${remain}) 이하여야 합니다.` };
  if (input.kind === 'shipment' && input.purpose === '데모' && !(input.demoDays && input.demoDays > 0)) return { ok: false, message: '데모 출고는 운용 기간(일)을 입력해 주세요.' };
  if (input.kind === 'shipment' && input.purpose === '무상납품' && !input.reason) return { ok: false, message: '무상납품은 출고 사유를 입력해 주세요.' };
  const u = currentUser();
  mutate((d) => {
    const seq = d.fulfillRequests.filter((r) => r.kind === input.kind).length + 1;
    const no = `${input.kind === 'license' ? 'LIC' : 'OUT'}-2026-${String(seq).padStart(4, '0')}`;
    d.fulfillRequests.unshift({ ...input, id: uid('FR'), no, status: '요청대기', requestedAt: today(), by: u.name });
    d.sales.find((x) => x.salescd === input.salescd)?.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: input.kind === 'license' ? '발급' : '출고', text: `${input.kind === 'license' ? '라이선스 발급' : 'HyBoost 출고'} 요청 ${no} · ${input.qty}` });
  });
  return { ok: true };
}
export function decideFulfill(id: string, status: FulfillRequest['status']) {
  const u = currentUser();
  mutate((d) => {
    const r = d.fulfillRequests.find((x) => x.id === id); if (!r) return;
    r.status = status; if (/완료/.test(status)) r.completedAt = today();
    const s = d.sales.find((x) => x.salescd === r.salescd);
    s?.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: r.kind === 'license' ? '발급' : '출고', text: `${r.no} ${status}` });
    if (/완료/.test(status) && s && r.kind === 'license') { const docNo = nextDocNo(d.documents, 'SW 라이선스증서', today()); d.documents.unshift({ id: uid('D'), docNo, type: 'SW 라이선스증서', salescd: s.salescd, name: `${s.name} SW 라이선스증서`, version: '1', date: today(), status: '발급완료', file: `${docNo}.pdf`, by: u.name }); }
    d.auditLogs.unshift(audit(u, '승인', r.no, status));
  });
}

/* ---------- 직출 · 일정 ---------- */
export function addVisit(v: Omit<VisitLog, 'id' | 'createdAt' | 'ownerId'>) {
  const u = currentUser();
  mutate((d) => { d.visitLogs.unshift({ ...v, id: uid('V'), ownerId: u.id, createdAt: nowStamp() }); d.sales.find((x) => x.salescd === v.salescd)?.activities.unshift({ id: uid('AC'), at: `${v.date} ${v.time}`, by: u.name, kind: '방문', text: `[직출] ${v.place} · ${v.text}` }); });
}
export function upsertSchedule(s: Omit<Schedule, 'id' | 'ownerId'> & { id?: string }) {
  const u = currentUser();
  mutate((d) => { const i = s.id ? d.schedules.findIndex((x) => x.id === s.id) : -1; if (i >= 0) d.schedules[i] = { ...d.schedules[i], ...s, id: s.id! }; else d.schedules.unshift({ ...s, id: uid('SC'), ownerId: u.id }); });
}
export function setScheduleStatus(id: string, status: Schedule['status']) { mutate((d) => { const s = d.schedules.find((x) => x.id === id); if (s) s.status = status; }); }

/* ---------- 대시보드 설정 ---------- */
export function saveDashboard(p: Partial<DashboardPrefs>) { mutate((d) => { d.dashboard = { ...d.dashboard, ...p }; }); }

/* ---------- 내부보고 스냅샷 ---------- */
export function saveReportSnapshot(snap: ReportSnapshot) {
  mutate((d) => { d.reportSnapshots = d.reportSnapshots.filter((x) => !(x.month === snap.month && x.kind === snap.kind)); d.reportSnapshots.unshift(snap); });
}

/* ---------- 공유 구조 ---------- */
export function decideRecon(id: string, decision: TqsReconException['status']) {
  const u = currentUser();
  mutate((d) => {
    const r = d.tqsRecon.find((x) => x.id === id); if (!r) return;
    r.status = decision; r.decidedBy = u.name; r.decidedAt = nowStamp();
    if (decision === 'accepted_tqs') { const c = d.customers.find((x) => x.custcd === r.custcd); if (c && r.field === '고객사명') c.name = r.tqsValue; if (c && r.field === '사업자번호') c.bizNo = r.tqsValue; }
    d.auditLogs.unshift(audit(u, '수정', r.custcd, `TQS 대사 예외 판정: ${decision}`));
  });
}
export function mapAlias(id: string, custcd: string | undefined, status: GoldmineAlias['status']) {
  mutate((d) => { const a = d.goldmineAliases.find((x) => x.id === id); if (a) { a.custcd = custcd; a.status = status; if (status === 'mapped') a.confidence = 100; } });
}

/* ---------- 관리자 ---------- */
export function upsertUser(u: User) { mutate((d) => { const i = d.users.findIndex((x) => x.id === u.id); if (i >= 0) d.users[i] = u; else d.users.push(u); }); }
export function toggleCode(group: string, code: string) { mutate((d) => { const c = d.commonCodes.find((x) => x.group === group && x.code === code); if (c) c.active = !c.active; }); }
export function addCode(group: string, groupName: string, code: string, name: string) { mutate((d) => { d.commonCodes.push({ group, groupName, code, name, order: d.commonCodes.filter((x) => x.group === group).length + 1, active: true }); }); }
export type { ContractParty };
