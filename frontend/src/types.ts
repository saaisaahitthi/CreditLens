export interface ShapFactor {
  feature: string;
  actual_value: number | null;
  shap_value_log_odds: number;
  direction: string;
}

export interface DtiInfo {
  dti_ratio: number | null;
  dti_pct: string | null;
  band: string;
  note?: string;
}

export interface UtilizationInfo {
  utilization_raw: number | null;
  utilization_pct: string | null;
  band: string;
}

export interface FinancialMetrics {
  monthly_income: number | null;
  monthly_debt_estimated: number | null;
  dti: DtiInfo;
  utilization: UtilizationInfo;
  income_per_dependent: number | null;
  number_of_dependents: number;
}

export interface PolicyEvidence {
  document: string;
  page: number;
  excerpt: string;
}

export interface AuditEntry {
  status: string;
  reason: string;
  analyst: string;
  timestamp: string;
}

export interface QueueCustomer {
  customer_id: string;
  name: string;
  email?: string;
  phone?: string;
  loan_purpose?: string;
  date_applied: string;
  loan_amount: number;
  status: string;
  features: any;
  audit_log?: AuditEntry[];
}

export interface PredictResponse {
  customer_id: string;
  risk_probability: number;
  risk_category: string;
  top_risk_factors: ShapFactor[];
  risk_reducing_factors: ShapFactor[];
  financial_metrics: FinancialMetrics;
  additivity_error?: number;
}

export interface CopilotResponse {
  customer_id?: string;
  risk_probability?: number;
  risk_category?: string;
  top_risk_factors?: ShapFactor[];
  risk_reducing_factors?: ShapFactor[];
  financial_metrics?: FinancialMetrics;
  policy_evidence?: PolicyEvidence[];
  llm_output: string;
  caveats?: string[];
  query?: string;
}

export type RiskCategory = 'Low' | 'Medium' | 'High' | 'Very High';
