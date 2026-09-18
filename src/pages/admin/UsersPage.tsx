import { useState } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, Switch, Tabs, Space, Alert, Typography } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { List, Tag as MTag } from 'antd-mobile';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import { upsertUser } from '@/api';
import { ROLE_LABEL, type Role, type User } from '@/types';
import { NAV } from '@/nav';

const ROLES = Object.keys(ROLE_LABEL) as Role[];

/** 권한 매트릭스 — 역할 6종 × 메뉴 × 데이터 범위 (설계 산출물 초안) */
const DATA_SCOPE: Record<Role, string> = { sales: '본인 팀 (건별 서버 검사)', sales_support: '전체', finance: '전체 (금액 중심)', ma: '전체 (계약·MA 열람)', exec: '전체 (조회)', admin: '전체' };

export default function UsersPage() {
  const device = useDevice();
  const users = useDB((d) => d.users);
  const teams = useDB((d) => d.teams);
  const [form, setForm] = useState<{ open: boolean; value?: User }>({ open: false });
  const [f] = Form.useForm();
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id;

  const matrix = NAV.flatMap((n) => (n.children ? n.children : [n])).filter((n) => n.key !== '/roadmap').map((n) => ({
    key: n.key, menu: n.label,
    ...Object.fromEntries(ROLES.map((r) => [r, !n.roles || n.roles.includes(r) || !!NAV.find((p) => p.children?.includes(n) && (!p.roles || p.roles.includes(r)))])),
  }));

  if (device !== 'desktop') {
    return <div className="m-body"><List header="사용자 (조회 전용 — 편집은 PC)">{users.map((u) => <List.Item key={u.id} description={`${teamName(u.teamId)} · ${u.email}`} extra={<MTag fill="outline">{ROLE_LABEL[u.role]}</MTag>}>{u.name}{!u.active && ' (비활성)'}</List.Item>)}</List></div>;
  }
  return (
    <div className="pane" style={{ minHeight: 'calc(100vh - 96px)' }}>
      <Tabs items={[
        { key: 'users', label: '사용자', children: (
          <>
            <div className="pane-title"><span>사용자 · 역할 <span className="muted">현행 시스템에 없던 관리 기능. 인증 방식(사내 계정 연동)은 확인필요</span></span><Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setForm({ open: true })}>사용자 추가</Button></div>
            <Table size="small" dataSource={users} rowKey="id" pagination={false} columns={[
              { title: 'ID', dataIndex: 'id', width: 70 }, { title: '이름', dataIndex: 'name', width: 100 }, { title: '팀', dataIndex: 'teamId', width: 120, render: teamName },
              { title: '역할', dataIndex: 'role', width: 100, render: (r: Role) => <Tag color={r === 'admin' ? 'red' : r === 'exec' ? 'purple' : 'blue'}>{ROLE_LABEL[r]}</Tag> },
              { title: '데이터 범위', dataIndex: 'role', render: (r: Role) => DATA_SCOPE[r] }, { title: '이메일', dataIndex: 'email' },
              { title: '상태', dataIndex: 'active', width: 70, render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? '활성' : '비활성'}</Tag> },
              { title: '', width: 60, render: (_, r) => <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setForm({ open: true, value: r })} /> },
            ]} />
          </>) },
        { key: 'matrix', label: '권한 매트릭스', children: (
          <>
            <Alert type="info" showIcon style={{ marginBottom: 10 }} message="역할 6종 × 메뉴 × 데이터 범위. 메뉴 노출은 참고용이며 건별 인가는 서버가 검사한다(Django 권한 + 객체 수준 검사) — 현행 취약점(클라이언트 측 권한) 대응." />
            <Table size="small" dataSource={matrix} rowKey="key" pagination={false} columns={[
              { title: '메뉴', dataIndex: 'menu', width: 160 },
              ...ROLES.map((r) => ({ title: ROLE_LABEL[r], dataIndex: r, width: 90, align: 'center' as const, render: (v: boolean) => (v ? <Tag color="green">O</Tag> : <Tag>-</Tag>) })),
            ]} summary={() => <Table.Summary.Row><Table.Summary.Cell index={0}><b>데이터 범위</b></Table.Summary.Cell>{ROLES.map((r, i) => <Table.Summary.Cell key={r} index={i + 1}><Typography.Text style={{ fontSize: 11 }}>{DATA_SCOPE[r]}</Typography.Text></Table.Summary.Cell>)}</Table.Summary.Row>} />
          </>) },
        { key: 'teams', label: '팀', children: <Table size="small" dataSource={teams} rowKey="id" pagination={false} columns={[{ title: 'ID', dataIndex: 'id', width: 80 }, { title: '본부', dataIndex: 'division', width: 140 }, { title: '팀', dataIndex: 'name' }, { title: '인원', render: (_, t) => users.filter((u) => u.teamId === t.id).length }]} /> },
      ]} />
      <Modal open={form.open} title={form.value ? '사용자 수정' : '사용자 추가'} destroyOnHidden onCancel={() => setForm({ open: false })} okText="저장" cancelText="취소"
        afterOpenChange={(o) => { if (o) { f.resetFields(); f.setFieldsValue(form.value ?? { id: `U${String(users.length + 1).padStart(2, '0')}`, role: 'sales', active: true, teamId: 'T01' }); } }}
        onOk={async () => { const v = await f.validateFields(); upsertUser(v); setForm({ open: false }); }}>
        <Form form={f} layout="vertical">
          <Space size={12}><Form.Item name="id" label="ID"><Input disabled={!!form.value} style={{ width: 100 }} /></Form.Item><Form.Item name="name" label="이름" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="email" label="이메일" rules={[{ required: true, type: 'email' }]}><Input style={{ width: 220 }} /></Form.Item></Space>
          <Space size={12}><Form.Item name="teamId" label="팀"><Select style={{ width: 160 }} options={teams.map((t) => ({ value: t.id, label: t.name }))} /></Form.Item><Form.Item name="role" label="역할"><Select style={{ width: 140 }} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} /></Form.Item><Form.Item name="active" label="활성" valuePropName="checked"><Switch /></Form.Item></Space>
        </Form>
      </Modal>
    </div>
  );
}
