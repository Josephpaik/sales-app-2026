import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Splitter, Table, Input, Select, Checkbox, Button, Space, Tag, Empty, Tooltip, Radio } from 'antd';
import { PlusOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { useSalesFilter } from './useSalesFilter';
import { StatusTag, TaxTag, Prob, CertTag, useLookups } from '@/components/common';
import { lineTotals, can, logAudit } from '@/api';
import { SALES_STATUS, SALES_TYPE_LABEL, PHASES, type SalesOpportunity } from '@/types';
import { won, compact } from '@/utils/format';
import SalesDetail from './SalesDetail';
import SalesForm from './SalesForm';
import SalesMobile from './SalesMobile';

export default function SalesPage() {
  const device = useDevice();
  return device === 'desktop' ? <SalesDesktop /> : <SalesMobile />;
}

/** PC — 3단: [조회 조건] | [목록·집계] | [세부내용] + 세부내용 전체화면 전환 (V2.4) */
function SalesDesktop() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const lk = useLookups();
  const { filter: f, setFilter, rows, totals, me } = useSalesFilter();
  const all = useDB((d) => d.sales);
  const items = useDB((d) => d.productItems);
  const selected = id ? all.find((s) => s.salescd === id) : undefined;
  const [form, setForm] = useState<{ open: boolean; value?: SalesOpportunity }>({ open: false });
  const [full, setFull] = useState(false);
  const set = (p: Partial<typeof f>) => setFilter({ ...f, ...p });
  useEffect(() => { if (sp.get('new')) { setForm({ open: true }); setSp({}); } }, [sp, setSp]);
  const groups = [...new Set(items.map((i) => i.group))];
  const products = [...new Set(items.filter((i) => !f.group || i.group === f.group).map((i) => i.product))];

  const exportCsv = () => {
    const head = ['프로젝트코드', '고객사', '프로젝트명', '상태', '서티', '확도', '매출예상시기', '팀', '담당', '계약구분', '계약처', '파트너', '매출', '매입', '이익'];
    const body = rows.map((s) => { const t = lineTotals(s.lines); return [s.salescd, lk.customerName(s.custcd), s.name, SALES_STATUS.find((x) => x.code === s.status)?.name, s.cert.status, s.probability, s.forecastYm, lk.teamName(s.teamId), lk.userName(s.ownerId), SALES_TYPE_LABEL[s.salesType], s.partyName, lk.partnerName(s.partnerId), t.sales, t.buy, t.profit]; });
    const csv = '﻿' + [head, ...body].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `영업현황_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    logAudit('다운로드', '영업 현황 목록', `${rows.length}건 CSV`);
  };

  const filterPane = (
    <div className="pane">
      <div className="pane-title"><span>조회 조건</span><Button size="small" type="text" icon={<ClearOutlined />} onClick={() => setFilter({ ...f, q: '', phases: [], statuses: [], teamId: undefined, ownerId: undefined, partnerId: undefined, group: undefined, product: undefined, salesType: undefined, cert: undefined, onlyWarnings: false, wf: undefined })}>초기화</Button></div>
      <Space direction="vertical" style={{ width: '100%' }} size={10}>
        <Input.Search placeholder="프로젝트명 / 고객사 / 코드 / 계약처" allowClear value={f.q} onChange={(e) => set({ q: e.target.value })} />
        <div><div className="muted">연도</div><Radio.Group size="small" value={f.year} onChange={(e) => set({ year: e.target.value })} options={['2026', '2025', ''].map((y) => ({ value: y, label: y || '전체' }))} optionType="button" /></div>
        <div><div className="muted">단계 (5단계)</div><Checkbox.Group value={f.phases} onChange={(v) => set({ phases: v as typeof f.phases })} options={PHASES.map((p) => ({ value: p, label: p }))} /></div>
        <div><div className="muted">영업상태 (11종)</div><Select mode="multiple" allowClear size="small" style={{ width: '100%' }} value={f.statuses} onChange={(v) => set({ statuses: v })} options={SALES_STATUS.map((s) => ({ value: s.code, label: `${s.name} · ${s.phase}` }))} maxTagCount="responsive" /></div>
        <div><div className="muted">서티</div><Select allowClear size="small" style={{ width: '100%' }} value={f.cert} onChange={(v) => set({ cert: v })} options={['승인대기', '승인완료', '반려'].map((v) => ({ value: v }))} /></div>
        {!['sales', 'team_lead'].includes(me.role) && <div><div className="muted">팀</div><Select allowClear size="small" style={{ width: '100%' }} value={f.teamId} onChange={(v) => set({ teamId: v, ownerId: undefined })} options={lk.teams.filter((t) => t.division === '영업본부').map((t) => ({ value: t.id, label: t.name }))} /></div>}
        <div><div className="muted">영업담당</div><Select allowClear size="small" style={{ width: '100%' }} value={f.ownerId} onChange={(v) => set({ ownerId: v })} options={lk.users.filter((u) => ['sales', 'team_lead'].includes(u.role) && (!f.teamId || u.teamId === f.teamId) && (!['sales', 'team_lead'].includes(me.role) || u.teamId === me.teamId)).map((u) => ({ value: u.id, label: u.name }))} /></div>
        <div><div className="muted">계약구분</div><Select allowClear size="small" style={{ width: '100%' }} value={f.salesType} onChange={(v) => set({ salesType: v })} options={Object.entries(SALES_TYPE_LABEL).map(([v, l]) => ({ value: v, label: `${v} · ${l}` }))} /></div>
        <div><div className="muted">파트너</div><Select allowClear size="small" style={{ width: '100%' }} value={f.partnerId} onChange={(v) => set({ partnerId: v })} options={lk.partners.map((p) => ({ value: p.id, label: p.name }))} /></div>
        <div><div className="muted">제품군 / 제품</div><Space direction="vertical" style={{ width: '100%' }} size={4}><Select allowClear size="small" style={{ width: '100%' }} value={f.group} onChange={(v) => set({ group: v, product: undefined })} options={groups.map((g) => ({ value: g }))} /><Select allowClear showSearch size="small" style={{ width: '100%' }} value={f.product} onChange={(v) => set({ product: v })} options={products.map((p) => ({ value: p }))} /></Space></div>
        <Checkbox checked={f.onlyWarnings} onChange={(e) => set({ onlyWarnings: e.target.checked })}>교차검토 경고 건만</Checkbox>
        <Checkbox checked={f.includeLegacy} onChange={(e) => set({ includeLegacy: e.target.checked })}>이전영업현황(OLD) 포함</Checkbox>
        {f.wf && <Tag closable onClose={() => set({ wf: undefined })} color="blue">대시보드 업무 진행 현황 필터</Tag>}
      </Space>
    </div>
  );

  const listPane = (
    <div className="pane">
      <div className="pane-title">
        <span>영업 건 목록 <span className="muted">(현재 검색 {totals.count}건 · {['sales', 'team_lead'].includes(me.role) ? `${lk.teamName(me.teamId)} 범위` : '전체'})</span></span>
        <Space>
          <Tooltip title="Excel용 CSV (감사 로그 기록)"><Button size="small" icon={<DownloadOutlined />} onClick={exportCsv}>내보내기</Button></Tooltip>
          {can.editSales(me) && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setForm({ open: true })}>영업 건 등록</Button>}
        </Space>
      </div>
      <div className="summary-bar">
        <span>건수 <b>{totals.count}</b></span><span>매출합계 <b>{won(totals.sales)}</b></span><span>매입합계 <b>{won(totals.buy)}</b></span><span>이익합계 <b>{won(totals.profit)}</b></span><span>확도 가중 예상매출 <b>{compact(totals.weighted)}</b></span><span>수주 매출 <b>{compact(totals.ordered)}</b></span>
      </div>
      <Table size="small" dataSource={rows} rowKey="salescd" pagination={{ pageSize: 15, size: 'small', showSizeChanger: false }} scroll={{ x: 1080 }}
        rowClassName={(r) => (r.salescd === id ? 'selected' : '')} onRow={(r) => ({ onClick: () => nav(`/sales/${r.salescd}`) })}
        columns={[
          { title: '상태', dataIndex: 'status', width: 110, render: (v) => <StatusTag code={v} /> },
          { title: '고객사', dataIndex: 'custcd', width: 110, render: (v) => lk.customerName(v), ellipsis: true },
          { title: '프로젝트명', dataIndex: 'name', ellipsis: true, render: (v, r) => <span>{r.crossCheckWarnings?.length ? <Tag color="orange" style={{ marginRight: 4 }}>!</Tag> : null}<b>{v}</b><div className="muted">{r.salescd}</div></span> },
          { title: '제품', width: 150, ellipsis: true, render: (_, r) => { const p = [...new Set(r.lines.filter((l) => l.kind === '매출').map((l) => l.product))]; return p.length ? p.join(', ') : '-'; } },
          { title: '확도', dataIndex: 'probability', width: 100, render: (v) => <Prob value={v} /> },
          { title: '월', dataIndex: 'forecastYm', width: 70, render: (v) => v.slice(2) },
          { title: '팀/담당', width: 100, render: (_, r) => <><div>{lk.teamName(r.teamId)}</div><div className="muted">{lk.userName(r.ownerId)}</div></> },
          { title: '계약처 / 채널', width: 120, ellipsis: true, render: (_, r) => <><div>{r.partyName ?? '-'}</div><div className="muted">{lk.partnerName(r.partnerId)}</div></> },
          { title: '매출', width: 110, align: 'right', render: (_, r) => won(lineTotals(r.lines).sales), sorter: (a, b) => lineTotals(a.lines).sales - lineTotals(b.lines).sales },
          { title: '이익', width: 100, align: 'right', render: (_, r) => won(lineTotals(r.lines).profit) },
          { title: '계산서', dataIndex: 'taxStatus', width: 76, render: (v) => <TaxTag code={v} /> },
          { title: '서티', width: 80, render: (_, r) => <CertTag status={r.cert.status} /> },
        ]} />
    </div>
  );

  const detailPane = (
    <div className="pane">
      {selected ? <SalesDetail sales={selected} compact={!full} full={full} onToggleFull={() => setFull(!full)} onEdit={() => setForm({ open: true, value: selected })} /> : <Empty style={{ marginTop: 80 }} description="목록에서 영업 건을 선택하면 세부내용이 표시됩니다." />}
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 96px)' }}>
      {full && selected ? (
        <div style={{ height: '100%', overflow: 'auto' }}>
          <Space style={{ marginBottom: 8 }}><Button onClick={() => setFull(false)}>← 조회 · 목록 · 세부내용(3분할)으로 돌아가기</Button><span className="muted">세부내용 · 전체화면</span></Space>
          {detailPane}
        </div>
      ) : (
        <Splitter style={{ height: '100%' }}>
          <Splitter.Panel defaultSize={210} min={170} max={320} collapsible>{filterPane}</Splitter.Panel>
          <Splitter.Panel min={420}>{listPane}</Splitter.Panel>
          <Splitter.Panel defaultSize={selected ? 460 : 280} min={260} collapsible>{detailPane}</Splitter.Panel>
        </Splitter>
      )}
      <SalesForm open={form.open} value={form.value} onClose={(savedId) => { setForm({ open: false }); if (savedId) nav(`/sales/${savedId}`); }} />
    </div>
  );
}
