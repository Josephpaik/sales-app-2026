import { useMemo } from 'react';
import { Row, Col, Table, Tag, Typography, List as AList, Segmented, Space } from 'antd';
import { List as MList, Card } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useDB } from '@/api/store';
import { currentUser, visibleSales, lineTotals } from '@/api';
import { statusDef } from '@/types';
import { compact, won } from '@/utils/format';
import { useDevice } from '@/hooks/useDevice';
import { useLookups, StatusTag } from '@/components/common';
import { useState } from 'react';

function useDashboardData() {
  const all = useDB((d) => d.sales);
  const partners = useDB((d) => d.partners);
  const recon = useDB((d) => d.tqsRecon);
  useDB((d) => d.session.userId);
  const me = currentUser();
  const lk = useLookups();
  return useMemo(() => {
    const rows = visibleSales(me, all).filter((s) => !s.legacy);
    const amt = (s: (typeof rows)[number]) => lineTotals(s.lines);
    const byPhase = (['발굴', '진행', '수주', '이행', '종결'] as const).map((phase) => {
      const list = rows.filter((s) => statusDef(s.status).phase === phase);
      return { phase, count: list.length, sales: list.reduce((a, s) => a + amt(s).sales, 0), weighted: list.reduce((a, s) => a + amt(s).sales * (s.probability / 100), 0) };
    });
    const ordered = rows.filter((s) => ['수주', '이행'].includes(statusDef(s.status).phase) || s.status === 'SN12Z');
    const active = rows.filter((s) => ['발굴', '진행'].includes(statusDef(s.status).phase));
    const kpi = {
      forecast: active.reduce((a, s) => a + amt(s).sales, 0),
      weighted: active.reduce((a, s) => a + amt(s).sales * (s.probability / 100), 0),
      ordered: ordered.reduce((a, s) => a + amt(s).sales, 0),
      orderedProfit: ordered.reduce((a, s) => a + amt(s).profit, 0),
      activeCount: active.length,
      orderedCount: ordered.length,
      warnings: rows.filter((s) => s.crossCheckWarnings?.length).length,
      taxPending: rows.filter((s) => ['TBREQ', 'TBRED', 'TBRRE'].includes(s.taxStatus)).length,
      reconOpen: recon.filter((r) => r.status === 'open').length,
    };
    const byTeam = lk.teams.map((t) => {
      const list = rows.filter((s) => s.teamId === t.id);
      const ord = list.filter((s) => ['수주', '이행'].includes(statusDef(s.status).phase) || s.status === 'SN12Z');
      return { key: t.id, team: t.name, count: list.length, forecast: list.filter((s) => ['발굴', '진행'].includes(statusDef(s.status).phase)).reduce((a, s) => a + amt(s).sales, 0), ordered: ord.reduce((a, s) => a + amt(s).sales, 0), profit: ord.reduce((a, s) => a + amt(s).profit, 0) };
    }).filter((t) => t.count > 0);
    const byOwner = lk.users.filter((u) => u.role === 'sales').map((u) => {
      const list = rows.filter((s) => s.ownerId === u.id);
      const ord = list.filter((s) => ['수주', '이행'].includes(statusDef(s.status).phase) || s.status === 'SN12Z');
      return { key: u.id, owner: u.name, team: lk.teamName(u.teamId), count: list.length, ordered: ord.reduce((a, s) => a + amt(s).sales, 0), profit: ord.reduce((a, s) => a + amt(s).profit, 0) };
    }).filter((t) => t.count > 0).sort((a, b) => b.ordered - a.ordered);
    const byPartner = partners.map((p) => {
      const list = rows.filter((s) => s.partnerId === p.id);
      return { key: p.id, partner: p.name, type: p.channelType, count: list.length, sales: list.reduce((a, s) => a + amt(s).sales, 0), fee: list.reduce((a, s) => a + s.lines.filter((l) => l.kind === '매입').reduce((x, l) => x + l.buy, 0), 0), terms: p.paymentTerms };
    }).filter((p) => p.count > 0).sort((a, b) => b.sales - a.sales);
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const ym = `2026-${String(i + 1).padStart(2, '0')}`;
      const list = rows.filter((s) => s.forecastYm === ym);
      return { m: i + 1, forecast: list.reduce((a, s) => a + amt(s).sales * (s.probability / 100), 0), ordered: list.filter((s) => s.orderDate).reduce((a, s) => a + amt(s).sales, 0) };
    });
    const warnings = rows.filter((s) => s.crossCheckWarnings?.length).slice(0, 8);
    const recent = [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);
    return { me, rows, byPhase, kpi, byTeam, byOwner, byPartner, monthly, warnings, recent };
  }, [all, partners, recon, me, lk]);
}

