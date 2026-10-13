# FieldOps Local — Field Operations & Work Management

A production-quality, local-only, offline-first web application designed for field engineers and technicians managing electronics, test instrumentation, and laboratory equipment supplied to government schools and colleges.

---

## 1. Key Architectural Features & Local-Only Guarantee

- **Zero Cloud Dependencies**: No Firebase, Supabase, AWS, cloud databases, external CDNs, remote telemetry, or third-party APIs.
- **Embedded Database**: Local SQLite configured with Write-Ahead Logging (`WAL` mode), foreign key constraints enabled, and indexed tables.
- **Local Attachment Storage**: Receipts, handover slips, and technical issue photos are stored directly on the local filesystem outside the repository in `FIELDOPS_DATA_DIR/attachments`.
- **Offline Reliability**: Fully functional without an active internet connection. System assets, typography, and SVG charts are bundled locally.
- **Loopback Binding**: Express server binds strictly to `127.0.0.1` by default to prevent unauthorized network exposure.
- **Monetary Precision**: All currency amounts (INR) are handled and stored in integer paise (`₹1.00 = 100 paise`) to prevent floating-point rounding errors.
- **Append-Only Audit Trail**: Every task assignment, status modification, expense approval, QA check, and database restoration is recorded in the `audit_logs` table.

---

## 2. Directory Layout & Local Data Storage

All runtime application data, attachments, and backups are stored outside the source code repository under a configurable path:

```
FIELDOPS_DATA_DIR (Default: ~/Library/Application Support/FieldOperations)
├── fieldops.sqlite           # SQLite primary database (WAL mode)
├── fieldops.sqlite-wal       # Write-Ahead Log journal
├── fieldops.sqlite-shm       # Shared memory index
├── attachments/              # Stored receipt images, issue photos, and documents
├── backups/                  # SQLite-consistent backup snapshots & manifests
└── reports/                  # Generated local report exports
```

---

## 3. Quick Start & Execution Instructions

### Prerequisites
- Node.js 20 or newer
- npm 9 or newer

### Installation
```bash
# 1. Clone or navigate to the workspace
cd "/Users/manojsarya/Desktop/Task Manager"

# 2. Install dependencies (offline-capable after initial cache)
npm install

# 3. Environment Configuration
cp .env.example .env
```

### Initializing Database & Seed Data
```bash
# Run database migrations
npm run migrate

# Optional: Seed realistic demo data (Government Polytechnic, Science Colleges, Bharat Precision DSO instruments)
npm run seed
```
*Default Seed Credentials:*
- **Username**: `technician1`
- **Password**: `fieldops123`

### Running the Application

#### Single-Command Development (Frontend + Backend watch):
```bash
npm run dev
```

#### Production Build & Local Server:
```bash
npm run build
npm start
```
The server binds to `http://127.0.0.1:4180`. Open this URL in any browser.

---

## 4. Modules & Operational Workflows

### 1. Main Dashboard
- Real-time aggregation of SQLite records:
  - Tasks assigned today, tasks completed today, pending & overdue tasks, tasks blocked by external dependencies.
  - Planned vs completed field visits.
  - Today's expenses vs monthly totals.
  - Open technical issues, issues awaiting help, issues awaiting vendor intervention.
  - Expense claims awaiting lead approval and pending reimbursement totals.
  - Company advances remaining balance.
  - Recent audit trail.
- Fast-add shortcuts for tasks, visits, expenses, issues, and daily reports.
- Visual SVG charts for task urgency distribution and expense categories.

### 2. Task Management (`/tasks`)
- Fields: Title, description, priority (Low/Medium/High/Urgent), assignment date, due date, institution, installation job, expected deliverable, blocker reason, progress notes.
- **Status Lifecycles**: `Assigned` → `In Progress` → `Blocked` → `Completed` / `Cancelled`.
- **Mandatory Blocker Reason**: When setting status to `Blocked`, a blocker description or pending reason is strictly required.
- **Carry Forward**: Easily carry unfinished tasks forward to the next working day with a single click, recording timestamped progress notes.
- **Audit History**: Preserves all status transitions and timestamped technician updates in `task_updates`.

### 3. Field Visits (`/visits`)
- Track multiple site visits during a single working day without GPS requirements.
- Details: Purpose, institution or vendor, contact person, phone, planned arrival, actual start, equipment handled, work performed, results, and next steps.
- Direct links to related tasks, expenses, and technical issues.

### 4. Company Expense Ledger (`/expenses`)
- Full Indian Rupee (`₹`) ledger with exact paise storage.
- Categories: Bus, Train, Cab, Fuel, Food, Accommodation, Parking, Toll, Materials, Courier, Other.
- Payment sources: Company cash, Company advance, Company card, Employee personal funds, Other.
- **Double-Counting Prevention**:
  - Company advance spending and company card spending are strictly ineligible for personal reimbursement (`reimbursement_paise = 0`).
  - Only `Employee personal funds` are tallied into employee reimbursement claims.
  - Company advance balances are decremented automatically in database transactions.
  - Settled claims do not linger in pending totals.
