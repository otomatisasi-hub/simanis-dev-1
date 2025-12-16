// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { ClientsPage } from "./pages/Clients";
import { ServicesPage } from "./pages/Services";
import { ServiceDetailsPage } from "./pages/ServiceDetails";
import { UserManagementPage } from "./pages/UserManagement";
import { NotaryPage } from "./pages/NotaryPage";
import { SyariahPage } from "./pages/SyariahPage";
import { PPATPage } from "./pages/PPATPage";
import { FileStorageLocation } from "./pages/FileStorageLocation";
import { WorksheetManagement } from "./pages/WorksheetManagement";
import { DocumentChecklistPage } from "./pages/DocumentChecklistPage";
import { KeuanganPNBPPage } from "./pages/KeuanganPNBPPage";
import { KeuanganPNBPDetailPage } from "./pages/KeuanganPNBPDetailPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AdminUserManagementPage } from "./pages/AdminUserManagementPage";
import { KeuanganInvoicePage } from "@/pages/KeuanganInvoicePage";
import { KeuanganInvoiceDetailPage } from "@/pages/KeuanganInvoiceDetailPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ProfilePage } from "@/pages/ProfilePage";
import { ModuleProvider } from "@/context/ModuleContext";
import { FinanceDashboardNew } from "./pages/FinanceDashboardNew"; // New finance dashboard
import { KeuanganPage } from "./pages/KeuanganPage";
import FinanceWorkloadPage from '@/components/finance/FinanceWorkloadPage'; // Import components

import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";



const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <MainLayout>
      <Routes>
        {/* DASHBOARD */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* GENERAL ROUTES */}
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/services/:id" element={<ServiceDetailsPage />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* FINANCE ROUTES - New Dashboard */}
        <Route
          path="/finances"
          element={
            <ProtectedRoute
              requiredResource="layanan_keuangan_notaril"
              requiredAction="read"
            >
              <FinanceDashboardNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/keuangan/dashboard"
          element={
            <ProtectedRoute
              requiredResource="layanan_keuangan_notaril"
              requiredAction="read"
            >
              <FinanceDashboardNew />
            </ProtectedRoute>
          }
        />

        {/* 👉 ROUTE BARU: LEMBAR KERJA KEUANGAN */}
        <Route
          path="/keuangan/workload"
          element={
            <ProtectedRoute
              requiredResource="layanan_keuangan_notaril"
              requiredAction="read"
            >
              <FinanceWorkloadPage />
            </ProtectedRoute>
          }
        />

        {/* KEUANGAN INVOICE */}
        <Route
          path="/keuangan/invoice"
          element={
            <ProtectedRoute>
              <KeuanganInvoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/keuangan/invoice/:id"
          element={
            <ProtectedRoute>
              <KeuanganInvoiceDetailPage />
            </ProtectedRoute>
          }
        />

        {/* SERVICE ROUTES - Protected */}
        {/* Notaris */}
        <Route
          path="/services/notaris"
          element={
            <ProtectedRoute
              requiredResource="layanan_notaril"
              requiredAction="read"
            >
              <NotaryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services/notaris/document-checklist/:serviceId"
          element={
            <ProtectedRoute
              requiredResource="layanan_notaril"
              requiredAction="read"
            >
              <DocumentChecklistPage />
            </ProtectedRoute>
          }
        />

        {/* Syariah */}
        <Route
          path="/services/syariah"
          element={
            <ProtectedRoute
              requiredResource="layanan_syariah"
              requiredAction="read"
            >
              <SyariahPage />
            </ProtectedRoute>
          }
        />

        {/* PPAT */}
        <Route
          path="/services/ppat"
          element={
            <ProtectedRoute
              requiredResource="layanan_ppat"
              requiredAction="read"
            >
              <PPATPage />
            </ProtectedRoute>
          }
        />

        {/* KEUANGAN GLOBAL - Protected */}
        <Route
          path="/keuangan/global"
          element={
            <ProtectedRoute
              requiredResource="layanan_keuangan_notaril"
              requiredAction="read"
            >
              <KeuanganPage />
            </ProtectedRoute>
          }
        />

        {/* KEUANGAN PNBP - Protected */}
        <Route
          path="/keuangan/pnbp"
          element={
            <ProtectedRoute
              requiredResource="layanan_keuangan_notaril"
              requiredAction="read"
            >
              <KeuanganPNBPPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/keuangan/pnbp/:id"
          element={
            <ProtectedRoute
              requiredResource="layanan_keuangan_notaril"
              requiredAction="read"
            >
              <KeuanganPNBPDetailPage />
            </ProtectedRoute>
          }
        />

        {/* ADMIN ROUTES - Protected */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredResource="administrator" requiredAction="read">
              <AdminUserManagementPage />
            </ProtectedRoute>
          }
        />

        {/* OTHER ROUTES */}
        <Route path="/file-storage" element={<FileStorageLocation />} />
        <Route
          path="/worksheets"
          element={
            <ProtectedRoute requiredResource="administrator" requiredAction="read">
              <WorksheetManagement />
            </ProtectedRoute>
          }
        />
        <Route path="/users" element={<UserManagementPage />} />

        {/* CATCH-ALL */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <ModuleProvider>
            <AppRoutes />
          </ModuleProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
