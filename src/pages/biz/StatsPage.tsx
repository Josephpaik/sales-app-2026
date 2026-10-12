import { useMemo, useState } from 'react';
import { Table, Space, Checkbox, Segmented, Select, Tabs, Statistic, Row, Col, Button, Alert } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useDB } from '@/api/store';
import { currentUser, visibleSales, lineTotals, logAudit } from '@/api';
import { useLookups } from '@/components/common';
import { useDevice } from '@/hooks/useDevice';
import { statusDef, WINBACK_RELATIONS, type SalesOpportunity } from '@/types';
import { compact, won } from '@/utils/format';

/**
 * 집계 · 통계 — V2.4: 연도(최대 3개)·분기·비교축(팀/담당자/제품군/제품) 조회조건, 실적 분석 / 수주 분석 / 윈백 분석 / 고도화 사이클.
 * 월별 매출·이익 추이는 대시보드에서 이곳으로 이동.
 */
export default function StatsPage() {
  const device = useDevice(); const lk = useLookups();
  const all = useDB((d) => d.sales); useDB((d) => d.session.userId);
  const me = currentUser();
  const [years, setYears] = useState<number[]>([2026, 2025, 2024]);
  const [quarters, setQuarters] = useState<number[]>([1, 2, 3, 4]);
  const [axis, setAxis] = useState<'팀별' | '담당자별' | '제품군별' | '제품별'>('팀별');
  const [cycle, setCycle] = useState(5);
  const rows = useMemo(() => visibleSales(me, all).filter((s) => !s.legacy), [all, me]);
  const yearOf = (s: SalesOpportunity) => Number((s.orderDate ?? s.forecastYm).slice(0, 4));
  const qOf = (s: SalesOpportunity) => Math.ceil(Number((s.orderDate ?? s.forecastYm).slice(5, 7)) / 3);
  const inRange = (s: SalesOpportunity) => years.includes(yearOf(s)) && quarters.includes(qOf(s));
  const perf = rows.filter((s) => ['SN10Z', 'SN12M', 'SN12Z'].includes(s.status) && inRange(s)); // 확정 실적
  const orders = rows.filter((s) => ['수주', '이행', '종결'].includes(statusDef(s.status).phase) && !['SN13Z', 'SN14Z'].includes(s.status) && inRange(s));
  const winback = orders.filter((s) => WINBACK_RELATIONS.includes(s.relation));
  const keyOf = (s: SalesOpportunity) => axis === '팀별' ? lk.teamName(s.teamId) : axis === '담당자별' ? lk.userName(s.ownerId) : axis === '제품군별' ? (s.lines.find((l) => l.kind === '매출')?.group ?? '기타') : (s.lines.find((l) => l.kind === '매출')?.product ?? '기타');
  const groupBy = (list: SalesOpportunity[]) => { const m = new Map<string, { key: string; count: number; sales: number; buy: number; profit: number }>(); list.forEach((s) => { const k = keyOf(s); const t = lineTotals(s.lines); const g = m.get(k) ?? { key: k, count: 0, sales: 0, buy: 0, profit: 0 }; g.count++; g.sales += t.sales; g.buy += t.buy; g.profit += t.profit; m.set(k, g); }); return [...m.values()].sort((a, b) => b.sales - a.sales); };
  const byYear = years.slice().sort().map((y) => { const list = perf.filter((s) => yearOf(s) === y); const t = list.reduce((a, s) => { const x = lineTotals(s.lines); return { sales: a.sales + x.sales, profit: a.profit + x.profit }; }, { sales: 0, profit: 0 }); return { y, count: list.length, ...t, demo: list.length === 0 }; });
  const monthly = Array.from({ length: 12 }, (_, i) => { const ym = `${years[0]}-${String(i + 1).padStart(2, '0')}`; const list = rows.filter((s) => s.forecastYm === ym); return { m: i + 1, forecast: list.reduce((a, s) => a + lineTotals(s.lines).sales * s.probability / 100, 0), ordered: list.filter((s) => s.orderDate).reduce((a, s) => a + lineTotals(s.lines).sales, 0) }; });
  const maxM = Math.max(1, ...monthly.map((d) => Math.max(d.forecast, d.ordered)));
  const cycleRows = useMemo(() => { // 고도화 사이클: 고객사별 최초 도입 후 경과연수 → 고도화 제안 대상
    const m = new Map<string, { custcd: string; first: string; last: string; count: number; upgrades: number }>();
    rows.filter((s) => s.orderDate).forEach((s) => { const g = m.get(s.custcd) ?? { custcd: s.custcd, first: s.orderDate!, last: s.orderDate!, count: 0, upgrades: 0 }; g.count++; if (s.orderDate! < g.first) g.first = s.orderDate!; if (s.orderDate! > g.last) g.last = s.orderDate!; if (['고도화', '증설', '재계약'].includes(s.relation)) g.upgrades++; m.set(s.custcd, g); });
    return [...m.values()].map((g) => ({ ...g, years: 2026 - Number(g.first.slice(0, 4)), due: 2026 - Number(g.first.slice(0, 4)) >= cycle || g.upgrades === 0 })).sort((a, b) => b.years - a.years);
  }, [rows, cycle]);
  const csv = (name: string, head: string[], body: (string | number)[][]) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [head, ...body].map((x) => x.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = `${name}.csv`; a.click(); logAudit('다운로드', name, `${body.length}행`); };
  const groupTable = (list: SalesOpportunity[]) => <Table size="small" pagination={false} dataSource={groupBy(list)} rowKey="key" columns={[{ title: axis.replace('별', ''), dataIndex: 'key' }, { title: '프로젝트', dataIndex: 'count', width: 80, align: 'right' }, { title: '매출', dataIndex: 'sales', width: 130, align: 'right', render: won }, { title: '매입', dataIndex: 'buy', width: 130, align: 'right', render: won }, { title: '이익', dataIndex: 'profit', width: 130, align: 'right', render: won }]} />;
  const controls = (
    <Space wrap>
      <span className="muted">연도</span><Checkbox.Group value={years} onChange={(v) => setYears((v as number[]).slice(0, 3))} options={[2026, 2025, 2024, 2023].map((y) => ({ value: y, label: String(y) }))} />
      <span className="muted">분기</span><Checkbox.Group value={quarters} onChange={(v) => setQuarters(v as number[])} options={[1, 2, 3, 4].map((q) => ({ value: q, label: `${q}분기` }))} />
      <Segmented size="small" value={axis} onChange={(v) => setAxis(v as typeof axis)} options={['팀별', '담당자별', '제품군별', '제품별']} />
    </Space>
  );
  const body = (
    <Tabs size="small" items={[
      { key: 'perf', label: '실적 분석', children: (<>
        <Row gutter={10} style={{ marginBottom: 10 }}><Col flex={1}><Statistic title="실적 프로젝트" value={perf.length} suffix="건" /></Col><Col flex={1}><Statistic title="매출" value={compact(perf.reduce((a, s) => a + lineTotals(s.lines).sales, 0))} /></Col><Col flex={1}><Statistic title="매입" value={compact(perf.reduce((a, s) => a + lineTotals(s.lines).buy, 0))} /></Col><Col flex={1}><Statistic title="이익" value={compact(perf.reduce((a, s) => a + lineTotals(s.lines).profit, 0))} /></Col><Col flex={1}><Statistic title="윈백 실적" value={perf.filter((s) => WINBACK_RELATIONS.includes(s.relation)).length} suffix="건" /></Col></Row>
        <div className="pane-title"><span>비교연도 실적 추이 <span className="muted">선택한 연도만 같은 기준으로 비교</span></span><Button size="small" icon={<DownloadOutlined />} onClick={() => csv('실적분석', ['구분', '프로젝트', '매출', '매입', '이익'], groupBy(perf).map((g) => [g.key, g.count, g.sales, g.buy, g.profit]))}>Excel</Button></div>
        <div className="mini-bars" style={{ height: 100, marginBottom: 6 }}>{byYear.map((y) => { const mx = Math.max(1, ...byYear.map((x) => x.sales)); return <div key={y.y} title={`${y.y} 매출 ${compact(y.sales)} / 이익 ${compact(y.profit)}`}><i style={{ height: `${(y.sales / mx) * 100}%` }} /><i style={{ height: `${(y.profit / mx) * 100}%`, background: '#93a4e8', borderRadius: 0 }} /><small>{y.y}{y.demo ? '*' : ''}</small></div>; })}</div>
        <div className="muted" style={{ marginBottom: 10 }}>■ 매출 ■ 이익 · * 과거 확정 DB가 없는 연도는 화면 검토용 시연 표시(0)</div>
        <div className="pane-title">월별 매출·이익 추이 ({years[0]}) <span className="muted">■ 수주 ■ 확도가중 예상 — 대시보드에서 이동</span></div>
        <div className="mini-bars" style={{ marginBottom: 12 }}>{monthly.map((d) => <div key={d.m} title={`${d.m}월 수주 ${compact(d.ordered)} / 확도가중 ${compact(d.forecast)}`}><i style={{ height: `${(d.ordered / maxM) * 100}%` }} /><i style={{ height: `${(Math.max(0, d.forecast - d.ordered) / maxM) * 100}%`, background: '#93a4e8', borderRadius: 0 }} /><small>{d.m}</small></div>)}</div>
        <div className="pane-title">{axis} 실적 비교 <span className="muted">매출·이익 동시 비교</span></div>{groupTable(perf)}
      </>) },
      { key: 'order', label: '수주 분석', children: (<><Row gutter={10} style={{ marginBottom: 10 }}><Col flex={1}><Statistic title="수주 프로젝트" value={orders.length} suffix="건" /></Col><Col flex={1}><Statistic title="수주 매출" value={compact(orders.reduce((a, s) => a + lineTotals(s.lines).sales, 0))} /></Col><Col flex={1}><Statistic title="평균 수주금액" value={compact(orders.length ? orders.reduce((a, s) => a + lineTotals(s.lines).sales, 0) / orders.length : 0)} /></Col></Row>{groupTable(orders)}</>) },
      { key: 'winback', label: '윈백 분석', children: (<><Alert type="info" showIcon style={{ marginBottom: 10 }} message="도입관계가 윈백_신규·윈백_증설·윈백_교차판매인 수주 건. 경쟁사별 윈백 건수·금액." /><Table size="small" pagination={false} rowKey="k" dataSource={[...new Set(winback.map((s) => s.competitor ?? '미지정'))].map((k) => { const l = winback.filter((s) => (s.competitor ?? '미지정') === k); return { k, count: l.length, sales: l.reduce((a, s) => a + lineTotals(s.lines).sales, 0) }; })} columns={[{ title: '경쟁사', dataIndex: 'k' }, { title: '윈백 건수', dataIndex: 'count', width: 100, align: 'right' }, { title: '수주 매출', dataIndex: 'sales', width: 140, align: 'right', render: won }]} />{groupTable(winback)}</>) },
      { key: 'cycle', label: '고도화 사이클', children: (<><Space style={{ marginBottom: 10 }}><span className="muted">사이클 기준(년)</span><Select size="small" value={cycle} onChange={setCycle} options={[3, 4, 5, 6, 7].map((v) => ({ value: v }))} /><span className="muted">최초 도입 후 기준 연수 경과 또는 고도화·증설 이력 없음 → 제안 대상</span></Space><Table size="small" pagination={{ pageSize: 15, size: 'small' }} rowKey="custcd" dataSource={cycleRows} columns={[{ title: '고객사', dataIndex: 'custcd', render: (v) => lk.customerName(v) }, { title: '최초 도입', dataIndex: 'first', width: 110 }, { title: '최근 수주', dataIndex: 'last', width: 110 }, { title: '수주 건수', dataIndex: 'count', width: 90, align: 'right' }, { title: '고도화·증설', dataIndex: 'upgrades', width: 100, align: 'right' }, { title: '경과(년)', dataIndex: 'years', width: 80, align: 'right' }, { title: '판정', dataIndex: 'due', width: 110, render: (v) => v ? <b style={{ color: '#ad6800' }}>제안 대상</b> : '-' }]} /></>) },
    ]} />
  );
  if (device !== 'desktop') return <div className="m-section" style={{ padding: 12 }}>{controls}<div style={{ height: 8 }} />{body}</div>;
  return <div className="pane"><div className="pane-title"><span>집계 · 통계</span>{controls}</div>{body}</div>;
}
