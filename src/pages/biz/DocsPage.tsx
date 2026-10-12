import { useEffect, useState } from 'react';
import { Table, Button, Space, Select, Input, Tag, Modal, Form, DatePicker, Statistic, Row, Col, App as AntApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { List, Tag as MTag, SearchBar } from 'antd-mobile';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDB, today } from '@/api/store';
import { currentUser, visibleSales, registerDocument, can } from '@/api';
import { useLookups } from '@/components/common';
import { useDevice } from '@/hooks/useDevice';
import { DOC_TYPES, DOC_PREFIX, type DocType } from '@/types';

/** 통합문서함 — 문서번호(SMS-{유형}-{YYMM}-{NNN}) · 프로젝트코드 · 고객사 기준 교차조회, 문서 등록 (V2.4) */
export default function DocsPage() {
  const device = useDevice(); const nav = useNavigate(); const lk = useLookups(); const { message } = AntApp.useApp();
  const [sp, setSp] = useSearchParams();
  const docs = useDB((d) => d.documents); const all = useDB((d) => d.sales); useDB((d) => d.session.userId);
  const me = currentUser();
  const codes = new Set(visibleSales(me, all).map((s) => s.salescd));
  const [type, setType] = useState<DocType | undefined>();
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; salescd?: string; type?: DocType }>({ open: false });
  const [form] = Form.useForm();
  useEffect(() => { const n = sp.get('new'); if (n) { setModal({ open: true, salescd: n, type: (sp.get('type') as DocType) ?? undefined }); setSp({}); } }, [sp, setSp]);
  const rows = docs.filter((d) => codes.has(d.salescd) && (!type || d.type === type) && (!q || `${d.docNo} ${d.salescd} ${d.name} ${lk.customerName(all.find((s) => s.salescd === d.salescd)?.custcd ?? '')}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.date.localeCompare(a.date));
  const modalEl = (
    <Modal open={modal.open} title="문서 등록" destroyOnHidden onCancel={() => setModal({ open: false })} okText="등록 (문서번호 부여)" cancelText="취소"
      afterOpenChange={(o) => { if (o) { form.resetFields(); form.setFieldsValue({ salescd: modal.salescd, type: modal.type ?? '계약서', date: dayjs(today()), status: modal.type === '원가명세서' ? '상신' : '등록' }); } }}
      onOk={async () => { const v = await form.validateFields(); registerDocument({ type: v.type, salescd: v.salescd, name: v.name, file: v.file, date: v.date.format('YYYY-MM-DD'), status: v.status }); message.success('문서를 등록하고 문서번호를 부여했습니다.'); setModal({ open: false }); }}>
      <Form form={form} layout="vertical">
        <Form.Item name="salescd" label="프로젝트" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={visibleSales(me, all).filter((s) => !s.legacy).map((s) => ({ value: s.salescd, label: `${s.salescd} · ${lk.customerName(s.custcd)} · ${s.name}` }))} /></Form.Item>
        <Space><Form.Item name="type" label="문서 유형" rules={[{ required: true }]}><Select style={{ width: 180 }} options={DOC_TYPES.map((t) => ({ value: t, label: `${t} (${DOC_PREFIX[t]})` }))} /></Form.Item><Form.Item name="date" label="작성/발행일" rules={[{ required: true }]}><DatePicker /></Form.Item><Form.Item name="status" label="상태"><Select style={{ width: 120 }} options={['등록', '상신', '승인완료', '발행완료', '계약완료'].map((s) => ({ value: s }))} /></Form.Item></Space>
        <Form.Item name="name" label="문서명" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="file" label="파일명 (본문은 저장하지 않는 시연)" rules={[{ required: true }]}><Input placeholder="예: 계약서_2026-00001.pdf" /></Form.Item>
      </Form>
    </Modal>
  );
  if (device !== 'desktop') {
    return <div><div style={{ padding: '10px 12px', background: '#fff' }}><SearchBar placeholder="문서번호 / 프로젝트 / 고객사" value={q} onChange={setQ} /></div><List>{rows.slice(0, 60).map((d) => <List.Item key={d.id} clickable onClick={() => nav(`/sales/${d.salescd}`)} description={`${d.salescd} · ${d.name} · ${d.date}`} extra={<MTag fill="outline">{d.type}</MTag>}>{d.docNo}</List.Item>)}</List>{modalEl}</div>;
  }
  return (
    <div className="pane">
      <div className="pane-title"><span>통합문서함 <span className="muted">문서번호 · 프로젝트코드 · 고객사 기준 교차조회</span></span><Space><Select allowClear placeholder="전체 유형" style={{ width: 170 }} value={type} onChange={setType} options={DOC_TYPES.map((t) => ({ value: t }))} /><Input.Search allowClear placeholder="문서번호 / 프로젝트 / 고객사 / 문서명" style={{ width: 280 }} onChange={(e) => setQ(e.target.value)} />{can.editSales(me) && <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true })}>문서 등록</Button>}</Space></div>
      <Row gutter={10} style={{ marginBottom: 10 }}><Col flex={1}><Statistic title="조회 문서" value={rows.length} suffix="건" /></Col>{DOC_TYPES.slice(0, 6).map((t) => <Col flex={1} key={t}><Statistic title={t} value={rows.filter((d) => d.type === t).length} suffix="건" styles={{ content: { fontSize: 18 } }} /></Col>)}</Row>
      <Table size="small" dataSource={rows} rowKey="id" pagination={{ pageSize: 20, size: 'small' }} columns={[
        { title: '문서번호', dataIndex: 'docNo', width: 170, render: (v) => <b>{v}</b> }, { title: '유형', dataIndex: 'type', width: 130, render: (v) => <Tag>{v}</Tag> },
        { title: '프로젝트', dataIndex: 'salescd', width: 110, render: (v) => <a onClick={() => nav(`/sales/${v}`)}>{v} ↗</a> }, { title: '고객사', width: 120, render: (_, d) => lk.customerName(all.find((s) => s.salescd === d.salescd)?.custcd ?? '') },
        { title: '문서명', dataIndex: 'name', ellipsis: true }, { title: '버전', dataIndex: 'version', width: 60 }, { title: '작성/발행일', dataIndex: 'date', width: 110 }, { title: '상태', dataIndex: 'status', width: 90 },
        { title: '첨부', dataIndex: 'file', width: 120, render: () => <Button size="small" type="link" onClick={() => message.info('시연: 파일 본문은 저장하지 않습니다.')}>PDF 열기 ↓</Button> },
      ]} />
      {modalEl}
    </div>
  );
}
