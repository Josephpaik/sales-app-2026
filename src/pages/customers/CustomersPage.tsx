import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Splitter, Table, Input, Select, Button, Space, Tag, Empty, Descriptions, Tabs, Typography, Modal, Form, Row, Col, Alert, Timeline, Tooltip, App as AntApp } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, EyeInvisibleOutlined, WarningOutlined } from '@ant-design/icons';
import { SearchBar, List, Card, Tabs as MTabs, Tag as MTag, Button as MButton, Popup, Form as MForm, Input as MInput, Selector, Toast } from 'antd-mobile';
import { TeamOutline } from 'antd-mobile-icons';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { useLookups, StatusTag } from '@/components/common';
import { currentUser, can, upsertCustomer, nextCustcd, findDuplicateSites, lineTotals, logAudit, visibleSales } from '@/api';
import { CUSTOMER_CATEGORY_LABEL, type Customer } from '@/types';
import { won, compact, maskPhone, maskEmail } from '@/utils/format';

export default function CustomersPage() {
  const device = useDevice();
  return device === 'desktop' ? <Desktop /> : <Mobile />;
}

function useCustomerRows(q: string, cat?: string, sub?: string) {
  const customers = useDB((d) => d.customers);
  const sales = useDB((d) => d.sales);
  return useMemo(() => customers.filter((c) => (!cat || c.category === cat) && (!sub || c.subCategory === sub) && (!q || `${c.name} ${c.custcd} ${c.bizNo} ${c.group ?? ''}`.toLowerCase().includes(q.toLowerCase())))
    .map((c) => {
      const list = sales.filter((s) => s.custcd === c.custcd && !s.legacy);
      return { ...c, salesCount: list.length, salesAmount: list.reduce((a, s) => a + lineTotals(s.lines).sales, 0), lastYm: list.map((s) => s.forecastYm).sort().reverse()[0] };
    }), [customers, sales, q, cat, sub]);
}

