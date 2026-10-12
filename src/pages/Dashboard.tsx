import { useMemo, useState } from 'react';
import { Row, Col, Table, Tag, Typography, Button, Space, Drawer, Checkbox, Collapse, Modal, Form, Select, Input, DatePicker, TimePicker, App as AntApp } from 'antd';
import { SettingOutlined, PlusOutlined, ArrowUpOutlined, ArrowDownOutlined, RightOutlined, NotificationOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { Button as MButton, Popup } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useDB, today } from '@/api/store';
import { currentUser, visibleSales, lineTotals, arStatus, remainingQty, saveDashboard, upsertSchedule, setScheduleStatus, addVisit, can } from '@/api';
import { statusDef, WIDGET_LABEL, type WidgetKey, type SalesOpportunity } from '@/types';
import { compact } from '@/utils/format';
import { useDevice } from '@/hooks/useDevice';
import { useLookups, StatusTag } from '@/components/common';
import { FAVORITE_OPTIONS } from '@/nav';

/** 대시보드 집계 — V2.4: 운영 지표 중심(월별 추이는 사업관리 > 집계·통계로 이동) */
function useDashboardData() {
  const all = useDB((d) => d.sales); const customers = useDB((d) => d.customers); const ars = useDB((d) => d.receivables); const frs = useDB((d) => d.fulfillRequests);
  const docs = useDB((d) => d.documents); const schedules = useDB((d) => d.schedules); const visits = useDB((d) => d.visitLogs);
  useDB((d) => d.session.userId);
  const me = currentUser();
  return useMemo(() => {
    const rows = visibleSales(me, all).filter((s) => !s.legacy);
    const amt = (s: SalesOpportunity) => lineTotals(s.lines);
    const phase = (s: SalesOpportunity) => statusDef(s.status).phase;
    const ordered = rows.filter((s) => ['수주', '이행'].includes(phase(s)));
    const active = rows.filter((s) => ['발굴', '진행'].includes(phase(s)));
    const done = rows.filter((s) => ['SN12M', 'SN12Z'].includes(s.status));
    const sum = (list: SalesOpportunity[]) => list.reduce((a, s) => ({ sales: a.sales + amt(s).sales, profit: a.profit + amt(s).profit }), { sales: 0, profit: 0 });
    const codes = new Set(rows.map((s) => s.salescd));
    const fulfillable = rows.filter((s) => ['수주', '이행', '종결'].includes(phase(s)) && !['SN13Z', 'SN14Z'].includes(s.status));
    const hbPending = fulfillable.reduce((a, s) => a + s.lines.filter((l) => l.hyboost && remainingQty('shipment', s, l) > 0).length, 0);
    const licPending = fulfillable.reduce((a, s) => a + s.lines.filter((l) => l.kind === '매출' && remainingQty('license', s, l) > 0).length, 0) + frs.filter((r) => codes.has(r.salescd) && r.kind === 'license' && r.status === '발급보류').length;
    const myArs = ars.filter((r) => codes.has(r.salescd));
    const arActive = myArs.filter((r) => !['정상', '입금완료'].includes(arStatus(r)));
    const tasks = [
      { key: 'cert', label: '서티 승인대기', value: rows.filter((s) => s.cert.status === '승인대기').length, to: '/sales?cert=pending' },
      { key: 'cust', label: '고객사 승인대기', value: customers.filter((c) => c.approval === '승인대기').length, to: '/customers' },
      { key: 'cost', label: '원가명세서 처리', value: ordered.filter((s) => !docs.some((d) => d.salescd === s.salescd && d.type === '원가명세서')).length, to: '/biz/contracts' },
      { key: 'hb', label: 'HyBoost 미출고', value: hbPending, to: '/biz/hyboost' },
      { key: 'lic', label: '라이선스 미발급/보류', value: licPending, to: '/biz/license' },
      { key: 'insp', label: '검수대기', value: rows.filter((s) => s.inspection && s.inspection.status !== '검수완료').length, to: '/sales?phase=이행' },
      { key: 'ar', label: `미수채권 현황 · 추심 ${arActive.filter((r) => arStatus(r) === '추심대상').length}`, value: arActive.length, to: '/biz/receivables' },
    ];
    const kpis = [
      { label: 'Forecast 매출 / 이익', value: `${compact(sum(active).sales)} / ${compact(sum(active).profit)}`, sub: `${active.length}건 · 확도가중 ${compact(active.reduce((a, s) => a + amt(s).sales * s.probability / 100, 0))}` },
      { label: '수주 매출 / 이익', value: `${compact(sum(ordered).sales)} / ${compact(sum(ordered).profit)}`, sub: `${ordered.length}건` },
      { label: '완료 매출 / 이익', value: `${compact(sum(done).sales)} / ${compact(sum(done).profit)}`, sub: `${done.length}건 · 미수 ${rows.filter((s) => s.status === 'SN12M').length}건` },
      { label: '서티 승인대기', value: `${rows.filter((s) => s.cert.status === '승인대기').length}건`, sub: '프로젝트 생성 시 자동 상신' },
      { label: '추심대상 채권', value: `${arActive.filter((r) => arStatus(r) === '추심대상').length}건`, sub: `미수잔액 ${compact(arActive.reduce((a, r) => a + r.amount - r.paid, 0))}` },
    ];
    const workflow = [
      { key: 'active', label: '영업 진행', hint: '대기·영업중·분기예측', rows: active },
      { key: 'order', label: '수주', hint: '수주 상태 영업건', rows: rows.filter((s) => s.status === 'SN05Z') },
      { key: 'contract', label: '계약·원가 대기', hint: '계약 미등록 또는 원가명세서 미등록', rows: ordered.filter((s) => !s.contractId || !docs.some((d) => d.salescd === s.salescd && d.type === '원가명세서')) },
      { key: 'inspection', label: '납품·검수 대기', hint: '수주 후 검수 미완료', rows: ordered.filter((s) => s.inspection?.status !== '검수완료') },
      { key: 'receivable', label: '완료 · 미수', hint: '미수채권 확인 대상', rows: rows.filter((s) => s.status === 'SN12M') },
      { key: 'collected', label: '완료 · 수금', hint: '수금 완료 영업건', rows: rows.filter((s) => s.status === 'SN12Z') },
    ];
    const mySchedules = schedules.filter((s) => (me.role === 'sales' ? s.ownerId === me.id : codes.has(s.salescd ?? '') || s.ownerId === me.id));
    const myVisits = visits.filter((v) => codes.has(v.salescd)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 5);
    return { me, rows, tasks, kpis, workflow, active, mySchedules, myVisits };
  }, [all, customers, ars, frs, docs, schedules, visits, me]);
}

