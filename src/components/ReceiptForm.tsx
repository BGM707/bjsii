import { useState, useEffect } from 'react';
import { Save, ArrowLeft, Plus, Trash2, CreditCard as Edit2, Eye, Loader, AlertCircle, Search, FileText, Printer, Download, MessageCircle, Receipt } from 'lucide-react';
import { supabase, Receipt as ReceiptType, Project, CobrosNote, getAuthUserId } from '../lib/supabase';
import { generateInvoicePDF } from '../lib/pdf';
import { CobroPrefill } from '../types/cobro';

type ViewMode = 'list' | 'editor' | 'preview';

interface ReceiptItemData {
  description: string;
  quantity: number;
  price: number;
  total: number;
  discount_type?: string;
  discount_value?: number;
  discount_amount?: number;
  final_total?: number;
}

const siiStatusLabels: Record<string, string> = {
  pending: 'Pendiente SII',
  registered: 'Registrado',
  rejected: 'Rechazado',
};

const siiStatusColors: Record<string, string> = {
  pending: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
  registered: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  rejected: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400',
};

const emptyItem: ReceiptItemData = {
  description: '', quantity: 1, price: 0, total: 0,
  discount_type: 'none', discount_value: 0, discount_amount: 0, final_total: 0,
};

const emptyForm = {
  client_name: '', client_email: '', client_phone: '', client_address: '',
  tax_rate: 19, items: [{ ...emptyItem }] as ReceiptItemData[],
  project_id: '', cobro_id: '',
};

function calcItemTotals(item: ReceiptItemData): ReceiptItemData {
  const subtotal = item.quantity * item.price;
  let discountAmount = 0;
  if (item.discount_type === 'percentage') discountAmount = (subtotal * (item.discount_value || 0)) / 100;
  else if (item.discount_type === 'fixed') discountAmount = item.discount_value || 0;
  return { ...item, total: subtotal, discount_amount: discountAmount, final_total: subtotal - discountAmount };
}

