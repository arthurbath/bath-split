import { FrequencyType } from '@/types/fairshare';

const WEEKS_PER_MONTH = 4.33;
const DAYS_PER_MONTH = 30.44;

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

export const frequencyLabels: Record<FrequencyType, string> = {
  monthly: 'Monthly',
  twice_monthly: 'Twice Monthly',
  weekly: 'Weekly',
  every_n_weeks: 'Every X Weeks',
  every_n_months: 'Every X Months',
  every_n_days: 'Every X Days',
  annual: 'Yearly',
  k_times_annually: 'X/Year',
  k_times_monthly: 'X/Month',
  k_times_weekly: 'X/Week',
};

export function needsParam(type: FrequencyType): boolean {
  return type === 'every_n_weeks' || type === 'every_n_months' || type === 'every_n_days' || type === 'k_times_annually' || type === 'k_times_monthly' || type === 'k_times_weekly';
}
