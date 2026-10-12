import { useState } from 'react';
import { Descriptions, Tabs, Table, Button, Dropdown, Space, Tag, Alert, Timeline, Modal, Form, Select, Input, DatePicker, App as AntApp, Empty, Typography, Popconfirm, Upload, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, SwapOutlined, PaperClipOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, ExpandOutlined, CompressOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { SalesOpportunity, SalesLine, SalesStatus, DocType } from '@/types';
import { statusDef, SALES_TYPE_LABEL, CERT_APPROVERS, DOC_TYPES } from '@/types';
import { StatusTag, TaxTag, Prob, CertTag, useLookups } from '@/components/common';
import { lineTotals, transitionSales, removeLine, addActivity, addAttachment, currentUser, can, decideCert, completeInspection, remainingQty, arStatus, arOutstanding, decideFulfill } from '@/api';
import { useDB } from '@/api/store';
import { won, pct, compact } from '@/utils/format';
import LineModal from './LineModal';
import FulfillModal from './FulfillModal';
import { VisitModal } from '@/pages/Dashboard';

interface Props { sales: SalesOpportunity; onEdit: () => void; compact?: boolean; full?: boolean; onToggleFull?: () => void; }

/** 단계 스트립 — 영업등록 → 서티 → 견적 → 수주 → 원가 → 계약 → 출고/발급 → 검수 → 매출 → 입금 (V2.4 전체화면 상세) */
function StepStrip({ s }: { s: SalesOpportunity }) {
  const docs = useDB((d) => d.documents.filter((x) => x.salescd === s.salescd));
  const frs = useDB((d) => d.fulfillRequests.filter((x) => x.salescd === s.salescd));
  const ar = useDB((d) => d.receivables.find((x) => x.salescd === s.salescd));
  const ph = statusDef(s.status).phase;
  const ordered = ['수주', '이행', '종결'].includes(ph) && !['SN13Z', 'SN14Z'].includes(s.status);
  const steps: { label: string; value: string; cls: string }[] = [
    { label: '영업등록', value: '완료', cls: 'ok' },
    { label: '서티', value: s.cert.status, cls: s.cert.status === '승인완료' ? 'ok' : s.cert.status === '반려' ? 'warn' : '' },
    { label: '견적', value: docs.some((d) => d.type === '매출견적서') || s.attachments.some((a) => a.type === '매출견적서') ? '등록' : '대기', cls: docs.some((d) => d.type === '매출견적서') || s.attachments.some((a) => a.type === '매출견적서') ? 'ok' : '' },
    { label: '수주', value: ordered ? '완료' : ph === '종결' ? statusDef(s.status).name : '진행', cls: ordered ? 'ok' : '' },
    { label: '원가', value: docs.some((d) => d.type === '원가명세서') ? '승인' : '미상신', cls: docs.some((d) => d.type === '원가명세서') ? 'ok' : ordered ? 'warn' : '' },
    { label: '계약', value: s.contractId ? '등록' : '미등록', cls: s.contractId ? 'ok' : ordered ? 'warn' : '' },
    { label: '출고/발급', value: frs.length ? (frs.every((r) => /완료/.test(r.status)) ? '완료' : '진행') : ordered ? '대기' : '-', cls: frs.length && frs.every((r) => /완료/.test(r.status)) ? 'ok' : '' },
    { label: '검수', value: s.inspection?.status ?? '-', cls: s.inspection?.status === '검수완료' ? 'ok' : '' },
    { label: '매출', value: s.taxStatus === 'TBOK' ? '발행' : s.taxStatus === 'NONE' ? '대기' : s.taxStatus, cls: s.taxStatus === 'TBOK' ? 'ok' : '' },
    { label: '입금', value: ar ? arStatus(ar) : '-', cls: ar && arStatus(ar) === '입금완료' ? 'ok' : ar && ['추심대상', '미수채권 관리중'].includes(arStatus(ar)) ? 'warn' : '' },
  ];
  return <div className="step-strip">{steps.map((x) => <div key={x.label} className={x.cls}>{x.label}<b>{x.value}</b></div>)}</div>;
}

export default function SalesDetail({ sales: s, onEdit, compact: isCompact, full, onToggleFull }: Props) {
  const lk = useLookups();
  const nav = useNavigate();
  const { message } = AntApp.useApp();
  const contract = useDB((d) => d.contracts.find((c) => c.id === s.contractId));
  const parent = useDB((d) => d.sales.find((x) => x.salescd === s.parentSalescd));
  const frs = useDB((d) => d.fulfillRequests.filter((x) => x.salescd === s.salescd));
  const docs = useDB((d) => d.documents.filter((x) => x.salescd === s.salescd));
  const ar = useDB((d) => d.receivables.find((x) => x.salescd === s.salescd));
  const party = useDB((d) => d.contractParties.find((x) => x.id === s.partyId));
  const me = currentUser();
  const t = lineTotals(s.lines);
  const def = statusDef(s.status);
  const [lineModal, setLineModal] = useState<SalesLine | null | 'new'>(null);
  const [actModal, setActModal] = useState(false);
  const [visitModal, setVisitModal] = useState(false);
  const [inspModal, setInspModal] = useState(false);
  const [certReject, setCertReject] = useState(false);
  const [fulfill, setFulfill] = useState<{ kind: 'license' | 'shipment'; line: SalesLine } | null>(null);
  const editable = can.editSales(me) && !s.legacy;
  const ordered = ['수주', '이행', '종결'].includes(def.phase) && !['SN13Z', 'SN14Z'].includes(s.status);

  const doTransition = (to: SalesStatus) => {
    const r = transitionSales(s.salescd, to);
    if (!r.ok) return message.error(r.warnings[0]);
    if (r.warnings.length) Modal.warning({ title: '상태를 변경했습니다 (경고 기록)', content: <ul className="warn-list">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul> });
    else message.success(`상태 변경: ${statusDef(to).name}`);
  };
  const transitionMenu = { items: def.next.map((n) => ({ key: n, label: statusDef(n).name })), onClick: ({ key }: { key: string }) => doTransition(key as SalesStatus) };

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <div style={{ minWidth: 0 }}>
        <Space size={6} wrap>
          <Typography.Text type="secondary">{s.salescd}</Typography.Text><StatusTag code={s.status} /><CertTag status={s.cert.status} />
          {s.legacy && <Tag>이전영업(조회용)</Tag>}{s.crossCheckWarnings?.length ? <Tag color="orange">경고 {s.crossCheckWarnings.length}</Tag> : null}
        </Space>
        <Typography.Title level={isCompact ? 5 : 4} style={{ margin: '4px 0 0' }}>{s.name}</Typography.Title>
        <Typography.Text type="secondary">{lk.customerName(s.custcd)} · {lk.teamName(s.teamId)} / {lk.userName(s.ownerId)} · 계약처 {s.partyName ?? '-'} · {s.salesType} {SALES_TYPE_LABEL[s.salesType]}</Typography.Text>
      </div>
      <Space wrap>
        {onToggleFull && <Tooltip title={full ? '3분할 화면' : '세부내용 전체화면'}><Button icon={full ? <CompressOutlined /> : <ExpandOutlined />} onClick={onToggleFull}>{full ? '3분할' : '전체화면'}</Button></Tooltip>}
        {editable && def.next.length > 0 && <Dropdown menu={transitionMenu}><Button icon={<SwapOutlined />}>상태 전이</Button></Dropdown>}
        {editable && <Button icon={<EditOutlined />} onClick={onEdit}>수정</Button>}
      </Space>
    </div>
  );

  const certBox = (
    <div className="pane" style={{ border: '1px solid #c7d2fe', background: '#f5f7ff', marginBottom: 10, padding: 12 }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <b>서티 승인 · 프로젝트 생성 시 자동 상신</b> <CertTag status={s.cert.status} />
          <div className="muted">상신 {s.cert.submittedAt} · 승인권자: {CERT_APPROVERS.join(' · ')}{s.cert.approver ? ` · 처리 ${s.cert.approver} (${s.cert.decidedAt})` : ''}{s.cert.reason ? ` · 사유: ${s.cert.reason}` : ''}</div>
        </div>
        {s.cert.status === '승인대기' && can.approveCert(me) && <Space><Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => { decideCert(s.salescd, '승인완료'); message.success('서티를 승인했습니다.'); }}>승인</Button><Button size="small" danger icon={<CloseOutlined />} onClick={() => setCertReject(true)}>반려</Button></Space>}
      </Space>
      {s.cert.status !== '승인완료' && <Alert style={{ marginTop: 8 }} type="warning" showIcon message="서티 승인완료 전에는 수주 전이가 차단됩니다." />}
    </div>
  );

  const basic = (
    <>
      {s.crossCheckWarnings?.length ? <Alert type="warning" showIcon style={{ marginBottom: 10 }} message="교차검토(C-1) 경고" description={<ul style={{ margin: 0, paddingLeft: 18 }}>{s.crossCheckWarnings.map((w) => <li key={w}>{w}</li>)}</ul>} /> : null}
      <Descriptions size="small" bordered column={isCompact ? 1 : 3} styles={{ label: { width: 110 } }}>
        <Descriptions.Item label="프로젝트코드">{s.salescd}</Descriptions.Item>
        <Descriptions.Item label="고객사"><a onClick={() => nav(`/customers/${s.custcd}`)}>{lk.customerName(s.custcd)}</a></Descriptions.Item>
        <Descriptions.Item label="계약처">{s.partyName ?? '-'} {party && <Tag color={party.status === '등재' ? 'green' : 'gold'}>{party.status}{party.creditRating ? ` · ${party.creditRating}` : ''}</Tag>}</Descriptions.Item>
        <Descriptions.Item label="계약구분">{s.salesType} · {SALES_TYPE_LABEL[s.salesType]}</Descriptions.Item>
        <Descriptions.Item label="도입관계">{s.relation}{s.competitor && <Tag style={{ marginLeft: 6 }} color="volcano">윈백 · {s.competitor}</Tag>}</Descriptions.Item>
        <Descriptions.Item label="본사업">{parent ? <a onClick={() => nav(`/sales/${parent.salescd}`)}>{parent.salescd} · {parent.name}</a> : '-'}</Descriptions.Item>
        <Descriptions.Item label="수주확도"><Prob value={s.probability} /></Descriptions.Item>
        <Descriptions.Item label="매출예상시기">{s.forecastYm}</Descriptions.Item>
        <Descriptions.Item label="수주일">{s.orderDate ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="영업담당">{lk.teamName(s.teamId)} / {lk.userName(s.ownerId)}</Descriptions.Item>
        <Descriptions.Item label="파트너">{s.partnerId ? <a onClick={() => nav(`/partners/${s.partnerId}`)}>{lk.partnerName(s.partnerId)}</a> : '-'}</Descriptions.Item>
        <Descriptions.Item label="TQS 코드">{s.tqsProjectCode ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="매출 / 매입 / 이익" span={isCompact ? 1 : 3}><b>{won(t.sales)}</b> / {won(t.buy)} / <b style={{ color: '#237804' }}>{won(t.profit)}</b> <Tag>{pct(t.margin)}</Tag></Descriptions.Item>
        {s.memo && <Descriptions.Item label="비고" span={3}>{s.memo}</Descriptions.Item>}
      </Descriptions>
    </>
  );

  const lineActions = (l: SalesLine) => {
    if (!ordered || l.kind !== '매출') return null;
    const licRemain = remainingQty('license', s, l); const shipRemain = l.hyboost ? remainingQty('shipment', s, l) : 0;
    const licPending = frs.some((r) => r.kind === 'license' && r.lineId === l.id && r.status === '요청대기');
    const shipPending = frs.some((r) => r.kind === 'shipment' && r.lineId === l.id && r.status === '요청대기');
    return (
      <Space size={2} wrap>
        {licPending ? <Tag color="gold">발급 대기</Tag> : licRemain > 0 ? <Button size="small" onClick={() => setFulfill({ kind: 'license', line: l })}>발급 신청</Button> : <Tag color="green">발급완료</Tag>}
        {l.hyboost && (shipPending ? <Tag color="gold">출고 대기</Tag> : shipRemain > 0 ? <Button size="small" onClick={() => setFulfill({ kind: 'shipment', line: l })}>출고 요청</Button> : <Tag color="green">출고완료</Tag>)}
      </Space>
    );
  };

  const lines = (
    <>
      <div className="summary-bar">
        <span>매출합계 <b>{won(t.sales)}</b></span><span>매입·비용 <b>{won(t.buy)}</b></span><span>이익 <b>{won(t.profit)}</b></span><span>이익률 <b>{pct(t.margin)}</b></span>
        {editable && <Button size="small" type="primary" icon={<PlusOutlined />} style={{ marginLeft: 'auto' }} onClick={() => setLineModal('new')}>제품라인 추가</Button>}
      </div>
      <Table size="small" pagination={false} dataSource={s.lines} rowKey="id" scroll={{ x: 1100 }}
        columns={[
          { title: '구분', dataIndex: 'kind', width: 70, render: (k) => <Tag color={k === '매출' ? 'blue' : k === '매입' ? 'volcano' : k === '서비스' ? 'green' : 'default'}>{k}</Tag> },
          { title: '도입관계', dataIndex: 'relation', width: 80 },
          { title: '제품군', dataIndex: 'group', width: 90 },
          { title: '제품 / 세부품목', render: (_, r) => <><b>{r.product}</b><div className="muted">{r.sub}{r.license ? ` · ${r.license}` : ''}</div></> },
          { title: '버전', dataIndex: 'version', width: 60, render: (v) => v ?? '-' },
          { title: '망', dataIndex: 'network', width: 70, render: (v) => v ?? '-' },
          { title: 'HyBoost', dataIndex: 'hyboost', width: 110, render: (v, r) => v ? <span>{v}<div className="muted">{r.mirror !== '미해당' ? r.mirror : ''}</div></span> : '-' },
          { title: '수량', dataIndex: 'qty', align: 'right', width: 60 },
          { title: 'HB수량', dataIndex: 'hyboostQty', align: 'right', width: 70, render: (v) => v || '-' },
          { title: '매출', dataIndex: 'sales', align: 'right', width: 110, render: won },
          { title: '매입', dataIndex: 'buy', align: 'right', width: 110, render: won },
          { title: '이익', align: 'right', width: 110, render: (_, r) => won(r.sales - r.buy) },
          { title: '발급 · 출고', width: 170, render: (_, r) => lineActions(r) },
          ...(editable ? [{ title: '', width: 70, render: (_: unknown, r: SalesLine) => <Space size={2}><Button size="small" type="text" icon={<EditOutlined />} onClick={() => setLineModal(r)} /><Popconfirm title="삭제할까요?" onConfirm={() => removeLine(s.salescd, r.id)}><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Popconfirm></Space> }] : []),
        ]} />
    </>
  );

  const contractTab = (
    <>
      {contract ? (
        <Descriptions size="small" bordered column={isCompact ? 1 : 2}>
          <Descriptions.Item label="계약번호"><a onClick={() => nav(`/biz/contracts/${contract.id}`)}>{contract.id}</a> <Tag>{contract.type}</Tag></Descriptions.Item>
          <Descriptions.Item label="계약처">{contract.party}</Descriptions.Item>
          <Descriptions.Item label="공급가액 / 부가세">{won(contract.amount)} / {won(contract.vat)}</Descriptions.Item>
          <Descriptions.Item label="체결일 · 기간">{contract.signedAt} · {contract.start} ~ {contract.end}</Descriptions.Item>
          <Descriptions.Item label="수금·지급 조건">{contract.paymentTerms} (지급기일 {contract.paymentDueDays}일)</Descriptions.Item>
          <Descriptions.Item label="MA 요율">{contract.maRate ?? '-'}% (무상 {contract.freeMaMonths}개월)</Descriptions.Item>
          <Descriptions.Item label="계약서 원문" span={2}>{can.readContractFile(me) ? contract.attachments.map((a) => <Tag key={a.id} icon={<PaperClipOutlined />}>{a.docNo ?? ''} {a.name}</Tag>) : <span className="muted">열람 권한 없음 (영업지원·재무·MA·경영진·관리자 — v2.3 B-2)</span>}</Descriptions.Item>
        </Descriptions>
      ) : <Empty description="계약 정보가 없습니다. 수주 이후 사업관리 > 계약 · 원가에서 등록합니다.">{editable && ordered && <Button type="primary" onClick={() => nav(`/biz/contracts?new=${s.salescd}`)}>계약 등록</Button>}</Empty>}
      <div className="pane-title" style={{ marginTop: 14 }}><span>원가명세서 · 문서</span>{editable && <Button size="small" onClick={() => nav(`/biz/docs?new=${s.salescd}&type=원가명세서`)}>원가명세서 상신</Button>}</div>
      <Table size="small" pagination={false} dataSource={docs} rowKey="id" columns={[{ title: '문서번호', dataIndex: 'docNo', width: 160 }, { title: '유형', dataIndex: 'type', width: 120, render: (v) => <Tag>{v}</Tag> }, { title: '문서명', dataIndex: 'name', ellipsis: true }, { title: '일자', dataIndex: 'date', width: 100 }, { title: '상태', dataIndex: 'status', width: 90 }]} locale={{ emptyText: '등록 문서 없음' }} />
    </>
  );

  const deliveryTab = (
    <>
      <Descriptions size="small" bordered column={isCompact ? 1 : 3} style={{ marginBottom: 10 }}>
        <Descriptions.Item label="납품 단계">{s.deliveryStage ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="검수 상태">{s.inspection ? <Tag color={s.inspection.status === '검수완료' ? 'green' : 'gold'}>{s.inspection.status}</Tag> : '-'}{s.inspection?.completedAt && ` ${s.inspection.completedAt}`}{s.inspection?.file && <Tag icon={<PaperClipOutlined />} style={{ marginLeft: 6 }}>{s.inspection.file}</Tag>}</Descriptions.Item>
        <Descriptions.Item label="처리">{editable && ordered && s.inspection?.status !== '검수완료' && <Button size="small" type="primary" onClick={() => setInspModal(true)}>검수완료 처리</Button>}</Descriptions.Item>
      </Descriptions>
      <div className="pane-title"><span>라이선스 발급 · HyBoost 출고 요청</span><span className="muted">제품라인 탭의 「발급 신청 / 출고 요청」으로 생성</span></div>
      <Table size="small" pagination={false} dataSource={frs} rowKey="id" columns={[
        { title: '번호', dataIndex: 'no', width: 130 }, { title: '구분', dataIndex: 'kind', width: 90, render: (v) => <Tag color={v === 'license' ? 'blue' : 'purple'}>{v === 'license' ? '라이선스' : 'HyBoost'}</Tag> },
        { title: '제품', render: (_, r) => { const l = s.lines.find((x) => x.id === r.lineId); return l ? `${l.product} / ${l.sub}${r.model ? ` · ${r.model}` : ''}` : '-'; } },
        { title: '수량', dataIndex: 'qty', width: 60, align: 'right' }, { title: '희망일', dataIndex: 'date', width: 100 }, { title: '용도/유형', width: 90, render: (_, r) => r.purpose ?? r.licenseType ?? '-' },
        { title: '상태', dataIndex: 'status', width: 90, render: (v) => <Tag color={/완료/.test(v) ? 'green' : /보류/.test(v) ? 'red' : 'gold'}>{v}</Tag> },
        { title: '처리', width: 160, render: (_, r) => r.status === '요청대기' && can.fulfill(me) ? <Space size={4}><Button size="small" type="primary" onClick={() => decideFulfill(r.id, r.kind === 'license' ? '발급완료' : '출고완료')}>완료</Button><Button size="small" onClick={() => decideFulfill(r.id, r.kind === 'license' ? '발급보류' : '출고보류')}>보류</Button></Space> : r.completedAt ?? '-' },
      ]} locale={{ emptyText: '요청 없음' }} />
    </>
  );

  const financeTab = (
    <Descriptions size="small" bordered column={isCompact ? 1 : 2}>
      <Descriptions.Item label="세금계산서"><TaxTag code={s.taxStatus} /> {s.taxDate ?? ''}</Descriptions.Item>
      <Descriptions.Item label="매출 / 매입 / 이익">{won(t.sales)} / {won(t.buy)} / {won(t.profit)}</Descriptions.Item>
      {ar ? (<>
        <Descriptions.Item label="채권"><a onClick={() => nav('/biz/receivables')}>{ar.id}</a> · 채권액 {won(ar.amount)} · 입금 {won(ar.paid)}</Descriptions.Item>
        <Descriptions.Item label="미수 상태"><Tag color={arStatus(ar) === '입금완료' ? 'green' : arStatus(ar) === '정상' ? 'blue' : 'orange'}>{arStatus(ar)}</Tag> 미수잔액 {won(arOutstanding(ar))}</Descriptions.Item>
      </>) : <Descriptions.Item label="채권" span={2}><span className="muted">세금계산서 발행 후 매출채권이 생성됩니다 (사업관리 &gt; 매출채권).</span></Descriptions.Item>}
    </Descriptions>
  );

  const activity = (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>{editable && <><Button size="small" onClick={() => setVisitModal(true)}>직출 등록</Button><Button size="small" icon={<PlusOutlined />} onClick={() => setActModal(true)}>활동 기록</Button></>}</div>
      <Timeline items={[
        ...s.activities.map((a) => ({ color: 'blue', children: <><b>{a.kind}</b> {a.text} <span className="muted">— {a.by} · {a.at}</span></> })),
        ...s.history.map((h) => ({ color: h.kind === '상태' ? 'green' : h.kind === '서티' ? 'purple' : 'gray', children: <>{h.text} <span className="muted">— {h.by} · {h.at}</span></> })),
      ].slice(0, 40)} />
    </>
  );

  const files = (
    <>
      {editable && <Upload beforeUpload={(f) => { const type: DocType = /견적/.test(f.name) ? '매출견적서' : /원가/.test(f.name) ? '원가명세서' : /제안/.test(f.name) ? '제안서' : /계약/.test(f.name) ? '계약서' : '기타'; addAttachment(s.salescd, f.name, type); message.success(`첨부 목록에 추가하고 통합문서함 번호를 부여했습니다 (${type}).`); return false; }} showUploadList={false}><Button size="small" icon={<PaperClipOutlined />} style={{ marginBottom: 8 }}>첨부 추가</Button></Upload>}
      <Table size="small" pagination={false} dataSource={s.attachments} rowKey="id" columns={[{ title: '문서번호', dataIndex: 'docNo', width: 160, render: (v) => v ?? <span className="muted">-</span> }, { title: '유형', dataIndex: 'type', width: 110, render: (v) => <Tag>{v}</Tag> }, { title: '파일명', dataIndex: 'name' }, { title: '등록', dataIndex: 'uploadedAt', width: 100 }, { title: '등록자', dataIndex: 'by', width: 80 }]} locale={{ emptyText: '첨부 없음' }} />
      <div className="muted" style={{ marginTop: 6 }}>문서 유형: {DOC_TYPES.join(' · ')}</div>
    </>
  );

  return (
    <div>
      {header}
      {full && <StepStrip s={s} />}
      {full && (
        <div className="summary-bar" style={{ marginBottom: 10 }}>
          <span>진행상태 <b>{def.name}</b></span><span>매출 <b>{compact(t.sales)}</b></span><span>매입 <b>{compact(t.buy)}</b></span><span>이익 <b>{compact(t.profit)}</b></span><span>입금 <b>{ar ? compact(ar.paid) : '-'}</b></span><span>서티 <b>{s.cert.status}</b></span>
        </div>
      )}
      {certBox}
      <Tabs size="small" items={[
        { key: 'basic', label: '프로젝트 · 제품 · 영업', children: <>{basic}<div className="pane-title" style={{ marginTop: 14 }}>제품라인 · 품목 손익</div>{lines}</> },
        { key: 'contract', label: '계약 · 원가', children: contractTab },
        { key: 'delivery', label: '납품 · 검수 · 발급', children: deliveryTab },
        { key: 'finance', label: '매출 · 매입 · 입금', children: financeTab },
        { key: 'activity', label: '활동 · 이력', children: activity },
        { key: 'files', label: `첨부 (${s.attachments.length})`, children: files },
      ]} />
      {lineModal !== null && <LineModal open sales={s} line={lineModal === 'new' ? undefined : lineModal} onClose={() => setLineModal(null)} />}
      <ActivityModal open={actModal} onClose={() => setActModal(false)} salescd={s.salescd} />
      <VisitModal open={visitModal} onClose={() => setVisitModal(false)} presetSalescd={s.salescd} />
      {fulfill && <FulfillModal open kind={fulfill.kind} sales={s} line={fulfill.line} onClose={() => setFulfill(null)} />}
      <InspectionModal open={inspModal} onClose={() => setInspModal(false)} salescd={s.salescd} />
      <Modal open={certReject} title="서티 반려" destroyOnHidden onCancel={() => setCertReject(false)} okText="반려" okButtonProps={{ danger: true }} cancelText="취소" onOk={() => { const el = document.getElementById('cert-reason') as HTMLInputElement | null; decideCert(s.salescd, '반려', el?.value || '사유 미기재'); setCertReject(false); }}>
        <Input id="cert-reason" placeholder="반려 사유" />
      </Modal>
    </div>
  );
}

function ActivityModal({ open, onClose, salescd }: { open: boolean; onClose: () => void; salescd: string }) {
  const [form] = Form.useForm();
  return (
    <Modal open={open} title="영업 활동 기록" destroyOnHidden onCancel={onClose} okText="저장" cancelText="취소" onOk={async () => { const v = await form.validateFields(); addActivity(salescd, v); onClose(); }}>
      <Form form={form} layout="vertical" initialValues={{ kind: '방문' }}>
        <Form.Item name="kind" label="활동 유형"><Select options={['방문', '통화', '메일', '회의', '메모'].map((k) => ({ value: k }))} /></Form.Item>
        <Form.Item name="text" label="내용" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </Modal>
  );
}

/** 검수완료 — 검수일과 검수완료서 파일이 모두 있어야 처리 (V2.4) */
function InspectionModal({ open, onClose, salescd }: { open: boolean; onClose: () => void; salescd: string }) {
  const [form] = Form.useForm();
  return (
    <Modal open={open} title="검수완료 처리" destroyOnHidden onCancel={onClose} okText="검수완료" cancelText="취소" onOk={async () => { const v = await form.validateFields(); completeInspection(salescd, v.date.format('YYYY-MM-DD'), v.file); onClose(); }}>
      <Form form={form} layout="vertical" initialValues={{ date: dayjs() }}>
        <Form.Item name="date" label="검수완료일" rules={[{ required: true }]}><DatePicker /></Form.Item>
        <Form.Item name="file" label="검수완료서 파일명" rules={[{ required: true, message: '검수완료서가 있어야 검수완료로 변경할 수 있습니다' }]}><Input placeholder="예: 검수완료서_2026-00001.pdf" /></Form.Item>
      </Form>
    </Modal>
  );
}
