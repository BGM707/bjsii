import { Receipt, ServiceOrder, Quotation } from '../lib/database';

export const exportToPDF = async (type: 'receipt' | 'service_order' | 'quotation', data: Receipt | ServiceOrder | Quotation) => {
  const printContent = generatePrintHTML(type, data);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  }
};

export const exportToExcel = async (type: 'receipt' | 'service_order' | 'quotation', data: Receipt | ServiceOrder | Quotation) => {
  let csvContent = '';

  if (type === 'receipt') {
    const receipt = data as Receipt;
    csvContent = 'Benjamin González Tecnología - Boleta\n\n';
    csvContent += `Número de Boleta:,${receipt.receipt_number}\n`;
    csvContent += `Cliente:,${receipt.client_name}\n`;
    csvContent += `Email:,${receipt.client_email || ''}\n`;
    csvContent += `Teléfono:,${receipt.client_phone || ''}\n`;
    csvContent += `Dirección:,${receipt.client_address || ''}\n`;
    csvContent += `Fecha:,${new Date(receipt.created_at || '').toLocaleDateString('es-CL')}\n\n`;

    csvContent += 'Descripción,Cantidad,Precio Unitario,Total\n';
    receipt.items.forEach(item => {
      csvContent += `"${item.description}",${item.quantity},${item.price},${item.total}\n`;
    });

    csvContent += `\nSubtotal:,,,${receipt.subtotal}\n`;
    csvContent += `IVA (19%):,,,${receipt.tax}\n`;
    csvContent += `Total:,,,${receipt.total}\n`;
  } else if (type === 'service_order') {
    const order = data as ServiceOrder;
    csvContent = 'Benjamin González Tecnología - Orden de Servicio\n\n';
    csvContent += `Número de Orden:,${order.order_number}\n`;
    csvContent += `Cliente:,${order.client_name}\n`;
    csvContent += `Email:,${order.client_email || ''}\n`;
    csvContent += `Teléfono:,${order.client_phone || ''}\n`;
    csvContent += `Dirección:,${order.client_address || ''}\n`;
    csvContent += `Tipo de Dispositivo:,${order.device_type.join(', ')}\n`;
    csvContent += `Marca:,${order.device_brand || ''}\n`;
    csvContent += `Modelo:,${order.device_model || ''}\n`;
    csvContent += `Serie:,${order.device_serial || ''}\n`;
    csvContent += `Tipo de Servicio:,${order.service_type}\n`;
    csvContent += `Estado:,${order.status}\n`;
    csvContent += `Costo Estimado:,${order.estimated_cost}\n`;
    csvContent += `Problema:,"${order.problem_description || ''}"\n`;
    csvContent += `Notas:,"${order.notes || ''}"\n`;
    csvContent += `Fecha:,${new Date(order.created_at || '').toLocaleDateString('es-CL')}\n`;
  } else if (type === 'quotation') {
    const quotation = data as Quotation;
    csvContent = 'Benjamin González Tecnología - Cotización\n\n';
    csvContent += `Número de Cotización:,${quotation.quotation_number}\n`;
    csvContent += `Cliente:,${quotation.client_name}\n`;
    csvContent += `Email:,${quotation.client_email || ''}\n`;
    csvContent += `Teléfono:,${quotation.client_phone || ''}\n`;
    csvContent += `Dirección:,${quotation.client_address || ''}\n`;
    csvContent += `Estado:,${quotation.status}\n`;
    csvContent += `Válida hasta:,${quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('es-CL') : ''}\n`;
    csvContent += `Fecha:,${new Date(quotation.created_at || '').toLocaleDateString('es-CL')}\n\n`;

    csvContent += 'Descripción,Cantidad,Precio Unitario,Subtotal,Descuento,Total\n';
    quotation.items.forEach(item => {
      csvContent += `"${item.description}",${item.quantity},${item.price},${item.total},${item.discount_amount || 0},${item.final_total || item.total}\n`;
    });

    csvContent += `\nSubtotal:,,,,,${quotation.subtotal}\n`;
    csvContent += `Descuentos:,,,,,${quotation.total_discount}\n`;
    csvContent += `IVA (${quotation.tax_rate}%):,,,,,${quotation.tax}\n`;
    csvContent += `Total:,,,,,${quotation.total}\n`;

    if (quotation.terms) {
      csvContent += `\nTérminos y Condiciones:,"${quotation.terms}"\n`;
    }
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const filename = type === 'receipt'
    ? `boleta-${(data as Receipt).receipt_number}.csv`
    : type === 'service_order'
    ? `orden-${(data as ServiceOrder).order_number}.csv`
    : `cotizacion-${(data as Quotation).quotation_number}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const sendEmail = async (email: string, type: 'receipt' | 'service_order' | 'quotation', data: Receipt | ServiceOrder | Quotation) => {
  const subject = type === 'receipt'
    ? `Boleta ${(data as Receipt).receipt_number} - Benjamin González Tecnología`
    : type === 'service_order'
    ? `Orden de Servicio ${(data as ServiceOrder).order_number} - Benjamin González Tecnología`
    : `Cotización ${(data as Quotation).quotation_number} - Benjamin González Tecnología`;

  let body = 'Benjamin González Tecnología\n';
  body += 'Servicios de Reparación, Venta, Instalación de Cámaras y Soluciones Tecnológicas\n\n';

  if (type === 'receipt') {
    const receipt = data as Receipt;
    body += `BOLETA: ${receipt.receipt_number}\n\n`;
    body += `Cliente: ${receipt.client_name}\n`;
    body += `Fecha: ${new Date(receipt.created_at || '').toLocaleDateString('es-CL')}\n\n`;
    body += 'DETALLE:\n';
    receipt.items.forEach(item => {
      body += `${item.description} - Cant: ${item.quantity} x $${item.price} = $${item.total}\n`;
    });
    body += `\nSubtotal: $${receipt.subtotal}\n`;
    body += `IVA (19%): $${receipt.tax}\n`;
    body += `TOTAL: $${receipt.total}\n`;
  } else if (type === 'service_order') {
    const order = data as ServiceOrder;
    body += `ORDEN DE SERVICIO: ${order.order_number}\n\n`;
    body += `Cliente: ${order.client_name}\n`;
    body += `Dispositivo: ${order.device_type.join(', ')} - ${order.device_brand} ${order.device_model}\n`;
    body += `Servicio: ${order.service_type}\n`;
    body += `Estado: ${order.status}\n`;
    body += `Costo Estimado: $${order.estimated_cost}\n\n`;
    if (order.problem_description) {
      body += `Problema: ${order.problem_description}\n\n`;
    }
    body += `Fecha: ${new Date(order.created_at || '').toLocaleDateString('es-CL')}\n`;
  } else if (type === 'quotation') {
    const quotation = data as Quotation;
    body += `COTIZACIÓN: ${quotation.quotation_number}\n\n`;
    body += `Cliente: ${quotation.client_name}\n`;
    body += `Estado: ${quotation.status}\n`;
    if (quotation.valid_until) {
      body += `Válida hasta: ${new Date(quotation.valid_until).toLocaleDateString('es-CL')}\n`;
    }
    body += `Fecha: ${new Date(quotation.created_at || '').toLocaleDateString('es-CL')}\n\n`;
    body += 'DETALLE:\n';
    quotation.items.forEach(item => {
      const discount = item.discount_amount ? ` (Desc: -$${item.discount_amount})` : '';
      body += `${item.description} - Cant: ${item.quantity} x $${item.price}${discount} = $${item.final_total || item.total}\n`;
    });
    body += `\nSubtotal: $${quotation.subtotal}\n`;
    body += `Descuentos: -$${quotation.total_discount}\n`;
    body += `IVA (${quotation.tax_rate}%): $${quotation.tax}\n`;
    body += `TOTAL: $${quotation.total}\n`;
    if (quotation.terms) {
      body += `\nTérminos: ${quotation.terms}\n`;
    }
  }

  body += '\n\nGracias por confiar en Benjamin González Tecnología';

  const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
};

const generatePrintHTML = (type: 'receipt' | 'service_order' | 'quotation', data: Receipt | ServiceOrder | Quotation): string => {
  const commonStyles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 20px; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
      .header h1 { color: #2563eb; font-size: 28px; margin-bottom: 5px; }
      .header p { color: #666; font-size: 12px; }
      .doc-number { text-align: center; background: #f3f4f6; padding: 15px; margin: 20px 0; font-size: 18px; font-weight: bold; }
      .section { margin: 20px 0; }
      .section-title { background: #2563eb; color: white; padding: 8px 12px; font-weight: bold; margin-bottom: 10px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
      .info-item { margin-bottom: 10px; }
      .info-label { color: #666; font-size: 12px; }
      .info-value { font-weight: bold; color: #000; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #ddd; }
      td { padding: 10px; border: 1px solid #ddd; }
      .totals { margin-top: 20px; float: right; width: 300px; }
      .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
      .totals-row.final { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: bold; }
      .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
  `;

  if (type === 'receipt') {
    const receipt = data as Receipt;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Boleta ${receipt.receipt_number}</title>
        ${commonStyles}
      </head>
      <body>
        <div class="header">
          <h1>Benjamin González Tecnología</h1>
          <p>Servicios de Reparación • Venta • Instalación de Cámaras • Soluciones Tecnológicas</p>
        </div>

        <div class="doc-number">BOLETA: ${receipt.receipt_number}</div>

        <div class="section">
          <div class="section-title">Información del Cliente</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Cliente</div>
              <div class="info-value">${receipt.client_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${receipt.client_email || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Teléfono</div>
              <div class="info-value">${receipt.client_phone || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Dirección</div>
              <div class="info-value">${receipt.client_address || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha</div>
              <div class="info-value">${new Date(receipt.created_at || '').toLocaleDateString('es-CL')}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Detalle de Productos/Servicios</div>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${receipt.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>$${receipt.subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>IVA (19%):</span>
              <span>$${receipt.tax.toFixed(2)}</span>
            </div>
            <div class="totals-row final">
              <span>TOTAL:</span>
              <span>$${receipt.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Gracias por su preferencia</p>
          <p>Benjamin González Tecnología - Todos los derechos reservados</p>
        </div>
      </body>
      </html>
    `;
  } else if (type === 'service_order') {
    const order = data as ServiceOrder;
    const statusLabels: Record<string, string> = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completado',
      delivered: 'Entregado',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Orden de Servicio ${order.order_number}</title>
        ${commonStyles}
      </head>
      <body>
        <div class="header">
          <h1>Benjamin González Tecnología</h1>
          <p>Servicios de Reparación • Venta • Instalación de Cámaras • Soluciones Tecnológicas</p>
        </div>

        <div class="doc-number">ORDEN DE SERVICIO: ${order.order_number}</div>

        <div class="section">
          <div class="section-title">Información del Cliente</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Cliente</div>
              <div class="info-value">${order.client_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${order.client_email || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Teléfono</div>
              <div class="info-value">${order.client_phone || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Dirección</div>
              <div class="info-value">${order.client_address || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Información del Dispositivo</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Tipo de Dispositivo</div>
              <div class="info-value">${order.device_type.join(', ').toUpperCase()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Marca</div>
              <div class="info-value">${order.device_brand || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Modelo</div>
              <div class="info-value">${order.device_model || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Número de Serie</div>
              <div class="info-value">${order.device_serial || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Detalles del Servicio</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Tipo de Servicio</div>
              <div class="info-value">${order.service_type}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado</div>
              <div class="info-value">${statusLabels[order.status] || order.status}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Costo Estimado</div>
              <div class="info-value">$${order.estimated_cost.toFixed(2)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha</div>
              <div class="info-value">${new Date(order.created_at || '').toLocaleDateString('es-CL')}</div>
            </div>
          </div>

          ${order.problem_description ? `
            <div class="info-item" style="margin-top: 15px;">
              <div class="info-label">Descripción del Problema</div>
              <div class="info-value">${order.problem_description}</div>
            </div>
          ` : ''}

          ${order.notes ? `
            <div class="info-item" style="margin-top: 15px;">
              <div class="info-label">Notas Adicionales</div>
              <div class="info-value">${order.notes}</div>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Gracias por confiar en nuestros servicios</p>
          <p>Benjamin González Tecnología - Todos los derechos reservados</p>
        </div>
      </body>
      </html>
    `;
  } else if (type === 'quotation') {
    const quotation = data as Quotation;
    const statusLabels: Record<string, string> = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      expired: 'Expirada',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cotización ${quotation.quotation_number}</title>
        ${commonStyles}
      </head>
      <body>
        <div class="header">
          <h1>Benjamin González Tecnología</h1>
          <p>Servicios de Reparación • Venta • Instalación de Cámaras • Soluciones Tecnológicas</p>
        </div>

        <div class="doc-number">COTIZACIÓN: ${quotation.quotation_number}</div>

        <div class="section">
          <div class="section-title">Información del Cliente</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Cliente</div>
              <div class="info-value">${quotation.client_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${quotation.client_email || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Teléfono</div>
              <div class="info-value">${quotation.client_phone || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Dirección</div>
              <div class="info-value">${quotation.client_address || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado</div>
              <div class="info-value">${statusLabels[quotation.status] || quotation.status}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha</div>
              <div class="info-value">${new Date(quotation.created_at || '').toLocaleDateString('es-CL')}</div>
            </div>
            ${quotation.valid_until ? `
              <div class="info-item">
                <div class="info-label">Válida hasta</div>
                <div class="info-value">${new Date(quotation.valid_until).toLocaleDateString('es-CL')}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Detalle de Productos/Servicios</div>
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Subtotal</th>
                <th>Descuento</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${quotation.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${item.total.toFixed(2)}</td>
                  <td style="color: #dc2626;">-$${(item.discount_amount || 0).toFixed(2)}</td>
                  <td>$${(item.final_total || item.total).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>$${quotation.subtotal.toFixed(2)}</span>
            </div>
            <div class="totals-row" style="color: #dc2626;">
              <span>Descuentos:</span>
              <span>-$${quotation.total_discount.toFixed(2)}</span>
            </div>
            <div class="totals-row">
              <span>IVA (${quotation.tax_rate}%):</span>
              <span>$${quotation.tax.toFixed(2)}</span>
            </div>
            <div class="totals-row final">
              <span>TOTAL:</span>
              <span>$${quotation.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${quotation.terms ? `
          <div class="section">
            <div class="section-title">Términos y Condiciones</div>
            <p style="line-height: 1.6; color: #374151;">${quotation.terms}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Gracias por su preferencia</p>
          <p>Benjamin González Tecnología - Todos los derechos reservados</p>
        </div>
      </body>
      </html>
    `;
  }
  
  return '';
};
