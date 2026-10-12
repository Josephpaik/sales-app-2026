import { useMemo, useState } from 'react';
import { Row, Col, Segmented, Select, Space, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useDB } from '@/api/store';
import { currentUser, visibleSales, lineTotals, arStatus, remainingQty } from '@/api';
import { statusDef } from '@/types';
import { compact } from '@/utils/format';
import { useLookups } from '@/components/common';
import { useDevice } from '@/hooks/useDevice';

/** 사업관리 홈 — 집계 범위(본인/팀/사업부/전체) + 업무 현황 KPI(클릭 이동) + 실적 요약 + 바로가기 */
export function useScope() {
  const [unit, setUnit] = useState<'본인' | '팀' | '전체'>('전체');
  const [target, setTarget] = useState<string | undefined>();
  const all = useDB((d) => d.sales); useDB((d) => d.session.userId);
  const me = currentUser();
  const lk = useLookups();
  const base = visibleSales(me, all).filter((s) => !s.legacy);
  const rows = useMemo(() => unit === '본인' ? base.filter((s) => s.ownerId === (target ?? me.id)) : unit === '팀' ? base.filter((s) => s.teamId === (target ?? me.teamId)) : base, [unit, target, base, me]);
  const controls = (
    <Space wrap>
      <span className="muted">집계 범위</span>
      <Segmented size="small" value={unit} onChange={(v) => { setUnit(v as typeof unit); setTarget(undefined); }} options={['본인', '팀', '전체']} />
      {unit === '본인' && <Select size="small" style={{ width: 140 }} value={target ?? me.id} onChange={setTarget} options={lk.users.filter((u) => ['sales', 'team_lead'].includes(u.role)).map((u) => ({ value: u.id, label: u.name }))} />}
      {unit === '팀' && <Select size="small" style={{ width: 140 }} value={target ?? me.teamId} onChange={setTarget} options={lk.teams.filter((t) => t.division === '영업본부').map((t) => ({ value: t.id, label: t.name }))} />}
    </Space>
  );
  return { rows, controls, unit };
}

export default function BizHome() {
  const nav = useNavigate();
  const device = useDevice();
  const { rows, controls } = useScope();
  const docs = useDB((d) => d.documents); const ars = useDB((d) => d.receivables); const frs = useDB((d) => d.fulfillRequests);
  const codes = new Set(rows.map((s) => s.salescd));
  const ordered = rows.filter((s) => ['수주', '이행'].includes(statusDef(s.status).phase));
  const completed = rows.filter((s) => ['SN12M', 'SN12Z'].includes(s.status));
  const fulfillable = rows.filter((s) => ['수주', '이행', '종결'].includes(statusDef(s.status).phase) && !['SN13Z', 'SN14Z'].includes(s.status));
  const kpi = [
    { label: '계약 등록', value: rows.filter((s) => s.contractId).length, to: '/biz/contracts' },
    { label: '원가명세서 처리대기', value: ordered.filter((s) => !docs.some((d) => d.salescd === s.salescd && d.type === '원가명세서')).length, to: '/biz/contracts', warn: true },
    { label: '검수대기', value: ordered.filter((s) => s.inspection?.status !== '검수완료').length, to: '/sales?phase=이행', warn: true },
    { label: 'HyBoost 미출고', value: fulfillable.reduce((a, s) => a + s.lines.filter((l) => l.hyboost && remainingQty('shipment', s, l) > 0).length, 0), to: '/biz/hyboost', danger: true },
    { label: '라이선스 미발급·보류', value: fulfillable.reduce((a, s) => a + s.lines.filter((l) => l.kind === '매출' && remainingQty('license', s, l) > 0).length, 0) + frs.filter((r) => codes.has(r.salescd) && r.status === '발급보류').length, to: '/biz/license', danger: true },
    { label: '추심대상 채권', value: ars.filter((r) => codes.has(r.salescd) && arStatus(r) === '추심대상').length, to: '/biz/receivables', danger: true },
    { label: '완료 영업건', value: completed.length, to: '/biz/report' },
  ];
  const tot = completed.reduce((a, s) => { const t = lineTotals(s.lines); return { sales: a.sales + t.sales, buy: a.buy + t.buy }; }, { sales: 0, buy: 0 });
  const paid = ars.filter((r) => codes.has(r.salescd)).reduce((a, r) => a + r.paid, 0);
  const shortcuts = [
    ['계약 · 원가', '계약 등록, 원가명세서 상신, 거래처 등재기안', '/biz/contracts'], ['직출관리', '현장 방문 등록·보고 (영업 건 연결)', '/biz/visits'],
    ['라이선스 발급이력', '월간 발급 현황·보고서', '/biz/license'], ['HyBoost 출고이력', '월간 출고 현황·보고서', '/biz/hyboost'],
    ['매출채권', '사전경보·등재·추심 관리', '/biz/receivables'], ['보고 · 통계', '가마감·마감 실적보고, 집계·통계', '/biz/report'], ['통합문서함', '문서번호·프로젝트·고객사 교차조회', '/biz/docs'],
  ];
  const kpiGrid = <div className="task-grid">{kpi.map((k) => <button key={k.label} className={`task-card ${k.value && (k.warn || k.danger) ? 'hot' : ''}`} onClick={() => nav(k.to)}><span>{k.label}</span><b style={k.danger && k.value ? { color: '#cf1322' } : undefined}>{k.value}건</b></button>)}</div>;
  const fin = <div className="kpi-row" style={{ marginBottom: 0 }}>{[['매출', tot.sales], ['매입', tot.buy], ['이익', tot.sales - tot.buy], ['입금', paid]].map(([l, v]) => <div key={l as string} className="kpi"><div className="l">{l}</div><div className="v">{compact(v as number)}</div></div>)}</div>;
  if (device !== 'desktop') {
    return (
      <div>
        <div className="m-section" style={{ padding: 12 }}>{controls}</div>
        <div className="m-section"><div className="m-section-title">업무 현황</div><div style={{ padding: '0 12px 12px' }}>{kpiGrid}</div></div>
        <div className="m-section"><div className="m-section-title">실적 요약 (완료 영업건)</div><div style={{ padding: '0 12px 12px' }}>{fin}</div></div>
      </div>
    );
  }
  return (
    <div>
      <div className="pane" style={{ marginBottom: 12 }}>
        <div className="pane-title"><span>사업관리 <span className="muted">계약부터 납품·발급·실적까지 프로젝트 기준으로 집계</span></span>{controls}</div>
        <Typography.Text strong>업무 현황</Typography.Text> <span className="muted">숫자를 누르면 해당 업무로 이동합니다.</span>
        <div style={{ margin: '8px 0 14px' }}>{kpiGrid}</div>
        <Typography.Text strong>실적 요약</Typography.Text> <span className="muted">완료 영업건 기준 · 선택한 범위와 동일하게 집계</span>
        <div style={{ marginTop: 8 }}>{fin}</div>
      </div>
      <Row gutter={[12, 12]}>{shortcuts.map(([t, d, to]) => <Col span={6} key={t}><div className="pane" style={{ cursor: 'pointer' }} onClick={() => nav(to)}><b>{t}</b><div className="muted" style={{ marginTop: 4 }}>{d}</div><Button type="link" size="small" style={{ padding: 0 }}>열기 →</Button></div></Col>)}</Row>
    </div>
  );
}