export default function Dashboard() {
  const device = useDevice();
  const d = useDashboardData();
  const prefs = useDB((x) => x.dashboard);
  const notices = useDB((x) => x.notices); const resources = useDB((x) => x.resources);
  const nav = useNavigate();
  const lk = useLookups();
  const [settings, setSettings] = useState(false);
  const [schedModal, setSchedModal] = useState(false);
  const [visitModal, setVisitModal] = useState(false);
  const [week, setWeek] = useState(0);
  const mobile = device !== 'desktop';
  const visible = prefs.order.filter((k) => prefs.visible.includes(k));
  const weekStart = dayjs(today()).startOf('week').add(1, 'day').add(week, 'week'); // 월요일 시작
  const weekEnd = weekStart.add(6, 'day');
  const weekSched = d.mySchedules.filter((s) => s.date >= weekStart.format('YYYY-MM-DD') && s.date <= weekEnd.format('YYYY-MM-DD')).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const Box = ({ title, extra, children, span = 24 }: { title: string; extra?: React.ReactNode; children: React.ReactNode; span?: number }) => mobile
    ? <div className="m-section"><div className="m-section-title"><span>{title}</span>{extra}</div>{children}</div>
    : <Col span={span}><div className="pane" style={{ marginBottom: 14 }}><div className="pane-title"><span>{title}</span>{extra}</div>{children}</div></Col>;

  const widgets: Record<WidgetKey, React.ReactNode> = {
    tasks: (
      <Box title="내가 처리할 업무" extra={<span className="muted">숫자를 누르면 해당 업무로 이동</span>}>
        <div className="task-grid">{d.tasks.map((t) => <button key={t.key} className={`task-card ${t.value ? 'hot' : ''}`} onClick={() => nav(t.to)}><span>{t.label}</span><b>{t.value}건</b></button>)}</div>
      </Box>),
    favorites: (
      <Box title="즐겨찾기" extra={<Button size="small" type="text" onClick={() => setSettings(true)}>편집</Button>}>
        <div className="fav-row">{prefs.favorites.map((f) => <button key={f} className="fav-chip" onClick={() => nav(f)}>{FAVORITE_OPTIONS.find((o) => o.key === f)?.label ?? f} <RightOutlined style={{ fontSize: 10 }} /></button>)}</div>
      </Box>),
    kpis: (
      <Box title="실적 KPI" extra={<span className="muted">{d.me.role === 'sales' || d.me.role === 'team_lead' ? `${lk.teamName(d.me.teamId)} 범위` : '전체 범위'}</span>}>
        <div className="kpi-row" style={{ marginBottom: 0 }}>{d.kpis.map((k) => <div key={k.label} className="kpi"><div className="l">{k.label}</div><div className="v" style={{ fontSize: 18 }}>{k.value}</div><div className="s">{k.sub}</div></div>)}</div>
      </Box>),
    notices: (
      <Box title="공지 · 자료실" span={12}>
        <div className="notice-grid">
          <div className="notice-card n"><NotificationOutlined /> <b>공지 {notices.length}건</b>{notices.map((n) => <div key={n.id} className="muted">{n.urgent && <Tag color="red">긴급</Tag>}{n.title} · {n.date}</div>)}</div>
          <div className="notice-card r"><FolderOpenOutlined /> <b>자료실 {resources.length}건</b>{resources.slice(0, 3).map((r) => <div key={r.id} className="muted">{r.category} · {r.title}</div>)}</div>
        </div>
      </Box>),
    schedule: (
      <Box title="나의 영업 일정" span={12} extra={<Space><Button size="small" onClick={() => setWeek(week - 1)}>‹</Button><span className="muted">{weekStart.format('MM-DD')} ~ {weekEnd.format('MM-DD')}</span><Button size="small" onClick={() => setWeek(week + 1)}>›</Button><Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setSchedModal(true)}>일정</Button></Space>}>
        {weekSched.length ? weekSched.map((s) => (
          <div key={s.id} className="sched-row">
            <div className="sched-time">{s.date.slice(5)}<br /><small>{s.time}</small></div>
            <div style={{ flex: 1, minWidth: 0 }}><Tag>{s.kind}</Tag><b>{s.title}</b><div className="muted">{s.salescd ? <a onClick={() => nav(`/sales/${s.salescd}`)}>{d.rows.find((x) => x.salescd === s.salescd)?.name ?? s.salescd}</a> : '-'} · {lk.userName(s.ownerId)}{s.memo ? ` · ${s.memo}` : ''}</div></div>
            {s.status === '예정' ? <Space size={4}><Button size="small" onClick={() => setScheduleStatus(s.id, '완료')}>완료</Button><Button size="small" onClick={() => setScheduleStatus(s.id, '취소')}>취소</Button></Space> : <Tag>{s.status}</Tag>}
          </div>)) : <div className="muted" style={{ padding: 8 }}>이번 주 일정이 없습니다.</div>}
      </Box>),
    visits: (
      <Box title="직출 등록 · 직출보고" span={12} extra={<Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setVisitModal(true)}>직출 추가</Button>}>
        {d.myVisits.map((v) => <div key={v.id} className="visit-row"><b>{v.salescd} · {lk.userName(v.ownerId)} · {lk.customerName(d.rows.find((s) => s.salescd === v.salescd)?.custcd ?? '')}</b><div className="muted">{v.date} {v.time} · {v.place} · {v.text}</div></div>)}
        {!d.myVisits.length && <div className="muted" style={{ padding: 8 }}>직출 기록이 없습니다.</div>}
        <Button size="small" type="link" onClick={() => nav('/biz/visits')}>직출관리 전체 보기 →</Button>
      </Box>),
    pipeline: (
      <Box title={`진행 중인 Forecasting (${d.active.length}건)`} span={12}>
        <Collapse size="small" ghost items={[{ key: 'p', label: '필요할 때 목록 펼치기', children: (
          <Table size="small" pagination={false} dataSource={d.active.slice(0, 12)} rowKey="salescd" onRow={(r) => ({ onClick: () => nav(`/sales/${r.salescd}`) })} columns={[
            { title: '상태', dataIndex: 'status', width: 110, render: (v) => <StatusTag code={v} /> }, { title: '프로젝트', dataIndex: 'name', ellipsis: true },
            { title: '확도', dataIndex: 'probability', width: 60, render: (v) => `${v}%` }, { title: '매출', width: 100, align: 'right', render: (_, r) => compact(lineTotals(r.lines).sales) },
          ]} />) }]} />
      </Box>),
    workflow: (
      <Box title="업무 진행 현황" span={12}>
        <div className="wf-grid">{d.workflow.map((w) => <button key={w.key} className="wf-card" onClick={() => nav(`/sales?wf=${w.key}`)}><div><b>{w.label}</b><div className="muted">{w.hint}</div></div><span className="wf-count">{w.rows.length}건</span></button>)}</div>
      </Box>),
  };

  const header = mobile ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px 0' }}><b>대시보드</b><Space><MButton size="mini" onClick={() => setSettings(true)}>위젯</MButton><MButton size="mini" color="primary" onClick={() => nav('/sales')}>영업 현황</MButton></Space></div>
  ) : (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>대시보드</Typography.Title>
      <Space><Button icon={<SettingOutlined />} onClick={() => setSettings(true)}>위젯 설정</Button>{can.editSales(d.me) && <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/sales?new=1')}>영업 건 등록</Button>}</Space>
    </div>
  );

  const body = mobile
    ? <div className="m-body">{header}{visible.map((k) => <div key={k}>{widgets[k]}</div>)}<div style={{ height: 20 }} /></div>
    : <div>{header}<Row gutter={14}>{visible.map((k) => <WidgetSlot key={k}>{widgets[k]}</WidgetSlot>)}</Row></div>;

  return (
    <>
      {body}
      <WidgetSettings open={settings} onClose={() => setSettings(false)} />
      <ScheduleModal open={schedModal} onClose={() => setSchedModal(false)} />
      <VisitModal open={visitModal} onClose={() => setVisitModal(false)} />
    </>
  );
}
function WidgetSlot({ children }: { children: React.ReactNode }) { return <>{children}</>; }

