/**
 * API 계층 — 화면은 이 모듈만 호출한다.
 * 프로토타입: 인메모리 스토어. 실제 구현: 각 함수 본문을 fetch('/api/v1/...')로 교체.
 * 권한(데이터 범위) 검사는 서버가 수행해야 하지만, 프로토타입에서는 여기서 흉내 낸다.
 */
import { getDB, mutate, nowStamp, today, uid } from './store';
import type {
  Activity, AuditLog, Contract, Customer, GoldmineAlias, SalesLine, SalesOpportunity, SalesStatus, TqsReconException, User,
} from '@/types';
import { statusDef } from '@/types';

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
  mutate((d) => {
    const u = d.users.find((x) => x.id === d.session.userId)!;
    d.auditLogs.unshift(audit(u, action, target, detail));
  });
}

/** 데이터 범위 규칙: 영업=본인 팀, 영업지원/재무/MA/경영진/관리자=전체 */
export function visibleSales(user: User, all: SalesOpportunity[]): SalesOpportunity[] {
  if (user.role === 'sales') return all.filter((s) => s.teamId === user.teamId);
  return all;
}
export const can = {
  editSales: (u: User) => ['sales', 'sales_support', 'admin'].includes(u.role),
  readContractFile: (u: User) => ['sales_support', 'finance', 'ma', 'admin', 'exec'].includes(u.role),
  editMaster: (u: User) => ['sales_support', 'admin'].includes(u.role),
  admin: (u: User) => u.role === 'admin',
  reconDecide: (u: User) => ['sales_support', 'admin'].includes(u.role),
  unmaskPII: (u: User) => ['sales', 'sales_support', 'admin'].includes(u.role),
};

/* ---------- 영업 건 ---------- */
export const lineTotals = (lines: SalesLine[]) => {
  const sales = lines.reduce((a, l) => a + l.sales, 0);
  const buy = lines.reduce((a, l) => a + l.buy, 0);
  return { sales, buy, profit: sales - buy, margin: sales ? Math.round(((sales - buy) / sales) * 1000) / 10 : 0 };
};

export type NewSalesInput = Pick<SalesOpportunity, 'custcd' | 'name' | 'salesType' | 'status' | 'probability' | 'forecastYm' | 'forecastDate' | 'teamId' | 'ownerId' | 'relation' | 'lines'> &
  Partial<Pick<SalesOpportunity, 'tqsProjectCode' | 'partnerId' | 'partyName' | 'memo' | 'taxStatus'>>;

export function createSales(input: NewSalesInput): string {
  const db = getDB();
  const seq = db.sales.filter((s) => s.salescd.startsWith('SO-2026-')).length + 1;
  const salescd = `SO-2026-${String(seq).padStart(4, '0')}`;
  const u = currentUser();
  mutate((d) => {
    d.sales.unshift({
      ...input,
      salescd,
      taxStatus: input.taxStatus ?? 'NONE',
      attachments: [],
      activities: [],
      history: [{ id: uid('H'), at: nowStamp(), by: u.name, kind: '등록', text: '영업 건 등록' }],
      crossCheckWarnings: crossCheck(input.lines, input.partnerId),
      createdAt: today(),
      updatedAt: today(),
    });
    d.auditLogs.unshift(audit(u, '등록', salescd, input.name));
  });
  return salescd;
}

export function updateSales(salescd: string, patch: Partial<SalesOpportunity>) {
  const u = currentUser();
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd);
    if (!s) return;
    Object.assign(s, patch, { updatedAt: today() });
    s.crossCheckWarnings = crossCheck(s.lines, s.partnerId);
    s.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '수정', text: `수정: ${Object.keys(patch).join(', ')}` });
    d.auditLogs.unshift(audit(u, '수정', salescd, Object.keys(patch).join(', ')));
  });
}

