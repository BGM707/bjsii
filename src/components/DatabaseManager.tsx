import { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { localDB } from '../lib/database';

export default function DatabaseManager() {
  const [stats, setStats] = useState({
    receipts: 0,
    serviceOrders: 0,
    quotations: 0,
    totalSize: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      await localDB.initialize();
      const [receipts, orders, quotations] = await Promise.all([
        localDB.getReceipts(),
        localDB.getServiceOrders(),
        localDB.getQuotations()
      ]);

      // Calculate approximate size
      const dataSize = JSON.stringify({ receipts, orders, quotations }).length;
      
      setStats({
        receipts: receipts.length,
        serviceOrders: orders.length,
        quotations: quotations.length,
        totalSize: dataSize
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleExportDatabase = async () => {
    try {
      setLoading(true);
      await localDB.initialize();
      const blob = localDB.exportDatabase();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benjamingonzalez-backup-${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Base de datos exportada exitosamente');
    } catch (error) {
      console.error('Error exporting database:', error);
      alert('Error al exportar la base de datos');
    } finally {
      setLoading(false);
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      await localDB.importDatabase(file);
      await loadStats();
      alert('Base de datos importada exitosamente');
    } catch (error) {
      console.error('Error importing database:', error);
      alert('Error al importar la base de datos. Verifique que el archivo sea válido.');
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('¿Está seguro de que desea eliminar todos los datos? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      localDB.clearDatabase();
      await loadStats();
      alert('Base de datos limpiada exitosamente');
    } catch (error) {
      console.error('Error clearing database:', error);
      alert('Error al limpiar la base de datos');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-indigo-100 p-2 rounded-lg">
          <Database className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Base de Datos</h2>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Boletas</p>
              <p className="text-2xl font-bold text-blue-900">{stats.receipts}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Órdenes</p>
              <p className="text-2xl font-bold text-green-900">{stats.serviceOrders}</p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Cotizaciones</p>
              <p className="text-2xl font-bold text-purple-900">{stats.quotations}</p>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tamaño</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(stats.totalSize)}</p>
            </div>
            <div className="bg-gray-100 p-2 rounded-lg">
              <Database className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Información importante */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800 mb-1">Información Importante</h3>
            <div className="text-sm text-amber-700 space-y-1">
              <p>• Los datos se almacenan localmente en su navegador (SQLite)</p>
              <p>• No se envía información a servidores externos</p>
              <p>• Exporte regularmente su base de datos como respaldo</p>
              <p>• Al limpiar el navegador se perderán los datos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones de Base de Datos</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Exportar */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Exportar Base de Datos</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Descarga un archivo de respaldo con todos tus datos
              </p>
              <button
                onClick={handleExportDatabase}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                <Download className="w-4 h-4" />
                <span>{loading ? 'Exportando...' : 'Exportar'}</span>
              </button>
            </div>

            {/* Importar */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Upload className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Importar Base de Datos</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Restaura datos desde un archivo de respaldo
              </p>
              <label className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Seleccionar Archivo</span>
                <input
                  type="file"
                  accept=".db"
                  onChange={handleImportDatabase}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>

            {/* Limpiar */}
            <div className="border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Limpiar Base de Datos</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Elimina todos los datos permanentemente
              </p>
              <button
                onClick={handleClearDatabase}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
              >
                <Trash2 className="w-4 h-4" />
                <span>{loading ? 'Limpiando...' : 'Limpiar Todo'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Estado de la aplicación */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-green-800 mb-1">Aplicación Completamente Local</h3>
              <div className="text-sm text-green-700 space-y-1">
                <p>• ✅ Funciona sin conexión a internet</p>
                <p>• ✅ No requiere registro ni login</p>
                <p>• ✅ Datos privados y seguros</p>
                <p>• ✅ Exportación e importación de datos</p>
                <p>• ✅ Herramienta completamente portable</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}