import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Table, Tag, Drawer, Descriptions, Input, Space, Statistic, Row, Col, Alert } from 'antd';
import { List, SearchBar, Card, Tag as MTag } from 'antd-mobile';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { lineTotals, currentUser, visibleSales } from '@/api';
import { StatusTag, useLookups } from '@/components/common';
import { compact, won } from '@/utils/format';
import type { Partner } from '@/types';

function usePartnerRows(q: string) {
  const partners = useDB((d) => d.partners);
  const sales = useDB((d) => d.sales);
  return partners.filter((p) => !q || `${p.name} ${p.bizNo}`.includes(q)).map((p) => {
    const list = sales.filter((s) => s.partnerId === p.id && !s.legacy);
    return { ...p, count: list.length, amount: list.reduce((a, s) => a + lineTotals(s.lines).sales, 0), fee: list.reduce((a, s) => a + s.lines.filter((l) => l.kind === '매입').reduce((x, l) => x + l.buy, 0), 0) };
  });
}

export default function PartnersPage() {
  const device = useDevice();
  const { id } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const rows = usePartnerRows(q);
  const selected = rows.find((p) => p.id === id);

  if (device !== 'desktop') {
    return (
      <div className="m-body">
        {selected ? <PartnerDetail p={selected} mobile /> : (
          <>
            <div style={{ padding: '10px 12px', background: '#fff' }}><SearchBar placeholder="파트너명" value={q} onChange={setQ} /></div>
            <List>{rows.map((p) => <List.Item key={p.id} clickable onClick={() => nav(`/partners/${p.id}`)} description={`${p.channelType} · ${p.paymentTerms} · ${p.count}건`} extra={<span className="m-list-item-amt">{compact(p.amount)}</span>}>{p.name} {p.status === 'inactive' && <MTag color="default">비활성</MTag>}</List.Item>)}</List>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="pane" style={{ minHeight: 'calc(100vh - 96px)' }}>
      <div className="pane-title"><span>파트너(채널) 마스터 <span className="muted">영업관리 63 + TQS 73 → 정제 후 단일 마스터 (시연 {rows.length}건)</span></span><Input.Search placeholder="파트너명 / 사업자번호" allowClear style={{ width: 260 }} onChange={(e) => setQ(e.target.value)} /></div>
      <Alert type="info" showIcon style={{ marginBottom: 10 }} message="지급 조건·지급 예정일 산정 기준(v2.3 A-2)은 파트너 마스터의 속성으로 관리하고, 매입 대금지급 상태(B-7)는 후속 판정 항목입니다." />
      <Table size="small" dataSource={rows} rowKey="id" pagination={false} onRow={(r) => ({ onClick: () => nav(`/partners/${r.id}`) })} columns={[
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: '파트너', dataIndex: 'name', render: (v, r) => <b style={{ color: r.status === 'inactive' ? '#999' : undefined }}>{v}</b> },
        { title: '유형', dataIndex: 'channelType', width: 80, render: (v) => <Tag>{v}</Tag> },
        { title: '출처', dataIndex: 'source', width: 80, render: (v) => <Tag color={v === '병합' ? 'purple' : 'default'}>{v}</Tag> },
        { title: '사업자번호', dataIndex: 'bizNo', width: 120 },
        { title: '지급 조건', dataIndex: 'paymentTerms' },
        { title: '지급 기준(일)', dataIndex: 'payDays', width: 100, align: 'right' },
        { title: '담당', dataIndex: 'contactName', width: 80 },
        { title: '영업 건', dataIndex: 'count', width: 70, align: 'right' },
        { title: '경유 매출', dataIndex: 'amount', width: 120, align: 'right', render: won },
        { title: '수수료(매입)', dataIndex: 'fee', width: 120, align: 'right', render: won },
        { title: '상태', dataIndex: 'status', width: 70, render: (v) => <Tag color={v === 'active' ? 'green' : 'default'}>{v === 'active' ? '활성' : '비활성'}</Tag> },
      ]} />
      <Drawer open={!!selected} width={560} title={selected?.name} onClose={() => nav('/partners')}>{selected && <PartnerDetail p={selected} />}</Drawer>
    </div>
  );
}

function PartnerDetail({ p, mobile }: { p: Partner & { count: number; amount: number; fee: number }; mobile?: boolean }) {
  const nav = useNavigate();
  const lk = useLookups();
  const all = useDB((d) => d.sales);
  const me = currentUser();
  const sales = visibleSales(me, all).filter((s) => s.partnerId === p.id);
  if (mobile) {
    return (
      <div>
        <Card style={{ margin: 10, borderRadius: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{p.name} <MTag fill="outline">{p.channelType}</MTag></div>
          <div className="m-list-item-sub">{p.paymentTerms} · 지급 기준 {p.payDays}일 · 담당 {p.contactName}</div>
          <div style={{ marginTop: 8 }}>경유 매출 <b>{compact(p.amount)}</b> · 수수료 <b>{compact(p.fee)}</b></div>
        </Card>
        <List header="경유 영업 건">{sales.map((s) => <List.Item key={s.salescd} clickable onClick={() => nav(`/sales/${s.salescd}`)} description={lk.customerName(s.custcd)} extra={compact(lineTotals(s.lines).sales)}><StatusTag code={s.status} mobile /> {s.name}</List.Item>)}</List>
      </div>
    );
  }
  return (
    <Space direction="vertical" style={{ width: '100%' }} size={14}>
      <Row gutter={12}><Col span={8}><Statistic title="경유 영업 건" value={p.count} suffix="건" /></Col><Col span={8}><Statistic title="경유 매출" value={p.amount} formatter={(v) => compact(Number(v))} /></Col><Col span={8}><Statistic title="수수료(매입)" value={p.fee} formatter={(v) => compact(Number(v))} /></Col></Row>
      <Descriptions size="small" bordered column={2}>
        <Descriptions.Item label="유형">{p.channelType}</Descriptions.Item><Descriptions.Item label="출처">{p.source}</Descriptions.Item>
        <Descriptions.Item label="사업자번호">{p.bizNo}</Descriptions.Item><Descriptions.Item label="상태">{p.status}</Descriptions.Item>
        <Descriptions.Item label="지급 조건">{p.paymentTerms}</Descriptions.Item><Descriptions.Item label="지급 예정일 기준">{p.payDays}일</Descriptions.Item>
        <Descriptions.Item label="담당">{p.contactName}</Descriptions.Item><Descriptions.Item label="연락처">{p.phone}</Descriptions.Item>
      </Descriptions>
      <Table size="small" pagination={false} dataSource={sales} rowKey="salescd" onRow={(r) => ({ onClick: () => nav(`/sales/${r.salescd}`) })} columns={[
        { title: '상태', dataIndex: 'status', width: 100, render: (v) => <StatusTag code={v} /> }, { title: '고객사', dataIndex: 'custcd', width: 110, render: (v) => lk.customerName(v) }, { title: '프로젝트', dataIndex: 'name', ellipsis: true },
        { title: '매출', width: 110, align: 'right', render: (_, r) => won(lineTotals(r.lines).sales) }, { title: '수수료', width: 100, align: 'right', render: (_, r) => won(r.lines.filter((l) => l.kind === '매입').reduce((a, l) => a + l.buy, 0)) },
      ]} />
    </Space>
  );
}
