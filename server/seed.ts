import { openDb, now, writeAuditLog } from './db.js';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

export function seedDemoData() {
  const db = openDb();
  const stamp = now();
  const today = stamp.slice(0, 10);

  // Check if already seeded
  const instCount = (db.prepare('SELECT count(*) as c FROM institutions').get() as any).c;
  if (instCount > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding demo data for Field Operations Local...');

  const tx = db.transaction(() => {
    // 1. Owner User
    const ownerId = nanoid();
    const hasOwner = db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE').get('Manoj');
    if (!hasOwner) {
      db.prepare(`
        INSERT INTO users (id, name, username, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(ownerId, 'Manoj S Arya', 'Manoj', bcrypt.hashSync('Manoj', 10), 'owner', stamp);
    }

    // 2. Institutions (Government Schools & Colleges)
    const inst1 = nanoid();
    const inst2 = nanoid();
    const inst3 = nanoid();

    db.prepare(`
      INSERT INTO institutions (id, name, type, address, district, contact_name, phone, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inst1,
      'Government Polytechnic College - Electronics Wing',
      'Polytechnic Institute',
      'Sector 4, Main Campus Road, Mysore',
      'Mysuru',
      'Prof. H. S. Murthy (HOD Electronics)',
      '+91 98451 23456',
      'hod.ece@govtpoly-mys.edu.in',
      stamp,
      stamp
    );

    db.prepare(`
      INSERT INTO institutions (id, name, type, address, district, contact_name, phone, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inst2,
      'Government Model Residential Science College',
      'Government College',
      'College Hill, Mandya Rural',
      'Mandya',
      'Dr. Anitha Rao (Lab In-charge)',
      '+91 94480 67890',
      'lab.sci@gmrc-mandya.edu.in',
      stamp,
      stamp
    );

    db.prepare(`
      INSERT INTO institutions (id, name, type, address, district, contact_name, phone, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      inst3,
      'Government Higher Secondary School (STEM Lab)',
      'Government School',
      'Station Road, Ramanagara',
      'Ramanagara',
      'Mr. Venkatesh G. (Headmaster)',
      '+91 97312 34567',
      'ghss.stem@karnataka.gov.in',
      stamp,
      stamp
    );

    // 3. Equipment Vendors
    const ven1 = nanoid();
    const ven2 = nanoid();

    db.prepare(`
      INSERT INTO vendors (id, name, category, address, contact_name, phone, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ven1,
      'Bharat Precision Electronics Ltd.',
      'Electronics & Instrumentation',
      'Industrial Area, Phase 2, Peenya, Bengaluru',
      'Suresh Nair',
      '+91 80 2839 1234',
      'support@bharatprecision.in',
      stamp,
      stamp
    );

    db.prepare(`
      INSERT INTO vendors (id, name, category, address, contact_name, phone, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ven2,
      'OptoScientific Laboratory Instruments',
      'Optical & Physics Equipment',
      'Electronics City Phase 1, Bengaluru',
      'Pooja Sharma',
      '+91 80 4123 5678',
      'orders@optoscientific.com',
      stamp,
      stamp
    );

    // 4. Installation Jobs
    const job1 = nanoid();
    db.prepare(`
      INSERT INTO installation_jobs (id, title, institution_id, status, site_readiness, validation_results, outstanding_issues, warranty_details, handover_evidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job1,
      'Setup 24-Workstation Microcontroller Lab',
      inst1,
      'In Progress',
      'Bench power wiring verified. Stabilizer grounding test 1.2 Ohms (compliant). Dedicated MCB installed.',
      'Bench 1 to 12 powered up and signal generators calibrated. Bench 13-24 pending cable trunking.',
      'Bench 18 oscilloscope probe grounding clip missing in box.',
      '1 Year Comprehensive Onsite Warranty + 2 Years Free Calibration Support',
      'Preliminary site verification signed by HOD. Final handover document scheduled after Bench 24 completion.',
      stamp,
      stamp
    );

    // 5. Inventory Assets
    const ast1 = nanoid();
    const ast2 = nanoid();
    const ast3 = nanoid();

    db.prepare(`
      INSERT INTO inventory_assets (id, asset_id, product_name, category, manufacturer, model, serial_number, vendor_id, po_reference, received_date, quantity, receipt_condition, qa_status, stock_status, assigned_job_id, institution_id, dispatch_date, installation_date, warranty_end_date, storage_location, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ast1,
      'EQ-DSO-2024-001',
      'Dual-Channel Digital Storage Oscilloscope 100MHz',
      'Test & Measurement',
      'Bharat Precision',
      'BP-DSO100',
      'SN-BP-99812-A',
      ven1,
      'PO-KRN-2024-88',
      today,
      1,
      'Intact seal, all BNC leads included',
      'Passed',
      'Available',
      job1,
      inst1,
      today,
      null,
      '2027-10-13',
      'Rack B-3 Mysore Depot',
      'Passed full 10-point voltage & frequency calibration.',
      stamp,
      stamp
    );

    db.prepare(`
      INSERT INTO inventory_assets (id, asset_id, product_name, category, manufacturer, model, serial_number, vendor_id, po_reference, received_date, quantity, receipt_condition, qa_status, stock_status, assigned_job_id, institution_id, dispatch_date, installation_date, warranty_end_date, storage_location, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ast2,
      'EQ-MIC-2024-042',
      'Binocular Research Optical Microscope 1000x',
      'Laboratory Optics',
      'OptoScientific',
      'OPT-B1000',
      'SN-OP-55120-B',
      ven2,
      'PO-KRN-2024-91',
      today,
      1,
      'External packaging showed corner scuff',
      'Passed',
      'Available',
      null,
      inst2,
      today,
      null,
      '2026-10-13',
      'Rack C-1 Mandya Hub',
      'Tested 4x, 10x, 40x and 100x oil immersion objectives. Clean focal plane.',
      stamp,
      stamp
    );

    db.prepare(`
      INSERT INTO inventory_assets (id, asset_id, product_name, category, manufacturer, model, serial_number, vendor_id, po_reference, received_date, quantity, receipt_condition, qa_status, stock_status, assigned_job_id, institution_id, dispatch_date, installation_date, warranty_end_date, storage_location, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ast3,
      'EQ-PWR-2024-089',
      'Triple Output Regulated DC Power Supply 30V/5A',
      'Power Electronics',
      'Bharat Precision',
      'BP-PS3005',
      'SN-BP-44119-C',
      ven1,
      'PO-KRN-2024-88',
      today,
      1,
      'Chassis rattle detected upon unboxing',
      'Failed',
      'Quarantine',
      null,
      null,
      null,
      null,
      '2026-10-13',
      'Quarantine Bay 1',
      'Internal transformer mounting screw loose. Quarantine tag #QT-89 applied.',
      stamp,
      stamp
    );

    // QA Record for ast1
    db.prepare(`
      INSERT INTO qa_records (id, asset_id, checklist, observations, tester_name, test_date, approval_details, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nanoid(),
      ast1,
      JSON.stringify(['Chassis grounding < 0.1 Ohm', 'Display test passed', 'Frequency accuracy within 0.05%']),
      'All channels baseline calibrated. Zero drift observed during 30 min warm-up.',
      'Ramesh Kumar',
      today,
      'Approved for dispatch to Govt Polytechnic',
      'Passed',
      stamp
    );

    // 6. Tasks
    const t1 = nanoid();
    const t2 = nanoid();
    const t3 = nanoid();

    db.prepare(`
      INSERT INTO tasks (id, title, description, assigned_by, assigned_to, priority, assignment_date, start_date, due_date, institution_id, installation_job_id, expected_deliverable, status, progress_notes, next_action, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      t1,
      'Install & validate 12 Digital Oscilloscopes at Govt Polytechnic',
      'Unbox, inspect, install anti-static mats, connect to regulated UPS, run self-calibration test.',
      'Sunil Verma (Team Lead)',
      'Ramesh Kumar',
      'High',
      today,
      today,
      today,
      inst1,
      job1,
      'Signed installation validation sheet & asset tag log',
      'In Progress',
      '8 units mounted and tested; 4 units underway.',
      'Complete remaining 4 units and obtain HOD signoff',
      stamp,
      stamp
    );

    db.prepare(`
      INSERT INTO tasks (id, title, description, assigned_by, assigned_to, priority, assignment_date, start_date, due_date, institution_id, expected_deliverable, status, blocker_description, pending_reason, next_action, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      t2,
      'Commission Physics Lab Spectrometers at Model Residential College',
      'Setup optical darkroom benches, align sodium vapor light sources, calibrate vernier scale.',
      'Sunil Verma (Team Lead)',
      'Ramesh Kumar',
      'Urgent',
      today,
      today,
      today,
      inst2,
      'Calibration report & student experiment verification demo',
      'Blocked',
      'Darkroom window blackout curtains not installed by college civil maintenance.',
      'Waiting for college administration to seal light leaks before optical calibration can be performed.',
      'Contact Principal office and reschedule darkroom alignment',
      stamp,
      stamp
    );

    db.prepare(`
      INSERT INTO tasks (id, title, description, assigned_by, assigned_to, priority, assignment_date, start_date, due_date, institution_id, expected_deliverable, status, progress_notes, completion_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      t3,
      'Deliver STEM Microcontroller Sensor Kits at Govt Higher Secondary',
      'Handover 20 sensor expansion kits, conduct basic power-on test with science teacher.',
      'Sunil Verma (Team Lead)',
      'Ramesh Kumar',
      'Medium',
      today,
      today,
      today,
      inst3,
      'Handover receipt with school stamp',
      'Completed',
      'Delivered and verified. Demonstration completed.',
      'Handover slip signed by Headmaster Mr. Venkatesh.',
      stamp,
      stamp
    );

    // 7. Field Visits
    const v1 = nanoid();
    const v2 = nanoid();

    db.prepare(`
      INSERT INTO field_visits (id, institution_id, institution_type, address, contact_person, phone, purpose, task_id, planned_arrival, actual_start, end_time, status, equipment_handled, work_performed, results, next_steps, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      v1,
      inst1,
      'Polytechnic Institute',
      'Sector 4, Main Campus Road, Mysore',
      'Prof. H. S. Murthy',
      '+91 98451 23456',
      'Onsite Lab Deployment & Calibration',
      t1,
      `${today}T09:30:00`,
      `${today}T09:45:00`,
      `${today}T14:15:00`,
      'In Progress',
      'Dual-Channel Digital Storage Oscilloscopes BP-DSO100 (12 units)',
      'Assembled workstations, validated mains grounding, firmware updated to v2.4, calibrated channels 1 and 2.',
      '8 stations fully functional. Bench 18 probe clip replacement needed.',
      'Revisit tomorrow to complete remaining stations and handover documentation.',
      stamp,
      stamp
    );

    db.prepare(`
      INSERT INTO field_visits (id, institution_id, institution_type, address, contact_person, phone, purpose, task_id, planned_arrival, actual_start, end_time, status, equipment_handled, work_performed, results, next_steps, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      v2,
      inst3,
      'Government School',
      'Station Road, Ramanagara',
      'Mr. Venkatesh G.',
      '+91 97312 34567',
      'Kit Delivery & Teacher Orientation',
      t3,
      `${today}T15:00:00`,
      `${today}T15:10:00`,
      `${today}T16:45:00`,
      'Completed',
      '20 STEM Sensor Expansion Kits',
      'Unpacked kits, demonstrated temperature, ultrasonic, and light sensor interfacing.',
      'All 20 kits verified working. 3 science teachers attended training.',
      'Submit training verification form with weekly report.',
      stamp,
      stamp
    );

    // 8. Company Advances & Expenses
    const adv1 = nanoid();
    db.prepare(`
      INSERT INTO company_advances (id, received_date, amount_paise, amount_used_paise, remaining_paise, settlement_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(adv1, today, 800000, 165000, 635000, 'Mysore - Mandya rural field tour advance sanctioned by Lead', stamp, stamp);

    // Expense 1: Fuel paid with Company Advance (₹1,200) -> 0 reimbursement
    const exp1 = nanoid();
    db.prepare(`
      INSERT INTO expenses (id, expense_date, task_id, visit_id, institution_id, category, description, business_purpose, origin, destination, amount_paise, payment_source, reimbursement_paise, advance_id, approval_status, approver_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exp1,
      `${today}T08:15:00`,
      t1,
      v1,
      inst1,
      'Fuel',
      'Petrol for two-wheeler field travel to Mysore Depot and Govt Polytechnic',
      'Field visit transportation for oscilloscope deployment',
      'Bengaluru Hub',
      'Mysuru Campus',
      120000,
      'Company advance',
      0, // Zero reimbursement because paid from company advance!
      adv1,
      'Approved',
      'Sunil Verma',
      stamp,
      stamp
    );

    // Expense 2: Personal funds for food/refreshments (₹450) -> Eligible for reimbursement
    const exp2 = nanoid();
    db.prepare(`
      INSERT INTO expenses (id, expense_date, task_id, visit_id, institution_id, category, description, business_purpose, amount_paise, payment_source, reimbursement_paise, approval_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      exp2,
      `${today}T13:30:00`,
      t1,
      v1,
      inst1,
      'Food',
      'Lunch during onsite installation at Govt Polytechnic',
      'Official day travel meal during institution deployment',
      45000,
      'Employee personal funds',
      45000, // Counted for employee reimbursement!
      'Submitted',
      stamp,
      stamp
    );

    // 9. Technical Issues
    const iss1 = nanoid();
    db.prepare(`
      INSERT INTO issues (id, reported_date, institution_id, visit_id, task_id, product_name, model, serial_number, category, symptoms, severity, operational_impact, troubleshooting, observations, root_cause, responsibility, assigned_support, assistance_required, next_action, target_resolution_date, status, is_safety_critical, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      iss1,
      today,
      inst1,
      v1,
      t1,
      'Dual-Channel Digital Storage Oscilloscope',
      'BP-DSO100',
      'SN-BP-99812-A',
      'Electrical',
      'Bench 4 earthing wire sparking upon chassis touch. High touch-voltage measured (48V AC).',
      'Critical',
      'Workstation shut down to prevent electrical shock risk to students or staff.',
      'Isolated station mains plug immediately. Measured neutral-to-earth potential at wall socket.',
      'Wall socket earth pin is floating; building wiring lacks return path on Bench 4 socket gang.',
      'Broken ground conductor in institution bench conduit.',
      'Needs team lead decision',
      'Sunil Verma / Institution Electrician',
      'Require certified electrician from institution PWD maintenance to re-pull earthing cable before bench can be energized.',
      'Issue electrical safety isolation notice to HOD',
      today,
      'Waiting for Support',
      1, // Safety Critical!
      stamp,
      stamp
    );

    // 10. Daily Report
    db.prepare(`
      INSERT INTO daily_reports (id, report_date, employee_name, manual_summary, tomorrow_plan, status, recipient, submitted_at, review_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nanoid(),
      today,
      'Ramesh Kumar',
      'Conducted onsite deployment at Govt Polytechnic Mysore (8 of 12 scopes operational). Flagged Bench 4 earthing hazard and safely locked out station. Successfully delivered STEM kits to Ramanagara High School.',
      'Revisit Mysore Polytechnic with spare probe clip. Follow up with college electrician on Bench 4 conduit ground.',
      'Draft',
      'Sunil Verma (Team Lead)',
      null,
      'Not reviewed',
      stamp,
      stamp
    );
  });

  tx();
  console.log('Demo data successfully seeded.');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedDemoData();
}
