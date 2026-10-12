import { useState } from 'react';
import { Table, Tag, Select, Input, Space, Alert } from 'antd';
import { List, Tag as MTag } from 'antd-mobile';
import { useDevice } from '@/hooks/useDevice';
import { useDB } from '@/api/store';
import type { AuditLog } from '@/types';

const COLOR: Record<AuditLog['action'], string> = { 로그인: 'default', 조회: 'default', 등록: 'blue', 수정: 'geekblue', 삭제: 'red', 상태변경: 'green', 다운로드: 'orange', 개인정보열람: 'volcano', 승인: 'purple' };

/** 감사 로그 — 누가·언제·무엇을 (개인정보 열람·다운로드 포함), ISMS-P 2.9/2.11 대응 */
export default function AuditPage() {
  const device = useDevice();
  const logs = useDB((d) => d.auditLogs);
  const [action, setAction] = useState<string>();
  const [q, setQ] = useState('');
  const rows = logs.filter((l) => (!action || l.action === action) && (!q || `${l.userName} ${l.target} ${l.detail}`.includes(q)));
  if (device !== 'desktop') {
    return <div className="m-body"><List header="감사 로그 (최근)">{rows.slice(0, 50).map((l) => <List.Item key={l.id} description={`${l.at} · ${l.target} · ${l.detail}`} extra={<MTag fill="outline">{l.action}</MTag>}>{l.userName}</List.Item>)}</List></div>;
  }
  return (
    <div className="pane" style={{ minHeight: 'calc(100vh - 96px)' }}>
      <Alert type="info" showIcon style={{ marginBottom: 10 }} message="개인정보 열람·다운로드·상태 변경·관리자 작업을 append-only로 기록. 관리자만 조회하며 로그 자체도 열람 기록을 남깁니다." />
      <div className="pane-title"><span>감사 로그 <span className="muted">{rows.length}건</span></span><Space><Select allowClear placeholder="행위" style={{ width: 140 }} value={action} onChange={setAction} options={Object.keys(COLOR).map((k) => ({ value: k }))} /><Input.Search allowClear placeholder="사용자 / 대상 / 내용" style={{ width: 240 }} onChange={(e) => setQ(e.target.value)} /></Space></div>
      <Table size="small" dataSource={rows} rowKey="id" pagination={{ pageSize: 20, size: 'small' }} columns={[
        { title: '일시', dataIndex: 'at', width: 150 }, { title: '사용자', dataIndex: 'userName', width: 90, render: (v, r) => <span>{v} <span className="muted">{r.userId}</span></span> },
        { title: '행위', dataIndex: 'action', width: 110, render: (v: AuditLog['action']) => <Tag color={COLOR[v]}>{v}</Tag> },
        { title: '대상', dataIndex: 'target', width: 200 }, { title: '내용', dataIndex: 'detail' }, { title: 'IP', dataIndex: 'ip', width: 120 },
      ]} />
    </div>
  );
}
