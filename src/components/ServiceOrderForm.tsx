import { useState, useEffect } from 'react';
import { Save, ArrowLeft, Plus, Trash2, CreditCard as Edit2, Eye, Loader, AlertCircle, Search, Laptop, Smartphone, Tablet, Printer, Download, MessageCircle, ClipboardList, Receipt } from 'lucide-react';
import { supabase, ServiceOrder, Project, CobrosNote, getAuthUserId } from '../lib/supabase';
import { generateInvoicePDF } from '../lib/pdf';
import { CobroPrefill } from '../types/cobro';
import { showConfirm, showSuccess, showError, showWarning, showToast } from '../lib/alerts';

type ViewMode = 'list' | 'editor' | 'preview';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completado',
  delivered: 'Entregado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  delivered: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
};

const serviceTypeLabels: Record<string, string> = {
  repair: 'Reparacion',
  sale: 'Venta',
  installation: 'Instalacion de Camaras',
  maintenance: 'Mantenimiento',
  consulting: 'Consultoria',
  other: 'Otro',
};

const emptyForm = {
  client_name: '',
  client_email: '',
  client_phone: '',
  client_address: '',
  device_type: [] as string[],
  device_brand: '',
  device_model: '',
  device_serial: '',
  problem_description: '',
  service_type: 'repair',
  status: 'pending',
  estimated_cost: 0,
  notes: '',
  project_id: '',
  cobro_id: '',
};

interface ServiceOrderFormProps {
  onGenerateCobro?: (prefill: CobroPrefill) => void;
}

