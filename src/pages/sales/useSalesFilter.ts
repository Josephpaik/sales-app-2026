import { useMemo, useState } from 'react';
import { useDB } from '@/api/store';
import { currentUser, visibleSales, lineTotals } from '@/api';
import { statusDef, type SalesStatus, type SalesType } from '@/types';

export interface SalesFilter {
  q: string;
  year: string;
  phases: string[];
  statuses: SalesStatus[];
  teamId?: string;
  ownerId?: string;
  partnerId?: string;
  family?: string;
  salesType?: SalesType;
  includeLegacy: boolean;
  onlyWarnings: boolean;
}

export const emptyFilter: SalesFilter = { q: '', year: '2026', phases: [], statuses: [], includeLegacy: false, onlyWarnings: false };

export function useSalesFilter(initial: Partial<SalesFilter> = {}) {
  const [f, setF] = useState<SalesFilter>({ ...emptyFilter, ...initial });
  const all = useDB((d) => d.sales);
  const customers = useDB((d) => d.customers);
  const products = useDB((d) => d.products);
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
      if (f.family && !s.lines.some((l) => products.find((p) => p.code === l.productCode)?.familyCode === f.family)) return false;
      if (f.onlyWarnings && !s.crossCheckWarnings?.length) return false;
      if (q) {
        const cname = customers.find((c) => c.custcd === s.custcd)?.name ?? '';
        if (!`${s.name} ${cname} ${s.salescd} ${s.tqsProjectCode ?? ''}`.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [f, all, me, customers, products]);
  const totals = useMemo(() => {
    const t = rows.reduce((acc, s) => {
      const x = lineTotals(s.lines);
      acc.sales += x.sales; acc.buy += x.buy; acc.profit += x.profit;
      acc.weighted += x.sales * (s.probability / 100);
      if (s.orderDate && !['SN14Z', 'SN99Z', 'SN13Z'].includes(s.status)) acc.ordered += x.sales;
      return acc;
    }, { sales: 0, buy: 0, profit: 0, weighted: 0, ordered: 0 });
    return { ...t, count: rows.length };
  }, [rows]);
  return { filter: f, setFilter: setF, rows, totals, me };
}
