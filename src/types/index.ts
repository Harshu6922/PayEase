export interface Company {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  company_id: string;
  role: string;
}

export interface Employee {
  id: string;
  company_id: string;
  full_name: string;
  employee_id: string;
  monthly_salary: number;
  standard_working_hours: number;
  overtime_multiplier: number;
  joining_date: string;
  is_active: boolean;
  worker_type: 'salaried' | 'commission';
  created_at?: string;
}

export interface AttendanceRecord {
  id?: string;
  company_id: string;
  employee_id: string;
  date: string;
  status: string;
  start_time: string;
  end_time: string;
  daily_wage: number;
  hourly_rate: number;
  worked_hours: number;
  daily_pay: number;
  overtime_hours?: number | null;
  overtime_amount?: number | null;
  deduction_hours?: number | null;
  deduction_amount?: number | null;
}

export interface PayrollSummary {
  id?: string;
  company_id: string;
  employee_id: string;
  month: number;
  year: number;
  total_worked_days: number;
  total_worked_hours: number;
  total_overtime_hours: number;
  total_overtime_amount: number;
  total_deduction_amount: number;
  final_payable_salary: number;
}

export interface EmployeeAdvance {
  id?: string;
  company_id: string;
  employee_id: string;
  amount: number;
  advance_date: string;
  note?: string | null;
  created_at?: string;
}

export interface PayrollRow {
  employee_id: string;      // internal UUID
  display_id: string;       // human-readable ID (e.g. EMP-001)
  full_name: string;
  total_worked_days: number;
  earned_salary: number;
  total_overtime_amount: number;
  total_deduction_amount: number;
  total_advances: number;
  final_payable_salary: number;
}

export interface ParsedPunchRow {
  biometricName: string;
  date: string;           // 'YYYY-MM-DD'
  inTime: string | null;  // 'HH:mm' — null if only one punch
  outTime: string | null; // 'HH:mm' — null if only one punch
}

export interface CommissionItem {
  id: string;
  company_id: string;
  name: string;
  default_rate: number | null;
  created_at: string;
}

export interface AgentItemRate {
  id: string;
  employee_id: string;
  item_id: string;
  commission_rate: number;
  created_at: string;
  commission_items?: Pick<CommissionItem, 'id' | 'name' | 'default_rate'>;
}

export interface WorkEntry {
  id: string;
  employee_id: string;
  company_id: string;
  date: string;           // 'YYYY-MM-DD'
  item_id: string;
  quantity: number;
  rate: number;           // snapshotted at entry time
  total_amount: number;   // generated column: quantity × rate
  created_at: string;
}
