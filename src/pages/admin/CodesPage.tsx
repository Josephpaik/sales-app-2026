import { useState } from 'react';
import { Table, Tag, Switch, Button, Input, Space, Splitter, Menu, App as AntApp } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { List, Collapse, Tag as MTag } from 'antd-mobile';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { toggleCode, addCode } from '@/api';

/** 공통코드 관리 — 영업상태·영업구분·수주확도·고객 분류·세금계산서 상태 */
export default function CodesPage() {
  const device = useDevice();
  const codes = useDB((d) => d.commonCodes);
  const groups = [...new Map(codes.map((c) => [c.group, c.groupName])).entries()];
  const [group, setGroup] = useState(groups[0][0]);
  const [nc, setNc] = useState({ code: '', name: '' });
  const { message } = AntApp.useApp();
  const rows = codes.filter((c) => c.group === group);

  if (device !== 'desktop') {
    return <div className="m-body"><Collapse style={{ margin: 10, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>{groups.map(([g, gn]) => <Collapse.Panel key={g} title={`${gn} (${codes.filter((c) => c.group === g).length})`}><List>{codes.filter((c) => c.group === g).map((c) => <List.Item key={c.code} extra={<MTag color={c.active ? 'success' : 'default'} fill="outline">{c.active ? '사용' : '중지'}</MTag>}><MTag fill="outline">{c.code}</MTag> {c.name}</List.Item>)}</List></Collapse.Panel>)}</Collapse></div>;
  }
  return (
    <div style={{ height: 'calc(100vh - 96px)' }}>
      <Splitter style={{ height: '100%' }}>
        <Splitter.Panel defaultSize={220} min={180} max={300}>
          <div className="pane" style={{ padding: 6 }}><Menu selectedKeys={[group]} onClick={({ key }) => setGroup(key)} items={groups.map(([g, gn]) => ({ key: g, label: <span>{gn} <span className="muted">{g}</span></span> }))} /></div>
        </Splitter.Panel>
        <Splitter.Panel>
          <div className="pane">
            <div className="pane-title"><span>{groups.find(([g]) => g === group)?.[1]} <span className="muted">{group} · {rows.length}건</span></span>
              <Space.Compact><Input placeholder="코드" style={{ width: 100 }} value={nc.code} onChange={(e) => setNc({ ...nc, code: e.target.value })} /><Input placeholder="코드명" style={{ width: 160 }} value={nc.name} onChange={(e) => setNc({ ...nc, name: e.target.value })} /><Button type="primary" icon={<PlusOutlined />} onClick={() => { if (!nc.code || !nc.name) return message.warning('코드와 코드명을 입력하세요'); if (rows.some((r) => r.code === nc.code)) return message.error('중복 코드'); addCode(group, groups.find(([g]) => g === group)![1], nc.code, nc.name); setNc({ code: '', name: '' }); }}>추가</Button></Space.Compact></div>
            <Table size="small" dataSource={rows} rowKey="code" pagination={false} columns={[
              { title: '순서', dataIndex: 'order', width: 60 }, { title: '코드', dataIndex: 'code', width: 120, render: (v) => <Tag>{v}</Tag> }, { title: '코드명', dataIndex: 'name' },
              { title: '사용', dataIndex: 'active', width: 80, render: (v, r) => <Switch size="small" checked={v} onChange={() => toggleCode(r.group, r.code)} /> },
            ]} />
            <div className="muted" style={{ marginTop: 8 }}>영업구분(1/99/R/SM/C/1C)의 표시명은 가칭이며 분석 단계 현업 인터뷰에서 확정합니다. 구 코드 → 신 코드 정제 매핑표는 설계 산출물.</div>
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  );
}
