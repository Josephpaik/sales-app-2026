import { useState } from 'react';
import { Table, Tag, Button, Space, Segmented, Alert, Statistic, Row, Col, Modal, Form, InputNumber, DatePicker, Input, Descriptions, Typography, App as AntApp } from 'antd';
import { List, Tag as MTag } from 'antd-mobile';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useDB, today } from '@/api/store';
import { currentUser, visibleSales, arStatus, arOutstanding, arRecognitionDate, arCollectionDate, arGraceDays, arWarningDate, registerReceivable, recordPayment, requestExtension, decideExtension, can, decideContractParty, logAudit } from '@/api';
import { useLookups } from '@/components/common';
import { useDevice } from '@/hooks/useDevice';
import type { Receivable, ReceivableStatus } from '@/types';
import { won, compact } from '@/utils/format';

const STATUS_COLOR: Record<ReceivableStatus, string> = { 정상: 'blue', 사전경보: 'gold', 등재대상: 'orange', '미수채권 관리중': 'volcano', 추심대상: 'red', '추심유예 승인': 'purple', 입금완료: 'green' };
const FILTERS: ('전체' | ReceivableStatus)[] = ['전체', '정상', '사전경보', '등재대상', '미수채권 관리중', '추심대상', '추심유예 승인', '입금완료'];

/**
 * 매출채권 — V2.4 규칙
 *  사전경보 = min(계산서일+30, 계약 지급일) · 미수 인식일 = 계약 지급일+1(시스템 계산, 수정 불가)
 *  추심기준 = 직접거래 90일 / 승인등록·부실징후·B+ 이하 60일 / 그 외 90일 · 추심유예는 결재 승인 시에만 상태 유지
 */
