import { useState } from 'react';
import { Table, Tag, Select, Space, Alert, Input } from 'antd';
import { List, Tag as MTag, Collapse } from 'antd-mobile';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { lineTotals } from '@/api';

export default function ProductsPage() {
  const device = useDevice();
  const products = useDB((d) => d.products);
  const families = useDB((d) => d.productFamilies);
  const sales = useDB((d) => d.sales);
  const [fam, setFam] = useState<string>();
  const [q, setQ] = useState('');
  const rows = products.filter((p) => (!fam || p.familyCode === fam) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))).map((p) => {
    const lines = sales.filter((s) => !s.legacy).flatMap((s) => s.lines.filter((l) => l.productCode === p.code));
    return { ...p, familyName: families.find((f) => f.code === p.familyCode)?.name, lineCount: lines.length, amount: lineTotals(lines).sales };
  });

  if (device !== 'desktop') {
    return (
      <div className="m-body">
        <Collapse defaultActiveKey={families.map((f) => f.code)} style={{ margin: 10, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          {families.map((f) => (
            <Collapse.Panel key={f.code} title={<span>{f.name} <MTag fill="outline">{f.code}</MTag></span>}>
              <List>{rows.filter((p) => p.familyCode === f.code).map((p) => <List.Item key={p.code} description={`${p.code} · ${p.unit}${p.hb ? ' · HB 장비' : ''}`} extra={p.version !== '-' ? `v${p.version}` : ''}>{p.name}{!p.active && <MTag color="default" style={{ marginLeft: 6 }}>단종</MTag>}</List.Item>)}</List>
            </Collapse.Panel>
          ))}
        </Collapse>
      </div>
    );
  }
  return (
    <div className="pane" style={{ minHeight: 'calc(100vh - 96px)' }}>
      <div className="pane-title"><span>제품 마스터 <span className="muted">TQS 제품 마스터(제품군 × 버전) 기준 채택 · 영업관리의 원가항목 혼재·중복 코드는 정제</span></span>
        <Space><Select allowClear placeholder="제품군" style={{ width: 160 }} value={fam} onChange={setFam} options={families.map((f) => ({ value: f.code, label: f.name }))} /><Input.Search allowClear placeholder="제품명" style={{ width: 200 }} onChange={(e) => setQ(e.target.value)} /></Space></div>
      <Alert type="info" showIcon style={{ marginBottom: 10 }} message="현행 제품군 코드에 한글 값 「공통」·ETC/ETC2 이중 기타가 혼재 → 신 코드 체계로 정제. 제품 마스터 수정은 영업지원·관리자 권한(설계 단계 코드 정의서 확정 후 반영)." />
      <Table size="small" dataSource={rows} rowKey="code" pagination={false} columns={[
        { title: '제품군', dataIndex: 'familyName', width: 130, render: (v, r) => <span>{v} <span className="muted">{r.familyCode}</span></span> },
        { title: '제품코드', dataIndex: 'code', width: 130 },
        { title: '제품명', dataIndex: 'name', render: (v, r) => <b>{v}{r.hb && <Tag color="purple" style={{ marginLeft: 6 }}>HB</Tag>}</b> },
        { title: '버전', dataIndex: 'version', width: 70 },
        { title: '단위', dataIndex: 'unit', width: 70 },
        { title: '사용 라인', dataIndex: 'lineCount', width: 90, align: 'right' },
        { title: '매출 누계', dataIndex: 'amount', width: 130, align: 'right', render: (v) => `${(v / 1e8).toFixed(1)}억` },
        { title: '상태', dataIndex: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? '사용' : '단종'}</Tag> },
      ]} />
    </div>
  );
}
