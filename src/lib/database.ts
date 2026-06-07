import initSqlJs, { Database } from 'sql.js';

export interface BaseDocument {
  id?: string;
  document_number?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentItem {
  description: string;
  quantity: number;
  price: number;
  total: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  discount_amount?: number;
  final_total?: number;
}

export interface Receipt extends BaseDocument {
  receipt_number?: string;
  items: DocumentItem[];
  subtotal: number;
  total_discount: number;
  tax_rate: number;
  tax: number;
  total: number;
}

export interface ServiceOrder extends BaseDocument {
  order_number?: string;
  device_type: string[];
  device_brand?: string;
  device_model?: string;
  device_serial?: string;
  problem_description?: string;
  service_type: string;
  status: string;
  estimated_cost: number;
  notes?: string;
}

export interface Quotation extends BaseDocument {
  quotation_number?: string;
  items: DocumentItem[];
  subtotal: number;
  total_discount: number;
  tax_rate: number;
  tax: number;
  total: number;
  valid_until?: string;
  terms?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export class LocalDatabase {
  private db: Database | null = null;
  private SQL: any = null;

  async initialize() {
    if (!this.SQL) {
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });
    }

    // Try to load existing database from localStorage
    const savedDb = localStorage.getItem('benjamingonzalez_db');
    if (savedDb) {
      const uint8Array = new Uint8Array(JSON.parse(savedDb));
      this.db = new this.SQL.Database(uint8Array);
    } else {
      this.db = new this.SQL.Database();
      this.createTables();
    }
  }

  private createTables() {
    if (!this.db) return;

    // Receipts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT UNIQUE,
        client_name TEXT NOT NULL,
        client_email TEXT,
        client_phone TEXT,
        client_address TEXT,
        items TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        total_discount REAL DEFAULT 0,
        tax_rate REAL DEFAULT 19,
        tax REAL DEFAULT 0,
        total REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Service Orders table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS service_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE,
        client_name TEXT NOT NULL,
        client_email TEXT,
        client_phone TEXT,
        client_address TEXT,
        device_type TEXT,
        device_brand TEXT,
        device_model TEXT,
        device_serial TEXT,
        problem_description TEXT,
        service_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        estimated_cost REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Quotations table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS quotations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quotation_number TEXT UNIQUE,
        client_name TEXT NOT NULL,
        client_email TEXT,
        client_phone TEXT,
        client_address TEXT,
        items TEXT NOT NULL,
        subtotal REAL DEFAULT 0,
        total_discount REAL DEFAULT 0,
        tax_rate REAL DEFAULT 19,
        tax REAL DEFAULT 0,
        total REAL DEFAULT 0,
        valid_until DATE,
        terms TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.saveToLocalStorage();
  }

  private saveToLocalStorage() {
    if (!this.db) return;
    const data = this.db.export();
    localStorage.setItem('benjamingonzalez_db', JSON.stringify(Array.from(data)));
  }

  private generateNumber(prefix: string): string {
    if (!this.db) return `${prefix}-001`;
    
    const stmt = this.db.prepare(`
      SELECT MAX(CAST(SUBSTR(${prefix.toLowerCase()}_number, ${prefix.length + 2}) AS INTEGER)) as max_num 
      FROM ${prefix.toLowerCase()}s 
      WHERE ${prefix.toLowerCase()}_number LIKE '${prefix}-%'
    `);
    
    const result = stmt.getAsObject();
    const nextNum = (result.max_num as number || 0) + 1;
    stmt.free();
    
    return `${prefix}-${nextNum.toString().padStart(3, '0')}`;
  }

