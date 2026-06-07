import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const hashPassword = (password: string): string => {
  return crypto.SHA256(password).toString();
};

export const APP_USER_ID = 'a26d9bb5-c2fe-431a-8bef-a4d964be76f8';

export function getCurrentUserId(): string {
  return APP_USER_ID;
}

export async function getAuthUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

export interface User {
  id?: string;
  username: string;
  password_hash: string;
  name: string;
  email?: string;
  created_at?: string;
}

export interface Receipt {
  id?: string;
  receipt_number?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  project_id?: string;
  cobro_id?: string;
  user_id?: string;
  created_at?: string;
}

export interface ReceiptItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ServiceOrder {
  id?: string;
  order_number?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  device_type: string[];
  device_brand?: string;
  device_model?: string;
  device_serial?: string;
  problem_description?: string;
  service_type: string;
  status: string;
  estimated_cost: number;
  notes?: string;
  project_id?: string;
  cobro_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id?: string;
  name: string;
  description?: string;
  client?: string;
  status: string;
  quotations?: string[];
  documents?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CobrosNote {
  id?: string;
  folio: string;
  cliente: string;
  rut: string;
  telefono: string;
  servicio_titulo: string;
  servicio_desc?: string;
  periodo: string;
  neto: number;
  iva?: number;
  total?: number;
  banco: string;
  cuenta: string;
  titular: string;
  estado: 'pendiente' | 'pagado';
  proyecto_id?: string;
  sii_folio?: string;
  sii_estado?: string;
  sii_error?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentNotice {
  id?: string;
  folio: string;
  cliente: string;
  rut?: string;
  telefono?: string;
  servicio_titulo?: string;
  servicio_desc?: string;
  periodo?: string;
  neto?: number;
  iva?: number;
  total?: number;
  banco?: string;
  cuenta?: string;
  titular?: string;
  estado?: string;
  project_id?: string;
  cobro_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}
