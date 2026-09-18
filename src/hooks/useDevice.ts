import { useEffect, useState } from 'react';

/**
 * 기기 구분 — 화면 분할 전략의 기준
 *  - phone  : < 768px  → 1단 (목록 ↔ 상세 화면 전환), Drawer 메뉴, Bottom Sheet
 *  - tablet : 768~1199 → 최대 2단 (왼쪽 목록 / 오른쪽 상세), Drawer 메뉴, Bottom Sheet
 *  - desktop: ≥ 1200   → 3단 이상 (Sider 네비 / 목록·대시보드 / 필터·상세), Splitter
 */
export type Device = 'phone' | 'tablet' | 'desktop';

export const BREAKPOINT = { tablet: 768, desktop: 1200 } as const;

export function deviceOf(width: number): Device {
  if (width >= BREAKPOINT.desktop) return 'desktop';
  if (width >= BREAKPOINT.tablet) return 'tablet';
  return 'phone';
}

/** URL 해시에 ?device=phone|tablet|desktop 가 있으면 강제(시연용) */
function forced(): Device | null {
  const m = /[?&]device=(phone|tablet|desktop)/.exec(window.location.hash + window.location.search);
  return (m?.[1] as Device) ?? null;
}

export function useDevice(): Device {
  const [d, setD] = useState<Device>(() => forced() ?? deviceOf(window.innerWidth));
  useEffect(() => {
    const on = () => setD(forced() ?? deviceOf(window.innerWidth));
    window.addEventListener('resize', on);
    window.addEventListener('hashchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('hashchange', on);
    };
  }, []);
  return d;
}

export const useIsMobile = () => useDevice() !== 'desktop';