export default function ReceivablesPage() {
  const device = useDevice(); const nav = useNavigate(); const lk = useLookups(); const { message } = AntApp.useApp();
  const ars = useDB((d) => d.receivables); const all = useDB((d) => d.sales); const parties = useDB((d) => d.contractParties); useDB((d) => d.session.userId);
  const me = currentUser();
  const codes = new Set(visibleSales(me, all).map((s) => s.salescd));
  const [filter, setFilter] = useState<'전체' | ReceivableStatus>('전체');
  const [detail, setDetail] = useState<Receivable | null>(null);
  const [pay, setPay] = useState<Receivable | null>(null);
  const [ext, setExt] = useState<Receivable | null>(null);
  const [payForm] = Form.useForm(); const [extForm] = Form.useForm();
  const mine = ars.filter((r) => codes.has(r.salescd));
  const rows = mine.filter((r) => filter === '전체' || arStatus(r) === filter).sort((a, b) => arOutstanding(b) - arOutstanding(a));
  const count = (s: ReceivableStatus) => mine.filter((r) => arStatus(r) === s).length;
  const outstanding = mine.reduce((a, r) => a + arOutstanding(r), 0);
  const pendingParties = parties.filter((p) => p.status === '등재기안');
  const grace = (r: Receivable) => `${arGraceDays(r)}일 · ${r.direct ? '고객 직접거래' : r.distress ? '부실징후' : r.approvedRegistration ? '승인등록' : (r.creditRating && arGraceDays(r) === 60) ? 'B+ 이하' : 'BB- 이상'}`;
  const canAct = can.receivable(me);
  const actions = (r: Receivable) => {
    const st = arStatus(r);
    return (
      <Space size={4} wrap>
        <Button size="small" onClick={() => setDetail(r)}>상세</Button>
        {canAct && st === '등재대상' && <Button size="small" type="primary" onClick={() => { registerReceivable(r.id); message.success('미수채권을 등재했습니다 (실제 등재일 기록).'); }}>등재</Button>}
        {canAct && ['추심대상', '미수채권 관리중', '추심유예 승인'].includes(st) && !(r.extension?.status === '요청') && <Button size="small" onClick={() => setExt(r)}>추심유예 {r.extension ? '연장' : '요청'}</Button>}
        {canAct && r.extension?.status === '요청' && <Space size={2}><Button size="small" type="primary" onClick={() => decideExtension(r.id, '승인완료')}>유예 승인</Button><Button size="small" danger onClick={() => decideExtension(r.id, '반려')}>반려</Button></Space>}
        {canAct && st !== '입금완료' && <Button size="small" onClick={() => setPay(r)}>입금 등록</Button>}
      </Space>
    );
  };
  const kpis = (
    <Row gutter={10} style={{ marginBottom: 10 }}>
      <Col flex={1}><Statistic title="미수잔액" value={compact(outstanding)} /></Col>
      <Col flex={1}><Statistic title="사전경보" value={count('사전경보')} suffix="건" styles={{ content: { color: '#ad6800' } }} /></Col>
      <Col flex={1}><Statistic title="등재·관리중" value={count('등재대상') + count('미수채권 관리중')} suffix="건" /></Col>
      <Col flex={1}><Statistic title="추심대상" value={count('추심대상')} suffix="건" styles={{ content: { color: '#cf1322' } }} /></Col>
      <Col flex={1}><Statistic title="추심유예 승인" value={count('추심유예 승인')} suffix="건" /></Col>
      <Col flex={1}><Statistic title="거래처 등재결재" value={pendingParties.length} suffix="건" /></Col>
    </Row>
  );
  const modals = (
    <>
      <Modal open={!!detail} title={`채권 상세 · ${detail?.id}`} footer={null} onCancel={() => setDetail(null)} width={640}>
        {detail && <Descriptions size="small" bordered column={2}>
          <Descriptions.Item label="거래처">{detail.partyName} {detail.direct && <Tag>직접거래</Tag>}</Descriptions.Item><Descriptions.Item label="신용등급">{detail.creditRating ?? '-'} {detail.distress && <Tag color="red">부실징후</Tag>}{detail.approvedRegistration && <Tag color="purple">승인등록</Tag>}</Descriptions.Item>
          <Descriptions.Item label="프로젝트"><a onClick={() => nav(`/sales/${detail.salescd}`)}>{detail.salescd}</a></Descriptions.Item><Descriptions.Item label="상태"><Tag color={STATUS_COLOR[arStatus(detail)]}>{arStatus(detail)}</Tag></Descriptions.Item>
          <Descriptions.Item label="계산서일">{detail.invoiceDate}</Descriptions.Item><Descriptions.Item label="계약 지급일">{detail.contractDue ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="사전경보일">{arWarningDate(detail)}</Descriptions.Item><Descriptions.Item label="미수 인식일 (시스템)">{arRecognitionDate(detail)}</Descriptions.Item>
          <Descriptions.Item label="추심기준">{grace(detail)}</Descriptions.Item><Descriptions.Item label="추심개시일">{arCollectionDate(detail)}</Descriptions.Item>
          <Descriptions.Item label="채권액 / 입금 / 미수">{won(detail.amount)} / {won(detail.paid)} / <b>{won(arOutstanding(detail))}</b></Descriptions.Item><Descriptions.Item label="실제 등재일">{detail.registeredAt ?? '-'}</Descriptions.Item>
          {detail.extension && <Descriptions.Item label="추심유예" span={2}>{detail.extension.status} · ~{detail.extension.until} · {detail.extension.reason}</Descriptions.Item>}
          {detail.note && <Descriptions.Item label="비고" span={2}>{detail.note}</Descriptions.Item>}
        </Descriptions>}
      </Modal>
      <Modal open={!!pay} title="입금 등록" destroyOnHidden onCancel={() => setPay(null)} okText="등록" cancelText="취소" afterOpenChange={(o) => { if (o && pay) payForm.setFieldsValue({ amount: arOutstanding(pay) }); }} onOk={async () => { const v = await payForm.validateFields(); if (pay) { recordPayment(pay.id, v.amount); message.success('입금을 반영했습니다. 전액 입금 시 완료(수금)으로 자동 전환됩니다.'); } setPay(null); }}>
        <Form form={payForm} layout="vertical"><Form.Item name="amount" label={`입금액 (미수잔액 ${pay ? won(arOutstanding(pay)) : ''})`} rules={[{ required: true, type: 'number', min: 1 }]}><InputNumber style={{ width: '100%' }} min={1} max={pay ? arOutstanding(pay) : undefined} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => Number(String(v).replace(/,/g, ''))} /></Form.Item></Form>
      </Modal>
      <Modal open={!!ext} title="추심유예 요청 (결재)" destroyOnHidden onCancel={() => setExt(null)} okText="상신" cancelText="취소" afterOpenChange={(o) => { if (o) { extForm.resetFields(); extForm.setFieldsValue({ until: dayjs(today()).add(30, 'day') }); } }} onOk={async () => { const v = await extForm.validateFields(); if (ext) { requestExtension(ext.id, v.until.format('YYYY-MM-DD'), v.reason); logAudit('등록', ext.id, '추심유예 요청'); message.success('추심유예 요청을 상신했습니다. 승인 전까지 상태는 유지됩니다.'); } setExt(null); }}>
        <Form form={extForm} layout="vertical"><Form.Item name="until" label="유예 기한" rules={[{ required: true }]}><DatePicker /></Form.Item><Form.Item name="reason" label="사유" rules={[{ required: true }]}><Input.TextArea rows={2} placeholder="예: 기능이슈 및 검수지연" /></Form.Item></Form>
      </Modal>
    </>
  );
  if (device !== 'desktop') {
    return (
      <div>
        <div className="m-kpis"><div className="m-kpi"><div className="l">미수잔액</div><div className="v">{compact(outstanding)}</div></div><div className="m-kpi"><div className="l">추심대상</div><div className="v" style={{ color: '#cf1322' }}>{count('추심대상')}건</div></div><div className="m-kpi"><div className="l">사전경보</div><div className="v">{count('사전경보')}건</div></div><div className="m-kpi"><div className="l">등재·관리중</div><div className="v">{count('등재대상') + count('미수채권 관리중')}건</div></div></div>
        <List style={{ margin: 10, borderRadius: 12, overflow: 'hidden' }}>{rows.map((r) => <List.Item key={r.id} onClick={() => setDetail(r)} clickable description={`${r.salescd} · 계산서 ${r.invoiceDate} · 추심개시 ${arCollectionDate(r)}`} extra={<div style={{ textAlign: 'right' }}><div className="m-list-item-amt">{compact(arOutstanding(r))}</div><MTag color={arStatus(r) === '추심대상' ? 'danger' : arStatus(r) === '입금완료' ? 'success' : 'warning'} fill="outline">{arStatus(r)}</MTag></div>}>{r.partyName}</List.Item>)}</List>
        {modals}
      </div>
    );
  }
  return (
    <div className="pane">
      {kpis}
      <Alert type="info" showIcon style={{ marginBottom: 10 }} message="미수 인식일을 사람이 늦출 수 없도록 시스템 계산일(계약 지급일 + 1)을 기준으로 관리합니다. 추심기준: 직접거래 90일, 승인등록·부실징후·B+ 이하 60일. 거래처 등재기안은 계약 등록 단계(계약처 확정 시)에서 시작합니다." />
      <div className="pane-title"><span>매출채권 보고서</span><Segmented size="small" value={filter} onChange={(v) => setFilter(v as typeof filter)} options={FILTERS.map((f) => ({ value: f, label: f === '전체' ? '전체' : `${f} ${count(f as ReceivableStatus)}` }))} /></div>
      <Table size="small" dataSource={rows} rowKey="id" pagination={{ pageSize: 15, size: 'small' }} scroll={{ x: 1300 }} columns={[
        { title: '거래처 / 프로젝트', width: 170, render: (_, r) => <><b>{r.partyName}</b><div className="muted"><a onClick={() => nav(`/sales/${r.salescd}`)}>{r.salescd}</a> · {lk.userName(all.find((s) => s.salescd === r.salescd)?.ownerId ?? '')}</div></> },
        { title: '거래구분', width: 90, render: (_, r) => r.direct ? '고객 직접거래' : r.approvedRegistration ? '승인등록' : '거래처거래' },
        { title: '신용등급', width: 90, render: (_, r) => <span>{r.creditRating ?? '-'}{r.distress && <Tag color="red" style={{ marginLeft: 4 }}>부실징후</Tag>}</span> },
        { title: '계산서일', dataIndex: 'invoiceDate', width: 100 }, { title: '계약 지급일', dataIndex: 'contractDue', width: 100 },
        { title: '미수 인식일', width: 100, render: (_, r) => arRecognitionDate(r) }, { title: '실제 등재일', dataIndex: 'registeredAt', width: 100, render: (v) => v ?? '-' },
        { title: '추심기준', width: 130, render: (_, r) => grace(r) }, { title: '추심개시일', width: 100, render: (_, r) => arCollectionDate(r) },
        { title: '채권액', dataIndex: 'amount', width: 110, align: 'right', render: won }, { title: '입금액', dataIndex: 'paid', width: 100, align: 'right', render: won },
        { title: '미수잔액', width: 110, align: 'right', render: (_, r) => <b>{won(arOutstanding(r))}</b> },
        { title: '상태', width: 120, render: (_, r) => <Tag color={STATUS_COLOR[arStatus(r)]}>{arStatus(r)}</Tag> },
        { title: '처리', width: 250, fixed: 'right', render: (_, r) => actions(r) },
      ]} />
      <div className="pane-title" style={{ marginTop: 16 }}><span>거래처 등재 결재 대기 <span className="muted">{pendingParties.length}건 · 승인 후 계약처 마스터에 등재</span></span></div>
      <Table size="small" dataSource={pendingParties} rowKey="id" pagination={false} columns={[
        { title: '거래처', dataIndex: 'name' }, { title: '사업자번호', dataIndex: 'bizNo', width: 130 }, { title: '신용등급', dataIndex: 'creditRating', width: 90 }, { title: '거래구분', width: 100, render: (_, p) => p.direct ? '직접거래' : '거래처' },
        { title: '기안', width: 160, render: (_, p) => `${p.requestedBy} · ${p.requestedAt}` }, { title: '연결 프로젝트', dataIndex: 'linkedSalescd', width: 110, render: (v) => v ?? '-' },
        { title: '처리', width: 160, render: (_, p) => can.approvePartner(me) ? <Space size={4}><Button size="small" type="primary" onClick={() => decideContractParty(p.id, '등재')}>등재 승인</Button><Button size="small" danger onClick={() => decideContractParty(p.id, '반려')}>반려</Button></Space> : <Typography.Text type="secondary">승인 권한 없음</Typography.Text> },
      ]} locale={{ emptyText: '대기 중인 등재기안이 없습니다' }} />
      {modals}
    </div>
  );
}
