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
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/contracts/:id" element={<ContractsPage />} />
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
