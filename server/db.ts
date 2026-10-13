import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

export const dataDir =
  process.env.FIELDOPS_DATA_DIR ||
  path.join(
    process.env.HOME || process.cwd(),
    'Library',
    'Application Support',
    'FieldOperations'
  );

export const dirs = {
  root: dataDir,
  attachments: path.join(dataDir, 'attachments'),
  backups: path.join(dataDir, 'backups'),
  reports: path.join(dataDir, 'reports'),
};

export function ensureDirectories() {
  Object.values(dirs).forEach((d) => {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  });
}

export function openDb(customDbPath?: string): Database.Database {
  ensureDirectories();
  const dbFile = customDbPath || path.join(dirs.root, 'fieldops.sqlite');
  const db = new Database(dbFile);

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  migrate(db);
  return db;
}

export function now(): string {
  return new Date().toISOString();
}

export function writeAuditLog(
  db: Database.Database,
  entityType: string,
  entityId: string,
  action: string,
  previousValues: unknown,
  newValues: unknown,
  userName: string = 'System',
  reason?: string
) {
  try {
    db.prepare(
      `INSERT INTO audit_logs (id, entity_type, entity_id, action, previous_values, new_values, reason, user_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      nanoid(),
      entityType,
      entityId,
      action,
      previousValues ? JSON.stringify(previousValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      reason || null,
      userName,
      now()
    );
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const currentVersion = (
    db.prepare('SELECT MAX(version) as v FROM schema_migrations').get() as {
      v: number | null;
    }
  )?.v || 0;

  if (currentVersion < 1) {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'owner',
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS institutions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT,
          address TEXT,
          district TEXT,
          contact_name TEXT,
          phone TEXT,
          email TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS vendors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          address TEXT,
          contact_name TEXT,
          phone TEXT,
          email TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          assigned_by TEXT,
          assigned_to TEXT,
          priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low','Medium','High','Urgent')),
          assignment_date TEXT,
          start_date TEXT,
          due_date TEXT,
          institution_id TEXT REFERENCES institutions(id),
          vendor_id TEXT REFERENCES vendors(id),
          installation_job_id TEXT,
          expected_deliverable TEXT,
          status TEXT NOT NULL DEFAULT 'Assigned' CHECK(status IN ('Assigned','In Progress','Blocked','Completed','Cancelled')),
          progress_notes TEXT,
          blocker_description TEXT,
          pending_reason TEXT,
          next_action TEXT,
          follow_up_date TEXT,
          completion_notes TEXT,
          completion_evidence TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_dates ON tasks(assignment_date, due_date);

        CREATE TABLE IF NOT EXISTS task_updates (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL REFERENCES tasks(id),
          note TEXT NOT NULL,
          status TEXT,
          created_at TEXT NOT NULL,
          user_id TEXT,
          user_name TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_task_updates_task ON task_updates(task_id, created_at);

        CREATE TABLE IF NOT EXISTS field_visits (
          id TEXT PRIMARY KEY,
          institution_id TEXT REFERENCES institutions(id),
          vendor_id TEXT REFERENCES vendors(id),
          institution_type TEXT,
          address TEXT,
          contact_person TEXT,
          phone TEXT,
          purpose TEXT NOT NULL,
          task_id TEXT REFERENCES tasks(id),
          installation_job_id TEXT,
          planned_arrival TEXT,
          actual_start TEXT,
          end_time TEXT,
          status TEXT NOT NULL DEFAULT 'Planned' CHECK(status IN ('Planned','In Progress','Completed','Blocked','Cancelled')),
          equipment_handled TEXT,
          work_performed TEXT,
          results TEXT,
          issues_discovered TEXT,
          next_steps TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_visits_status ON field_visits(status, planned_arrival);

        CREATE TABLE IF NOT EXISTS installation_jobs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          institution_id TEXT REFERENCES institutions(id),
          status TEXT DEFAULT 'Planned' CHECK(status IN ('Planned','In Progress','Validation','Completed','Blocked','Cancelled')),
          site_readiness TEXT,
          validation_results TEXT,
          outstanding_issues TEXT,
          warranty_details TEXT,
          handover_evidence TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS installation_checks (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL REFERENCES installation_jobs(id),
          check_item TEXT NOT NULL,
          passed INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inventory_assets (
          id TEXT PRIMARY KEY,
          asset_id TEXT UNIQUE NOT NULL,
          product_name TEXT NOT NULL,
          category TEXT,
          manufacturer TEXT,
          model TEXT,
          serial_number TEXT,
          vendor_id TEXT REFERENCES vendors(id),
          po_reference TEXT,
          received_date TEXT,
          quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 0),
          receipt_condition TEXT,
          qa_status TEXT NOT NULL DEFAULT 'Pending' CHECK(qa_status IN ('Pending','In Progress','Passed','Failed','Not Applicable')),
          stock_status TEXT NOT NULL DEFAULT 'Received' CHECK(stock_status IN ('Received','QA Pending','Available','Reserved','Dispatched','Installed','Quarantine','Returned to Vendor')),
          assigned_job_id TEXT REFERENCES installation_jobs(id),
          institution_id TEXT REFERENCES institutions(id),
          dispatch_date TEXT,
          installation_date TEXT,
          warranty_end_date TEXT,
          storage_location TEXT,
          notes TEXT,
          disposition_notes TEXT,
          disposition_by TEXT,
          disposition_date TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_inventory_qa ON inventory_assets(qa_status, stock_status);

        CREATE TABLE IF NOT EXISTS qa_records (
          id TEXT PRIMARY KEY,
          asset_id TEXT NOT NULL REFERENCES inventory_assets(id),
          checklist TEXT,
          observations TEXT,
          tester_name TEXT,
          test_date TEXT,
          approval_details TEXT,
          status TEXT NOT NULL CHECK(status IN ('Passed','Failed','In Progress')),
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS company_advances (
          id TEXT PRIMARY KEY,
          received_date TEXT NOT NULL,
          amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
          amount_used_paise INTEGER NOT NULL DEFAULT 0,
          remaining_paise INTEGER NOT NULL CHECK(remaining_paise >= 0),
          settlement_notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          expense_date TEXT NOT NULL,
          task_id TEXT REFERENCES tasks(id),
          visit_id TEXT REFERENCES field_visits(id),
          institution_id TEXT REFERENCES institutions(id),
          installation_job_id TEXT REFERENCES installation_jobs(id),
          category TEXT NOT NULL CHECK(category IN ('Bus','Train','Cab','Fuel','Food','Accommodation','Parking','Toll','Materials','Courier','Other')),
          description TEXT,
          business_purpose TEXT,
          origin TEXT,
          destination TEXT,
          amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
          payment_source TEXT NOT NULL CHECK(payment_source IN ('Company cash','Company advance','Company card','Employee personal funds','Other')),
          receipt_path TEXT,
          submitted_date TEXT,
          approval_status TEXT NOT NULL DEFAULT 'Draft' CHECK(approval_status IN ('Draft','Submitted','Approved','Rejected','Settled')),
          approver_name TEXT,
          approval_reason TEXT,
          reimbursement_paise INTEGER NOT NULL DEFAULT 0,
          settlement_date TEXT,
          notes TEXT,
          advance_id TEXT REFERENCES company_advances(id),
          fingerprint TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_expenses_date_status ON expenses(expense_date, approval_status);
        CREATE INDEX IF NOT EXISTS idx_expenses_payment ON expenses(payment_source);

        CREATE TABLE IF NOT EXISTS expense_approvals (
          id TEXT PRIMARY KEY,
          expense_id TEXT NOT NULL REFERENCES expenses(id),
          decision TEXT NOT NULL CHECK(decision IN ('Approved','Rejected')),
          reason TEXT,
          approver_name TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS expense_settlements (
          id TEXT PRIMARY KEY,
          expense_id TEXT NOT NULL REFERENCES expenses(id),
          amount_paise INTEGER NOT NULL,
          settled_at TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS issues (
          id TEXT PRIMARY KEY,
          reported_date TEXT NOT NULL,
          institution_id TEXT REFERENCES institutions(id),
          visit_id TEXT REFERENCES field_visits(id),
          task_id TEXT REFERENCES tasks(id),
          installation_job_id TEXT REFERENCES installation_jobs(id),
          product_name TEXT,
          model TEXT,
          serial_number TEXT,
          category TEXT NOT NULL CHECK(category IN ('Hardware','Electrical','Software','Connectivity','Calibration','Missing Parts','Installation','Site Readiness','User Training','Vendor Support','Other')),
          symptoms TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'Medium' CHECK(severity IN ('Low','Medium','High','Critical')),
          operational_impact TEXT,
          troubleshooting TEXT,
          observations TEXT,
          root_cause TEXT,
          proposed_solution TEXT,
          responsibility TEXT NOT NULL DEFAULT 'Can resolve independently' CHECK(responsibility IN ('Can resolve independently','Can investigate but needs approval','Needs another technician','Needs vendor support','Needs team lead decision')),
          assigned_support TEXT,
          assistance_required TEXT,
          next_action TEXT,
          target_resolution_date TEXT,
          resolution_notes TEXT,
          validation_results TEXT,
          closure_evidence TEXT,
          is_safety_critical INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'Reported' CHECK(status IN ('Reported','Triaged','In Progress','Waiting for Support','Waiting for Vendor','Resolved','Closed')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_issues_status_severity ON issues(status, severity);

        CREATE TABLE IF NOT EXISTS issue_comments (
          id TEXT PRIMARY KEY,
          issue_id TEXT NOT NULL REFERENCES issues(id),
          comment TEXT NOT NULL,
          author_name TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS issue_assignments (
          id TEXT PRIMARY KEY,
          issue_id TEXT NOT NULL REFERENCES issues(id),
          assigned_to TEXT,
          responsibility TEXT,
          notes TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS daily_reports (
          id TEXT PRIMARY KEY,
          report_date TEXT UNIQUE NOT NULL,
          employee_name TEXT,
          manual_summary TEXT,
          tomorrow_plan TEXT,
          status TEXT DEFAULT 'Draft' CHECK(status IN ('Draft','Submitted')),
          recipient TEXT,
          submitted_at TEXT,
          response_notes TEXT,
          review_status TEXT DEFAULT 'Not reviewed' CHECK(review_status IN ('Not reviewed','Reviewed','Clarification requested')),
          reviewer_name TEXT,
          reviewed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS report_reviews (
          id TEXT PRIMARY KEY,
          report_id TEXT NOT NULL REFERENCES daily_reports(id),
          reviewer_name TEXT,
          status TEXT,
          comments TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS attachments (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          original_name TEXT NOT NULL,
          stored_name TEXT NOT NULL,
          mime_type TEXT,
          size_bytes INTEGER,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          previous_values TEXT,
          new_values TEXT,
          reason TEXT,
          user_name TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id, created_at);

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        INSERT INTO schema_migrations (version, applied_at) VALUES (1, datetime('now'));
      `);
    })();
  }

  // Check columns if table existed prior to v1 changes
  ensureColumns(db);
}

