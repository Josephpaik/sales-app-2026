import { Table, Tag, Select, Progress, Statistic, Row, Col, Alert, Button, Space, App as AntApp } from 'antd';
import { List, Tag as MTag, ProgressBar } from 'antd-mobile';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { currentUser, can, mapAlias } from '@/api';
import type { GoldmineAlias } from '@/types';

const STATUS: Record<GoldmineAlias['status'], { label: string; color: string }> = { mapped: { label: '매핑 확정', color: 'green' }, candidate: { label: '후보', color: 'gold' }, unmapped: { label: '미매핑', color: 'red' } };

/** 골드마인 고객사명 매핑 테이블 (§3-2 ④) — 표본 매핑률 산정, 2차 이슈 이관 시 키 복원 근거 */
export default function GoldminePage() {
  const device = useDevice();
  const aliases = useDB((d) => d.goldmineAliases);
  const customers = useDB((d) => d.customers);
  const me = currentUser();
  const { message } = AntApp.useApp();
  const totalIssues = aliases.reduce((a, x) => a + x.issueCount, 0);
  const mappedIssues = aliases.filter((a) => a.status === 'mapped').reduce((a, x) => a + x.issueCount, 0);
  const rate = Math.round((mappedIssues / totalIssues) * 1000) / 10;
  const custName = (c?: string) => customers.find((x) => x.custcd === c)?.name ?? '-';

  if (device !== 'desktop') {
    return (
      <div className="m-body">
        <div className="m-section" style={{ padding: 14 }}><div className="muted">표본 매핑률 (이슈 건수 기준, 표본 {totalIssues}건)</div><div style={{ fontSize: 24, fontWeight: 700 }}>{rate}%</div><ProgressBar percent={rate} /></div>
        <List style={{ margin: 10, borderRadius: 12, overflow: 'hidden' }}>{aliases.map((a) => <List.Item key={a.id} description={`이슈 ${a.issueCount}건 → ${custName(a.custcd)} (${a.confidence}%)`} extra={<MTag color={a.status === 'mapped' ? 'success' : a.status === 'candidate' ? 'warning' : 'danger'} fill="outline">{STATUS[a.status].label}</MTag>}>{a.aliasName}</List.Item>)}</List>
        <div className="muted" style={{ padding: '0 16px 20px' }}>매핑 확정은 PC 화면에서 수행합니다.</div>
      </div>
    );
  }

  return (
    <div className="pane" style={{ minHeight: 'calc(100vh - 96px)' }}>
      <Row gutter={14} style={{ marginBottom: 12 }} align="middle">
        <Col span={4}><Statistic title="표본 이슈 건수" value={totalIssues} /></Col>
        <Col span={4}><Statistic title="매핑 확정 이슈" value={mappedIssues} /></Col>
        <Col span={5}><div className="muted">표본 매핑률 (건수 가중)</div><Progress percent={rate} strokeColor={rate >= 80 ? '#237804' : '#fa8c16'} /></Col>
        <Col span={11}><Alert type="info" showIcon message="골드마인 이슈의 고객사명(자유 텍스트)을 신규 고객 마스터(custcd)에 매핑합니다. 최근 1,000건 표본 기준 매핑률을 완료 보고에 포함하며, 2차 이슈 이관 시 이 테이블이 키 복원 근거가 됩니다. (처리방안 재검토 필요 — v1.1)" /></Col>
      </Row>
      <Table size="small" dataSource={aliases} rowKey="id" pagination={false} columns={[
        { title: '골드마인 고객사명 (자유 입력)', dataIndex: 'aliasName', render: (v) => <b>{v}</b> },
        { title: '이슈 건수', dataIndex: 'issueCount', width: 90, align: 'right', sorter: (a, b) => a.issueCount - b.issueCount },
        { title: '매핑 대상 (custcd)', width: 300, render: (_, r) => can.editMaster(me)
          ? <Select size="small" allowClear showSearch optionFilterProp="label" style={{ width: '100%' }} value={r.custcd} placeholder="고객사 선택" onChange={(v) => { mapAlias(r.id, v, v ? 'candidate' : 'unmapped'); }} options={customers.map((c) => ({ value: c.custcd, label: `${c.name} (${c.custcd})` }))} />
          : <span>{custName(r.custcd)} <span className="muted">{r.custcd}</span></span> },
        { title: '유사도', dataIndex: 'confidence', width: 140, render: (v) => <Progress percent={v} size="small" strokeColor={v >= 90 ? '#237804' : v >= 70 ? '#fa8c16' : '#cf1322'} /> },
        { title: '상태', dataIndex: 'status', width: 100, render: (v: GoldmineAlias['status']) => <Tag color={STATUS[v].color}>{STATUS[v].label}</Tag> },
        { title: '', width: 120, render: (_, r) => can.editMaster(me) && r.status !== 'mapped' && r.custcd ? <Space><Button size="small" type="primary" onClick={() => { mapAlias(r.id, r.custcd, 'mapped'); message.success(`'${r.aliasName}' → ${custName(r.custcd)} 확정`); }}>확정</Button></Space> : null },
      ]} />
    </div>
  );
}
