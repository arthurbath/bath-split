import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import type { FrequencyType } from '@/types/fairshare';
import { supabaseRequest, showMutationError } from '@/lib/supabaseRequest';
import { withMutationTiming } from '@/lib/mutationTiming';
import { budgetQueryKeys } from '@/hooks/budgetQueryKeys';
import {
  calculateAmountFromAverageRecords,
  normalizeAverageRecords,
  normalizeCurrentPeriodHandling,
  normalizeBudgetValueType,
  type BudgetCurrentPeriodHandling,
  type BudgetAverageRecord,
  type BudgetValueType,
} from '@/lib/budgetAveraging';

export interface Income {
  id: string;
  name: string;
  amount: number;
  frequency_type: FrequencyType;
  frequency_param: number | null;
  partner_label: string;
  household_id: string;
  is_estimate: boolean;
  value_type: BudgetValueType;
  current_period_handling: BudgetCurrentPeriodHandling;
  average_records: BudgetAverageRecord[];
}

type BudgetIncomeInsert = Database['public']['Tables']['budget_income_streams']['Insert'];
type BudgetIncomeUpdate = Database['public']['Tables']['budget_income_streams']['Update'];

function sortByCreatedAt(rows: Income[]): Income[] {
  return [...rows].sort((a, b) => {
    const aCreated = (a as unknown as { created_at?: string }).created_at ?? '';
    const bCreated = (b as unknown as { created_at?: string }).created_at ?? '';
    return aCreated.localeCompare(bCreated);
  });
}

function normalizeIncomeRow(raw: unknown): Income {
  const row = raw as Record<string, unknown>;
  const valueType = normalizeBudgetValueType(row.value_type);
  const currentPeriodHandling = normalizeCurrentPeriodHandling(row.current_period_handling);
  const averageRecords = normalizeAverageRecords(row.average_records, valueType);
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    amount: valueType === 'simple'
      ? Number(row.amount ?? 0)
      : calculateAmountFromAverageRecords(valueType, averageRecords, currentPeriodHandling),
    frequency_type: (String(row.frequency_type ?? 'monthly') as FrequencyType),
    frequency_param: row.frequency_param == null ? null : Number(row.frequency_param),
    partner_label: String(row.partner_label ?? 'X'),
    household_id: String(row.household_id),
    is_estimate: Boolean(row.is_estimate),
    value_type: valueType,
    current_period_handling: currentPeriodHandling,
    average_records: averageRecords,
  };
}

function toIncomeUpdateRow(updates: Partial<Omit<Income, 'id' | 'household_id'>>): BudgetIncomeUpdate {
  return {
    ...updates,
    average_records: updates.average_records == null ? undefined : updates.average_records as unknown as Json,
  };
}

export function useIncomes(householdId: string) {
  const queryClient = useQueryClient();
  const queryKey = budgetQueryKeys.incomes(householdId);
  const [pendingById, setPendingById] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    enabled: Boolean(householdId),
    queryFn: async () => {
      const rows = await supabaseRequest(async () =>
        await supabase
          .from('budget_income_streams')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at'),
      );
      return (rows ?? []).map(normalizeIncomeRow);
    },
  });

  const setPending = useCallback((id: string, pending: boolean) => {
    setPendingById((current) => {
      if (pending) return { ...current, [id]: true };
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const add = useCallback(async (
    income: Omit<Income, 'id' | 'household_id'>,
    id: string = crypto.randomUUID(),
  ) => {
    if (!householdId) throw new Error('No household selected.');
    setPending(id, true);
    try {
      const saved = await withMutationTiming({ module: 'budget', action: 'incomes.add' }, async () => {
        const insertRow: BudgetIncomeInsert = {
          id,
          household_id: householdId,
          ...income,
          average_records: income.average_records as unknown as Json,
        };
        const row = await supabaseRequest(async () =>
          await supabase
            .from('budget_income_streams')
            .insert(insertRow)
            .select('*')
            .single(),
        );
        return normalizeIncomeRow(row);
      });

      queryClient.setQueryData<Income[]>(queryKey, (current) => sortByCreatedAt([...(current ?? []), saved]));
    } catch (error: unknown) {
      showMutationError(error);
      throw error;
    } finally {
      setPending(id, false);
    }
  }, [householdId, queryClient, queryKey, setPending]);

  const update = useCallback(async (id: string, updates: Partial<Omit<Income, 'id' | 'household_id'>>) => {
    if (pendingById[id]) return;

    let previousIncome: Income | null = null;
    let optimisticUpdateApplied = false;
    let optimisticUpdateTimer: number | null = null;
    const applyOptimisticUpdate = () => {
      if (optimisticUpdateApplied) return;
      optimisticUpdateApplied = true;
      queryClient.setQueryData<Income[]>(queryKey, (current) => {
        const next = (current ?? []).map((income) => {
          if (income.id !== id) return income;
          previousIncome = income;
          return normalizeIncomeRow({ ...income, ...updates });
        });
        return sortByCreatedAt(next);
      });
    };

    setPending(id, true);
    // Let the pending state render before the full optimistic grid recompute.
    optimisticUpdateTimer = window.setTimeout(() => {
      optimisticUpdateTimer = null;
      applyOptimisticUpdate();
    }, 0);

    try {
      const saved = await withMutationTiming({ module: 'budget', action: 'incomes.update' }, async () => {
        const updateRow = toIncomeUpdateRow(updates);
        const row = await supabaseRequest(async () =>
          await supabase
            .from('budget_income_streams')
            .update(updateRow)
            .eq('id', id)
            .select('*')
            .single(),
        );
        return normalizeIncomeRow(row);
      });

      if (optimisticUpdateTimer != null) {
        window.clearTimeout(optimisticUpdateTimer);
        optimisticUpdateTimer = null;
      }

      queryClient.setQueryData<Income[]>(queryKey, (current) =>
        sortByCreatedAt((current ?? []).map((income) => (income.id === id ? saved : income))),
      );
    } catch (error: unknown) {
      if (optimisticUpdateTimer != null) {
        window.clearTimeout(optimisticUpdateTimer);
        optimisticUpdateTimer = null;
      }

      if (optimisticUpdateApplied && previousIncome) {
        queryClient.setQueryData<Income[]>(queryKey, (current) =>
          sortByCreatedAt((current ?? []).map((income) => (income.id === id ? previousIncome : income))),
        );
      }
      showMutationError(error);
      throw error;
    } finally {
      setPending(id, false);
    }
  }, [pendingById, queryClient, queryKey, setPending]);

  const remove = useCallback(async (id: string) => {
    if (pendingById[id]) return;

    setPending(id, true);
    try {
      await withMutationTiming({ module: 'budget', action: 'incomes.remove' }, async () => {
        await supabaseRequest(async () =>
          await supabase.from('budget_income_streams').delete().eq('id', id),
        );
      });

      queryClient.setQueryData<Income[]>(queryKey, (current) => (current ?? []).filter((income) => income.id !== id));
    } catch (error: unknown) {
      showMutationError(error);
      throw error;
    } finally {
      setPending(id, false);
    }
  }, [pendingById, queryClient, queryKey, setPending]);

  return {
    incomes: data ?? [],
    loading: isLoading,
    add,
    update,
    remove,
    pendingById,
    refetch: async () => {
      await refetch();
    },
  };
}
