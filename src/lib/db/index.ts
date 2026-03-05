import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Railway Volume 마운트 경로 우선 사용 (영속 저장소)
// 환경변수 RAILWAY_VOLUME_MOUNT_PATH가 설정되면 해당 경로 사용
// 없으면 기존 process.cwd()/data 사용 (로컬 개발용)
const VOLUME_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const DATA_ROOT = VOLUME_PATH || path.join(process.cwd(), 'data');
const DB_DIR = VOLUME_PATH ? path.join(VOLUME_PATH, 'db') : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'saju.db');

/** PDF 저장 디렉토리 (Volume 있으면 Volume 사용) */
export function getPdfDir(): string {
  const pdfDir = VOLUME_PATH ? path.join(VOLUME_PATH, 'pdfs') : path.join(process.cwd(), 'data', 'pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }
  return pdfDir;
}

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
      nickname TEXT DEFAULT '',
      code2 TEXT DEFAULT '',
      account TEXT DEFAULT '',
      extra_question TEXT DEFAULT '',
      order_time TEXT DEFAULT '',
      consultation_date TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      progress INTEGER DEFAULT 0,
      progress_message TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- 상담 기록
    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      customer_id INTEGER,
      order_id INTEGER,
      date TEXT DEFAULT '',
      chat_history TEXT DEFAULT '',
      chat_link TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','no_show')),
      gender TEXT DEFAULT '',
      name TEXT DEFAULT '',
      birth_date TEXT DEFAULT '',
      calendar_type TEXT DEFAULT 'solar',
      birth_time TEXT DEFAULT '',
      ganji TEXT DEFAULT '',
      email TEXT DEFAULT '',
      product TEXT DEFAULT '',
      amount INTEGER DEFAULT 0,
      question TEXT DEFAULT '',
      additional_payment TEXT DEFAULT '',
      note TEXT DEFAULT '',
      consultation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    -- 궁합 페어링 (두 사람 연결)
    CREATE TABLE IF NOT EXISTS compatibility_pairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      customer_id_1 INTEGER NOT NULL,
      customer_id_2 INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id_1) REFERENCES customers(id),
      FOREIGN KEY (customer_id_2) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_compat_pairs_order ON compatibility_pairs(order_id);
  `);

  // Migration: consultations 테이블 재생성 (NOT NULL/FK 제약 제거)
  // 기존 테이블에 customer_id NOT NULL이 있어 새 레코드 생성 불가 → 재생성
  try {
    const custCol = db.prepare("SELECT [notnull] as nn FROM pragma_table_info('consultations') WHERE name='customer_id'").get() as any;
    if (custCol && custCol.nn === 1) {
      db.exec(`
        DROP TABLE IF EXISTS consultations;
        CREATE TABLE consultations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          customer_id INTEGER DEFAULT NULL,
          order_id INTEGER DEFAULT NULL,
          date TEXT DEFAULT '',
          chat_history TEXT DEFAULT '',
          chat_link TEXT DEFAULT '',
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed','no_show')),
          gender TEXT DEFAULT '',
          name TEXT DEFAULT '',
          birth_date TEXT DEFAULT '',
          calendar_type TEXT DEFAULT 'solar',
          birth_time TEXT DEFAULT '',
          ganji TEXT DEFAULT '',
          email TEXT DEFAULT '',
          product TEXT DEFAULT '',
          amount INTEGER DEFAULT 0,
          question TEXT DEFAULT '',
          additional_payment TEXT DEFAULT '',
          note TEXT DEFAULT '',
          consultation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[DB Migration] consultations 테이블 재생성 완료 (NOT NULL/FK 제거)');
    }
  } catch (e) {
    console.error('[DB Migration] consultations 재생성 실패:', e);
  }

  // Migration: orders 새 컬럼 추가 (닉네임, 코드2, 계정, 추가질문, 시각, 상담날짜)
  const orderNewCols = [
    ['nickname', "TEXT DEFAULT ''"],
    ['code2', "TEXT DEFAULT ''"],
    ['account', "TEXT DEFAULT ''"],
    ['extra_question', "TEXT DEFAULT ''"],
    ['order_time', "TEXT DEFAULT ''"],
    ['consultation_date', "TEXT DEFAULT ''"],
    ['order_code', "TEXT DEFAULT ''"],
  ];
  for (const [col, type] of orderNewCols) {
    try { db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${type}`); } catch {}
  }

  // Migration: customers 새 컬럼 추가 (고객코드, 닉네임)
  const customerNewCols = [
    ['customer_code', "TEXT DEFAULT ''"],
    ['nickname', "TEXT DEFAULT ''"],
  ];
  for (const [col, type] of customerNewCols) {
    try { db.exec(`ALTER TABLE customers ADD COLUMN ${col} ${type}`); } catch {}
  }

  // 인덱스 추가
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code)`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code)`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_customers_name_birth ON customers(user_id, name, birth_date)`); } catch {}

  // Migration: 기존 customers에 customer_code 자동 부여
  try {
    const noCodes = db.prepare("SELECT id FROM customers WHERE customer_code = '' OR customer_code IS NULL").all() as { id: number }[];
    for (const row of noCodes) {
      db.prepare("UPDATE customers SET customer_code = ? WHERE id = ?").run(`CUS-${String(row.id).padStart(5, '0')}`, row.id);
    }
  } catch {}

  // Migration: 기존 orders에 order_code 자동 부여
  try {
    const noOrderCodes = db.prepare("SELECT id FROM orders WHERE order_code = '' OR order_code IS NULL").all() as { id: number }[];
    for (const row of noOrderCodes) {
      db.prepare("UPDATE orders SET order_code = ? WHERE id = ?").run(`ORD-${String(row.id).padStart(5, '0')}`, row.id);
    }
  } catch {}

  // Migration: orders.nickname → customers.nickname 이전 (첫 주문의 닉네임)
  try {
    const cusNoNick = db.prepare("SELECT id FROM customers WHERE (nickname = '' OR nickname IS NULL)").all() as { id: number }[];
    for (const cus of cusNoNick) {
      const firstOrder = db.prepare("SELECT nickname FROM orders WHERE customer_id = ? AND nickname != '' ORDER BY created_at ASC LIMIT 1").get(cus.id) as { nickname: string } | undefined;
      if (firstOrder) {
        db.prepare("UPDATE customers SET nickname = ? WHERE id = ?").run(firstOrder.nickname, cus.id);
      }
    }
  } catch {}

  // Migration: 중복 고객 병합 (같은 user_id + name + birth_date)
  try {
    const dupes = db.prepare(`
      SELECT user_id, name, birth_date, MIN(id) as keep_id, GROUP_CONCAT(id) as all_ids
      FROM customers
      GROUP BY user_id, name, birth_date
      HAVING COUNT(*) > 1
    `).all() as { user_id: number; name: string; birth_date: string; keep_id: number; all_ids: string }[];
    for (const dupe of dupes) {
      const ids = dupe.all_ids.split(',').map(Number);
      const mergeIds = ids.filter(id => id !== dupe.keep_id);
      for (const oldId of mergeIds) {
        db.prepare("UPDATE orders SET customer_id = ? WHERE customer_id = ?").run(dupe.keep_id, oldId);
        db.prepare("UPDATE consultations SET customer_id = ? WHERE customer_id = ?").run(dupe.keep_id, oldId);
        db.prepare("DELETE FROM customers WHERE id = ?").run(oldId);
      }
    }
  } catch {}

  // Migration: cover_image column 추가
  try {
    db.exec(`ALTER TABLE products ADD COLUMN cover_image TEXT DEFAULT ''`);
  } catch { /* already exists */ }

  // Migration: progress tracking columns 추가
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN progress INTEGER DEFAULT 0`);
  } catch { /* already exists */ }
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN progress_message TEXT DEFAULT ''`);
  } catch { /* already exists */ }

  // Migration: Google Drive 연동 컬럼 추가
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN google_drive_file_id TEXT DEFAULT ''`);
  } catch { /* already exists */ }
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN google_drive_url TEXT DEFAULT ''`);
  } catch { /* already exists */ }

  // Migration: 사용자별 Google OAuth 토큰 컬럼 추가
  try {
    db.exec(`ALTER TABLE users ADD COLUMN google_refresh_token TEXT DEFAULT ''`);
  } catch { /* already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN google_access_token TEXT DEFAULT ''`);
  } catch { /* already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN google_token_expiry TEXT DEFAULT ''`);
  } catch { /* already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN google_drive_email TEXT DEFAULT ''`);
  } catch { /* already exists */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN google_drive_folder_id TEXT DEFAULT ''`);
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

// ============ Google OAuth 토큰 관리 ============
export function updateUserGoogleTokens(userId: number, data: {
  refresh_token: string;
  access_token: string;
  token_expiry: string;
  drive_email: string;
}) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET
      google_refresh_token = ?,
      google_access_token = ?,
      google_token_expiry = ?,
      google_drive_email = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(data.refresh_token, data.access_token, data.token_expiry, data.drive_email, userId);
}

export function getUserGoogleTokens(userId: number) {
  const db = getDb();
  const row = db.prepare(`
    SELECT google_refresh_token, google_access_token, google_token_expiry, google_drive_email, google_drive_folder_id
    FROM users WHERE id = ?
  `).get(userId) as {
    google_refresh_token: string;
    google_access_token: string;
    google_token_expiry: string;
    google_drive_email: string;
    google_drive_folder_id: string;
  } | undefined;
  return row;
}

export function updateUserDriveFolderId(userId: number, folderId: string) {
  const db = getDb();
  db.prepare('UPDATE users SET google_drive_folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(folderId, userId);
}

export function clearUserGoogleTokens(userId: number) {
  const db = getDb();
  db.prepare(`
    UPDATE users SET
      google_refresh_token = '', google_access_token = '',
      google_token_expiry = '', google_drive_email = '',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userId);
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

