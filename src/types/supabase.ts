export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attendance_records: {
        Row: {
          company_id: string
          created_at: string | null
          daily_pay: number
          daily_wage: number
          date: string
          deduction_amount: number | null
          deduction_hours: number | null
          employee_id: string
          end_time: string
          hourly_rate: number
          id: string
          overtime_amount: number | null
          overtime_hours: number | null
          start_time: string
          status: string
          worked_hours: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          daily_pay: number
          daily_wage: number
          date: string
          deduction_amount?: number | null
          deduction_hours?: number | null
          employee_id: string
          end_time: string
          hourly_rate: number
          id?: string
          overtime_amount?: number | null
          overtime_hours?: number | null
          start_time: string
          status: string
          worked_hours: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          daily_pay?: number
          daily_wage?: number
          date?: string
          deduction_amount?: number | null
          deduction_hours?: number | null
          employee_id?: string
          end_time?: string
          hourly_rate?: number
          id?: string
          overtime_amount?: number | null
          overtime_hours?: number | null
          start_time?: string
          status?: string
          worked_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      employee_advances: {
        Row: {
          id: string
          company_id: string
          employee_id: string
          amount: number
          advance_date: string
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          company_id: string
          employee_id: string
          amount: number
          advance_date: string
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          company_id?: string
          employee_id?: string
          amount?: number
          advance_date?: string
          note?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_advances_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_advances_employee_id_fkey"
            columns: ["employee_id"]
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          company_id: string
          created_at: string | null
          employee_id: string
          full_name: string
          id: string
          is_active: boolean | null
          joining_date: string
          monthly_salary: number
          overtime_multiplier: number
          standard_working_hours: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          employee_id: string
          full_name: string
          id?: string
          is_active?: boolean | null
          joining_date: string
          monthly_salary: number
          overtime_multiplier?: number
          standard_working_hours: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          employee_id?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          joining_date?: string
          monthly_salary?: number
          overtime_multiplier?: number
          standard_working_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      payroll_summaries: {
        Row: {
          company_id: string
          created_at: string | null
          employee_id: string
          final_payable_salary: number
          id: string
          month: number
          total_deduction_amount: number | null
          total_overtime_amount: number | null
          total_overtime_hours: number | null
          total_worked_days: number
          total_worked_hours: number
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string | null
          employee_id: string
          final_payable_salary: number
          id?: string
          month: number
          total_deduction_amount?: number | null
          total_overtime_amount?: number | null
          total_overtime_hours?: number | null
          total_worked_days?: number
          total_worked_hours?: number
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string | null
          employee_id?: string
          final_payable_salary?: number
          id?: string
          month?: number
          total_deduction_amount?: number | null
          total_overtime_amount?: number | null
          total_overtime_hours?: number | null
          total_worked_days?: number
          total_worked_hours?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_summaries_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_summaries_employee_id_fkey"
            columns: ["employee_id"]
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id: string
          role?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
