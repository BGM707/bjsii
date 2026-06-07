import { useState, useEffect } from 'react';
import { FileText, ClipboardList, Printer, Download, Mail, Eye, RefreshCw, Search, CreditCard } from 'lucide-react';
import { localDB, Receipt, ServiceOrder, Quotation } from '../lib/database';
import { exportToPDF, exportToExcel, sendEmail } from '../utils/export';

export default function DocumentsList() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'receipts' | 'orders' | 'quotations'>('receipts');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      await localDB.initialize();
      const [receiptsResult, ordersResult, quotationsResult] = await Promise.all([
        localDB.getReceipts(),
        localDB.getServiceOrders(),
        localDB.getQuotations(),
      ]);

      setReceipts(receiptsResult || []);
      setServiceOrders(ordersResult || []);
      setQuotations(quotationsResult || []);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredReceipts = receipts.filter(receipt =>
    receipt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (receipt.receipt_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = serviceOrders.filter(order =>
    order.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.order_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuotations = quotations.filter(quotation =>
    quotation.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (quotation.quotation_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = (doc: Receipt | ServiceOrder | Quotation, type: 'receipt' | 'service_order' | 'quotation') => {
    window.print();
  };

  const handleExportPDF = async (doc: Receipt | ServiceOrder | Quotation, type: 'receipt' | 'service_order' | 'quotation') => {
    await exportToPDF(type, doc);
  };

  const handleExportExcel = async (doc: Receipt | ServiceOrder | Quotation, type: 'receipt' | 'service_order' | 'quotation') => {
    await exportToExcel(type, doc);
  };

  const handleSendEmail = async (doc: Receipt | ServiceOrder | Quotation, type: 'receipt' | 'service_order' | 'quotation') => {
    const email = 'client_email' in doc ? doc.client_email : '';
    if (!email) {
      alert('Este documento no tiene un correo electrónico asociado');
      return;
    }
    await sendEmail(email, type, doc);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      delivered: 'bg-purple-100 text-purple-800',
    };

    const labels = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completado',
      delivered: 'Entregado',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getQuotationStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      expired: 'Expirada',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Documentos</h2>
        <button
          onClick={loadData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre o número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="border-b mb-6">
        <div className="flex overflow-x-auto space-x-4 sm:space-x-8 pb-2 sm:pb-0">
          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'receipts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium text-sm sm:text-base">Boletas ({filteredReceipts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="font-medium text-sm sm:text-base">Órdenes ({filteredOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quotations')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'quotations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="font-medium text-sm sm:text-base">Cotizaciones ({filteredQuotations.length})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando documentos...</p>
        </div>
      ) : (
        <>
          {activeTab === 'receipts' && (
            <div className="space-y-4">
              {filteredReceipts.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No hay boletas registradas</p>
                </div>
              ) : (
                filteredReceipts.map((receipt) => (
                  <div key={receipt.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{receipt.receipt_number}</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-sm text-gray-600">Cliente</p>
                            <p className="font-medium text-gray-900">{receipt.client_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="font-bold text-green-600 text-lg">${receipt.total.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Fecha</p>
                            <p className="font-medium text-gray-900">
                              {new Date(receipt.created_at || '').toLocaleDateString('es-CL')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Items</p>
                            <p className="font-medium text-gray-900">{receipt.items.length} productos/servicios</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:space-x-2 sm:space-y-0 space-y-2 ml-4">
                        <button
                          onClick={() => handlePrint(receipt, 'receipt')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Imprimir"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleExportPDF(receipt, 'receipt')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Exportar a PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {receipt.client_email && (
                          <button
                            onClick={() => handleSendEmail(receipt, 'receipt')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Enviar por correo"
                          >
                            <Mail className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No hay órdenes de servicio registradas</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <ClipboardList className="w-5 h-5 text-green-600" />
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{order.order_number}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-sm text-gray-600">Cliente</p>
                            <p className="font-medium text-gray-900">{order.client_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Dispositivo</p>
                            <p className="font-medium text-gray-900">
                              {order.device_type.join(', ').toUpperCase()} - {order.device_brand} {order.device_model}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Servicio</p>
                            <p className="font-medium text-gray-900">{order.service_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Costo Estimado</p>
                            <p className="font-bold text-green-600 text-lg">${order.estimated_cost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Fecha de Creación</p>
                            <p className="font-medium text-gray-900">
                              {new Date(order.created_at || '').toLocaleDateString('es-CL')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:space-x-2 sm:space-y-0 space-y-2 ml-4">
                        <button
                          onClick={() => handlePrint(order, 'service_order')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Imprimir"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleExportPDF(order, 'service_order')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Exportar a PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {order.client_email && (
                          <button
                            onClick={() => handleSendEmail(order, 'service_order')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Enviar por correo"
                          >
                            <Mail className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'quotations' && (
            <div className="space-y-4">
              {filteredQuotations.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No hay cotizaciones registradas</p>
                </div>
              ) : (
                filteredQuotations.map((quotation) => (
                  <div key={quotation.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <CreditCard className="w-5 h-5 text-purple-600" />
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900">{quotation.quotation_number}</h3>
                          {getQuotationStatusBadge(quotation.status)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-sm text-gray-600">Cliente</p>
                            <p className="font-medium text-gray-900">{quotation.client_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="font-bold text-green-600 text-lg">${quotation.total.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Fecha de Creación</p>
                            <p className="font-medium text-gray-900">
                              {new Date(quotation.created_at || '').toLocaleDateString('es-CL')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Items</p>
                            <p className="font-medium text-gray-900">{quotation.items.length} productos/servicios</p>
                          </div>
                          {quotation.valid_until && (
                            <div>
                              <p className="text-sm text-gray-600">Válida hasta</p>
                              <p className="font-medium text-gray-900">
                                {new Date(quotation.valid_until).toLocaleDateString('es-CL')}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-600">Descuentos</p>
                            <p className="font-medium text-red-600">-${quotation.total_discount.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:space-x-2 sm:space-y-0 space-y-2 ml-4">
                        <button
                          onClick={() => handlePrint(quotation, 'quotation')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Imprimir"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleExportPDF(quotation, 'quotation')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Exportar a PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {quotation.client_email && (
                          <button
                            onClick={() => handleSendEmail(quotation, 'quotation')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Enviar por correo"
                          >
                            <Mail className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