export default function Dashboard() {
  const device = useDevice();
  return device === 'desktop' ? <DesktopDashboard /> : <MobileDashboard />;
}

function Bars({ data }: { data: { m: number; forecast: number; ordered: number }[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.forecast, d.ordered)));
  return (
    <div className="mini-bars">
      {data.map((d) => (
        <div key={d.m} title={`${d.m}월 확도가중 ${compact(d.forecast)} / 수주 ${compact(d.ordered)}`}>
          <i style={{ height: `${(d.ordered / max) * 100}%`, background: '#1f3a8a' }} />
          <i style={{ height: `${(Math.max(0, d.forecast - d.ordered) / max) * 100}%`, background: '#93a4e8', borderRadius: 0 }} />
          <small>{d.m}</small>
        </div>
      ))}
    </div>
  );
}

function DesktopDashboard() {
  const d = useDashboardData();
  const nav = useNavigate();
  const lk = useLookups();
  const [view, setView] = useState<'팀' | '담당자'>('팀');
  const scope = d.me.role === 'sales' ? `${lk.teamName(d.me.teamId)} 범위` : '전체 범위';
  return (
    <div>
      <div className="kpi-row">
        <div className="kpi"><div className="l">진행 파이프라인 ({scope})</div><div className="v">{compact(d.kpi.forecast)}</div><div className="s">{d.kpi.activeCount}건 · 확도가중 {compact(d.kpi.weighted)}</div></div>
        <div className="kpi"><div className="l">수주(당해년도)</div><div className="v">{compact(d.kpi.ordered)}</div><div className="s">{d.kpi.orderedCount}건 · 이익 {compact(d.kpi.orderedProfit)}</div></div>
        <div className="kpi"><div className="l">세금계산서 처리 대기</div><div className="v">{d.kpi.taxPending}건</div><div className="s">요청·대기·재요청</div></div>
        <div className="kpi"><div className="l">교차검토 경고 (C-1)</div><div className="v" style={{ color: d.kpi.warnings ? '#ad6800' : undefined }}>{d.kpi.warnings}건</div><div className="s">1차: 경고만 기록</div></div>
        <div className="kpi"><div className="l">TQS 대사 예외 (미처리)</div><div className="v" style={{ color: d.kpi.reconOpen ? '#cf1322' : undefined }}>{d.kpi.reconOpen}건</div><div className="s">일 1회 배치 06:00</div></div>
      </div>
      <Row gutter={14}>
        <Col span={10}>
          <div className="pane" style={{ marginBottom: 14 }}>
            <div className="pane-title">단계별 파이프라인</div>
            <Table size="small" pagination={false} dataSource={d.byPhase} rowKey="phase"
              columns={[
                { title: '단계', dataIndex: 'phase', render: (p) => <Tag>{p}</Tag> },
                { title: '건수', dataIndex: 'count', align: 'right' },
                { title: '매출액', dataIndex: 'sales', align: 'right', render: (v) => won(v) },
                { title: '확도가중', dataIndex: 'weighted', align: 'right', render: (v) => won(v) },
              ]} />
          </div>
          <div className="pane">
            <div className="pane-title"><span>월별 포케스팅 (2026)</span><span className="muted">■ 수주 ■ 확도가중 예상</span></div>
            <Bars data={d.monthly} />
          </div>
        </Col>
        <Col span={14}>
          <div className="pane" style={{ marginBottom: 14 }}>
            <div className="pane-title">
              <span>{view}별 수주 현황</span>
              <Segmented size="small" options={['팀', '담당자']} value={view} onChange={(v) => setView(v as '팀' | '담당자')} />
            </div>
            {view === '팀' ? (
              <Table size="small" pagination={false} dataSource={d.byTeam} columns={[
                { title: '팀', dataIndex: 'team' }, { title: '건수', dataIndex: 'count', align: 'right' },
                { title: '진행 파이프라인', dataIndex: 'forecast', align: 'right', render: won },
                { title: '수주', dataIndex: 'ordered', align: 'right', render: won }, { title: '이익', dataIndex: 'profit', align: 'right', render: won },
              ]} />
            ) : (
              <Table size="small" pagination={false} dataSource={d.byOwner} columns={[
                { title: '담당자', dataIndex: 'owner' }, { title: '팀', dataIndex: 'team' }, { title: '건수', dataIndex: 'count', align: 'right' },
                { title: '수주', dataIndex: 'ordered', align: 'right', render: won }, { title: '이익', dataIndex: 'profit', align: 'right', render: won },
              ]} />
            )}
          </div>
          <Row gutter={14}>
            <Col span={12}>
              <div className="pane">
                <div className="pane-title">파트너(채널) 현황</div>
                <Table size="small" pagination={false} dataSource={d.byPartner} columns={[
                  { title: '파트너', dataIndex: 'partner', render: (v, r) => <span>{v} <Tag style={{ marginLeft: 4 }}>{r.type}</Tag></span> },
                  { title: '건', dataIndex: 'count', align: 'right' },
                  { title: '매출', dataIndex: 'sales', align: 'right', render: (v) => compact(v) },
                  { title: '수수료', dataIndex: 'fee', align: 'right', render: (v) => compact(v) },
                ]} />
              </div>
            </Col>
            <Col span={12}>
              <div className="pane">
                <div className="pane-title">교차검토 경고 · 최근 변경</div>
                <AList size="small" dataSource={[...d.warnings.map((s) => ({ s, w: true })), ...d.recent.filter((s) => !d.warnings.includes(s)).map((s) => ({ s, w: false }))].slice(0, 8)}
                  renderItem={({ s, w }) => (
                    <AList.Item style={{ cursor: 'pointer', padding: '6px 0' }} onClick={() => nav(`/sales/${s.salescd}`)}>
                      <Space size={6} style={{ width: '100%', justifyContent: 'space-between' }}>
                        <span>{w && <Tag color="orange">경고</Tag>}<Typography.Text ellipsis style={{ maxWidth: 220 }}>{s.name}</Typography.Text></span>
                        <StatusTag code={s.status} />
                      </Space>
                    </AList.Item>
                  )} />
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}

function MobileDashboard() {
  const d = useDashboardData();
  const nav = useNavigate();
  const lk = useLookups();
  return (
    <div className="m-body">
      <div className="m-kpis">
        <div className="m-kpi"><div className="l">진행 파이프라인</div><div className="v">{compact(d.kpi.forecast)}</div><div className="m-list-item-sub">{d.kpi.activeCount}건</div></div>
        <div className="m-kpi"><div className="l">수주(당해년도)</div><div className="v">{compact(d.kpi.ordered)}</div><div className="m-list-item-sub">{d.kpi.orderedCount}건</div></div>
        <div className="m-kpi"><div className="l">교차검토 경고</div><div className="v" style={{ color: '#ad6800' }}>{d.kpi.warnings}건</div></div>
        <div className="m-kpi"><div className="l">세금계산서 대기</div><div className="v">{d.kpi.taxPending}건</div></div>
      </div>
      <div className="m-section">
        <div className="m-section-title"><span>월별 포케스팅</span><span className="muted">수주 / 확도가중</span></div>
        <div style={{ padding: '0 12px 12px' }}><Bars data={d.monthly} /></div>
      </div>
      <div className="m-section">
        <div className="m-section-title">내 팀 담당자별 수주</div>
        <MList>
          {d.byOwner.slice(0, 6).map((o) => (
            <MList.Item key={o.key} description={`${o.team} · ${o.count}건`} extra={<span className="m-list-item-amt">{compact(o.ordered)}</span>}>{o.owner}</MList.Item>
          ))}
        </MList>
      </div>
      <div className="m-section">
        <div className="m-section-title">최근 변경 · 경고</div>
        <MList>
          {[...d.warnings, ...d.recent.filter((s) => !d.warnings.includes(s))].slice(0, 6).map((s) => (
            <MList.Item key={s.salescd} onClick={() => nav(`/sales/${s.salescd}`)} description={`${lk.customerName(s.custcd)} · ${lk.userName(s.ownerId)}`} extra={<StatusTag code={s.status} mobile />} clickable>
              {s.crossCheckWarnings?.length ? '⚠ ' : ''}{s.name}
            </MList.Item>
          ))}
        </MList>
      </div>
      <Card style={{ margin: '10px 12px 20px' }}>
        <div className="muted">현장용 화면은 최대 2단 분할(태블릿)·1단(폰)으로 구성됩니다. 상세 수치 분석은 PC 화면에서 확인하세요.</div>
      </Card>
    </div>
  );
}
