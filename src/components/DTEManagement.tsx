import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DTEGenerator from './DTEGenerator';
import SIIConfiguration from './SIIConfiguration';
import SIIStatusChecker from './SIIStatusChecker';

export default function DTEManagement() {
  const [activeTab, setActiveTab] = useState<'generator' | 'config' | 'history' | 'checker'>('generator');
  const [dtes, setDtes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDTEs();
  }, [activeTab]);

  const loadDTEs = async () => {
    if (activeTab !== 'history') return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dte_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDtes(data || []);
    } catch (err) {
      console.error('Error loading DTEs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="flex gap-0 border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-3 font-bold text-sm transition whitespace-nowrap ${
              activeTab === 'generator'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'bg-neutral-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
            }`}
          >
            Generar DTE
          </button>
          <button
            onClick={() => setActiveTab('checker')}
            className={`px-4 py-3 font-bold text-sm transition whitespace-nowrap ${
              activeTab === 'checker'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'bg-neutral-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
            }`}
          >
            Verificar Estado
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-3 font-bold text-sm transition whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'bg-neutral-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
            }`}
          >
            Configuración SII
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              loadDTEs();
            }}
            className={`px-4 py-3 font-bold text-sm transition whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                : 'bg-neutral-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
            }`}
          >
            Historial DTEs
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'generator' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded text-blue-700 dark:text-blue-300 text-sm">
                <p className="font-bold mb-2">Generador de DTEs - Timbre Electrónico</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>Crea Documentos Tributarios Electrónicos válidos para el SII</li>
                  <li>Genera código de timbre electrónico con validación</li>
                  <li>Exporta XML compatible con sistema tributario chileno</li>
                  <li>Descarga automática de DTE y timbre en archivos separados</li>
                </ul>
              </div>
              <DTEGenerator />
            </div>
          )}

          {activeTab === 'checker' && (
            <div className="space-y-4">
              <div className="p-4 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 rounded text-cyan-700 dark:text-cyan-300 text-sm">
                <p className="font-bold mb-2">Verificar Estado de DTEs en SII</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>Consultar estado de DTEs ya emitidos</li>
                  <li>Verificar si el SII ha recibido el documento</li>
                  <li>Validar concordancia de datos</li>
                  <li>Obtener número de atención de consulta</li>
                </ul>
              </div>
              <SIIStatusChecker />
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded text-amber-700 dark:text-amber-300 text-sm">
                <p className="font-bold mb-2">Integración con Sistema de Impuestos Internos (SII)</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>Configurar credenciales SII (usuario y contraseña)</li>
                  <li>Cargar certificado digital (archivo .pfx)</li>
                  <li>Ambiente de producción o prueba</li>
                  <li>Los datos se almacenan encriptados en la base de datos</li>
                </ul>
              </div>
              <SIIConfiguration />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">Cargando DTEs...</p>
                </div>
              )}

              {!loading && dtes.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No hay DTEs generados</p>
                </div>
              )}

              {!loading && dtes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-700 dark:text-gray-300 font-bold">{dtes.length} DTEs generados</p>
                    <button
                      onClick={() => loadDTEs()}
                      className="flex items-center gap-2 px-3 py-1 bg-neutral-100 dark:bg-neutral-700 text-gray-900 dark:text-white rounded text-xs hover:bg-neutral-200 dark:hover:bg-neutral-600 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Actualizar
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 dark:border-neutral-700">
                          <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-400 font-bold">Folio</th>
                          <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-400 font-bold">Receptor</th>
                          <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-400 font-bold">Tipo</th>
                          <th className="text-right px-3 py-2 text-gray-600 dark:text-gray-400 font-bold">Total</th>
                          <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-400 font-bold">Estado</th>
                          <th className="text-left px-3 py-2 text-gray-600 dark:text-gray-400 font-bold">Descargas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {dtes.map(dte => (
                          <tr key={dte.id} className="hover:bg-neutral-50 dark:hover:bg-slate-700/50">
                            <td className="px-3 py-2 text-gray-900 dark:text-white font-bold">{dte.folio}</td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300 text-xs">{dte.recipient_name}</td>
                            <td className="px-3 py-2">
                              <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded">
                                {dte.document_type === 'boleta' ? 'Boleta' : 'Factura'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-bold">
                              ${dte.total_amount.toLocaleString('es-CL')}
                            </td>
                            <td className="px-3 py-2">
                              <span className={`text-xs px-2 py-1 rounded font-bold ${
                                dte.sii_status === 'registered' ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-300' :
                                dte.sii_status === 'rejected' ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300' :
                                'bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300'
                              }`}>
                                {dte.sii_status === 'registered' ? 'Registrado' :
                                 dte.sii_status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="px-3 py-2 flex gap-1">
                              <button
                                onClick={() => {
                                  const el = document.createElement('a');
                                  el.href = 'data:text/xml;charset=utf-8,' + encodeURIComponent(dte.xml_content);
                                  el.download = `DTE_${dte.folio}.xml`;
                                  el.click();
                                }}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                              >
                                XML
                              </button>
                              <button
                                onClick={() => {
                                  const el = document.createElement('a');
                                  el.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dte.electronic_seal);
                                  el.download = `TIMBRE_${dte.folio}.json`;
                                  el.click();
                                }}
                                className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                              >
                                Timbre
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
