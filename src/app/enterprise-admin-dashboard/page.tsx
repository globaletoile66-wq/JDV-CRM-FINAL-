'use client';

import React from 'react';

import AdminLayout from './components/AdminLayout';
import AdminDashboardHeader from './components/AdminDashboardHeader';
import AdminKPIBento from './components/AdminKPIBento';
import AdminProspectorTable from './components/AdminProspectorTable';
import AdminTokenChart from './components/AdminTokenChart';
import AdminStockPanel from './components/AdminStockPanel';
import AdminRecentSales from './components/AdminRecentSales';

export default function EnterpriseAdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* En-tête du compte entreprise */}
        <AdminDashboardHeader />

        {/* Indicateurs principaux */}
        <AdminKPIBento />

        {/* Tokens + Stock */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 min-w-0">
            <AdminTokenChart />
          </div>

          <div className="min-w-0">
            <AdminStockPanel />
          </div>
        </div>

        {/* Gestion des prospecteurs */}
        <AdminProspectorTable />

        {/* Ventes / paiements récents */}
        <AdminRecentSales />
      </div>
    </AdminLayout>
  );
}