/** 이름+생년월일로 기존 고객 찾기 */
export function findCustomerByNameAndBirth(userId: number, name: string, birthDate: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM customers WHERE user_id = ? AND name = ? AND birth_date = ? LIMIT 1').get(userId, name, birthDate) as any | undefined;
}

/** 고객 코드 자동 생성 및 설정 */
export function assignCustomerCode(customerId: number) {
  const db = getDb();
  const code = `CUS-${String(customerId).padStart(5, '0')}`;
  db.prepare("UPDATE customers SET customer_code = ? WHERE id = ? AND (customer_code = '' OR customer_code IS NULL)").run(code, customerId);
  return code;
}

/** 주문 코드 자동 생성 및 설정 */
export function assignOrderCode(orderId: number) {
  const db = getDb();
  const code = `ORD-${String(orderId).padStart(5, '0')}`;
  db.prepare("UPDATE orders SET order_code = ? WHERE id = ? AND (order_code = '' OR order_code IS NULL)").run(code, orderId);
  return code;
}

/** 고객 + 분석 목록 조회 (고객관리 페이지용) */
export function getCustomersWithAnalyses(userId: number) {
  const db = getDb();
  const customers = db.prepare(`
    SELECT * FROM customers WHERE user_id = ? ORDER BY name ASC, created_at DESC
  `).all(userId) as any[];

  const products = db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY sort_order ASC').all(userId) as any[];

  for (const cus of customers) {
    const analyses = db.prepare(`
      SELECT p.id as product_id, p.code as product_code, p.name as product_name, COUNT(o.id) as order_count
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.customer_id = ? AND o.user_id = ?
      GROUP BY o.product_id
    `).all(cus.id, userId) as any[];
    cus.analyses = analyses;

    const analyzedCodes = new Set(analyses.map((a: any) => a.product_code));
    cus.unanalyzed_products = products.filter((p: any) => !analyzedCodes.has(p.code));
  }
  return customers;
}

