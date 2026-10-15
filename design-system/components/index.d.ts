/** window.SomansaSales — design-system/src/index.tsx (앱 소스 src/components/tags.tsx · src/theme.ts · src/nav.tsx) */
import type { ReactNode, ReactElement } from 'react';

export type SalesStatus = 'SN02Z' | 'SN03Z' | 'SN04Z' | 'SN05Z' | 'SN07Z' | 'SN09Z' | 'SN10Z' | 'SN12Z' | 'SN12M' | 'SN13Z' | 'SN14Z';
export type CertStatus = '승인대기' | '승인완료' | '반려';
export type TaxStatus = 'TBREQ' | 'TBRED' | 'TBOK' | 'TBPDG' | 'TBSTP' | 'TBRRE' | 'NONE';

/** antd ConfigProvider(theme, ko_KR) + antd-mobile ConfigProvider(ko-KR) */
export interface ThemeProps { children?: ReactNode }
/** 영업 상태 태그. mobile이면 antd-mobile Tag(fill="outline") */
export interface StatusTagProps { code: SalesStatus; mobile?: boolean }
/** 서티 승인 상태 태그 */
export interface CertTagProps { status: CertStatus; mobile?: boolean }
/** 세금계산서 발행 상태 태그 (PC 전용) */
export interface TaxTagProps { code: TaxStatus }
/** 확도 0–100. ≥90 success, ≥50 brand, 그 외 neutral */
export interface ProbProps { value: number }
/** PC 프레임: Sider(NAV_SECTIONS) + Header + Content */
export interface DesktopShellProps { selected?: string; title?: string; alerts?: number; children?: ReactNode }
/** 모바일 프레임: NavBar + 본문 + TabBar(5) */
export interface MobileShellProps { active?: '/' | '/sales' | '/biz' | '/customers' | 'more'; title?: string; children?: ReactNode }

export declare function Theme(p: ThemeProps): ReactElement;
export declare function StatusTag(p: StatusTagProps): ReactElement;
export declare function CertTag(p: CertTagProps): ReactElement;
export declare function TaxTag(p: TaxTagProps): ReactElement;
export declare function Prob(p: ProbProps): ReactElement;
export declare function DesktopShell(p: DesktopShellProps): ReactElement;
export declare function MobileShell(p: MobileShellProps): ReactElement;
