/**
 * SOMANSA Sales Workspace 디자인 시스템 번들 — window.SomansaSales
 * 앱과 같은 소스(src/components/tags.tsx, src/theme.ts, src/nav.tsx)를 그대로 묶어 미리보기에서 실제 antd/antd-mobile로 렌더링한다.
 */
import type { ReactNode } from 'react';
import { ConfigProvider, Layout, Menu, Typography, Space, Badge } from 'antd';
import { BellOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons';
import koKR from 'antd/locale/ko_KR';
import { ConfigProvider as MobileConfigProvider, NavBar, TabBar } from 'antd-mobile';
import { PieOutline, UnorderedListOutline, AppstoreOutline, TeamOutline, MoreOutline } from 'antd-mobile-icons';
import koKRMobile from 'antd-mobile/es/locales/ko-KR';
import { theme } from '@/theme';
import { NAV_SECTIONS } from '@/nav';
import { StatusTag as AppStatusTag, CertTag as AppCertTag, TaxTag as AppTaxTag, Prob as AppProb } from '@/components/tags';
import type { SalesStatus, CertStatus, TaxStatus } from '@/types';

/** 앱의 main.tsx와 같은 테마·로케일 공급자 */
export function Theme({ children }: { children?: ReactNode }) {
  return <ConfigProvider locale={koKR} theme={theme}><MobileConfigProvider locale={koKRMobile}>{children}</MobileConfigProvider></ConfigProvider>;
}

export function StatusTag(p: { code: SalesStatus; mobile?: boolean }) { return <Theme><AppStatusTag {...p} /></Theme>; }
export function CertTag(p: { status: CertStatus; mobile?: boolean }) { return <Theme><AppCertTag {...p} /></Theme>; }
export function TaxTag(p: { code: TaxStatus }) { return <Theme><AppTaxTag {...p} /></Theme>; }
export function Prob(p: { value: number }) { return <Theme><AppProb {...p} /></Theme>; }

/** PC 프레임 — DesktopLayout과 같은 Sider·Menu·Header 구성 (라우터·스토어 없이) */
export function DesktopShell({ selected = '/sales', title = '영업 현황', alerts = 3, children }: { selected?: string; title?: string; alerts?: number; children?: ReactNode }) {
  const items = NAV_SECTIONS.map((s) => ({
    type: 'group' as const, key: s.title, label: s.title,
    children: s.items.map((n) => ({ key: n.key, icon: n.icon, label: n.label })),
  }));
  return (
    <Theme>
      <Layout style={{ minHeight: '100%' }}>
        <Layout.Sider className="pc-sider" width={228} theme="dark">
          <div className="brand">SOMANSA<small>SALES WORKSPACE · 1차 프로토타입 v1.1</small></div>
          <Menu theme="dark" mode="inline" selectedKeys={[selected]} items={items} />
        </Layout.Sider>
        <Layout>
          <Layout.Header className="pc-header">
            <Space>
              <Typography.Text strong style={{ fontSize: 16 }}>SOMANSA / {title}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>시연 데이터 · 실데이터 아님</Typography.Text>
            </Space>
            <Badge count={alerts} size="small"><BellOutlined style={{ fontSize: 18 }} /></Badge>
          </Layout.Header>
          <Layout.Content className="pc-content">{children}</Layout.Content>
        </Layout>
      </Layout>
    </Theme>
  );
}

/** 모바일 프레임 — MobileLayout과 같은 NavBar·TabBar 구성 */
export function MobileShell({ active = '/sales', title = '영업 현황', children }: { active?: string; title?: string; children?: ReactNode }) {
  return (
    <Theme>
      <div className="m-app">
        <NavBar className="m-navbar" back={null} left={<MenuOutlined style={{ fontSize: 18 }} />} right={<UserOutlined style={{ fontSize: 18 }} />}>{title}</NavBar>
        <div className="m-body">{children}</div>
        <TabBar className="m-tabbar" activeKey={active}>
          <TabBar.Item key="/" title="대시보드" icon={<PieOutline />} />
          <TabBar.Item key="/sales" title="영업 현황" icon={<UnorderedListOutline />} />
          <TabBar.Item key="/biz" title="사업관리" icon={<AppstoreOutline />} />
          <TabBar.Item key="/customers" title="고객사" icon={<TeamOutline />} />
          <TabBar.Item key="more" title="더보기" icon={<MoreOutline />} />
        </TabBar>
      </div>
    </Theme>
  );
}
