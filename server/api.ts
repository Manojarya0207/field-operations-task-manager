import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { openDb, dirs, now, writeAuditLog } from './db.js';

export function createServerApp() {
  let db = openDb();
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(
    session({
      secret:
        process.env.SESSION_SECRET || 'fieldops-local-session-secret-key-4180',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // Local-only http://127.0.0.1
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  type SessUser = { id: string; name: string; username: string; role: string };

  function getSessionUser(req: express.Request): SessUser | null {
    return ((req.session as any).user as SessUser) || null;
  }

  function requireAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    if (!getSessionUser(req)) {
      return res.status(401).json({ error: 'Local sign-in required' });
    }
    next();
  }

  function parseBody<T>(
    schema: z.ZodType<T>,
    data: unknown,
    res: express.Response
  ): T | null {
    const result = schema.safeParse(data);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      });
      return null;
    }
    return result.data;
  }

  // Multer config for local attachments
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dirs.attachments),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const safeName = `${Date.now()}-${nanoid(8)}${ext}`;
        cb(null, safeName);
      },
    }),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
    fileFilter: (_req, file, cb) => {
      const allowed = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'text/plain',
        'text/csv',
      ];
      if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('File format not supported. Only images, PDFs, and text documents are permitted.'));
      }
    },
  });

  // -------------------------------------------------------------
  // AUTHENTICATION & LOCAL OWNER ACCOUNT
  // -------------------------------------------------------------
  app.get('/api/auth/status', (req, res) => {
    const user = getSessionUser(req);
    const count = (
      db.prepare('SELECT count(*) as c FROM users').get() as { c: number }
    ).c;
    res.json({
      user,
      needsSetup: count === 0,
    });
  });

  app.post('/api/auth/setup', (req, res) => {
    const count = (
      db.prepare('SELECT count(*) as c FROM users').get() as { c: number }
    ).c;
    if (count > 0) {
      return res.status(409).json({ error: 'Local owner account already configured' });
    }

    const body = parseBody(
      z.object({
        name: z.string().min(2),
        username: z.string().min(3),
        password: z.string().min(6),
        role: z.enum(['owner', 'technician', 'lead']).default('owner'),
      }),
      req.body,
      res
    );
    if (!body) return;

    const id = nanoid();
    const hash = bcrypt.hashSync(body.password, 10);
    db.prepare(
      'INSERT INTO users (id, name, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, body.name, body.username, hash, body.role, now());

    writeAuditLog(db, 'users', id, 'owner setup', null, { id, name: body.name, username: body.username, role: body.role }, body.name, 'Initial local account creation');

    (req.session as any).user = {
      id,
      name: body.name,
      username: body.username,
      role: body.role,
    };

    res.status(201).json({ user: (req.session as any).user });
  });

  app.post('/api/auth/login', (req, res) => {
    const body = parseBody(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
      req.body,
      res
    );
    if (!body) return;

    const user: any = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(body.username);
    if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid local username or password' });
    }

    (req.session as any).user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    writeAuditLog(db, 'users', user.id, 'login', null, null, user.name, 'Local login');

    res.json({ user: (req.session as any).user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const user = getSessionUser(req);
    if (user) {
      writeAuditLog(db, 'users', user.id, 'logout', null, null, user.name, 'Local lock');
    }
    req.session.destroy(() => res.status(204).end());
  });

  app.get('/api/auth/users', requireAuth, (req, res) => {
    const rows = db.prepare('SELECT id, name, username, role, created_at FROM users ORDER BY name').all();
    res.json(rows);
  });

  // Protect all subsequent /api routes
  app.use('/api', requireAuth);

  // -------------------------------------------------------------
  // DASHBOARD METRICS
  // -------------------------------------------------------------
  app.get('/api/dashboard', (req, res) => {
    const nowIso = now();
    const today = nowIso.slice(0, 10);
    const month = nowIso.slice(0, 7);

    const one = (sql: string, ...params: any[]) =>
      (db.prepare(sql).get(...params) as any)?.n || 0;

    const assignedToday = one(
      "SELECT count(*) as n FROM tasks WHERE assignment_date LIKE ? AND deleted_at IS NULL",
      today + '%'
    );
    const completedToday = one(
      "SELECT count(*) as n FROM tasks WHERE status = 'Completed' AND updated_at LIKE ? AND deleted_at IS NULL",
      today + '%'
    );
    const pendingTasks = one(
      "SELECT count(*) as n FROM tasks WHERE status IN ('Assigned', 'In Progress', 'Blocked') AND deleted_at IS NULL"
    );
    const overdueTasks = one(
      "SELECT count(*) as n FROM tasks WHERE due_date < ? AND status NOT IN ('Completed', 'Cancelled') AND deleted_at IS NULL",
      today
    );
    const blockedTasks = one(
      "SELECT count(*) as n FROM tasks WHERE status = 'Blocked' AND deleted_at IS NULL"
    );

    const visitsPlanned = one(
      "SELECT count(*) as n FROM field_visits WHERE planned_arrival LIKE ? AND deleted_at IS NULL",
      today + '%'
    );
    const visitsCompleted = one(
      "SELECT count(*) as n FROM field_visits WHERE status = 'Completed' AND updated_at LIKE ? AND deleted_at IS NULL",
      today + '%'
    );

    const todayExpensesPaise = one(
      "SELECT coalesce(sum(amount_paise), 0) as n FROM expenses WHERE expense_date LIKE ? AND deleted_at IS NULL",
      today + '%'
    );
    const monthlyExpensesPaise = one(
      "SELECT coalesce(sum(amount_paise), 0) as n FROM expenses WHERE expense_date LIKE ? AND deleted_at IS NULL",
      month + '%'
    );

    const unresolvedIssues = one(
      "SELECT count(*) as n FROM issues WHERE status NOT IN ('Resolved', 'Closed') AND deleted_at IS NULL"
    );
    const issuesAwaitingHelp = one(
      "SELECT count(*) as n FROM issues WHERE status = 'Waiting for Support' AND deleted_at IS NULL"
    );
    const issuesAwaitingVendor = one(
      "SELECT count(*) as n FROM issues WHERE status = 'Waiting for Vendor' AND deleted_at IS NULL"
    );
    const criticalIssues = one(
      "SELECT count(*) as n FROM issues WHERE severity = 'Critical' AND status NOT IN ('Resolved', 'Closed') AND deleted_at IS NULL"
    );

    const claimsAwaitingApproval = one(
      "SELECT count(*) as n FROM expenses WHERE approval_status = 'Submitted' AND deleted_at IS NULL"
    );
    const claimsAwaitingSettlement = one(
      "SELECT count(*) as n FROM expenses WHERE approval_status = 'Approved' AND deleted_at IS NULL"
    );
    const pendingReimbursementPaise = one(
      "SELECT coalesce(sum(reimbursement_paise), 0) as n FROM expenses WHERE approval_status IN ('Submitted', 'Approved') AND payment_source = 'Employee personal funds' AND deleted_at IS NULL"
    );

    const advancesBalancePaise = one(
      "SELECT coalesce(sum(remaining_paise), 0) as n FROM company_advances"
    );

    const recentAudit = db
      .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10')
      .all();

    const tasksByPriority = db
      .prepare(
        "SELECT priority, count(*) as count FROM tasks WHERE status NOT IN ('Completed', 'Cancelled') AND deleted_at IS NULL GROUP BY priority"
      )
      .all();

    const expensesByCategory = db
      .prepare(
        "SELECT category, coalesce(sum(amount_paise), 0) as total_paise FROM expenses WHERE expense_date LIKE ? AND deleted_at IS NULL GROUP BY category"
      )
      .all(month + '%');

    res.json({
      date: today,
      assignedToday,
      completedToday,
      pendingTasks,
      overdueTasks,
      blockedTasks,
      visitsPlanned,
      visitsCompleted,
      todayExpensesPaise,
      monthlyExpensesPaise,
      unresolvedIssues,
      issuesAwaitingHelp,
      issuesAwaitingVendor,
      criticalIssues,
      claimsAwaitingApproval,
      claimsAwaitingSettlement,
      pendingReimbursementPaise,
      advancesBalancePaise,
      recentAudit,
      tasksByPriority,
      expensesByCategory,
    });
  });

  // -------------------------------------------------------------
  // INSTITUTIONS & VENDORS
  // -------------------------------------------------------------
  app.get('/api/institutions', (req, res) => {
    const rows = db
      .prepare('SELECT * FROM institutions WHERE deleted_at IS NULL ORDER BY name')
      .all();
    res.json(rows);
  });

  app.post('/api/institutions', (req, res) => {
    const body = parseBody(
      z.object({
        name: z.string().min(1),
        type: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        district: z.string().optional().nullable(),
        contact_name: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
      }),
      req.body,
      res
    );
    if (!body) return;

    const id = nanoid();
    const stamp = now();
    db.prepare(
      `INSERT INTO institutions (id, name, type, address, district, contact_name, phone, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.name,
      body.type || null,
      body.address || null,
      body.district || null,
      body.contact_name || null,
      body.phone || null,
      body.email || null,
      stamp,
      stamp
    );

    const user = getSessionUser(req);
    writeAuditLog(db, 'institutions', id, 'created', null, body, user?.name);

    res.status(201).json(db.prepare('SELECT * FROM institutions WHERE id = ?').get(id));
  });

  app.get('/api/vendors', (req, res) => {
    const rows = db
      .prepare('SELECT * FROM vendors WHERE deleted_at IS NULL ORDER BY name')
      .all();
    res.json(rows);
  });

  app.post('/api/vendors', (req, res) => {
    const body = parseBody(
      z.object({
        name: z.string().min(1),
        category: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        contact_name: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
      }),
      req.body,
      res
    );
    if (!body) return;

    const id = nanoid();
    const stamp = now();
    db.prepare(
      `INSERT INTO vendors (id, name, category, address, contact_name, phone, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.name,
      body.category || null,
      body.address || null,
      body.contact_name || null,
      body.phone || null,
      body.email || null,
      stamp,
      stamp
    );

    const user = getSessionUser(req);
    writeAuditLog(db, 'vendors', id, 'created', null, body, user?.name);

    res.status(201).json(db.prepare('SELECT * FROM vendors WHERE id = ?').get(id));
  });

  // -------------------------------------------------------------
  // TASKS MANAGEMENT
  // -------------------------------------------------------------
  const taskSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional().nullable(),
    assigned_by: z.string().optional().nullable(),
    assigned_to: z.string().optional().nullable(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
    assignment_date: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    institution_id: z.string().optional().nullable(),
    vendor_id: z.string().optional().nullable(),
    installation_job_id: z.string().optional().nullable(),
    expected_deliverable: z.string().optional().nullable(),
    status: z.enum(['Assigned', 'In Progress', 'Blocked', 'Completed', 'Cancelled']).default('Assigned'),
    progress_notes: z.string().optional().nullable(),
    blocker_description: z.string().optional().nullable(),
    pending_reason: z.string().optional().nullable(),
    next_action: z.string().optional().nullable(),
    follow_up_date: z.string().optional().nullable(),
    completion_notes: z.string().optional().nullable(),
    completion_evidence: z.string().optional().nullable(),
  });

  app.get('/api/tasks', (req, res) => {
    const q = req.query.q ? String(req.query.q) : '';
    const status = req.query.status ? String(req.query.status) : '';
    const priority = req.query.priority ? String(req.query.priority) : '';
    const filter = req.query.filter ? String(req.query.filter) : '';
    const today = now().slice(0, 10);

    let sql = `
      SELECT t.*, i.name as institution_name, v.name as vendor_name
      FROM tasks t
      LEFT JOIN institutions i ON t.institution_id = i.id
      LEFT JOIN vendors v ON t.vendor_id = v.id
      WHERE t.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (q) {
      sql += ' AND (t.title LIKE ? OR t.description LIKE ? OR t.expected_deliverable LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    if (priority) {
      sql += ' AND t.priority = ?';
      params.push(priority);
    }
    if (filter === 'overdue') {
      sql += " AND t.due_date < ? AND t.status NOT IN ('Completed', 'Cancelled')";
      params.push(today);
    } else if (filter === 'today') {
      sql += ' AND (t.assignment_date LIKE ? OR t.due_date LIKE ?)';
      params.push(`${today}%`, `${today}%`);
    }

    sql += " ORDER BY CASE t.priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, t.due_date ASC, t.updated_at DESC";

    const tasks = db.prepare(sql).all(...params);
    res.json(tasks);
  });

  app.post('/api/tasks', (req, res) => {
    const body = parseBody(taskSchema, req.body, res);
    if (!body) return;

    if (body.status === 'Blocked' && !body.blocker_description && !body.pending_reason) {
      return res.status(400).json({ error: 'A blocker description or pending reason is required when marking a task as Blocked.' });
    }

    const id = nanoid();
    const stamp = now();
    const user = getSessionUser(req);

    const cols = [
      'id', 'title', 'description', 'assigned_by', 'assigned_to', 'priority',
      'assignment_date', 'start_date', 'due_date', 'institution_id', 'vendor_id',
      'installation_job_id', 'expected_deliverable', 'status', 'progress_notes',
      'blocker_description', 'pending_reason', 'next_action', 'follow_up_date',
      'completion_notes', 'completion_evidence', 'created_at', 'updated_at'
    ];

    const values = [
      id,
      body.title,
      body.description || '',
      body.assigned_by || user?.name || null,
      body.assigned_to || user?.name || null,
      body.priority || 'Medium',
      body.assignment_date || stamp.slice(0, 10),
      body.start_date || null,
      body.due_date || null,
      body.institution_id || null,
      body.vendor_id || null,
      body.installation_job_id || null,
      body.expected_deliverable || null,
      body.status || 'Assigned',
      body.progress_notes || null,
      body.blocker_description || null,
      body.pending_reason || null,
      body.next_action || null,
      body.follow_up_date || null,
      body.completion_notes || null,
      body.completion_evidence || null,
      stamp,
      stamp,
    ];

    const placeholders = values.map(() => '?').join(',');
    db.prepare(`INSERT INTO tasks (${cols.join(',')}) VALUES (${placeholders})`).run(...values);

    // Initial update record
    db.prepare(
      'INSERT INTO task_updates (id, task_id, note, status, created_at, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(nanoid(), id, 'Task assigned and logged', body.status || 'Assigned', stamp, user?.id || null, user?.name || 'Local');

    writeAuditLog(db, 'tasks', id, 'created', null, body, user?.name);

    res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
  });

  app.get('/api/tasks/:id', (req, res) => {
    const task: any = db
      .prepare(`
        SELECT t.*, i.name as institution_name, v.name as vendor_name
        FROM tasks t
        LEFT JOIN institutions i ON t.institution_id = i.id
        LEFT JOIN vendors v ON t.vendor_id = v.id
        WHERE t.id = ? AND t.deleted_at IS NULL
      `)
      .get(req.params.id);

    if (!task) return res.status(404).json({ error: 'Task not found' });

    const updates = db
      .prepare('SELECT * FROM task_updates WHERE task_id = ? ORDER BY created_at DESC')
      .all(req.params.id);

    res.json({ ...task, updates });
  });

  app.patch('/api/tasks/:id', (req, res) => {
    const body = parseBody(taskSchema.partial(), req.body, res);
    if (!body) return;

    const oldTask: any = db.prepare('SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!oldTask) return res.status(404).json({ error: 'Task not found' });

    if (body.status === 'Blocked' && !body.blocker_description && !body.pending_reason && !oldTask.blocker_description && !oldTask.pending_reason) {
      return res.status(400).json({ error: 'Please record a blocker description or pending reason when setting status to Blocked.' });
    }

    const keys = Object.keys(body);
    if (keys.length === 0) return res.json(oldTask);

    const stamp = now();
    const setClauses = keys.map((k) => `${k} = ?`).join(', ') + ', updated_at = ?';
    const params = keys.map((k) => (body as any)[k]);
    params.push(stamp, req.params.id);

    const user = getSessionUser(req);

    const tx = db.transaction(() => {
      db.prepare(`UPDATE tasks SET ${setClauses} WHERE id = ?`).run(...params);

      if (body.status && body.status !== oldTask.status) {
        db.prepare(
          'INSERT INTO task_updates (id, task_id, note, status, created_at, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          nanoid(),
          req.params.id,
          body.progress_notes || `Status changed from ${oldTask.status} to ${body.status}`,
          body.status,
          stamp,
          user?.id || null,
          user?.name || 'Local'
        );
      }
    });
    tx();

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    writeAuditLog(db, 'tasks', req.params.id, 'updated', oldTask, updated, user?.name);

    res.json(updated);
  });

  app.post('/api/tasks/:id/updates', (req, res) => {
    const body = parseBody(
      z.object({
        note: z.string().min(1),
        status: z.enum(['Assigned', 'In Progress', 'Blocked', 'Completed', 'Cancelled']).optional(),
      }),
      req.body,
      res
    );
    if (!body) return;

    const task: any = db.prepare('SELECT * FROM tasks WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const stamp = now();
    const user = getSessionUser(req);

    const tx = db.transaction(() => {
      db.prepare(
        'INSERT INTO task_updates (id, task_id, note, status, created_at, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(nanoid(), task.id, body.note, body.status || task.status, stamp, user?.id || null, user?.name || 'Local');

      if (body.status) {
        db.prepare('UPDATE tasks SET status = ?, progress_notes = ?, updated_at = ? WHERE id = ?').run(
          body.status,
          body.note,
          stamp,
          task.id
        );
      } else {
        db.prepare('UPDATE tasks SET progress_notes = ?, updated_at = ? WHERE id = ?').run(
          body.note,
          stamp,
          task.id
        );
      }
    });
    tx();

    writeAuditLog(db, 'tasks', task.id, 'progress update', { status: task.status }, body, user?.name);

    res.status(201).json({ ok: true });
  });

  app.post('/api/tasks/carry-forward', (req, res) => {
    const user = getSessionUser(req);
    const today = now().slice(0, 10);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const pending = db
      .prepare("SELECT * FROM tasks WHERE status IN ('Assigned', 'In Progress', 'Blocked') AND deleted_at IS NULL")
      .all() as any[];

    if (!pending.length) {
      return res.json({ count: 0, message: 'No unfinished tasks to carry forward.' });
    }

    const stamp = now();
    const tx = db.transaction(() => {
      for (const t of pending) {
        db.prepare(
          'UPDATE tasks SET due_date = ?, progress_notes = ?, updated_at = ? WHERE id = ?'
        ).run(
          tomorrow,
          `Carried forward from ${today} to ${tomorrow}`,
          stamp,
          t.id
        );
        db.prepare(
          'INSERT INTO task_updates (id, task_id, note, status, created_at, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
          nanoid(),
          t.id,
          `Carried forward to next working day (${tomorrow})`,
          t.status,
          stamp,
          user?.id || null,
          user?.name || 'Local'
        );
      }
    });
    tx();

    writeAuditLog(db, 'tasks', 'bulk', 'carry forward', null, { count: pending.length, targetDate: tomorrow }, user?.name);

    res.json({ count: pending.length, targetDate: tomorrow });
  });

  // -------------------------------------------------------------
  // FIELD VISITS
  // -------------------------------------------------------------
  const visitSchema = z.object({
    institution_id: z.string().optional().nullable(),
    vendor_id: z.string().optional().nullable(),
    institution_type: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    contact_person: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    purpose: z.string().min(1),
    task_id: z.string().optional().nullable(),
    installation_job_id: z.string().optional().nullable(),
    planned_arrival: z.string().optional().nullable(),
    actual_start: z.string().optional().nullable(),
    end_time: z.string().optional().nullable(),
    status: z.enum(['Planned', 'In Progress', 'Completed', 'Blocked', 'Cancelled']).default('Planned'),
    equipment_handled: z.string().optional().nullable(),
    work_performed: z.string().optional().nullable(),
    results: z.string().optional().nullable(),
    issues_discovered: z.string().optional().nullable(),
    next_steps: z.string().optional().nullable(),
  });

  app.get('/api/visits', (req, res) => {
    const q = req.query.q ? String(req.query.q) : '';
    const status = req.query.status ? String(req.query.status) : '';

    let sql = `
      SELECT v.*, i.name as institution_name, ven.name as vendor_name, t.title as task_title
      FROM field_visits v
      LEFT JOIN institutions i ON v.institution_id = i.id
      LEFT JOIN vendors ven ON v.vendor_id = ven.id
      LEFT JOIN tasks t ON v.task_id = t.id
      WHERE v.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (q) {
      sql += ' AND (v.purpose LIKE ? OR v.work_performed LIKE ? OR v.equipment_handled LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      sql += ' AND v.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY v.planned_arrival DESC, v.updated_at DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  app.post('/api/visits', (req, res) => {
    const body = parseBody(visitSchema, req.body, res);
    if (!body) return;

    const id = nanoid();
    const stamp = now();
    const user = getSessionUser(req);

    const cols = [
      'id', 'institution_id', 'vendor_id', 'institution_type', 'address',
      'contact_person', 'phone', 'purpose', 'task_id', 'installation_job_id',
      'planned_arrival', 'actual_start', 'end_time', 'status', 'equipment_handled',
      'work_performed', 'results', 'issues_discovered', 'next_steps', 'created_at', 'updated_at'
    ];

    const values = [
      id,
      body.institution_id || null,
      body.vendor_id || null,
      body.institution_type || null,
      body.address || null,
      body.contact_person || null,
      body.phone || null,
      body.purpose,
      body.task_id || null,
      body.installation_job_id || null,
      body.planned_arrival || stamp,
      body.actual_start || null,
      body.end_time || null,
      body.status || 'Planned',
      body.equipment_handled || null,
      body.work_performed || null,
      body.results || null,
      body.issues_discovered || null,
      body.next_steps || null,
      stamp,
      stamp,
    ];

    db.prepare(`INSERT INTO field_visits (${cols.join(',')}) VALUES (${values.map(() => '?').join(',')})`).run(...values);

    writeAuditLog(db, 'field_visits', id, 'created', null, body, user?.name);

    res.status(201).json(db.prepare('SELECT * FROM field_visits WHERE id = ?').get(id));
  });

  app.get('/api/visits/:id', (req, res) => {
    const visit: any = db
      .prepare(`
        SELECT v.*, i.name as institution_name, ven.name as vendor_name, t.title as task_title
        FROM field_visits v
        LEFT JOIN institutions i ON v.institution_id = i.id
        LEFT JOIN vendors ven ON v.vendor_id = ven.id
        LEFT JOIN tasks t ON v.task_id = t.id
        WHERE v.id = ? AND v.deleted_at IS NULL
      `)
      .get(req.params.id);

    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    const expenses = db.prepare('SELECT * FROM expenses WHERE visit_id = ? AND deleted_at IS NULL').all(visit.id);
    const issues = db.prepare('SELECT * FROM issues WHERE visit_id = ? AND deleted_at IS NULL').all(visit.id);
    const attachments = db.prepare("SELECT * FROM attachments WHERE entity_type = 'field_visits' AND entity_id = ?").all(visit.id);

    res.json({ ...visit, expenses, issues, attachments });
  });

  app.patch('/api/visits/:id', (req, res) => {
    const body = parseBody(visitSchema.partial(), req.body, res);
    if (!body) return;

    const oldVisit: any = db.prepare('SELECT * FROM field_visits WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!oldVisit) return res.status(404).json({ error: 'Visit not found' });

    const keys = Object.keys(body);
    if (keys.length === 0) return res.json(oldVisit);

    const stamp = now();
    const setClauses = keys.map((k) => `${k} = ?`).join(', ') + ', updated_at = ?';
    const params = keys.map((k) => (body as any)[k]);
    params.push(stamp, req.params.id);

    db.prepare(`UPDATE field_visits SET ${setClauses} WHERE id = ?`).run(...params);

    const user = getSessionUser(req);
    const updated = db.prepare('SELECT * FROM field_visits WHERE id = ?').get(req.params.id);
    writeAuditLog(db, 'field_visits', req.params.id, 'updated', oldVisit, updated, user?.name);

    res.json(updated);
  });

  // -------------------------------------------------------------
  // EXPENSES & ADVANCES MANAGEMENT
  // -------------------------------------------------------------
  const expenseSchema = z.object({
    expense_date: z.string().min(1),
    category: z.enum([
      'Bus', 'Train', 'Cab', 'Fuel', 'Food', 'Accommodation',
      'Parking', 'Toll', 'Materials', 'Courier', 'Other'
    ]),
    amount_paise: z.number().int().nonnegative(),
    payment_source: z.enum([
      'Company cash', 'Company advance', 'Company card', 'Employee personal funds', 'Other'
    ]),
    description: z.string().optional().nullable(),
    business_purpose: z.string().optional().nullable(),
    origin: z.string().optional().nullable(),
    destination: z.string().optional().nullable(),
    task_id: z.string().optional().nullable(),
    visit_id: z.string().optional().nullable(),
    institution_id: z.string().optional().nullable(),
    installation_job_id: z.string().optional().nullable(),
    receipt_path: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    advance_id: z.string().optional().nullable(),
  });

  app.get('/api/expenses', (req, res) => {
    const q = req.query.q ? String(req.query.q) : '';
    const category = req.query.category ? String(req.query.category) : '';
    const status = req.query.status ? String(req.query.status) : '';
    const paymentSource = req.query.payment_source ? String(req.query.payment_source) : '';

    let sql = `
      SELECT e.*, i.name as institution_name, v.purpose as visit_purpose, t.title as task_title
      FROM expenses e
      LEFT JOIN institutions i ON e.institution_id = i.id
      LEFT JOIN field_visits v ON e.visit_id = v.id
      LEFT JOIN tasks t ON e.task_id = t.id
      WHERE e.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (q) {
      sql += ' AND (e.description LIKE ? OR e.business_purpose LIKE ? OR e.origin LIKE ? OR e.destination LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (category) {
      sql += ' AND e.category = ?';
      params.push(category);
    }
    if (status) {
      sql += ' AND e.approval_status = ?';
      params.push(status);
    }
    if (paymentSource) {
      sql += ' AND e.payment_source = ?';
      params.push(paymentSource);
    }

    sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  app.post('/api/expenses', (req, res) => {
    const body = parseBody(expenseSchema, req.body, res);
    if (!body) return;

    // Duplicate check safeguard
    const fingerprint = `${body.expense_date.slice(0, 10)}_${body.amount_paise}_${body.category}_${body.payment_source}_${(body.description || '').trim().toLowerCase()}`;
    const duplicate = db
      .prepare('SELECT id FROM expenses WHERE fingerprint = ? AND deleted_at IS NULL')
      .get(fingerprint);

    if (duplicate && !req.query.force) {
      return res.status(409).json({
        error: 'Duplicate expense detected: An expense with identical date, category, amount, payment source, and description already exists.',
        duplicateId: (duplicate as any).id,
      });
    }

    // Double counting safeguards:
    // Only 'Employee personal funds' qualifies for employee reimbursement claims.
    let reimbursementPaise = 0;
    if (body.payment_source === 'Employee personal funds') {
      reimbursementPaise = body.amount_paise;
    }

    const id = nanoid();
    const stamp = now();
    const user = getSessionUser(req);

    const tx = db.transaction(() => {
      // If paid by company advance, deduct from advance remaining balance
      if (body.payment_source === 'Company advance' && body.advance_id) {
        const adv: any = db.prepare('SELECT * FROM company_advances WHERE id = ?').get(body.advance_id);
        if (adv) {
          const newUsed = adv.amount_used_paise + body.amount_paise;
          const newRemaining = Math.max(0, adv.amount_paise - newUsed);
          db.prepare('UPDATE company_advances SET amount_used_paise = ?, remaining_paise = ?, updated_at = ? WHERE id = ?').run(
            newUsed,
            newRemaining,
            stamp,
            adv.id
          );
        }
      }

      db.prepare(`
        INSERT INTO expenses (
          id, expense_date, task_id, visit_id, institution_id, installation_job_id,
          category, description, business_purpose, origin, destination,
          amount_paise, payment_source, receipt_path, submitted_date,
          approval_status, approver_name, approval_reason, reimbursement_paise,
          notes, advance_id, fingerprint, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.expense_date,
        body.task_id || null,
        body.visit_id || null,
        body.institution_id || null,
        body.installation_job_id || null,
        body.category,
        body.description || null,
        body.business_purpose || null,
        body.origin || null,
        body.destination || null,
        body.amount_paise,
        body.payment_source,
        body.receipt_path || null,
        stamp.slice(0, 10),
        'Draft', // Initial state
        null,
        null,
        reimbursementPaise,
        body.notes || null,
        body.advance_id || null,
        fingerprint,
        stamp,
        stamp
      );
    });
    tx();

    writeAuditLog(db, 'expenses', id, 'created', null, body, user?.name);

    res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(id));
  });

  app.patch('/api/expenses/:id', (req, res) => {
    const body = parseBody(expenseSchema.partial(), req.body, res);
    if (!body) return;

    const oldExpense: any = db.prepare('SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!oldExpense) return res.status(404).json({ error: 'Expense not found' });

    if (oldExpense.approval_status === 'Settled') {
      return res.status(409).json({ error: 'Cannot modify an expense that has already been settled.' });
    }

    const keys = Object.keys(body);
    if (keys.length === 0) return res.json(oldExpense);

    // Recompute reimbursement if payment source or amount changed
    const targetSource = body.payment_source || oldExpense.payment_source;
    const targetAmount = body.amount_paise !== undefined ? body.amount_paise : oldExpense.amount_paise;
    const reimbursementPaise = targetSource === 'Employee personal funds' ? targetAmount : 0;

    const stamp = now();
    const setClauses = keys.map((k) => `${k} = ?`).join(', ') + ', reimbursement_paise = ?, updated_at = ?';
    const params = keys.map((k) => (body as any)[k]);
    params.push(reimbursementPaise, stamp, req.params.id);

    db.prepare(`UPDATE expenses SET ${setClauses} WHERE id = ?`).run(...params);

    const user = getSessionUser(req);
    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    writeAuditLog(db, 'expenses', req.params.id, 'updated', oldExpense, updated, user?.name);

    res.json(updated);
  });

  app.post('/api/expenses/:id/submit', (req, res) => {
    const oldExpense: any = db.prepare('SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!oldExpense) return res.status(404).json({ error: 'Expense not found' });

    if (oldExpense.approval_status !== 'Draft') {
      return res.status(400).json({ error: 'Only Draft expenses can be submitted.' });
    }

    const stamp = now();
    db.prepare('UPDATE expenses SET approval_status = ?, submitted_date = ?, updated_at = ? WHERE id = ?').run(
      'Submitted',
      stamp.slice(0, 10),
      stamp,
      oldExpense.id
    );

    const user = getSessionUser(req);
    writeAuditLog(db, 'expenses', oldExpense.id, 'submitted', oldExpense, { approval_status: 'Submitted' }, user?.name);

    res.json({ ok: true, status: 'Submitted' });
  });

  app.post('/api/expenses/:id/decision', (req, res) => {
    const body = parseBody(
      z.object({
        decision: z.enum(['Approved', 'Rejected']),
        reason: z.string().optional().nullable(),
        approver_name: z.string().min(1),
      }),
      req.body,
      res
    );
    if (!body) return;

    const oldExpense: any = db.prepare('SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!oldExpense) return res.status(404).json({ error: 'Expense not found' });

    if (oldExpense.approval_status === 'Settled') {
      return res.status(409).json({ error: 'Cannot change decision on an already settled expense.' });
    }

    const stamp = now();
    const user = getSessionUser(req);

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE expenses
        SET approval_status = ?, approver_name = ?, approval_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(body.decision, body.approver_name, body.reason || null, stamp, oldExpense.id);

      db.prepare(`
        INSERT INTO expense_approvals (id, expense_id, decision, reason, approver_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(nanoid(), oldExpense.id, body.decision, body.reason || null, body.approver_name, stamp);
    });
    tx();

    writeAuditLog(db, 'expenses', oldExpense.id, body.decision, oldExpense, body, user?.name);

    res.json({ ok: true, decision: body.decision });
  });

  app.post('/api/expenses/:id/settle', (req, res) => {
    const body = parseBody(
      z.object({
        notes: z.string().optional().nullable(),
        settlement_date: z.string().optional().nullable(),
      }),
      req.body,
      res
    );
    if (!body) return;

    const oldExpense: any = db.prepare('SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!oldExpense) return res.status(404).json({ error: 'Expense not found' });

    if (oldExpense.approval_status !== 'Approved') {
      return res.status(400).json({ error: 'Only Approved expenses can be marked as Settled.' });
    }

    const stamp = now();
    const settleDate = body.settlement_date || stamp.slice(0, 10);
    const user = getSessionUser(req);

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE expenses
        SET approval_status = 'Settled', settlement_date = ?, updated_at = ?
        WHERE id = ?
      `).run(settleDate, stamp, oldExpense.id);

      db.prepare(`
        INSERT INTO expense_settlements (id, expense_id, amount_paise, settled_at, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(nanoid(), oldExpense.id, oldExpense.reimbursement_paise, settleDate, body.notes || null, stamp);
    });
    tx();

    writeAuditLog(db, 'expenses', oldExpense.id, 'settled', oldExpense, { settled_at: settleDate }, user?.name);

    res.json({ ok: true, status: 'Settled' });
  });

  // Company Advances
  app.get('/api/advances', (req, res) => {
    const rows = db.prepare('SELECT * FROM company_advances ORDER BY received_date DESC').all();
    res.json(rows);
  });

  app.post('/api/advances', (req, res) => {
    const body = parseBody(
      z.object({
        received_date: z.string().min(1),
        amount_paise: z.number().int().nonnegative(),
        settlement_notes: z.string().optional().nullable(),
      }),
      req.body,
      res
    );
    if (!body) return;

    const id = nanoid();
    const stamp = now();
    const user = getSessionUser(req);

    db.prepare(`
      INSERT INTO company_advances (id, received_date, amount_paise, amount_used_paise, remaining_paise, settlement_notes, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?, ?, ?)
    `).run(id, body.received_date, body.amount_paise, body.amount_paise, body.settlement_notes || null, stamp, stamp);

    writeAuditLog(db, 'company_advances', id, 'created', null, body, user?.name);

    res.status(201).json(db.prepare('SELECT * FROM company_advances WHERE id = ?').get(id));
  });

  // -------------------------------------------------------------
  // TECHNICAL ISSUES & SUPPORT
  // -------------------------------------------------------------
  const issueSchema = z.object({
    reported_date: z.string().min(1),
    institution_id: z.string().optional().nullable(),
    visit_id: z.string().optional().nullable(),
    task_id: z.string().optional().nullable(),
    installation_job_id: z.string().optional().nullable(),
    product_name: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    serial_number: z.string().optional().nullable(),
    category: z.enum([
      'Hardware', 'Electrical', 'Software', 'Connectivity',
      'Calibration', 'Missing Parts', 'Installation', 'Site Readiness',
      'User Training', 'Vendor Support', 'Other'
    ]),
    symptoms: z.string().min(1),
    severity: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
    operational_impact: z.string().optional().nullable(),
    troubleshooting: z.string().optional().nullable(),
    observations: z.string().optional().nullable(),
    root_cause: z.string().optional().nullable(),
    proposed_solution: z.string().optional().nullable(),
    responsibility: z.enum([
      'Can resolve independently',
      'Can investigate but needs approval',
      'Needs another technician',
      'Needs vendor support',
      'Needs team lead decision'
    ]).default('Can resolve independently'),
    assigned_support: z.string().optional().nullable(),
    assistance_required: z.string().optional().nullable(),
    next_action: z.string().optional().nullable(),
    target_resolution_date: z.string().optional().nullable(),
    resolution_notes: z.string().optional().nullable(),
    validation_results: z.string().optional().nullable(),
    closure_evidence: z.string().optional().nullable(),
    is_safety_critical: z.number().int().optional(),
    status: z.enum([
      'Reported', 'Triaged', 'In Progress', 'Waiting for Support',
      'Waiting for Vendor', 'Resolved', 'Closed'
    ]).default('Reported'),
  });

  app.get('/api/issues', (req, res) => {
    const q = req.query.q ? String(req.query.q) : '';
    const status = req.query.status ? String(req.query.status) : '';
    const severity = req.query.severity ? String(req.query.severity) : '';
    const category = req.query.category ? String(req.query.category) : '';

    let sql = `
      SELECT iss.*, i.name as institution_name, v.purpose as visit_purpose
      FROM issues iss
      LEFT JOIN institutions i ON iss.institution_id = i.id
      LEFT JOIN field_visits v ON iss.visit_id = v.id
      WHERE iss.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (q) {
      sql += ' AND (iss.symptoms LIKE ? OR iss.product_name LIKE ? OR iss.serial_number LIKE ? OR iss.root_cause LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      sql += ' AND iss.status = ?';
      params.push(status);
    }
    if (severity) {
      sql += ' AND iss.severity = ?';
      params.push(severity);
    }
    if (category) {
      sql += ' AND iss.category = ?';
      params.push(category);
    }

    sql += " ORDER BY CASE iss.severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, iss.updated_at DESC";

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  app.post('/api/issues', (req, res) => {
    const body = parseBody(issueSchema, req.body, res);
    if (!body) return;

    // Safety-critical flag: electrical equipment or critical severity
    const isSafetyCritical =
      body.category === 'Electrical' || body.severity === 'Critical' || Boolean(body.is_safety_critical) ? 1 : 0;

    const id = nanoid();
    const stamp = now();
    const user = getSessionUser(req);

    const cols = [
      'id', 'reported_date', 'institution_id', 'visit_id', 'task_id', 'installation_job_id',
      'product_name', 'model', 'serial_number', 'category', 'symptoms', 'severity',
      'operational_impact', 'troubleshooting', 'observations', 'root_cause', 'proposed_solution',
      'responsibility', 'assigned_support', 'assistance_required', 'next_action',
      'target_resolution_date', 'resolution_notes', 'validation_results', 'closure_evidence',
      'is_safety_critical', 'status', 'created_at', 'updated_at'
    ];

    const values = [
      id,
      body.reported_date,
      body.institution_id || null,
      body.visit_id || null,
      body.task_id || null,
      body.installation_job_id || null,
      body.product_name || null,
      body.model || null,
      body.serial_number || null,
      body.category,
      body.symptoms,
      body.severity || 'Medium',
      body.operational_impact || null,
      body.troubleshooting || null,
      body.observations || null,
      body.root_cause || null,
      body.proposed_solution || null,
      body.responsibility || 'Can resolve independently',
      body.assigned_support || null,
      body.assistance_required || null,
      body.next_action || null,
      body.target_resolution_date || null,
      body.resolution_notes || null,
      body.validation_results || null,
      body.closure_evidence || null,
      isSafetyCritical,
      body.status || 'Reported',
      stamp,
      stamp,
    ];

    db.prepare(`INSERT INTO issues (${cols.join(',')}) VALUES (${values.map(() => '?').join(',')})`).run(...values);

    // If initial troubleshooting was recorded, also log it as a comment
    if (body.troubleshooting) {
      db.prepare(
        'INSERT INTO issue_comments (id, issue_id, comment, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(nanoid(), id, `Initial troubleshooting: ${body.troubleshooting}`, user?.name || 'Local', stamp);
    }

    writeAuditLog(db, 'issues', id, 'created', null, body, user?.name);

    res.status(201).json(db.prepare('SELECT * FROM issues WHERE id = ?').get(id));
  });

  app.get('/api/issues/:id', (req, res) => {
    const issue: any = db
      .prepare(`
        SELECT iss.*, i.name as institution_name, v.purpose as visit_purpose, t.title as task_title
        FROM issues iss
        LEFT JOIN institutions i ON iss.institution_id = i.id
        LEFT JOIN field_visits v ON iss.visit_id = v.id
        LEFT JOIN tasks t ON iss.task_id = t.id
        WHERE iss.id = ? AND iss.deleted_at IS NULL
      `)
      .get(req.params.id);

    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const comments = db
      .prepare('SELECT * FROM issue_comments WHERE issue_id = ? ORDER BY created_at ASC')
      .all(issue.id);
    const assignments = db
      .prepare('SELECT * FROM issue_assignments WHERE issue_id = ? ORDER BY created_at DESC')
      .all(issue.id);
    const attachments = db
      .prepare("SELECT * FROM attachments WHERE entity_type = 'issues' AND entity_id = ?")
      .all(issue.id);

    res.json({ ...issue, comments, assignments, attachments });
  });

  app.patch('/api/issues/:id', (req, res) => {
    const body = parseBody(issueSchema.partial(), req.body, res);
    if (!body) return;

    const oldIssue: any = db.prepare('SELECT * FROM issues WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!oldIssue) return res.status(404).json({ error: 'Issue not found' });

    // Enforce resolution validation:
    // Cannot declare Resolved or Closed without resolution notes and validation results
    const isClosing = ['Resolved', 'Closed'].includes(body.status || '');
    if (isClosing) {
      const finalResNotes = (body.resolution_notes ?? oldIssue.resolution_notes ?? '').trim();
      const finalValidation = (body.validation_results ?? oldIssue.validation_results ?? '').trim();

      if (!finalResNotes || !finalValidation) {
        return res.status(400).json({
          error: 'Quality validation required: An issue cannot be marked as Resolved or Closed without both detailed Resolution Notes and Validation Results.'
        });
      }
    }

    const keys = Object.keys(body);
    if (keys.length === 0) return res.json(oldIssue);

    const stamp = now();
    const setClauses = keys.map((k) => `${k} = ?`).join(', ') + ', updated_at = ?';
    const params = keys.map((k) => (body as any)[k]);
    params.push(stamp, req.params.id);

    db.prepare(`UPDATE issues SET ${setClauses} WHERE id = ?`).run(...params);

    const user = getSessionUser(req);
    const updated = db.prepare('SELECT * FROM issues WHERE id = ?').get(req.params.id);
    writeAuditLog(db, 'issues', req.params.id, 'updated', oldIssue, updated, user?.name);

    res.json(updated);
  });

  app.post('/api/issues/:id/comments', (req, res) => {
    const body = parseBody(
      z.object({
        comment: z.string().min(1),
      }),
      req.body,
      res
    );
    if (!body) return;

    const issue: any = db.prepare('SELECT * FROM issues WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const stamp = now();
    const user = getSessionUser(req);

    db.prepare(`
      INSERT INTO issue_comments (id, issue_id, comment, author_name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(nanoid(), issue.id, body.comment, user?.name || 'Local', stamp);

    writeAuditLog(db, 'issues', issue.id, 'added comment', null, body, user?.name);

    res.status(201).json({ ok: true });
  });

  // -------------------------------------------------------------
  // INVENTORY & QA
  // -------------------------------------------------------------
  const inventorySchema = z.object({
    asset_id: z.string().min(1),
    product_name: z.string().min(1),
    category: z.string().optional().nullable(),
    manufacturer: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    serial_number: z.string().optional().nullable(),
    vendor_id: z.string().optional().nullable(),
    po_reference: z.string().optional().nullable(),
    received_date: z.string().optional().nullable(),
    quantity: z.number().int().nonnegative().default(1),
    receipt_condition: z.string().optional().nullable(),
    qa_status: z.enum(['Pending', 'In Progress', 'Passed', 'Failed', 'Not Applicable']).default('Pending'),
    stock_status: z.enum([
      'Received', 'QA Pending', 'Available', 'Reserved', 'Dispatched',
      'Installed', 'Quarantine', 'Returned to Vendor'
    ]).default('Received'),
    assigned_job_id: z.string().optional().nullable(),
    institution_id: z.string().optional().nullable(),
    dispatch_date: z.string().optional().nullable(),
    installation_date: z.string().optional().nullable(),
    warranty_end_date: z.string().optional().nullable(),
    storage_location: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    disposition_notes: z.string().optional().nullable(),
    disposition_by: z.string().optional().nullable(),
  });

  app.get('/api/inventory', (req, res) => {
    const q = req.query.q ? String(req.query.q) : '';
    const qaStatus = req.query.qa_status ? String(req.query.qa_status) : '';
    const stockStatus = req.query.stock_status ? String(req.query.stock_status) : '';

    let sql = `
      SELECT a.*, v.name as vendor_name, i.name as institution_name
      FROM inventory_assets a
      LEFT JOIN vendors v ON a.vendor_id = v.id
      LEFT JOIN institutions i ON a.institution_id = i.id
      WHERE a.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (q) {
      sql += ' AND (a.asset_id LIKE ? OR a.product_name LIKE ? OR a.serial_number LIKE ? OR a.model LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (qaStatus) {
      sql += ' AND a.qa_status = ?';
      params.push(qaStatus);
    }
    if (stockStatus) {
      sql += ' AND a.stock_status = ?';
      params.push(stockStatus);
    }

    sql += ' ORDER BY a.updated_at DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  app.post('/api/inventory', (req, res) => {
    const body = parseBody(inventorySchema, req.body, res);
    if (!body) return;

    const existing = db.prepare('SELECT id FROM inventory_assets WHERE asset_id = ?').get(body.asset_id);
    if (existing) {
      return res.status(409).json({ error: `Asset ID ${body.asset_id} already exists in local inventory.` });
    }

    const id = nanoid();
    const stamp = now();
    const user = getSessionUser(req);

    const cols = [
      'id', 'asset_id', 'product_name', 'category', 'manufacturer', 'model', 'serial_number',
      'vendor_id', 'po_reference', 'received_date', 'quantity', 'receipt_condition',
      'qa_status', 'stock_status', 'assigned_job_id', 'institution_id', 'dispatch_date',
      'installation_date', 'warranty_end_date', 'storage_location', 'notes',
      'created_at', 'updated_at'
    ];

    const values = [
      id,
      body.asset_id,
      body.product_name,
      body.category || null,
      body.manufacturer || null,
      body.model || null,
      body.serial_number || null,
      body.vendor_id || null,
      body.po_reference || null,
      body.received_date || stamp.slice(0, 10),
      body.quantity ?? 1,
      body.receipt_condition || null,
      body.qa_status || 'Pending',
      body.stock_status || 'Received',
      body.assigned_job_id || null,
      body.institution_id || null,
      body.dispatch_date || null,
      body.installation_date || null,
      body.warranty_end_date || null,
      body.storage_location || null,
      body.notes || null,
      stamp,
      stamp,
    ];

    db.prepare(`INSERT INTO inventory_assets (${cols.join(',')}) VALUES (${values.map(() => '?').join(',')})`).run(...values);

    writeAuditLog(db, 'inventory_assets', id, 'created', null, body, user?.name);

    res.status(201).json(db.prepare('SELECT * FROM inventory_assets WHERE id = ?').get(id));
  });

  app.get('/api/inventory/:id', (req, res) => {
    const asset: any = db
      .prepare(`
        SELECT a.*, v.name as vendor_name, i.name as institution_name
        FROM inventory_assets a
        LEFT JOIN vendors v ON a.vendor_id = v.id
        LEFT JOIN institutions i ON a.institution_id = i.id
        WHERE a.id = ? AND a.deleted_at IS NULL
      `)
      .get(req.params.id);

    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const qaHistory = db.prepare('SELECT * FROM qa_records WHERE asset_id = ? ORDER BY created_at DESC').all(asset.id);
    res.json({ ...asset, qaHistory });
  });

  app.patch('/api/inventory/:id', (req, res) => {
    const body = parseBody(inventorySchema.partial(), req.body, res);
    if (!body) return;

    const oldAsset: any = db.prepare('SELECT * FROM inventory_assets WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!oldAsset) return res.status(404).json({ error: 'Asset not found' });

    // DISPOSITION SAFEGUARD:
    // "Do not allow a failed or quarantined product to be marked ready for dispatch without a documented authorized disposition."
    const isQuarantinedOrFailed = oldAsset.qa_status === 'Failed' || oldAsset.stock_status === 'Quarantine';
    const isSettingDispatchReady = ['Available', 'Reserved', 'Dispatched', 'Installed'].includes(body.stock_status || '');

    if (isQuarantinedOrFailed && isSettingDispatchReady) {
      const hasDispositionNotes = (body.disposition_notes ?? oldAsset.disposition_notes ?? '').trim();
      const hasDispositionBy = (body.disposition_by ?? oldAsset.disposition_by ?? '').trim();

      if (!hasDispositionNotes || !hasDispositionBy) {
        return res.status(400).json({
          error: 'Safety & Compliance Violation: A failed or quarantined equipment asset cannot be marked ready for dispatch without documented authorized disposition notes and the authorized officer name.'
        });
      }
    }

    const keys = Object.keys(body);
    if (keys.length === 0) return res.json(oldAsset);

    const stamp = now();
    const setClauses = keys.map((k) => `${k} = ?`).join(', ') + ', updated_at = ?';
    const params = keys.map((k) => (body as any)[k]);
    params.push(stamp, req.params.id);

    db.prepare(`UPDATE inventory_assets SET ${setClauses} WHERE id = ?`).run(...params);

    const user = getSessionUser(req);
    const updated = db.prepare('SELECT * FROM inventory_assets WHERE id = ?').get(req.params.id);
    writeAuditLog(db, 'inventory_assets', req.params.id, 'updated', oldAsset, updated, user?.name);

    res.json(updated);
  });

  app.post('/api/inventory/:id/qa', (req, res) => {
    const body = parseBody(
      z.object({
        status: z.enum(['Passed', 'Failed']),
        tester_name: z.string().min(1),
        test_date: z.string().min(1),
        checklist: z.string().optional().nullable(),
        observations: z.string().min(1),
        approval_details: z.string().optional().nullable(),
      }),
      req.body,
      res
    );
    if (!body) return;

    const asset: any = db.prepare('SELECT * FROM inventory_assets WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const stamp = now();
    const user = getSessionUser(req);

    const targetStockStatus = body.status === 'Passed' ? 'Available' : 'Quarantine';

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO qa_records (id, asset_id, checklist, observations, tester_name, test_date, approval_details, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nanoid(),
        asset.id,
        body.checklist || null,
        body.observations,
        body.tester_name,
        body.test_date,
        body.approval_details || null,
        body.status,
        stamp
      );

      db.prepare(`
        UPDATE inventory_assets
        SET qa_status = ?, stock_status = ?, updated_at = ?
        WHERE id = ?
      `).run(body.status, targetStockStatus, stamp, asset.id);
    });
    tx();

    writeAuditLog(db, 'inventory_assets', asset.id, `qa test: ${body.status}`, { qa_status: asset.qa_status }, body, user?.name);

    res.status(201).json({ ok: true, qa_status: body.status, stock_status: targetStockStatus });
  });

  // -------------------------------------------------------------
  // INSTALLATION JOBS
  // -------------------------------------------------------------
  const installSchema = z.object({
    title: z.string().min(1),
    institution_id: z.string().optional().nullable(),
    status: z.enum(['Planned', 'In Progress', 'Validation', 'Completed', 'Blocked', 'Cancelled']).default('Planned'),
    site_readiness: z.string().optional().nullable(),
    validation_results: z.string().optional().nullable(),
    outstanding_issues: z.string().optional().nullable(),
    warranty_details: z.string().optional().nullable(),
    handover_evidence: z.string().optional().nullable(),
  });

  app.get('/api/installations', (req, res) => {
    const rows = db
      .prepare(`
        SELECT j.*, i.name as institution_name
        FROM installation_jobs j
        LEFT JOIN institutions i ON j.institution_id = i.id
        WHERE j.deleted_at IS NULL
        ORDER BY j.updated_at DESC
      `)
      .all();
    res.json(rows);
  });

  app.post('/api/installations', (req, res) => {
    const body = parseBody(installSchema, req.body, res);
    if (!body) return;

    const id = nanoid();
    const stamp = now();
    const user = getSessionUser(req);

    db.prepare(`
      INSERT INTO installation_jobs (id, title, institution_id, status, site_readiness, validation_results, outstanding_issues, warranty_details, handover_evidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.title,
      body.institution_id || null,
      body.status || 'Planned',
      body.site_readiness || null,
      body.validation_results || null,
      body.outstanding_issues || null,
      body.warranty_details || null,
      body.handover_evidence || null,
      stamp,
      stamp
    );

    writeAuditLog(db, 'installation_jobs', id, 'created', null, body, user?.name);

    res.status(201).json(db.prepare('SELECT * FROM installation_jobs WHERE id = ?').get(id));
  });

  app.patch('/api/installations/:id', (req, res) => {
    const body = parseBody(installSchema.partial(), req.body, res);
    if (!body) return;

    const oldJob: any = db.prepare('SELECT * FROM installation_jobs WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
    if (!oldJob) return res.status(404).json({ error: 'Installation job not found' });

    const keys = Object.keys(body);
    if (keys.length === 0) return res.json(oldJob);

    const stamp = now();
    const setClauses = keys.map((k) => `${k} = ?`).join(', ') + ', updated_at = ?';
    const params = keys.map((k) => (body as any)[k]);
    params.push(stamp, req.params.id);

    db.prepare(`UPDATE installation_jobs SET ${setClauses} WHERE id = ?`).run(...params);

    const user = getSessionUser(req);
    const updated = db.prepare('SELECT * FROM installation_jobs WHERE id = ?').get(req.params.id);
    writeAuditLog(db, 'installation_jobs', req.params.id, 'updated', oldJob, updated, user?.name);

    res.json(updated);
  });

  // -------------------------------------------------------------
  // DAILY WORK REPORTS
  // -------------------------------------------------------------
  app.get('/api/reports/daily/:date', (req, res) => {
    const date = req.params.date;
    const likeDate = `${date}%`;

    // Fetch actual records for the day
    const tasks = db
      .prepare(`
        SELECT t.*, i.name as institution_name
        FROM tasks t
        LEFT JOIN institutions i ON t.institution_id = i.id
        WHERE (t.assignment_date LIKE ? OR t.due_date LIKE ? OR t.updated_at LIKE ?) AND t.deleted_at IS NULL
      `)
      .all(likeDate, likeDate, likeDate);

    const visits = db
      .prepare(`
        SELECT v.*, i.name as institution_name, ven.name as vendor_name
        FROM field_visits v
        LEFT JOIN institutions i ON v.institution_id = i.id
        LEFT JOIN vendors ven ON v.vendor_id = ven.id
        WHERE (v.planned_arrival LIKE ? OR v.actual_start LIKE ? OR v.updated_at LIKE ?) AND v.deleted_at IS NULL
      `)
      .all(likeDate, likeDate, likeDate);

    const issues = db
      .prepare(`
        SELECT iss.*, i.name as institution_name
        FROM issues iss
        LEFT JOIN institutions i ON iss.institution_id = i.id
        WHERE (iss.reported_date LIKE ? OR iss.updated_at LIKE ?) AND iss.deleted_at IS NULL
      `)
      .all(likeDate, likeDate);

    const expenses = db
      .prepare(`
        SELECT e.*, i.name as institution_name
        FROM expenses e
        LEFT JOIN institutions i ON e.institution_id = i.id
        WHERE e.expense_date LIKE ? AND e.deleted_at IS NULL
      `)
      .all(likeDate);

    const qaTested = db
      .prepare(`
        SELECT q.*, a.product_name, a.asset_id
        FROM qa_records q
        JOIN inventory_assets a ON q.asset_id = a.id
        WHERE q.test_date LIKE ?
      `)
      .all(likeDate);

    const installedAssets = db
      .prepare(`
        SELECT a.*, i.name as institution_name
        FROM inventory_assets a
        LEFT JOIN institutions i ON a.institution_id = i.id
        WHERE a.installation_date LIKE ?
      `)
      .all(likeDate);

    const existingReport = db
      .prepare('SELECT * FROM daily_reports WHERE report_date = ?')
      .get(date) || null;

    res.json({
      date,
      tasks,
      visits,
      issues,
      expenses,
      qaTested,
      installedAssets,
      report: existingReport,
    });
  });

  app.put('/api/reports/daily/:date', (req, res) => {
    const body = parseBody(
      z.object({
        employee_name: z.string().min(1),
        manual_summary: z.string().optional().nullable(),
        tomorrow_plan: z.string().optional().nullable(),
        status: z.enum(['Draft', 'Submitted']).default('Draft'),
        recipient: z.string().optional().nullable(),
        response_notes: z.string().optional().nullable(),
      }),
      req.body,
      res
    );
    if (!body) return;

    const date = req.params.date;
    const oldReport: any = db.prepare('SELECT * FROM daily_reports WHERE report_date = ?').get(date);
    const stamp = now();
    const user = getSessionUser(req);
    const id = oldReport?.id || nanoid();

    if (oldReport) {
      db.prepare(`
        UPDATE daily_reports
        SET employee_name = ?, manual_summary = ?, tomorrow_plan = ?, status = ?,
            recipient = ?, response_notes = ?,
            submitted_at = CASE WHEN ? = 'Submitted' AND submitted_at IS NULL THEN ? ELSE submitted_at END,
            updated_at = ?
        WHERE id = ?
      `).run(
        body.employee_name,
        body.manual_summary || null,
        body.tomorrow_plan || null,
        body.status,
        body.recipient || null,
        body.response_notes || null,
        body.status,
        stamp,
        stamp,
        id
      );
    } else {
      db.prepare(`
        INSERT INTO daily_reports (
          id, report_date, employee_name, manual_summary, tomorrow_plan, status,
          recipient, submitted_at, response_notes, review_status, reviewer_name, reviewed_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not reviewed', null, null, ?, ?)
      `).run(
        id,
        date,
        body.employee_name,
        body.manual_summary || null,
        body.tomorrow_plan || null,
        body.status,
        body.recipient || null,
        body.status === 'Submitted' ? stamp : null,
        body.response_notes || null,
        stamp,
        stamp
      );
    }

    writeAuditLog(db, 'daily_reports', id, oldReport ? 'updated' : 'created', oldReport, body, user?.name);

    res.json({ id, ok: true, status: body.status });
  });

  app.post('/api/reports/daily/:date/review', (req, res) => {
    const body = parseBody(
      z.object({
        reviewer_name: z.string().min(1),
        status: z.enum(['Reviewed', 'Clarification requested']),
        comments: z.string().min(1),
      }),
      req.body,
      res
    );
    if (!body) return;

    const date = req.params.date;
    const report: any = db.prepare('SELECT * FROM daily_reports WHERE report_date = ?').get(date);
    if (!report) return res.status(404).json({ error: 'Daily report not found' });

    const stamp = now();
    const user = getSessionUser(req);

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE daily_reports
        SET review_status = ?, reviewer_name = ?, reviewed_at = ?, response_notes = ?, updated_at = ?
        WHERE id = ?
      `).run(body.status, body.reviewer_name, stamp, body.comments, stamp, report.id);

      db.prepare(`
        INSERT INTO report_reviews (id, report_id, reviewer_name, status, comments, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(nanoid(), report.id, body.reviewer_name, body.status, body.comments, stamp);
    });
    tx();

    writeAuditLog(db, 'daily_reports', report.id, `review: ${body.status}`, report, body, user?.name);

    res.json({ ok: true, review_status: body.status });
  });

  // -------------------------------------------------------------
  // TEAM LEAD WORKSPACE & EXPORTS
  // -------------------------------------------------------------
  app.get('/api/team-lead/summary', (req, res) => {
    const pendingExpenses = db
      .prepare(`
        SELECT e.*, i.name as institution_name
        FROM expenses e
        LEFT JOIN institutions i ON e.institution_id = i.id
        WHERE e.approval_status = 'Submitted' AND e.deleted_at IS NULL
        ORDER BY e.expense_date DESC
      `)
      .all();

    const pendingApprovals = db
      .prepare(`
        SELECT count(*) as count FROM expenses WHERE approval_status = 'Submitted' AND deleted_at IS NULL
      `)
      .get() as any;

    const unreviewedReports = db
      .prepare(`
        SELECT * FROM daily_reports WHERE status = 'Submitted' AND review_status = 'Not reviewed' ORDER BY report_date DESC
      `)
      .all();

    const criticalIssues = db
      .prepare(`
        SELECT iss.*, i.name as institution_name
        FROM issues iss
        LEFT JOIN institutions i ON iss.institution_id = i.id
        WHERE iss.status NOT IN ('Resolved', 'Closed') AND iss.responsibility IN ('Needs another technician', 'Needs vendor support', 'Needs team lead decision') AND iss.deleted_at IS NULL
        ORDER BY iss.reported_date DESC
      `)
      .all();

    const blockedTasks = db
      .prepare(`
        SELECT t.*, i.name as institution_name
        FROM tasks t
        LEFT JOIN institutions i ON t.institution_id = i.id
        WHERE t.status = 'Blocked' AND t.deleted_at IS NULL
        ORDER BY t.due_date ASC
      `)
      .all();

    res.json({
      pendingExpenses,
      pendingApprovalsCount: pendingApprovals.count,
      unreviewedReports,
      criticalIssues,
      blockedTasks,
    });
  });

  // CSV Export endpoint
  app.get('/api/export/csv/:entity', (req, res) => {
    const entity = req.params.entity;
    let rows: any[] = [];
    let filename = `fieldops-${entity}-${now().slice(0, 10)}.csv`;

    if (entity === 'tasks') {
      rows = db.prepare('SELECT id, title, priority, status, due_date, assigned_to, progress_notes FROM tasks WHERE deleted_at IS NULL').all();
    } else if (entity === 'expenses') {
      rows = db.prepare('SELECT id, expense_date, category, amount_paise / 100.0 as amount_inr, payment_source, approval_status, description FROM expenses WHERE deleted_at IS NULL').all();
    } else if (entity === 'issues') {
      rows = db.prepare('SELECT id, reported_date, category, severity, status, product_name, symptoms, responsibility FROM issues WHERE deleted_at IS NULL').all();
    } else if (entity === 'visits') {
      rows = db.prepare('SELECT id, purpose, status, planned_arrival, actual_start, end_time, work_performed FROM field_visits WHERE deleted_at IS NULL').all();
    } else if (entity === 'inventory') {
      rows = db.prepare('SELECT asset_id, product_name, category, serial_number, qa_status, stock_status, quantity FROM inventory_assets WHERE deleted_at IS NULL').all();
    } else {
      return res.status(400).json({ error: 'Unsupported export entity' });
    }

    if (!rows.length) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send('No data available\n');
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(',')];
    for (const r of rows) {
      const line = headers.map((h) => {
        const val = r[h] === null || r[h] === undefined ? '' : String(r[h]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvLines.push(line.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvLines.join('\n'));
  });

  // -------------------------------------------------------------
  // ATTACHMENTS (RECEIPTS, PHOTOS, HANDOVER DOCS)
  // -------------------------------------------------------------
  app.post('/api/attachments', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const entityType = String(req.body.entity_type || 'general');
    const entityId = String(req.body.entity_id || 'unlinked');

    const id = nanoid();
    const stamp = now();
    const user = getSessionUser(req);

    db.prepare(`
      INSERT INTO attachments (id, entity_type, entity_id, original_name, stored_name, mime_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entityType,
      entityId,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size,
      stamp
    );

    // If entity is expense, also link the receipt path
    if (entityType === 'expenses' && entityId !== 'unlinked') {
      db.prepare('UPDATE expenses SET receipt_path = ?, updated_at = ? WHERE id = ?').run(
        `/api/attachments/${id}/preview`,
        stamp,
        entityId
      );
    }

    writeAuditLog(db, 'attachments', id, 'uploaded', null, { original_name: req.file.originalname, entity_type: entityType, entity_id: entityId }, user?.name);

    res.status(201).json({
      id,
      original_name: req.file.originalname,
      stored_name: req.file.filename,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      url: `/api/attachments/${id}/preview`,
    });
  });

  app.get('/api/attachments/:id/preview', (req, res) => {
    const att: any = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    // Path traversal check: ensure resolved path is strictly within dirs.attachments
    const filePath = path.resolve(dirs.attachments, att.stored_name);
    if (!filePath.startsWith(path.resolve(dirs.attachments))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File missing from local storage' });
    }

    res.setHeader('Content-Type', att.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${att.original_name}"`);
    fs.createReadStream(filePath).pipe(res);
  });

  app.get('/api/attachments/:id/download', (req, res) => {
    const att: any = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
    if (!att) return res.status(404).json({ error: 'Attachment not found' });

    const filePath = path.resolve(dirs.attachments, att.stored_name);
    if (!filePath.startsWith(path.resolve(dirs.attachments))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File missing from local storage' });
    }

    res.download(filePath, att.original_name);
  });

  // -------------------------------------------------------------
  // AUDIT LOGS
  // -------------------------------------------------------------
  app.get('/api/audit', (req, res) => {
    const entityType = req.query.entity_type ? String(req.query.entity_type) : '';
    let sql = 'SELECT * FROM audit_logs';
    const params: any[] = [];

    if (entityType) {
      sql += ' WHERE entity_type = ?';
      params.push(entityType);
    }

    sql += ' ORDER BY created_at DESC LIMIT 300';
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  // -------------------------------------------------------------
  // BACKUP & RESTORE
  // -------------------------------------------------------------
  app.post('/api/backups', (req, res) => {
    const stamp = now().replace(/[:.]/g, '-');
    const targetDir = path.join(dirs.backups, `fieldops-backup-${stamp}`);

    fs.mkdirSync(targetDir, { recursive: true });

    // Consistent SQLite WAL checkpoint
    db.pragma('wal_checkpoint(TRUNCATE)');

    const sourceDb = path.join(dirs.root, 'fieldops.sqlite');
    const targetDb = path.join(targetDir, 'fieldops.sqlite');
    fs.copyFileSync(sourceDb, targetDb);

    // Copy attachments
    const targetAttDir = path.join(targetDir, 'attachments');
    fs.mkdirSync(targetAttDir, { recursive: true });
    if (fs.existsSync(dirs.attachments)) {
      fs.cpSync(dirs.attachments, targetAttDir, { recursive: true });
    }

    // Write manifest
    const manifest = {
      app: 'Field Operations Local',
      version: 1,
      backupId: stamp,
      createdAt: now(),
      dbSize: fs.statSync(sourceDb).size,
      note: 'Offline local backup. Maintain an external local disk copy to protect against physical drive failure.',
    };
    fs.writeFileSync(path.join(targetDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    const user = getSessionUser(req);
    writeAuditLog(db, 'backups', stamp, 'created', null, manifest, user?.name);

    res.status(201).json({
      name: path.basename(targetDir),
      createdAt: manifest.createdAt,
      dbSize: manifest.dbSize,
      note: manifest.note,
    });
  });

  app.get('/api/backups', (req, res) => {
    if (!fs.existsSync(dirs.backups)) {
      return res.json([]);
    }

    const items = fs.readdirSync(dirs.backups, { withFileTypes: true });
    const list = items
      .filter((d) => d.isDirectory())
      .map((d) => {
        const manifestPath = path.join(dirs.backups, d.name, 'manifest.json');
        let manifest: any = { createdAt: '', dbSize: 0 };
        if (fs.existsSync(manifestPath)) {
          try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          } catch {
            // ignore corrupt manifest
          }
        }
        return {
          name: d.name,
          createdAt: manifest.createdAt || d.name,
          dbSize: manifest.dbSize || 0,
          note: manifest.note || '',
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json(list);
  });

  app.post('/api/backups/:name/restore', (req, res) => {
    const backupName = req.params.name;
    const backupDir = path.resolve(dirs.backups, backupName);

    if (!backupDir.startsWith(path.resolve(dirs.backups))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(backupDir)) {
      return res.status(404).json({ error: 'Selected backup does not exist' });
    }

    const backupDbFile = path.join(backupDir, 'fieldops.sqlite');
    if (!fs.existsSync(backupDbFile)) {
      return res.status(400).json({ error: 'Backup is missing SQLite database file' });
    }

    // Verify backup integrity
    try {
      const testDb = new Database(backupDbFile);
      const integrity = testDb.pragma('integrity_check') as any[];
      testDb.close();
      if (!integrity || integrity[0]?.integrity_check !== 'ok') {
        return res.status(400).json({ error: 'Backup database failed integrity check. Restore aborted.' });
      }
    } catch (err: any) {
      return res.status(400).json({ error: `Cannot read backup database: ${err.message}` });
    }

    // Close active DB, replace files, and re-open
    db.close();

    const activeDb = path.join(dirs.root, 'fieldops.sqlite');
    fs.copyFileSync(backupDbFile, activeDb);

    const backupAttDir = path.join(backupDir, 'attachments');
    if (fs.existsSync(backupAttDir)) {
      fs.cpSync(backupAttDir, dirs.attachments, { recursive: true });
    }

    // Reopen active db
    db = openDb();

    const user = getSessionUser(req);
    writeAuditLog(db, 'backups', backupName, 'restored', null, { backupName }, user?.name, 'Restored database from local snapshot');

    res.json({ ok: true, message: `Database and attachments successfully restored from ${backupName}.` });
  });

  return { app, db };
}
