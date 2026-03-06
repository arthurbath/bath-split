import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FrequencyType } from '@/types/fairshare';
import { supabaseRequest, showMutationError } from '@/lib/supabaseRequest';
import { withMutationTiming } from '@/lib/mutationTiming';
import { budgetQueryKeys } from '@/hooks/budgetQueryKeys';
import {
  normalizeAverageRecords,
  normalizeBudgetValueType,
  type BudgetAverageRecord,
  type BudgetValueType,
} from '@/lib/budgetAveraging';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency_type: FrequencyType;
  frequency_param: number | null;
  benefit_x: number;
  category_id: string | null;
  household_id: string;
  is_estimate: boolean;
  budget_id: string | null;
  linked_account_id: string | null;
  value_type: BudgetValueType;
  average_records: BudgetAverageRecord[];
}

function sortByCreatedAt(rows: Expense[]): Expense[] {
  return [...rows].sort((a, b) => {
    const aCreated = (a as unknown as { created_at?: string }).created_at ?? '';
    const bCreated = (b as unknown as { created_at?: string }).created_at ?? '';
    return aCreated.localeCompare(bCreated);
  });
}

function normalizeExpenseRow(raw: unknown): Expense {
  const row = raw as Record<string, unknown>;
  const valueType = normalizeBudgetValueType(row.value_type);
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    amount: Number(row.amount ?? 0),
    frequency_type: (String(row.frequency_type ?? 'monthly') as FrequencyType),
    frequency_param: row.frequency_param == null ? null : Number(row.frequency_param),
    benefit_x: Number(row.benefit_x ?? 50),
    category_id: row.category_id == null ? null : String(row.category_id),
    household_id: String(row.household_id),
    is_estimate: Boolean(row.is_estimate),
    budget_id: row.budget_id == null ? null : String(row.budget_id),
    linked_account_id: row.linked_account_id == null ? null : String(row.linked_account_id),
    value_type: valueType,
    average_records: normalizeAverageRecords(row.average_records, valueType),
  };
}

export function useExpenses(householdId: string) {
  const queryClient = useQueryClient();
  const queryKey = budgetQueryKeys.expenses(householdId);
  const [pendingById, setPendingById] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    enabled: Boolean(householdId),
    queryFn: async () => {
      const rows = await supabaseRequest(async () =>
        await supabase
          .from('budget_expenses')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at'),
      );
      return (rows ?? []).map(normalizeExpenseRow);
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

  const add = useCallback(async (expense: Omit<Expense, 'id' | 'household_id'>, id: string = crypto.randomUUID()) => {
    if (!householdId) throw new Error('No household selected.');
    if (pendingById[id]) return;

    setPending(id, true);
    try {
      const saved = await withMutationTiming({ module: 'budget', action: 'expenses.add' }, async () => {
        const row = await supabaseRequest(async () =>
          await supabase
            .from('budget_expenses')
            .insert({
              id,
              household_id: householdId,
              ...expense,
              average_records: expense.average_records as unknown as import('@/integrations/supabase/types').Json,
            } as any)
            .select('*')
            .single(),
        );
        return normalizeExpenseRow(row);
      });

      queryClient.setQueryData<Expense[]>(queryKey, (current) => sortByCreatedAt([...(current ?? []), saved]));
    } catch (error: unknown) {
      showMutationError(error);
      throw error;
    } finally {
      setPending(id, false);
    }
  }, [householdId, pendingById, queryClient, queryKey, setPending]);

  const update = useCallback(async (id: string, updates: Partial<Omit<Expense, 'id' | 'household_id'>>) => {
    if (pendingById[id]) return;

    let previousExpense: Expense | null = null;
    setPending(id, true);
    queryClient.setQueryData<Expense[]>(queryKey, (current) => {
      const next = (current ?? []).map((expense) => {
        if (expense.id !== id) return expense;
        previousExpense = expense;
        return { ...expense, ...updates };
      });
      return sortByCreatedAt(next);
    });

    try {
      const saved = await withMutationTiming({ module: 'budget', action: 'expenses.update' }, async () => {
        const row = await supabaseRequest(async () =>
          await supabase
            .from('budget_expenses')
            .update(updates as any)
            .eq('id', id)
            .select('*')
            .single(),
        );
        return normalizeExpenseRow(row);
      });

      queryClient.setQueryData<Expense[]>(queryKey, (current) =>
        sortByCreatedAt((current ?? []).map((expense) => (expense.id === id ? saved : expense))),
      );
    } catch (error: unknown) {
      if (previousExpense) {
        queryClient.setQueryData<Expense[]>(queryKey, (current) =>
          sortByCreatedAt((current ?? []).map((expense) => (expense.id === id ? previousExpense : expense))),
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
      await withMutationTiming({ module: 'budget', action: 'expenses.remove' }, async () => {
        await supabaseRequest(async () =>
          await supabase.from('budget_expenses').delete().eq('id', id),
        );
      });

      queryClient.setQueryData<Expense[]>(queryKey, (current) => (current ?? []).filter((expense) => expense.id !== id));
    } catch (error: unknown) {
      showMutationError(error);
      throw error;
    } finally {
      setPending(id, false);
    }
  }, [pendingById, queryClient, queryKey, setPending]);

  return {
    expenses: data ?? [],
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
