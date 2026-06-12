import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, Mail, Download, Eye, EyeOff, Percent, DollarSign } from 'lucide-react';
import { localDB, Quotation, DocumentItem } from '../lib/database';
import { supabase, Project, getAuthUserId } from '../lib/supabase';
import { exportToPDF, exportToExcel, sendEmail } from '../utils/export';
import { showSuccess, showError, showWarning, showToast } from '../lib/alerts';

export default function QuotationForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastQuotationNumber, setLastQuotationNumber] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [taxRate, setTaxRate] = useState(19);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    valid_until: '',
    terms: '',
    status: 'pending' as 'pending' | 'accepted' | 'rejected' | 'expired',
  });

  useEffect(() => {
    const loadProjects = async () => {
      const { data } = await supabase.from('projects').select('*').order('name');
      setProjects(data || []);
    };
    loadProjects();
  }, []);

  const [items, setItems] = useState<DocumentItem[]>([
    { 
      description: '', 
      quantity: 1, 
      price: 0, 
      total: 0,
      discount_type: 'percentage',
      discount_value: 0,
      discount_amount: 0,
      final_total: 0
    }
  ]);

  const calculateItemTotals = (item: DocumentItem): DocumentItem => {
    const baseTotal = item.quantity * item.price;
    let discountAmount = 0;

    if (item.discount_type === 'percentage') {
      discountAmount = baseTotal * ((item.discount_value || 0) / 100);
    } else {
      discountAmount = item.discount_value || 0;
    }

    const finalTotal = baseTotal - discountAmount;

    return {
      ...item,
      total: baseTotal,
      discount_amount: discountAmount,
      final_total: Math.max(0, finalTotal)
    };
  };

  const calculateTotals = (currentItems: DocumentItem[]) => {
    const itemsWithTotals = currentItems.map(calculateItemTotals);
    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.final_total, 0);
    const totalDiscount = itemsWithTotals.reduce((sum, item) => sum + item.discount_amount, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    return { subtotal, totalDiscount, tax, total, itemsWithTotals };
  };

  const addItem = () => {
    setItems([...items, { 
      description: '', 
      quantity: 1, 
      price: 0, 
      total: 0,
      discount_type: 'percentage',
      discount_value: 0,
      discount_amount: 0,
      final_total: 0
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof DocumentItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate totals for this item
    newItems[index] = calculateItemTotals(newItems[index]);
    
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await localDB.initialize();
      const { subtotal, totalDiscount, tax, total, itemsWithTotals } = calculateTotals(items);

      const quotation: Quotation = {
        ...formData,
        items: itemsWithTotals,
        subtotal,
        total_discount: totalDiscount,
        tax_rate: taxRate,
        tax,
        total,
      };

      const result = await localDB.createQuotation(quotation);
      setLastQuotationNumber(result.quotation_number || '');

      // Also save to Supabase projects.quotations array
      if (selectedProjectId) {
        const userId = await getAuthUserId();
        const { data: project } = await supabase
          .from('projects')
          .select('quotations')
          .eq('id', selectedProjectId)
          .maybeSingle();
        if (project) {
          const existing = project.quotations || [];
          await supabase
            .from('projects')
            .update({ quotations: [...existing, result.quotation_number || ''] })
            .eq('id', selectedProjectId);
        }
      }

      setSuccess(true);

      // Reset form
      setFormData({
        client_name: '',
        client_email: '',
        client_phone: '',
        client_address: '',
        valid_until: '',
        terms: '',
        status: 'pending',
      });
      setItems([{ 
        description: '', 
        quantity: 1,
        price: 0,
        total: 0,
        discount_type: 'percentage',
        discount_value: 0,
        discount_amount: 0,
        final_total: 0
      }]);
    } catch (error) {
      console.error('Error al crear cotización:', error);
      showError('Error', 'No se pudo crear la cotización. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const { subtotal, totalDiscount, tax, total, itemsWithTotals } = calculateTotals(items);
    const quotation: Quotation = {
      ...formData,
      quotation_number: lastQuotationNumber,
      items: itemsWithTotals,
      subtotal,
      total_discount: totalDiscount,
      tax_rate: taxRate,
      tax,
      total,
    };
    await exportToPDF('quotation', quotation);
    showToast('success', 'PDF exportado');
  };

  const handleExportExcel = async () => {
    const { subtotal, totalDiscount, tax, total, itemsWithTotals } = calculateTotals(items);
    const quotation: Quotation = {
      ...formData,
      quotation_number: lastQuotationNumber,
      items: itemsWithTotals,
      subtotal,
      total_discount: totalDiscount,
      tax_rate: taxRate,
      tax,
      total,
    };
    await exportToExcel('quotation', quotation);
    showToast('success', 'Excel exportado');
  };

  const handleSendEmail = async () => {
    if (!formData.client_email) {
      showWarning('Sin correo', 'Por favor ingrese un correo electrónico del cliente');
      return;
    }
    const { subtotal, totalDiscount, tax, total, itemsWithTotals } = calculateTotals(items);
    const quotation: Quotation = {
      ...formData,
      quotation_number: lastQuotationNumber,
      items: itemsWithTotals,
      subtotal,
      total_discount: totalDiscount,
      tax_rate: taxRate,
      tax,
      total,
    };
    await sendEmail(formData.client_email, 'quotation', quotation);
    showToast('success', 'Email enviado');
  };

  const { subtotal, totalDiscount, tax, total } = calculateTotals(items);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-8">
      {/* Formulario */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Nueva Cotización</h2>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="xl:hidden flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="text-sm">{showPreview ? 'Ocultar' : 'Ver'} Vista Previa</span>
          </button>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-green-800 font-medium">¡Cotización creada exitosamente!</p>
                <p className="text-green-700 text-sm mt-1">Número: {lastQuotationNumber}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrint}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Imprimir"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={handleExportPDF}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Exportar a PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendEmail}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Enviar por correo"
                >
                  <Mail className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Cliente */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Cliente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.client_address}
                  onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Válida Hasta
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="pending">Pendiente</option>
                  <option value="accepted">Aceptada</option>
                  <option value="rejected">Rechazada</option>
                  <option value="expired">Expirada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Proyecto Asociado
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Términos y Condiciones
                </label>
                <textarea
                  rows={3}
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Términos y condiciones de la cotización..."
                />
              </div>
            </div>
          </div>

          {/* Productos/Servicios */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <h3 className="text-lg font-semibold text-gray-900">Productos/Servicios</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Item</span>
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2 lg:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio Unit.
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subtotal
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={`$${item.total.toFixed(2)}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo Descuento
                      </label>
                      <select
                        value={item.discount_type}
                        onChange={(e) => updateItem(index, 'discount_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="percentage">Porcentaje</option>
                        <option value="fixed">Monto Fijo</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {item.discount_type === 'percentage' ? 'Descuento (%)' : 'Descuento ($)'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step={item.discount_type === 'percentage' ? '0.1' : '0.01'}
                          max={item.discount_type === 'percentage' ? '100' : undefined}
                          value={item.discount_value || 0}
                          onChange={(e) => updateItem(index, 'discount_value', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {item.discount_type === 'percentage' ? (
                            <Percent className="w-4 h-4 text-gray-400" />
                          ) : (
                            <DollarSign className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descuento Aplicado
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={`-$${(item.discount_amount || 0).toFixed(2)}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-red-50 text-red-600"
                      />
                    </div>

                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Final
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={`$${(item.final_total || 0).toFixed(2)}`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-green-50 text-green-600 font-semibold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className={`p-2 rounded-lg transition-colors ${
                          items.length === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuración de IVA */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración de Impuestos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Porcentaje de IVA (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtotal
                </label>
                <input
                  type="text"
                  readOnly
                  value={`$${subtotal.toFixed(2)}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Descuentos
                </label>
                <input
                  type="text"
                  readOnly
                  value={`-$${totalDiscount.toFixed(2)}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-red-50 text-red-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IVA Calculado
                </label>
                <input
                  type="text"
                  readOnly
                  value={`$${tax.toFixed(2)}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Totales */}
          <div className="border-t pt-6">
            <div className="flex justify-end">
              <div className="w-full sm:w-80 space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="font-medium">Descuentos:</span>
                  <span className="font-semibold">-${totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="font-medium">IVA ({taxRate}%):</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-3">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Guardando...' : 'Guardar Cotización'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Vista Previa */}
      <div className={`${showPreview ? 'block' : 'hidden'} xl:block`}>
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 sticky top-4">
          <div className="flex items-center space-x-2 mb-6">
            <Eye className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Vista Previa</h3>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 bg-gray-50 text-sm">
            {/* Header de la empresa */}
            <div className="text-center mb-6 pb-4 border-b-2 border-purple-600">
              <h1 className="text-lg sm:text-xl font-bold text-purple-600 mb-1">Benjamin González Tecnología</h1>
              <p className="text-xs text-gray-600">Servicios de Reparación • Venta • Instalación de Cámaras • Soluciones Tecnológicas</p>
            </div>

            {/* Número de cotización */}
            <div className="text-center bg-gray-100 py-3 mb-4 rounded">
              <p className="font-bold text-base sm:text-lg">COTIZACIÓN: {success ? lastQuotationNumber : 'PREVIEW-COT-001'}</p>
            </div>

            {/* Información del cliente */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2 bg-purple-600 text-white px-3 py-1 text-sm">Información del Cliente</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600">Cliente:</span>
                  <p className="font-medium">{formData.client_name || 'Sin especificar'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium">{formData.client_email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Teléfono:</span>
                  <p className="font-medium">{formData.client_phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Fecha:</span>
                  <p className="font-medium">{new Date().toLocaleDateString('es-CL')}</p>
                </div>
                {formData.valid_until && (
                  <div>
                    <span className="text-gray-600">Válida hasta:</span>
                    <p className="font-medium">{new Date(formData.valid_until).toLocaleDateString('es-CL')}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Estado:</span>
                  <p className="font-medium capitalize">{formData.status}</p>
                </div>
              </div>
              {formData.client_address && (
                <div className="mt-2 text-xs sm:text-sm">
                  <span className="text-gray-600">Dirección:</span>
                  <p className="font-medium">{formData.client_address}</p>
                </div>
              )}
            </div>

            {/* Productos/Servicios */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2 bg-purple-600 text-white px-3 py-1 text-sm">Detalle de Productos/Servicios</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-2 py-1 text-left">Descripción</th>
                      <th className="border border-gray-300 px-2 py-1 text-center">Cant.</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Precio</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Subtotal</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Desc.</th>
                      <th className="border border-gray-300 px-2 py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const calculatedItem = calculateItemTotals(item);
                      return (
                        <tr key={index}>
                          <td className="border border-gray-300 px-2 py-1">{item.description || 'Sin descripción'}</td>
                          <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity}</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">${item.price.toFixed(2)}</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">${calculatedItem.total.toFixed(2)}</td>
                          <td className="border border-gray-300 px-2 py-1 text-right text-red-600">-${calculatedItem.discount_amount.toFixed(2)}</td>
                          <td className="border border-gray-300 px-2 py-1 text-right font-semibold">${calculatedItem.final_total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totales */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-full sm:w-48 space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Descuentos:</span>
                    <span className="font-semibold">-${totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA ({taxRate}%):</span>
                    <span className="font-semibold">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-bold text-sm sm:text-base">
                    <span>TOTAL:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Términos */}
            {formData.terms && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Términos y Condiciones</h4>
                <p className="text-xs text-gray-600">{formData.terms}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center mt-6 pt-4 border-t text-xs text-gray-600">
              <p>Gracias por su preferencia</p>
              <p>Benjamin González Tecnología - Todos los derechos reservados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}