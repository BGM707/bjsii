export interface CashCategory {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'purchase' | 'sale';
  description: string | null;
  active: boolean;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  type: 'entry' | 'exit';
  category_id: string | null;
  amount: number;
  description: string | null;
  reference_type: 'purchase' | 'sale' | 'receipt' | 'service_order' | 'manual' | null;
  reference_id: string | null;
  payment_method: 'cash' | 'transfer' | 'card' | 'check' | 'other' | null;
  document_number: string | null;
  contact_name: string | null;
  contact_rut: string | null;
  date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  category?: CashCategory;
}

export interface Purchase {
  id: string;
  document_number: string | null;
  supplier_name: string;
  supplier_rut: string | null;
  description: string | null;
  items: { description: string; quantity: number; price: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string | null;
  status: 'paid' | 'pending' | 'partial';
  date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  document_number: string | null;
  client_name: string;
  client_rut: string | null;
  description: string | null;
  items: { description: string; quantity: number; price: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string | null;
  status: 'paid' | 'pending' | 'partial';
  date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CashFlowSummary {
  totalEntries: number;
  totalExits: number;
  balance: number;
  entriesCount: number;
  exitsCount: number;
}
