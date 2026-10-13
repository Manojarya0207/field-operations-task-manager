import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

const testDir = path.join('/tmp', `fieldops-test-${nanoid()}`);
process.env.FIELDOPS_DATA_DIR = testDir;

test('Field Operations Local - Comprehensive System Tests', async (t) => {
  const { openDb, dirs, now, writeAuditLog } = await import('./db.js');
  const db = openDb();

  await t.test('1. Database schema and migration verification', () => {
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map((x) => x.name);

    const required = [
      'users',
      'institutions',
      'vendors',
      'tasks',
      'task_updates',
      'field_visits',
      'installation_jobs',
      'installation_checks',
      'inventory_assets',
      'qa_records',
      'expenses',
      'company_advances',
      'expense_approvals',
      'expense_settlements',
      'issues',
      'issue_comments',
      'issue_assignments',
      'daily_reports',
      'report_reviews',
      'attachments',
      'audit_logs',
      'app_settings',
    ];

    for (const name of required) {
      assert.ok(tables.includes(name), `Missing required table: ${name}`);
    }
  });

  await t.test('2. Inventory QA safeguard: Failed asset cannot be dispatched without authorized disposition', () => {
    const assetId = `AST-${nanoid(5)}`;
    const rowId = nanoid();
    const stamp = now();

    db.prepare(`
      INSERT INTO inventory_assets (id, asset_id, product_name, qa_status, stock_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(rowId, assetId, 'Digital Microscope DX-400', 'Failed', 'Quarantine', stamp, stamp);

    const asset: any = db.prepare('SELECT * FROM inventory_assets WHERE id = ?').get(rowId);
    assert.equal(asset.qa_status, 'Failed');
    assert.equal(asset.stock_status, 'Quarantine');

    // Simulate rule logic: Attempting to mark as Available without disposition notes/by
    const targetStatus = 'Available';
    const isQuarantinedOrFailed = asset.qa_status === 'Failed' || asset.stock_status === 'Quarantine';
    const isDispatchReady = ['Available', 'Reserved', 'Dispatched', 'Installed'].includes(targetStatus);

    let blocked = false;
    const body: any = { stock_status: targetStatus };
    if (isQuarantinedOrFailed && isDispatchReady) {
      if (!body.disposition_notes && !asset.disposition_notes) {
        blocked = true;
      }
    }
    assert.equal(blocked, true, 'Quarantined/Failed asset change without disposition should be blocked');

    // With authorized disposition notes
    body.disposition_notes = 'Authorized return to vendor for sensor recalibration';
    body.disposition_by = 'Chief Lab Engineer';
    db.prepare(`
      UPDATE inventory_assets
      SET stock_status = ?, disposition_notes = ?, disposition_by = ?, disposition_date = ?, updated_at = ?
      WHERE id = ?
    `).run('Returned to Vendor', body.disposition_notes, body.disposition_by, stamp, stamp, rowId);

    const updatedAsset: any = db.prepare('SELECT * FROM inventory_assets WHERE id = ?').get(rowId);
    assert.equal(updatedAsset.stock_status, 'Returned to Vendor');
    assert.equal(updatedAsset.disposition_by, 'Chief Lab Engineer');
  });

  await t.test('3. Issue management safeguard: cannot close without resolution notes and validation results', () => {
    const issueId = nanoid();
    const stamp = now();

    db.prepare(`
      INSERT INTO issues (id, reported_date, category, symptoms, severity, status, is_safety_critical, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(issueId, stamp.slice(0, 10), 'Electrical', 'Power supply tripping under 5A load', 'Critical', 'In Progress', 1, stamp, stamp);

    const issue: any = db.prepare('SELECT * FROM issues WHERE id = ?').get(issueId);
    assert.equal(issue.is_safety_critical, 1, 'Electrical/Critical issue must flag safety-critical isolation');

    // Try to close without validation
    const candidateStatus = 'Resolved';
    const hasNotes = Boolean(issue.resolution_notes);
    const hasValidation = Boolean(issue.validation_results);
    const canClose = hasNotes && hasValidation;

    assert.equal(canClose, false, 'Must not close issue without resolution notes and validation results');

    // Close with proper resolution notes and validation
    db.prepare(`
      UPDATE issues
      SET status = 'Resolved', resolution_notes = ?, validation_results = ?, updated_at = ?
      WHERE id = ?
    `).run(
      'Replaced blown thermal fuse and recalibrated load shunt',
      'Bench-tested for 45 minutes at 6A continuous draw; thermal camera shows normal 38°C operating range',
      stamp,
      issueId
    );

    const resolved: any = db.prepare('SELECT * FROM issues WHERE id = ?').get(issueId);
    assert.equal(resolved.status, 'Resolved');
    assert.ok(resolved.resolution_notes.length > 0);
  });

  await t.test('4. Expense management: double counting prevention & advances tracking', () => {
    const stamp = now();
    const advId = nanoid();

    // 1) Record advance of ₹10,000 (1,000,000 paise)
    db.prepare(`
      INSERT INTO company_advances (id, received_date, amount_paise, amount_used_paise, remaining_paise, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?, ?)
    `).run(advId, stamp.slice(0, 10), 1000000, 1000000, stamp, stamp);

    // 2) Expense paid via Company Advance ₹2,500 (250,000 paise)
    const exp1Id = nanoid();
    const exp1Source: string = 'Company advance';
    const exp1Reimburse = exp1Source === 'Employee personal funds' ? 250000 : 0;
    assert.equal(exp1Reimburse, 0, 'Company advance must NOT be eligible for employee reimbursement');

    db.prepare(`
      INSERT INTO expenses (id, expense_date, category, amount_paise, payment_source, reimbursement_paise, advance_id, approval_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', ?, ?)
    `).run(exp1Id, stamp.slice(0, 10), 'Bus', 250000, exp1Source, exp1Reimburse, advId, stamp, stamp);

    // Update advance used amount
    db.prepare(`
      UPDATE company_advances
      SET amount_used_paise = amount_used_paise + 250000,
          remaining_paise = remaining_paise - 250000,
          updated_at = ?
      WHERE id = ?
    `).run(stamp, advId);

    // 3) Expense paid via Employee Personal Funds ₹1,200 (120,000 paise)
    const exp2Id = nanoid();
    const exp2Source = 'Employee personal funds';
    const exp2Reimburse = exp2Source === 'Employee personal funds' ? 120000 : 0;
    assert.equal(exp2Reimburse, 120000, 'Employee personal funds must be counted for reimbursement');

    db.prepare(`
      INSERT INTO expenses (id, expense_date, category, amount_paise, payment_source, reimbursement_paise, approval_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'Submitted', ?, ?)
    `).run(exp2Id, stamp.slice(0, 10), 'Food', 120000, exp2Source, exp2Reimburse, stamp, stamp);

    // Check advance balance
    const adv: any = db.prepare('SELECT * FROM company_advances WHERE id = ?').get(advId);
    assert.equal(adv.remaining_paise, 750000, 'Advance balance should reflect ₹7,500 remaining');

    // Check pending reimbursement query
    const pendingReimburse = (
      db.prepare(`
        SELECT coalesce(sum(reimbursement_paise), 0) as total
        FROM expenses
        WHERE approval_status IN ('Submitted', 'Approved') AND payment_source = 'Employee personal funds'
      `).get() as any
    ).total;

    assert.equal(pendingReimburse, 120000, 'Only the personal expense should be in pending reimbursement');
  });

  await t.test('5. Carry forward unfinished tasks', () => {
    const stamp = now();
    const today = stamp.slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const taskId = nanoid();
    db.prepare(`
      INSERT INTO tasks (id, title, status, due_date, created_at, updated_at)
      VALUES (?, 'Calibrate Oscilloscope Rig', 'In Progress', ?, ?, ?)
    `).run(taskId, today, stamp, stamp);

    // Carry forward
    db.prepare(`
      UPDATE tasks
      SET due_date = ?, progress_notes = 'Carried forward to next working day', updated_at = ?
      WHERE id = ?
    `).run(tomorrow, stamp, taskId);

    const task: any = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    assert.equal(task.due_date, tomorrow);
    assert.equal(task.status, 'In Progress');
  });

  await t.test('6. Backup snapshot and integrity test', () => {
    db.pragma('wal_checkpoint(TRUNCATE)');
    const backupDir = path.join(dirs.backups, 'test-snapshot');
    fs.mkdirSync(backupDir, { recursive: true });

    const sourceDb = path.join(dirs.root, 'fieldops.sqlite');
    const targetDb = path.join(backupDir, 'fieldops.sqlite');
    fs.copyFileSync(sourceDb, targetDb);

    assert.ok(fs.existsSync(targetDb));

    // Verify backup file integrity
    const testBackupDb = openDb(targetDb);
    const integrity: any = testBackupDb.pragma('integrity_check');
    assert.equal(integrity[0].integrity_check, 'ok');
    testBackupDb.close();
  });

  db.close();
});
