import { useState } from 'react';
import { Table, Button, Space, Radio, DatePicker, Tag } from 'antd';
import { PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { List } from 'antd-mobile';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useDB, today } from '@/api/store';
import { currentUser, visibleSales, logAudit, can } from '@/api';
import { useLookups } from '@/components/common';
import { useDevice } from '@/hooks/useDevice';
import { VisitModal } from '@/pages/Dashboard';

/** 직출관리 — 직출 등록·직출보고 (등록된 영업 건에만 연결). 오늘/전체/월 조회, Excel용 CSV */
export default function VisitsPage() {
  const device = useDevice(); const nav = useNavigate(); const lk = useLookups();
  const visits = useDB((d) => d.visitLogs); const all = useDB((d) => d.sales); useDB((d) => d.session.userId);
  const me = currentUser();
  const codes = new Set(visibleSales(me, all).map((s) => s.salescd));
  const [range, setRange] = useState<'오늘' | '전체' | '월'>('전체');
  const [month, setMonth] = useState(today().slice(0, 7));
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  void open;
  const rows = visits.filter((v) => codes.has(v.salescd) && (range === '전체' || (range === '오늘' ? v.date === today() : v.date.startsWith(month)))).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const sale = (code: string) => all.find((s) => s.salescd === code);
  const csv = () => {
    const head = ['직출일', '시간', '영업담당', '팀', '프로젝트코드', '고객사', '장소', '고객담당자', '업체 동석', '직출내용'];
    const body = rows.map((v) => { const s = sale(v.salescd); return [v.date, v.time, lk.userName(v.ownerId), lk.teamName(s?.teamId ?? ''), v.salescd, lk.customerName(s?.custcd ?? ''), v.place, v.customerContact, v.vendorAttend ?? '', v.text]; });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = `직출보고_${month}.csv`; a.click();
    logAudit('다운로드', '직출보고', `${rows.length}건`);
  };
  const controls = <Space wrap><Radio.Group size="small" value={range} onChange={(e) => setRange(e.target.value)} options={['오늘', '전체', '월']} optionType="button" />{range === '월' && <DatePicker size="small" picker="month" value={dayjs(month + '-01')} onChange={(d) => d && setMonth(d.format('YYYY-MM'))} />}<Button size="small" icon={<DownloadOutlined />} onClick={csv}>Excel용 CSV</Button>{can.editSales(me) && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setModal(true)}>직출 등록</Button>}</Space>;
  const modalEl = <VisitModal open={modal} onClose={() => { setModal(false); setOpen(false); }} />;
  if (device !== 'desktop') {
    return <div><div className="m-section" style={{ padding: 12 }}>{controls}</div><List>{rows.map((v) => <List.Item key={v.id} clickable onClick={() => nav(`/sales/${v.salescd}`)} description={`${v.date} ${v.time} · ${v.place} · ${v.text}`}>{v.salescd} · {lk.userName(v.ownerId)} · {lk.customerName(sale(v.salescd)?.custcd ?? '')}</List.Item>)}</List>{modalEl}</div>;
  }
  return (
    <div className="pane">
      <div className="pane-title"><span>직출 등록 · 직출보고 <span className="muted">{rows.length}건</span></span>{controls}</div>
      <Table size="small" dataSource={rows} rowKey="id" pagination={{ pageSize: 20, size: 'small' }} onRow={(r) => ({ onClick: () => nav(`/sales/${r.salescd}`) })} columns={[
        { title: '직출일', dataIndex: 'date', width: 100 }, { title: '시간', dataIndex: 'time', width: 60 }, { title: '영업담당', dataIndex: 'ownerId', width: 80, render: (v) => lk.userName(v) },
        { title: '팀', width: 90, render: (_, r) => lk.teamName(sale(r.salescd)?.teamId ?? '') },
        { title: '프로젝트 / 고객사', render: (_, r) => { const s = sale(r.salescd); return <><b>{r.salescd}</b> · {lk.customerName(s?.custcd ?? '')}<div className="muted">{s?.name}</div></>; } },
        { title: '장소', dataIndex: 'place', width: 140 }, { title: '고객담당자', dataIndex: 'customerContact', width: 90 }, { title: '업체 동석', dataIndex: 'vendorAttend', width: 100, render: (v) => v ? <Tag>{v}</Tag> : '-' },
        { title: '직출내용', dataIndex: 'text', ellipsis: true }, { title: '등록시각', dataIndex: 'createdAt', width: 130 },
      ]} />
      {modalEl}
    </div>
  );
}
