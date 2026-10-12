import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SearchBar, List, Popup, Selector, Button, Tag, Card, Tabs, ActionSheet, Dialog, Toast, Space, Steps, TextArea, Empty } from 'antd-mobile';
import { FilterOutline, AddOutline, EditSOutline, PhonebookOutline } from 'antd-mobile-icons';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { useSalesFilter } from './useSalesFilter';
import { StatusTag, CertTag, useLookups } from '@/components/common';
import { lineTotals, transitionSales, addActivity, can, currentUser } from '@/api';
import { statusDef, SALES_TYPE_LABEL, TAX_STATUS_LABEL, PHASES, type SalesOpportunity, type SalesStatus } from '@/types';
import { compact, won, maskPhone } from '@/utils/format';
import SalesForm from './SalesForm';

/**
 * 현장 영업 — 태블릿: 2단(왼쪽 목록 / 오른쪽 상세), 폰: 1단(목록 → 상세)
 * Drawer(레이아웃) · Bottom Sheet(필터·빠른 등록·활동 기록) · ActionSheet(상태 전이)
 */
export default function SalesMobile() {
  const device = useDevice();
  const { id } = useParams();
  const nav = useNavigate();
  const all = useDB((d) => d.sales);
  const selected = id ? all.find((s) => s.salescd === id) : undefined;
  const [form, setForm] = useState<{ open: boolean; value?: SalesOpportunity }>({ open: false });
  const me = currentUser();

  const formEl = <SalesForm mobile open={form.open} value={form.value} onClose={(savedId) => { setForm({ open: false }); if (savedId) { Toast.show({ icon: 'success', content: '저장했습니다' }); nav(`/sales/${savedId}`); } }} />;
  const fab = can.editSales(me) && (
    <Button className="m-fab" color="primary" shape="rounded" size="large" onClick={() => setForm({ open: true })}><AddOutline /> 영업 건</Button>
  );

  if (device === 'tablet') {
    return (
      <div className="m-body split">
        <div className="m-list-pane"><MobileList selectedId={id} onSelect={(s) => nav(`/sales/${s}`)} /></div>
        <div className="m-detail-pane">
          {selected ? <MobileDetail sales={selected} onEdit={() => setForm({ open: true, value: selected })} /> : <div className="m-empty"><PhonebookOutline fontSize={40} /><div>왼쪽 목록에서 영업 건을 선택하세요</div></div>}
        </div>
        {fab}{formEl}
      </div>
    );
  }
  // phone
  return (
    <div className="m-body">
      {selected ? <MobileDetail sales={selected} onEdit={() => setForm({ open: true, value: selected })} /> : <MobileList onSelect={(s) => nav(`/sales/${s}`)} />}
      {!selected && fab}{formEl}
    </div>
  );
}

