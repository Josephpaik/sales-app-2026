import { Tag as ATag, Progress } from 'antd';
import { Tag as MTag } from 'antd-mobile';
import { statusDef, type SalesStatus, TAX_STATUS_LABEL, type TaxStatus } from '@/types';
import { useDB } from '@/api/store';

export function StatusTag({ code, mobile }: { code: SalesStatus; mobile?: boolean }) {
  const d = statusDef(code);
  if (mobile) {
    const color = d.color === 'success' ? 'success' : d.color === 'error' ? 'danger' : d.color === 'warning' ? 'warning' : d.color === 'processing' ? 'primary' : 'default';
    return <MTag color={color} fill="outline" style={{ '--border-radius': '6px' } as never}>{d.name}</MTag>;
  }
  return <ATag color={d.color} style={{ marginInlineEnd: 0 }}>{d.name}</ATag>;
}

export function TaxTag({ code }: { code: TaxStatus }) {
  const color = code === 'TBOK' ? 'green' : code === 'NONE' ? 'default' : code === 'TBSTP' ? 'red' : 'gold';
  return <ATag color={color} style={{ marginInlineEnd: 0 }}>{TAX_STATUS_LABEL[code]}</ATag>;
}

export function Prob({ value }: { value: number }) {
  return <Progress percent={value} size="small" style={{ width: 90, margin: 0 }} strokeColor={value >= 90 ? '#237804' : value >= 50 ? '#1f3a8a' : '#8c8c8c'} />;
}

export function useLookups() {
  const users = useDB((d) => d.users);
  const teams = useDB((d) => d.teams);
  const customers = useDB((d) => d.customers);
  const partners = useDB((d) => d.partners);
  const products = useDB((d) => d.products);
  return {
    users, teams, customers, partners, products,
    userName: (id: string) => users.find((u) => u.id === id)?.name ?? id,
    teamName: (id: string) => teams.find((t) => t.id === id)?.name ?? id,
    customerName: (id: string) => customers.find((c) => c.custcd === id)?.name ?? id,
    partnerName: (id?: string) => (id ? partners.find((p) => p.id === id)?.name ?? id : '-'),
    productName: (code?: string) => (code ? products.find((p) => p.code === code)?.name ?? code : '-'),
  };
}
