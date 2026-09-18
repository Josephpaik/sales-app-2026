import { useState } from 'react';
import { NavBar, Popup, TabBar, List, Badge, Tag, Space } from 'antd-mobile';
import { AppOutline, TeamOutline, UnorderedListOutline, MoreOutline, PieOutline } from 'antd-mobile-icons';
import { MenuOutlined, UserOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { navForRole, titleOf } from '@/nav';
import { currentUser } from '@/api';
import { useDB, resetDB } from '@/api/store';
import UserSwitcher from '@/components/UserSwitcher';
import { ROLE_LABEL } from '@/types';

/**
 * 현장 영업(모바일/태블릿) — 최대 2단 분할
 *  - NavBar + Drawer(서랍식 메뉴, Popup left) + 하단 TabBar
 *  - 태블릿: 왼쪽 목록 / 오른쪽 상세 (각 페이지에서 .m-body.split 사용)
 *  - 폰: 목록 → 상세 화면 전환(뒤로가기)
 */
export default function MobileLayout() {
  const [drawer, setDrawer] = useState(false);
  const [profile, setProfile] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useDB((d) => d.session.userId);
  const me = currentUser();
  const items = navForRole(me.role);
  const isDetail = /\/[^/]+\/[^/]+$/.test(loc.pathname) && !loc.pathname.startsWith('/share') && !loc.pathname.startsWith('/admin');
  const tabKey = '/' + loc.pathname.split('/')[1];

  const go = (k: string) => {
    setDrawer(false);
    nav(k);
  };

  return (
    <div className="m-app">
      <NavBar
        className="m-navbar"
        back={isDetail ? '' : null}
        onBack={() => nav(-1)}
        left={!isDetail && <MenuOutlined style={{ fontSize: 18 }} onClick={() => setDrawer(true)} />}
        right={<UserOutlined style={{ fontSize: 18 }} onClick={() => setProfile(true)} />}
      >
        {titleOf(loc.pathname)}
      </NavBar>

      <Outlet />

      <TabBar
        className="m-tabbar"
        activeKey={tabKey}
        onChange={(k) => (k === 'more' ? setDrawer(true) : nav(k))}
        safeArea
      >
        <TabBar.Item key="/" title="대시보드" icon={<PieOutline />} />
        <TabBar.Item key="/sales" title="영업 건" icon={<UnorderedListOutline />} />
        <TabBar.Item key="/customers" title="고객사" icon={<TeamOutline />} />
        <TabBar.Item key="/contracts" title="계약" icon={<AppOutline />} />
        <TabBar.Item key="more" title="더보기" icon={<MoreOutline />} />
      </TabBar>

      {/* Drawer(서랍식 메뉴) */}
      <Popup visible={drawer} onMaskClick={() => setDrawer(false)} position="left" bodyStyle={{ width: 272 }}>
        <div className="m-drawer">
          <div className="m-drawer-brand">SOMANSA<small>영업관리시스템 · 현장용</small></div>
          <List>
            {items.flatMap((n) =>
              n.children
                ? [<List.Item key={n.key} disabled>{n.label}</List.Item>, ...n.children.map((c) => (
                    <List.Item key={c.key} prefix={c.icon} onClick={() => go(c.key)} style={{ paddingLeft: 16 }}>{c.label}</List.Item>
                  ))]
                : [
                    <List.Item key={n.key} prefix={n.icon} onClick={() => go(n.key)} extra={n.badge && <Badge content={n.badge} />}>
                      {n.label}
                    </List.Item>,
                  ],
            )}
          </List>
        </div>
      </Popup>

      {/* 사용자/역할 (Bottom Sheet) */}
      <Popup visible={profile} onMaskClick={() => setProfile(false)} position="bottom" bodyStyle={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
        <div className="sheet-title">사용자 · 역할 전환 (시연)</div>
        <div className="sheet-body">
          <Space direction="vertical" block>
            <div>
              <b>{me.name}</b> <Tag color="primary" fill="outline">{ROLE_LABEL[me.role]}</Tag>
            </div>
            <UserSwitcher compact />
            <List>
              <List.Item onClick={() => { resetDB(); setProfile(false); }}>시연 데이터 초기화</List.Item>
            </List>
          </Space>
        </div>
      </Popup>
    </div>
  );
}
