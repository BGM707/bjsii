import React, { useState } from 'react';
import { Search, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { queryDTEStatus, extractRUTParts, formatDTEDate, DTEStatusDescriptions } from '../lib/sii-integration';

interface DTEToCheck {
  folioDte: string;
  fechaEmisionDte: string;
  montoDte: string;
  rutReceptor: string;
}

export default function SIIStatusChecker() {
  const [showChecker, setShowChecker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState<DTEToCheck>({
    folioDte: '',
    fechaEmisionDte: new Date().toISOString().split('T')[0],
    montoDte: '',
    rutReceptor: '',
  });

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      // Datos de BJ SERVICIOS
      const companyRut = extractRUTParts('78.332.298-6');
      const receptorRut = extractRUTParts(formData.rutReceptor);
      const consultorRut = extractRUTParts('78.332.298-6');

      const params = {
        rutConsultante: consultorRut.rut,
        dvConsultante: consultorRut.dv,
        rutCompania: companyRut.rut,
        dvCompania: companyRut.dv,
        rutReceptor: receptorRut.rut,
        dvReceptor: receptorRut.dv,
        tipoDte: '39', // Boleta
        folioDte: formData.folioDte,
        fechaEmisionDte: formatDTEDate(formData.fechaEmisionDte),
        montoDte: formData.montoDte,
        token: 'test_token', // En producción sería obtenido de la autenticación
        environment: 'test' as const,
      };

      const response = await queryDTEStatus(params);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Error al consultar estado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Verificar Estado DTE en SII</h3>
        <button
          onClick={() => setShowChecker(!showChecker)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          <Search className="w-4 h-4" />
          Verificar
        </button>
      </div>

      {showChecker && (
        <form onSubmit={handleCheckStatus} className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500 rounded text-red-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Folio DTE"
              value={formData.folioDte}
              onChange={(e) => setFormData({ ...formData, folioDte: e.target.value })}
              className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              required
            />

            <input
              type="date"
              value={formData.fechaEmisionDte}
              onChange={(e) => setFormData({ ...formData, fechaEmisionDte: e.target.value })}
              className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              required
            />

            <input
              type="text"
              placeholder="RUT Receptor (ej: 12.345.678-9)"
              value={formData.rutReceptor}
              onChange={(e) => setFormData({ ...formData, rutReceptor: e.target.value })}
              className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              required
            />

            <input
              type="number"
              placeholder="Monto Total"
              value={formData.montoDte}
              onChange={(e) => setFormData({ ...formData, montoDte: e.target.value })}
              className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            {loading ? 'Consultando SII...' : 'Consultar Estado'}
          </button>
        </form>
      )}

      {result && (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            {result.errCode === '0' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
            <h4 className="text-white font-bold">Resultado de Consulta</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">Estado</p>
              <p className="text-white font-bold">{result.estado}</p>
            </div>
            <div>
              <p className="text-slate-400">Código Error</p>
              <p className="text-white font-bold">{result.errCode}</p>
            </div>
            <div>
              <p className="text-slate-400">Descripción</p>
              <p className="text-white">
                {DTEStatusDescriptions[result.mappedStatus] || result.glosa}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Número de Atención</p>
              <p className="text-white font-mono text-xs">{result.numAtencion}</p>
            </div>
          </div>

          {result.glosErr && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <p className="text-yellow-300 text-sm">{result.glosErr}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
