import axios from 'axios';
import type { PredictResponse, CopilotResponse } from './types';

const BASE = '/api';

export interface CustomerFeatures {
  loan_amount?: number;
  RevolvingUtilizationOfUnsecuredLines: number;
  age: number;
  'NumberOfTime30-59DaysPastDueNotWorse': number;
  DebtRatio: number;
  MonthlyIncome: number | null;
  NumberOfOpenCreditLinesAndLoans: number;
  NumberOfTimes90DaysLate: number;
  NumberRealEstateLoansOrLines: number;
  'NumberOfTime60-89DaysPastDueNotWorse': number;
  NumberOfDependents: number | null;
  MonthlyDebt: number | null;
  IncomePerDependent: number | null;
  CombinedPastDue: number;
  HasDependents: number;
}

export async function predict(
  customerId: string,
  features: CustomerFeatures
): Promise<PredictResponse> {
  const { data } = await axios.post(`${BASE}/ml/predict`, {
    customer_id: customerId,
    features,
  });
  return data;
}

export async function policyQA(question: string): Promise<CopilotResponse> {
  const { data } = await axios.post(`${BASE}/copilot/policy/qa`, { question });
  return data;
}

export async function combinedAnalysis(
  customerId: string,
  features: CustomerFeatures,
  question: string
): Promise<CopilotResponse> {
  const { data } = await axios.post(`${BASE}/copilot/customer/combined`, {
    customer_id: customerId,
    features,
    question,
  });
  return data;
}

export async function fetchRandomCustomer(): Promise<{ customer_id: string; features: CustomerFeatures }> {
  const { data } = await axios.get(`${BASE}/ml/random-customer`);
  return data;
}

export async function fetchQueue(): Promise<any[]> {
  const { data } = await axios.get(`${BASE}/ml/queue`);
  return data.queue;
}

export async function updateQueueStatus(customerId: string, status: string, reason: string = '', analyst: string = 'Jane Doe'): Promise<void> {
  await axios.patch(`${BASE}/ml/queue/${customerId}/status`, { status, reason, analyst });
}

export async function addApplicant(applicant: any): Promise<void> {
  await axios.post(`${BASE}/ml/queue`, applicant);
}

export async function importFromDataset(rowIndex: number): Promise<any> {
  const { data } = await axios.get(`${BASE}/ml/dataset/${rowIndex}`);
  return data.customer;
}
