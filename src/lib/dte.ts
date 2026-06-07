import { v4 as uuidv4 } from 'crypto-js';

export interface DTEData {
  folio: string;
  company_rut: string;
  company_name: string;
  document_type: string;
  recipient_rut: string;
  recipient_name: string;
  issue_date: Date;
  due_date?: Date;
  net_amount: number;
  iva_amount: number;
  total_amount: number;
  description: string;
  items?: DTEItem[];
}

export interface DTEItem {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  total: number;
}

export function generateDTEXML(data: DTEData): string {
  const timestamp = new Date().toISOString();
  const issueDate = data.issue_date.toISOString().split('T')[0];
  const dueDate = data.due_date ? data.due_date.toISOString().split('T')[0] : issueDate;

  const itemsXML = (data.items || [])
    .map((item, idx) => `
    <Detalle>
      <NroLinDet>${idx + 1}</NroLinDet>
      <TpoCodigo>INT1</TpoCodigo>
      <Codigo>${idx + 1}</Codigo>
      <CdgItem>
        <TpoCodigo>INT1</TpoCodigo>
        <Valor>${idx + 1}</Valor>
      </CdgItem>
      <Descr>${escapeXML(item.description)}</Descr>
      <QtyItem>${item.quantity}</QtyItem>
      <UnMedida>Unidad</UnMedida>
      <PrcItem>${item.unit_price.toFixed(2)}</PrcItem>
      <DiscMntItem>${item.discount || 0}</DiscMntItem>
      <MontoItem>${item.total.toFixed(2)}</MontoItem>
    </Detalle>`)
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DTE xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sii.cl/SiiDte DTE_v10.xsd">
  <Documento>
    <Encabezado>
      <IdDoc>
        <TipoDTE>${getDTEType(data.document_type)}</TipoDTE>
        <Folio>${data.folio}</Folio>
        <FchEmis>${issueDate}</FchEmis>
        <FchVenc>${dueDate}</FchVenc>
        <FrmaPago>1</FrmaPago>
      </IdDoc>
      <Emisor>
        <RUTEmisor>${data.company_rut}</RUTEmisor>
        <RznSocEmisor>${escapeXML(data.company_name)}</RznSocEmisor>
        <GiroEmisor>Servicios Informáticos</GiroEmisor>
        <Telefono>+56941228089</Telefono>
        <Email>contacto@bjservicios.cl</Email>
      </Emisor>
      <Receptor>
        <RUTRecep>${data.recipient_rut}</RUTRecep>
        <RznSocRecep>${escapeXML(data.recipient_name)}</RznSocRecep>
        <GiroRecep>Diversos</GiroRecep>
      </Receptor>
      <Totales>
        <MntNeto>${data.net_amount.toFixed(2)}</MntNeto>
        <IVA>${data.iva_amount.toFixed(2)}</IVA>
        <MntTotal>${data.total_amount.toFixed(2)}</MntTotal>
      </Totales>
    </Encabezado>
    <Detalle>${itemsXML || `
    <Detalle>
      <NroLinDet>1</NroLinDet>
      <TpoCodigo>INT1</TpoCodigo>
      <Codigo>1</Codigo>
      <Descr>${escapeXML(data.description)}</Descr>
      <QtyItem>1</QtyItem>
      <UnMedida>Global</UnMedida>
      <PrcItem>${data.net_amount.toFixed(2)}</PrcItem>
      <MontoItem>${data.net_amount.toFixed(2)}</MontoItem>
    </Detalle>`}
    </Detalle>
  </Documento>
</DTE>`;

  return xml;
}

export function generateElectronicSeal(folio: string, xml: string): string {
  const timestamp = new Date().toISOString();
  const securityHash = generateHash(folio + xml + timestamp);

  return JSON.stringify({
    folio,
    timestamp,
    hash: securityHash,
    version: '1.0',
    status: 'generated',
    sii_response: null
  });
}

function getDTEType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'factura': '33',
    'boleta': '39',
    'nota_credito': '61',
    'nota_debito': '56',
    'factura_exenta': '34'
  };
  return typeMap[type.toLowerCase()] || '39';
}

function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function downloadDTEFile(xml: string, folio: string): void {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/xml;charset=utf-8,' + encodeURIComponent(xml));
  element.setAttribute('download', `DTE_${folio}.xml`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function downloadElectronicSeal(seal: string, folio: string): void {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(seal));
  element.setAttribute('download', `TIMBRE_${folio}.json`);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function validateRUT(rut: string): boolean {
  const cleanRUT = rut.replace(/\D/g, '');
  if (cleanRUT.length < 7 || cleanRUT.length > 8) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = cleanRUT.length - 2; i >= 0; i--) {
    sum += parseInt(cleanRUT[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const verifier = 11 - (sum % 11);
  const checkDigit = verifier === 11 ? 0 : verifier === 10 ? 'K' : verifier;

  return cleanRUT[cleanRUT.length - 1] === checkDigit.toString();
}