/* ---------------- PC ---------------- */
function Desktop() {
  const { id } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>();
  const [sub, setSub] = useState<string>();
  const rows = useCustomerRows(q, cat, sub);
  const selected = useDB((d) => d.customers.find((c) => c.custcd === id));
  const [form, setForm] = useState<{ open: boolean; value?: Customer }>({ open: false });
  useDB((d) => d.session.userId);
  const me = currentUser();

  return (
    <div style={{ height: 'calc(100vh - 96px)' }}>
      <Splitter style={{ height: '100%' }}>
        <Splitter.Panel defaultSize={200} min={170} max={300} collapsible>
          <div className="pane">
            <div className="pane-title">조회 조건</div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Search placeholder="고객사명 / custcd / 사업자번호" allowClear value={q} onChange={(e) => setQ(e.target.value)} />
              <div><div className="muted">대분류</div><Select allowClear size="small" style={{ width: '100%' }} value={cat} onChange={setCat} options={[{ value: 'CRM08', label: '핵심 (CRM08)' }, { value: 'CRM07', label: '중요 (CRM07)' }]} /></div>
              <div><div className="muted">소분류</div><Select allowClear size="small" style={{ width: '100%' }} value={sub} onChange={setSub} options={['기업', '공공', '금융', '교육', '의료'].map((v) => ({ value: v }))} /></div>
              <Alert type="info" showIcon message="고객 키 = TQS custcd" description="신규 시스템이 고객 마스터 Owner. 과도기 채번은 TQS 선등록 → 수신." style={{ fontSize: 12 }} />
            </Space>
          </div>
        </Splitter.Panel>
        <Splitter.Panel min={420}>
          <div className="pane">
            <div className="pane-title"><span>고객사 마스터 <span className="muted">{rows.length}건</span></span>
              {can.editMaster(me) && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setForm({ open: true })}>고객사 등록</Button>}</div>
            <Table size="small" dataSource={rows} rowKey="custcd" pagination={{ pageSize: 15, size: 'small' }} scroll={{ x: 780 }} rowClassName={(r) => (r.custcd === id ? 'selected' : '')} onRow={(r) => ({ onClick: () => nav(`/customers/${r.custcd}`) })}
              columns={[
                { title: 'custcd', dataIndex: 'custcd', width: 80, render: (v, r) => <span>{v}{!r.tqsSynced && <Tooltip title="TQS 대사 예외 있음"><WarningOutlined style={{ color: '#fa8c16', marginLeft: 4 }} /></Tooltip>}</span> },
                { title: '고객사', dataIndex: 'name', render: (v, r) => <><b>{v}</b>{r.group && <span className="muted"> · {r.group}</span>}</> },
                { title: '대분류', dataIndex: 'category', width: 70, render: (v) => <Tag color={v === 'CRM08' ? 'gold' : 'blue'}>{CUSTOMER_CATEGORY_LABEL[v as 'CRM07']}</Tag> },
                { title: '소분류', dataIndex: 'subCategory', width: 60 },
                { title: '사업자번호', dataIndex: 'bizNo', width: 110 },
                { title: '사이트', width: 60, align: 'right', render: (_, r) => r.sites.length },
                { title: '영업 건', dataIndex: 'salesCount', width: 70, align: 'right' },
                { title: '매출 누계', dataIndex: 'salesAmount', width: 110, align: 'right', render: (v) => compact(v), sorter: (a, b) => a.salesAmount - b.salesAmount },
                { title: '최근', dataIndex: 'lastYm', width: 70 },
              ]} />
          </div>
        </Splitter.Panel>
        <Splitter.Panel defaultSize={selected ? 430 : 280} min={260} collapsible>
          <div className="pane">{selected ? <Customer360 c={selected} onEdit={() => setForm({ open: true, value: selected })} /> : <Empty style={{ marginTop: 80 }} description="고객사를 선택하면 360° 뷰가 표시됩니다." />}</div>
        </Splitter.Panel>
      </Splitter>
      <CustomerForm open={form.open} value={form.value} onClose={(saved) => { setForm({ open: false }); if (saved) nav(`/customers/${saved}`); }} />
    </div>
  );
}

