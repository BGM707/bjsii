export interface Invoice {
  id: string;
  folio: string;
  cliente: string;
  rut: string;
  telefono: string;
  servicio_titulo: string;
  servicio_desc: string;
  periodo: string;
  neto: number;
  iva: number;
  total: number;
  estado: 'pendiente' | 'pagado';
  banco: string;
  cuenta: string;
  titular: string;
  proyecto_id?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFormData {
  folio: string;
  cliente: string;
  rut: string;
  telefono: string;
  servicio_titulo: string;
  servicio_desc: string;
  periodo: string;
  neto: number;
  iva: number;
  total: number;
  estado: 'pendiente' | 'pagado';
  banco: string;
  cuenta: string;
  titular: string;
}

export function calcularTotales(neto: number): { iva: number; total: number } {
  const iva = Math.round(neto * 0.19);
  const total = neto + iva;
  return { iva, total };
}

export function formatCLP(amount: number): string {
  return '$' + amount.toLocaleString('es-CL');
}

export function calcularFechas(periodo: string): {
  emision: string;
  vencimiento: string;
  mesServicio: string;
  nombreMes: string;
} {
  const [year, month] = periodo.split('-').map(Number);
  const mesServicioDate = new Date(year, month - 1, 15);
  const vencimientoDate = new Date(year, month - 1, 22);

  const emision = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  const vencimiento = vencimientoDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  const mesServicio = mesServicioDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  const nombreMes = mesServicioDate.toLocaleDateString('es-ES', {
    month: 'long',
  });

  return { emision, vencimiento, mesServicio, nombreMes };
}
