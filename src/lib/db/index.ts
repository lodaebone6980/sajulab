import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'saju.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    -- 사용자 (가맹점주/관리자)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      shop_name TEXT DEFAULT '',
      points INTEGER DEFAULT 0,
      role TEXT DEFAULT 'owner',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 고객
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('male','female')),
      birth_date TEXT NOT NULL,
      birth_time TEXT DEFAULT '',
      calendar_type TEXT DEFAULT 'solar' CHECK(calendar_type IN ('solar','lunar','leap')),
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      memo TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 상품
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT DEFAULT '',
      price_points INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      cover_image TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 주문 (분석 작업)
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','requested','extracting','analyzing','pdf_generating','processing','completed','failed')),
      result_json TEXT DEFAULT '',
      pdf_url TEXT DEFAULT '',
      extra_answer TEXT DEFAULT '',
      internal_memo TEXT DEFAULT '',
      points_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- 상담 기록
    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      order_id INTEGER,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      consultation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 직원
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      role TEXT DEFAULT 'staff',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 포인트 이력
    CREATE TABLE IF NOT EXISTS point_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('charge','use','refund','bonus')),
      description TEXT DEFAULT '',
      order_id INTEGER,
      balance_after INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- 공지사항
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 일지
    CREATE TABLE IF NOT EXISTS journals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      journal_date DATE DEFAULT (date('now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 사주 결과 (이전 호환)
    CREATE TABLE IF NOT EXISTS saju_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      birth_year INTEGER NOT NULL,
      birth_month INTEGER NOT NULL,
      birth_day INTEGER NOT NULL,
      birth_hour INTEGER NOT NULL,
      birth_minute INTEGER NOT NULL,
      is_lunar INTEGER DEFAULT 0,
      gender TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 운세 데이터 (sajulab.kr 10섹션 구조)
    CREATE TABLE IF NOT EXISTS saju_fortune_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      customer_name TEXT DEFAULT '',
      birth_info TEXT DEFAULT '',
      section_info TEXT DEFAULT '{}',
      section_pillar TEXT DEFAULT '{}',
      section_yongsin TEXT DEFAULT '{}',
      section_yinyang TEXT DEFAULT '{}',
      section_shinsal TEXT DEFAULT '{}',
      section_hyungchung TEXT DEFAULT '{}',
      section_daeun TEXT DEFAULT '{}',
      section_nyunun TEXT DEFAULT '{}',
      section_wolun TEXT DEFAULT '{}',
      section_wolun2 TEXT DEFAULT '{}',
      total_lines INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    -- LLM 내러티브 캐시
    CREATE TABLE IF NOT EXISTS saju_narratives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      product_code TEXT NOT NULL,
      greeting TEXT DEFAULT '',
      chapters_json TEXT DEFAULT '[]',
      model TEXT DEFAULT '',
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_consultations_customer_id ON consultations(customer_id);
    CREATE INDEX IF NOT EXISTS idx_point_history_user_id ON point_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_journals_user_id ON journals(user_id);
    CREATE INDEX IF NOT EXISTS idx_saju_fortune_data_order_id ON saju_fortune_data(order_id);
    CREATE INDEX IF NOT EXISTS idx_saju_narratives_order_id ON saju_narratives(order_id);
  `);

  // Migration: cover_image column 추가
  try {
    db.exec(`ALTER TABLE products ADD COLUMN cover_image TEXT DEFAULT ''`);
  } catch { /* already exists */ }

  // Auto-seed admin user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    // Use bcryptjs synchronous hash for initialization
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin1234', 12);
    db.prepare(
      "INSERT INTO users (email, password, name, role, points, shop_name) VALUES (?, ?, ?, 'admin', 999999999, '사주연구소')"
    ).run('admin@sajulab.kr', hashedPassword, '관리자');

    // Also seed default products for the admin user
    const admin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@sajulab.kr') as { id: number };
    if (admin) {
      const defaults = [
        { name: '1300줄 사주 데이터', code: 'saju-data', description: '상세 사주 원본 데이터', price_points: 500, sort_order: 1 },
        { name: 'A.기본분석', code: 'saju-basic', description: '사주팔자 기본 분석', price_points: 1000, sort_order: 2 },
        { name: 'C.신년운세', code: 'saju-newyear', description: '2026년 신년운세 분석', price_points: 2000, sort_order: 3 },
        { name: 'B.고급분석', code: 'saju-premium', description: '심층 사주 분석 (성격, 직업, 재물, 건강, 애정)', price_points: 2000, sort_order: 4 },
        { name: 'D.궁합분석', code: 'saju-love', description: '두 사람의 사주 궁합 분석', price_points: 3000, sort_order: 5 },
      ];
      const stmt = db.prepare('INSERT INTO products (user_id, name, code, description, price_points, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
      for (const p of defaults) {
        stmt.run(admin.id, p.name, p.code, p.description, p.price_points, p.sort_order);
      }
    }
  }
}

// ============ 사용자 ============
export function createUser(email: string, hashedPassword: string, name: string, role = 'owner', points = 0) {
  const db = getDb();
  const stmt = db.prepare('INSERT INTO users (email, password, name, role, points) VALUES (?, ?, ?, ?, ?)');
  return stmt.run(email, hashedPassword, name, role, points);
}

export function isAdmin(userId: number): boolean {
  const user = findUserById(userId);
  return user?.role === 'admin';
}

export function findUserByEmail(email: string) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as { id: number; email: string; password: string; name: string; shop_name: string; points: number; role: string } | undefined;
}

export function findUserById(id: number) {
  const db = getDb();
  const stmt = db.prepare('SELECT id, email, name, shop_name, points, role, created_at FROM users WHERE id = ?');
  return stmt.get(id) as { id: number; email: string; name: string; shop_name: string; points: number; role: string; created_at: string } | undefined;
}

export function getUserById(id: number) {
  return findUserById(id);
}

export function updateUserPoints(userId: number, points: number) {
  const db = getDb();
  db.prepare('UPDATE users SET points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(points, userId);
}

// ============ 고객 ============
export function createCustomer(userId: number, data: {
  name: string; gender: string; birth_date: string; birth_time: string;
  calendar_type: string; phone: string; email: string; memo: string;
}) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO customers (user_id, name, gender, birth_date, birth_time, calendar_type, phone, email, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  return stmt.run(userId, data.name, data.gender, data.birth_date, data.birth_time, data.calendar_type, data.phone, data.email, data.memo);
}

export function getCustomers(userId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM customers WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function getCustomerById(id: number, userId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?').get(id, userId);
}

export function updateCustomer(id: number, userId: number, data: {
  name?: string; gender?: string; birth_date?: string; birth_time?: string;
  calendar_type?: string; phone?: string; email?: string; memo?: string;
}) {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id, userId);
  db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
}

export function deleteCustomer(id: number, userId: number) {
  const db = getDb();
  db.prepare('DELETE FROM customers WHERE id = ? AND user_id = ?').run(id, userId);
}

// ============ 상품 ============
export function createProduct(userId: number, data: {
  name: string; code: string; description: string; price_points: number; sort_order: number; cover_image?: string;
}) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO products (user_id, name, code, description, price_points, sort_order, cover_image) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  return stmt.run(userId, data.name, data.code, data.description, data.price_points, data.sort_order, data.cover_image || '');
}

export function getProducts(userId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY sort_order ASC').all(userId);
}

export function updateProduct(id: number, userId: number, data: Partial<{
  name: string; code: string; description: string; price_points: number; is_active: number; sort_order: number; cover_image: string;
}>) {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  values.push(id, userId);
  db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
}

export function deleteProduct(id: number, userId: number) {
  const db = getDb();
  db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(id, userId);
}

// ============ 주문 ============
export function createOrder(userId: number, data: {
  customer_id: number; product_id: number; points_used: number; extra_answer?: string; internal_memo?: string;
}) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO orders (user_id, customer_id, product_id, status, points_used, extra_answer, internal_memo) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  return stmt.run(userId, data.customer_id, data.product_id, 'pending', data.points_used, data.extra_answer || '', data.internal_memo || '');
}

export function getOrders(userId: number, status?: string) {
  const db = getDb();
  if (status && status !== 'all') {
    return db.prepare(
      `SELECT o.*, c.name as customer_name, c.gender as customer_gender, c.birth_date as customer_birth_date,
       c.birth_time as customer_birth_time, c.calendar_type as customer_calendar_type,
       p.name as product_name, p.code as product_code
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN products p ON o.product_id = p.id
       WHERE o.user_id = ? AND o.status = ?
       ORDER BY o.created_at DESC`
    ).all(userId, status);
  }
  return db.prepare(
    `SELECT o.*, c.name as customer_name, c.gender as customer_gender, c.birth_date as customer_birth_date,
     c.birth_time as customer_birth_time, c.calendar_type as customer_calendar_type,
     p.name as product_name, p.code as product_code
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     JOIN products p ON o.product_id = p.id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`
  ).all(userId);
}

export function getOrderById(id: number, userId: number) {
  const db = getDb();
  return db.prepare(
    `SELECT o.*, c.name as customer_name, c.gender as customer_gender, c.birth_date as customer_birth_date,
     c.birth_time as customer_birth_time, c.calendar_type as customer_calendar_type,
     p.name as product_name, p.code as product_code
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     JOIN products p ON o.product_id = p.id
     WHERE o.id = ? AND o.user_id = ?`
  ).get(id, userId);
}

export function updateOrderStatus(id: number, userId: number, status: string) {
  const db = getDb();
  const completedAt = status === 'completed' ? "datetime('now')" : 'NULL';
  db.prepare(
    `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP, completed_at = ${status === 'completed' ? "datetime('now')" : 'completed_at'} WHERE id = ? AND user_id = ?`
  ).run(status, id, userId);
}

export function updateOrderResult(id: number, userId: number, resultJson: string) {
  const db = getDb();
  db.prepare('UPDATE orders SET result_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?').run(resultJson, id, userId);
}

export function getOrderStats(userId: number) {
  const db = getDb();
  const stats = db.prepare(
    `SELECT status, COUNT(*) as count FROM orders WHERE user_id = ? GROUP BY status`
  ).all(userId) as { status: string; count: number }[];

  const todayCompleted = db.prepare(
    `SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'completed' AND date(completed_at) = date('now')`
  ).get(userId) as { count: number };

  const todayProcessing = db.prepare(
    `SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status NOT IN ('completed','failed','pending') AND date(created_at) = date('now')`
  ).get(userId) as { count: number };

  return { stats, todayCompleted: todayCompleted.count, todayProcessing: todayProcessing.count };
}

// ============ 상담 기록 ============
export function createConsultation(userId: number, data: {
  customer_id: number; order_id?: number; title: string; content: string;
}) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO consultations (user_id, customer_id, order_id, title, content) VALUES (?, ?, ?, ?, ?)'
  );
  return stmt.run(userId, data.customer_id, data.order_id || null, data.title, data.content);
}

export function getConsultations(userId: number) {
  const db = getDb();
  return db.prepare(
    `SELECT con.*, c.name as customer_name FROM consultations con
     JOIN customers c ON con.customer_id = c.id
     WHERE con.user_id = ? ORDER BY con.created_at DESC`
  ).all(userId);
}

export function deleteConsultation(id: number, userId: number) {
  const db = getDb();
  db.prepare('DELETE FROM consultations WHERE id = ? AND user_id = ?').run(id, userId);
}

// ============ 직원 ============
export function createStaff(userId: number, data: { name: string; email: string; phone: string; role: string }) {
  const db = getDb();
  return db.prepare('INSERT INTO staff (user_id, name, email, phone, role) VALUES (?, ?, ?, ?, ?)').run(userId, data.name, data.email, data.phone, data.role);
}

export function getStaff(userId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM staff WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function updateStaff(id: number, userId: number, data: Partial<{ name: string; email: string; phone: string; role: string; is_active: number }>) {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) { fields.push(`${key} = ?`); values.push(val); }
  }
  if (fields.length === 0) return;
  values.push(id, userId);
  db.prepare(`UPDATE staff SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
}

export function deleteStaff(id: number, userId: number) {
  const db = getDb();
  db.prepare('DELETE FROM staff WHERE id = ? AND user_id = ?').run(id, userId);
}

// ============ 포인트 이력 ============
export function addPointHistory(userId: number, amount: number, type: string, description: string, orderId?: number) {
  const db = getDb();
  const user = findUserById(userId);
  const balanceAfter = (user?.points || 0) + amount;
  updateUserPoints(userId, balanceAfter);
  return db.prepare(
    'INSERT INTO point_history (user_id, amount, type, description, order_id, balance_after) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, amount, type, description, orderId || null, balanceAfter);
}

export function getPointHistory(userId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM point_history WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

// ============ 공지사항 ============
export function getNotices() {
  const db = getDb();
  return db.prepare('SELECT * FROM notices ORDER BY is_pinned DESC, created_at DESC').all();
}

export function createNotice(title: string, content: string, isPinned = false) {
  const db = getDb();
  return db.prepare('INSERT INTO notices (title, content, is_pinned) VALUES (?, ?, ?)').run(title, content, isPinned ? 1 : 0);
}

// ============ 일지 ============
export function createJournal(userId: number, data: { title: string; content: string; journal_date: string }) {
  const db = getDb();
  return db.prepare('INSERT INTO journals (user_id, title, content, journal_date) VALUES (?, ?, ?, ?)').run(userId, data.title, data.content, data.journal_date);
}

export function getJournals(userId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM journals WHERE user_id = ? ORDER BY journal_date DESC').all(userId);
}

export function deleteJournal(id: number, userId: number) {
  const db = getDb();
  db.prepare('DELETE FROM journals WHERE id = ? AND user_id = ?').run(id, userId);
}

// ============ 사주 결과 (이전 호환) ============
export function saveSajuResult(
  userId: number | null, birthYear: number, birthMonth: number, birthDay: number,
  birthHour: number, birthMinute: number, isLunar: boolean, gender: string, resultJson: string
) {
  const db = getDb();
  const stmt = db.prepare(
    'INSERT INTO saju_results (user_id, birth_year, birth_month, birth_day, birth_hour, birth_minute, is_lunar, gender, result_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  return stmt.run(userId, birthYear, birthMonth, birthDay, birthHour, birthMinute, isLunar ? 1 : 0, gender, resultJson);
}

export function getUserSajuResults(userId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM saju_results WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

// ============ 운세 데이터 (10섹션) ============
export function saveFortuneData(orderId: number, customerName: string, birthInfo: string, sections: {
  info: string; pillar: string; yongsin: string; yinyang: string;
  shinsal: string; hyungchung: string; daeun: string;
  nyunun: string; wolun: string; wolun2: string;
}, totalLines: number) {
  const db = getDb();
  // UPSERT: 이미 있으면 업데이트
  db.prepare(`
    INSERT INTO saju_fortune_data (order_id, customer_name, birth_info, section_info, section_pillar, section_yongsin, section_yinyang, section_shinsal, section_hyungchung, section_daeun, section_nyunun, section_wolun, section_wolun2, total_lines)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      customer_name = excluded.customer_name,
      birth_info = excluded.birth_info,
      section_info = excluded.section_info,
      section_pillar = excluded.section_pillar,
      section_yongsin = excluded.section_yongsin,
      section_yinyang = excluded.section_yinyang,
      section_shinsal = excluded.section_shinsal,
      section_hyungchung = excluded.section_hyungchung,
      section_daeun = excluded.section_daeun,
      section_nyunun = excluded.section_nyunun,
      section_wolun = excluded.section_wolun,
      section_wolun2 = excluded.section_wolun2,
      total_lines = excluded.total_lines
  `).run(orderId, customerName, birthInfo, sections.info, sections.pillar, sections.yongsin, sections.yinyang, sections.shinsal, sections.hyungchung, sections.daeun, sections.nyunun, sections.wolun, sections.wolun2, totalLines);
}

export function getFortuneData(orderId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM saju_fortune_data WHERE order_id = ?').get(orderId) as {
    id: number; order_id: number; customer_name: string; birth_info: string;
    section_info: string; section_pillar: string; section_yongsin: string; section_yinyang: string;
    section_shinsal: string; section_hyungchung: string; section_daeun: string;
    section_nyunun: string; section_wolun: string; section_wolun2: string;
    total_lines: number; created_at: string;
  } | undefined;
}

// ============ LLM 내러티브 캐시 ============
export function saveNarrative(orderId: number, productCode: string, data: {
  greeting: string; chapters: string; model: string; promptTokens: number; completionTokens: number;
}) {
  const db = getDb();
  db.prepare(`
    INSERT INTO saju_narratives (order_id, product_code, greeting, chapters_json, model, prompt_tokens, completion_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(order_id) DO UPDATE SET
      product_code = excluded.product_code,
      greeting = excluded.greeting,
      chapters_json = excluded.chapters_json,
      model = excluded.model,
      prompt_tokens = excluded.prompt_tokens,
      completion_tokens = excluded.completion_tokens
  `).run(orderId, productCode, data.greeting, data.chapters, data.model, data.promptTokens, data.completionTokens);
}

export function getNarrative(orderId: number) {
  const db = getDb();
  return db.prepare('SELECT * FROM saju_narratives WHERE order_id = ?').get(orderId) as {
    id: number; order_id: number; product_code: string; greeting: string;
    chapters_json: string; model: string; prompt_tokens: number; completion_tokens: number;
    created_at: string;
  } | undefined;
}

// ============ admin 시드 ============
export async function seedAdminUser() {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin');
  if (existing) return;

  // bcryptjs를 동적 import (이 파일은 서버 전용)
  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash('wruo1597#@', 12);
  db.prepare(
    "INSERT INTO users (email, password, name, role, points, shop_name) VALUES (?, ?, ?, 'admin', 999999999, '관리자')"
  ).run('admin', hashedPassword, '관리자');
}

// ============ 초기 상품 데이터 시드 ============
export function seedDefaultProducts(userId: number) {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?').get(userId) as { count: number };
  if (existing.count > 0) return;

  const defaults = [
    { name: '1300줄 사주 데이터', code: 'saju-data', description: '상세 사주 원본 데이터', price_points: 500, sort_order: 1 },
    { name: 'A.기본분석', code: 'saju-basic', description: '사주팔자 기본 분석', price_points: 1000, sort_order: 2 },
    { name: 'C.신년운세', code: 'saju-newyear', description: '2026년 신년운세 분석', price_points: 2000, sort_order: 3 },
    { name: 'B.고급분석', code: 'saju-premium', description: '심층 사주 분석 (성격, 직업, 재물, 건강, 애정)', price_points: 2000, sort_order: 4 },
  ];

  for (const p of defaults) {
    createProduct(userId, p);
  }
}