function ensureColumns(db: Database.Database) {
  const tableColumns = (table: string): string[] => {
    try {
      const rows = db.prepare(`PRAGMA table_info(${table})`).all() as {
        name: string;
      }[];
      return rows.map((r) => r.name);
    } catch {
      return [];
    }
  };

  const addCol = (table: string, col: string, def: string) => {
    const cols = tableColumns(table);
    if (!cols.includes(col)) {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      } catch (e) {
        console.warn(`Could not add column ${col} to ${table}:`, e);
      }
    }
  };

  addCol('institutions', 'district', 'TEXT');
  addCol('institutions', 'email', 'TEXT');
  addCol('vendors', 'category', 'TEXT');
  addCol('vendors', 'email', 'TEXT');
  addCol('inventory_assets', 'disposition_notes', 'TEXT');
  addCol('inventory_assets', 'disposition_by', 'TEXT');
  addCol('inventory_assets', 'disposition_date', 'TEXT');
  addCol('inventory_assets', 'deleted_at', 'TEXT');
  addCol('issues', 'is_safety_critical', 'INTEGER NOT NULL DEFAULT 0');
  addCol('issues', 'closure_evidence', 'TEXT');
  addCol('issues', 'installation_job_id', 'TEXT');
  addCol('expenses', 'installation_job_id', 'TEXT');
  addCol('expenses', 'advance_id', 'TEXT');
  addCol('expenses', 'deleted_at', 'TEXT');
  addCol('tasks', 'deleted_at', 'TEXT');
  addCol('tasks', 'pending_reason', 'TEXT');
  addCol('daily_reports', 'reviewer_name', 'TEXT');
  addCol('daily_reports', 'reviewed_at', 'TEXT');
}

export type Db = ReturnType<typeof openDb>;
