import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Printer, Send, ArrowLeft, Save, Download, MessageCircle, Loader, AlertCircle, Eye, CreditCard as Edit2, Search, Copy } from 'lucide-react';import { supabase, CobrosNote, Project, getAuthUserId } from '../lib/supabase';
import { Invoice, InvoiceFormData, calcularTotales, formatCLP } from '../types/invoice';
import InvoicePreview from './InvoicePreview';
import { generateInvoicePDF } from '../lib/pdf';
import DTEGenerator from './DTEGenerator';
import { CobroPrefill } from '../types/cobro';

type ViewMode = 'list' | 'editor' | 'preview';

const emptyForm: InvoiceFormData = {
  folio: '',
  cliente: '',
  rut: '',
  telefono: '+569',
  servicio_titulo: 'Soporte Web & Mantención Mensual',
  servicio_desc: 'Incluye mantenimiento integral, disponibilidad de 3 cambios o implementaciones técnicas.',
  periodo: new Date().toISOString().slice(0, 7),
  neto: 0,
  iva: 0,
  total: 0,
  estado: 'pendiente',
  banco: 'Mercado Pago (C. Vista)',
  cuenta: '1047904829',
  titular: 'Benjamín González Medina',
};

interface CobrosNotesProps {
  prefill?: CobroPrefill | null;
  onPrefillConsumed?: () => void;
}

