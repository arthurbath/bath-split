import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supabaseRequest, showMutationError } from '@/lib/supabaseRequest';
import { withMutationTiming } from '@/lib/mutationTiming';
import { budgetQueryKeys } from '@/hooks/budgetQueryKeys';

export interface Category {
  id: string;
  name: string;
  color: string | null;
  household_id: string;
}

function sortByName(rows: Category[]): Category[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

export function useCategories(householdId: string) {
  const queryClient = useQueryClient();
  const queryKey = budgetQueryKeys.categories(householdId);
  const [pendingById, setPendingById] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    enabled: Boolean(householdId),
    queryFn: async () => {
      const rows = await supabaseRequest(async () =>
        await supabase
          .from('budget_categories')
          .select('*')
          .eq('household_id', householdId)
          .order('name'),
      );
      return (rows as Category[]) ?? [];
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

  const add = useCallback(async (name: string, color: string | null = null, id: string = crypto.randomUUID()) => {
    if (!householdId) throw new Error('No household selected.');

    setPending(id, true);
    try {
      const saved = await withMutationTiming({ module: 'budget', action: 'categories.add' }, async () => {
        const row = await supabaseRequest(async () =>
          await supabase
            .from('budget_categories')
            .insert({
              id,
              household_id: householdId,
              name,
              color,
            })
            .select('*')
            .single(),
        );
        return row as Category;
      });

      queryClient.setQueryData<Category[]>(queryKey, (current) => sortByName([...(current ?? []), saved]));
    } catch (error: unknown) {
      showMutationError(error);
      throw error;
    } finally {
      setPending(id, false);
    }
  }, [householdId, queryClient, queryKey, setPending]);

  const update = useCallback(async (id: string, name: string) => {
    if (pendingById[id]) return;

    let previousCategory: Category | null = null;
    setPending(id, true);
    queryClient.setQueryData<Category[]>(queryKey, (current) => {
      const next = (current ?? []).map((category) => {
        if (category.id !== id) return category;
        previousCategory = category;
        return { ...category, name };
      });
      return sortByName(next);
    });

    try {
      const saved = await withMutationTiming({ module: 'budget', action: 'categories.update' }, async () => {
        const row = await supabaseRequest(async () =>
          await supabase
            .from('budget_categories')
            .update({ name })
            .eq('id', id)
            .select('*')
            .single(),
        );
        return row as Category;
      });

      queryClient.setQueryData<Category[]>(queryKey, (current) =>
        sortByName((current ?? []).map((category) => (category.id === id ? saved : category))),
      );
    } catch (error: unknown) {
      if (previousCategory) {
        queryClient.setQueryData<Category[]>(queryKey, (current) =>
          sortByName((current ?? []).map((category) => (category.id === id ? previousCategory : category))),
        );
      }
      showMutationError(error);
      throw error;
    } finally {
      setPending(id, false);
    }
  }, [pendingById, queryClient, queryKey, setPending]);

  const updateColor = useCallback(async (id: string, color: string | null) => {
    if (pendingById[id]) return;

    let previousCategory: Category | null = null;
    setPending(id, true);
    queryClient.setQueryData<Category[]>(queryKey, (current) => {
      const next = (current ?? []).map((category) => {
        if (category.id !== id) return category;
        previousCategory = category;
        return { ...category, color };
      });
      return sortByName(next);
    });

    try {
      const saved = await withMutationTiming({ module: 'budget', action: 'categories.updateColor' }, async () => {
        const row = await supabaseRequest(async () =>
          await supabase
            .from('budget_categories')
            .update({ color })
            .eq('id', id)
            .select('*')
            .single(),
        );
        return row as Category;
      });

      queryClient.setQueryData<Category[]>(queryKey, (current) =>
        sortByName((current ?? []).map((category) => (category.id === id ? saved : category))),
      );
    } catch (error: unknown) {
      if (previousCategory) {
        queryClient.setQueryData<Category[]>(queryKey, (current) =>
          sortByName((current ?? []).map((category) => (category.id === id ? previousCategory : category))),
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
      await withMutationTiming({ module: 'budget', action: 'categories.remove' }, async () => {
        await supabaseRequest(async () =>
          await supabase.from('budget_categories').delete().eq('id', id),
        );
      });

      queryClient.setQueryData<Category[]>(queryKey, (current) => (current ?? []).filter((category) => category.id !== id));
    } catch (error: unknown) {
      showMutationError(error);
      throw error;
    } finally {
      setPending(id, false);
    }
  }, [pendingById, queryClient, queryKey, setPending]);

  return {
    categories: data ?? [],
    loading: isLoading,
    add,
    update,
    updateColor,
    remove,
    pendingById,
    refetch: async () => {
      await refetch();
    },
  };
}
