import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Search, ArrowDownLeft, ArrowUpRight, Wallet, ShoppingCart, TrendingUp, Calendar, Filter, ChevronDown, ChevronUp, DollarSign, CreditCard, Banknote, CheckCircle, Clock, AlertCircle, Receipt, Package, ArrowLeftRight, X, Save, Loader2, Eye, CreditCard as Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCLP } from '../types/invoice';
import type { CashCategory, CashTransaction, Purchase, Sale, CashFlowSummary } from '../types/cashflow';

type ViewMode = 'overview' | 'entries' | 'purchases' | 'sales' | 'new-entry' | 'new-purchase' | 'new-sale';
type TransactionType = 'entry' | 'exit';
type TabType = 'all' | 'entry' | 'exit';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'check', label: 'Cheque', icon: Receipt },
  { value: 'other', label: 'Otro', icon: DollarSign },
];

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  partial: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  partial: 'Parcial',
};

export default function CashFlow() {
  const [view, setView] = useState<ViewMode>('overview');
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Form states
  const [entryForm, setEntryForm] = useState({
    type: 'entry' as TransactionType,
    amount: '',
    description: '',
    category_id: '',
    payment_method: 'cash' as string,
    document_number: '',
    contact_name: '',
    contact_rut: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [purchaseForm, setPurchaseForm] = useState({
    supplier_name: '',
    supplier_rut: '',
    description: '',
    document_number: '',
    payment_method: 'transfer' as string,
    status: 'paid' as string,
    date: new Date().toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, price: 0, total: 0 }],
  });

  const [saleForm, setSaleForm] = useState({
    client_name: '',
    client_rut: '',
    description: '',
    document_number: '',
    payment_method: 'transfer' as string,
    status: 'paid' as string,
    date: new Date().toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, price: 0, total: 0 }],
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, pRes, sRes, cRes] = await Promise.all([
        supabase.from('cash_transactions').select('*, category:cash_categories(*)').order('date', { ascending: false }),
        supabase.from('purchases').select('*').order('date', { ascending: false }),
        supabase.from('sales').select('*').order('date', { ascending: false }),
        supabase.from('cash_categories').select('*').eq('active', true).order('name'),
      ]);
      if (tRes.error) console.error('transactions error:', tRes.error);
      if (pRes.error) console.error('purchases error:', pRes.error);
      if (sRes.error) console.error('sales error:', sRes.error);
      if (cRes.error) console.error('categories error:', cRes.error);
      setTransactions(tRes.data || []);
      setPurchases(pRes.data || []);
      setSales(sRes.data || []);
      setCategories(cRes.data || []);
    } catch (err) {
      console.error('Error loading cash flow data:', err);
    } finally {
      setLoading(false);
    }
  };

  const summary: CashFlowSummary = useMemo(() => {
    const filtered = getFilteredTransactions();
    const entries = filtered.filter((t) => t.type === 'entry');
    const exits = filtered.filter((t) => t.type === 'exit');
    const totalEntries = entries.reduce((s, t) => s + (t.amount || 0), 0);
    const totalExits = exits.reduce((s, t) => s + (t.amount || 0), 0);
    return {
      totalEntries,
      totalExits,
      balance: totalEntries - totalExits,
      entriesCount: entries.length,
      exitsCount: exits.length,
    };
  }, [transactions, activeTab, dateFrom, dateTo, searchTerm]);

  function getFilteredTransactions(): CashTransaction[] {
    return transactions.filter((t) => {
      if (activeTab !== 'all' && t.type !== activeTab) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          (t.description || '').toLowerCase().includes(s) ||
          (t.contact_name || '').toLowerCase().includes(s) ||
          (t.document_number || '').toLowerCase().includes(s)
        );
      }
      return true;
    });
  }

  const handleSaveEntry = async () => {
    const amount = parseFloat(entryForm.amount);
    if (!amount || amount <= 0) { setMessage({ type: 'error', text: 'Monto invalido' }); return; }
    if (!entryForm.description.trim()) { setMessage({ type: 'error', text: 'Descripcion requerida' }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('cash_transactions').insert([{
        type: entryForm.type,
        amount,
        description: entryForm.description,
        category_id: entryForm.category_id || null,
        payment_method: entryForm.payment_method || null,
        document_number: entryForm.document_number || null,
        contact_name: entryForm.contact_name || null,
        contact_rut: entryForm.contact_rut || null,
        date: entryForm.date,
      }]);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Movimiento registrado correctamente' });
      setEntryForm({ type: 'entry', amount: '', description: '', category_id: '', payment_method: 'cash', document_number: '', contact_name: '', contact_rut: '', date: new Date().toISOString().split('T')[0] });
      await loadData();
      setTimeout(() => setView('overview'), 800);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePurchase = async () => {
    if (!purchaseForm.supplier_name.trim()) { setMessage({ type: 'error', text: 'Proveedor requerido' }); return; }
    const validItems = purchaseForm.items.filter((i) => i.description.trim() && i.quantity > 0 && i.price >= 0);
    if (validItems.length === 0) { setMessage({ type: 'error', text: 'Agregue al menos un item' }); return; }
    setSaving(true);
    try {
      const subtotal = validItems.reduce((s, i) => s + i.total, 0);
      const tax = Math.round(subtotal * 0.19);
      const total = subtotal + tax;
      const { error } = await supabase.from('purchases').insert([{
        supplier_name: purchaseForm.supplier_name,
        supplier_rut: purchaseForm.supplier_rut || null,
        description: purchaseForm.description || null,
        document_number: purchaseForm.document_number || null,
        payment_method: purchaseForm.payment_method || null,
        status: purchaseForm.status,
        date: purchaseForm.date,
        items: validItems,
        subtotal,
        tax,
        total,
      }]);
      if (error) throw error;
      // Also create cash exit
      await supabase.from('cash_transactions').insert([{
        type: 'exit',
        amount: total,
        description: `Compra: ${purchaseForm.supplier_name} - ${purchaseForm.description || ''}`,
        reference_type: 'purchase',
        payment_method: purchaseForm.payment_method || null,
        contact_name: purchaseForm.supplier_name,
        contact_rut: purchaseForm.supplier_rut || null,
        date: purchaseForm.date,
      }]);
      setMessage({ type: 'success', text: 'Compra registrada correctamente' });
      setPurchaseForm({ supplier_name: '', supplier_rut: '', description: '', document_number: '', payment_method: 'transfer', status: 'paid', date: new Date().toISOString().split('T')[0], items: [{ description: '', quantity: 1, price: 0, total: 0 }] });
      await loadData();
      setTimeout(() => setView('overview'), 800);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar compra' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSale = async () => {
    if (!saleForm.client_name.trim()) { setMessage({ type: 'error', text: 'Cliente requerido' }); return; }
    const validItems = saleForm.items.filter((i) => i.description.trim() && i.quantity > 0 && i.price >= 0);
    if (validItems.length === 0) { setMessage({ type: 'error', text: 'Agregue al menos un item' }); return; }
    setSaving(true);
    try {
      const subtotal = validItems.reduce((s, i) => s + i.total, 0);
      const tax = Math.round(subtotal * 0.19);
      const total = subtotal + tax;
      const { error } = await supabase.from('sales').insert([{
        client_name: saleForm.client_name,
        client_rut: saleForm.client_rut || null,
        description: saleForm.description || null,
        document_number: saleForm.document_number || null,
        payment_method: saleForm.payment_method || null,
        status: saleForm.status,
        date: saleForm.date,
        items: validItems,
        subtotal,
        tax,
        total,
      }]);
      if (error) throw error;
      // Also create cash entry
      await supabase.from('cash_transactions').insert([{
        type: 'entry',
        amount: total,
        description: `Venta: ${saleForm.client_name} - ${saleForm.description || ''}`,
        reference_type: 'sale',
        payment_method: saleForm.payment_method || null,
        contact_name: saleForm.client_name,
        contact_rut: saleForm.client_rut || null,
        date: saleForm.date,
      }]);
      setMessage({ type: 'success', text: 'Venta registrada correctamente' });
      setSaleForm({ client_name: '', client_rut: '', description: '', document_number: '', payment_method: 'transfer', status: 'paid', date: new Date().toISOString().split('T')[0], items: [{ description: '', quantity: 1, price: 0, total: 0 }] });
      await loadData();
      setTimeout(() => setView('overview'), 800);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar venta' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Eliminar este movimiento?')) return;
    try {
      const { error } = await supabase.from('cash_transactions').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  const handleDeletePurchase = async (id: string) => {
    if (!confirm('Eliminar esta compra?')) return;
    try {
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error deleting purchase:', err);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!confirm('Eliminar esta venta?')) return;
    try {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error deleting sale:', err);
    }
  };

  const updateItem = (form: 'purchase' | 'sale', idx: number, field: string, value: string | number) => {
    const setter = form === 'purchase' ? setPurchaseForm : setSaleForm;
    const current = form === 'purchase' ? purchaseForm : saleForm;
    const items = [...current.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'quantity' || field === 'price') {
      items[idx].total = items[idx].quantity * items[idx].price;
    }
    setter({ ...current, items });
  };

  const addItem = (form: 'purchase' | 'sale') => {
    const setter = form === 'purchase' ? setPurchaseForm : setSaleForm;
    const current = form === 'purchase' ? purchaseForm : saleForm;
    setter({ ...current, items: [...current.items, { description: '', quantity: 1, price: 0, total: 0 }] });
  };

  const removeItem = (form: 'purchase' | 'sale', idx: number) => {
    const setter = form === 'purchase' ? setPurchaseForm : setSaleForm;
    const current = form === 'purchase' ? purchaseForm : saleForm;
    if (current.items.length <= 1) return;
    setter({ ...current, items: current.items.filter((_, i) => i !== idx) });
  };

  const filteredTransactions = getFilteredTransactions();
  const filteredPurchases = purchases.filter((p) => {
    if (dateFrom && p.date < dateFrom) return false;
    if (dateTo && p.date > dateTo) return false;
    if (searchTerm) return (p.supplier_name + ' ' + (p.description || '')).toLowerCase().includes(searchTerm.toLowerCase());
    return true;
  });
  const filteredSales = sales.filter((s) => {
    if (dateFrom && s.date < dateFrom) return false;
    if (dateTo && s.date > dateTo) return false;
    if (searchTerm) return (s.client_name + ' ' + (s.description || '')).toLowerCase().includes(searchTerm.toLowerCase());
    return true;
  });

  // ---- RENDER ----

  if (view === 'new-entry') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('overview')} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
            <ArrowLeftRight className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Movimiento de Caja</h2>
        </div>
        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Tipo</label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setEntryForm({ ...entryForm, type: 'entry' })} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${entryForm.type === 'entry' ? 'bg-emerald-600 text<think>' : 'bg-neutral-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300'}`}>
                  Entrada
                </button>
                <button onClick={() => setEntryForm({ ...entryForm, type: 'exit' })} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${entryForm.type === 'exit' ? 'bg-red-600 text<think>' : 'bg-neutral-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-300'}`}>
                  Salida
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Fecha</label>
              <input type="date" value={entryForm.date} onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} className="form-input mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Monto (CLP)</label>
            <input type="number" placeholder="0" value={entryForm.amount} onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} className="form-input mt-1 font-bold" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Descripcion</label>
            <input type="text" placeholder="Ej: Pago de servicio mensual" value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} className="form-input mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Categoria</label>
              <select value={entryForm.category_id} onChange={(e) => setEntryForm({ ...entryForm, category_id: e.target.value })} className="form-input mt-1">
                <option value="">Sin categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Metodo de Pago</label>
              <select value={entryForm.payment_method} onChange={(e) => setEntryForm({ ...entryForm, payment_method: e.target.value })} className="form-input mt-1">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Contacto / Nombre</label>
              <input type="text" value={entryForm.contact_name} onChange={(e) => setEntryForm({ ...entryForm, contact_name: e.target.value })} className="form-input mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">RUT</label>
              <input type="text" value={entryForm.contact_rut} onChange={(e) => setEntryForm({ ...entryForm, contact_rut: e.target.value })} className="form-input mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">N Documento</label>
            <input type="text" value={entryForm.document_number} onChange={(e) => setEntryForm({ ...entryForm, document_number: e.target.value })} className="form-input mt-1" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setView('overview')} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSaveEntry} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Movimiento
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'new-purchase') {
    const subtotal = purchaseForm.items.reduce((s, i) => s + i.total, 0);
    const tax = Math.round(subtotal * 0.19);
    const total = subtotal + tax;
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('overview')} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
            <ArrowLeftRight className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text<think>">Nueva Compra</h2>
        </div>
        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}
        <div className="bg<think> dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Proveedor *</label>
              <input type="text" value={purchaseForm.supplier_name} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_name: e.target.value })} className="form-input mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">RUT Proveedor</label>
              <input type="text" value={purchaseForm.supplier_rut} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_rut: e.target.value })} className="form-input mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Fecha</label>
              <input type="date" value={purchaseForm.date} onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} className="form-input mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Metodo Pago</label>
              <select value={purchaseForm.payment_method} onChange={(e) => setPurchaseForm({ ...purchaseForm, payment_method: e.target.value })} className="form-input mt-1">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Estado</label>
              <select value={purchaseForm.status} onChange={(e) => setPurchaseForm({ ...purchaseForm, status: e.target.value })} className="form-input mt-1">
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">N Documento</label>
            <input type="text" value={purchaseForm.document_number} onChange={(e) => setPurchaseForm({ ...purchaseForm, document_number: e.target.value })} className="form-input mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Descripcion</label>
            <textarea value={purchaseForm.description} onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })} className="form-input mt-1 h-20 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 block">Items</label>
            <div className="space-y-2">
              {purchaseForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5"><input type="text" placeholder="Descripcion" value={item.description} onChange={(e) => updateItem('purchase', idx, 'description', e.target.value)} className="form-input text-sm" /></div>
                  <div className="col-span-2"><input type="number" placeholder="Cant" value={item.quantity} onChange={(e) => updateItem('purchase', idx, 'quantity', parseInt(e.target.value) || 0)} className="form-input text-sm" /></div>
                  <div className="col-span-2"><input type="number" placeholder="Precio" value={item.price} onChange={(e) => updateItem('purchase', idx, 'price', parseInt(e.target.value) || 0)} className="form-input text-sm" /></div>
                  <div className="col-span-2 text-right text-sm font-bold text-gray-700 dark:text-gray-300">{formatCLP(item.total)}</div>
                  <div className="col-span-1"><button onClick={() => removeItem('purchase', idx)} className="p-1 hover:bg-red-50 rounded text-red-500"><X className="w-4 h-4" /></button></div>
                </div>
              ))}
            </div>
            <button onClick={() => addItem('purchase')} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar item
            </button>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>{formatCLP(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400"><span>IVA (19%)</span><span>{formatCLP(tax)}</span></div>
            <div className="flex justify-between text-lg font-black text-gray-900 dark:text<think> pt-2 border-t border-neutral-200 dark:border-neutral-700 mt-2"><span>Total</span><span>{formatCLP(total)}</span></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setView('overview')} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSavePurchase} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Compra
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'new-sale') {
    const subtotal = saleForm.items.reduce((s, i) => s + i.total, 0);
    const tax = Math.round(subtotal * 0.19);
    const total = subtotal + tax;
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('overview')} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
            <ArrowLeftRight className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text<think>">Nueva Venta</h2>
        </div>
        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}
        <div className="bg<think> dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Cliente *</label>
              <input type="text" value={saleForm.client_name} onChange={(e) => setSaleForm({ ...saleForm, client_name: e.target.value })} className="form-input mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">RUT Cliente</label>
              <input type="text" value={saleForm.client_rut} onChange={(e) => setSaleForm({ ...saleForm, client_rut: e.target.value })} className="form-input mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Fecha</label>
              <input type="date" value={saleForm.date} onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })} className="form-input mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Metodo Pago</label>
              <select value={saleForm.payment_method} onChange={(e) => setSaleForm({ ...saleForm, payment_method: e.target.value })} className="form-input mt-1">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Estado</label>
              <select value={saleForm.status} onChange={(e) => setSaleForm({ ...saleForm, status: e.target.value })} className="form-input mt-1">
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">N Documento</label>
            <input type="text" value={saleForm.document_number} onChange={(e) => setSaleForm({ ...saleForm, document_number: e.target.value })} className="form-input mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Descripcion</label>
            <textarea value={saleForm.description} onChange={(e) => setSaleForm({ ...saleForm, description: e.target.value })} className="form-input mt-1 h-20 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 block">Items</label>
            <div className="space-y-2">
              {saleForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5"><input type="text" placeholder="Descripcion" value={item.description} onChange={(e) => updateItem('sale', idx, 'description', e.target.value)} className="form-input text-sm" /></div>
                  <div className="col-span-2"><input type="number" placeholder="Cant" value={item.quantity} onChange={(e) => updateItem('sale', idx, 'quantity', parseInt(e.target.value) || 0)} className="form-input text-sm" /></div>
                  <div className="col-span-2"><input type="number" placeholder="Precio" value={item.price} onChange={(e) => updateItem('sale', idx, 'price', parseInt(e.target.value) || 0)} className="form-input text-sm" /></div>
                  <div className="col-span-2 text-right text-sm font-bold text-gray-700 dark:text-gray-300">{formatCLP(item.total)}</div>
                  <div className="col-span-1"><button onClick={() => removeItem('sale', idx)} className="p-1 hover:bg-red-50 rounded text-red-500"><X className="w-4 h-4" /></button></div>
                </div>
              ))}
            </div>
            <button onClick={() => addItem('sale')} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar item
            </button>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>{formatCLP(subtotal)}</span></div>
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400"><span>IVA (19%)</span><span>{formatCLP(tax)}</span></div>
            <div className="flex justify-between text-lg font-black text-gray-900 dark:text<think> pt-2 border-t border-neutral-200 dark:border-neutral-700 mt-2"><span>Total</span><span>{formatCLP(total)}</span></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setView('overview')} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleSaveSale} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar Venta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- OVERVIEW ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text<think>">Caja, Compras y Ventas</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setView('new-entry'); setMessage(null); }} className="btn-primary flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4" /> Movimiento Caja
          </button>
          <button onClick={() => { setView('new-purchase'); setMessage(null); }} className="btn-secondary flex items-center gap-2 bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30">
            <ShoppingCart className="w-4 h-4" /> Compra
          </button>
          <button onClick={() => { setView('new-sale'); setMessage(null); }} className="btn-secondary flex items-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
            <TrendingUp className="w-4 h-4" /> Venta
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Entradas</span>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text<think>">{formatCLP(summary.totalEntries)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{summary.entriesCount} movimientos</p>
        </div>
        <div className="card p-4 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-red-500" />
            <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Salidas</span>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text<think>">{formatCLP(summary.totalExits)}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{summary.exitsCount} movimientos</p>
        </div>
        <div className="card p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Saldo</span>
          </div>
          <p className={`text-2xl font-black ${summary.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCLP(summary.balance)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Balance actual</p>
        </div>
        <div className="card p-4 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Registros</span>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text<think>">{purchases.length + sales.length}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{purchases.length} compras / {sales.length} ventas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-neutral-50 dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="form-input text-sm" />
          <span className="text-gray-400">-</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="form-input text-sm" />
        </div>
        <div className="flex gap-1">
          {(['all', 'entry', 'exit'] as TabType[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === tab
                ? tab === 'entry' ? 'bg-emerald-600 text<think>' : tab === 'exit' ? 'bg-red-600 text<think>' : 'bg-blue-600 text<think>'
                : 'bg-neutral-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400'
            }`}>
              {tab === 'all' ? 'Todos' : tab === 'entry' ? 'Entradas' : 'Salidas'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-gray-900 dark:text<think>">Movimientos de Caja</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No hay movimientos registrados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Descripcion</th>
                  <th className="px-4 py-3 text-left">Contacto</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        t.type === 'entry'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                          : 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                      }`}>
                        {t.type === 'entry' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {t.type === 'entry' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs truncate">{t.description}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{t.contact_name || '-'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${t.type === 'entry' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t.type === 'entry' ? '+' : '-'}{formatCLP(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDeleteTransaction(t.id)} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchases & Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchases */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-gray-900 dark:text<think>">Compras</h3>
            <span className="ml-auto text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/20 px-2 py-0.5 rounded-full">{filteredPurchases.length}</span>
          </div>
          {filteredPurchases.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No hay compras registradas</div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
              {filteredPurchases.map((p) => (
                <div key={p.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{p.supplier_name}</p>
                      <p className="text-xs text-gray-400">{p.document_number || 'Sin doc'} | {p.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{formatCLP(p.total)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                    </div>
                  </div>
                  {p.items && p.items.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      {p.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between"><span>{item.description}</span><span>{formatCLP(item.total)}</span></div>
                      ))}
                      {p.items.length > 3 && <p className="text-gray-400">...y {p.items.length - 3} mas</p>}
                    </div>
                  )}
                  <div className="flex justify-end mt-2">
                    <button onClick={() => handleDeletePurchase(p.id)} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-gray-900 dark:text<think>">Ventas</h3>
            <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">{filteredSales.length}</span>
          </div>
          {filteredSales.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No hay ventas registradas</div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-96 overflow-y-auto">
              {filteredSales.map((s) => (
                <div key={s.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{s.client_name}</p>
                      <p className="text-xs text-gray-400">{s.document_number || 'Sin doc'} | {s.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{formatCLP(s.total)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[s.status]}`}>{STATUS_LABELS[s.status]}</span>
                    </div>
                  </div>
                  {s.items && s.items.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      {s.items.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex justify-between"><span>{item.description}</span><span>{formatCLP(item.total)}</span></div>
                      ))}
                      {s.items.length > 3 && <p className="text-gray-400">...y {s.items.length - 3} mas</p>}
                    </div>
                  )}
                  <div className="flex justify-end mt-2">
                    <button onClick={() => handleDeleteSale(s.id)} className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
