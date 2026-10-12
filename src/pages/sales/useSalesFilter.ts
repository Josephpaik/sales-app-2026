import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDB } from '@/api/store';
import { currentUser, visibleSales, lineTotals } from '@/api';
import { statusDef, type Phase, type SalesStatus, type SalesType, type CertStatus } from '@/types';

export interface SalesFilter {
  q: string;
  year: string;
  phases: Phase[];
  statuses: SalesStatus[];
  teamId?: string;
  ownerId?: string;
  partnerId?: string;
  group?: string; // 제품군
  product?: string;
  salesType?: SalesType; // 계약구분
  cert?: CertStatus;
  includeLegacy: boolean;
  onlyWarnings: boolean;
  wf?: string; // 대시보드 업무 진행 현황 연동
}

export const emptyFilter: SalesFilter = { q: '', year: '2026', phases: [], statuses: [], includeLegacy: false, onlyWarnings: false };

export function useSalesFilter(initial: Partial<SalesFilter> = {}) {
  const [sp] = useSearchParams();
  const [f, setF] = useState<SalesFilter>({ ...emptyFilter, ...initial });
  // 대시보드 → 영업 현황 연결 (?cert=pending, ?phase=이행, ?wf=order …)
  useEffect(() => {
    const cert = sp.get('cert'); const phase = sp.get('phase') as Phase | null; const wf = sp.get('wf');
    if (cert || phase || wf) setF((x) => ({ ...x, cert: cert === 'pending' ? '승인대기' : x.cert, phases: phase ? [phase] : x.phases, wf: wf ?? undefined, year: '' }));
  }, [sp]);
  const all = useDB((d) => d.sales);
  const customers = useDB((d) => d.customers);
  const docs = useDB((d) => d.documents);
  useDB((d) => d.session.userId);
  const me = currentUser();
  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return visibleSales(me, all).filter((s) => {
      if (!f.includeLegacy && s.legacy) return false;
      if (f.year && !s.forecastYm.startsWith(f.year)) return false;
      if (f.phases.length && !f.phases.includes(statusDef(s.status).phase)) return false;
      if (f.statuses.length && !f.statuses.includes(s.status)) return false;
      if (f.teamId && s.teamId !== f.teamId) return false;
      if (f.ownerId && s.ownerId !== f.ownerId) return false;
      if (f.partnerId && s.partnerId !== f.partnerId) return false;
      if (f.salesType && s.salesType !== f.salesType) return false;
      if (f.cert && s.cert.status !== f.cert) return false;
      if (f.group && !s.lines.some((l) => l.group === f.group)) return false;
      if (f.product && !s.lines.some((l) => l.product === f.product)) return false;
      if (f.onlyWarnings && !s.crossCheckWarnings?.length) return false;
      if (f.wf) {
        const ph = statusDef(s.status).phase; const ordered = ['수주', '이행'].includes(ph);
        const hasCost = docs.some((d) => d.salescd === s.salescd && d.type === '원가명세서');
        const ok = f.wf === 'active' ? ['발굴', '진행'].includes(ph) : f.wf === 'order' ? s.status === 'SN05Z' : f.wf === 'contract' ? ordered && (!s.contractId || !hasCost) : f.wf === 'inspection' ? ordered && s.inspection?.status !== '검수완료' : f.wf === 'receivable' ? s.status === 'SN12M' : f.wf === 'collected' ? s.status === 'SN12Z' : true;
        if (!ok) return false;
      }
      if (q) {
        const cname = customers.find((c) => c.custcd === s.custcd)?.name ?? '';
        if (!`${s.name} ${cname} ${s.salescd} ${s.tqsProjectCode ?? ''} ${s.partyName ?? ''}`.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [f, all, me, customers, docs]);
  const totals = useMemo(() => {
    const t = rows.reduce((acc, s) => {
      const x = lineTotals(s.lines);
      acc.sales += x.sales; acc.buy += x.buy; acc.profit += x.profit; acc.weighted += x.sales * (s.probability / 100);
      if (['수주', '이행'].includes(statusDef(s.status).phase)) acc.ordered += x.sales;
      return acc;
    }, { sales: 0, buy: 0, profit: 0, weighted: 0, ordered: 0 });
    return { ...t, count: rows.length };
  }, [rows]);
  return { filter: f, setFilter: setF, rows, totals, me };
}