/** 고객 360° 뷰 — 기본·담당자(마스킹)·사이트·영업 건·변경 이력 */
function Customer360({ c, onEdit }: { c: Customer; onEdit: () => void }) {
  const nav = useNavigate();
  const lk = useLookups();
  const allSales = useDB((d) => d.sales);
  const history = useDB((d) => d.customerHistory.filter((h) => h.custcd === c.custcd));
  const recon = useDB((d) => d.tqsRecon.filter((r) => r.custcd === c.custcd && r.status === 'open'));
  const me = currentUser();
  const [unmask, setUnmask] = useState(false);
  const sales = visibleSales(me, allSales).filter((s) => s.custcd === c.custcd);
  const total = sales.reduce((a, s) => a + lineTotals(s.lines).sales, 0);
  const toggleMask = () => { if (!unmask) logAudit('개인정보열람', `고객담당자 ${c.custcd}`, '연락처 마스킹 해제'); setUnmask(!unmask); };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <Space size={6}><Typography.Text type="secondary">{c.custcd}</Typography.Text><Tag color={c.category === 'CRM08' ? 'gold' : 'blue'}>{CUSTOMER_CATEGORY_LABEL[c.category]}</Tag><Tag>{c.subCategory}</Tag>{c.tqsSynced ? <Tag color="green">TQS 동기</Tag> : <Tag color="orange">대사 예외</Tag>}</Space>
          <Typography.Title level={5} style={{ margin: '4px 0 0' }}>{c.name}</Typography.Title>
          <span className="muted">영업 건 {sales.length}건 · 매출 누계 {compact(total)}</span>
        </div>
        {can.editMaster(me) && <Button icon={<EditOutlined />} onClick={onEdit}>수정</Button>}
      </div>
      {recon.length > 0 && <Alert type="warning" showIcon style={{ marginBottom: 8 }} message={`TQS 대사 예외 ${recon.length}건 미처리`} action={<Button size="small" onClick={() => nav('/share/recon')}>처리</Button>} />}
      <Tabs size="small" items={[
        { key: 'basic', label: '기본', children: (
          <Descriptions size="small" bordered column={1} styles={{ label: { width: 110 } }}>
            <Descriptions.Item label="법인구분">{c.corpType}</Descriptions.Item>
            <Descriptions.Item label="사업자번호">{c.bizNo}</Descriptions.Item>
            <Descriptions.Item label="법인번호">{c.corpNo ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="계열">{c.group ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="영업관리 구 키">{c.legacySalesCustcd === c.custcd ? <span className="muted">동일 (매핑 불필요)</span> : <span>{c.legacySalesCustcd} <Tag>customer_key_map</Tag></span>}</Descriptions.Item>
            <Descriptions.Item label="등록 / 수정">{c.createdAt} / {c.updatedAt}</Descriptions.Item>
          </Descriptions>) },
        { key: 'contacts', label: `담당자 (${c.contacts.length})`, children: (
          <>
            {can.unmaskPII(me) && <Button size="small" icon={unmask ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={toggleMask} style={{ marginBottom: 8 }}>{unmask ? '마스킹' : '연락처 보기 (열람 로그 기록)'}</Button>}
            <Table size="small" pagination={false} dataSource={c.contacts} rowKey="id" columns={[
              { title: '구분', dataIndex: 'kind', width: 60 }, { title: '이름', dataIndex: 'name', width: 80 }, { title: '부서/직책', render: (_, r) => `${r.dept} ${r.title}` },
              { title: '전화', dataIndex: 'phone', render: (v) => (unmask ? v : maskPhone(v)) }, { title: '이메일', dataIndex: 'email', render: (v) => (unmask ? v : maskEmail(v)) },
            ]} />
            <div className="muted" style={{ marginTop: 6 }}>schema_privacy 원칙 — 기본 마스킹, 열람 시 감사 로그 기록.</div>
          </>) },
        { key: 'sites', label: `사이트 (${c.sites.length})`, children: (
          <Table size="small" pagination={false} dataSource={c.sites} rowKey="id" columns={[
            { title: '사이트', dataIndex: 'name', width: 90, render: (v, r) => <>{v}{r.isPrimary && <Tag style={{ marginLeft: 4 }}>대표</Tag>}</> },
            { title: '도로명 주소 (행안부 API 표준화)', dataIndex: 'roadAddress' },
            { title: '건물관리번호', dataIndex: 'buildingCode', width: 150, render: (v) => { const dup = v ? findDuplicateSites(v, c.custcd) : []; return <span>{v}{dup.length > 0 && <Tooltip title={`중복: ${dup.map((d) => d.customer.name).join(', ')}`}><Tag color="orange" style={{ marginLeft: 4 }}>중복</Tag></Tooltip>}</span>; } },
          ]} />) },
        { key: 'sales', label: `영업 건 (${sales.length})`, children: (
          <Table size="small" pagination={{ pageSize: 8, size: 'small' }} dataSource={sales} rowKey="salescd" onRow={(r) => ({ onClick: () => nav(`/sales/${r.salescd}`) })} columns={[
            { title: '상태', dataIndex: 'status', width: 100, render: (v) => <StatusTag code={v} /> },
            { title: '프로젝트', dataIndex: 'name', ellipsis: true },
            { title: '담당', dataIndex: 'ownerId', width: 70, render: (v) => lk.userName(v) },
            { title: '매출', width: 110, align: 'right', render: (_, r) => won(lineTotals(r.lines).sales) },
          ]} />) },
        { key: 'history', label: '변경 이력', children: (
          <Timeline items={history.map((h) => ({ children: <><b>{h.field}</b> {h.before && <span className="muted">{h.before} → </span>}{h.after} <span className="muted">— {h.by} · {h.at}</span></> }))} />) },
      ]} />
    </div>
  );
}

/** 고객사 등록/수정 — 주소 표준화·건물관리번호 중복 탐지 시뮬레이션 */
function CustomerForm({ open, value, onClose }: { open: boolean; value?: Customer; onClose: (saved?: string) => void }) {
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
  const [dup, setDup] = useState<string[]>([]);
  const checkDup = (code: string) => setDup(code ? findDuplicateSites(code, value?.custcd).map((d) => `${d.customer.name} (${d.site.name})`) : []);
  return (
    <Modal open={open} width={720} title={value ? `고객사 수정 · ${value.custcd}` : '고객사 등록 (과도기: TQS custcd 승계)'} destroyOnHidden okText="저장" cancelText="취소" onCancel={() => onClose()}
      afterOpenChange={(o) => { if (o) { form.resetFields(); setDup([]); form.setFieldsValue(value ? { ...value, siteName: value.sites[0]?.name, roadAddress: value.sites[0]?.roadAddress, buildingCode: value.sites[0]?.buildingCode } : { custcd: nextCustcd(), corpType: '법인', category: 'CRM07', subCategory: '기업', siteName: '본사' }); } }}
      onOk={async () => {
        const v = await form.validateFields();
        const sites = value ? value.sites.map((s, i) => (i === 0 ? { ...s, name: v.siteName, roadAddress: v.roadAddress, buildingCode: v.buildingCode } : s)) : [{ id: `${v.custcd}-S1`, name: v.siteName, roadAddress: v.roadAddress, buildingCode: v.buildingCode, isPrimary: true }];
        upsertCustomer({ ...(value ?? { contacts: [], tqsSynced: false, createdAt: '', updatedAt: '' }), custcd: v.custcd, name: v.name, corpType: v.corpType, corpNo: v.corpNo, bizNo: v.bizNo, category: v.category, subCategory: v.subCategory, group: v.group, sites });
        message.success('저장했습니다. (변경 이력 append-only 기록)');
        onClose(v.custcd);
      }}>
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Row gutter={12}>
          <Col span={6}><Form.Item name="custcd" label="custcd (TQS 키)" rules={[{ required: true }]}><Input disabled={!!value} /></Form.Item></Col>
          <Col span={10}><Form.Item name="name" label="고객사명" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="group" label="계열"><Input /></Form.Item></Col>
          <Col span={6}><Form.Item name="corpType" label="법인구분"><Select options={['법인', '개인사업자', '공공', '기타'].map((v) => ({ value: v }))} /></Form.Item></Col>
          <Col span={6}><Form.Item name="bizNo" label="사업자번호" rules={[{ required: true, pattern: /^\d{3}-\d{2}-\d{5}$/, message: '000-00-00000 형식' }]}><Input placeholder="000-00-00000" /></Form.Item></Col>
          <Col span={6}><Form.Item name="corpNo" label="법인번호"><Input /></Form.Item></Col>
          <Col span={3}><Form.Item name="category" label="대분류"><Select options={[{ value: 'CRM07', label: '중요' }, { value: 'CRM08', label: '핵심' }]} /></Form.Item></Col>
          <Col span={3}><Form.Item name="subCategory" label="소분류"><Select options={['기업', '공공', '금융', '교육', '의료'].map((v) => ({ value: v }))} /></Form.Item></Col>
        </Row>
        <Typography.Text strong>대표 사이트</Typography.Text>
        <Row gutter={12} style={{ marginTop: 6 }}>
          <Col span={5}><Form.Item name="siteName" label="사이트명"><Input /></Form.Item></Col>
          <Col span={11}><Form.Item name="roadAddress" label="도로명 주소" extra="실제 구현: 행안부 주소 API 검색 → 표준화 주소·건물관리번호 자동 입력"><Input.Search placeholder="주소 검색" enterButton="검색" onSearch={(v) => { if (v) { form.setFieldsValue({ roadAddress: `${v} (표준화됨)`, buildingCode: '1168010100100010000' }); checkDup('1168010100100010000'); } }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="buildingCode" label="건물관리번호"><Input onChange={(e) => checkDup(e.target.value)} /></Form.Item></Col>
        </Row>
        {dup.length > 0 && <Alert type="warning" showIcon message="건물관리번호 중복 탐지" description={`동일 건물의 사이트가 이미 등록되어 있습니다: ${dup.join(', ')} — 중복 고객 병합 검토 대상`} />}
      </Form>
    </Modal>
  );
}

/* ---------------- Mobile / Tablet ---------------- */
function Mobile() {
  const device = useDevice();
  const { id } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const rows = useCustomerRows(q);
  const selected = useDB((d) => d.customers.find((c) => c.custcd === id));
  const [form, setForm] = useState(false);
  const me = currentUser();

  const list = (
    <>
      <div style={{ padding: '10px 12px', background: '#fff', position: 'sticky', top: 0, zIndex: 5 }}><SearchBar placeholder="고객사명 / custcd" value={q} onChange={setQ} /></div>
      <List>
        {rows.map((c) => (
          <List.Item key={c.custcd} clickable onClick={() => nav(`/customers/${c.custcd}`)} style={id === c.custcd ? { background: '#eef2ff' } : undefined}
            description={<span className="m-list-item-sub">{c.custcd} · {c.subCategory}{c.group ? ` · ${c.group}` : ''} · 영업 {c.salesCount}건</span>}
            extra={<span className="m-list-item-amt">{compact(c.salesAmount)}</span>}>
            <MTag color={c.category === 'CRM08' ? 'warning' : 'primary'} fill="outline">{CUSTOMER_CATEGORY_LABEL[c.category]}</MTag> {c.name}
          </List.Item>
        ))}
      </List>
    </>
  );
  const detail = selected ? <MobileCustomer c={selected} /> : <div className="m-empty"><TeamOutline fontSize={40} /><div>고객사를 선택하세요</div></div>;
  const quick = can.editMaster(me) && <QuickCustomerSheet open={form} onClose={(saved) => { setForm(false); if (saved) nav(`/customers/${saved}`); }} />;

  if (device === 'tablet') return <div className="m-body split"><div className="m-list-pane">{list}</div><div className="m-detail-pane">{detail}</div>{quick}{can.editMaster(me) && <MButton className="m-fab" color="primary" shape="rounded" onClick={() => setForm(true)}>+ 고객사</MButton>}</div>;
  return <div className="m-body">{selected ? detail : list}{quick}{!selected && can.editMaster(me) && <MButton className="m-fab" color="primary" shape="rounded" onClick={() => setForm(true)}>+ 고객사</MButton>}</div>;
}

function MobileCustomer({ c }: { c: Customer }) {
  const nav = useNavigate();
  const lk = useLookups();
  const me = currentUser();
  const all = useDB((d) => d.sales);
  const sales = visibleSales(me, all).filter((s) => s.custcd === c.custcd);
  const [unmask, setUnmask] = useState(false);
  return (
    <div style={{ paddingBottom: 80 }}>
      <Card style={{ margin: 10, borderRadius: 12 }}>
        <div className="tag-row"><MTag fill="outline">{c.custcd}</MTag><MTag color={c.category === 'CRM08' ? 'warning' : 'primary'} fill="outline">{CUSTOMER_CATEGORY_LABEL[c.category]}</MTag><MTag fill="outline">{c.subCategory}</MTag>{!c.tqsSynced && <MTag color="warning">대사 예외</MTag>}</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>{c.name}</div>
        <div className="m-list-item-sub">{c.sites[0]?.roadAddress}</div>
        <div style={{ marginTop: 8, fontSize: 13 }}>영업 건 {sales.length}건 · 매출 누계 <b>{compact(sales.reduce((a, s) => a + lineTotals(s.lines).sales, 0))}</b></div>
      </Card>
      <MTabs style={{ background: '#fff', margin: '0 10px', borderRadius: 12 }}>
        <MTabs.Tab title="담당자" key="k">
          {can.unmaskPII(me) && <div style={{ padding: '8px 14px 0' }}><MButton size="mini" fill="outline" onClick={() => { if (!unmask) logAudit('개인정보열람', `고객담당자 ${c.custcd}`, '연락처 마스킹 해제(모바일)'); setUnmask(!unmask); }}>{unmask ? '마스킹' : '연락처 보기'}</MButton></div>}
          <List>{c.contacts.map((k) => <List.Item key={k.id} description={`${k.dept} ${k.title} · ${unmask ? k.email : maskEmail(k.email)}`} extra={<a href={`tel:${k.phone}`}>{unmask ? k.phone : maskPhone(k.phone)}</a>}>{k.name} <MTag fill="outline">{k.kind}</MTag></List.Item>)}</List>
        </MTabs.Tab>
        <MTabs.Tab title={`영업 ${sales.length}`} key="s">
          <List>{sales.map((s) => <List.Item key={s.salescd} clickable onClick={() => nav(`/sales/${s.salescd}`)} description={`${lk.userName(s.ownerId)} · ${s.forecastYm}`} extra={<span className="m-list-item-amt">{compact(lineTotals(s.lines).sales)}</span>}><StatusTag code={s.status} mobile /> {s.name}</List.Item>)}</List>
        </MTabs.Tab>
        <MTabs.Tab title="사이트" key="st">
          <List>{c.sites.map((s) => <List.Item key={s.id} description={s.roadAddress} extra={s.isPrimary ? '대표' : ''}>{s.name}</List.Item>)}</List>
        </MTabs.Tab>
      </MTabs>
    </div>
  );
}

/** 현장 빠른 고객 등록 (Bottom Sheet) */
function QuickCustomerSheet({ open, onClose }: { open: boolean; onClose: (saved?: string) => void }) {
  const [form] = MForm.useForm();
  return (
    <Popup visible={open} onMaskClick={() => onClose()} position="bottom" bodyStyle={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }} afterShow={() => { form.resetFields(); form.setFieldsValue({ category: ['CRM07'], subCategory: ['기업'] }); }}>
      <div className="sheet-title">고객사 빠른 등록</div>
      <div className="sheet-body">
        <MForm form={form} layout="vertical" footer={<MButton block color="primary" size="large" onClick={async () => { const v = await form.validateFields(); const custcd = nextCustcd(); upsertCustomer({ custcd, legacySalesCustcd: custcd, name: v.name, corpType: '법인', bizNo: v.bizNo, category: v.category[0], subCategory: v.subCategory[0], contacts: [], sites: [{ id: `${custcd}-S1`, name: '본사', roadAddress: v.address ?? '', isPrimary: true }], tqsSynced: false, createdAt: '', updatedAt: '' }); Toast.show({ icon: 'success', content: `${custcd} 등록` }); onClose(custcd); }}>저장</MButton>}>
          <MForm.Item name="name" label="고객사명" rules={[{ required: true }]}><MInput placeholder="고객사명" /></MForm.Item>
          <MForm.Item name="bizNo" label="사업자번호" rules={[{ required: true, pattern: /^\d{3}-\d{2}-\d{5}$/, message: '000-00-00000' }]}><MInput placeholder="000-00-00000" /></MForm.Item>
          <MForm.Item name="category" label="대분류"><Selector columns={2} options={[{ label: '중요', value: 'CRM07' }, { label: '핵심', value: 'CRM08' }]} /></MForm.Item>
          <MForm.Item name="subCategory" label="소분류"><Selector columns={5} options={['기업', '공공', '금융', '교육', '의료'].map((v) => ({ label: v, value: v }))} /></MForm.Item>
          <MForm.Item name="address" label="주소 (표준화는 PC에서)"><MInput placeholder="도로명 주소" /></MForm.Item>
        </MForm>
      </div>
    </Popup>
  );
}
