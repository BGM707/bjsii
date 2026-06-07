import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { supabase, hashPassword, getAuthUserId } from '../lib/supabase';

export default function SIIConfiguration() {
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    company_rut: '78.332.298-6',
    company_name: 'BJ SERVICIOS INFORMÁTICOS SpA',
    sii_username: '',
    sii_password: '',
    certificate_path: '',
    certificate_password: '',
    sii_environment: 'production'
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error: err } = await supabase
        .from('sii_configurations')
        .select('*')
        .eq('company_rut', '78.332.298-6')
        .maybeSingle();

      if (err) throw err;
      if (data) {
        setFormData({
          company_rut: data.company_rut,
          company_name: data.company_name,
          sii_username: data.sii_username || '',
          sii_password: '',
          certificate_path: data.certificate_path || '',
          certificate_password: '',
          sii_environment: data.sii_environment || 'production'
        });
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const siiPasswordHash = formData.sii_password ? hashPassword(formData.sii_password) : null;
      const certPasswordHash = formData.certificate_password ? hashPassword(formData.certificate_password) : null;

      const userId = await getAuthUserId();
      const { error: err } = await supabase
        .from('sii_configurations')
        .upsert([{
          company_rut: formData.company_rut,
          company_name: formData.company_name,
          sii_username: formData.sii_username,
          sii_password_hash: siiPasswordHash,
          certificate_path: formData.certificate_path,
          certificate_password_hash: certPasswordHash,
          sii_environment: formData.sii_environment,
          active: true,
          user_id: userId,
        }], {
          onConflict: 'company_rut'
        });

      if (err) throw err;

      setSuccess('Configuración guardada correctamente');
      setTimeout(() => {
        setShowConfig(false);
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Configuración SII</h3>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-gray-900 dark:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition text-sm"
        >
          <Settings className="w-4 h-4" />
          Configurar
        </button>
      </div>

      {showConfig && (
        <form onSubmit={handleSave} className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-green-500/20 border border-emerald-200 dark:border-green-500 rounded text-emerald-700 dark:text-green-300 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">RUT Empresa</label>
              <input
                type="text"
                value={formData.company_rut}
                disabled
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-3 py-2 text-gray-400 dark:text-gray-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Razón Social</label>
              <input
                type="text"
                value={formData.company_name}
                disabled
                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-3 py-2 text-gray-400 dark:text-gray-500 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold">Credenciales SII</p>

            <input
              type="text"
              placeholder="Usuario SII"
              value={formData.sii_username}
              onChange={(e) => setFormData({ ...formData, sii_username: e.target.value })}
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
            />

            <input
              type="password"
              placeholder="Contraseña SII"
              value={formData.sii_password}
              onChange={(e) => setFormData({ ...formData, sii_password: e.target.value })}
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold">Certificado Digital</p>

            <input
              type="text"
              placeholder="Ruta del certificado (.pfx)"
              value={formData.certificate_path}
              onChange={(e) => setFormData({ ...formData, certificate_path: e.target.value })}
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
            />

            <input
              type="password"
              placeholder="Contraseña del certificado"
              value={formData.certificate_password}
              onChange={(e) => setFormData({ ...formData, certificate_password: e.target.value })}
              className="w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Ambiente SII</label>
            <select
              value={formData.sii_environment}
              onChange={(e) => setFormData({ ...formData, sii_environment: e.target.value })}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
            >
              <option value="production">Producción</option>
              <option value="test">Prueba (Test)</option>
            </select>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded text-blue-700 dark:text-blue-300 text-xs">
            Los datos de credenciales se almacenan encriptados en la base de datos. La integración con SII se realizará a través de Edge Functions de Supabase.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </form>
      )}
    </div>
  );
}
