import { describe, expect, it } from 'vitest';
import { FREQUENCY_OPTIONS, frequencyLabels, needsParam, toMonthly } from '@/lib/frequency';

describe('frequency', () => {
  it('converts every_n_years to a monthly amount', () => {
    expect(toMonthly(1200, 'every_n_years', 2)).toBe(50);
  });

  it('requires a param for every_n_years', () => {
    expect(needsParam('every_n_years')).toBe(true);
  });

  it('lists every X frequencies at the end of the dropdown order', () => {
    expect(FREQUENCY_OPTIONS).toEqual([
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
    ]);
    expect(frequencyLabels.every_n_years).toBe('Every X Years');
  });
});
