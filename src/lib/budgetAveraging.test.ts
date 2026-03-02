import { describe, expect, it } from 'vitest';
import {
  calculateMonthlyAveragedAmount,
  calculateYearlyAveragedAmount,
  convertAverageRecordsForValueType,
  seedAverageRecordsFromSimpleAmount,
  type BudgetAverageRecord,
} from '@/lib/budgetAveraging';

describe('budgetAveraging', () => {
  it('aggregates duplicate month buckets before averaging', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2026, month: 2, amount: 1000 },
      { year: 2026, month: 2, amount: 200 },
      { year: 2025, month: 12, amount: 900 },
    ];

    expect(calculateMonthlyAveragedAmount(records)).toBe(1050);
  });

  it('aggregates duplicate year buckets before averaging', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2025, month: null, amount: 100 },
      { year: 2025, month: null, amount: 50 },
      { year: 2024, month: null, amount: 90 },
    ];

    expect(calculateYearlyAveragedAmount(records)).toBe(120);
  });

  it('returns 0 for empty averaged records', () => {
    expect(calculateMonthlyAveragedAmount([])).toBe(0);
    expect(calculateYearlyAveragedAmount([])).toBe(0);
  });

  it('transforms monthly records to yearly records by stripping month', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2026, month: 3, amount: 100 },
      { year: 2025, month: 12, amount: 50 },
    ];

    expect(convertAverageRecordsForValueType(records, 'monthly_averaged', 'yearly_averaged')).toEqual([
      { year: 2026, month: null, amount: 100 },
      { year: 2025, month: null, amount: 50 },
    ]);
  });

  it('transforms yearly records to monthly records by mapping to january', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2026, month: null, amount: 1200 },
      { year: 2025, month: null, amount: 900 },
    ];

    expect(convertAverageRecordsForValueType(records, 'yearly_averaged', 'monthly_averaged')).toEqual([
      { year: 2026, month: 1, amount: 1200 },
      { year: 2025, month: 1, amount: 900 },
    ]);
  });

  it('seeds yearly averages from the current year', () => {
    const seeded = seedAverageRecordsFromSimpleAmount('yearly_averaged', 500, new Date('2026-03-02T12:00:00-08:00'));
    expect(seeded).toEqual([{ year: 2026, month: null, amount: 500 }]);
  });
});
