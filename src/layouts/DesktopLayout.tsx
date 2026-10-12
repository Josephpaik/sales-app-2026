import { useState } from 'react';
import { Layout, Menu, Tag, Typography, Space, Badge, Popover, List } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { navForRole, titleOf } from '@/nav';
import { currentUser, arStatus, visibleSales } from '@/api';
import { useDB } from '@/api/store';
import UserSwitcher from '@/components/UserSwitcher';

const { Sider, Header, Content } = Layout;

/**
 * 사내 영업관리(PC 웹) — 3단 이상 다단 분할
 *  1단: 전체 네비게이션(Sider 고정, WORKSPACE/기준정보/관리자 구역)  2단: 파이프라인·목록  3단: 세부 필터·상세
 */
export default function DesktopLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useDB((d) => d.session.userId);
  const me = currentUser();
  const sections = navForRole(me.role);
  const items = sections.map((s) => ({
    type: 'group' as const,
    key: s.title,
    label: collapsed ? '' : s.title,
    children: s.items.map((n) => ({
      key: n.key, icon: n.icon,
      label: n.badge ? (<span>{n.label} <Tag style={{ marginLeft: 4 }} color="orange">{n.badge}</Tag></span>) : n.label,
      children: n.children?.map((c) => ({ key: c.key, icon: c.icon, label: c.label })),
    })),
  }));
  const seg = '/' + loc.pathname.split('/')[1];
  const selected = [seg === '/biz' ? '/biz' : seg, loc.pathname];

  // 알림: 서티 승인대기 · 추심대상 채권 · 요청대기 발급/출고
  const sales = useDB((d) => d.sales); const ars = useDB((d) => d.receivables); const frs = useDB((d) => d.fulfillRequests);
  const mine = visibleSales(me, sales);
  const alerts = [
    ...mine.filter((s) => s.cert.status === '승인대기').map((s) => ({ t: `서티 승인대기 · ${s.name}`, to: `/sales/${s.salescd}` })),
    ...ars.filter((r) => arStatus(r) === '추심대상').slice(0, 3).map((r) => ({ t: `추심대상 채권 · ${r.partyName}`, to: '/biz/receivables' })),
    ...frs.filter((r) => r.status === '요청대기').slice(0, 3).map((r) => ({ t: `${r.kind === 'license' ? '라이선스 발급' : 'HyBoost 출고'} 요청대기 · ${r.no}`, to: r.kind === 'license' ? '/biz/license' : '/biz/hyboost' })),
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider className="pc-sider" collapsible collapsed={collapsed} onCollapse={setCollapsed} width={228} theme="dark">
        <div className="brand">{collapsed ? 'S' : 'SOMANSA'}{!collapsed && <small>SALES WORKSPACE · 1차 프로토타입 v1.1</small>}</div>
        <Menu theme="dark" mode="inline" selectedKeys={selected} defaultOpenKeys={['/share']} items={items} onClick={({ key }) => nav(key)} />
        {!collapsed && <div className="sider-foot">영업 · 계약 · 납품 · 실적 통합관리</div>}
      </Sider>
      <Layout>
        <Header className="pc-header">
          <Space>
            <Typography.Text strong style={{ fontSize: 16 }}>SOMANSA / {titleOf(loc.pathname)}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>시연 데이터 · 실데이터 아님</Typography.Text>
          </Space>
          <Space size={14}>
            <Popover trigger="click" placement="bottomRight" title="알림" content={<List size="small" style={{ width: 320 }} dataSource={alerts} locale={{ emptyText: '알림 없음' }} renderItem={(a) => <List.Item style={{ cursor: 'pointer' }} onClick={() => nav(a.to)}>{a.t}</List.Item>} />}>
              <Badge count={alerts.length} size="small"><BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} /></Badge>
            </Popover>
            <UserSwitcher />
          </Space>
        </Header>
        <Content className="pc-content"><Outlet /></Content>
      </Layout>
    </Layout>
  );
}
