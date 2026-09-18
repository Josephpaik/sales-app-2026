import { Select, Space, Tag, Tooltip, Button, Popconfirm } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useDB, resetDB } from '@/api/store';
import { switchUser } from '@/api';
import { ROLE_LABEL } from '@/types';

/** 시연용 사용자(역할) 전환 — 실제 시스템에서는 로그인 세션으로 대체 */
export default function UserSwitcher({ compact }: { compact?: boolean }) {
  const users = useDB((d) => d.users);
  const teams = useDB((d) => d.teams);
  const userId = useDB((d) => d.session.userId);
  const me = users.find((u) => u.id === userId)!;
  return (
    <Space size={8}>
      {!compact && <Tag color="blue">{ROLE_LABEL[me.role]}</Tag>}
      <Select
        size="small"
        value={userId}
        style={{ width: compact ? 150 : 210 }}
        onChange={switchUser}
        options={users.filter((u) => u.active).map((u) => ({
          value: u.id,
          label: `${u.name} · ${ROLE_LABEL[u.role]} (${teams.find((t) => t.id === u.teamId)?.name})`,
        }))}
      />
      {!compact && (
        <Popconfirm title="시연 데이터를 초기 상태로 되돌릴까요?" onConfirm={resetDB} okText="초기화" cancelText="취소">
          <Tooltip title="시연 데이터 초기화">
            <Button size="small" icon={<ReloadOutlined />} />
          </Tooltip>
        </Popconfirm>
      )}
    </Space>
  );
}
