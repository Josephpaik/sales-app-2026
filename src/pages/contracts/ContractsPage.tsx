import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Splitter, Table, Tag, Empty, Descriptions, Button, Space, Modal, Form, Input, Select, DatePicker, InputNumber, Typography, Alert, Segmented, App as AntApp } from 'antd';
import { PlusOutlined, EditOutlined, PaperClipOutlined, LockOutlined } from '@ant-design/icons';
import { List, Card, Tag as MTag, SearchBar } from 'antd-mobile';
import { FileOutline } from 'antd-mobile-icons';
import dayjs from 'dayjs';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { currentUser, can, upsertContract, nextContractId, lineTotals, requestContractParty, isSuitableGrade } from '@/api';
import { useLookups, StatusTag } from '@/components/common';
import { won, compact } from '@/utils/format';
import { CREDIT_GRADES, type Contract } from '@/types';

/** 계약 · 원가 — 계약현황 / 원가명세서 상신 현황 (사업관리 허브 안에서 동일 탭 체계) */
export default function ContractsPage() {
  const device = useDevice();
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const contracts = useDB((d) => d.contracts); const sales = useDB((d) => d.sales); const docs = useDB((d) => d.documents);
  const [q, setQ] = useState('');
  const [view, setView] = useState<'계약현황' | '원가명세서'>('계약현황');
  const [form, setForm] = useState<{ open: boolean; value?: Contract; salescd?: string }>({ open: false });
  useDB((d) => d.session.userId);
  const me = currentUser();
  const rows = contracts.map((c) => ({ ...c, sale: sales.find((s) => s.salescd === c.salescd) })).filter((c) => !q || `${c.name} ${c.party} ${c.id} ${c.salescd}`.includes(q));
  const selected = rows.find((c) => c.id === id);
  const newFor = sp.get('new');
  useEffect(() => { if (newFor) { setForm({ open: true, salescd: newFor }); setSp({}); } }, [newFor, setSp]);
  const soon = contracts.filter((c) => dayjs(c.end).diff(dayjs('2026-10-12'), 'day') <= 90 && dayjs(c.end).isAfter('2026-10-12'));
  const costDocs = docs.filter((d) => d.type === '원가명세서');
  const ordered = sales.filter((s) => s.contractId && !s.legacy);

  const detail = selected ? <ContractDetail c={selected} onEdit={() => setForm({ open: true, value: selected })} mobile={device !== 'desktop'} /> : null;
  const formEl = <ContractForm open={form.open} value={form.value} salescd={form.salescd} onClose={(saved) => { setForm({ open: false }); if (saved) nav(`/biz/contracts/${saved}`); }} />;
  const costTable = (
    <Table size="small" dataSource={ordered} rowKey="salescd" pagination={{ pageSize: 15, size: 'small' }} onRow={(r) => ({ onClick: () => nav(`/sales/${r.salescd}`) })} columns={[
      { title: '프로젝트', dataIndex: 'salescd', width: 110 }, { title: '프로젝트명', dataIndex: 'name', ellipsis: true }, { title: '상태', dataIndex: 'status', width: 110, render: (v) => <StatusTag code={v} /> },
      { title: '매출 / 매입 / 이익', width: 260, render: (_, r) => { const t = lineTotals(r.lines); return `${compact(t.sales)} / ${compact(t.buy)} / ${compact(t.profit)}`; } },
      { title: '원가명세서', width: 200, render: (_, r) => { const d = costDocs.find((x) => x.salescd === r.salescd); return d ? <span><Tag color="green">{d.status}</Tag>{d.docNo}</span> : <Space><Tag color="orange">미상신</Tag>{can.editSales(me) && <Button size="small" onClick={(e) => { e.stopPropagation(); nav(`/biz/docs?new=${r.salescd}&type=원가명세서`); }}>상신</Button>}</Space>; } },
    ]} />
  );

  if (device !== 'desktop') {
    const list = (<>
      <div style={{ padding: '10px 12px', background: '#fff' }}><SearchBar placeholder="계약명 / 계약처 / 번호" value={q} onChange={setQ} /></div>
      <List>{rows.map((c) => <List.Item key={c.id} clickable onClick={() => nav(`/biz/contracts/${c.id}`)} style={id === c.id ? { background: '#eef2ff' } : undefined} description={`${c.id} · ${c.party} · ${c.start}~${c.end}`} extra={<span className="m-list-item-amt">{compact(c.amount)}</span>}><MTag fill="outline">{c.type}</MTag> {c.name}</List.Item>)}</List>
    </>);
    if (device === 'tablet') return <div className="m-body split" style={{ height: 'calc(100dvh - 140px)' }}><div className="m-list-pane">{list}</div><div className="m-detail-pane">{detail ?? <div className="m-empty"><FileOutline fontSize={40} /><div>계약을 선택하세요</div></div>}</div>{formEl}</div>;
    return <div>{selected ? detail : list}{formEl}</div>;
  }

  return (
    <div style={{ height: 'calc(100vh - 160px)' }}>
      <Splitter style={{ height: '100%' }}>
        <Splitter.Panel min={460}>
          <div className="pane">
            <div className="pane-title">
              <Space><Segmented size="small" value={view} onChange={(v) => setView(v as typeof view)} options={['계약현황', '원가명세서']} /><span className="muted">{view === '계약현황' ? `${rows.length}건 · 만료 90일 이내 ${soon.length}건` : `수주 ${ordered.length}건 · 미상신 ${ordered.filter((s) => !costDocs.some((d) => d.salescd === s.salescd)).length}건`}</span></Space>
              <Space><Input.Search allowClear placeholder="계약명 / 계약처 / 프로젝트코드" style={{ width: 220 }} onChange={(e) => setQ(e.target.value)} />{can.editSales(me) && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setForm({ open: true })}>계약 등록</Button>}</Space>
            </div>
            {view === '계약현황' ? (
              <Table size="small" dataSource={rows} rowKey="id" pagination={{ pageSize: 15, size: 'small' }} rowClassName={(r) => (r.id === id ? 'selected' : '')} onRow={(r) => ({ onClick: () => nav(`/biz/contracts/${r.id}`) })} columns={[
                { title: '계약번호', dataIndex: 'id', width: 110 }, { title: '유형', dataIndex: 'type', width: 70, render: (v) => <Tag>{v}</Tag> },
                { title: '계약명', dataIndex: 'name', ellipsis: true, render: (v, r) => <><b>{v}</b><div className="muted">{r.salescd}</div></> }, { title: '계약처', dataIndex: 'party', width: 120, ellipsis: true },
                { title: '영업 건 상태', width: 110, render: (_, r) => (r.sale ? <StatusTag code={r.sale.status} /> : '-') },
                { title: '계약금액', dataIndex: 'amount', width: 120, align: 'right', render: won, sorter: (a, b) => a.amount - b.amount },
                { title: '지급 조건', dataIndex: 'paymentTerms', width: 150, ellipsis: true },
                { title: '기간', width: 180, render: (_, r) => <span>{r.start} ~ {r.end}{soon.includes(r) && <Tag color="orange" style={{ marginLeft: 4 }}>만료 임박</Tag>}</span> },
              ]} />
            ) : costTable}
          </div>
        </Splitter.Panel>
        <Splitter.Panel defaultSize={selected ? 480 : 300} min={260} collapsible>
          <div className="pane">{detail ?? <Empty style={{ marginTop: 80 }} description="계약을 선택하세요." />}</div>
        </Splitter.Panel>
      </Splitter>
      {formEl}
    </div>
  );
}

