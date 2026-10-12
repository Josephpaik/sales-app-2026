import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BIZ_TABS } from '@/nav';
import { useDevice } from '@/hooks/useDevice';

/**
 * 사업관리 허브 — 계약·직출·발급·출고·채권·보고·문서함을 하나의 탭 체계로 통합 (V2.4).
 * PC·태블릿·폰 모두 같은 탭 순서를 사용해 메뉴 이동 시 화면 구조가 바뀌지 않는다.
 */
export default function BizLayout() {
  const loc = useLocation();
  const nav = useNavigate();
  const device = useDevice();
  const active = (k: string) => (k === '/biz' ? loc.pathname === '/biz' : loc.pathname.startsWith(k) || (k === '/biz/report' && loc.pathname.startsWith('/biz/stats')));
  const tabs = (
    <div className={device === 'desktop' ? 'biz-tabs' : 'm-biz-tabs'}>
      {BIZ_TABS.map((t) => <button key={t.key} className={`biz-tab ${active(t.key) ? 'active' : ''}`} onClick={() => nav(t.key)}>{device === 'desktop' ? t.label : t.short}</button>)}
    </div>
  );
  if (device !== 'desktop') return <div className="m-body">{tabs}<Outlet /></div>;
  return <div>{tabs}<Outlet /></div>;
}
