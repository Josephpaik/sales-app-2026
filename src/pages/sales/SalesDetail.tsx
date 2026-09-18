import { useState } from 'react';
import { Descriptions, Tabs, Table, Button, Dropdown, Space, Tag, Alert, Timeline, Modal, Form, Select, InputNumber, Input, App as AntApp, Empty, Typography, Popconfirm, Upload } from 'antd';
import { PlusOutlined, EditOutlined, SwapOutlined, PaperClipOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { SalesOpportunity, SalesLine, SalesStatus, Relation } from '@/types';
import { statusDef, SALES_TYPE_LABEL, RELATIONS } from '@/types';
import { StatusTag, TaxTag, Prob, useLookups } from '@/components/common';
import { lineTotals, transitionSales, upsertLine, removeLine, addActivity, addAttachment, currentUser, can } from '@/api';
import { useDB } from '@/api/store';
import { won, pct } from '@/utils/format';
import { uid } from '@/api/store';

interface Props {
  sales: SalesOpportunity;
  onEdit: () => void;
  compact?: boolean; // 3단 우측 미리보기
}

/** 영업 건 상세 (PC) — 현행 16블록 단일 화면을 탭으로 재구성 */
export default function SalesDetail({ sales: s, onEdit, compact }: Props) {
  const lk = useLookups();
  const nav = useNavigate();
  const { message } = AntApp.useApp();
  const contract = useDB((d) => d.contracts.find((c) => c.id === s.contractId));
  const me = currentUser();
  const t = lineTotals(s.lines);
  const def = statusDef(s.status);
  const [lineModal, setLineModal] = useState<SalesLine | null | 'new'>(null);
  const [actModal, setActModal] = useState(false);
  const editable = can.editSales(me) && !s.legacy;

  const doTransition = (to: SalesStatus) => {
    const r = transitionSales(s.salescd, to);
    if (!r.ok) return message.error(r.warnings[0]);
    if (r.warnings.length) Modal.warning({ title: '상태를 변경했습니다 (경고 기록)', content: <ul className="warn-list">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul> });
    else message.success(`상태 변경: ${statusDef(to).name}`);
  };

  const transitionMenu = { items: def.next.map((n) => ({ key: n, label: statusDef(n).name })), onClick: ({ key }: { key: string }) => doTransition(key as SalesStatus) };

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
      <div>
        <Space size={6} wrap>
          <Typography.Text type="secondary">{s.salescd}</Typography.Text>
          <StatusTag code={s.status} />
          {s.legacy && <Tag>이전영업(조회용)</Tag>}
          {s.crossCheckWarnings?.map((w) => <Tag key={w} color="orange">경고</Tag>)}
        </Space>
        <Typography.Title level={compact ? 5 : 4} style={{ margin: '4px 0 0' }}>{s.name}</Typography.Title>
        <Typography.Text type="secondary">{lk.customerName(s.custcd)} · {lk.teamName(s.teamId)} / {lk.userName(s.ownerId)}</Typography.Text>
      </div>
      <Space>
        {editable && def.next.length > 0 && <Dropdown menu={transitionMenu}><Button icon={<SwapOutlined />}>상태 전이</Button></Dropdown>}
        {editable && <Button icon={<EditOutlined />} onClick={onEdit}>수정</Button>}
      </Space>
    </div>
  );

  const basic = (
    <>
      {s.crossCheckWarnings?.length ? <Alert type="warning" showIcon style={{ marginBottom: 10 }} message="교차검토(C-1) 경고" description={<ul style={{ margin: 0, paddingLeft: 18 }}>{s.crossCheckWarnings.map((w) => <li key={w}>{w}</li>)}</ul>} /> : null}
      <Descriptions size="small" bordered column={compact ? 1 : 2} styles={{ label: { width: 120 } }}>
        <Descriptions.Item label="고객사"><a onClick={() => nav(`/customers/${s.custcd}`)}>{lk.customerName(s.custcd)}</a> <span className="muted">{s.custcd}</span></Descriptions.Item>
        <Descriptions.Item label="계약처">{s.partyName ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="영업구분">{s.salesType} · {SALES_TYPE_LABEL[s.salesType]}</Descriptions.Item>
        <Descriptions.Item label="도입관계">{s.relation}</Descriptions.Item>
        <Descriptions.Item label="수주확도"><Prob value={s.probability} /></Descriptions.Item>
        <Descriptions.Item label="매출시기">{s.forecastYm}</Descriptions.Item>
        <Descriptions.Item label="포케스팅일">{s.forecastDate}</Descriptions.Item>
        <Descriptions.Item label="수주일">{s.orderDate ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="파트너">{s.partnerId ? <a onClick={() => nav(`/partners/${s.partnerId}`)}>{lk.partnerName(s.partnerId)}</a> : '-'}</Descriptions.Item>
        <Descriptions.Item label="TQS 프로젝트코드">{s.tqsProjectCode ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="세금계산서"><TaxTag code={s.taxStatus} /> {s.taxDate}</Descriptions.Item>
        <Descriptions.Item label="계약">{contract ? <a onClick={() => nav(`/contracts/${contract.id}`)}>{contract.id}</a> : <span className="muted">미등록</span>}</Descriptions.Item>
        <Descriptions.Item label="매출 / 매입 / 이익" span={2}><b>{won(t.sales)}</b> / {won(t.buy)} / <b style={{ color: '#237804' }}>{won(t.profit)}</b> <Tag>{pct(t.margin)}</Tag></Descriptions.Item>
        {s.memo && <Descriptions.Item label="비고" span={2}>{s.memo}</Descriptions.Item>}
      </Descriptions>
    </>
  );

  const lines = (
    <>
      <div className="summary-bar">
        <span>매출합계 <b>{won(t.sales)}</b></span><span>매입합계 <b>{won(t.buy)}</b></span><span>이익 <b>{won(t.profit)}</b></span><span>이익률 <b>{pct(t.margin)}</b></span>
        {editable && <Button size="small" type="primary" icon={<PlusOutlined />} style={{ marginLeft: 'auto' }} onClick={() => setLineModal('new')}>라인 추가</Button>}
      </div>
      <Table size="small" pagination={false} dataSource={s.lines} rowKey="id" scroll={{ x: 700 }}
        columns={[
          { title: '구분', dataIndex: 'kind', width: 56, render: (k) => <Tag color={k === '매출' ? 'blue' : 'volcano'}>{k}</Tag> },
          { title: '제품', dataIndex: 'productCode', render: (c, r) => c ? lk.productName(c) : <span className="muted">{r.itemName}</span> },
          { title: '사양/항목', dataIndex: 'itemName' },
          { title: '도입관계', dataIndex: 'relation', width: 80 },
          { title: '수량', dataIndex: 'qty', align: 'right', width: 60 },
          { title: '단가', dataIndex: 'unitPrice', align: 'right', render: won },
          { title: '매출', dataIndex: 'sales', align: 'right', render: won },
          { title: '매입', dataIndex: 'buy', align: 'right', render: won },
          { title: '이익', align: 'right', render: (_, r) => won(r.sales - r.buy) },
          { title: 'HB', dataIndex: 'hbModel', width: 70, render: (v) => v ?? '-' },
          ...(editable ? [{ title: '', width: 70, render: (_: unknown, r: SalesLine) => <Space size={2}><Button size="small" type="text" icon={<EditOutlined />} onClick={() => setLineModal(r)} /><Popconfirm title="삭제할까요?" onConfirm={() => removeLine(s.salescd, r.id)}><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Popconfirm></Space> }] : []),
        ]} />
      <div className="muted" style={{ marginTop: 6 }}>HB 시리얼·출고 이력, 문서번호, 매입 대금지급 상태는 데이터 모델에 자리만 확보(검토/후속).</div>
    </>
  );

  const contractTab = contract ? (
    <Descriptions size="small" bordered column={compact ? 1 : 2}>
      <Descriptions.Item label="계약번호"><a onClick={() => nav(`/contracts/${contract.id}`)}>{contract.id}</a></Descriptions.Item>
      <Descriptions.Item label="유형">{contract.type}</Descriptions.Item>
      <Descriptions.Item label="계약처">{contract.party}</Descriptions.Item>
      <Descriptions.Item label="체결일">{contract.signedAt}</Descriptions.Item>
      <Descriptions.Item label="공급가액">{won(contract.amount)}</Descriptions.Item>
      <Descriptions.Item label="부가세">{won(contract.vat)}</Descriptions.Item>
      <Descriptions.Item label="기간">{contract.start} ~ {contract.end}</Descriptions.Item>
      <Descriptions.Item label="MA 요율">{contract.maRate ?? '-'}% (무상 {contract.freeMaMonths}개월)</Descriptions.Item>
      <Descriptions.Item label="계약서 원문" span={2}>
        {can.readContractFile(me) ? contract.attachments.map((a) => <Tag key={a.id} icon={<PaperClipOutlined />}>{a.name}</Tag>) : <span className="muted">열람 권한 없음 (영업지원·재무·MA·경영진·관리자만 열람 — v2.3 B-2)</span>}
      </Descriptions.Item>
    </Descriptions>
  ) : (
    <Empty description="계약 정보가 없습니다. 수주 이후 계약 메뉴에서 등록합니다.">{editable && ['수주', '이행'].includes(def.phase) && <Button type="primary" onClick={() => nav(`/contracts?new=${s.salescd}`)}>계약 등록</Button>}</Empty>
  );

  const activity = (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>{editable && <Button size="small" icon={<PlusOutlined />} onClick={() => setActModal(true)}>활동 기록</Button>}</div>
      <Timeline items={[
        ...s.activities.map((a) => ({ color: 'blue', children: <><b>{a.kind}</b> {a.text} <span className="muted">— {a.by} · {a.at}</span></> })),
        ...s.history.map((h) => ({ color: h.kind === '상태' ? 'green' : 'gray', children: <>{h.text} <span className="muted">— {h.by} · {h.at}</span></> })),
      ].slice(0, 30)} />
    </>
  );

  const files = (
    <>
      {editable && <Upload beforeUpload={(f) => { addAttachment(s.salescd, f.name, /견적/.test(f.name) ? '견적서' : /원가/.test(f.name) ? '원가명세서' : '기타'); message.success('첨부 목록에 추가했습니다 (파일 본문은 저장하지 않는 시연).'); return false; }} showUploadList={false}><Button size="small" icon={<PaperClipOutlined />} style={{ marginBottom: 8 }}>첨부 추가</Button></Upload>}
      <Table size="small" pagination={false} dataSource={s.attachments} rowKey="id" columns={[
        { title: '유형', dataIndex: 'type', width: 90, render: (v) => <Tag>{v}</Tag> },
        { title: '파일명', dataIndex: 'name' },
        { title: '등록', dataIndex: 'uploadedAt', width: 100 },
        { title: '등록자', dataIndex: 'by', width: 80 },
        { title: '문서번호', dataIndex: 'docNo', width: 100, render: (v) => v ?? <span className="muted">(후속)</span> },
      ]} locale={{ emptyText: '첨부 없음' }} />
    </>
  );

  return (
    <div>
      {header}
      <Tabs size="small" items={[
        { key: 'basic', label: '기본정보', children: basic },
        { key: 'lines', label: `제품 라인 (${s.lines.length})`, children: lines },
        { key: 'contract', label: '계약', children: contractTab },
        { key: 'activity', label: '활동·이력', children: activity },
        { key: 'files', label: `첨부 (${s.attachments.length})`, children: files },
      ]} />
      <LineModal open={lineModal !== null} line={lineModal === 'new' ? undefined : lineModal ?? undefined} onClose={() => setLineModal(null)} salescd={s.salescd} />
      <ActivityModal open={actModal} onClose={() => setActModal(false)} salescd={s.salescd} />
    </div>
  );
}

export function LineModal({ open, line, onClose, salescd }: { open: boolean; line?: SalesLine; onClose: () => void; salescd: string }) {
  const [form] = Form.useForm();
  const lk = useLookups();
  const kind = Form.useWatch('kind', form);
  const qty = Form.useWatch('qty', form);
  const unitPrice = Form.useWatch('unitPrice', form);
  const productCode = Form.useWatch('productCode', form);
  const product = lk.products.find((p) => p.code === productCode);
  return (
    <Modal open={open} title={line ? '제품 라인 수정' : '제품 라인 추가'} destroyOnHidden onCancel={onClose} okText="저장" cancelText="취소"
      afterOpenChange={(o) => { if (o) { form.resetFields(); form.setFieldsValue(line ?? { kind: '매출', relation: '신규', qty: 1, unitPrice: 0, buy: 0 }); } }}
      onOk={async () => {
        const v = await form.validateFields();
        const sales = v.kind === '매출' ? (v.qty ?? 0) * (v.unitPrice ?? 0) : 0;
        upsertLine(salescd, { id: line?.id ?? uid('L'), kind: v.kind, productCode: v.productCode, itemName: v.itemName || (product ? `${v.qty} ${product.unit}` : '항목'), relation: v.relation as Relation, qty: v.qty, unitPrice: v.unitPrice, sales, buy: v.buy ?? 0, hbModel: product?.hb ? product.name.replace('HyBoost ', '') : undefined });
        onClose();
      }}>
      <Form form={form} layout="vertical">
        <Space size={12} style={{ display: 'flex' }}>
          <Form.Item name="kind" label="구분" rules={[{ required: true }]}><Select style={{ width: 100 }} options={[{ value: '매출' }, { value: '매입' }]} /></Form.Item>
          <Form.Item name="relation" label="도입관계"><Select style={{ width: 130 }} options={RELATIONS.map((r) => ({ value: r }))} /></Form.Item>
          <Form.Item name="productCode" label="제품" style={{ flex: 1, minWidth: 220 }}><Select allowClear showSearch optionFilterProp="label" options={lk.products.filter((p) => p.active).map((p) => ({ value: p.code, label: `${p.name} ${p.version !== '-' ? 'v' + p.version : ''} (${p.unit})` }))} /></Form.Item>
        </Space>
        <Form.Item name="itemName" label={kind === '매입' ? '매입 항목명' : '라이선스 사양'}><Input placeholder={kind === '매입' ? '예: 영업수수료, L4 스위치' : '예: 500 Users'} /></Form.Item>
        <Space size={12}>
          <Form.Item name="qty" label="수량"><InputNumber min={0} /></Form.Item>
          <Form.Item name="unitPrice" label="판매단가"><InputNumber min={0} step={10000} style={{ width: 160 }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item>
          <Form.Item name="buy" label="매입원가"><InputNumber min={0} step={10000} style={{ width: 160 }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item>
        </Space>
        <div className="summary-bar">매출액(자동) <b>{won(kind === '매출' ? (qty ?? 0) * (unitPrice ?? 0) : 0)}</b></div>
      </Form>
    </Modal>
  );
}

function ActivityModal({ open, onClose, salescd }: { open: boolean; onClose: () => void; salescd: string }) {
  const [form] = Form.useForm();
  return (
    <Modal open={open} title="영업 활동 기록" destroyOnHidden onCancel={onClose} okText="저장" cancelText="취소"
      onOk={async () => { const v = await form.validateFields(); addActivity(salescd, v); onClose(); }}>
      <Form form={form} layout="vertical" initialValues={{ kind: '방문' }}>
        <Form.Item name="kind" label="활동 유형"><Select options={['방문', '통화', '메일', '회의', '메모'].map((k) => ({ value: k }))} /></Form.Item>
        <Form.Item name="text" label="내용" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Modal>
  );
}
