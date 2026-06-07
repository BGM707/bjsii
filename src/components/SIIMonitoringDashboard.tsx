import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface DTEData {
  id: string;
  folio: string;
  dte_type: string;
  emitter_name: string;
  receiver_name: string;
  issue_date: string;
  net_amount: number;
  iva_amount: number;
  total_amount: number;
  sii_status: string;
  synced_at: string;
}

interface FinancialSummary {
  total_emitted_documents: number;
  total_emitted_net: number;
  total_emitted_iva: number;
  total_emitted_gross: number;
}

interface SyncLog {
  id: string;
  operation: string;
  status: string;
  records_processed: number;
  created_at: string;
  error_message?: string;
}

export default function SIIMonitoringDashboard() {
  const [dtes, setDtes] = useState<DTEData[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const companyRut = '78.332.298-6';

  useEffect(() => {
    loadDashboardData();

    const dteSubscription = supabase
      .channel(`dtes:company_rut=eq.${companyRut}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sii_dtes_sync' }, (payload) => {
        loadDTEsData();
      })
      .subscribe();

    const logSubscription = supabase
      .channel('sync_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sii_sync_logs' }, (payload) => {
        loadSyncLogs();
      })
      .subscribe();

    return () => {
      dteSubscription.unsubscribe();
      logSubscription.unsubscribe();
    };
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      await Promise.all([loadDTEsData(), loadSummary(), loadSyncLogs()]);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error loading dashboard';
      setError(errorMsg);
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDTEsData() {
    try {
      const { data, error } = await supabase
        .from('sii_dtes_sync')
        .select('*')
        .eq('company_rut', companyRut)
        .order('issue_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setDtes(data || []);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error loading DTEs:', err);
    }
  }

  async function loadSummary() {
    try {
      const { data, error } = await supabase
        .from('sii_financial_summary')
        .select('*')
        .eq('company_rut', companyRut)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSummary({
          total_emitted_documents: data.total_emitted_documents,
          total_emitted_net: data.total_emitted_net,
          total_emitted_iva: data.total_emitted_iva,
          total_emitted_gross: data.total_emitted_gross,
        });
      }
    } catch (err) {
      console.error('Error loading summary:', err);
    }
  }

  async function loadSyncLogs() {
    try {
      const { data, error } = await supabase
        .from('sii_sync_logs')
        .select('*')
        .eq('company_rut', companyRut)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (err) {
      console.error('Error loading sync logs:', err);
    }
  }

  async function triggerManualSync() {
    try {
      setSyncing(true);
      setError(null);

      const siiConfig = await supabase
        .from('sii_configurations')
        .select('*')
        .eq('company_rut', companyRut)
        .eq('active', true)
        .single();

      if (siiConfig.error) throw new Error('SII configuration not found');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sii-schedule-sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) throw new Error('Sync failed');

      const result = await response.json();
      if (result.success) {
        await loadDashboardData();
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sync error';
      setError(errorMsg);
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DOK':
        return 'bg-emerald-100 dark:bg-green-500/20 text-emerald-800 dark:text-green-300';
      case 'FAU':
        return 'bg-amber-100 dark:bg-yellow-500/20 text-amber-800 dark:text-yellow-300';
      case 'DNK':
        return 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300';
      case 'FAN':
        return 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      DOK: 'Recibido',
      DNK: 'No Recibido',
      FAU: 'No Autorizado',
      FAN: 'Cancelado',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Cargando datos del SII...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monitor SII en Tiempo Real</h2>
        <button
          onClick={triggerManualSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Error</p>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {lastSync && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
          Última actualización: {lastSync}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Documentos Emitidos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_emitted_documents}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Monto Neto</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${summary.total_emitted_net.toLocaleString('es-CL')}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">IVA Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${summary.total_emitted_iva.toLocaleString('es-CL')}
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Monto Bruto</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${summary.total_emitted_gross.toLocaleString('es-CL')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600">
            <h3 className="font-semibold text-gray-900 dark:text-white">Últimas Facturas / Boletas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Folio</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Monto Neto</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">IVA</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Total</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Estado SII</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-600">
                {dtes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No hay facturas sincronizadas
                    </td>
                  </tr>
                ) : (
                  dtes.map((dte) => (
                    <tr key={dte.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{dte.folio}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(dte.issue_date).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        ${dte.net_amount.toLocaleString('es-CL')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        ${dte.iva_amount.toLocaleString('es-CL')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        ${dte.total_amount.toLocaleString('es-CL')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(dte.sii_status)}`}>
                          {getStatusLabel(dte.sii_status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600">
            <h3 className="font-semibold text-gray-900 dark:text-white">Historial de Sincronización</h3>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-600">
            {syncLogs.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                Sin registro de sincronizaciones
              </div>
            ) : (
              syncLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-neutral-700 transition">
                  <div className="flex items-start gap-3">
                    {log.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.operation === 'scheduled_sync' ? 'Sincronización' : log.operation}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(log.created_at).toLocaleTimeString('es-CL')}
                      </p>
                      {log.records_processed > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {log.records_processed} registros procesados
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
