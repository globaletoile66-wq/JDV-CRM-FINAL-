'use client';

import React from 'react';
import ProspectorHeader from './components/ProspectorHeader';
import ProspectorKPIs from './components/ProspectorKPIs';
import ProspectorLogForm from './components/ProspectorLogForm';
import ProspectorSalesList from './components/ProspectorSalesList';
import ProspectorTargetBar from './components/ProspectorTargetBar';
import { BarChart2 } from 'lucide-react';

export default function FieldProspectorDashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col w-full max-w-md mx-auto">
      {/* HEADER */}
      <ProspectorHeader />

      {/* CONTENU PRINCIPAL */}
      <main className="flex-1 overflow-y-auto scrollbar-gold px-4 pb-6 space-y-4 pt-4">
        {/* INDICATEURS PRINCIPAUX */}
        <ProspectorKPIs />

        {/* OBJECTIF QUOTIDIEN */}
        <ProspectorTargetBar />

        {/* ANALYTICS */}
        <section
          className="
            flex items-center justify-between
            px-4 py-3
            bg-card
            border border-primary/20
            rounded-xl
            card-glow
            hover:border-primary/40
            transition-all duration-150
            group
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                w-8 h-8
                rounded-lg
                bg-primary/15
                flex items-center justify-center
                flex-shrink-0
              "
            >
              <BarChart2
                size={16}
                className="text-primary"
              />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-600 text-foreground">
                Mes performances
              </div>

              <div className="text-xs text-muted-foreground truncate">
                Tendances, commissions et évolution des ventes
              </div>
            </div>
          </div>

          <span
            className="
              text-xs font-600
              text-primary
              group-hover:text-accent
              transition-colors duration-150
              flex-shrink-0
            "
          >
            Analyse
          </span>
        </section>

        {/* FORMULAIRE D'ENREGISTREMENT */}
        <ProspectorLogForm />

        {/* VENTES DU JOUR */}
        <ProspectorSalesList />
      </main>
    </div>
  );
}