function ContractDetail({ c, onEdit, mobile }: { c: Contract; onEdit: () => void; mobile?: boolean }) {
  const nav = useNavigate(); const lk = useLookups(); const me = currentUser();
  const sale = useDB((d) => d.sales.find((s) => s.salescd === c.salescd));
  const party = useDB((d) => d.contractParties.find((p) => p.id === c.partyId || p.name === c.party));
  const readable = can.readContractFile(me);
  const files = readable ? c.attachments.map((a) => <Tag key={a.id} icon={<PaperClipOutlined />}>{a.docNo ? a.docNo + ' ' : ''}{a.name}</Tag>) : <span className="muted"><LockOutlined /> 원문 열람 권한 없음 (영업지원·재무·MA·경영진·관리자 — v2.3 B-2)</span>;
  const partyTag = party ? <Tag color={party.status === '등재' ? 'green' : party.status === '반려' ? 'red' : 'gold'}>{party.status}{party.creditRating ? ` · ${party.creditRating}` : ''}</Tag> : <Tag color="orange">미등재</Tag>;
  if (mobile) {
    return (
      <div>
        <Card style={{ margin: 10, borderRadius: 12 }}><div className="tag-row"><MTag fill="outline">{c.id}</MTag><MTag color="primary" fill="outline">{c.type}</MTag></div><div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>{c.name}</div><div className="m-list-item-sub">{c.party} · {c.start} ~ {c.end}</div></Card>
        <List style={{ margin: '0 10px', borderRadius: 12, overflow: 'hidden' }}>
          <List.Item extra={won(c.amount)}>공급가액</List.Item><List.Item extra={won(c.vat)}>부가세</List.Item><List.Item extra={won(c.amount + c.vat)}>합계</List.Item>
          <List.Item extra={c.signedAt}>체결일</List.Item><List.Item extra={`${c.paymentTerms} (${c.paymentDueDays}일)`}>지급 조건</List.Item><List.Item extra={c.maRate ? `${c.maRate}% (무상 ${c.freeMaMonths}개월)` : '-'}>MA 요율</List.Item>
          <List.Item extra={sale ? <span style={{ color: '#1f3a8a' }} onClick={() => nav(`/sales/${c.salescd}`)}>{c.salescd}</span> : '-'}>영업 건</List.Item>
          <List.Item description={files}>계약서 원문</List.Item>
        </List>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div><Space><Typography.Text type="secondary">{c.id}</Typography.Text><Tag>{c.type}</Tag></Space><Typography.Title level={5} style={{ margin: '4px 0 0' }}>{c.name}</Typography.Title></div>
        {can.editSales(me) && <Button icon={<EditOutlined />} onClick={onEdit}>수정</Button>}
      </div>
      <Descriptions size="small" bordered column={1} styles={{ label: { width: 130 } }}>
        <Descriptions.Item label="영업 건">{sale ? <a onClick={() => nav(`/sales/${c.salescd}`)}>{c.salescd} · {sale.name}</a> : c.salescd}</Descriptions.Item>
        <Descriptions.Item label="고객사">{sale ? lk.customerName(sale.custcd) : '-'}</Descriptions.Item>
        <Descriptions.Item label="계약처 (거래처)">{c.party} {partyTag}</Descriptions.Item>
        <Descriptions.Item label="공급가액 / 부가세">{won(c.amount)} / {won(c.vat)} = <b>{won(c.amount + c.vat)}</b></Descriptions.Item>
        <Descriptions.Item label="체결일 · 기간">{c.signedAt} · {c.start} ~ {c.end}</Descriptions.Item>
        <Descriptions.Item label="수금 · 지급 조건">{c.paymentTerms} <Tag>지급기일 {c.paymentDueDays}일</Tag></Descriptions.Item>
        <Descriptions.Item label="MA 요율 (입력값)">{c.maRate ?? '-'}% · 무상 {c.freeMaMonths ?? 0}개월</Descriptions.Item>
        <Descriptions.Item label="계약서 원문">{files}</Descriptions.Item>
        {c.memo && <Descriptions.Item label="특이사항">{c.memo}</Descriptions.Item>}
        {sale && <Descriptions.Item label="영업 건 매출 대비">{won(lineTotals(sale.lines).sales)} {Math.abs(lineTotals(sale.lines).sales - c.amount) > 0 && <Tag color="orange">차이 {won(c.amount - lineTotals(sale.lines).sales)}</Tag>}</Descriptions.Item>}
      </Descriptions>
      <Alert style={{ marginTop: 10 }} type="info" showIcon message="지급 조건은 매출채권의 계약 지급일·미수 인식일 계산 기준이 됩니다. 전자결재·재무시스템 연동은 후속." />
    </div>
  );
}

/** 계약 등록 — 계약처 확정 시 거래처 등재기안 시작(V2.4), 수금·지급 조건 필수 */
function ContractForm({ open, value, salescd, onClose }: { open: boolean; value?: Contract; salescd?: string; onClose: (saved?: string) => void }) {
  const [form] = Form.useForm(); const [partyForm] = Form.useForm();
  const lk = useLookups();
  const parties = useDB((d) => d.contractParties);
  const sales = useDB((d) => d.sales.filter((s) => !s.legacy && ['SN05Z', 'SN07Z', 'SN09Z', 'SN10Z', 'SN12M', 'SN12Z'].includes(s.status)));
  const { message } = AntApp.useApp();
  const amount = Form.useWatch('amount', form); const partyId = Form.useWatch('partyId', form); const scd = Form.useWatch('salescd', form);
  const device = useDevice();
  const [partyModal, setPartyModal] = useState(false);
  const party = parties.find((p) => p.id === partyId);
  return (
    <>
      <Modal open={open} width={device === 'desktop' ? 720 : '96%'} title={value ? `계약 수정 · ${value.id}` : '계약 등록'} destroyOnHidden okText="저장" cancelText="취소" onCancel={() => onClose()}
        afterOpenChange={(o) => {
          if (!o) return; form.resetFields();
          if (value) form.setFieldsValue({ ...value, signedAt: dayjs(value.signedAt), period: [dayjs(value.start), dayjs(value.end)] });
          else { const s = sales.find((x) => x.salescd === salescd); const amt = s ? lineTotals(s.lines).sales : 0; form.setFieldsValue({ id: nextContractId(), salescd, type: '신규', name: s ? `${s.name} 계약` : '', partyId: s?.partyId, amount: amt, vat: Math.round(amt * 0.1), signedAt: dayjs(), period: [dayjs(), dayjs().add(1, 'year')], maRate: 10, freeMaMonths: 12, paymentDueDays: 30 }); }
        }}
        onOk={async () => {
          const v = await form.validateFields();
          const p = parties.find((x) => x.id === v.partyId);
          if (p && p.status !== '등재') return message.warning('계약처가 아직 등재되지 않았습니다. 거래처 등재기안 승인 후 저장할 수 있습니다.');
          upsertContract({ id: v.id, salescd: v.salescd, type: v.type, name: v.name, party: p?.name ?? '', partyId: v.partyId, amount: v.amount, vat: v.vat, signedAt: v.signedAt.format('YYYY-MM-DD'), start: v.period[0].format('YYYY-MM-DD'), end: v.period[1].format('YYYY-MM-DD'), maRate: v.maRate, freeMaMonths: v.freeMaMonths, paymentTerms: v.paymentTerms, paymentDueDays: v.paymentDueDays, attachments: value?.attachments ?? [], memo: v.memo });
          message.success('계약을 저장했습니다.'); onClose(v.id);
        }}>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }} onValuesChange={(ch) => { if ('amount' in ch) form.setFieldsValue({ vat: Math.round((ch.amount ?? 0) * 0.1) }); }}>
          <Space size={12} wrap>
            <Form.Item name="id" label="계약번호"><Input disabled style={{ width: 130 }} /></Form.Item>
            <Form.Item name="salescd" label="영업 건 (수주 이후)" rules={[{ required: true }]} style={{ minWidth: 320 }}><Select showSearch optionFilterProp="label" options={sales.map((s) => ({ value: s.salescd, label: `${s.salescd} · ${lk.customerName(s.custcd)} · ${s.name}` }))} /></Form.Item>
            <Form.Item name="type" label="유형"><Select style={{ width: 110 }} options={['신규', '변경', '유지관리'].map((v) => ({ value: v }))} /></Form.Item>
          </Space>
          <Form.Item name="name" label="계약명" rules={[{ required: true }]}><Input /></Form.Item>
          <Space size={12} wrap align="end">
            <Form.Item name="partyId" label="계약처 (등재 거래처)" rules={[{ required: true, message: '계약처를 선택하거나 등재기안을 시작하세요' }]} style={{ minWidth: 300 }}><Select showSearch optionFilterProp="label" options={parties.map((p) => ({ value: p.id, label: `${p.name} · ${p.status}${p.creditRating ? ' · ' + p.creditRating : ''}${p.direct ? ' · 직접거래' : ''}` }))} /></Form.Item>
            <Form.Item label=" "><Button onClick={() => setPartyModal(true)}>+ 거래처 등재기안</Button></Form.Item>
            {party && party.status !== '등재' && <Tag color="gold">등재기안 중 — 승인 후 계약 저장 가능</Tag>}
            {party && party.creditRating && !isSuitableGrade(party.creditRating) && <Tag color="red">신용등급 {party.creditRating} — 추심기준 60일 적용</Tag>}
          </Space>
          <Space size={12} wrap>
            <Form.Item name="amount" label="공급가액" rules={[{ required: true }]}><InputNumber style={{ width: 160 }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item>
            <Form.Item name="vat" label="부가세"><InputNumber style={{ width: 140 }} min={0} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item>
            <Form.Item label="합계"><b>{won((amount ?? 0) * 1.1)}</b></Form.Item>
          </Space>
          <Space size={12} wrap>
            <Form.Item name="signedAt" label="체결일" rules={[{ required: true }]}><DatePicker /></Form.Item>
            <Form.Item name="period" label="계약 기간" rules={[{ required: true }]}><DatePicker.RangePicker /></Form.Item>
            <Form.Item name="maRate" label="MA 요율(%)"><InputNumber min={0} max={30} /></Form.Item>
            <Form.Item name="freeMaMonths" label="무상 MA(개월)"><InputNumber min={0} max={36} /></Form.Item>
          </Space>
          <Space size={12} wrap>
            <Form.Item name="paymentTerms" label="수금 · 지급 조건 (필수)" rules={[{ required: true, message: '지급 조건을 입력하세요' }]} style={{ minWidth: 320 }}><Select showSearch allowClear options={['검수 후 30일 현금', '계산서 발행 후 30일', '계산서 발행 후 60일', '월말 마감 익월 말 지급', '선금 30% · 잔금 검수 후'].map((v) => ({ value: v }))} /></Form.Item>
            <Form.Item name="paymentDueDays" label="지급기일 (계산서일 기준, 일)" rules={[{ required: true }]}><InputNumber min={0} max={180} /></Form.Item>
          </Space>
          <Form.Item name="memo" label="특이사항"><Input.TextArea rows={2} /></Form.Item>
          <div className="muted">계약서 첨부는 통합문서함에 문서번호(SMS-CTR-YYMM-NNN)로 등록됩니다. 시연에서는 파일 본문을 저장하지 않습니다.</div>
        </Form>
      </Modal>
      <Modal open={partyModal} title="거래처 등재기안" destroyOnHidden onCancel={() => setPartyModal(false)} okText="기안 상신" cancelText="취소"
        afterOpenChange={(o) => { if (o) { partyForm.resetFields(); partyForm.setFieldsValue({ direct: false, creditRating: 'BBB0' }); } }}
        onOk={async () => { const v = await partyForm.validateFields(); const id = requestContractParty({ name: v.name, bizNo: v.bizNo, creditRating: v.creditRating, direct: v.direct, linkedSalescd: scd }); form.setFieldsValue({ partyId: id }); message.success('거래처 등재기안을 상신했습니다. 승인은 사업관리 > 매출채권 > 등재 결재에서 처리됩니다.'); setPartyModal(false); }}>
        <Alert type="info" showIcon style={{ marginBottom: 10 }} message="거래처 등재기안은 매출채권 화면이 아니라 계약처를 확정하는 계약 등록 단계에서 시작합니다. 계약처명과 프로젝트코드가 함께 연결됩니다." />
        <Form form={partyForm} layout="vertical">
          <Form.Item name="name" label="거래처명" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="bizNo" label="사업자번호" rules={[{ required: true, pattern: /^\d{3}-\d{2}-\d{5}$/, message: '000-00-00000' }]}><Input /></Form.Item>
          <Space><Form.Item name="creditRating" label="신용등급 (사전심사)"><Select style={{ width: 140 }} options={CREDIT_GRADES.map((g) => ({ value: g }))} /></Form.Item><Form.Item name="direct" label="거래구분"><Select style={{ width: 160 }} options={[{ value: false, label: '거래처(파트너·채널)' }, { value: true, label: '고객 직접거래' }]} /></Form.Item></Space>
        </Form>
      </Modal>
    </>
  );
}
