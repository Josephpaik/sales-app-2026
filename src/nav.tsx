import type { ReactNode } from 'react';
import {
  DashboardOutlined, FundProjectionScreenOutlined, TeamOutlined, ApartmentOutlined, AppstoreOutlined, SyncOutlined, ApiOutlined, TagsOutlined,
  AuditOutlined, UserSwitchOutlined, BarsOutlined, RocketOutlined, ProjectOutlined,
} from '@ant-design/icons';
import type { Role } from '@/types';

export interface NavItem {
  key: string; // route path
  label: string;
  icon: ReactNode;
  roles?: Role[]; // 미지정 = 전체
  children?: NavItem[];
  badge?: string;
}
export interface NavSection { title: string; items: NavItem[] }

/**
 * V2.4 메뉴 구조 — WORKSPACE(대시보드·영업 현황·사업관리) / 기준정보 / 관리자.
 * 계약·납품·발급·매출·보고 등 운영 메뉴는 "사업관리" 한 곳(동일 탭 체계)으로 통합한다.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'WORKSPACE',
    items: [
      { key: '/', label: '대시보드', icon: <DashboardOutlined /> },
      { key: '/sales', label: '영업 현황', icon: <FundProjectionScreenOutlined /> },
      { key: '/biz', label: '사업관리', icon: <ProjectOutlined /> },
    ],
  },
  {
    title: '기준정보',
    items: [
      { key: '/customers', label: '고객사 · 계약처', icon: <TeamOutlined /> },
      { key: '/partners', label: '파트너(채널)', icon: <ApartmentOutlined /> },
      { key: '/products', label: '제품', icon: <AppstoreOutlined /> },
      {
        key: '/share', label: '고객정보 공유', icon: <SyncOutlined />, roles: ['sales_support', 'admin', 'exec', 'ma'], children: [
          { key: '/share/recon', label: 'TQS 대사 예외', icon: <SyncOutlined /> },
          { key: '/share/goldmine', label: '골드마인 매핑', icon: <BarsOutlined /> },
          { key: '/share/api', label: '조회 API·뷰', icon: <ApiOutlined /> },
        ],
      },
    ],
  },
  {
    title: '관리자',
    items: [
      { key: '/admin/users', label: '사용자 · 권한', icon: <UserSwitchOutlined />, roles: ['admin'] },
      { key: '/admin/codes', label: '공통코드', icon: <TagsOutlined />, roles: ['admin', 'sales_support'] },
      { key: '/admin/audit', label: '감사 로그', icon: <AuditOutlined />, roles: ['admin'] },
      { key: '/roadmap', label: '후속 범위(2차)', icon: <RocketOutlined />, badge: '후속' },
    ],
  },
];

/** 사업관리 허브 탭 — PC·모바일 동일 (V2.4: 메뉴 이동 시 화면 체계가 달라지지 않도록 단일 탭 체계) */
export const BIZ_TABS: { key: string; label: string; short: string }[] = [
  { key: '/biz', label: '업무 홈', short: '홈' },
  { key: '/biz/contracts', label: '계약 · 원가', short: '계약' },
  { key: '/biz/visits', label: '직출관리', short: '직출' },
  { key: '/biz/license', label: '라이선스 발급이력', short: '라이선스' },
  { key: '/biz/hyboost', label: 'HyBoost 출고이력', short: 'HyBoost' },
  { key: '/biz/receivables', label: '매출채권', short: '채권' },
  { key: '/biz/report', label: '보고 · 통계', short: '보고' },
  { key: '/biz/docs', label: '통합문서함', short: '문서함' },
];

export const FAVORITE_OPTIONS: { key: string; label: string }[] = [
  { key: '/sales', label: '영업현황' }, { key: '/biz/visits', label: '직출관리' }, { key: '/biz/receivables', label: '매출채권' }, { key: '/biz/report', label: '내부보고' },
  { key: '/biz/docs', label: '통합문서함' }, { key: '/biz/hyboost', label: 'HyBoost 출고' }, { key: '/biz/license', label: '라이선스 발급' }, { key: '/biz/contracts', label: '계약 · 원가' },
  { key: '/biz/stats', label: '집계 · 통계' }, { key: '/customers', label: '고객사' }, { key: '/share/recon', label: 'TQS 대사' },
];

export function navForRole(role: Role): NavSection[] {
  const ok = (n: NavItem) => !n.roles || n.roles.includes(role);
  return NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter(ok).map((n) => (n.children ? { ...n, children: n.children.filter(ok) } : n)) })).filter((s) => s.items.length);
}

export function flatNav(): NavItem[] {
  return NAV_SECTIONS.flatMap((s) => s.items).flatMap((n) => (n.children ? [n, ...n.children] : [n]));
}

export function titleOf(path: string): string {
  if (path.startsWith('/biz')) {
    const t = BIZ_TABS.find((b) => b.key === path) ?? (path.startsWith('/biz/stats') ? { label: '집계 · 통계' } : undefined);
    return t ? `사업관리 / ${t.label}` : '사업관리';
  }
  const all = flatNav();
  const exact = all.find((n) => n.key === path);
  if (exact) return exact.label;
  const parent = all.filter((n) => n.key !== '/' && path.startsWith(n.key)).sort((a, b) => b.key.length - a.key.length)[0];
  return parent?.label ?? '영업관리시스템';
}