export default function ServiceOrderForm({ onGenerateCobro }: ServiceOrderFormProps) {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cobrosNotes, setCobrosNotes] = useState<CobrosNote[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => { loadOrders(); loadOptions(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('service_orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data as ServiceOrder[]) || []);
    } catch (err) { console.error('Error loading orders:', err); }
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

  const toggleDeviceType = (type: string) => {
    const current = form.device_type || [];
    set('device_type', current.includes(type) ? current.filter((t) => t !== type) : [...current, type]);
  };

  const openNew = () => {
    setEditingOrder(null); setForm(emptyForm); setError(''); setSuccess('');
    setViewMode('editor');
  };

  const openEditor = (order: ServiceOrder) => {
    setEditingOrder(order);
    setForm({
      client_name: order.client_name || '', client_email: order.client_email || '',
      client_phone: order.client_phone || '', client_address: order.client_address || '',
      device_type: order.device_type || [], device_brand: order.device_brand || '',
      device_model: order.device_model || '', device_serial: order.device_serial || '',
      problem_description: order.problem_description || '', service_type: order.service_type || 'repair',
      status: order.status || 'pending', estimated_cost: order.estimated_cost || 0,
      notes: order.notes || '', project_id: order.project_id || '', cobro_id: order.cobro_id || '',
    });
    setError(''); setSuccess(''); setViewMode('editor');
  };

  const openPreview = (order: ServiceOrder) => { setEditingOrder(order); setViewMode('preview'); };

  const handleSave = async () => {
    if (!form.client_name.trim()) { setError('El nombre del cliente es requerido.'); return; }
    setError(''); setSaving(true);

    try {
      const userId = await getAuthUserId();
      const payload = {
        client_name: form.client_name, client_email: form.client_email || null,
        client_phone: form.client_phone || null, client_address: form.client_address || null,
        device_type: form.device_type, device_brand: form.device_brand || null,
        device_model: form.device_model || null, device_serial: form.device_serial || null,
        problem_description: form.problem_description || null, service_type: form.service_type,
        status: form.status, estimated_cost: form.estimated_cost, notes: form.notes || null,
        project_id: form.project_id || null, cobro_id: form.cobro_id || null, user_id: userId,
      };

      if (editingOrder?.id) {
        const { error } = await supabase.from('service_orders').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingOrder.id);
        if (error) throw error;
      } else {
        const orderNumber = `OS-${Date.now().toString().slice(-6)}`;
        const { error } = await supabase.from('service_orders').insert([{ ...payload, order_number: orderNumber }]);
        if (error) throw error;
      }

      await loadOrders();
      setTimeout(() => { setViewMode('list'); showToast('success', 'Orden de servicio guardada'); }, 800);
    } catch (err: any) { showError('Error al guardar', err.message || 'Error al guardar la orden de servicio.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('¿Eliminar esta orden de servicio?', 'Esta acción no se puede deshacer. Los datos se perderán permanentemente.', 'Eliminar', 'Cancelar');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('service_orders').delete().eq('id', id);
      if (error) throw error;
      showToast('success', 'Orden eliminada');
      loadOrders();
    } catch (err) { showError('Error al eliminar', 'No se pudo eliminar la orden'); }
  };

  const toggleStatus = async (order: ServiceOrder) => {
    const next: Record<string, string> = { pending: 'in_progress', in_progress: 'completed', completed: 'delivered', delivered: 'pending' };
    try {
      const { error } = await supabase.from('service_orders').update({ status: next[order.status] || 'pending', updated_at: new Date().toISOString() }).eq('id', order.id);
      if (error) throw error;
      showToast('success', `Estado: ${statusLabels[next[order.status] || 'pending']}`);
      loadOrders();
    } catch (err) { showError('Error', 'No se pudo actualizar el estado'); }
  };

  const handlePrintPDF = async () => {
    setGeneratingPDF(true);
    try {
      const blob = await generateInvoicePDF('service-order-print-area', `OS-${editingOrder?.order_number || 'NUEVA'}.pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `OS-${editingOrder?.order_number || 'NUEVA'}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('success', 'PDF descargado');
    } catch (e) { showError('Error al generar PDF', 'No se pudo generar el documento'); }
    finally { setGeneratingPDF(false); }
  };

  const handlePrint = () => { window.print(); };

  const handleWhatsApp = async () => {
    setGeneratingPDF(true);
    try {
      const tel = (editingOrder?.client_phone || '').replace('+', '').replace(/\s/g, '');
      if (!tel) { setGeneratingPDF(false); return; }
      const msg = encodeURIComponent(`Hola ${editingOrder?.client_name || ''}! Te envio la orden de servicio ${editingOrder?.order_number || ''}. Estado: ${statusLabels[editingOrder?.status || 'pending']}. Costo estimado: $${(editingOrder?.estimated_cost || 0).toLocaleString('es-CL')}. Saludos!`);
      try {
        const blob = await generateInvoicePDF('service-order-print-area', `OS-${editingOrder?.order_number || 'NUEVA'}.pdf`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `OS-${editingOrder?.order_number || 'NUEVA'}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        setTimeout(() => { window.open(`https://wa.me/${tel}?text=${msg}`, '_blank'); }, 300);
      } catch { window.open(`https://wa.me/${tel}?text=${msg}`, '_blank'); }
    } finally { setGeneratingPDF(false); }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = !searchTerm || o.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || o.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="section-header">
          <div>
            <h1 className="section-title">Ordenes de Servicio</h1>
            <p className="section-subtitle">Gestiona las ordenes de reparacion, venta e instalacion</p>
          </div>
          <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" />Nueva Orden</button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['pending', 'in_progress', 'completed', 'delivered'].map((s) => (
            <div key={s} className="card p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{statusLabels[s]}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{orders.filter((o) => o.status === s).length}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input type="text" placeholder="Buscar por cliente o numero..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['all', 'pending', 'in_progress', 'completed', 'delivered'].map((f) => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterStatus === f ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}>
                {f === 'all' ? 'Todos' : statusLabels[f] || f}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-blue-500 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrders.map((order) => (
              <div key={order.id} className="card-hover overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{order.order_number}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{order.client_name}</p>
                    </div>
                    <button onClick={() => toggleStatus(order)}
                      className={`badge cursor-pointer transition ${statusColors[order.status] || 'bg-neutral-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'}`}>
                      {statusLabels[order.status] || order.status}
                    </button>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{serviceTypeLabels[order.service_type] || order.service_type}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {order.device_type?.length ? order.device_type.join(', ').toUpperCase() : 'Sin dispositivo'}
                    {order.device_brand ? ` - ${order.device_brand}` : ''}
                  </p>
                  {order.project_id && projects.find((p) => p.id === order.project_id) && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Proyecto: {projects.find((p) => p.id === order.project_id)?.name}</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Costo Estimado</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">${(order.estimated_cost || 0).toLocaleString('es-CL')}</span>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button onClick={() => openPreview(order)} className="btn-ghost flex-1 text-xs py-1.5"><Eye className="w-3.5 h-3.5" />Ver</button>
                    <button onClick={() => openEditor(order)} className="btn-primary flex-1 text-xs py-1.5"><Edit2 className="w-3.5 h-3.5" />Editar</button>
                    <button onClick={() => handleDelete(order.id!)} className="btn text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 flex-1 text-xs py-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredOrders.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon"><ClipboardList className="w-6 h-6 text-gray-400 dark:text-gray-500" /></div>
            <p className="empty-state-title">No se encontraron ordenes</p>
            <p className="empty-state-desc">Crea una nueva orden o ajusta los filtros</p>
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
                {editingOrder ? `Editando ${editingOrder.order_number}` : 'Nueva Orden de Servicio'}
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

            {/* Dispositivo */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Dispositivo</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'pc', Icon: Laptop, label: 'PC' },
                  { key: 'tablet', Icon: Tablet, label: 'Tablet' },
                  { key: 'phone', Icon: Smartphone, label: 'Phone' },
                ].map(({ key, Icon, label }) => (
                  <button key={key} type="button" onClick={() => toggleDeviceType(key)}
                    className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all text-xs font-medium ${
                      form.device_type?.includes(key)
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                        : 'border-neutral-200 dark:border-neutral-700 text-gray-500 dark:text-gray-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}>
                    <Icon className="w-5 h-5 mb-1" />
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <label className="form-label">Marca</label>
                <input type="text" placeholder="Ej: Lenovo, HP, Samsung" value={form.device_brand}
                  onChange={(e) => set('device_brand', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Modelo</label>
                <input type="text" placeholder="Modelo del equipo" value={form.device_model}
                  onChange={(e) => set('device_model', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Numero de Serie</label>
                <input type="text" placeholder="S/N" value={form.device_serial}
                  onChange={(e) => set('device_serial', e.target.value)} className="form-input" />
              </div>
            </div>

            {/* Servicio */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Servicio</h4>
              <div>
                <label className="form-label">Tipo de Servicio</label>
                <select value={form.service_type} onChange={(e) => set('service_type', e.target.value)} className="form-input">
                  <option value="repair">Reparacion</option>
                  <option value="sale">Venta</option>
                  <option value="installation">Instalacion de Camaras</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="consulting">Consultoria</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="form-label">Estado</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="form-input">
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="completed">Completado</option>
                  <option value="delivered">Entregado</option>
                </select>
              </div>
              <div>
                <label className="form-label">Costo Estimado</label>
                <input type="number" placeholder="0" value={form.estimated_cost || ''}
                  onChange={(e) => set('estimated_cost', parseFloat(e.target.value) || 0)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Descripcion del Problema</label>
                <textarea placeholder="Describe el problema reportado..." value={form.problem_description}
                  onChange={(e) => set('problem_description', e.target.value)}
                  className="form-input resize-none" rows={3} />
              </div>
            </div>

            {/* Relaciones y Notas */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Relaciones y Notas</h4>
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
                <label className="form-label">Notas Adicionales</label>
                <textarea placeholder="Notas internas..." value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  className="form-input resize-none" rows={3} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PREVIEW VIEW
  const o = editingOrder;
  if (!o) { setViewMode('list'); return null; }

  return (
    <div>
      {/* Action bar */}
      <div className="card p-4 mb-6 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewMode('list')} className="btn-ghost p-2"><ArrowLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{o.order_number}</h2>
          <span className={`badge ${statusColors[o.status] || 'bg-neutral-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400'}`}>{statusLabels[o.status] || o.status}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handlePrint} className="btn-secondary text-xs"><Printer size={14} />Imprimir</button>
          <button onClick={handlePrintPDF} disabled={generatingPDF} className="btn-primary text-xs disabled:opacity-50">
            {generatingPDF ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}PDF
          </button>
          {o.client_phone && (
            <button onClick={handleWhatsApp} disabled={generatingPDF} className="btn-success text-xs disabled:opacity-50">
              <MessageCircle size={14} />WhatsApp
            </button>
          )}
          <button onClick={() => openEditor(o)} className="btn-primary text-xs"><Edit2 size={14} />Editar</button>
          {onGenerateCobro && (
            <button onClick={() => onGenerateCobro({
              cliente: o.client_name || '',
              telefono: o.client_phone || '',
              servicio_titulo: serviceTypeLabels[o.service_type] || o.service_type,
              servicio_desc: o.problem_description || '',
              neto: o.estimated_cost || 0,
              proyecto_id: o.project_id || undefined,
            })} className="btn-secondary text-xs"><Receipt size={14} />Nota de Cobro</button>
          )}
          <button onClick={() => handleDelete(o.id!)} className="btn-danger text-xs"><Trash2 size={14} />Eliminar</button>
        </div>
      </div>

      {/* Print area */}
      <div id="service-order-print-area" className="max-w-[210mm] mx-auto bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 p-8 md:p-12 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800">
        <div className="text-center mb-8 pb-4 border-b-2 border-blue-600">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">BJ SERVICIOS INFORMATICOS SpA</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">RUT: 78.332.298-6 | Servicios de Reparacion, Venta, Instalacion</p>
        </div>

        <div className="text-center bg-neutral-50 dark:bg-neutral-800 py-3 mb-6 rounded-lg">
          <p className="font-bold text-lg text-gray-900 dark:text-gray-100">ORDEN DE SERVICIO: {o.order_number}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Cliente</h4>
            <p className="font-medium text-gray-900 dark:text-gray-100">{o.client_name}</p>
            {o.client_email && <p className="text-sm text-gray-500 dark:text-gray-400">{o.client_email}</p>}
            {o.client_phone && <p className="text-sm text-gray-500 dark:text-gray-400">{o.client_phone}</p>}
            {o.client_address && <p className="text-sm text-gray-500 dark:text-gray-400">{o.client_address}</p>}
          </div>
          <div>
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Dispositivo</h4>
            <p className="font-medium text-gray-900 dark:text-gray-100">{o.device_type?.length ? o.device_type.join(', ').toUpperCase() : 'N/A'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{o.device_brand || ''} {o.device_model || ''}</p>
            {o.device_serial && <p className="text-sm text-gray-500 dark:text-gray-400">S/N: {o.device_serial}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Servicio</h4>
            <p className="font-medium text-gray-900 dark:text-gray-100">{serviceTypeLabels[o.service_type] || o.service_type}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Estado: <span className="font-semibold">{statusLabels[o.status] || o.status}</span></p>
          </div>
          <div>
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Costo Estimado</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${(o.estimated_cost || 0).toLocaleString('es-CL')}</p>
          </div>
        </div>

        {o.problem_description && (
          <div className="mb-6">
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Problema</h4>
            <p className="text-sm bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">{o.problem_description}</p>
          </div>
        )}

        {o.notes && (
          <div className="mb-6">
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Notas</h4>
            <p className="text-sm bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">{o.notes}</p>
          </div>
        )}

        {o.project_id && projects.find((p) => p.id === o.project_id) && (
          <div className="mb-6">
            <h4 className="font-semibold text-blue-600 dark:text-blue-400 text-sm mb-2 uppercase">Proyecto Asociado</h4>
            <p className="text-sm font-medium">{projects.find((p) => p.id === o.project_id)?.name}</p>
          </div>
        )}

        <div className="text-center mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-gray-400 dark:text-gray-500">
          <p>Fecha: {new Date(o.created_at || '').toLocaleDateString('es-CL')}</p>
          <p>BJ Servicios Informaticos SpA - +56941228089</p>
        </div>
      </div>
    </div>
  );
}