/** 주문을 고객별로 그룹핑하여 조회 */
export function getOrdersGrouped(userId: number, filters?: {
  search?: string; status?: string; productId?: string;
  period?: string; fromDate?: string; toDate?: string;
}) {
  const db = getDb();
  let allOrders = db.prepare(`
    SELECT o.*, c.name as customer_name, c.gender as customer_gender, c.birth_date as customer_birth_date,
     c.birth_time as customer_birth_time, c.calendar_type as customer_calendar_type,
     c.phone as phone, c.email as email, c.customer_code, c.nickname as customer_nickname,
     p.name as product_name, p.code as product_code
     FROM orders o
     JOIN customers c ON o.customer_id = c.id
     JOIN products p ON o.product_id = p.id
     WHERE o.user_id = ?
     ORDER BY c.name ASC, o.consultation_date DESC, o.created_at DESC
  `).all(userId) as any[];

  // Apply filters
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    allOrders = allOrders.filter((o: any) =>
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.phone && o.phone.includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q)) ||
      (o.nickname && o.nickname.toLowerCase().includes(q)) ||
      (o.customer_code && o.customer_code.toLowerCase().includes(q)) ||
      (o.order_code && o.order_code.toLowerCase().includes(q))
    );
  }
  if (filters?.status && filters.status !== 'all') {
    allOrders = allOrders.filter((o: any) => o.status === filters.status);
  }
  if (filters?.productId) {
    allOrders = allOrders.filter((o: any) => o.product_id.toString() === filters.productId);
  }
  if (filters?.period && filters.period !== 'all') {
    const now = new Date();
    let filterDate = new Date();
    switch (filters.period) {
      case 'today': filterDate.setHours(0, 0, 0, 0); break;
      case 'yesterday': filterDate.setDate(filterDate.getDate() - 1); filterDate.setHours(0, 0, 0, 0); break;
      case '3days': filterDate.setDate(filterDate.getDate() - 3); break;
      case '7days': filterDate.setDate(filterDate.getDate() - 7); break;
      case '30days': filterDate.setDate(filterDate.getDate() - 30); break;
    }
    allOrders = allOrders.filter((o: any) => {
      const d = new Date(o.created_at);
      if (filters.period === 'today') return d.toDateString() === now.toDateString();
      if (filters.period === 'yesterday') { const y = new Date(now); y.setDate(y.getDate()-1); return d.toDateString() === y.toDateString(); }
      return d >= filterDate;
    });
  }
  if (filters?.fromDate) {
    const from = new Date(filters.fromDate); from.setHours(0,0,0,0);
    allOrders = allOrders.filter((o: any) => new Date(o.created_at) >= from);
  }
  if (filters?.toDate) {
    const to = new Date(filters.toDate); to.setHours(23,59,59,999);
    allOrders = allOrders.filter((o: any) => new Date(o.created_at) <= to);
  }

  // Group by customer_id
  const groupMap = new Map<number, any>();
  for (const order of allOrders) {
    if (!groupMap.has(order.customer_id)) {
      groupMap.set(order.customer_id, {
        customer_id: order.customer_id,
        customer_code: order.customer_code || '',
        customer_name: order.customer_name,
        customer_nickname: order.customer_nickname || order.nickname || '',
        customer_gender: order.customer_gender,
        customer_birth_date: order.customer_birth_date,
        customer_birth_time: order.customer_birth_time,
        customer_calendar_type: order.customer_calendar_type,
        phone: order.phone || '',
        email: order.email || '',
        orders: [],
      });
    }
    groupMap.get(order.customer_id)!.orders.push(order);
  }
  return Array.from(groupMap.values());
}

