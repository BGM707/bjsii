import { useState } from 'react';
import { Download, Upload, Database, FileJson, FileArchive, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase, getCurrentUserId } from '../lib/supabase';

interface ImportResult {
  table: string;
  imported: number;
  skipped: number;
  errors: string[];
}

export default function DatabaseImportExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const TABLES = [
    'projects',
    'cobros_notes',
    'receipts',
    'service_orders',
    'dte_documents',
    'payment_notices',
  ];

  const exportJSON = async () => {
    setExportLoading(true);
    setMessage(null);

    try {
      const data: Record<string, unknown[]> = {};

      for (const table of TABLES) {
        const { data: rows, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn(`Error exporting ${table}:`, error.message);
          data[table] = [];
        } else {
          data[table] = rows || [];
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bj_servicios_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Base de datos exportada correctamente en JSON' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al exportar la base de datos' });
    } finally {
      setExportLoading(false);
    }
  };

  const exportCSV = async () => {
    setExportLoading(true);
    setMessage(null);

    try {
      const allData: Record<string, unknown[]> = {};

      for (const table of TABLES) {
        const { data: rows, error } = await supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && rows) {
          allData[table] = rows;
        }
      }

      const lines: string[] = ['table,action,data_json'];

      for (const [table, rows] of Object.entries(allData)) {
        for (const row of rows) {
          const cleanRow = { ...row };
          delete cleanRow.id;
          delete cleanRow.user_id;
          lines.push(`${table},upsert,${JSON.stringify(cleanRow).replace(/"/g, '""')}`);
        }
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bj_servicios_backup_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Base de datos exportada correctamente en CSV' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al exportar la base de datos' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportResults([]);
    setMessage(null);

    try {
      const userId = getCurrentUserId();
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'json') {
        await importJSON(file, userId);
      } else if (ext === 'csv') {
        await importCSV(file, userId);
      } else if (ext === 'db' || ext === 'sqlite' || ext === 'sqlite3') {
        await importSQLite(file, userId);
      } else {
        setMessage({ type: 'error', text: 'Formato no soportado. Usa JSON, CSV o SQLite (.db, .sqlite, .sqlite3)' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al importar: ${err.message || 'Error desconocido'}` });
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const importJSON = async (file: File, userId: string) => {
    const text = await file.text();
    let data = JSON.parse(text);
    const results: ImportResult[] = [];

    // Si es un array plano, detectar qué tabla es por los campos
    if (Array.isArray(data) && data.length > 0) {
      const firstRow = data[0];
      const detectedTable = detectTableFromFields(Object.keys(firstRow));
      if (detectedTable) {
        data = { [detectedTable]: data };
      }
    }

    for (const table of TABLES) {
      const rows = data[table];
      if (!Array.isArray(rows)) continue;

      const result: ImportResult = { table, imported: 0, skipped: 0, errors: [] };

      for (const row of rows) {
        const mapped = mapRowToTable(table, row, userId);
        if (!mapped) {
          result.skipped++;
          continue;
        }

        const { error } = await supabase.from(table).insert([mapped]);
        if (error) {
          if (error.code === '23505') {
            result.skipped++;
          } else {
            result.errors.push(`${error.message}`);
            result.skipped++;
          }
        } else {
          result.imported++;
        }
      }

      results.push(result);
    }

    setImportResults(results);
    const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
    setMessage({ type: 'success', text: `Importación completada: ${totalImported} registros importados` });
  };

  const importCSV = async (file: File, userId: string) => {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const results: ImportResult[] = [];
    const tableGroups: Record<string, any[]> = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const firstComma = line.indexOf(',');
      const secondComma = line.indexOf(',', firstComma + 1);
      if (firstComma === -1 || secondComma === -1) continue;

      const table = line.substring(0, firstComma).trim();
      const dataStr = line.substring(secondComma + 1).trim();

      try {
        const rowData = JSON.parse(dataStr.replace(/""/g, '"'));
        if (!tableGroups[table]) tableGroups[table] = [];
        tableGroups[table].push(rowData);
      } catch {
        continue;
      }
    }

    for (const [table, rows] of Object.entries(tableGroups)) {
      if (!TABLES.includes(table)) continue;

      const result: ImportResult = { table, imported: 0, skipped: 0, errors: [] };

      for (const row of rows) {
        const mapped = mapRowToTable(table, row, userId);
        if (!mapped) {
          result.skipped++;
          continue;
        }

        const { error } = await supabase.from(table).insert([mapped]);
        if (error) {
          if (error.code === '23505') {
            result.skipped++;
          } else {
            result.errors.push(error.message);
            result.skipped++;
          }
        } else {
          result.imported++;
        }
      }

      results.push(result);
    }

    setImportResults(results);
    const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
    setMessage({ type: 'success', text: `Importación CSV completada: ${totalImported} registros importados` });
  };

  const importSQLite = async (file: File, userId: string) => {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs({
      locateFile: (f: string) => `https://sql.js.org/dist/${f}`
    });

    const buffer = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buffer));

    const tableNames = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const detectedTables = tableNames.length > 0 ? tableNames[0].values.map(v => v[0] as string) : [];

    const results: ImportResult[] = [];

    for (const table of TABLES) {
      const matchingTable = findMatchingTable(table, detectedTables);
      if (!matchingTable) continue;

      const result: ImportResult = { table, imported: 0, skipped: 0, errors: [] };

      try {
        const stmt = db.prepare(`SELECT * FROM "${matchingTable}"`);
        while (stmt.step()) {
          const row = stmt.getAsObject();
          const mapped = mapRowToTable(table, row, userId);
          if (!mapped) {
            result.skipped++;
            continue;
          }

          const { error } = await supabase.from(table).insert([mapped]);
          if (error) {
            if (error.code === '23505') {
              result.skipped++;
            } else {
              result.errors.push(error.message);
              result.skipped++;
            }
          } else {
            result.imported++;
          }
        }
        stmt.free();
      } catch (err: any) {
        result.errors.push(err.message || 'Error leyendo tabla SQLite');
      }

      results.push(result);
    }

    db.close();
    setImportResults(results);
    const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
    setMessage({ type: 'success', text: `Importación SQLite completada: ${totalImported} registros importados` });
  };

  const detectTableFromFields = (fields: string[]): string | null => {
    const fieldsLower = fields.map(f => f.toLowerCase());

    // Cobros notes: tiene folio, cliente, servicio_titulo, periodo, neto
    if (fieldsLower.includes('folio') && fieldsLower.includes('cliente') && fieldsLower.includes('servicio_titulo')) {
      return 'cobros_notes';
    }

    // Receipts: tiene receipt_number, client_name, items
    if ((fieldsLower.includes('receipt_number') || fieldsLower.includes('numero')) && fieldsLower.includes('client_name')) {
      return 'receipts';
    }

    // Service orders: tiene order_number, device_type, service_type
    if ((fieldsLower.includes('order_number') || fieldsLower.includes('numero')) && fieldsLower.includes('device_type')) {
      return 'service_orders';
    }

    // Projects: tiene name/nombre y description/descripcion
    if (fieldsLower.includes('name') || fieldsLower.includes('nombre')) {
      if (fieldsLower.includes('description') || fieldsLower.includes('descripcion')) {
        return 'projects';
      }
    }

    // DTE documents: tiene folio, company_rut, document_type
    if (fieldsLower.includes('folio') && fieldsLower.includes('company_rut')) {
      return 'dte_documents';
    }

    // Payment notices: folio, cliente, servicio_titulo
    if (fieldsLower.includes('folio') && fieldsLower.includes('cliente')) {
      return 'payment_notices';
    }

    return null;
  };

  const findMatchingTable = (targetTable: string, availableTables: string[]): string | null => {
    const normalized = targetTable.toLowerCase().replace(/_/g, '');
    for (const t of availableTables) {
      const tNorm = t.toLowerCase().replace(/_/g, '');
      if (tNorm === normalized || tNorm.includes(normalized) || normalized.includes(tNorm)) {
        return t;
      }
    }
    const aliases: Record<string, string[]> = {
      projects: ['proyectos', 'project', 'proyecto'],
      cobros_notes: ['cobros', 'cobro', 'notas_cobro', 'notacobro', 'nota_cobro', 'billing_notes', 'invoices'],
      receipts: ['boletas', 'boleta', 'receipt', 'recibos', 'recibo'],
      service_orders: ['ordenes', 'orden_servicio', 'orden', 'service_order', 'orders', 'ordenes_servicio', 'work_orders'],
      dte_documents: ['dte', 'dtes', 'documentos_dte', 'facturas', 'factura'],
      payment_notices: ['avisos', 'aviso_cobro', 'aviso', 'payment_notice', 'notices', 'payment_notices'],
    };

    const tableAliases = aliases[targetTable] || [];
    for (const alias of tableAliases) {
      for (const t of availableTables) {
        const tNorm = t.toLowerCase().replace(/_/g, '');
        const aliasNorm = alias.toLowerCase().replace(/_/g, '');
        if (tNorm === aliasNorm || tNorm.includes(aliasNorm) || aliasNorm.includes(tNorm)) {
          return t;
        }
      }
    }

    return null;
  };

  const mapRowToTable = (table: string, row: Record<string, any>, userId: string): Record<string, any> | null => {
    const r = normalizeKeys(row);
    const mapped: Record<string, any> = { user_id: userId };

    switch (table) {
      case 'projects': {
        mapped.name = r.name || r.nombre || r.titulo || r.title || r.proyecto || 'Sin nombre';
        mapped.description = r.description || r.descripcion || r.desc || null;
        mapped.client = r.client || r.cliente || r.customer || r.client_name || null;
        mapped.status = mapStatus(r.status || r.estado || 'activo');
        mapped.quotations = toArray(r.quotations || r.cotizaciones || []);
        mapped.documents = toArray(r.documents || r.documentos || []);
        return mapped;
      }

      case 'cobros_notes': {
        mapped.folio = r.folio || r.numero || r.number || `IMP-${Date.now()}`;
        mapped.cliente = r.cliente || r.client || r.client_name || r.customer || 'Sin cliente';
        mapped.rut = r.rut || r.rif || r.tax_id || r.cedula || null;
        mapped.telefono = r.telefono || r.phone || r.telephone || r.celular || null;
        mapped.servicio_titulo = r.servicio_titulo || r.servicio || r.service || r.title || 'Servicio';
        mapped.servicio_desc = r.servicio_desc || r.descripcion || r.description || null;
        mapped.periodo = r.periodo || r.period || r.month || r.mes || null;
        mapped.neto = toNumber(r.neto || r.net || r.amount || r.monto || r.subtotal || 0);
        mapped.banco = r.banco || r.bank || null;
        mapped.cuenta = r.cuenta || r.account || r.account_number || null;
        mapped.titular = r.titular || r.holder || r.account_holder || null;
        mapped.estado = mapCobrosEstado(r.estado || r.status || r.sii_estado || 'pendiente');
        mapped.proyecto_id = r.proyecto_id || r.project_id || null;
        return mapped;
      }

      case 'receipts': {
        mapped.receipt_number = r.receipt_number || r.numero || r.number || `BOL-IMP-${Date.now()}`;
        mapped.client_name = r.client_name || r.cliente || r.client || r.customer || 'Sin cliente';
        mapped.client_email = r.client_email || r.email || r.correo || null;
        mapped.client_phone = r.client_phone || r.telefono || r.phone || null;
        mapped.client_address = r.client_address || r.direccion || r.address || null;
        mapped.items = toArray(r.items || []).length > 0 ? r.items : [{ description: 'Servicio', quantity: 1, price: 0, total: 0 }];
        mapped.subtotal = toNumber(r.subtotal || r.neto || r.net || 0);
        mapped.tax = toNumber(r.tax || r.iva || 0);
        mapped.total = toNumber(r.total || r.monto || r.amount || 0);
        return mapped;
      }

      case 'service_orders': {
        mapped.order_number = r.order_number || r.numero || r.number || `OS-IMP-${Date.now()}`;
        mapped.client_name = r.client_name || r.cliente || r.client || r.customer || 'Sin cliente';
        mapped.client_email = r.client_email || r.email || r.correo || null;
        mapped.client_phone = r.client_phone || r.telefono || r.phone || null;
        mapped.client_address = r.client_address || r.direccion || r.address || null;
        mapped.device_type = toArray(r.device_type || r.tipo_dispositivo || r.device || []);
        mapped.device_brand = r.device_brand || r.marca || r.brand || null;
        mapped.device_model = r.device_model || r.modelo || r.model || null;
        mapped.device_serial = r.device_serial || r.serial || r.numero_serie || null;
        mapped.problem_description = r.problem_description || r.problema || r.description || r.descripcion || null;
        mapped.service_type = r.service_type || r.tipo_servicio || r.type || 'reparacion';
        mapped.status = mapOrderStatus(r.status || r.estado || 'pending');
        mapped.estimated_cost = toNumber(r.estimated_cost || r.costo || r.cost || r.precio || 0);
        mapped.notes = r.notes || r.notas || r.observaciones || null;
        return mapped;
      }

      case 'dte_documents': {
        mapped.folio = r.folio || r.numero || r.number || `DTE-IMP-${Date.now()}`;
        mapped.company_rut = r.company_rut || r.rut_empresa || '78.332.298-6';
        mapped.company_name = r.company_name || r.razon_social || r.empresa || 'BJ SERVICIOS INFORMÁTICOS SpA';
        mapped.document_type = r.document_type || r.tipo_documento || r.type || '33';
        mapped.recipient_rut = r.recipient_rut || r.rut_receptor || r.rut_cliente || r.cliente_rut || '0-0';
        mapped.recipient_name = r.recipient_name || r.razon_social_receptor || r.cliente || r.client_name || 'Sin nombre';
        mapped.issue_date = r.issue_date || r.fecha || r.date || new Date().toISOString().split('T')[0];
        mapped.net_amount = toNumber(r.net_amount || r.neto || r.net || 0);
        mapped.iva_amount = toNumber(r.iva_amount || r.iva || r.tax || 0);
        mapped.total_amount = toNumber(r.total_amount || r.total || r.monto || 0);
        mapped.document_description = r.document_description || r.descripcion || r.description || null;
        mapped.sii_status = 'pending';
        return mapped;
      }

      case 'payment_notices': {
        mapped.folio = r.folio || r.numero || r.number || `AV-IMP-${Date.now()}`;
        mapped.cliente = r.cliente || r.client || r.client_name || r.customer || 'Sin cliente';
        mapped.rut = r.rut || r.rif || r.tax_id || null;
        mapped.telefono = r.telefono || r.phone || null;
        mapped.servicio_titulo = r.servicio_titulo || r.servicio || r.service || 'Servicio';
        mapped.servicio_desc = r.servicio_desc || r.descripcion || r.description || null;
        mapped.periodo = r.periodo || r.period || null;
        mapped.neto = toNumber(r.neto || r.net || r.amount || 0);
        mapped.iva = toNumber(r.iva || r.tax || 0);
        mapped.total = toNumber(r.total || r.monto || r.amount || 0);
        mapped.banco = r.banco || r.bank || null;
        mapped.cuenta = r.cuenta || r.account || null;
        mapped.titular = r.titular || r.holder || null;
        mapped.estado = r.estado || r.status || 'pendiente';
        return mapped;
      }

      default:
        return null;
    }
  };

  const normalizeKeys = (obj: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
      result[normalizedKey] = value;
    }
    return result;
  };

  const toArray = (val: any): any[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [val];
      } catch {
        return val.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const toNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const mapStatus = (status: string): string => {
    const s = status.toLowerCase().trim();
    if (['activo', 'active', 'en_proceso', 'in_progress', 'en curso'].includes(s)) return 'activo';
    if (['pausado', 'paused', 'on_hold', 'en_pausa'].includes(s)) return 'pausado';
    if (['completado', 'completed', 'done', 'terminado', 'finalizado', 'finished'].includes(s)) return 'completado';
    return 'activo';
  };

  const mapCobrosEstado = (status: string): string => {
    if (!status) return 'pendiente';
    const s = String(status).toLowerCase().trim();
    if (['pendiente', 'pending', 'pend', 'unpaid', 'no_pagado', 'no_enviado'].includes(s)) return 'pendiente';
    if (['pagado', 'paid', 'pag', 'cobrado', 'collected', 'done'].includes(s)) return 'pagado';
    return 'pendiente';
  };

  const mapOrderStatus = (status: string): string => {
    const s = status.toLowerCase().trim();
    if (['pending', 'pendiente', 'pend', 'nuevo', 'new'].includes(s)) return 'pending';
    if (['in_progress', 'en_proceso', 'proceso', 'en_curso', 'working', 'reparando'].includes(s)) return 'in_progress';
    if (['completed', 'completado', 'done', 'terminado', 'finalizado', 'entregado', 'delivered'].includes(s)) return 'completed';
    if (['cancelled', 'cancelado', 'anulado'].includes(s)) return 'cancelled';
    return 'pending';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-system">Importar / Exportar Base de Datos</h2>

      {/* Export Section */}
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 mb-4">
          <Download className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Exportar Datos</h3>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          Descarga todos los datos del sistema en el formato que prefieras. El archivo incluye proyectos, notas de cobro, boletas, órdenes de servicio, DTEs y avisos de pago.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportJSON}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            Exportar JSON
          </button>
          <button
            onClick={exportCSV}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Importar Datos</h3>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          Importa datos desde un archivo JSON, CSV o SQLite (.db, .sqlite). El sistema mapea automáticamente los campos que coincidan (cliente, montos, fechas, etc.) y omite los que no existen. Los registros duplicados se saltan automáticamente.
        </p>

        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 mb-4">
          <p className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Formatos aceptados:</p>
          <ul className="text-gray-600 dark:text-gray-400 text-sm space-y-1">
            <li className="flex items-center gap-2"><FileJson className="w-4 h-4 text-blue-400" /> JSON - Estructura con claves por tabla</li>
            <li className="flex items-center gap-2"><Database className="w-4 h-4 text-green-400" /> CSV - Formato exportado por esta app</li>
            <li className="flex items-center gap-2"><FileArchive className="w-4 h-4 text-yellow-400" /> SQLite (.db, .sqlite, .sqlite3) - Base de datos completa</li>
          </ul>
        </div>

        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 mb-4">
          <p className="text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Mapeo flexible de campos:</p>
          <p className="text-gray-600 dark:text-gray-400 text-xs">
            El sistema reconoce campos en español e inglés. Por ejemplo: <code className="text-blue-700 dark:text-blue-300">cliente</code> o <code className="text-blue-700 dark:text-blue-300">client</code>, <code className="text-blue-700 dark:text-blue-300">monto</code> o <code className="text-blue-700 dark:text-blue-300">amount</code>, <code className="text-blue-700 dark:text-blue-300">telefono</code> o <code className="text-blue-700 dark:text-blue-300">phone</code>. Los campos que no existan se rellenan con valores por defecto.
          </p>
        </div>

        <label className={`flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${
          importLoading
            ? 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 opacity-50 cursor-not-allowed'
            : 'border-blue-300 dark:border-blue-500 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20'
        }`}>
          <input
            type="file"
            accept=".json,.csv,.db,.sqlite,.sqlite3"
            onChange={handleImportFile}
            disabled={importLoading}
            className="hidden"
          />
          {importLoading ? (
            <>
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">Importando...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">Seleccionar archivo para importar</span>
            </>
          )}
        </label>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-green-500/20 border border-emerald-200 dark:border-green-500 text-emerald-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500 text-red-700 dark:text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Import Results */}
      {importResults.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resultado de la Importación</h3>
          <div className="space-y-3">
            {importResults.map((result, i) => (
              <div key={i} className="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-900 dark:text-white font-medium">{result.table}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 dark:text-green-400">{result.imported} importados</span>
                    <span className="text-yellow-600 dark:text-yellow-400">{result.skipped} omitidos</span>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.errors.slice(0, 3).map((err, j) => (
                      <p key={j} className="text-red-600 dark:text-red-400 text-xs">{err}</p>
                    ))}
                    {result.errors.length > 3 && (
                      <p className="text-red-600 dark:text-red-400 text-xs">...y {result.errors.length - 3} errores más</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
