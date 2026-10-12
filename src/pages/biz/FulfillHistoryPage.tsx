import { useState } from 'react';
import { Table, Button, Space, DatePicker, Tag, Statistic, Row, Col, Alert } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { List, Tag as MTag } from 'antd-mobile';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useDB, today } from '@/api/store';
import { currentUser, visibleSales, logAudit, decideFulfill, can } from '@/api';
import { useLookups } from '@/components/common';
import { useDevice } from '@/hooks/useDevice';
import type { FulfillRequest } from '@/types';

/** 라이선스 발급이력 / HyBoost 출고이력 — 보고월 기준 월간 전체·완료·대기/보류·완료 수량, 월간 Excel 보고서 (V2.4) */
export default function FulfillHistoryPage({ kind }: { kind: 'license' | 'shipment' }) {
  const device = useDevice(); const nav = useNavigate(); const lk = useLookups();
  const frs = useDB((d) => d.fulfillRequests); const all = useDB((d) => d.sales); useDB((d) => d.session.userId);
  const me = currentUser();
  const codes = new Set(visibleSales(me, all).map((s) => s.salescd));
  const [month, setMonth] = useState(today().slice(0, 7));
  const [showAll, setShowAll] = useState(true);
  const title = kind === 'license' ? '라이선스 발급이력' : 'HyBoost 출고이력';
  const rows = frs.filter((r) => r.kind === kind && codes.has(r.salescd) && (showAll || (r.completedAt ?? r.date).startsWith(month))).sort((a, b) => (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date));
  const done = rows.filter((r) => /완료/.test(r.status)); const pending = rows.filter((r) => !/완료/.test(r.status));
  const sale = (c: string) => all.find((s) => s.salescd === c); const line = (r: FulfillRequest) => sale(r.salescd)?.lines.find((l) => l.id === r.lineId);
  const csv = () => {
    const head = kind === 'license' ? ['발급·요청일', '발급/요청번호', '프로젝트코드', '고객사', '팀/담당자', '제품', '버전', '라이선스 사양', '수량', '발급유형', '상태'] : ['출고·요청일', '요청번호', '프로젝트코드', '고객사', '팀/담당자', '제품', 'HyBoost 모델', '출고수량', '용도', '상태'];
    const body = rows.map((r) => { const s = sale(r.salescd); const l = line(r); const base = [r.completedAt ?? r.date, r.no, r.salescd, lk.customerName(s?.custcd ?? ''), `${lk.teamName(s?.teamId ?? '')} / ${lk.userName(s?.ownerId ?? '')}`, l?.product ?? '']; return kind === 'license' ? [...base, l?.version ?? '', l?.license ?? '', r.qty, r.licenseType ?? '', r.status] : [...base, r.model ?? '', r.qty, r.purpose ?? '', r.status]; });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [head, ...body].map((x) => x.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = `${title}_${month}.csv`; a.click();
    logAudit('다운로드', title, `${rows.length}건`);
  };
  const controls = <Space wrap><span className="muted">보고월</span><DatePicker size="small" picker="month" value={dayjs(month + '-01')} onChange={(d) => { if (d) { setMonth(d.format('YYYY-MM')); setShowAll(false); } }} /><Button size="small" onClick={() => setShowAll(!showAll)}>{showAll ? '해당 월만' : '전체 기간'}</Button><Button size="small" icon={<DownloadOutlined />} onClick={csv}>월간 Excel 보고서</Button></Space>;
  const statusTag = (v: string) => <Tag color={/완료/.test(v) ? 'green' : /보류/.test(v) ? 'red' : 'gold'}>{v}</Tag>;
  const actions = (r: FulfillRequest) => r.status === '요청대기' && can.fulfill(me) ? <Space size={4}><Button size="small" type="primary" onClick={() => decideFulfill(r.id, kind === 'license' ? '발급완료' : '출고완료')}>완료</Button><Button size="small" onClick={() => decideFulfill(r.id, kind === 'license' ? '발급보류' : '출고보류')}>보류</Button></Space> : /보류/.test(r.status) && can.fulfill(me) ? <Button size="small" onClick={() => decideFulfill(r.id, kind === 'license' ? '발급완료' : '출고완료')}>보류 해제·완료</Button> : null;
  if (device !== 'desktop') {
    return (
      <div>
        <div className="m-section" style={{ padding: 12 }}>{controls}</div>
        <div className="m-kpis"><div className="m-kpi"><div className="l">월간 전체</div><div className="v">{rows.length}건</div></div><div className="m-kpi"><div className="l">완료</div><div className="v">{done.length}건</div></div><div className="m-kpi"><div className="l">대기·보류</div><div className="v">{pending.length}건</div></div><div className="m-kpi"><div className="l">완료 수량</div><div className="v">{done.reduce((a, r) => a + r.qty, 0)}</div></div></div>
        <List style={{ margin: 10, borderRadius: 12, overflow: 'hidden' }}>{rows.map((r) => <List.Item key={r.id} clickable onClick={() => nav(`/sales/${r.salescd}`)} description={`${r.salescd} · ${lk.customerName(sale(r.salescd)?.custcd ?? '')} · ${line(r)?.product ?? ''}${r.model ? ' · ' + r.model : ''} · ${r.qty}`} extra={<MTag color={/완료/.test(r.status) ? 'success' : /보류/.test(r.status) ? 'danger' : 'warning'} fill="outline">{r.status}</MTag>}>{r.no}</List.Item>)}</List>
      </div>
    );
  }
  return (
    <div className="pane">
      <div className="pane-title"><span>{title}</span>{controls}</div>
      <Row gutter={12} style={{ marginBottom: 10 }}><Col span={4}><Statistic title="월간 전체" value={rows.length} suffix="건" /></Col><Col span={4}><Statistic title="완료" value={done.length} suffix="건" /></Col><Col span={4}><Statistic title="대기·보류" value={pending.length} suffix="건" styles={{ content: { color: pending.length ? '#ad6800' : undefined } }} /></Col><Col span={4}><Statistic title="완료 수량" value={done.reduce((a, r) => a + r.qty, 0)} /></Col><Col span={8}><Alert type="info" showIcon message={kind === 'license' ? '발급 완료 시 SW 라이선스증서가 통합문서함에 자동 등록됩니다. 발급 수량은 제품라인 수량을 넘을 수 없습니다.' : '출고 수량은 제품라인의 HyBoost 수량 기준으로 관리하며, 데모·무상납품은 사유·기간이 필수입니다.'} /></Col></Row>
      <Table size="small" dataSource={rows} rowKey="id" pagination={{ pageSize: 20, size: 'small' }} columns={[
        { title: kind === 'license' ? '발급·요청일' : '출고·요청일', width: 100, render: (_, r) => r.completedAt ?? r.date }, { title: '번호', dataIndex: 'no', width: 130 },
        { title: '프로젝트코드', dataIndex: 'salescd', width: 110, render: (v) => <a onClick={() => nav(`/sales/${v}`)}>{v}</a> }, { title: '고객사', width: 120, render: (_, r) => lk.customerName(sale(r.salescd)?.custcd ?? '') },
        { title: '팀 / 담당자', width: 130, render: (_, r) => { const s = sale(r.salescd); return `${lk.teamName(s?.teamId ?? '')} / ${lk.userName(s?.ownerId ?? '')}`; } },
        { title: '제품', render: (_, r) => { const l = line(r); return l ? <>{l.product}<div className="muted">{l.sub}</div></> : '-'; } },
        ...(kind === 'license' ? [{ title: '버전', width: 60, render: (_: unknown, r: FulfillRequest) => line(r)?.version ?? '-' }, { title: '라이선스 사양', width: 130, render: (_: unknown, r: FulfillRequest) => line(r)?.license ?? '-' }, { title: '발급유형', dataIndex: 'licenseType', width: 80 }] : [{ title: 'HyBoost 모델', dataIndex: 'model', width: 150 }, { title: '용도', dataIndex: 'purpose', width: 80 }, { title: '납품 주소', dataIndex: 'address', ellipsis: true }]),
        { title: '수량', dataIndex: 'qty', width: 60, align: 'right' }, { title: '상태', dataIndex: 'status', width: 90, render: statusTag }, { title: '처리', width: 150, render: (_, r) => actions(r) },
      ]} />
    </div>
  );
}
