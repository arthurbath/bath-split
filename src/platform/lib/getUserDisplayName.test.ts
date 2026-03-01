import { describe, expect, it } from 'vitest';
import { getUserDisplayName } from '@/platform/lib/getUserDisplayName';

type TestUser = NonNullable<Parameters<typeof getUserDisplayName>[0]>;

describe('getUserDisplayName', () => {
  it('falls back to email, then You', () => {
    expect(
      getUserDisplayName({
        email: 'user@example.com',
      } as TestUser),
    ).toBe('user@example.com');

    expect(
      getUserDisplayName({
        email: null,
      } as TestUser),
    ).toBe('You');
  });
});