/** 상태 전이 — 허용 전이만 통과, 원가명세서(첨부) 없이 수주 전이 시 경고(1차는 차단 대신 경고) */
export function transitionSales(salescd: string, to: SalesStatus): { ok: boolean; warnings: string[] } {
  const s = getDB().sales.find((x) => x.salescd === salescd);
  if (!s) return { ok: false, warnings: ['영업 건 없음'] };
  const def = statusDef(s.status);
  if (!def.next.includes(to)) return { ok: false, warnings: [`${def.name} → ${statusDef(to).name} 전이는 허용되지 않습니다.`] };
  const warnings: string[] = [];
  if (to === 'SN05Z' && !s.attachments.some((a) => a.type === '원가명세서')) warnings.push('원가명세서 첨부가 없습니다 (교차검토 경고 — 1차는 경고만 기록).');
  if (to === 'SN05Z' && !s.attachments.some((a) => a.type === '견적서')) warnings.push('견적서 첨부가 없습니다.');
  const u = currentUser();
  mutate((d) => {
    const t = d.sales.find((x) => x.salescd === salescd)!;
    t.status = to;
    if (to === 'SN05Z' && !t.orderDate) t.orderDate = today();
    if (['SN05Z', 'SN06Z'].includes(to)) t.probability = to === 'SN05Z' ? 100 : t.probability;
    if (['SN14Z', 'SN99Z'].includes(to)) t.probability = 10;
    t.updatedAt = today();
    t.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '상태', text: `상태 변경 ${def.name} → ${statusDef(to).name}${warnings.length ? ' (경고 ' + warnings.length + '건)' : ''}` });
    d.auditLogs.unshift(audit(u, '상태변경', salescd, `${def.name} → ${statusDef(to).name}`));
  });
  return { ok: true, warnings };
}

export function addActivity(salescd: string, a: Omit<Activity, 'id' | 'at' | 'by'>) {
  const u = currentUser();
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd);
    s?.activities.unshift({ id: uid('AC'), at: nowStamp(), by: u.name, ...a });
  });
}

export function upsertLine(salescd: string, line: SalesLine) {
  const u = currentUser();
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd);
    if (!s) return;
    const i = s.lines.findIndex((l) => l.id === line.id);
    if (i >= 0) s.lines[i] = line;
    else s.lines.push(line);
    s.crossCheckWarnings = crossCheck(s.lines, s.partnerId);
    s.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '라인', text: `제품 라인 ${i >= 0 ? '수정' : '추가'}: ${line.itemName}` });
  });
}
export function removeLine(salescd: string, lineId: string) {
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd);
    if (s) s.lines = s.lines.filter((l) => l.id !== lineId);
  });
}
export function addAttachment(salescd: string, name: string, type: SalesOpportunity['attachments'][number]['type']) {
  const u = currentUser();
  mutate((d) => {
    const s = d.sales.find((x) => x.salescd === salescd);
    s?.attachments.unshift({ id: uid('A'), name, type, size: 0, uploadedAt: today(), by: u.name });
    s?.history.unshift({ id: uid('H'), at: nowStamp(), by: u.name, kind: '첨부', text: `첨부 추가: ${name}` });
  });
}

function crossCheck(lines: SalesLine[], partnerId?: string): string[] | undefined {
  const w: string[] = [];
  if (partnerId && !lines.some((l) => l.kind === '매입')) w.push('파트너 경유 건이나 매입(수수료) 라인이 없습니다 (C-1 경고)');
  const t = lineTotals(lines);
  if (t.sales > 0 && t.margin < 10) w.push(`이익률 ${t.margin}% — 기준(10%) 미만 (C-1 경고)`);
  return w.length ? w : undefined;
}

