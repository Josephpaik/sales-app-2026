import { useState } from 'react';
import { Table, Tag, Button, Space, Segmented, Alert, Typography, Statistic, Row, Col, App as AntApp } from 'antd';
import { CheckOutlined, StopOutlined } from '@ant-design/icons';
import { List, Tag as MTag, Button as MButton, Dialog, Toast, CapsuleTabs } from 'antd-mobile';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { currentUser, can, decideRecon } from '@/api';
import type { TqsReconException } from '@/types';

const STATUS_LABEL: Record<TqsReconException['status'], string> = { open: '미처리', accepted_new: '신규 시스템 값 유지', accepted_tqs: 'TQS 값 반영', ignored: '무시' };

/** TQS 고객 마스터 대사 예외 (§3-2 ③) — 자동 덮어쓰기 없음, 영업지원부서가 확정 */
export default function ReconPage() {
  const device = useDevice();
  const recon = useDB((d) => d.tqsRecon);
  const [view, setView] = useState<'open' | 'done'>('open');
  const rows = recon.filter((r) => (view === 'open' ? r.status === 'open' : r.status !== 'open'));
  useDB((d) => d.session.userId);
  const me = currentUser();
  const { message } = AntApp.useApp();
  const decide = (r: TqsReconException, d: TqsReconException['status']) => { decideRecon(r.id, d); message.success(`${r.customerName} · ${r.field}: ${STATUS_LABEL[d]}`); };
  const stats = { open: recon.filter((r) => r.status === 'open').length, done: recon.filter((r) => r.status !== 'open').length, last: '2026-09-18 06:00', compared: 4451 };

  if (device !== 'desktop') {
    return (
      <div className="m-body">
        <div className="m-kpis"><div className="m-kpi"><div className="l">미처리</div><div className="v" style={{ color: '#cf1322' }}>{stats.open}</div></div><div className="m-kpi"><div className="l">처리 완료</div><div className="v">{stats.done}</div></div></div>
        <div style={{ padding: '10px 12px 0' }}><CapsuleTabs activeKey={view} onChange={(k) => setView(k as 'open')}><CapsuleTabs.Tab title={`미처리 ${stats.open}`} key="open" /><CapsuleTabs.Tab title="처리 완료" key="done" /></CapsuleTabs></div>
        <List style={{ margin: 10, borderRadius: 12, overflow: 'hidden' }}>
          {rows.map((r) => (
            <List.Item key={r.id} description={<div>신규: <b>{r.newSystemValue}</b><br />TQS: <b>{r.tqsValue}</b>{r.status !== 'open' && <div className="m-list-item-sub">{STATUS_LABEL[r.status]} · {r.decidedBy}</div>}</div>}
              extra={r.status === 'open' && can.reconDecide(me) && <MButton size="mini" color="primary" onClick={() => { Dialog.show({ title: `${r.customerName} · ${r.field}`, closeOnAction: true, actions: [[{ key: 'new', text: '신규 값 유지', onClick: () => { decideRecon(r.id, 'accepted_new'); Toast.show('처리'); } }, { key: 'tqs', text: 'TQS 값 반영', onClick: () => { decideRecon(r.id, 'accepted_tqs'); Toast.show('처리'); } }], { key: 'c', text: '취소' }] }); }}>판정</MButton>}>
              <MTag fill="outline">{r.custcd}</MTag> {r.customerName} · {r.field}
            </List.Item>
          ))}
        </List>
      </div>
    );
  }

  return (
    <div className="pane" style={{ minHeight: 'calc(100vh - 96px)' }}>
      <Row gutter={14} style={{ marginBottom: 12 }}>
        <Col span={5}><Statistic title="마지막 대사 배치" value={stats.last} styles={{ content: { fontSize: 18 } }} /></Col>
        <Col span={4}><Statistic title="비교 건수 (TQS custcd)" value={stats.compared} /></Col>
        <Col span={4}><Statistic title="미처리 예외" value={stats.open} styles={{ content: { color: stats.open ? '#cf1322' : undefined } }} /></Col>
        <Col span={4}><Statistic title="처리 완료" value={stats.done} /></Col>
        <Col span={7}><Alert type="info" showIcon message="매일 06:00 TQS 고객 마스터를 읽어(DB 읽기 계정 또는 CSV — 확인필요) 신규 시스템과 대사. 차이 건은 여기서 영업지원부서가 확정하며 자동 덮어쓰기는 없습니다." /></Col>
      </Row>
      <div className="pane-title"><span>대사 예외 목록</span><Segmented value={view} onChange={(v) => setView(v as 'open')} options={[{ value: 'open', label: `미처리 (${stats.open})` }, { value: 'done', label: `처리 완료 (${stats.done})` }]} /></div>
      <Table size="small" dataSource={rows} rowKey="id" pagination={false} columns={[
        { title: '탐지', dataIndex: 'detectedAt', width: 130 },
        { title: 'custcd', dataIndex: 'custcd', width: 80 },
        { title: '고객사', dataIndex: 'customerName', width: 140 },
        { title: '항목', dataIndex: 'field', width: 100, render: (v) => <Tag>{v}</Tag> },
        { title: '신규 시스템 값', dataIndex: 'newSystemValue', render: (v) => <Typography.Text strong>{v}</Typography.Text> },
        { title: 'TQS 값', dataIndex: 'tqsValue', render: (v) => <Typography.Text type="warning" strong>{v}</Typography.Text> },
        { title: '판정', width: 300, render: (_, r) => r.status === 'open'
          ? (can.reconDecide(me) ? <Space size={4}><Button size="small" icon={<CheckOutlined />} onClick={() => decide(r, 'accepted_new')}>신규 값 유지</Button><Button size="small" type="primary" onClick={() => decide(r, 'accepted_tqs')}>TQS 값 반영</Button><Button size="small" icon={<StopOutlined />} onClick={() => decide(r, 'ignored')}>무시</Button></Space> : <span className="muted">영업지원부서·관리자만 판정</span>)
          : <span><Tag color={r.status === 'ignored' ? 'default' : 'green'}>{STATUS_LABEL[r.status]}</Tag><span className="muted">{r.decidedBy} · {r.decidedAt}</span></span> },
      ]} />
    </div>
  );
}