/** 고객 닉네임 업데이트 */
export function updateCustomerNickname(id: number, userId: number, nickname: string) {
  const db = getDb();
  db.prepare("UPDATE customers SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").run(nickname, id, userId);
}

// ============ 궁합 페어링 ============
/** 궁합 페어링 생성 */
export function createCompatibilityPair(orderId: number, customerId1: number, customerId2: number) {
  const db = getDb();
  return db.prepare('INSERT INTO compatibility_pairs (order_id, customer_id_1, customer_id_2) VALUES (?, ?, ?)').run(orderId, customerId1, customerId2);
}

/** 주문 ID로 궁합 페어링 조회 */
export function getCompatibilityPair(orderId: number) {
  const db = getDb();
  return db.prepare(`
    SELECT cp.*,
      c1.name as person1_name, c1.gender as person1_gender, c1.birth_date as person1_birth_date,
      c1.birth_time as person1_birth_time, c1.calendar_type as person1_calendar_type, c1.customer_code as person1_code,
      c2.name as person2_name, c2.gender as person2_gender, c2.birth_date as person2_birth_date,
      c2.birth_time as person2_birth_time, c2.calendar_type as person2_calendar_type, c2.customer_code as person2_code
    FROM compatibility_pairs cp
    JOIN customers c1 ON cp.customer_id_1 = c1.id
    JOIN customers c2 ON cp.customer_id_2 = c2.id
    WHERE cp.order_id = ?
  `).get(orderId) as any | undefined;
}

/** 여러 주문의 궁합 페어링 일괄 조회 */
export function getCompatibilityPairsForOrders(orderIds: number[]) {
  if (orderIds.length === 0) return [];
  const db = getDb();
  const placeholders = orderIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT cp.order_id, c2.name as partner_name, c2.customer_code as partner_code
    FROM compatibility_pairs cp
    JOIN customers c2 ON cp.customer_id_2 = c2.id
    WHERE cp.order_id IN (${placeholders})
  `).all(...orderIds) as any[];
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
  nickname?: string; code2?: string; account?: string; extra_question?: string; order_time?: string; consultation_date?: string;
}) {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO orders (user_id, customer_id, product_id, status, points_used, extra_answer, internal_memo, nickname, code2, account, extra_question, order_time, consultation_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  return stmt.run(
    userId, data.customer_id, data.product_id, 'pending', data.points_used,
    data.extra_answer || '', data.internal_memo || '',
    data.nickname || '', data.code2 || '', data.account || '',
    data.extra_question || '', data.order_time || '', data.consultation_date || ''
  );
}

export function getOrders(userId: number, status?: string) {
  const db = getDb();
  if (status && status !== 'all') {
    return db.prepare(
      `SELECT o.*, c.name as customer_name, c.gender as customer_gender, c.birth_date as customer_birth_date,
       c.birth_time as customer_birth_time, c.calendar_type as customer_calendar_type,
       c.phone as phone, c.email as email,
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
  // 상태 변경 시 진행률도 자동 설정
  let progress = 0;
  let progressMessage = '';
  if (status === 'completed') { progress = 100; progressMessage = '완료'; }
  else if (status === 'failed') { progress = 0; progressMessage = '실패'; }
  else if (status === 'requested') { progress = 2; progressMessage = '요청됨'; }
  else if (status === 'analyzing') { progress = 5; progressMessage = '사주 분석 시작'; }
  else if (status === 'pdf_generating') { progress = 90; progressMessage = 'PDF 생성중'; }

  db.prepare(
    `UPDATE orders SET status = ?, progress = ?, progress_message = ?, updated_at = CURRENT_TIMESTAMP, completed_at = ${status === 'completed' ? "datetime('now')" : 'completed_at'} WHERE id = ? AND user_id = ?`
  ).run(status, progress, progressMessage, id, userId);
}