export default function CobrosNotes({ prefill, onPrefillConsumed }: CobrosNotesProps) {
  const [notes, setNotes] = useState<CobrosNote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingNote, setEditingNote] = useState<CobrosNote | null>(null);
  const [form, setForm] = useState<InvoiceFormData>(emptyForm);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'pendiente' | 'pagado'>('all');
  const [showDTEGenerator, setShowDTEGenerator] = useState(false);
  const [selectedNote, setSelectedNote] = useState<CobrosNote | null>(null);

  const prefillConsumed = React.useRef(false);

  useEffect(() => {
    loadNotes();
    loadProjects();
  }, []);

  useEffect(() => {
    if (prefill && !prefillConsumed.current) {
      prefillConsumed.current = true;
      const { iva, total } = calcularTotales(prefill.neto || 0);
      const nextFolio = `${new Date().getFullYear()}-${String(notes.length + 1).padStart(3, '0')}`;
      setForm({
        folio: nextFolio,
        cliente: prefill.cliente || '',
        rut: '',
        telefono: prefill.telefono || '+569',
        servicio_titulo: prefill.servicio_titulo || '',
        servicio_desc: prefill.servicio_desc || '',
        periodo: new Date().toISOString().slice(0, 7),
        neto: prefill.neto || 0,
        iva,
        total,
        estado: 'pendiente',
        banco: 'Mercado Pago (C. Vista)',
        cuenta: '1047904829',
        titular: 'Benjamin Gonzalez Medina',
      });
      if (prefill.proyecto_id) setSelectedProjectId(prefill.proyecto_id);
      setEditingNote(null);
      setError('');
      setSuccess('');
      setViewMode('editor');
      onPrefillConsumed?.();
    }
  }, [prefill]);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'print-style';
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        #print-root { display: block !important; }
        #print-root > * { display: block; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById('print-style')?.remove();
    };
  }, []);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('cobros_notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error loading notes:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const set = (key: keyof InvoiceFormData, value: string | number) => {
    setForm((f) => {
      const updated = { ...f, [key]: value };
      if (key === 'neto') {
        const neto = typeof value === 'number' ? value : parseInt(String(value)) || 0;
        const { iva, total } = calcularTotales(neto);
        return { ...updated, neto, iva, total };
      }
      return updated;
    });
    setError('');
    setSuccess('');
  };

  const openNewEditor = () => {
    setEditingNote(null);
    setForm(emptyForm);
    setSelectedProjectId('');
    setError('');
    setSuccess('');
    setViewMode('editor');
  };

  const openEditor = (note: CobrosNote) => {
    setEditingNote(note);
    const { iva, total } = calcularTotales(note.neto || 0);
    setForm({
      folio: note.folio,
      cliente: note.cliente,
      rut: note.rut || '',
      telefono: note.telefono || '',
      servicio_titulo: note.servicio_titulo || '',
      servicio_desc: note.servicio_desc || '',
      periodo: note.periodo || '',
      neto: note.neto || 0,
      iva: note.iva ?? iva,
      total: note.total ?? total,
      estado: note.estado,
      banco: note.banco || '',
      cuenta: note.cuenta || '',
      titular: note.titular || '',
    });
    setSelectedProjectId(note.proyecto_id || '');
    setError('');
    setSuccess('');
    setViewMode('editor');
  };

  const openPreview = (note: CobrosNote) => {
    setEditingNote(note);
    const { iva, total } = calcularTotales(note.neto || 0);
    setForm({
      folio: note.folio,
      cliente: note.cliente,
      rut: note.rut || '',
      telefono: note.telefono || '',
      servicio_titulo: note.servicio_titulo || '',
      servicio_desc: note.servicio_desc || '',
      periodo: note.periodo || '',
      neto: note.neto || 0,
      iva: note.iva ?? iva,
      total: note.total ?? total,
      estado: note.estado,
      banco: note.banco || '',
      cuenta: note.cuenta || '',
      titular: note.titular || '',
    });
    setSelectedProjectId(note.proyecto_id || '');
    setViewMode('preview');
  };

  const handleSave = async () => {
    if (!form.folio.trim()) {
      setError('El folio es requerido.');
      return;
    }
    if (!form.cliente.trim()) {
      setError('El cliente es requerido.');
      return;
    }
    setError('');
    setSaving(true);

    try {
      if (editingNote?.id) {
        const { error } = await supabase
          .from('cobros_notes')
          .update({
            folio: form.folio,
            cliente: form.cliente,
            rut: form.rut,
            telefono: form.telefono,
            servicio_titulo: form.servicio_titulo,
            servicio_desc: form.servicio_desc,
            periodo: form.periodo,
            neto: form.neto,
            iva: form.iva,
            total: form.total,
            estado: form.estado,
            banco: form.banco,
            cuenta: form.cuenta,
            titular: form.titular,
            proyecto_id: selectedProjectId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingNote.id);
        if (error) throw error;
      } else {
        const userId = await getAuthUserId();
        const { error } = await supabase
          .from('cobros_notes')
          .insert([{
            folio: form.folio,
            cliente: form.cliente,
            rut: form.rut,
            telefono: form.telefono,
            servicio_titulo: form.servicio_titulo,
            servicio_desc: form.servicio_desc,
            periodo: form.periodo,
            neto: form.neto,
            iva: form.iva,
            total: form.total,
            estado: form.estado,
            banco: form.banco,
            cuenta: form.cuenta,
            titular: form.titular,
            proyecto_id: selectedProjectId || null,
            user_id: userId,
          }]);
        if (error) throw error;
      }

      setSuccess('Nota de cobro guardada correctamente.');
      await loadNotes();
      setTimeout(() => {
        setViewMode('list');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Error al guardar la nota de cobro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta nota de cobro?')) return;
    try {
      const { error } = await supabase.from('cobros_notes').delete().eq('id', id);
      if (error) throw error;
      loadNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const toggleEstado = async (note: CobrosNote) => {
    const nuevoEstado = note.estado === 'pagado' ? 'pendiente' : 'pagado';
    try {
      const { error } = await supabase
        .from('cobros_notes')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', note.id);
      if (error) throw error;
      loadNotes();
    } catch (err) {
      console.error('Error updating estado:', err);
    }
  };

  const handleAutofillFromExisting = (note: CobrosNote) => {
    const { iva, total } = calcularTotales(note.neto || 0);
    const nextFolio = `${new Date().getFullYear()}-${String(notes.length + 1).padStart(3, '0')}`;

    setForm({
      folio: nextFolio,
      cliente: note.cliente,
      rut: note.rut || '',
      telefono: note.telefono || '',
      servicio_titulo: note.servicio_titulo || '',
      servicio_desc: note.servicio_desc || '',
      periodo: new Date().toISOString().slice(0, 7),
      neto: note.neto || 0,
      iva,
      total,
      estado: 'pendiente',
      banco: note.banco || '',
      cuenta: note.cuenta || '',
      titular: note.titular || '',
    });

    setSelectedProjectId(note.proyecto_id || '');
    setEditingNote(null);
    setError('');
    setSuccess('');
    setViewMode('editor');
  };

  const handlePrintPDF = async () => {
    setGeneratingPDF(true);
    setError('');
    try {
      const blob = await generateInvoicePDF('invoice-print-area', `INV-${form.folio || 'NUEVA'}.pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `INV-${form.folio || 'NUEVA'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('PDF descargado correctamente.');
    } catch (e: any) {
      setError(e.message || 'Error al generar PDF.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = async () => {
    setGeneratingPDF(true);
    setError('');
    try {
      if (!form.telefono.trim()) {
        throw new Error('El número de teléfono es requerido para enviar por WhatsApp.');
      }
      const tel = form.telefono.replace('+', '').replace(/\s/g, '');
      const mesServicio = (() => {
        const d = new Date(form.periodo + '-15T12:00:00');
        d.setMonth(d.getMonth() - 1);
        return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
      })();
      const msg = encodeURIComponent(
        `Hola ${form.cliente}! Te envio la nota de cobro [${form.estado.toUpperCase()}] de ${mesServicio}. Total: ${formatCLP(form.total)}. (Nota: Incluye los 3 cambios mensuales disponibles). Saludos!`
      );
      try {
        const blob = await generateInvoicePDF('invoice-print-area', `INV-${form.folio || 'NUEVA'}.pdf`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `INV-${form.folio || 'NUEVA'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setTimeout(() => {
          window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
          setSuccess('PDF descargado. Abre WhatsApp para completar el envío.');
        }, 300);
      } catch (pdfError) {
        console.warn('PDF generation failed, sending message only:', pdfError);
        window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
        setSuccess('Abierto WhatsApp. Adjunta el PDF manualmente si es necesario.');
      }
    } catch (e: any) {
      setError(e.message || 'Error al enviar por WhatsApp.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const previewInvoice: Invoice = {
    id: editingNote?.id || '',
    folio: form.folio,
    cliente: form.cliente,
    rut: form.rut,
    telefono: form.telefono,
    servicio_titulo: form.servicio_titulo,
    servicio_desc: form.servicio_desc,
    periodo: form.periodo,
    neto: form.neto,
    iva: form.iva,
    total: form.total,
    estado: form.estado,
    banco: form.banco,
    cuenta: form.cuenta,
    titular: form.titular,
    created_at: editingNote?.created_at || '',
    updated_at: editingNote?.updated_at || '',
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      !searchTerm ||
      note.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.servicio_titulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === 'all' || note.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  const totalPendiente = notes
    .filter((n) => n.estado === 'pendiente')
    .reduce((sum, n) => sum + (n.total || (n.neto || 0) * 1.19), 0);
  const totalPagado = notes
    .filter((n) => n.estado === 'pagado')
    .reduce((sum, n) => sum + (n.total || (n.neto || 0) * 1.19), 0);

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <h2 className="section-title">Notas de Cobro</h2>
          <button onClick={openNewEditor} className="btn-primary">
            <Plus className="w-4 h-4" />Nueva Nota
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Total Notas</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{notes.length}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-lg border border-red-200 dark:border-red-500/30">
            <p className="text-red-600 dark:text-red-400 text-xs font-bold uppercase">Pendiente</p>
            <p className="text-2xl font-black text-red-600 dark:text-red-400">{formatCLP(Math.round(totalPendiente))}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-green-500/10 p-4 rounded-lg border border-emerald-200 dark:border-green-500/30">
            <p className="text-emerald-600 dark:text-green-400 text-xs font-bold uppercase">Pagado</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-green-400">{formatCLP(Math.round(totalPagado))}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por cliente, folio o servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pendiente', 'pagado'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterEstado(f)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                  filterEstado === f
                    ? f === 'pendiente'
                      ? 'bg-red-600 text-white'
                      : f === 'pagado'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* DTE Generator */}
        {showDTEGenerator && selectedNote && (
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Generar DTE</h3>
              <button onClick={() => setShowDTEGenerator(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">X</button>
            </div>
            <DTEGenerator
              clientData={{
                name: selectedNote.cliente,
                rut: selectedNote.rut || '',
                email: '',
              }}
              amount={Math.round((selectedNote.neto || 0) * 1.19)}
            />
          </div>
        )}

        {/* Notes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const { iva, total } = calcularTotales(note.neto || 0);
            const noteTotal = note.total || total;
            return (
              <div key={note.id} className="card-hover p-5">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">#{note.folio}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{note.cliente}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">{note.rut}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleEstado(note)}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition whitespace-nowrap ${
                        note.estado === 'pagado'
                          ? 'bg-emerald-50 dark:bg-green-500/20 text-emerald-700 dark:text-green-300 hover:bg-emerald-100 dark:hover:bg-green-500/30'
                          : 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/30'
                      }`}
                    >
                      {note.estado.toUpperCase()}
                    </button>
                    <button
                      onClick={() => handleAutofillFromExisting(note)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 rounded text-xs hover:bg-orange-100 dark:hover:bg-orange-900 transition whitespace-nowrap"
                      title="Repetir este cobro para el mes actual"
                    >
                      <Copy className="w-3 h-3" />
                      Repetir
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">{note.servicio_titulo}</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    Periodo: {note.periodo} | {note.telefono}
                  </p>
                  {(() => {
                    const project = note.proyecto_id ? projects.find(p => p.id === note.proyecto_id) : null;
                    return project ? (
                      <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                        Proyecto: {project.name}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Neto</span>
                    <span>{formatCLP(note.neto || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>IVA (19%)</span>
                    <span>{formatCLP(note.iva || iva)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-blue-600 dark:text-blue-400 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                    <span>Total</span>
                    <span>{formatCLP(noteTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => openPreview(note)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 rounded text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                  >
                    <Eye className="w-3 h-3" />
                    Ver
                  </button>
                  <button
                    onClick={() => openEditor(note)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
                  >
                    <Edit2 className="w-3 h-3" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNote(note);
                      setShowDTEGenerator(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition"
                  >
                    DTE
                  </button>
                  <button
                    onClick={() => handleDelete(note.id!)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredNotes.length === 0 && (
          <div className="empty-state">
            <p className="empty-state-title">No se encontraron notas de cobro</p>
            <p className="empty-state-desc">Crea una nueva nota o ajusta los filtros de búsqueda</p>
          </div>
        )}
      </div>
    );
  }

  // EDITOR VIEW
  if (viewMode === 'editor') {
    return (
      <div>
        <div className="no-print max-w-6xl mx-auto card p-6 rounded-b-3xl md:rounded-3xl shadow-2xl mb-10">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="btn-secondary p-2 rounded-xl"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wide">
                {editingNote ? `Editando #INV-${editingNote.folio}` : 'Nueva Nota de Cobro'}
              </h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode('preview')}
                className="btn-secondary font-bold py-2 px-4 rounded-xl text-xs uppercase flex items-center gap-2"
              >
                <Eye size={14} />
                Vista Previa
              </button>
              <button
                onClick={handlePrintPDF}
                disabled={generatingPDF}
                className="btn-secondary font-bold py-2 px-4 rounded-xl text-xs uppercase disabled:opacity-50 flex items-center gap-2"
              >
                {generatingPDF ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                {generatingPDF ? 'Generando...' : 'Descargar PDF'}
              </button>
              <button
                onClick={handleWhatsApp}
                disabled={generatingPDF}
                className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase transition-all hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
              >
                {generatingPDF ? <Loader size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                {generatingPDF ? 'Preparando...' : 'Cobrar + PDF'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary font-bold py-2 px-4 rounded-xl text-xs uppercase disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-banner mb-4">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-banner mb-4">{success}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-3">
              <label className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">
                Cliente y Contacto
              </label>
              <input type="text" placeholder="Nombre empresa" value={form.cliente}
                onChange={(e) => set('cliente', e.target.value)} className="form-input" />
              <input type="text" placeholder="RUT cliente" value={form.rut}
                onChange={(e) => set('rut', e.target.value)} className="form-input" />
              <input type="tel" placeholder="+56912345678" value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)} className="form-input" />
            </div>

            <div className="space-y-3">
              <label className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">
                Detalles del Servicio
              </label>
              <input type="text" placeholder="Folio (ej: 2026-001)" value={form.folio}
                onChange={(e) => set('folio', e.target.value)}
                className="form-input font-bold" />
              <input type="text" placeholder="Título del servicio" value={form.servicio_titulo}
                onChange={(e) => set('servicio_titulo', e.target.value)} className="form-input" />
              <textarea placeholder="Descripción del servicio..." value={form.servicio_desc}
                onChange={(e) => set('servicio_desc', e.target.value)}
                className="form-input text-[11px] h-14 resize-none" />
            </div>

            <div className="space-y-3">
              <label className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">
                Periodo y Monto
              </label>
              <input type="month" value={form.periodo}
                onChange={(e) => set('periodo', e.target.value)} className="form-input font-bold" />
              <input type="number" placeholder="Monto neto CLP" value={form.neto || ''}
                onChange={(e) => set('neto', parseInt(e.target.value) || 0)} className="form-input font-bold" />
              <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                <div className="flex justify-between px-3 py-2 text-[10px] border-b border-neutral-200 dark:border-neutral-700/60">
                  <span className="text-gray-500 dark:text-gray-400 font-bold uppercase">Neto</span>
                  <span className="text-gray-900 dark:text-white font-bold">{formatCLP(form.neto)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 text-[10px] border-b border-neutral-200 dark:border-neutral-700/60 bg-neutral-100 dark:bg-neutral-800/50">
                  <span className="text-gray-500 dark:text-gray-400 font-bold uppercase">IVA (19%)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{formatCLP(form.iva)}</span>
                </div>
                <div className="flex justify-between px-3 py-2.5 text-[10px] bg-blue-50 dark:bg-blue-600/20">
                  <span className="text-blue-600 dark:text-blue-400 font-black uppercase">Total</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-sm">{formatCLP(form.total)}</span>
                </div>
              </div>
              <select
                value={form.estado}
                onChange={(e) => set('estado', e.target.value as 'pendiente' | 'pagado')}
                className="form-input text-xs uppercase font-bold"
              >
                <option value="pendiente">PENDIENTE</option>
                <option value="pagado">PAGADO</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">
                Cuenta de Depósito
              </label>
              <input type="text" placeholder="Banco / canal" value={form.banco}
                onChange={(e) => set('banco', e.target.value)} className="form-input text-[11px]" />
              <input type="text" placeholder="Número de cuenta" value={form.cuenta}
                onChange={(e) => set('cuenta', e.target.value)} className="form-input text-[11px]" />
              <input type="text" placeholder="Nombre titular" value={form.titular}
                onChange={(e) => set('titular', e.target.value)} className="form-input text-[11px]" />
              <select value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="form-input text-[11px]"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div id="print-root">
          <InvoicePreview invoice={previewInvoice} />
        </div>
      </div>
    );
  }

  // PREVIEW VIEW
  return (
    <div>
      <div className="no-print max-w-6xl mx-auto card p-4 rounded-xl shadow-2xl mb-6 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('list')}
            className="btn-secondary p-2 rounded-xl"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wide">
            Vista Previa #INV-{form.folio}
          </h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setViewMode('editor')}
            className="btn-secondary font-bold py-2 px-4 rounded-xl text-xs uppercase flex items-center gap-2"
          >
            <Edit2 size={14} />
            Editar
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary font-bold py-2 px-4 rounded-xl text-xs uppercase flex items-center gap-2"
          >
            <Printer size={14} />
            Imprimir
          </button>
          <button
            onClick={handlePrintPDF}
            disabled={generatingPDF}
            className="btn-primary font-bold py-2 px-4 rounded-xl text-xs uppercase disabled:opacity-50 flex items-center gap-2"
          >
            {generatingPDF ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
            {generatingPDF ? 'Generando...' : 'Descargar PDF'}
          </button>
          <button
            onClick={handleWhatsApp}
            disabled={generatingPDF}
            className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase transition-all hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2"
          >
            {generatingPDF ? <Loader size={14} className="animate-spin" /> : <MessageCircle size={14} />}
            {generatingPDF ? 'Preparando...' : 'Cobrar + PDF'}
          </button>
        </div>

        {error && (
          <div className="w-full mt-2 error-banner">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="w-full mt-2 success-banner">{success}</div>
        )}
      </div>

      <div id="print-root">
        <InvoicePreview invoice={previewInvoice} />
      </div>
    </div>
  );
}