- **Duplicate Safeguard**: Automatically warns or rejects identical expense submissions sharing the same date, amount, category, and payment source.
- Local receipt attachment upload, preview modal, and approval/rejection audit trail.

### 5. Technical Issues & Safety Escalations (`/issues`)
- Tracks equipment malfunctions with unique collision-resistant IDs.
- Severity levels: `Low`, `Medium`, `High`, `Critical`.
- **Mandatory Safety Protocol**: High-voltage electrical issues and critical laboratory equipment are flagged with a prominent **Safety Isolation Notice** mandating mains power disconnect and manufacturer procedure escalation. Interlock bypass is strictly prohibited.
- **Resolution Quality Rule**: An issue cannot be marked `Resolved` or `Closed` without documented **Resolution Notes** and **Validation Test Results**.

### 6. Inventory & Quality Assurance (`/inventory`)
- Track test instrumentation and laboratory apparatus across stock statuses (`Received`, `QA Pending`, `Available`, `Reserved`, `Dispatched`, `Installed`, `Quarantine`, `Returned to Vendor`).
- **QA Checklist & Testing**: Log functional tests, isolation readings, and calibration certificates in `qa_records`.
- **Quarantine Disposition Safeguard**: A failed or quarantined asset cannot be marked available, dispatched, or installed without a documented authorized technical disposition and the authorizing officer's name.

### 7. Installation Jobs (`/installations`)
- Track laboratory workstation setups at government institutions.
- Covers site electrical readiness, neutral-to-earth potential readings, validation results, warranty details, and handover evidence.

### 8. Daily Work Reports (`/reports`)
- Generates a factual daily report dynamically from actual SQLite records for any selected date:
  - Tasks assigned, completed, pending, and overdue.
  - Schools, colleges, and vendors visited.
  - Equipment tested and installed.
  - Issues reported, resolved, and awaiting vendor support.
  - Breakdown of expenses by category and payment source.
  - Reimbursement claims awaiting action.
- Allows technician to add manual summary notes and tomorrow's plan.
- **Export & Sharing**: One-click **Copy Summary** for manual sharing (WhatsApp/SMS), and print-optimized layout (`Ctrl+P` / `Cmd+P`) with clean print typography.

### 9. Team Lead Workspace — Local Mode (`/team-lead`)
- Clearly marked as local offline records.
- Allows local entry of supervisor decisions:
  - Approve or reject submitted expense claims with reasons.
  - Review and sign off on submitted daily work reports.
  - Track escalated issues requiring another technician or vendor intervention.
- **CSV Data Exports**: One-click export for Tasks, Expenses, Issues, Visits, and Inventory.

### 10. Audit History (`/audit`)
- Complete append-only log capturing user actions, timestamps, entity IDs, previous JSON state, and new JSON state.
- Filterable by entity type with deep JSON inspect dialog.

### 11. Local Backup & Recovery (`/backup`)
- Creates atomic, SQLite-consistent snapshots (`PRAGMA wal_checkpoint(TRUNCATE)`).
- Copies both `fieldops.sqlite` and the `attachments/` folder into timestamped folders with `manifest.json`.
- **Restore with Integrity Check**: Executes `PRAGMA integrity_check` before replacing current data, ensuring no corrupted snapshots are ever restored.
- **Educational Notice**: Explicitly reminds users that same-disk backups do not protect against physical disk failure; recommends copying backup directories to an external USB drive.

### 12. Settings & Master Reference Data (`/settings`)
- Register and maintain Government Schools, Degree Colleges, Polytechnic Institutes, and Science Labs.
- Manage equipment vendors and suppliers.
- Track company tour advances and remaining balances.

---

## 5. Automated Tests

Run the comprehensive Node.js test suite:
```bash
npm test
```

### Verified Test Cases:
1. **Database Schema & Migrations**: Verifies all 22 operational tables and indexes are initialized.
2. **Inventory QA Safeguard**: Verifies that failed or quarantined equipment cannot be marked ready for dispatch without documented authorized disposition.
3. **Issue Closure Safeguard**: Asserts that issues cannot be declared `Resolved` without both resolution notes and validation results.
4. **Expense Double-Counting Prevention**: Confirms company advances and cards are excluded from personal employee reimbursement claims.
5. **Carry Forward**: Verifies atomic carry-forward of unfinished tasks to the next working day.
6. **Backup Integrity**: Tests WAL checkpointing, snapshot creation, and SQLite integrity validation.

---

## 6. Verification Report & Known Limitations

- **Verification**:
  - Full TypeScript compilation (`npm run build`) succeeded with 0 errors.
  - Express backend starts and binds to `127.0.0.1:4180`.
  - Tested with local owner login (`technician1`), dashboard aggregation, task creation, expense submission, CSV exports, backup creation, and restore cycle.
- **Known Limitations & Operating Scope**:
  - Designed for a single workstation deployment per machine. Multi-machine live synchronization is deliberately not supported in order to preserve offline-first, local-only operational integrity.
  - Manual backups should be copied to an external physical drive to safeguard against catastrophic disk failure.