/** 위젯 설정 — 표시 여부·순서·즐겨찾기 (V2.4: 선택·이동 가능 위젯) */
function WidgetSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const prefs = useDB((x) => x.dashboard);
  const device = useDevice();
  const move = (k: WidgetKey, dir: -1 | 1) => { const o = [...prefs.order]; const i = o.indexOf(k); const j = i + dir; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; saveDashboard({ order: o }); };
  const content = (
    <Space direction="vertical" style={{ width: '100%' }} size={14}>
      <div><b>위젯 표시 · 순서</b>
        {prefs.order.map((k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #eef1f7' }}>
            <Checkbox checked={prefs.visible.includes(k)} onChange={(e) => saveDashboard({ visible: e.target.checked ? [...prefs.visible, k] : prefs.visible.filter((x) => x !== k) })}>{WIDGET_LABEL[k]}</Checkbox>
            <span style={{ marginLeft: 'auto' }}><Button size="small" type="text" icon={<ArrowUpOutlined />} onClick={() => move(k, -1)} /><Button size="small" type="text" icon={<ArrowDownOutlined />} onClick={() => move(k, 1)} /></span>
          </div>))}
      </div>
      <div><b>즐겨찾기</b><div className="muted" style={{ marginBottom: 6 }}>자주 쓰는 메뉴 바로가기</div>
        <Checkbox.Group value={prefs.favorites} onChange={(v) => saveDashboard({ favorites: v as string[] })} options={FAVORITE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }} />
      </div>
    </Space>
  );
  if (device !== 'desktop') return <Popup visible={open} onMaskClick={onClose} position="bottom" bodyStyle={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}><div className="sheet-title">위젯 설정</div><div className="sheet-body">{content}</div></Popup>;
  return <Drawer open={open} onClose={onClose} title="위젯 설정" width={380}>{content}</Drawer>;
}

function ScheduleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form] = Form.useForm(); const lk = useLookups(); const all = useDB((x) => x.sales); const me = currentUser();
  const mine = visibleSales(me, all).filter((s) => !s.legacy);
  return (
    <Modal open={open} title="일정 등록" destroyOnHidden onCancel={onClose} okText="저장" cancelText="취소" afterOpenChange={(o) => { if (o) { form.resetFields(); form.setFieldsValue({ kind: '미팅', date: dayjs(today()), time: dayjs('10:00', 'HH:mm') }); } }}
      onOk={async () => { const v = await form.validateFields(); upsertSchedule({ salescd: v.salescd, date: v.date.format('YYYY-MM-DD'), time: v.time.format('HH:mm'), kind: v.kind, title: v.title, memo: v.memo, status: '예정' }); onClose(); }}>
      <Form form={form} layout="vertical">
        <Form.Item name="salescd" label="연결 영업 건" rules={[{ required: true, message: '등록된 영업 건을 선택하세요 (자유 입력 불가)' }]}><Select showSearch optionFilterProp="label" options={mine.map((s) => ({ value: s.salescd, label: `${s.salescd} · ${lk.customerName(s.custcd)} · ${s.name}` }))} /></Form.Item>
        <Space><Form.Item name="date" label="일자" rules={[{ required: true }]}><DatePicker /></Form.Item><Form.Item name="time" label="시간" rules={[{ required: true }]}><TimePicker format="HH:mm" minuteStep={30} /></Form.Item><Form.Item name="kind" label="유형"><Select style={{ width: 110 }} options={['미팅', '제안', '통화', '데모', '기타'].map((k) => ({ value: k }))} /></Form.Item></Space>
        <Form.Item name="title" label="제목" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="memo" label="메모"><Input /></Form.Item>
      </Form>
    </Modal>
  );
}

