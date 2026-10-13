export interface User {
  id: string;
  name: string;
  username: string;
  role: 'owner' | 'technician' | 'lead';
  created_at?: string;
}

export interface Institution {
  id: string;
  name: string;
  type?: string | null;
  address?: string | null;
  district?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  category?: string | null;
  address?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TaskStatus = 'Assigned' | 'In Progress' | 'Blocked' | 'Completed' | 'Cancelled';

export interface TaskUpdate {
  id: string;
  task_id: string;
  note: string;
  status?: TaskStatus | null;
  created_at: string;
  user_id?: string | null;
  user_name?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  assigned_by?: string | null;
  assigned_to?: string | null;
  priority: TaskPriority;
  assignment_date?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  institution_id?: string | null;
  institution_name?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  installation_job_id?: string | null;
  expected_deliverable?: string | null;
  status: TaskStatus;
  progress_notes?: string | null;
  blocker_description?: string | null;
  pending_reason?: string | null;
  next_action?: string | null;
  follow_up_date?: string | null;
  completion_notes?: string | null;
  completion_evidence?: string | null;
  created_at: string;
  updated_at: string;
  updates?: TaskUpdate[];
}

export type VisitStatus = 'Planned' | 'In Progress' | 'Completed' | 'Blocked' | 'Cancelled';

export interface FieldVisit {
  id: string;
  institution_id?: string | null;
  institution_name?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  institution_type?: string | null;
  address?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  purpose: string;
  task_id?: string | null;
  task_title?: string | null;
  installation_job_id?: string | null;
  planned_arrival?: string | null;
  actual_start?: string | null;
  end_time?: string | null;
  status: VisitStatus;
  equipment_handled?: string | null;
  work_performed?: string | null;
  results?: string | null;
  issues_discovered?: string | null;
  next_steps?: string | null;
  created_at: string;
  updated_at: string;
  expenses?: Expense[];
  issues?: TechnicalIssue[];
  attachments?: Attachment[];
}

export type ExpenseCategory =
  | 'Bus'
  | 'Train'
  | 'Cab'
  | 'Fuel'
  | 'Food'
  | 'Accommodation'
  | 'Parking'
  | 'Toll'
  | 'Materials'
  | 'Courier'
  | 'Other';

export type PaymentSource =
  | 'Company cash'
  | 'Company advance'
  | 'Company card'
  | 'Employee personal funds'
  | 'Other';

export type ExpenseApprovalStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Settled';

export interface Expense {
  id: string;
  expense_date: string;
  task_id?: string | null;
  task_title?: string | null;
  visit_id?: string | null;
  visit_purpose?: string | null;
  institution_id?: string | null;
  institution_name?: string | null;
  installation_job_id?: string | null;
  category: ExpenseCategory;
  description?: string | null;
  business_purpose?: string | null;
  origin?: string | null;
  destination?: string | null;
  amount_paise: number;
  payment_source: PaymentSource;
  receipt_path?: string | null;
  submitted_date?: string | null;
  approval_status: ExpenseApprovalStatus;
  approver_name?: string | null;
  approval_reason?: string | null;
  reimbursement_paise: number;
  settlement_date?: string | null;
  notes?: string | null;
  advance_id?: string | null;
  fingerprint?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyAdvance {
  id: string;
  received_date: string;
  amount_paise: number;
  amount_used_paise: number;
  remaining_paise: number;
  settlement_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type IssueCategory =
  | 'Hardware'
  | 'Electrical'
  | 'Software'
  | 'Connectivity'
  | 'Calibration'
  | 'Missing Parts'
  | 'Installation'
  | 'Site Readiness'
  | 'User Training'
  | 'Vendor Support'
  | 'Other';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type ResolutionResponsibility =
  | 'Can resolve independently'
  | 'Can investigate but needs approval'
  | 'Needs another technician'
  | 'Needs vendor support'
  | 'Needs team lead decision';

export type IssueStatus =
  | 'Reported'
  | 'Triaged'
  | 'In Progress'
  | 'Waiting for Support'
  | 'Waiting for Vendor'
  | 'Resolved'
  | 'Closed';

export interface IssueComment {
  id: string;
  issue_id: string;
  comment: string;
  author_name: string;
  created_at: string;
}

export interface TechnicalIssue {
  id: string;
  reported_date: string;
  institution_id?: string | null;
  institution_name?: string | null;
  visit_id?: string | null;
  visit_purpose?: string | null;
  task_id?: string | null;
  task_title?: string | null;
  installation_job_id?: string | null;
  product_name?: string | null;
  model?: string | null;
  serial_number?: string | null;
  category: IssueCategory;
  symptoms: string;
  severity: IssueSeverity;
  operational_impact?: string | null;
  troubleshooting?: string | null;
  observations?: string | null;
  root_cause?: string | null;
  proposed_solution?: string | null;
  responsibility: ResolutionResponsibility;
  assigned_support?: string | null;
  assistance_required?: string | null;
  next_action?: string | null;
  target_resolution_date?: string | null;
  resolution_notes?: string | null;
  validation_results?: string | null;
  closure_evidence?: string | null;
  is_safety_critical: number;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  comments?: IssueComment[];
  attachments?: Attachment[];
}

export type QAStatus = 'Pending' | 'In Progress' | 'Passed' | 'Failed' | 'Not Applicable';
export type StockStatus =
  | 'Received'
  | 'QA Pending'
  | 'Available'
  | 'Reserved'
  | 'Dispatched'
  | 'Installed'
  | 'Quarantine'
  | 'Returned to Vendor';

export interface QARecord {
  id: string;
  asset_id: string;
  checklist?: string | null;
  observations: string;
  tester_name: string;
  test_date: string;
  approval_details?: string | null;
  status: 'Passed' | 'Failed';
  created_at: string;
}

export interface InventoryAsset {
  id: string;
  asset_id: string;
  product_name: string;
  category?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  po_reference?: string | null;
  received_date?: string | null;
  quantity: number;
  receipt_condition?: string | null;
  qa_status: QAStatus;
  stock_status: StockStatus;
  assigned_job_id?: string | null;
  institution_id?: string | null;
  institution_name?: string | null;
  dispatch_date?: string | null;
  installation_date?: string | null;
  warranty_end_date?: string | null;
  storage_location?: string | null;
  notes?: string | null;
  disposition_notes?: string | null;
  disposition_by?: string | null;
  disposition_date?: string | null;
  created_at: string;
  updated_at: string;
  qaHistory?: QARecord[];
}

export type InstallationStatus = 'Planned' | 'In Progress' | 'Validation' | 'Completed' | 'Blocked' | 'Cancelled';

export interface InstallationJob {
  id: string;
  title: string;
  institution_id?: string | null;
  institution_name?: string | null;
  status: InstallationStatus;
  site_readiness?: string | null;
  validation_results?: string | null;
  outstanding_issues?: string | null;
  warranty_details?: string | null;
  handover_evidence?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  employee_name: string;
  manual_summary?: string | null;
  tomorrow_plan?: string | null;
  status: 'Draft' | 'Submitted';
  recipient?: string | null;
  submitted_at?: string | null;
  response_notes?: string | null;
  review_status: 'Not reviewed' | 'Reviewed' | 'Clarification requested';
  reviewer_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  original_name: string;
  stored_name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
  url?: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_values?: string | null;
  new_values?: string | null;
  reason?: string | null;
  user_name?: string | null;
  created_at: string;
}

export interface BackupItem {
  name: string;
  createdAt: string;
  dbSize: number;
  note: string;
}

export interface DashboardMetrics {
  date: string;
  assignedToday: number;
  completedToday: number;
  pendingTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  visitsPlanned: number;
  visitsCompleted: number;
  todayExpensesPaise: number;
  monthlyExpensesPaise: number;
  unresolvedIssues: number;
  issuesAwaitingHelp: number;
  issuesAwaitingVendor: number;
  criticalIssues: number;
  claimsAwaitingApproval: number;
  claimsAwaitingSettlement: number;
  pendingReimbursementPaise: number;
  advancesBalancePaise: number;
  recentAudit: AuditLog[];
  tasksByPriority: { priority: string; count: number }[];
  expensesByCategory: { category: string; total_paise: number }[];
}
