import { describe, expect, it } from 'vitest';
import { getFeedbackContext } from '@/platform/components/FeedbackDialog';

describe('getFeedbackContext', () => {
  it('uses module-scoped context when a module is active', () => {
    expect(getFeedbackContext('budget', '/budget/summary')).toBe('in_app_budget');
    expect(getFeedbackContext('drawers', '/drawers/plan')).toBe('in_app_drawers');
    expect(getFeedbackContext('garage', '/garage/due')).toBe('in_app_garage');
  });

  it('uses account context on the account page', () => {
    expect(getFeedbackContext(null, '/account')).toBe('in_app_account');
    expect(getFeedbackContext(null, '/account/')).toBe('in_app_account');
  });

  it('uses switcher context on the launcher root', () => {
    expect(getFeedbackContext(null, '/')).toBe('in_app_switcher');
  });

  it('falls back to switcher context when no module or account page is active', () => {
    expect(getFeedbackContext(null, '/admin')).toBe('in_app_switcher');
  });
});
