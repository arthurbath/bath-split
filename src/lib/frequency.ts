import { FrequencyType } from '@/types/fairshare';

const WEEKS_PER_MONTH = 4.33;
const DAYS_PER_MONTH = 30.44;

export const FREQUENCY_OPTIONS: FrequencyType[] = [
  'weekly',
  'twice_monthly',
  'monthly',
  'annual',
  'k_times_weekly',
  'k_times_monthly',
  'k_times_annually',
  'every_n_days',
  'every_n_weeks',
  'every_n_months',
  'every_n_years',
];

export function toMonthly(amount: number, type: FrequencyType, param?: number): number {
  switch (type) {
    case 'monthly':
      return amount;
    case 'twice_monthly':
      return amount * 2;
    case 'weekly':
      return amount * WEEKS_PER_MONTH;
    case 'every_n_weeks':
      return param && param > 0 ? (amount * WEEKS_PER_MONTH) / param : 0;
    case 'every_n_months':
      return param && param > 0 ? amount / param : 0;
    case 'every_n_days':
      return param && param > 0 ? (amount * DAYS_PER_MONTH) / param : 0;
    case 'every_n_years':
      return param && param > 0 ? amount / (param * 12) : 0;
    case 'annual':
      return amount / 12;
    case 'k_times_annually':
      return param && param > 0 ? (amount * param) / 12 : 0;
    case 'k_times_monthly':
      return param && param > 0 ? amount * param : 0;
    case 'k_times_weekly':
      return param && param > 0 ? amount * param * WEEKS_PER_MONTH : 0;
    default:
      return 0;
  }
}

export function fromMonthly(monthly: number) {
  return {
    daily: monthly / DAYS_PER_MONTH,
    weekly: monthly / WEEKS_PER_MONTH,
    annual: monthly * 12,
  };
}

export const frequencyLabels: Record<FrequencyType, string> = {
  monthly: 'Monthly',
  twice_monthly: 'Semi-monthly',
  weekly: 'Weekly',
  annual: 'Yearly',
  k_times_annually: 'X/Year',
  k_times_monthly: 'X/Month',
  k_times_weekly: 'X/Week',
  every_n_days: 'Every X Days',
  every_n_weeks: 'Every X Weeks',
  every_n_months: 'Every X Months',
  every_n_years: 'Every X Years',
};

export function needsParam(type: FrequencyType): boolean {
  return type === 'every_n_weeks'
    || type === 'every_n_months'
    || type === 'every_n_days'
    || type === 'every_n_years'
    || type === 'k_times_annually'
    || type === 'k_times_monthly'
    || type === 'k_times_weekly';
}
