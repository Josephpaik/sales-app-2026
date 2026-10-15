import { useDB } from '@/api/store';

export { StatusTag, CertTag, TaxTag, Prob } from '@/components/tags';

export function useLookups() {
  const users = useDB((d) => d.users);
  const teams = useDB((d) => d.teams);
  const customers = useDB((d) => d.customers);
  const partners = useDB((d) => d.partners);
  const parties = useDB((d) => d.contractParties);
  const productItems = useDB((d) => d.productItems);
  return {
    users, teams, customers, partners, parties, productItems,
    userName: (id: string) => users.find((u) => u.id === id)?.name ?? id,
    teamName: (id: string) => teams.find((t) => t.id === id)?.name ?? id,
    customerName: (id: string) => customers.find((c) => c.custcd === id)?.name ?? id,
    partnerName: (id?: string) => (id ? partners.find((p) => p.id === id)?.name ?? id : '-'),
    partyName: (id?: string) => (id ? parties.find((p) => p.id === id)?.name ?? id : '-'),
  };
}
