import type { ReactNode } from 'react';
import {
  DashboardOutlined, FundProjectionScreenOutlined, TeamOutlined, ApartmentOutlined, AppstoreOutlined,
  FileProtectOutlined, SyncOutlined, ApiOutlined, TagsOutlined, SettingOutlined, AuditOutlined,
  UserSwitchOutlined, BarsOutlined, RocketOutlined,
} from '@ant-design/icons';
import type { Role } from '@/types';

export interface NavItem {
  key: string; // route path
  label: string;
  icon: ReactNode;
  roles?: Role[]; // 미지정 = 전체
  children?: NavItem[];
  mobileTab?: boolean; // 모바일 하단 TabBar 노출
  badge?: string; // '후속' 등
}

export const NAV: NavItem[] = [
  { key: '/', label: '대시보드', icon: <DashboardOutlined />, mobileTab: true },
  { key: '/sales', label: '영업 건', icon: <FundProjectionScreenOutlined />, mobileTab: true },
  { key: '/customers', label: '고객사', icon: <TeamOutlined />, mobileTab: true },
  {
    key: '/master', label: '마스터', icon: <AppstoreOutlined />, children: [
      { key: '/partners', label: '파트너(채널)', icon: <ApartmentOutlined /> },
      { key: '/products', label: '제품', icon: <TagsOutlined /> },
    ],
  },
  { key: '/contracts', label: '계약', icon: <FileProtectOutlined /> },
  {
    key: '/share', label: '고객정보 공유', icon: <SyncOutlined />, roles: ['sales_support', 'admin', 'exec', 'ma'], children: [
      { key: '/share/recon', label: 'TQS 대사 예외', icon: <SyncOutlined /> },
      { key: '/share/goldmine', label: '골드마인 매핑', icon: <BarsOutlined /> },
      { key: '/share/api', label: '조회 API·뷰', icon: <ApiOutlined /> },
    ],
  },
  {
    key: '/admin', label: '관리자', icon: <SettingOutlined />, roles: ['admin'], children: [
      { key: '/admin/users', label: '사용자·역할·팀', icon: <UserSwitchOutlined /> },
      { key: '/admin/codes', label: '공통코드', icon: <TagsOutlined /> },
      { key: '/admin/audit', label: '감사 로그', icon: <AuditOutlined /> },
    ],
  },
  { key: '/roadmap', label: '후속 범위(2차)', icon: <RocketOutlined />, badge: '후속' },
];

export function navForRole(role: Role): NavItem[] {
  const ok = (n: NavItem) => !n.roles || n.roles.includes(role);
  return NAV.filter(ok).map((n) => (n.children ? { ...n, children: n.children.filter(ok) } : n));
}

export function flatNav(items: NavItem[] = NAV): NavItem[] {
  return items.flatMap((n) => (n.children ? [n, ...n.children] : [n]));
}

export function titleOf(path: string): string {
  const all = flatNav();
  const exact = all.find((n) => n.key === path);
  if (exact) return exact.label;
  const parent = all.filter((n) => n.key !== '/' && path.startsWith(n.key)).sort((a, b) => b.key.length - a.key.length)[0];
  return parent?.label ?? '영업관리시스템';
}
