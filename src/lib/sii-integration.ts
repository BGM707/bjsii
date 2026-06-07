import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface AuthenticateParams {
  siiUsername: string;
  siiPasswordHash: string;
  environment: 'production' | 'test';
}

interface QueryStatusParams {
  rutConsultante: string;
  dvConsultante: string;
  rutCompania: string;
  dvCompania: string;
  rutReceptor: string;
  dvReceptor: string;
  tipoDte: string;
  folioDte: string;
  fechaEmisionDte: string;
  montoDte: string;
  token: string;
  environment: 'production' | 'test';
}

interface RegisterDTEParams {
  xmlContent: string;
  token: string;
  environment: 'production' | 'test';
  dteId: string;
}

export async function authenticateWithSII(params: AuthenticateParams) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/sii-authenticate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('SII Authentication Error:', error);
    throw error;
  }
}

export async function queryDTEStatus(params: QueryStatusParams) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/sii-query-status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Mapear estados de SII a nuestros estados
    const statusMap: { [key: string]: string } = {
      'DOK': 'registered',
      'DNK': 'received_mismatch',
      'FAU': 'not_received',
      'FNA': 'not_authorized',
      'FAN': 'cancelled',
      'EMP': 'company_not_authorized',
      'TMD': 'modified_by_debit_note',
      'TMC': 'modified_by_credit_note',
      'MMD': 'amount_modified_debit_note',
      'MMC': 'amount_modified_credit_note',
      'AND': 'cancelled_by_debit_note',
      'ANC': 'cancelled_by_credit_note',
    };

    return {
      ...result,
      mappedStatus: statusMap[result.estado] || 'unknown',
    };
  } catch (error: any) {
    console.error('DTE Status Query Error:', error);
    throw error;
  }
}

export async function registerDTEWithSII(params: RegisterDTEParams) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/sii-register-dte`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Actualizar estado del DTE en la BD
    if (params.dteId) {
      await supabase
        .from('dte_documents')
        .update({
          sii_status: 'registered',
          sii_response: result,
        })
        .eq('id', params.dteId);
    }

    return result;
  } catch (error: any) {
    console.error('DTE Registration Error:', error);
    throw error;
  }
}

export async function getSIIConfig() {
  try {
    const { data, error } = await supabase
      .from('sii_configurations')
      .select('*')
      .eq('company_rut', '78.332.298-6')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error fetching SII config:', error);
    throw error;
  }
}

export function extractRUTParts(rut: string): { rut: string; dv: string } {
  const cleanRut = rut.replace(/\D/g, '');
  const dv = rut.includes('-') ? rut.split('-')[1] : cleanRut[cleanRut.length - 1];
  const rutNumber = cleanRut.slice(0, -1);

  return {
    rut: rutNumber,
    dv: dv.toUpperCase(),
  };
}

export function formatDTEDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}${month}${year}`;
}

export const DTEStatusDescriptions: { [key: string]: string } = {
  'registered': 'Documento Recibido por el SII',
  'received_mismatch': 'Documento Recibido pero Datos No Coinciden',
  'not_received': 'Documento No Recibido por el SII',
  'not_authorized': 'Documento No Autorizado',
  'cancelled': 'Documento Anulado',
  'company_not_authorized': 'Empresa No Autorizada para Emitir DTEs',
  'modified_by_debit_note': 'Modificado por Nota de Débito (Texto)',
  'modified_by_credit_note': 'Modificado por Nota de Crédito (Texto)',
  'amount_modified_debit_note': 'Modificado por Nota de Débito (Monto)',
  'amount_modified_credit_note': 'Modificado por Nota de Crédito (Monto)',
  'cancelled_by_debit_note': 'Anulado por Nota de Débito',
  'cancelled_by_credit_note': 'Anulado por Nota de Crédito',
  'unknown': 'Estado Desconocido',
};