function calcTotals(items: ReceiptItemData[], taxRate: number) {
  const subtotal = items.reduce((sum, i) => sum + (i.final_total || i.total), 0);
  const totalDiscount = items.reduce((sum, i) => sum + (i.discount_amount || 0), 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;
  return { subtotal, total_discount: totalDiscount, tax, total };
}

interface ReceiptFormProps {
  onGenerateCobro?: (prefill: CobroPrefill) => void;
}

export default function ReceiptForm({ onGenerateCobro }: ReceiptFormProps) {
  const [receipts, setReceipts] = useState<ReceiptType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cobrosNotes, setCobrosNotes] = useState<CobrosNote[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingReceipt, setEditingReceipt] = useState<ReceiptType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSiiStatus, setFilterSiiStatus] = useState<string>('all');
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => { loadReceipts(); loadOptions(); }, []);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('receipts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setReceipts((data as ReceiptType[]) || []);
    } catch (err) { console.error('Error loading receipts:', err); }
    finally { setLoading(false); }
  };

  const loadOptions = async () => {
    const { data: p } = await supabase.from('projects').select('*').order('name');
    setProjects(p || []);
    const { data: c } = await supabase.from('cobros_notes').select('*').order('created_at', { ascending: false });
    setCobrosNotes(c || []);
  };

  const set = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(''); setSuccess('');
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index] = calcItemTotals(newItems[index]);
    set('items', newItems);
  };

  const addItem = () => { set('items', [...form.items, { ...emptyItem }]); };
  const removeItem = (index: number) => {
    if (form.items.length > 1) set('items', form.items.filter((_, i) => i !== index));
  };

  const openNew = () => {
    setEditingReceipt(null); setForm(emptyForm); setError(''); setSuccess('');
    setViewMode('editor');
  };

  const openEditor = (receipt: ReceiptType) => {
    setEditingReceipt(receipt);
    const items = (receipt.items || []).map((item: any) => ({
      description: item.description || '', quantity: item.quantity || 1, price: item.price || 0,
      total: item.total || 0, discount_type: item.discount_type || 'none',
      discount_value: item.discount_value || 0, discount_amount: item.discount_amount || 0,
      final_total: item.final_total || item.total || 0,
    }));
    setForm({
      client_name: receipt.client_name || '', client_email: receipt.client_email || '',
      client_phone: receipt.client_phone || '', client_address: receipt.client_address || '',
      tax_rate: 19, items: items.length > 0 ? items : [{ ...emptyItem }],
      project_id: receipt.project_id || '', cobro_id: receipt.cobro_id || '',
    });
    setError(''); setSuccess(''); setViewMode('editor');
  };

  const openPreview = (receipt: ReceiptType) => { setEditingReceipt(receipt); setViewMode('preview'); };

  const handleSave = async () => {
    if (!form.client_name.trim()) { setError('El nombre del cliente es requerido.'); return; }
    const validItems = form.items.filter((i) => i.description.trim() !== '');
    if (validItems.length === 0) { setError('Debe agregar al menos un item.'); return; }
    setError(''); setSaving(true);

    try {
      const totals = calcTotals(validItems, form.tax_rate);
      const userId = await getAuthUserId();
      const payload = {
        client_name: form.client_name, client_email: form.client_email || null,
        client_phone: form.client_phone || null, client_address: form.client_address || null,
        items: validItems, subtotal: totals.subtotal, tax: totals.tax, total: totals.total,
        project_id: form.project_id || null, cobro_id: form.cobro_id || null, user_id: userId,
      };

      if (editingReceipt?.id) {
        const { error } = await supabase.from('receipts').update(payload).eq('id', editingReceipt.id);
        if (error) throw error;
      } else {
        const receiptNumber = `BOL-${Date.now().toString().slice(-6)}`;
        const { error } = await supabase.from('receipts').insert([{ ...payload, receipt_number: receiptNumber }]);
        if (error) throw error;
      }

      setSuccess('Boleta guardada correctamente.');
      await loadReceipts();
      setTimeout(() => setViewMode('list'), 800);
    } catch (err: any) { setError(err.message || 'Error al guardar la boleta.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta boleta?')) return;
    try {
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) throw error;
      loadReceipts();
    } catch (err) { console.error('Error deleting receipt:', err); }
  };

  const handlePrintPDF = async () => {
    setGeneratingPDF(true);
    try {
      const blob = await generateInvoicePDF('receipt-print-area', `BOL-${editingReceipt?.receipt_number || 'NUEVA'}.pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `BOL-${editingReceipt?.receipt_number || 'NUEVA'}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { console.error('Error generating PDF:', e); }
    finally { setGeneratingPDF(false); }
  };

  const handlePrint = () => { window.print(); };

  const handleWhatsApp = async () => {
    setGeneratingPDF(true);
    try {
      const tel = (editingReceipt?.client_phone || '').replace('+', '').replace(/\s/g, '');
      if (!tel) { setGeneratingPDF(false); return; }
      const msg = encodeURIComponent(`Hola ${editingReceipt?.client_name || ''}! Te envio la boleta ${editingReceipt?.receipt_number || ''}. Total: $${Number(editingReceipt?.total || 0).toLocaleString('es-CL')}. Saludos!`);
      try {
        const blob = await generateInvoicePDF('receipt-print-area', `BOL-${editingReceipt?.receipt_number || 'NUEVA'}.pdf`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `BOL-${editingReceipt?.receipt_number || 'NUEVA'}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        setTimeout(() => { window.open(`https://wa.me/${tel}?text=${msg}`, '_blank'); }, 300);
      } catch { window.open(`https://wa.me/${tel}?text=${msg}`, '_blank'); }
    } finally { setGeneratingPDF(false); }
  };

  const filteredReceipts = receipts.filter((r) => {
    const matchesSearch = !searchTerm || r.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || r.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const siiStatus = (r as any).sii_status || 'pending';
    const matchesStatus = filterSiiStatus === 'all' || siiStatus === filterSiiStatus;
    return matchesSearch && matchesStatus;
  });

  const totals = calcTotals(form.items, form.tax_rate);

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="section-header">
          <div>
            <h1 className="section-title">Boletas</h1>
            <p className="section-subtitle">Emite y gestiona tus boletas electronicas</p>
          </div>
          <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" />Nueva Boleta</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Boletas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{receipts.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Monto Total</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ${receipts.reduce((s, r) => s + (Number(r.total) || 0), 0).toLocaleString('es-CL')}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Pendientes SII</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {receipts.filter((r) => (r as any).sii_status === 'pending' || !(r as any).sii_status).length}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Registradas SII</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {receipts.filter((r) => (r as any).sii_status === 'registered').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input type="text" placeholder="Buscar por cliente o numero..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['all', 'pending', 'registered', 'rejected'].map((f) => (
              <button key={f} onClick={() => setFilterSiiStatus(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterSiiStatus === f ? 'bg-blue-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                }`}>
                {f === 'all' ? 'Todos' : siiStatusLabels[f] || f}
              </button>
            ))}
          </div>
        </div>

        {/* Receipts List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-blue-500 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReceipts.map((receipt) => {
              const siiStatus = (receipt as any).sii_status || 'pending';
              return (
                <div key={receipt.id} className="card-hover overflow-hidden">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{receipt.receipt_number}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{receipt.client_name}</p>
                      </div>
                      <span className={`badge ${siiStatusColors[siiStatus] || 'bg-neutral-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300'}`}>
                        {siiStatusLabels[siiStatus] || siiStatus}
                      </span>
                    </div>

                    {receipt.client_email && <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{receipt.client_email}</p>}
                    {receipt.project_id && projects.find((p) => p.id === receipt.project_id) && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">Proyecto: {projects.find((p) => p.id === receipt.project_id)?.name}</p>
                    )}

                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400 dark:text-gray-500 text-xs">Total</span>
                        <span className="font-bold text-gray-900 dark:text-gray-100">${Number(receipt.total || 0).toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400 dark:text-gray-500">Neto: ${Number(receipt.subtotal || 0).toLocaleString('es-CL')}</span>
                        <span className="text-gray-400 dark:text-gray-500">IVA: ${Number(receipt.tax || 0).toLocaleString('es-CL')}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button onClick={() => openPreview(receipt)} className="btn-ghost flex-1 text-xs py-1.5"><Eye className="w-3.5 h-3.5" />Ver</button>
                      <button onClick={() => openEditor(receipt)} className="btn-primary flex-1 text-xs py-1.5"><Edit2 className="w-3.5 h-3.5" />Editar</button>
                      <button onClick={() => handleDelete(receipt.id!)} className="btn text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex-1 text-xs py-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredReceipts.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText className="w-6 h-6 text-gray-400 dark:text-gray-500" /></div>
            <p className="empty-state-title">No se encontraron boletas</p>
            <p className="empty-state-desc">Crea una nueva boleta o ajusta los filtros</p>
          </div>
        )}
      </div>
    );
  }

  // EDITOR VIEW
  if (viewMode === 'editor') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingReceipt ? `Editando ${editingReceipt.receipt_number}` : 'Nueva Boleta'}
              </h2>
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          {error && <div className="error-banner mb-4"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          {success && <div className="success-banner mb-4">{success}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Cliente */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Cliente</h4>
              <div>
                <label className="form-label">Nombre *</label>
                <input type="text" placeholder="Nombre del cliente" value={form.client_name}
                  onChange={(e) => set('client_name', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input type="email" placeholder="correo@ejemplo.cl" value={form.client_email}
                  onChange={(e) => set('client_email', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Telefono</label>
                <input type="tel" placeholder="+56 9 XXXX XXXX" value={form.client_phone}
                  onChange={(e) => set('client_phone', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Direccion</label>
                <input type="text" placeholder="Direccion del cliente" value={form.client_address}
                  onChange={(e) => set('client_address', e.target.value)} className="form-input" />
              </div>
            </div>

            {/* Relaciones */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Relaciones</h4>
              <div>
                <label className="form-label">Proyecto Asociado</label>
                <select value={form.project_id || ''} onChange={(e) => set('project_id', e.target.value)} className="form-input">
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div>
                <label className="form-label">Nota de Cobro Asociada</label>
                <select value={form.cobro_id || ''} onChange={(e) => set('cobro_id', e.target.value)} className="form-input">
                  <option value="">Sin nota de cobro</option>
                  {cobrosNotes.map((c) => (<option key={c.id} value={c.id}>#{c.folio} - {c.cliente}</option>))}
                </select>
              </div>
              <div>
                <label className="form-label">IVA (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={form.tax_rate}
                  onChange={(e) => set('tax_rate', parseFloat(e.target.value) || 0)} className="form-input" />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Productos / Servicios</h4>
              <button type="button" onClick={addItem} className="btn-secondary text-xs"><Plus className="w-3.5 h-3.5" />Agregar Item</button>
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div key={index} className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="form-label">Descripcion *</label>
                      <input type="text" placeholder="Descripcion del item" value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)} className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">Cantidad</label>
                      <input type="number" min="1" value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} className="form-input" />
                    </div>
                    <div>
                      <label className="form-label">Precio Unitario</label>
                      <input type="number" min="0" step="0.01" value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)} className="form-input" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="form-label">Tipo Descuento</label>
                      <select value={item.discount_type || 'none'}
                        onChange={(e) => updateItem(index, 'discount_type', e.target.value)} className="form-input">
                        <option value="none">Sin Descuento</option>
                        <option value="percentage">Porcentaje (%)</option>
                        <option value="fixed">Monto Fijo ($)</option>
                      </select>
                    </div>
                    {item.discount_type !== 'none' && (
                      <div>
                        <label className="form-label">Valor Descuento</label>
                        <input type="number" min="0"
                          step={item.discount_type === 'percentage' ? '1' : '0.01'}
                          max={item.discount_type === 'percentage' ? '100' : undefined}
                          value={item.discount_value || 0}
                          onChange={(e) => updateItem(index, 'discount_value', parseFloat(e.target.value) || 0)} className="form-input" />
                      </div>
                    )}
                    {form.items.length > 1 && (
                      <div className="flex items-end">
                        <button type="button" onClick={() => removeItem(index)}
                          className="btn text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 text-xs w-full"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <span>Subtotal: <span className="font-semibold text-gray-700 dark:text-gray-300">${item.total.toFixed(2)}</span></span>
                    {(item.discount_amount || 0) > 0 && (
                      <span>Descuento: <span className="font-semibold text-red-600 dark:text-red-400">-${(item.discount_amount || 0).toFixed(2)}</span></span>
                    )}
                    <span>Total: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${(item.final_total || item.total).toFixed(2)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="mt-6 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Subtotal:</span><span className="font-semibold">${totals.subtotal.toFixed(2)}</span></div>
              {totals.total_discount > 0 && (
                <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Descuentos:</span><span className="font-semibold text-red-600 dark:text-red-400">-${totals.total_discount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">IVA ({form.tax_rate}%):</span><span className="font-semibold">${totals.tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-lg border-t border-neutral-200 dark:border-neutral-800 pt-2">
                <span className="font-bold">TOTAL:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREVIEW VIEW
  const r = editingReceipt;
  if (!r) { setViewMode('list'); return null; }

  const receiptItems = (r.items || []) as ReceiptItemData[];

  return (
    <div>
      <div className="card p-4 mb-6 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode('list')} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{r.receipt_number}</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handlePrint} className="btn-secondary text-xs"><Printer size={14} />Imprimir</button>
          <button onClick={handlePrintPDF} disabled={generatingPDF} className="btn-primary text-xs disabled:opacity-50">
            {generatingPDF ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}PDF
          </button>
          {r.client_phone && (
            <button onClick={handleWhatsApp} disabled={generatingPDF} className="btn-success text-xs disabled:opacity-50">
              <MessageCircle size={14} />WhatsApp
            </button>
          )}
          <button onClick={() => openEditor(r)} className="btn-primary text-xs"><Edit2 size={14} />Editar</button>
          {onGenerateCobro && (
            <button onClick={() => onGenerateCobro({
              cliente: r.client_name || '',
              telefono: r.client_phone || '',
              servicio_titulo: 'Boleta ' + (r.receipt_number || ''),
              servicio_desc: (r.items || []).map((i: any) => i.description).filter(Boolean).join(', ') || '',
              neto: r.subtotal || 0,
              proyecto_id: r.project_id || undefined,
            })} className="btn-secondary text-xs"><Receipt size={14} />Nota de Cobro</button>
          )}
          <button onClick={() => handleDelete(r.id!)} className="btn-danger text-xs"><Trash2 size={14} />Eliminar</button>
        </div>
      </div>

      <div id="receipt-print-area" className="max-w-[210mm] mx-auto bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 p-8 md:p-12 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
        <div className="text-center mb-8 pb-4 border-b-2 border-blue-600">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">BJ SERVICIOS INFORMATICOS SpA</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">RUT: 78.332.298-6 | Servicios de Reparacion, Venta, Instalacion</p>
        </div>

        <div className="text-center bg-neutral-50 dark:bg-neutral-800 py-3 mb-6 rounded-lg">
          <p className="font-bold text-lg text-gray-900 dark:text-gray-100">BOLETA: {r.receipt_number}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Cliente</h4>
            <p className="font-medium text-gray-900 dark:text-gray-100">{r.client_name}</p>
            {r.client_email && <p className="text-sm text-gray-500 dark:text-gray-400">{r.client_email}</p>}
            {r.client_phone && <p className="text-sm text-gray-500 dark:text-gray-400">{r.client_phone}</p>}
            {r.client_address && <p className="text-sm text-gray-500 dark:text-gray-400">{r.client_address}</p>}
          </div>
          <div>
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Informacion</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">Fecha: <span className="font-semibold">{new Date(r.created_at || '').toLocaleDateString('es-CL')}</span></p>
            {(r as any).sii_folio && <p className="text-sm text-gray-600 dark:text-gray-300">Folio SII: <span className="font-semibold">{(r as any).sii_folio}</span></p>}
            {r.project_id && projects.find((p) => p.id === r.project_id) && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Proyecto: <span className="font-semibold text-blue-600 dark:text-blue-400">{projects.find((p) => p.id === r.project_id)?.name}</span></p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Detalle</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-blue-600">
                <th className="text-left py-2 font-semibold">Descripcion</th>
                <th className="text-center py-2 font-semibold w-16">Cant</th>
                <th className="text-right py-2 font-semibold w-24">Precio</th>
                <th className="text-right py-2 font-semibold w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {receiptItems.map((item, i) => (
                <tr key={i} className="border-b border-neutral-200 dark:border-neutral-700">
                  <td className="py-2">
                    {item.description}
                    {(item.discount_amount || 0) > 0 && (
                      <span className="text-red-500 dark:text-red-400 text-xs ml-2">(Desc: -${(item.discount_amount || 0).toFixed(2)})</span>
                    )}
                  </td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">${Number(item.price).toFixed(2)}</td>
                  <td className="text-right py-2 font-semibold">${(item.final_total || item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Subtotal:</span><span className="font-semibold">${Number(r.subtotal || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">IVA (19%):</span><span className="font-semibold">${Number(r.tax || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-lg border-t-2 border-blue-600 pt-2">
              <span className="font-bold">TOTAL:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">${Number(r.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-gray-400 dark:text-gray-500">
          <p>BJ Servicios Informaticos SpA - +56941228089</p>
        </div>
      </div>
    </div>
  );
}
