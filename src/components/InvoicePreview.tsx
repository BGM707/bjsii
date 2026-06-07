import { Invoice, calcularFechas, calcularTotales, formatCLP } from '../types/invoice';

interface Props {
  invoice: Invoice | Partial<Invoice>;
}

export default function InvoicePreview({ invoice }: Props) {
  const neto = invoice.neto ?? 0;
  const periodo = invoice.periodo ?? new Date().toISOString().slice(0, 7);
  const estado = invoice.estado ?? 'pendiente';
  const folio = invoice.folio ?? '';
  const { iva, total } = calcularTotales(neto);
  const { emision, vencimiento, mesServicio, nombreMes } = calcularFechas(periodo);
  const isPagado = estado === 'pagado';

  return (
    <div
      id="invoice-print-area"
      className="max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-800 p-8 md:p-16 rounded-sm shadow-2xl relative overflow-hidden flex flex-col"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div
        className="absolute top-1/2 left-1/2 pointer-events-none z-0 select-none"
        style={{
          transform: 'translate(-50%, -50%) rotate(-30deg)',
          fontSize: 80,
          fontWeight: 900,
          opacity: isPagado ? 0.12 : 0.08,
          textTransform: 'uppercase',
          border: `10px solid ${isPagado ? '#16a34a' : '#dc2626'}`,
          color: isPagado ? '#16a34a' : '#dc2626',
          padding: '10px 30px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
        }}
      >
        {isPagado ? 'PAGADO' : 'PENDIENTE'}
      </div>

      <div className="flex justify-between items-start mb-12 border-b-4 border-slate-900 pb-8 relative z-10">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 leading-none mb-2 italic uppercase">
            BJ SERVICIOS <br />INFORMÁTICOS <span className="text-blue-600">SpA</span>
          </h2>
          <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em]">RUT: 78.332.298-6</p>
        </div>
        <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 text-center min-w-[150px]">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Aviso de Cobro</p>
          <p className="text-xl font-black text-slate-800 tracking-tighter">
            {folio ? `#INV-${folio}` : '#INV-'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 relative z-10">
        <div>
          <p className="text-[9px] font-black text-blue-600 uppercase mb-2">Cliente Receptor:</p>
          <p className="font-black text-lg text-slate-900">{invoice.cliente || '—'}</p>
          <p className="text-sm text-slate-500 font-bold italic">RUT: {invoice.rut || '—'}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-black">FECHA EMISIÓN:</span>
              <span className="font-black text-slate-700">{emision}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] bg-blue-600 text-white p-1 px-3 rounded-full font-bold">
              <span>SERVICIO MES:</span>
              <span>{mesServicio}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-400 text-[10px] font-black">VENCIMIENTO:</span>
              <span className={`text-sm font-black ${isPagado ? 'text-green-600' : 'text-red-600'}`}>
                {vencimiento}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow relative z-10">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-slate-900 text-[9px] uppercase font-black text-slate-400">
              <th className="text-left py-4">Descripción del Servicio Técnico</th>
              <th className="text-right py-4">Monto Neto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-10 pr-10">
                <p className="font-black text-md text-slate-800 uppercase tracking-tighter">
                  {invoice.servicio_titulo || '—'}
                </p>
                <p className="text-[10px] text-slate-500 mt-2 italic leading-relaxed">
                  {invoice.servicio_desc || ''}{' '}
                  <strong>{nombreMes}</strong>.
                  <br /><br />
                  <span className="text-blue-600 font-bold">• Nota de Servicio:</span>{' '}
                  Se encuentran disponibles los 3 cambios e implementaciones correspondientes a este periodo.
                </p>
              </td>
              <td className="text-right font-black text-lg text-slate-900 italic">
                {formatCLP(neto)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-auto pt-8 border-t-2 border-slate-100 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl w-full md:w-1/2 shadow-xl border-l-8 border-blue-600">
            <p className="text-[8px] font-bold text-blue-400 uppercase mb-3 tracking-[0.2em]">Canal de Transferencia</p>
            <div className="space-y-1 text-[10px] font-mono uppercase opacity-90">
              <p>Banco: <span>{invoice.banco || '—'}</span></p>
              <p>Cuenta: <span>{invoice.cuenta || '—'}</span></p>
              <p>Nombre: <span>{invoice.titular || '—'}</span></p>
              <p>RUT: 19.716.055-1</p>
            </div>
          </div>
          <div className="w-full md:w-1/3 space-y-2">
            <div className="flex justify-between px-2 text-[10px] font-bold text-slate-400 uppercase">
              <span>Neto</span><span>{formatCLP(neto)}</span>
            </div>
            <div className="flex justify-between px-2 text-[10px] font-bold text-slate-400 uppercase">
              <span>IVA (19%)</span><span>{formatCLP(iva)}</span>
            </div>
            <div className="bg-blue-600 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg">
              <span className="text-[8px] font-black uppercase italic tracking-widest">Total CLP</span>
              <span className="text-2xl font-black">{formatCLP(total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-[9px] font-black text-slate-900 uppercase italic mb-1">Nota Legal y Facturación:</p>
          <p className="text-[9px] text-slate-500 leading-tight">
            Este documento constituye un aviso de cobro previo. Una vez verificado el depósito en la cuenta señalada,
            el emisor dispone de las horas legales correspondientes para la emisión y envío de la Factura Electrónica
            respectiva vía SII. Los cambios técnicos disponibles para el mes deben ser solicitados formalmente
            por los canales de soporte.
          </p>
        </div>

        <p className="text-center mt-6 text-[7px] font-bold text-slate-300 uppercase tracking-[0.4em] italic leading-relaxed">
          Aviso generado por cloud BJ SERVICIOS INFORMÁTICOS SpA <br />
          Para consultas o reclamos, contáctanos al +56941228089
        </p>
      </div>
    </div>
  );
}
