/**
 * 인메모리 데이터 스토어 + 구독.
 * - 프로토타입 단계에서는 브라우저 메모리(+localStorage)에 저장.
 * - 실제 구현 시 이 파일의 mutate/select 대신 Django REST 호출로 교체한다 (src/api/index.ts의 시그니처 유지).
 */
import { useSyncExternalStore } from 'react';
import * as seed from '@/data/seed';
import type {
  AuditLog, CommonCode, Contract, ContractParty, Customer, CustomerHistory, DashboardPrefs, Document, FulfillRequest, GoldmineAlias, Notice, Partner,
  ProductItem, Receivable, ReportSnapshot, Resource, SalesOpportunity, Schedule, Team, TqsReconException, User, VisitLog,
} from '@/types';

export interface DB {
  teams: Team[];
  users: User[];
  customers: Customer[];
  customerHistory: CustomerHistory[];
  partners: Partner[];
  contractParties: ContractParty[];
  productItems: ProductItem[];
  hyboostModels: string[];
  sales: SalesOpportunity[];
  contracts: Contract[];
  receivables: Receivable[];
  fulfillRequests: FulfillRequest[];
  documents: Document[];
  visitLogs: VisitLog[];
  schedules: Schedule[];
  notices: Notice[];
  resources: Resource[];
  reportSnapshots: ReportSnapshot[];
  dashboard: DashboardPrefs;
  commonCodes: CommonCode[];
  auditLogs: AuditLog[];
  tqsRecon: TqsReconException[];
  goldmineAliases: GoldmineAlias[];
  session: { userId: string };
}

const STORAGE_KEY = 'sales-app-2026:db:v2'; // V2.4 반영으로 스키마 변경 → 키 변경(구 데이터 자동 폐기)

function freshDB(): DB {
  return structuredClone({
    teams: seed.teams,
    users: seed.users,
    customers: seed.customers,
    customerHistory: seed.customerHistory,
    partners: seed.partners,
    contractParties: seed.contractParties,
    productItems: seed.productItems,
    hyboostModels: seed.hyboostModels,
    sales: seed.sales,
    contracts: seed.contracts,
    receivables: seed.receivables,
    fulfillRequests: seed.fulfillRequests,
    documents: seed.documents,
    visitLogs: seed.visitLogs,
    schedules: seed.schedules,
    notices: seed.notices,
    resources: seed.resources,
    reportSnapshots: [],
    dashboard: { order: ['tasks', 'favorites', 'kpis', 'notices', 'schedule', 'visits', 'pipeline', 'workflow'], visible: ['tasks', 'favorites', 'kpis', 'notices', 'schedule', 'visits', 'pipeline', 'workflow'], favorites: ['/sales', '/biz/visits', '/biz/receivables', '/biz/report', '/biz/docs', '/biz/hyboost', '/biz/license'] },
    commonCodes: seed.commonCodes,
    auditLogs: seed.auditLogs,
    tqsRecon: seed.tqsRecon,
    goldmineAliases: seed.goldmineAliases,
    session: { userId: 'U99' }, // 시연 기본 사용자: 관리자(전체 메뉴 노출). 화면 상단에서 역할 전환
  });
}

function load(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* localStorage 미지원/차단 환경 — 메모리로만 동작 */
  }
  return freshDB();
}

let db: DB = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

export function getDB(): DB {
  return db;
}

/** 변경은 항상 새 객체로 교체(불변) → useSyncExternalStore가 변경을 감지 */
export function mutate(fn: (draft: DB) => void) {
  const next = structuredClone(db);
  fn(next);
  db = next;
  persist();
  listeners.forEach((l) => l());
}

export function resetDB() {
  db = freshDB();
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** React 훅 — 셀렉터 결과를 구독 */
export function useDB<T>(selector: (db: DB) => T): T {
  // 스냅샷은 DB 루트 객체(불변)로 고정 — 셀렉터가 새 배열을 반환해도 무한 재렌더가 발생하지 않는다.
  const snapshot = useSyncExternalStore(subscribe, getDB, getDB);
  return selector(snapshot);
}

export const nowStamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const today = () => nowStamp().slice(0, 10);
export const addDays = (date: string, n: number) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