/** 직출 등록 — 등록된 영업 건에만 연결(고객·프로젝트 자유 입력 금지) */
export function VisitModal({ open, onClose, presetSalescd }: { open: boolean; onClose: () => void; presetSalescd?: string }) {
  const [form] = Form.useForm(); const lk = useLookups(); const all = useDB((x) => x.sales); const me = currentUser(); const { message } = AntApp.useApp();
  const mine = visibleSales(me, all).filter((s) => !s.legacy);
  const selected = Form.useWatch('salescd', form);
  const cust = lk.customers.find((c) => c.custcd === mine.find((s) => s.salescd === selected)?.custcd);
  return (
    <Modal open={open} title="직출 등록" destroyOnHidden onCancel={onClose} okText="등록" cancelText="취소" afterOpenChange={(o) => { if (o) { form.resetFields(); form.setFieldsValue({ salescd: presetSalescd, date: dayjs(today()), time: dayjs('10:00', 'HH:mm'), place: '고객사 본사 회의실' }); } }}
      onOk={async () => { const v = await form.validateFields(); addVisit({ salescd: v.salescd, date: v.date.format('YYYY-MM-DD'), time: v.time.format('HH:mm'), place: v.place, customerContact: v.customerContact, vendorAttend: v.vendorAttend, text: v.text }); message.success('직출을 등록하고 활동 이력에 연결했습니다.'); onClose(); }}>
      <Form form={form} layout="vertical">
        <Form.Item name="salescd" label="영업 건 (등록된 건만 선택)" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={mine.map((s) => ({ value: s.salescd, label: `${s.salescd} · ${lk.customerName(s.custcd)} · ${s.name}` }))} /></Form.Item>
        <Space><Form.Item name="date" label="직출일" rules={[{ required: true }]}><DatePicker /></Form.Item><Form.Item name="time" label="시간" rules={[{ required: true }]}><TimePicker format="HH:mm" minuteStep={30} /></Form.Item><Form.Item name="place" label="장소" rules={[{ required: true }]}><Input style={{ width: 220 }} /></Form.Item></Space>
        <Space><Form.Item name="customerContact" label="고객 담당자" rules={[{ required: true }]}><Select style={{ width: 180 }} options={(cust?.contacts ?? []).map((k) => ({ value: k.name, label: `${k.name} ${k.title}` }))} /></Form.Item><Form.Item name="vendorAttend" label="업체 동석"><Select allowClear style={{ width: 180 }} options={lk.partners.map((p) => ({ value: p.name }))} /></Form.Item></Space>
        <Form.Item name="text" label="직출 내용" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </Modal>
  );
}
