import type { User } from '@supabase/supabase-js';

type UserWithNameData = Pick<User, 'email'>;

function getTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getUserDisplayName(user: UserWithNameData | null | undefined): string {
  if (!user) return 'You';

  const email = getTrimmedString(user.email);
  if (email) return email;

  return 'You';
}