/* ---------- 고객사 ---------- */
export function upsertCustomer(c: Customer) {
  const u = currentUser();
  mutate((d) => {
    const i = d.customers.findIndex((x) => x.custcd === c.custcd);
    if (i >= 0) {
      const before = d.customers[i];
      (['name', 'bizNo', 'category', 'subCategory', 'group'] as const).forEach((f) => {
        if (before[f] !== c[f]) d.customerHistory.unshift({ id: uid('CH'), custcd: c.custcd, at: nowStamp(), by: u.name, field: f, before: String(before[f] ?? ''), after: String(c[f] ?? '') });
      });
      d.customers[i] = { ...c, updatedAt: today() };
      d.auditLogs.unshift(audit(u, '수정', c.custcd, c.name));
    } else {
      d.customers.unshift({ ...c, createdAt: today(), updatedAt: today() });
      d.customerHistory.unshift({ id: uid('CH'), custcd: c.custcd, at: nowStamp(), by: u.name, field: '(등록)', before: '', after: '신규 등록 (과도기: TQS 선등록 → 수신)' });
      d.auditLogs.unshift(audit(u, '등록', c.custcd, c.name));
    }
  });
}
export function nextCustcd(): string {
  const max = getDB().customers.reduce((m, c) => Math.max(m, Number(c.custcd.slice(1))), 0);
  return `C${String(max + 1).padStart(5, '0')}`;
}
/** 건물관리번호 기준 중복 사이트 탐지 */
export function findDuplicateSites(buildingCode: string, exceptCustcd?: string) {
  return getDB().customers.flatMap((c) => c.sites.filter((s) => s.buildingCode === buildingCode && c.custcd !== exceptCustcd).map((s) => ({ customer: c, site: s })));
}

/* ---------- 계약 ---------- */
export function upsertContract(c: Contract) {
  const u = currentUser();
  mutate((d) => {
    const i = d.contracts.findIndex((x) => x.id === c.id);
    if (i >= 0) d.contracts[i] = c;
    else d.contracts.unshift(c);
    const s = d.sales.find((x) => x.salescd === c.salescd);
    if (s) s.contractId = c.id;
    d.auditLogs.unshift(audit(u, i >= 0 ? '수정' : '등록', c.id, c.name));
  });
}
export function nextContractId(): string {
  return `CT-2026-${String(getDB().contracts.length + 1).padStart(3, '0')}`;
}

/* ---------- 공유 구조 ---------- */
export function decideRecon(id: string, decision: TqsReconException['status']) {
  const u = currentUser();
  mutate((d) => {
    const r = d.tqsRecon.find((x) => x.id === id);
    if (!r) return;
    r.status = decision;
    r.decidedBy = u.name;
    r.decidedAt = nowStamp();
    if (decision === 'accepted_tqs') {
      const c = d.customers.find((x) => x.custcd === r.custcd);
      if (c && r.field === '고객사명') c.name = r.tqsValue;
      if (c && r.field === '사업자번호') c.bizNo = r.tqsValue;
    }
    d.auditLogs.unshift(audit(u, '수정', r.custcd, `TQS 대사 예외 판정: ${decision}`));
  });
}
export function mapAlias(id: string, custcd: string | undefined, status: GoldmineAlias['status']) {
  mutate((d) => {
    const a = d.goldmineAliases.find((x) => x.id === id);
    if (a) {
      a.custcd = custcd;
      a.status = status;
      if (status === 'mapped') a.confidence = 100;
    }
  });
}

/* ---------- 관리자 ---------- */
export function upsertUser(u: User) {
  mutate((d) => {
    const i = d.users.findIndex((x) => x.id === u.id);
    if (i >= 0) d.users[i] = u;
    else d.users.push(u);
  });
}
export function toggleCode(group: string, code: string) {
  mutate((d) => {
    const c = d.commonCodes.find((x) => x.group === group && x.code === code);
    if (c) c.active = !c.active;
  });
}
export function addCode(group: string, groupName: string, code: string, name: string) {
  mutate((d) => {
    d.commonCodes.push({ group, groupName, code, name, order: d.commonCodes.filter((x) => x.group === group).length + 1, active: true });
  });
}
