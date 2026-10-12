import { useState } from 'react';
import { Table, Tag, Select, Space, Alert, Input, Statistic, Row, Col } from 'antd';
import { List, Tag as MTag, Collapse } from 'antd-mobile';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';

/** 제품 마스터 — V2.4 엑셀 '제품분류' 시트 216개 품목 (제품군 → 제품 → 세부품목 · 구분 · 단위) + HyBoost 모델 14종 */
export default function ProductsPage() {
  const device = useDevice();
  const items = useDB((d) => d.productItems);
  const hb = useDB((d) => d.hyboostModels);
  const sales = useDB((d) => d.sales);
  const [group, setGroup] = useState<string>();
  const [kind, setKind] = useState<string>();
  const [q, setQ] = useState('');
  const groups = [...new Set(items.map((i) => i.group))];
  const rows = items.filter((p) => (!group || p.group === group) && (!kind || p.kind === kind) && (!q || `${p.product} ${p.sub}`.toLowerCase().includes(q.toLowerCase()))).map((p) => {
    const lines = sales.filter((s) => !s.legacy).flatMap((s) => s.lines.filter((l) => l.itemId === p.id || (l.product === p.product && l.sub === p.sub)));
    return { ...p, lineCount: lines.length, amount: lines.reduce((a, l) => a + (l.kind === '매출' || l.kind === '서비스' ? l.sales : l.buy), 0) };
  });
  const products = [...new Set(items.map((i) => `${i.group}|${i.product}`))].length;
  const kindColor = (k: string) => k === '매출' ? 'blue' : k === '매입' ? 'volcano' : k === '서비스' ? 'green' : k === '내부원가' ? 'purple' : 'default';

  if (device !== 'desktop') {
    return (
      <div className="m-body">
        <Collapse style={{ margin: 10, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          {groups.map((g) => (
            <Collapse.Panel key={g} title={<span>{g} <MTag fill="outline">{items.filter((i) => i.group === g).length}</MTag></span>}>
              <List>{[...new Set(items.filter((i) => i.group === g).map((i) => i.product))].map((p) => <List.Item key={p} description={items.filter((i) => i.group === g && i.product === p).map((i) => i.sub).join(' · ')}>{p}</List.Item>)}</List>
            </Collapse.Panel>
          ))}
        </Collapse>
      </div>
    );
  }
  return (
    <div className="pane" style={{ minHeight: 'calc(100vh - 96px)' }}>
      <div className="pane-title"><span>제품 마스터 <span className="muted">제품분류 216 품목 · 제품군 → 제품 → 세부품목 (영업 건 제품라인 입력과 연동)</span></span>
        <Space><Select allowClear placeholder="제품군" style={{ width: 170 }} value={group} onChange={setGroup} options={groups.map((g) => ({ value: g }))} /><Select allowClear placeholder="구분" style={{ width: 120 }} value={kind} onChange={setKind} options={['매출', '매입', '내부원가', '서비스'].map((k) => ({ value: k }))} /><Input.Search allowClear placeholder="제품 / 세부품목" style={{ width: 200 }} onChange={(e) => setQ(e.target.value)} /></Space></div>
      <Row gutter={12} style={{ marginBottom: 10 }}><Col span={4}><Statistic title="제품군" value={groups.length} /></Col><Col span={4}><Statistic title="제품" value={products} /></Col><Col span={4}><Statistic title="세부품목" value={items.length} /></Col><Col span={4}><Statistic title="HyBoost 모델" value={hb.length} /></Col><Col span={8}><Alert type="info" showIcon message="TQS 제품 마스터(제품군 × 버전) 대신 영업지원부서 엑셀 ‘제품분류’ 시트를 기준으로 채택(V2.4). 품목 수정은 영업지원·관리자 권한." /></Col></Row>
      <Table size="small" dataSource={rows} rowKey="id" pagination={{ pageSize: 30, size: 'small' }} columns={[
        { title: 'ID', dataIndex: 'id', width: 70 }, { title: '제품군', dataIndex: 'group', width: 150 }, { title: '제품', dataIndex: 'product', width: 220, render: (v) => <b>{v}</b> },
        { title: '세부품목', dataIndex: 'sub' }, { title: '구분', dataIndex: 'kind', width: 90, render: (v) => <Tag color={kindColor(v)}>{v}</Tag> }, { title: '단위', dataIndex: 'unit', width: 120, render: (v) => v || '-' },
        { title: '버전 입력', dataIndex: 'versionInput', width: 80, render: (v) => (v ? '직접' : '-') }, { title: '망 입력', dataIndex: 'networkInput', width: 80, render: (v) => (v ? '직접' : '-') },
        { title: '사용 라인', dataIndex: 'lineCount', width: 80, align: 'right' }, { title: '금액 누계', dataIndex: 'amount', width: 120, align: 'right', render: (v) => `${(v / 1e8).toFixed(1)}억` },
      ]} />
      <div className="pane-title" style={{ marginTop: 14 }}>HyBoost 모델</div>
      <Space wrap>{hb.map((m) => <Tag key={m} color={/^NF/.test(m) ? 'blue' : /^EF/.test(m) ? 'purple' : 'default'}>{m}</Tag>)}</Space>
    </div>
  );
}
