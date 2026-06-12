import { useState, useEffect, useCallback } from 'react';
import {
  Download, Upload, Database, FileJson, FileSpreadsheet, AlertCircle, CheckCircle,
  Loader2, Info, ChevronDown, ChevronUp, Filter, Eye, Trash2, RefreshCw,
  Calendar, Table2, HardDrive, Clock, X, Check, AlertTriangle
} from 'lucide-react';
import { supabase, getCurrentUserId } from '../lib/supabase';

interface TableStats {
  name: string;
  count: number;
  label: string;
  icon: string;
}

interface ImportResult {
  table: string;
  imported: number;
  skipped: number;
  errors: string[];
}

interface PreviewData {
  table: string;
  rows: Record<string, unknown>[];
  count: number;
  canImport: boolean;
  validationErrors: string[];
}

const ALL_TABLES: { name: string; label: string; icon: string }[] = [
  { name: 'projects', label: 'Proyectos', icon: '📁' },
  { name: 'cobros_notes', label: 'Notas de Cobro', icon: '📄' },
  { name: 'receipts', label: 'Boletas', icon: '🧾' },
  { name: 'service_orders', label: 'Ordenes de Servicio', icon: '🔧' },
  { name: 'dte_documents', label: 'Documentos DTE', icon: '📋' },
  { name: 'payment_notices', label: 'Avisos de Pago', icon: '💳' },
  { name: 'cash_categories', label: 'Categorias de Caja', icon: '🏷️' },
  { name: 'cash_transactions', label: 'Transacciones de Caja', icon: '💸' },
  { name: 'purchases', label: 'Compras', icon: '🛒' },
  { name: 'sales', label: 'Ventas', icon: '🏷️' },
];

const TABLE_ALIASES: Record<string, string[]> = {
  projects: ['proyectos', 'project', 'proyecto'],
  cobros_notes: ['cobros', 'cobro', 'notas_cobro', 'notacobro', 'nota_cobro', 'billing_notes', 'invoices'],
  receipts: ['boletas', 'boleta', 'receipt', 'recibos', 'recibo'],
  service_orders: ['ordenes', 'orden_servicio', 'orden', 'service_order', 'orders', 'ordenes_servicio', 'work_orders'],
  dte_documents: ['dte', 'dtes', 'documentos_dte', 'facturas', 'factura'],
  payment_notices: ['avisos', 'aviso_cobro', 'aviso', 'payment_notice', 'notices', 'payment_notices'],
  cash_categories: ['categorias', 'categories', 'cash_category', 'category'],
  cash_transactions: ['transacciones', 'transactions', 'cash_transaction', 'transaction'],
  purchases: ['compras', 'purchase', 'compra'],
  sales: ['ventas', 'sale', 'venta'],
};