function MobileList({ selectedId, onSelect }: { selectedId?: string; onSelect: (id: string) => void }) {
  const { filter: f, setFilter, rows, totals, me } = useSalesFilter();
  const lk = useLookups();
  const [sheet, setSheet] = useState(false);
  const activeFilters = f.phases.length + (f.ownerId ? 1 : 0) + (f.onlyWarnings ? 1 : 0);
  return (
    <>
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#fff', position: 'sticky', top: 0, zIndex: 5 }}>
        <SearchBar placeholder="프로젝트명 / 고객사" value={f.q} onChange={(q) => setFilter({ ...f, q })} style={{ flex: 1 }} />
        <Button size="small" fill={activeFilters ? 'solid' : 'outline'} color="primary" onClick={() => setSheet(true)}><FilterOutline /> 필터{activeFilters ? ` ${activeFilters}` : ''}</Button>
      </div>
      <div style={{ padding: '6px 14px', fontSize: 12, color: '#6b7590', display: 'flex', gap: 12 }}>
        <span>{totals.count}건</span><span>매출 <b>{compact(totals.sales)}</b></span><span>이익 <b>{compact(totals.profit)}</b></span>
      </div>
      <List>
        {rows.map((s) => {
          const t = lineTotals(s.lines);
          return (
            <List.Item key={s.salescd} clickable onClick={() => onSelect(s.salescd)} style={selectedId === s.salescd ? { background: '#eef2ff' } : undefined}
              description={<span className="m-list-item-sub">{lk.customerName(s.custcd)} · {lk.userName(s.ownerId)} · {s.forecastYm.slice(2)}</span>}
              extra={<div style={{ textAlign: 'right' }}><div className="m-list-item-amt">{compact(t.sales)}</div><div className="m-list-item-sub">{s.probability}%</div></div>}>
              <div className="m-title"><StatusTag code={s.status} mobile /><span>{s.name}</span></div>
            </List.Item>
          );
        })}
        {!rows.length && <Empty description="조건에 맞는 영업 건이 없습니다" style={{ padding: 40 }} />}
      </List>
      <Popup visible={sheet} onMaskClick={() => setSheet(false)} position="bottom" bodyStyle={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
        <div className="sheet-title">조회 조건</div>
        <div className="sheet-body">
          <div className="muted" style={{ margin: '8px 0 4px' }}>단계</div>
          <Selector multiple columns={5} value={f.phases} onChange={(v) => setFilter({ ...f, phases: v as typeof f.phases })} options={PHASES.map((p) => ({ label: p, value: p }))} />
          <div className="muted" style={{ margin: '12px 0 4px' }}>담당자 {['sales', 'team_lead'].includes(me.role) ? `(${lk.teamName(me.teamId)})` : ''}</div>
          <Selector columns={3} value={f.ownerId ? [f.ownerId] : []} onChange={(v) => setFilter({ ...f, ownerId: v[0] as string | undefined })} options={lk.users.filter((u) => ['sales', 'team_lead'].includes(u.role) && (!['sales', 'team_lead'].includes(me.role) || u.teamId === me.teamId)).map((u) => ({ label: u.name, value: u.id }))} />
          <div className="muted" style={{ margin: '12px 0 4px' }}>연도</div>
          <Selector columns={3} value={[f.year]} onChange={(v) => setFilter({ ...f, year: (v[0] as string) ?? '' })} options={[{ label: '2026', value: '2026' }, { label: '2025', value: '2025' }, { label: '전체', value: '' }]} />
          <div style={{ margin: '12px 0 4px' }}>
            <Selector multiple columns={2} value={[f.onlyWarnings ? 'w' : '', f.includeLegacy ? 'l' : ''].filter(Boolean)} onChange={(v) => setFilter({ ...f, onlyWarnings: v.includes('w'), includeLegacy: v.includes('l') })} options={[{ label: '경고 건만', value: 'w' }, { label: '이전영업 포함', value: 'l' }]} />
          </div>
          <Space block style={{ marginTop: 16 }}>
            <Button block onClick={() => setFilter({ ...f, phases: [], ownerId: undefined, onlyWarnings: false, includeLegacy: false })}>초기화</Button>
            <Button block color="primary" onClick={() => setSheet(false)}>적용 ({totals.count}건)</Button>
          </Space>
        </div>
      </Popup>
    </>
  );
}

export function MobileDetail({ sales: s, onEdit }: { sales: SalesOpportunity; onEdit: () => void }) {
  const lk = useLookups();
  const nav = useNavigate();
  const contract = useDB((d) => d.contracts.find((c) => c.id === s.contractId));
  const customer = useDB((d) => d.customers.find((c) => c.custcd === s.custcd));
  const me = currentUser();
  const t = lineTotals(s.lines);
  const def = statusDef(s.status);
  const [act, setAct] = useState(false);
  const [actText, setActText] = useState('');
  const [actKind, setActKind] = useState<'방문' | '통화' | '메일' | '회의' | '메모'>('방문');
  const editable = can.editSales(me) && !s.legacy;
  const phases = PHASES;

  const openTransition = () => {
    const handler = ActionSheet.show({
      actions: def.next.map((n) => ({ key: n, text: statusDef(n).name })),
      cancelText: '취소',
      onAction: async (a) => {
        handler.close();
        const r = transitionSales(s.salescd, a.key as SalesStatus);
        if (!r.ok) return Toast.show({ icon: 'fail', content: r.warnings[0] });
        if (r.warnings.length) Dialog.alert({ title: '변경됨 · 경고 기록', content: r.warnings.join('\n') });
        else Toast.show({ icon: 'success', content: `상태: ${statusDef(a.key as SalesStatus).name}` });
      },
    });
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <Card style={{ margin: 10, borderRadius: 12 }}>
        <div className="tag-row" style={{ marginBottom: 6 }}><Tag color="default" fill="outline">{s.salescd}</Tag><StatusTag code={s.status} mobile /><CertTag status={s.cert.status} mobile />{s.crossCheckWarnings?.length ? <Tag color="warning">경고 {s.crossCheckWarnings.length}</Tag> : null}</div>
        <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>{s.name}</div>
        <div className="m-list-item-sub" style={{ marginTop: 4 }}>{lk.customerName(s.custcd)} · {lk.teamName(s.teamId)} / {lk.userName(s.ownerId)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
          <span>매출 <b>{compact(t.sales)}</b></span><span>이익 <b>{compact(t.profit)}</b></span><span>확도 <b>{s.probability}%</b></span><span>{s.forecastYm}</span>
        </div>
        <Steps current={phases.indexOf(def.phase)} style={{ '--title-font-size': '11px', marginTop: 8, padding: 0 } as never}>
          {phases.map((p) => <Steps.Step key={p} title={p} />)}
        </Steps>
        {editable && (
          <Space block style={{ marginTop: 8, '--gap': '8px' } as never}>
            {def.next.length > 0 && <Button size="small" color="primary" onClick={openTransition}>상태 전이</Button>}
            <Button size="small" onClick={() => setAct(true)}>활동 기록</Button>
            <Button size="small" fill="outline" onClick={onEdit}><EditSOutline /> 수정</Button>
          </Space>
        )}
      </Card>

      <Tabs style={{ '--title-font-size': '13px', background: '#fff', margin: '0 10px', borderRadius: 12 } as never}>
        <Tabs.Tab title="기본" key="basic">
          <List>
            <List.Item extra={<span onClick={() => nav(`/customers/${s.custcd}`)} style={{ color: '#1f3a8a' }}>{lk.customerName(s.custcd)}</span>}>고객사</List.Item>
            {customer?.contacts[0] && <List.Item extra={<a href={`tel:${customer.contacts[0].phone}`}>{customer.contacts[0].name} {maskPhone(customer.contacts[0].phone)}</a>}>고객 담당자</List.Item>}
            <List.Item extra={`${s.salesType} · ${SALES_TYPE_LABEL[s.salesType]}`}>계약구분</List.Item>
            <List.Item extra={s.partyName ?? '-'}>계약처</List.Item>
            <List.Item extra={s.parentSalescd ?? '-'}>본사업</List.Item>
            <List.Item extra={s.inspection?.status ?? '-'}>검수</List.Item>
            <List.Item extra={s.relation}>도입관계</List.Item>
            <List.Item extra={lk.partnerName(s.partnerId)}>파트너</List.Item>
            <List.Item extra={s.orderDate ?? '-'}>수주일</List.Item>
            <List.Item extra={TAX_STATUS_LABEL[s.taxStatus]}>세금계산서</List.Item>
            <List.Item extra={contract ? contract.id : '미등록'}>계약</List.Item>
            {s.memo && <List.Item description={s.memo}>비고</List.Item>}
            {s.crossCheckWarnings?.map((w) => <List.Item key={w} description={w} style={{ color: '#ad6800' }}>교차검토 경고</List.Item>)}
          </List>
        </Tabs.Tab>
        <Tabs.Tab title={`라인 ${s.lines.length}`} key="lines">
          <List>
            {s.lines.map((l) => (
              <List.Item key={l.id} description={`${l.sub}${l.license ? ' · ' + l.license : ''} · 수량 ${l.qty}${l.hyboost ? ' · ' + l.hyboost + ' ×' + (l.hyboostQty ?? 0) : ''}`} extra={<div style={{ textAlign: 'right' }}><div className="m-list-item-amt">{l.kind === '매출' || l.kind === '서비스' ? won(l.sales) : won(l.buy)}</div><div className="m-list-item-sub">{l.kind}</div></div>}>
                {l.product}
              </List.Item>
            ))}
            {!s.lines.length && <List.Item description="PC 화면에서 제품라인을 추가하세요 (제품분류 216 품목 연동)">라인 없음</List.Item>}
          </List>
          <div style={{ padding: '8px 14px', fontSize: 12, color: '#6b7590' }}>매출 {won(t.sales)} / 매입 {won(t.buy)} / 이익 {won(t.profit)} ({t.margin}%)</div>
        </Tabs.Tab>
        <Tabs.Tab title="활동·이력" key="act">
          <List>
            {[...s.activities.map((a) => ({ k: a.id, h: `${a.kind} · ${a.by}`, d: `${a.text} (${a.at})` })), ...s.history.map((h) => ({ k: h.id, h: `${h.kind} · ${h.by}`, d: `${h.text} (${h.at})` }))].slice(0, 20).map((x) => (
              <List.Item key={x.k} description={x.d}>{x.h}</List.Item>
            ))}
          </List>
        </Tabs.Tab>
        <Tabs.Tab title={`첨부 ${s.attachments.length}`} key="files">
          <List>{s.attachments.map((a) => <List.Item key={a.id} description={`${a.type} · ${a.uploadedAt} · ${a.by}`}>{a.name}</List.Item>)}{!s.attachments.length && <List.Item>첨부 없음</List.Item>}</List>
        </Tabs.Tab>
      </Tabs>

      {/* 활동 기록 Bottom Sheet — 현장에서 즉시 입력 */}
      <Popup visible={act} onMaskClick={() => setAct(false)} position="bottom" bodyStyle={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
        <div className="sheet-title">활동 기록 · {s.name}</div>
        <div className="sheet-body">
          <Selector columns={5} value={[actKind]} onChange={(v) => v[0] && setActKind(v[0] as typeof actKind)} options={['방문', '통화', '메일', '회의', '메모'].map((k) => ({ label: k, value: k }))} />
          <TextArea placeholder="예: 담당자 미팅, 예산 10월 확정 예정" rows={3} value={actText} onChange={setActText} style={{ marginTop: 12, background: '#f4f6fb', padding: 10, borderRadius: 8 }} />
          <Button block color="primary" size="large" style={{ marginTop: 12 }} onClick={() => { if (!actText.trim()) { Toast.show('내용을 입력하세요'); return; } addActivity(s.salescd, { kind: actKind, text: actText }); setActText(''); setAct(false); Toast.show({ icon: 'success', content: '기록했습니다' }); }}>저장</Button>
        </div>
      </Popup>
    </div>
  );
}