  // Receipts
  async createReceipt(receipt: Receipt): Promise<Receipt> {
    if (!this.db) throw new Error('Database not initialized');

    const receiptNumber = this.generateNumber('BOL');
    const stmt = this.db.prepare(`
      INSERT INTO receipts (receipt_number, client_name, client_email, client_phone, client_address, 
                           items, subtotal, total_discount, tax_rate, tax, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      receiptNumber,
      receipt.client_name,
      receipt.client_email || null,
      receipt.client_phone || null,
      receipt.client_address || null,
      JSON.stringify(receipt.items),
      receipt.subtotal,
      receipt.total_discount,
      receipt.tax_rate,
      receipt.tax,
      receipt.total
    ]);

    stmt.free();
    this.saveToLocalStorage();

    return { ...receipt, receipt_number: receiptNumber };
  }

  async getReceipts(): Promise<Receipt[]> {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM receipts ORDER BY created_at DESC');
    const receipts: Receipt[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      receipts.push({
        id: row.id as string,
        receipt_number: row.receipt_number as string,
        client_name: row.client_name as string,
        client_email: row.client_email as string,
        client_phone: row.client_phone as string,
        client_address: row.client_address as string,
        items: JSON.parse(row.items as string),
        subtotal: row.subtotal as number,
        total_discount: row.total_discount as number,
        tax_rate: row.tax_rate as number,
        tax: row.tax as number,
        total: row.total as number,
        created_at: row.created_at as string
      });
    }

    stmt.free();
    return receipts;
  }

  // Service Orders
  async createServiceOrder(order: ServiceOrder): Promise<ServiceOrder> {
    if (!this.db) throw new Error('Database not initialized');

    const orderNumber = this.generateNumber('OS');
    const stmt = this.db.prepare(`
      INSERT INTO service_orders (order_number, client_name, client_email, client_phone, client_address,
                                 device_type, device_brand, device_model, device_serial, problem_description,
                                 service_type, status, estimated_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      orderNumber,
      order.client_name,
      order.client_email || null,
      order.client_phone || null,
      order.client_address || null,
      JSON.stringify(order.device_type),
      order.device_brand || null,
      order.device_model || null,
      order.device_serial || null,
      order.problem_description || null,
      order.service_type,
      order.status,
      order.estimated_cost,
      order.notes || null
    ]);

    stmt.free();
    this.saveToLocalStorage();

    return { ...order, order_number: orderNumber };
  }

  async getServiceOrders(): Promise<ServiceOrder[]> {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM service_orders ORDER BY created_at DESC');
    const orders: ServiceOrder[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      orders.push({
        id: row.id as string,
        order_number: row.order_number as string,
        client_name: row.client_name as string,
        client_email: row.client_email as string,
        client_phone: row.client_phone as string,
        client_address: row.client_address as string,
        device_type: JSON.parse(row.device_type as string),
        device_brand: row.device_brand as string,
        device_model: row.device_model as string,
        device_serial: row.device_serial as string,
        problem_description: row.problem_description as string,
        service_type: row.service_type as string,
        status: row.status as string,
        estimated_cost: row.estimated_cost as number,
        notes: row.notes as string,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string
      });
    }

    stmt.free();
    return orders;
  }

  // Quotations
  async createQuotation(quotation: Quotation): Promise<Quotation> {
    if (!this.db) throw new Error('Database not initialized');

    const quotationNumber = this.generateNumber('COT');
    const stmt = this.db.prepare(`
      INSERT INTO quotations (quotation_number, client_name, client_email, client_phone, client_address,
                             items, subtotal, total_discount, tax_rate, tax, total, valid_until, terms, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      quotationNumber,
      quotation.client_name,
      quotation.client_email || null,
      quotation.client_phone || null,
      quotation.client_address || null,
      JSON.stringify(quotation.items),
      quotation.subtotal,
      quotation.total_discount,
      quotation.tax_rate,
      quotation.tax,
      quotation.total,
      quotation.valid_until || null,
      quotation.terms || null,
      quotation.status
    ]);

    stmt.free();
    this.saveToLocalStorage();

    return { ...quotation, quotation_number: quotationNumber };
  }

  async getQuotations(): Promise<Quotation[]> {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM quotations ORDER BY created_at DESC');
    const quotations: Quotation[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      quotations.push({
        id: row.id as string,
        quotation_number: row.quotation_number as string,
        client_name: row.client_name as string,
        client_email: row.client_email as string,
        client_phone: row.client_phone as string,
        client_address: row.client_address as string,
        items: JSON.parse(row.items as string),
        subtotal: row.subtotal as number,
        total_discount: row.total_discount as number,
        tax_rate: row.tax_rate as number,
        tax: row.tax as number,
        total: row.total as number,
        valid_until: row.valid_until as string,
        terms: row.terms as string,
        status: row.status as 'pending' | 'accepted' | 'rejected' | 'expired',
        created_at: row.created_at as string,
        updated_at: row.updated_at as string
      });
    }

    stmt.free();
    return quotations;
  }

  // Database backup and restore
  exportDatabase(): Blob {
    if (!this.db) throw new Error('Database not initialized');
    const data = this.db.export();
    return new Blob([data], { type: 'application/x-sqlite3' });
  }

  async importDatabase(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    if (!this.SQL) {
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });
    }

    this.db = new this.SQL.Database(uint8Array);
    this.saveToLocalStorage();
  }

  clearDatabase(): void {
    localStorage.removeItem('benjamingonzalez_db');
    if (this.SQL) {
      this.db = new this.SQL.Database();
      this.createTables();
    }
  }
}

export const localDB = new LocalDatabase();