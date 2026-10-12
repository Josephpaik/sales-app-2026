import { Routes, Route, Navigate } from 'react-router-dom';
import { useDevice } from '@/hooks/useDevice';
import DesktopLayout from '@/layouts/DesktopLayout';
import MobileLayout from '@/layouts/MobileLayout';
import Dashboard from '@/pages/Dashboard';
import SalesPage from '@/pages/sales/SalesPage';
import CustomersPage from '@/pages/customers/CustomersPage';
import PartnersPage from '@/pages/master/PartnersPage';
import ProductsPage from '@/pages/master/ProductsPage';
import ContractsPage from '@/pages/contracts/ContractsPage';
import BizLayout from '@/pages/biz/BizLayout';
import BizHome from '@/pages/biz/BizHome';
import VisitsPage from '@/pages/biz/VisitsPage';
import FulfillHistoryPage from '@/pages/biz/FulfillHistoryPage';
import ReceivablesPage from '@/pages/biz/ReceivablesPage';
import ReportPage from '@/pages/biz/ReportPage';
import StatsPage from '@/pages/biz/StatsPage';
import DocsPage from '@/pages/biz/DocsPage';
import ReconPage from '@/pages/share/ReconPage';
import GoldminePage from '@/pages/share/GoldminePage';
import ApiPreviewPage from '@/pages/share/ApiPreviewPage';
import UsersPage from '@/pages/admin/UsersPage';
import CodesPage from '@/pages/admin/CodesPage';
import AuditPage from '@/pages/admin/AuditPage';
import RoadmapPage from '@/pages/RoadmapPage';

export default function App() {
  const device = useDevice();
  const Layout = device === 'desktop' ? DesktopLayout : MobileLayout;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/:id" element={<SalesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomersPage />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/partners/:id" element={<PartnersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        {/* 사업관리 — 동일 탭 체계 아래 운영 메뉴 통합 */}
        <Route path="/biz" element={<BizLayout />}>
          <Route index element={<BizHome />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="contracts/:id" element={<ContractsPage />} />
          <Route path="visits" element={<VisitsPage />} />
          <Route path="license" element={<FulfillHistoryPage kind="license" />} />
          <Route path="hyboost" element={<FulfillHistoryPage kind="shipment" />} />
          <Route path="receivables" element={<ReceivablesPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="docs" element={<DocsPage />} />
        </Route>
        <Route path="/contracts" element={<Navigate to="/biz/contracts" replace />} />
        <Route path="/contracts/:id" element={<ContractsRedirect />} />
        <Route path="/share/recon" element={<ReconPage />} />
        <Route path="/share/goldmine" element={<GoldminePage />} />
        <Route path="/share/api" element={<ApiPreviewPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/codes" element={<CodesPage />} />
        <Route path="/admin/audit" element={<AuditPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

import { useParams } from 'react-router-dom';
function ContractsRedirect() { const { id } = useParams(); return <Navigate to={`/biz/contracts/${id}`} replace />; }
