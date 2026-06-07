import React, { useState, useEffect } from 'react';
import { FileDown, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase, getAuthUserId } from '../lib/supabase';
import { generateDTEXML, generateElectronicSeal, downloadDTEFile, downloadElectronicSeal, validateRUT } from '../lib/dte';

interface DTEGeneratorProps {
  receiptId?: string;
  clientData?: {
    name: string;
    rut: string;
    email?: string;
  };
  amount?: number;
}

export default function DTEGenerator({ receiptId, clientData, amount = 0 }: DTEGeneratorProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dtes, setDtes] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    folio: generateFolio(),
    recipientName: clientData?.name || '',
    recipientRut: clientData?.rut || '',
    documentType: 'boleta',
    amount: amount || 0,
    description: 'Servicios Profesionales'
  });

  useEffect(() => {
    loadDTEs();
  }, []);

  function generateFolio(): string {
    return 'DTE' + Date.now().toString().slice(-6);
  }

  const loadDTEs = async () => {
    try {
      const { data, error: err } = await supabase
        .from('dte_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setDtes(data || []);
    } catch (err) {
      console.error('Error loading DTEs:', err);
    }
  };

  const handleGenerateDTE = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!validateRUT(formData.recipientRut)) {
        throw new Error('RUT del receptor inválido');
      }

      const net = formData.amount;
      const iva = Math.round(net * 0.19);
      const total = net + iva;

      const dteData = {
        folio: formData.folio,
        company_rut: '78.332.298-6',
        company_name: 'BJ SERVICIOS INFORMÁTICOS SpA',
        document_type: formData.documentType,
        recipient_rut: formData.recipientRut,
        recipient_name: formData.recipientName,
        issue_date: new Date(),
        net_amount: net,
        iva_amount: iva,
        total_amount: total,
        description: formData.description,
        items: [{
          line_number: 1,
          description: formData.description,
          quantity: 1,
          unit_price: net,
          total: net
        }]
      };

      const xml = generateDTEXML(dteData);
      const seal = generateElectronicSeal(formData.folio, xml);

      const userId = await getAuthUserId();
      const { error: insertErr } = await supabase
        .from('dte_documents')
        .insert([{
          folio: formData.folio,
          company_rut: '78.332.298-6',
          company_name: 'BJ SERVICIOS INFORMÁTICOS SpA',
          document_type: formData.documentType,
          recipient_rut: formData.recipientRut,
          recipient_name: formData.recipientName,
          issue_date: new Date().toISOString().split('T')[0],
          net_amount: net,
          iva_amount: iva,
          total_amount: total,
          document_description: formData.description,
          xml_content: xml,
          electronic_seal: seal,
          sii_status: 'pending',
          receipt_id: receiptId || null,
          user_id: userId,
        }]);

      if (insertErr) throw insertErr;

      downloadDTEFile(xml, formData.folio);
      downloadElectronicSeal(seal, formData.folio);

      setFormData({
        folio: generateFolio(),
        recipientName: clientData?.name || '',
        recipientRut: clientData?.rut || '',
        documentType: 'boleta',
        amount: amount || 0,
        description: 'Servicios Profesionales'
      });

      loadDTEs();
      setShowGenerator(false);
    } catch (err: any) {
      setError(err.message || 'Error al generar DTE');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">DTE - Timbre Electrónico SII</h3>
        <button
          onClick={() => setShowGenerator(!showGenerator)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          <FileDown className="w-4 h-4" />
          Generar DTE
        </button>
      </div>

      {showGenerator && (
        <form onSubmit={handleGenerateDTE} className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-3">
          {error && (
            <div className="error-banner flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/20 border border-red-300 dark:border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Folio</label>
              <input
                type="text"
                value={formData.folio}
                onChange={(e) => setFormData({ ...formData, folio: e.target.value })}
                className="form-input w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
                disabled
              />
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-1">Tipo Documento</label>
              <select
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                className="form-input w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
              >
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
                <option value="nota_credito">Nota Crédito</option>
                <option value="nota_debito">Nota Débito</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre Receptor"
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              className="form-input bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
              required
            />
            <input
              type="text"
              placeholder="RUT Receptor (ej: 12.345.678-9)"
              value={formData.recipientRut}
              onChange={(e) => setFormData({ ...formData, recipientRut: e.target.value })}
              className="form-input bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
              required
            />
          </div>

          <textarea
            placeholder="Descripción del servicio"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="form-input w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
            rows={2}
          />

          <input
            type="number"
            placeholder="Monto Neto"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
            className="form-input w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-2 text-gray-900 dark:text-white text-sm"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-success w-full bg-emerald-600 dark:bg-green-600 text-white py-2 rounded-lg hover:bg-emerald-700 dark:hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? 'Generando...' : 'Generar y Descargar DTE + Timbre'}
          </button>
        </form>
      )}

      {dtes.length > 0 && (
        <div className="space-y-2">
          <p className="text-gray-500 dark:text-gray-400 text-sm">DTEs Generados:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {dtes.map(dte => (
              <div key={dte.id} className="bg-white dark:bg-neutral-800 p-3 rounded border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-900 dark:text-white font-bold text-sm">#{dte.folio}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    dte.sii_status === 'registered' ? 'bg-emerald-50 dark:bg-green-500/20 text-emerald-700 dark:text-green-300' :
                    dte.sii_status === 'rejected' ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300' :
                    'bg-amber-50 dark:bg-yellow-500/20 text-amber-700 dark:text-yellow-300'
                  }`}>
                    {dte.sii_status === 'registered' ? 'Registrado' : dte.sii_status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{dte.recipient_name}</p>
                <p className="text-gray-700 dark:text-gray-300 text-xs mb-2">Total: ${dte.total_amount.toLocaleString('es-CL')}</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const element = document.createElement('a');
                      element.setAttribute('href', 'data:text/xml;charset=utf-8,' + encodeURIComponent(dte.xml_content));
                      element.setAttribute('download', `DTE_${dte.folio}.xml`);
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="flex-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
                  >
                    XML
                  </button>
                  <button
                    onClick={() => {
                      const element = document.createElement('a');
                      element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dte.electronic_seal));
                      element.setAttribute('download', `TIMBRE_${dte.folio}.json`);
                      document.body.appendChild(element);
                      element.click();
                      document.body.removeChild(element);
                    }}
                    className="flex-1 text-xs bg-violet-600 text-white px-2 py-1 rounded hover:bg-violet-700 transition"
                  >
                    Timbre
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