export function updateOrderProgress(id: number, userId: number, progress: number, message: string) {
  const db = getDb();
  db.prepare(
    'UPDATE orders SET progress = ?, progress_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
  ).run(progress, message, id, userId);
}

export function updateOrderDriveInfo(id: number, userId: number, fileId: string, url: string) {
  const db = getDb();
  db.prepare(
    'UPDATE orders SET google_drive_file_id = ?, google_drive_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?'
  ).run(fileId, url, id, userId);
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
  customer_id?: number;
  order_id?: number;
  date?: string;
  chat_history?: string;
  chat_link?: string;
  status?: string;
  gender?: string;
  name?: string;
  birth_date?: string;
  calendar_type?: string;
  birth_time?: string;
  ganji?: string;
  email?: string;
  product?: string;
  amount?: number;
  question?: string;
  additional_payment?: string;
  note?: string;
}) {
  const db = getDb();
  // customer_id, order_id가 없으면 INSERT에서 제외 (기존 DB NOT NULL 호환)
  const cols = ['user_id', 'date', 'chat_history', 'chat_link', 'status', 'gender', 'name', 'birth_date', 'calendar_type', 'birth_time', 'ganji', 'email', 'product', 'amount', 'question', 'additional_payment', 'note'];
  const vals: any[] = [
    userId,
    data.date || new Date().toISOString().split('T')[0],
    data.chat_history || '',
    data.chat_link || '',
    data.status || 'pending',
    data.gender || '',
    data.name || '',
    data.birth_date || '',
    data.calendar_type || 'solar',
    data.birth_time || '',
    data.ganji || '',
    data.email || '',
    data.product || '',
    data.amount || 0,
    data.question || '',
    data.additional_payment || '',
    data.note || ''
  ];
  if (data.customer_id) { cols.push('customer_id'); vals.push(data.customer_id); }
  if (data.order_id) { cols.push('order_id'); vals.push(data.order_id); }
  const placeholders = cols.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO consultations (${cols.join(', ')}) VALUES (${placeholders})`);
  return stmt.run(...vals);
}

export function getConsultations(userId: number, filters?: { date?: string; status?: string; search?: string }) {
  const db = getDb();
  let query = `SELECT * FROM consultations WHERE user_id = ?`;
  const params: any[] = [userId];

  if (filters?.date) {
    query += ` AND date = ?`;
    params.push(filters.date);
  }
  if (filters?.status && filters.status !== 'all') {
    query += ` AND status = ?`;
    params.push(filters.status);
  }
  if (filters?.search) {
    query += ` AND (name LIKE ? OR email LIKE ? OR question LIKE ?)`;
    const s = `%${filters.search}%`;
    params.push(s, s, s);
  }

  query += ` ORDER BY created_at DESC`;
  return db.prepare(query).all(...params);
}

export function updateConsultation(id: number, userId: number, data: Record<string, any>) {
  const db = getDb();
  const allowedFields = ['date', 'chat_history', 'chat_link', 'status', 'gender', 'name', 'birth_date', 'calendar_type', 'birth_time', 'ganji', 'email', 'product', 'amount', 'question', 'additional_payment', 'note'];
  const updates: string[] = [];
  const values: any[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (updates.length === 0) return;
  values.push(id, userId);
  db.prepare(`UPDATE consultations SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
}

export function deleteConsultation(id: number, userId: number) {
  const db = getDb();
  db.prepare('DELETE FROM consultations WHERE id = ? AND user_id = ?').run(id, userId);
}

export function deleteConsultations(ids: number[], userId: number) {
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM consultations WHERE id IN (${placeholders}) AND user_id = ?`).run(...ids, userId);
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
