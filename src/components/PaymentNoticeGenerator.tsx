import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase, Project, CobrosNote, PaymentNotice as PaymentNoticeType, getAuthUserId } from '../lib/supabase';

interface PaymentNoticeForm {
  id?: string;
  cliente: string;
  rut: string;
  telefono: string;
  servicio_titulo: string;
  servicio_desc: string;
  periodo: string;
  neto: number;
  iva: number;
  total: number;
  banco: string;
  cuenta: string;
  titular: string;
  estado: string;
  project_id?: string;
  cobro_id?: string;
}

export default function PaymentNoticeGenerator() {
  const [notices, setNotices] = useState<PaymentNoticeType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cobrosNotes, setCobrosNotes] = useState<CobrosNote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PaymentNoticeForm>({
    cliente: '',
    rut: '',
    telefono: '',
    servicio_titulo: '',
    servicio_desc: '',
    periodo: new Date().toISOString().slice(0, 7),
    neto: 0,
    iva: 0,
    total: 0,
    banco: 'Mercado Pago (C. Vista)',
    cuenta: '1047904829',
    titular: 'Benjamín González Medina',
    estado: 'pendiente',
  });

  useEffect(() => {
    loadNotices();
    const loadOptions = async () => {
      const { data: p } = await supabase.from('projects').select('*').order('name');
      setProjects(p || []);
      const { data: c } = await supabase.from('cobros_notes').select('*').order('created_at', { ascending: false });
      setCobrosNotes(c || []);
    };
    loadOptions();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: name === 'neto' ? parseInt(value) || 0 : value };
      if (name === 'neto') {
        const neto = parseInt(value) || 0;
        const iva = Math.round(neto * 0.19);
        updated.iva = iva;
        updated.total = neto + iva;
      }
      return updated;
    });
  };

  const handleSaveNotice = async () => {
    if (!formData.cliente || !formData.rut || !formData.neto) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const saveData = {
        folio: formData.folio || `AV-${Date.now()}`,
        cliente: formData.cliente,
        rut: formData.rut,
        telefono: formData.telefono,
        servicio_titulo: formData.servicio_titulo,
        servicio_desc: formData.servicio_desc,
        periodo: formData.periodo,
        neto: formData.neto,
        iva: formData.iva,
        total: formData.total,
        banco: formData.banco,
        cuenta: formData.cuenta,
        titular: formData.titular,
        estado: formData.estado,
        project_id: formData.project_id || null,
        cobro_id: formData.cobro_id || null,
      };

      if (formData.id) {
        const { error } = await supabase
          .from('payment_notices')
          .update(saveData)
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const userId = await getAuthUserId();
        const { error } = await supabase
          .from('payment_notices')
          .insert([{ ...saveData, user_id: userId }]);
        if (error) throw error;
      }

      setShowForm(false);
      setFormData({
        cliente: '',
        rut: '',
        telefono: '',
        servicio_titulo: '',
        servicio_desc: '',
        periodo: new Date().toISOString().slice(0, 7),
        neto: 0,
        iva: 0,
        total: 0,
        banco: 'Mercado Pago (C. Vista)',
        cuenta: '1047904829',
        titular: 'Benjamín González Medina',
        estado: 'pendiente',
      });
      loadNotices();
    } catch (err) {
      console.error('Error saving notice:', err);
      alert('Error al guardar el aviso de cobro');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!confirm('¿Eliminar este aviso de cobro?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('payment_notices')
        .delete()
        .eq('id', id);
      if (error) throw error;
      loadNotices();
    } catch (err) {
      console.error('Error deleting notice:', err);
      alert('Error al eliminar el aviso');
    } finally {
      setLoading(false);
    }
  };

  const loadNotices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_notices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices((data as PaymentNoticeType[]) || []);
    } catch (err) {
      console.error('Error loading notices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (notice: PaymentNoticeType) => {
    setFormData({
      id: notice.id,
      cliente: notice.cliente || '',
      rut: notice.rut || '',
      telefono: notice.telefono || '',
      servicio_titulo: notice.servicio_titulo || '',
      servicio_desc: notice.servicio_desc || '',
      periodo: notice.periodo || '',
      neto: notice.neto || 0,
      iva: notice.iva || 0,
      total: notice.total || 0,
      banco: notice.banco || '',
      cuenta: notice.cuenta || '',
      titular: notice.titular || '',
      estado: notice.estado || 'pendiente',
      project_id: notice.project_id || '',
      cobro_id: notice.cobro_id || '',
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setFormData({
      cliente: '',
      rut: '',
      telefono: '',
      servicio_titulo: '',
      servicio_desc: '',
      periodo: new Date().toISOString().slice(0, 7),
      neto: 0,
      iva: 0,
      total: 0,
      banco: 'Mercado Pago (C. Vista)',
      cuenta: '1047904829',
      titular: 'Benjamín González Medina',
      estado: 'pendiente',
    });
    setShowForm(true);
  };

  const convertToInvoice = (notice: PaymentNoticeType) => {
    const iva = notice.iva || Math.round((notice.neto || 0) * 0.19);
    const total = notice.total || (notice.neto || 0) + iva;
    const invoiceData = {
      client_name: notice.cliente,
      client_rut: notice.rut,
      service_title: notice.servicio_titulo,
      service_description: notice.servicio_desc,
      period: notice.periodo,
      net_amount: notice.neto,
      iva_amount: iva,
      total_amount: total,
      source_notice_id: notice.id
    };

    localStorage.setItem('invoiceFromNotice', JSON.stringify(invoiceData));
    window.dispatchEvent(new CustomEvent('convertToInvoice', { detail: invoiceData }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Avisos de Cobro</h2>
            <p className="text-slate-400 text-sm">Gestiona avisos de cobro que pueden convertirse en facturas</p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo Aviso
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-700 rounded-lg border border-slate-600 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Nombre Cliente *</label>
                <input
                  type="text"
                  name="cliente"
                  value={formData.cliente}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">RUT Cliente *</label>
                <input
                  type="text"
                  name="rut"
                  value={formData.rut}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="XX.XXX.XXX-X"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="+56XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Título Servicio</label>
                <input
                  type="text"
                  name="servicio_titulo"
                  value={formData.servicio_titulo}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="Ej: Soporte Web"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Período *</label>
                <input
                  type="month"
                  name="periodo"
                  value={formData.periodo}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Monto Neto (CLP) *</label>
                <input
                  type="number"
                  name="neto"
                  value={formData.neto}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="27269"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Proyecto Asociado</label>
                <select
                  name="project_id"
                  value={formData.project_id || ''}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                >
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Banco</label>
                <input
                  type="text"
                  name="banco"
                  value={formData.banco}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Número Cuenta</label>
                <input
                  type="text"
                  name="cuenta"
                  value={formData.cuenta}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Titular Cuenta</label>
                <input
                  type="text"
                  name="titular"
                  value={formData.titular}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-bold mb-2">Nota de Cobro Asociada</label>
                <select
                  name="cobro_id"
                  value={formData.cobro_id || ''}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                >
                  <option value="">Sin nota de cobro</option>
                  {cobrosNotes.map((c) => (
                    <option key={c.id} value={c.id}>#{c.folio} - {c.cliente}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-bold mb-2">Descripción Servicio</label>
              <textarea
                name="servicio_desc"
                value={formData.servicio_desc}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                placeholder="Detalle del servicio prestado"
              />
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveNotice}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar Aviso'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded font-bold hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {notices.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">No hay avisos de cobro registrados</p>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
            >
              Crear Primer Aviso
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map(notice => {
              const iva = notice.iva || Math.round((notice.neto || 0) * 0.19);
              const total = notice.total || (notice.neto || 0) + iva;
              return (
                <div key={notice.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-blue-500 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-white">{notice.cliente}</h3>
                      <p className="text-slate-400 text-sm">{notice.rut} - {notice.servicio_titulo}</p>
                      {notice.project_id && projects.find(p => p.id === notice.project_id) && (
                        <p className="text-blue-400 text-xs mt-1">Proyecto: {projects.find(p => p.id === notice.project_id)?.name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-400">${total.toLocaleString('es-CL')}</p>
                      <p className="text-xs text-slate-400">Período: {notice.periodo}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4 text-xs bg-slate-800 rounded p-3">
                    <div>
                      <span className="text-slate-400">Neto</span>
                      <p className="text-white font-bold">${(notice.neto || 0).toLocaleString('es-CL')}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">IVA (19%)</span>
                      <p className="text-white font-bold">${iva.toLocaleString('es-CL')}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Estado</span>
                      <p className={`font-bold ${notice.estado === 'pagado' ? 'text-green-400' : 'text-red-400'}`}>
                        {notice.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(notice)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 text-white rounded text-sm font-bold hover:bg-slate-500 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => convertToInvoice(notice)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 transition"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Convertir a Factura
                    </button>
                    <button
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