export default function DatabaseImportExport() {
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; table?: string } | null>(null);

  // New state for enhanced features
  const [stats, setStats] = useState<TableStats[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>(ALL_TABLES.map(t => t.name));
  const [dateFilter, setDateFilter] = useState<{ enabled: boolean; from: string; to: string }>({
    enabled: false,
    from: '',
    to: ''
  });
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'insert' | 'upsert'>('insert');
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);

  // Load stats on mount
  useEffect(() => {
    loadStats();
    const lastExport = localStorage.getItem('lastDbExport');
    if (lastExport) setLastExportDate(lastExport);
  }, []);

  const loadStats = async () => {
    const results: TableStats[] = [];

    for (const table of ALL_TABLES) {
      try {
        const { count, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });

        results.push({
          name: table.name,
          count: error ? 0 : (count || 0),
          label: table.label,
          icon: table.icon
        });
      } catch {
        results.push({
          name: table.name,
          count: 0,
          label: table.label,
          icon: table.icon
        });
      }
    }

    setStats(results);
  };

  const toggleTable = (tableName: string) => {
    setSelectedTables(prev =>
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const selectAllTables = () => setSelectedTables(ALL_TABLES.map(t => t.name));
  const deselectAllTables = () => setSelectedTables([]);

  const getFilterQuery = (query: any) => {
    if (dateFilter.enabled && (dateFilter.from || dateFilter.to)) {
      if (dateFilter.from) query = query.gte('created_at', dateFilter.from);
      if (dateFilter.to) query = query.lte('created_at', dateFilter.to + 'T23:59:59');
    }
    return query;
  };

  // Export functions
  const exportJSON = async () => {
    if (selectedTables.length === 0) {
      setMessage({ type: 'warning', text: 'Selecciona al menos una tabla para exportar' });
      return;
    }

    setExportLoading(true);
    setMessage(null);

    try {
      const data: Record<string, unknown[]> = {};
      let exportedCount = 0;

      for (const tableName of selectedTables) {
        let query = supabase.from(tableName).select('*').order('created_at', { ascending: false });
        query = getFilterQuery(query);

        const { data: rows, error } = await query;

        if (error) {
          console.warn(`Error exporting ${tableName}:`, error.message);
          data[tableName] = [];
        } else {
          data[tableName] = rows || [];
          exportedCount += (rows?.length || 0);
        }
      }

      // Add metadata
      const exportData = {
        _metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          tables: selectedTables,
          totalRecords: exportedCount,
          dateFilter: dateFilter.enabled ? dateFilter : null
        },
        ...data
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bj_servicios_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      localStorage.setItem('lastDbExport', new Date().toISOString());
      setLastExportDate(new Date().toISOString());
      setMessage({ type: 'success', text: `Exportacion completada: ${exportedCount} registros de ${selectedTables.length} tablas` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al exportar: ${err.message}` });
    } finally {
      setExportLoading(false);
    }
  };

  const exportCSV = async () => {
    if (selectedTables.length === 0) {
      setMessage({ type: 'warning', text: 'Selecciona al menos una tabla para exportar' });
      return;
    }

    setExportLoading(true);
    setMessage(null);

    try {
      const allData: Record<string, unknown[]> = {};

      for (const tableName of selectedTables) {
        let query = supabase.from(tableName).select('*').order('created_at', { ascending: false });
        query = getFilterQuery(query);

        const { data: rows, error } = await query;

        if (!error && rows) {
          allData[tableName] = rows;
        }
      }

      // Create CSV with multiple sections
      const sections: string[] = [];
      let exportedCount = 0;

      for (const [table, rows] of Object.entries(allData)) {
        if (rows.length === 0) continue;

        sections.push(`\n# === ${table.toUpperCase()} ===`);
        const headers = Object.keys(rows[0] as Record<string, unknown>);
        sections.push(headers.join(','));

        for (const row of rows) {
          const cleanRow = { ...row } as Record<string, unknown>;
          delete cleanRow.id;
          delete cleanRow.user_id;
          const values = headers.map(h => {
            const val = (row as Record<string, unknown>)[h];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
              return `"${val.replace(/"/g, '""')}"`;
            }
            return String(val);
          });
          sections.push(values.join(','));
          exportedCount++;
        }
      }

      const blob = new Blob([sections.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bj_servicios_backup_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      localStorage.setItem('lastDbExport', new Date().toISOString());
      setLastExportDate(new Date().toISOString());
      setMessage({ type: 'success', text: `Exportacion CSV completada: ${exportedCount} registros` });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al exportar CSV: ${err.message}` });
    } finally {
      setExportLoading(false);
    }
  };

  // Import functions
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setImportLoading(true);
    setMessage(null);

    try {
      const userId = getCurrentUserId();
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'json') {
        await previewJSON(file, userId);
      } else if (ext === 'csv') {
        await previewCSV(file, userId);
      } else if (ext === 'db' || ext === 'sqlite' || ext === 'sqlite3') {
        await previewSQLite(file, userId);
      } else {
        setMessage({ type: 'error', text: 'Formato no soportado. Usa JSON, CSV o SQLite' });
        setPendingFile(null);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al leer archivo: ${err.message}` });
      setPendingFile(null);
    } finally {
      setImportLoading(false);
      e.target.value = '';
    }
  };

  const previewJSON = async (file: File, userId: string) => {
    const text = await file.text();
    let data = JSON.parse(text);

    // Extract metadata if present
    if (data._metadata) {
      const meta = data._metadata;
      setMessage({
        type: 'info',
        text: `Archivo exportado el ${new Date(meta.exportedAt).toLocaleString()} con ${meta.totalRecords || '?'} registros`
      });
      delete data._metadata;
    }

    // Handle flat arrays
    if (Array.isArray(data) && data.length > 0) {
      const firstRow = data[0];
      const detectedTable = detectTableFromFields(Object.keys(firstRow));
      if (detectedTable) {
        data = { [detectedTable]: data };
      }
    }

    const previews: PreviewData[] = [];

    for (const tableName of ALL_TABLES.map(t => t.name)) {
      const rows = data[tableName];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const mappedRows = rows
        .map((row: any) => mapRowToTable(tableName, row, userId))
        .filter(Boolean) as Record<string, unknown>[];

      const validation = validateRows(tableName, mappedRows);

      previews.push({
        table: tableName,
        rows: mappedRows.slice(0, 5), // Preview first 5 rows
        count: mappedRows.length,
        canImport: validation.valid,
        validationErrors: validation.errors
      });
    }

    setPreviewData(previews);
    setShowPreview(true);
  };

  const previewCSV = async (file: File, userId: string) => {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    const tableGroups: Record<string, any[]> = {};
    let currentTable: string | null = null;
    let headers: string[] | null = null;

    for (const line of lines) {
      // Try to detect table header
      const potentialTable = ALL_TABLES.find(t =>
        line.toLowerCase().includes(t.name.toLowerCase()) ||
        line.toLowerCase().includes(t.label.toLowerCase())
      );

      if (potentialTable) {
        currentTable = potentialTable.name;
        headers = null;
        continue;
      }

      if (!currentTable) continue;

      // Parse CSV line
      const values = parseCSVLine(line);

      if (!headers) {
        headers = values;
        continue;
      }

      if (values.length === headers.length) {
        const row: Record<string, any> = {};
        headers.forEach((h, i) => row[h] = values[i]);

        if (!tableGroups[currentTable]) tableGroups[currentTable] = [];
        tableGroups[currentTable].push(row);
      }
    }

    const previews: PreviewData[] = [];

    for (const [tableName, rows] of Object.entries(tableGroups)) {
      const mappedRows = rows
        .map((row: any) => mapRowToTable(tableName, row, userId))
        .filter(Boolean) as Record<string, unknown>[];

      const validation = validateRows(tableName, mappedRows);

      previews.push({
        table: tableName,
        rows: mappedRows.slice(0, 5),
        count: mappedRows.length,
        canImport: validation.valid,
        validationErrors: validation.errors
      });
    }

    setPreviewData(previews);
    setShowPreview(true);
  };

  const previewSQLite = async (file: File, userId: string) => {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs({
      locateFile: (f: string) => `https://sql.js.org/dist/${f}`
    });

    const buffer = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buffer));

    const tableNames = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const detectedTables = tableNames.length > 0 ? tableNames[0].values.map(v => v[0] as string) : [];

    const previews: PreviewData[] = [];

    for (const tableName of ALL_TABLES.map(t => t.name)) {
      const matchingTable = findMatchingTable(tableName, detectedTables);
      if (!matchingTable) continue;

      try {
        const stmt = db.prepare(`SELECT * FROM "${matchingTable}"`);
        const rows: any[] = [];

        while (stmt.step()) {
          const row = stmt.getAsObject();
          const mapped = mapRowToTable(tableName, row, userId);
          if (mapped) rows.push(mapped);
        }
        stmt.free();

        if (rows.length > 0) {
          const validation = validateRows(tableName, rows);

          previews.push({
            table: tableName,
            rows: rows.slice(0, 5),
            count: rows.length,
            canImport: validation.valid,
            validationErrors: validation.errors
          });
        }
      } catch (err: any) {
        previews.push({
          table: tableName,
          rows: [],
          count: 0,
          canImport: false,
          validationErrors: [err.message]
        });
      }
    }

    db.close();
    setPreviewData(previews);
    setShowPreview(true);
  };

  const confirmImport = async () => {
    if (!previewData || previewData.length === 0) return;

    setShowPreview(false);
    setImportLoading(true);
    setImportResults([]);
    setMessage(null);

    try {
      const userId = getCurrentUserId();
      const results: ImportResult[] = [];

      // Re-read file for actual import
      if (!pendingFile) return;

      const ext = pendingFile.name.split('.').pop()?.toLowerCase();
      let allRows: Record<string, any[]> = {};

      if (ext === 'json') {
        const text = await pendingFile.text();
        let data = JSON.parse(text);
        if (data._metadata) delete data._metadata;

        if (Array.isArray(data) && data.length > 0) {
          const detectedTable = detectTableFromFields(Object.keys(data[0]));
          if (detectedTable) data = { [detectedTable]: data };
        }

        for (const tableName of ALL_TABLES.map(t => t.name)) {
          if (data[tableName]) {
            allRows[tableName] = data[tableName].map((row: any) =>
              mapRowToTable(tableName, row, userId)
            ).filter(Boolean);
          }
        }
      } else if (ext === 'csv') {
        allRows = await parseCSVForImport(pendingFile, userId);
      } else if (ext === 'db' || ext === 'sqlite' || ext === 'sqlite3') {
        allRows = await parseSQLiteForImport(pendingFile, userId);
      }

      for (const preview of previewData) {
        if (!preview.canImport || preview.count === 0) continue;

        const rows = allRows[preview.table] || [];
        const batchResult = await insertBatch(preview.table, rows);
        results.push({ table: preview.table, ...batchResult });
      }

      setImportResults(results);
      const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
      const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

      if (totalImported === 0 && totalSkipped > 0) {
        setMessage({ type: 'warning', text: `Importacion completada pero todos los registros fueron omitidos (${totalSkipped})` });
      } else {
        setMessage({ type: 'success', text: `Importacion completada: ${totalImported} importados, ${totalSkipped} omitidos` });
      }

      loadStats(); // Refresh stats
    } catch (err: any) {
      setMessage({ type: 'error', text: `Error al importar: ${err.message}` });
    } finally {
      setImportLoading(false);
      setPendingFile(null);
      setProgress(null);
    }
  };

  const insertBatch = async (table: string, rows: any[], batchSize = 50): Promise<{ imported: number; skipped: number; errors: string[] }> => {
    const result = { imported: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      setProgress({ current: Math.min(i + batchSize, rows.length), total: rows.length, table });

      try {
        const { error } = await supabase.from(table).insert(batch);
        if (error) {
          // Try one by one
          for (const row of batch) {
            const { error: singleError } = await supabase.from(table).insert([row]);
            if (singleError) {
              if (singleError.code === '23505') {
                result.skipped++;
              } else {
                result.errors.push(singleError.message);
                result.skipped++;
              }
            } else {
              result.imported++;
            }
          }
        } else {
          result.imported += batch.length;
        }
      } catch (err: any) {
        result.errors.push(err.message || 'Error en lote');
        result.skipped += batch.length;
      }
    }

    return result;
  };

  const parseCSVForImport = async (file: File, userId: string): Promise<Record<string, any[]>> => {
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));

    const tableGroups: Record<string, any[]> = {};
    let currentTable: string | null = null;
    let headers: string[] | null = null;

    for (const line of lines) {
      const potentialTable = ALL_TABLES.find(t =>
        line.toLowerCase().includes(t.name.toLowerCase())
      );

      if (potentialTable) {
        currentTable = potentialTable.name;
        headers = null;
        continue;
      }

      if (!currentTable) continue;

      const values = parseCSVLine(line);

      if (!headers) {
        headers = values;
        continue;
      }

      if (values.length === headers.length) {
        const row: Record<string, any> = {};
        headers.forEach((h, i) => row[h] = values[i]);

        if (!tableGroups[currentTable]) tableGroups[currentTable] = [];
        tableGroups[currentTable].push(mapRowToTable(currentTable, row, userId));
      }
    }

    return tableGroups;
  };

  const parseSQLiteForImport = async (file: File, userId: string): Promise<Record<string, any[]>> => {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs({ locateFile: (f: string) => `https://sql.js.org/dist/${f}` });

    const buffer = await file.arrayBuffer();
    const db = new SQL.Database(new Uint8Array(buffer));

    const tableNames = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const detectedTables = tableNames.length > 0 ? tableNames[0].values.map(v => v[0] as string) : [];

    const result: Record<string, any[]> = {};

    for (const tableName of ALL_TABLES.map(t => t.name)) {
      const matchingTable = findMatchingTable(tableName, detectedTables);
      if (!matchingTable) continue;

      const stmt = db.prepare(`SELECT * FROM "${matchingTable}"`);
      const rows: any[] = [];

      while (stmt.step()) {
        const row = stmt.getAsObject();
        const mapped = mapRowToTable(tableName, row, userId);
        if (mapped) rows.push(mapped);
      }
      stmt.free();

      if (rows.length > 0) result[tableName] = rows;
    }

    db.close();
    return result;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  // Validation
  const validateRows = (table: string, rows: Record<string, unknown>[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (rows.length === 0) {
      return { valid: false, errors: ['No hay filas para importar'] };
    }

    // Table-specific validation
    const requiredFields: Record<string, string[]> = {
      projects: ['name'],
      cobros_notes: ['cliente', 'servicio_titulo'],
      receipts: ['client_name'],
      service_orders: ['client_name', 'service_type'],
      dte_documents: ['folio', 'company_rut', 'recipient_rut'],
      cash_transactions: ['type', 'amount', 'category_id'],
      purchases: ['supplier_name', 'total'],
      sales: ['client_name', 'total'],
    };

    const required = requiredFields[table] || [];
    const missing = required.filter(f => !rows[0]?.[f]);

    if (missing.length > 0) {
      errors.push(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  };

  // Detection and mapping functions (kept from original)
  const detectTableFromFields = (fields: string[]): string | null => {
    const fieldsLower = fields.map(f => f.toLowerCase());

    if (fieldsLower.includes('folio') && fieldsLower.includes('cliente') && fieldsLower.includes('servicio_titulo')) {
      return 'cobros_notes';
    }

    if ((fieldsLower.includes('receipt_number') || fieldsLower.includes('numero')) && fieldsLower.includes('client_name')) {
      return 'receipts';
    }

    if ((fieldsLower.includes('order_number') || fieldsLower.includes('numero')) && fieldsLower.includes('device_type')) {
      return 'service_orders';
    }

    if (fieldsLower.includes('name') || fieldsLower.includes('nombre')) {
      if (fieldsLower.includes('description') || fieldsLower.includes('descripcion')) {
        return 'projects';
      }
    }

    if (fieldsLower.includes('folio') && fieldsLower.includes('company_rut')) {
      return 'dte_documents';
    }

    if (fieldsLower.includes('folio') && fieldsLower.includes('cliente')) {
      return 'payment_notices';
    }

    if (fieldsLower.includes('type') && fieldsLower.includes('amount') && fieldsLower.includes('category_id')) {
      return 'cash_transactions';
    }

    if (fieldsLower.includes('supplier_name') && fieldsLower.includes('total')) {
      return 'purchases';
    }

    if (fieldsLower.includes('client_name') && fieldsLower.includes('total') && !fieldsLower.includes('device_type')) {
      return 'sales';
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

    const aliases = TABLE_ALIASES[targetTable] || [];
    for (const alias of aliases) {
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
        mapped.iva = toNumber(r.iva || r.tax || 0);
        mapped.total = toNumber(r.total || r.monto || 0);
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
        mapped.tax_rate = toNumber(r.tax_rate || 19);
        mapped.total_discount = toNumber(r.total_discount || 0);
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
        mapped.company_name = r.company_name || r.razon_social || r.empresa || 'BJ SERVICIOS INFORMATICOS SpA';
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

      case 'cash_categories': {
        mapped.name = r.name || r.nombre || r.category_name || 'Sin nombre';
        mapped.type = r.type || r.tipo || 'income';
        mapped.description = r.description || r.descripcion || null;
        mapped.active = r.active !== false && r.activo !== false;
        return mapped;
      }

      case 'cash_transactions': {
        mapped.type = r.type || r.tipo || 'entry';
        mapped.category_id = r.category_id || r.categoria_id || null;
        mapped.amount = toNumber(r.amount || r.monto || 0);
        mapped.description = r.description || r.descripcion || null;
        mapped.reference_type = r.reference_type || r.tipo_referencia || 'manual';
        mapped.reference_id = r.reference_id || null;
        mapped.payment_method = r.payment_method || r.metodo_pago || 'cash';
        mapped.document_number = r.document_number || r.numero_documento || null;
        mapped.contact_name = r.contact_name || r.nombre_contacto || null;
        mapped.contact_rut = r.contact_rut || r.rut_contacto || null;
        mapped.date = r.date || r.fecha || new Date().toISOString().split('T')[0];
        return mapped;
      }

      case 'purchases': {
        mapped.document_number = r.document_number || r.numero || `COMP-IMP-${Date.now()}`;
        mapped.supplier_name = r.supplier_name || r.proveedor || r.supplier || 'Sin proveedor';
        mapped.supplier_rut = r.supplier_rut || r.rut_proveedor || null;
        mapped.description = r.description || r.descripcion || null;
        mapped.items = toArray(r.items || []);
        mapped.subtotal = toNumber(r.subtotal || r.neto || 0);
        mapped.tax = toNumber(r.tax || r.iva || 0);
        mapped.total = toNumber(r.total || r.monto || 0);
        mapped.payment_method = r.payment_method || r.metodo_pago || 'cash';
        mapped.status = r.status || r.estado || 'paid';
        mapped.date = r.date || r.fecha || new Date().toISOString().split('T')[0];
        return mapped;
      }

      case 'sales': {
        mapped.document_number = r.document_number || r.numero || `VENTA-IMP-${Date.now()}`;
        mapped.client_name = r.client_name || r.cliente || r.client || 'Sin cliente';
        mapped.client_rut = r.client_rut || r.rut_cliente || null;
        mapped.description = r.description || r.descripcion || null;
        mapped.items = toArray(r.items || []);
        mapped.subtotal = toNumber(r.subtotal || r.neto || 0);
        mapped.tax = toNumber(r.tax || r.iva || 0);
        mapped.total = toNumber(r.total || r.monto || 0);
        mapped.payment_method = r.payment_method || r.metodo_pago || 'cash';
        mapped.status = r.status || r.estado || 'paid';
        mapped.date = r.date || r.fecha || new Date().toISOString().split('T')[0];
        return mapped;
      }

      default:
        return null;
    }
  };

  // Clear file input
  const clearPendingFile = () => {
    setPendingFile(null);
    setPreviewData(null);
    setShowPreview(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-system">Importar / Exportar Base de Datos</h2>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Stats Overview */}
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-neutral-500" />
          <h3 className="text-lg font-semibold">Resumen de Base de Datos</h3>
          {lastExportDate && (
            <span className="text-xs text-neutral-500 ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Ult. exportacion: {new Date(lastExportDate).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
          {stats.map(stat => (
            <div key={stat.name} className="text-center p-2 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <div className="text-lg">{stat.icon}</div>
              <div className="text-xs text-neutral-500 truncate">{stat.label}</div>
              <div className="text-lg font-bold text-system">{stat.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Exportar Datos</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTableSelector(!showTableSelector)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition ${
                showTableSelector
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <Table2 className="w-4 h-4" />
              Tablas ({selectedTables.length})
              {showTableSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition ${
                dateFilter.enabled
                  ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
          </div>
        </div>

        {/* Table Selector */}
        {showTableSelector && (
          <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">Seleccionar tablas:</span>
              <div className="flex gap-2">
                <button onClick={selectAllTables} className="text-xs text-blue-600 hover:underline">Todas</button>
                <span className="text-neutral-400">|</span>
                <button onClick={deselectAllTables} className="text-xs text-neutral-500 hover:underline">Ninguna</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {ALL_TABLES.map(table => (
                <label
                  key={table.name}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition ${
                    selectedTables.includes(table.name)
                      ? 'bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500'
                      : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table.name)}
                    onChange={() => toggleTable(table.name)}
                    className="sr-only"
                  />
                  <span className="text-lg">{table.icon}</span>
                  <span className="text-sm truncate">{table.label}</span>
                  {selectedTables.includes(table.name) && <Check className="w-4 h-4 text-blue-500 ml-auto" />}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Date Filter */}
        {showDateFilter && (
          <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={dateFilter.enabled}
                  onChange={e => setDateFilter(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Filtrar por fecha de creacion</span>
              </label>
            </div>
            {dateFilter.enabled && (
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neutral-500" />
                  <label className="text-sm text-neutral-600 dark:text-neutral-400">Desde:</label>
                  <input
                    type="date"
                    value={dateFilter.from}
                    onChange={e => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    className="px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-neutral-600 dark:text-neutral-400">Hasta:</label>
                  <input
                    type="date"
                    value={dateFilter.to}
                    onChange={e => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    className="px-2 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportJSON}
            disabled={exportLoading || selectedTables.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            Exportar JSON
          </button>
          <button
            onClick={exportCSV}
            disabled={exportLoading || selectedTables.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold">Importar Datos</h3>
        </div>

        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          Importa datos desde un archivo JSON, CSV o SQLite. El sistema detecta automaticamente el formato y mapea los campos.
        </p>

        {/* File format info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-1">
              <FileJson className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">JSON</span>
            </div>
            <p className="text-xs text-neutral-500">Estructura con claves por tabla. Incluye metadatos.</p>
          </div>
          <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <span className="font-medium text-sm">CSV</span>
            </div>
            <p className="text-xs text-neutral-500">Formato hoja de calculo. Compatible con Excel.</p>
          </div>
          <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-yellow-400" />
              <span className="font-medium text-sm">SQLite</span>
            </div>
            <p className="text-xs text-neutral-500">Base de datos .db, .sqlite, .sqlite3</p>
          </div>
        </div>

        {/* Import mode selector */}
        <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <span className="text-sm font-medium mb-2 block">Modo de importacion:</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="insert"
                checked={importMode === 'insert'}
                onChange={() => setImportMode('insert')}
              />
              <span className="text-sm">Insertar (omite duplicados)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="upsert"
                checked={importMode === 'upsert'}
                onChange={() => setImportMode('upsert')}
                disabled
              />
              <span className="text-sm text-neutral-400">Actualizar existentes (proximamente)</span>
            </label>
          </div>
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>{progress.table ? `Importando ${progress.table}` : 'Procesando...'}</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* File upload area */}
        <label className={`flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer transition ${
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
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">Analizando archivo...</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300 font-medium">Arrastra o haz clic para seleccionar archivo</span>
              <span className="text-xs text-neutral-500">JSON, CSV o SQLite</span>
            </>
          )}
        </label>

        {/* Pending file display */}
        {pendingFile && !showPreview && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-yellow-600" />
              <span className="text-sm">{pendingFile.name} ({(pendingFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button onClick={clearPendingFile} className="text-neutral-500 hover:text-red-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vista Previa de Importacion</h3>
              <button onClick={clearPendingFile} className="text-neutral-500 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {previewData.map((preview, i) => (
                <div key={i} className={`p-4 rounded-lg border ${
                  preview.canImport
                    ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10'
                    : 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ALL_TABLES.find(t => t.name === preview.table)?.icon}</span>
                      <span className="font-medium">{ALL_TABLES.find(t => t.name === preview.table)?.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${preview.canImport ? 'text-green-600' : 'text-red-600'}`}>
                        {preview.count} registros
                      </span>
                      {preview.canImport ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>

                  {preview.validationErrors.length > 0 && (
                    <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                      {preview.validationErrors.map((err, j) => (
                        <div key={j}>{err}</div>
                      ))}
                    </div>
                  )}

                  {preview.rows.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-neutral-500 hover:text-neutral-700">
                        Ver primeros 5 registros
                      </summary>
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-700">
                              {Object.keys(preview.rows[0]).slice(0, 6).map(key => (
                                <th key={key} className="px-2 py-1 text-left font-medium">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {preview.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-neutral-100 dark:border-neutral-800">
                                {Object.values(row).slice(0, 6).map((val, vi) => (
                                  <td key={vi} className="px-2 py-1 truncate max-w-[150px]">
                                    {val === null ? <span className="text-neutral-400">null</span> :
                                      typeof val === 'object' ? JSON.stringify(val).slice(0, 30) + '...' :
                                      String(val).slice(0, 30)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3">
              <button
                onClick={clearPendingFile}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={confirmImport}
                disabled={!previewData.some(p => p.canImport)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Importar {previewData.filter(p => p.canImport).reduce((sum, p) => sum + p.count, 0)} registros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-green-500/20 border border-emerald-200 dark:border-green-500 text-emerald-700 dark:text-green-300'
            : message.type === 'info'
            ? 'bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500 text-blue-700 dark:text-blue-300'
            : message.type === 'warning'
            ? 'bg-yellow-50 dark:bg-yellow-500/20 border border-yellow-200 dark:border-yellow-500 text-yellow-700 dark:text-yellow-300'
            : 'bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500 text-red-700 dark:text-red-300'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
           : message.type === 'warning' ? <AlertTriangle className="w-5 h-5 flex-shrink-0" />
           : message.type === 'info' ? <Info className="w-5 h-5 flex-shrink-0" />
           : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Import Results */}
      {importResults.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold mb-4">Resultado de la Importacion</h3>
          <div className="space-y-3">
            {importResults.map((result, i) => (
              <div key={i} className={`p-4 rounded-lg border ${
                result.imported > 0
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                  : result.errors.some(e => e.includes('row-level security') || e.includes('violates'))
                  ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                  : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{ALL_TABLES.find(t => t.name === result.table)?.label || result.table}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 dark:text-green-400 font-bold">{result.imported} importados</span>
                    <span className="text-yellow-600 dark:text-yellow-400">{result.skipped} omitidos</span>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.errors.slice(0, 3).map((err, j) => (
                      <p key={j} className="text-red-600 dark:text-red-400 text-xs">{err}</p>
                    ))}
                    {result.errors.length > 3 && (
                      <p className="text-red-600 dark:text-red-400 text-xs">...y {result.errors.length - 3} errores mas</p>
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
