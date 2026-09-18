import { useState } from 'react';
import { Layout, Menu, Tag, Typography, Space } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { navForRole, titleOf } from '@/nav';
import { currentUser } from '@/api';
import { useDB } from '@/api/store';
import UserSwitcher from '@/components/UserSwitcher';

const { Sider, Header, Content } = Layout;

/**
 * 사내 영업관리(PC 웹) — 3단 이상 다단 분할
 *  1단: 전체 네비게이션(Sider 고정)  2단: 파이프라인/실적·목록  3단: 세부 필터·상세 (각 페이지에서 Splitter로 구성)
 */
export default function DesktopLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useDB((d) => d.session.userId); // 역할 변경 시 리렌더
  const me = currentUser();
  const items = navForRole(me.role).map((n) => ({
    key: n.key,
    icon: n.icon,
    label: n.badge ? (<span>{n.label} <Tag style={{ marginLeft: 4 }} color="orange">{n.badge}</Tag></span>) : n.label,
    children: n.children?.map((c) => ({ key: c.key, icon: c.icon, label: c.label })),
  }));
  const selected = ['/' + loc.pathname.split('/')[1]].concat(loc.pathname);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider className="pc-sider" collapsible collapsed={collapsed} onCollapse={setCollapsed} width={228} theme="dark">
        <div className="brand">
          {collapsed ? 'S' : 'SOMANSA'}
          {!collapsed && <small>영업관리시스템 · 1차 프로토타입</small>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selected}
          defaultOpenKeys={['/master', '/share', '/admin']}
          items={items}
          onClick={({ key }) => nav(key)}
        />
      </Sider>
      <Layout>
        <Header className="pc-header">
          <Space>
            <Typography.Text strong style={{ fontSize: 16 }}>{titleOf(loc.pathname)}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>시연 데이터 · 실데이터 아님</Typography.Text>
          </Space>
          <UserSwitcher />
        </Header>
        <Content className="pc-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
