import { describe, expect, it } from 'vitest';
import {
  calculateMonthlyAveragedAmount,
  calculateYearlyAveragedAmount,
  getAverageCalculationDetails,
  convertAverageRecordsForValueType,
  seedAverageRecordsFromSimpleAmount,
  sortAverageRecordsForEditor,
  type BudgetAverageRecord,
} from '@/lib/budgetAveraging';

describe('budgetAveraging', () => {
  it('aggregates duplicate month buckets before averaging', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2026, month: 3, amount: 1000, date: '2026-03-02' },
      { year: 2026, month: 3, amount: 200, date: '2026-03-18' },
      { year: 2025, month: 12, amount: 900, date: '2025-12-05' },
    ];

    expect(calculateMonthlyAveragedAmount(records)).toBe(1050);
  });

  it('aggregates duplicate year buckets before averaging', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2025, month: null, amount: 100, date: '2025-02-01' },
      { year: 2025, month: null, amount: 50, date: '2025-11-19' },
      { year: 2024, month: null, amount: 90, date: '2024-07-04' },
    ];

    expect(calculateYearlyAveragedAmount(records)).toBe(120);
  });

  it('returns 0 for empty averaged records', () => {
    expect(calculateMonthlyAveragedAmount([])).toBe(0);
    expect(calculateYearlyAveragedAmount([])).toBe(0);
  });

  it('excludes current-month records from monthly averages when configured', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2026, month: 2, amount: 900, date: '2026-02-11' },
      { year: 2026, month: 3, amount: 1000, date: '2026-03-02' },
      { year: 2026, month: 3, amount: 50, date: '2026-03-18' },
    ];

    expect(
      getAverageCalculationDetails(
        'monthly_averaged',
        records,
        'exclude_current_period_until_closed',
        new Date('2026-03-20T12:00:00-08:00'),
      ),
    ).toEqual({
      amount: 900,
      includedPeriodCount: 1,
      excludedCurrentPeriodRecordCount: 2,
    });
  });

  it('excludes current-year records from yearly averages when configured', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2025, month: null, amount: 12000, date: '2025-04-15' },
      { year: 2026, month: null, amount: 18000, date: '2026-01-01' },
    ];

    expect(
      getAverageCalculationDetails(
        'yearly_averaged',
        records,
        'exclude_current_period_until_closed',
        new Date('2026-06-01T12:00:00-07:00'),
      ),
    ).toEqual({
      amount: 12000,
      includedPeriodCount: 1,
      excludedCurrentPeriodRecordCount: 1,
    });
  });

  it('returns 0 when every averaged record falls in the excluded current period', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2026, month: 3, amount: 1000, date: '2026-03-02' },
      { year: 2026, month: 3, amount: 200, date: '2026-03-18' },
    ];

    expect(
      getAverageCalculationDetails(
        'monthly_averaged',
        records,
        'exclude_current_period_until_closed',
        new Date('2026-03-20T12:00:00-08:00'),
      ),
    ).toEqual({
      amount: 0,
      includedPeriodCount: 0,
      excludedCurrentPeriodRecordCount: 2,
    });
  });

  it('transforms monthly records to yearly records by stripping month', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2026, month: 3, amount: 100, date: '2026-03-12' },
      { year: 2025, month: 12, amount: 50, date: '2025-12-03' },
    ];

    expect(convertAverageRecordsForValueType(records, 'monthly_averaged', 'yearly_averaged')).toEqual([
      { year: 2026, month: null, amount: 100, date: '2026-03-12' },
      { year: 2025, month: null, amount: 50, date: '2025-12-03' },
    ]);
  });

  it('transforms yearly records to monthly records by mapping to january', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2026, month: null, amount: 1200, date: '2026-08-09' },
      { year: 2025, month: null, amount: 900, date: '2025-04-11' },
    ];

    expect(convertAverageRecordsForValueType(records, 'yearly_averaged', 'monthly_averaged')).toEqual([
      { year: 2026, month: 1, amount: 1200, date: '2026-08-09' },
      { year: 2025, month: 1, amount: 900, date: '2025-04-11' },
    ]);
  });

  it('seeds yearly averages from the current year', () => {
    const seeded = seedAverageRecordsFromSimpleAmount('yearly_averaged', 500, new Date('2026-03-02T12:00:00-08:00'));
    expect(seeded).toEqual([{ year: 2026, month: null, amount: 500, date: '2026-01-01' }]);
  });

  it('sorts averaged records by date desc then amount desc', () => {
    const records: BudgetAverageRecord[] = [
      { year: 2025, month: 12, amount: 900 },
      { year: 2026, month: 2, amount: 1000, date: '2026-02-11' },
      { year: 2026, month: 2, amount: 500, date: '2026-02-03' },
      { year: 2026, month: 1, amount: 1000, date: '2026-01-09' },
      { year: 2024, month: null, amount: 1000, date: '2024-03-20' },
      { year: 2026, month: null, amount: 1100, date: '2026-05-01' },
    ];

    expect(sortAverageRecordsForEditor(records)).toEqual([
      { year: 2026, month: null, amount: 1100, date: '2026-05-01' },
      { year: 2026, month: 2, amount: 1000, date: '2026-02-11' },
      { year: 2026, month: 2, amount: 500, date: '2026-02-03' },
      { year: 2026, month: 1, amount: 1000, date: '2026-01-09' },
      { year: 2025, month: 12, amount: 900 },
      { year: 2024, month: null, amount: 1000, date: '2024-03-20' },
    ]);
  });
});
