

# FairShare – Budget Splitting App

A two-partner budgeting app that fairly splits recurring expenses using benefit split × income ratio, showing per-expense breakdowns and a single monthly settlement amount.

---

## Phase 1: Authentication, Household Setup & Database

**Goal:** Two users can sign up, create/join a household, and see their shared workspace.

- **Sign-up / Login** using Supabase Auth (email + password)
- **Household creation flow:** First user creates a household and enters their display name (e.g. "Alice"). They're assigned partner label X internally.
- **Partner invite:** First user sends an email invite. The invited partner signs up, enters their display name (e.g. "Bob"), and is assigned label Y.
- **Database setup:** `households`, `household_members`, `categories`, `income_streams`, `expenses`, `restore_points` tables with RLS policies so users only access their own household's data.
- **Top navigation** with tabs: Incomes, Expenses, Summary, Categories, Restore Points (content placeholder for now).

---

## Phase 2: Categories & Income Streams

**Goal:** Partners can manage categories and enter their income streams.

- **Categories screen:** Add, rename, and delete categories. Deleting a category used by expenses prompts to reassign or set to "No category."
- **Incomes screen:** Spreadsheet-style inline-editable table with columns: Partner name, Income name, Amount per occurrence, Frequency type (dropdown), Frequency param (conditional), Monthly amount (calculated, read-only).
- **Footer totals:** Each partner's monthly income total and the income ratio (e.g. "Alice 60% / Bob 40%").
- **Frequency normalization:** `toMonthly()` utility using the 4.33 weeks/month constant for all supported frequency types (monthly, twice_monthly, weekly, every_n_weeks, annual, k_times_annually).
- **Autosave** on each cell edit.

---

## Phase 3: Expenses & Fair Share Calculation

**Goal:** Partners can enter expenses and see how each is fairly split.

- **Expenses screen:** Spreadsheet-style table with columns: Name, Category (dropdown), Amount, Frequency, Frequency param, Monthly amount (calculated), Payer (dropdown showing partner names), Benefit X% (editable, default 50), Benefit Y% (auto = 100 − X%), Fair share for each partner (calculated).
- **Core math:** Implements the "multiply-then-normalize" formula — combines benefit split with income ratio to determine each partner's fair share per expense.
- **Defaults:** New expenses default to 50/50 benefit split, monthly frequency, first partner as payer.
- **Validation:** Benefit % must be 0–100 integer; frequency params required when applicable.

---

## Phase 4: Summary Screen

**Goal:** A clear overview of the monthly settlement.

- **Totals section:** Total monthly expenses, each partner's fair total, each partner's actual paid total.
- **Settlement callout:** Large, prominent display — e.g. "Bob pays Alice $342" or "All square!"
- **Per-expense breakdown table** (read-only): Name, Monthly amount, Payer, Benefit split, Fair share per partner, Over/under column.
- All currency values displayed as whole dollars (internal precision preserved).

---

## Phase 5: Manual Restore Points

**Goal:** Users can save and restore snapshots of their budget data.

- **Restore Points screen:** List of saved restore points showing name (optional) and timestamp.
- **Create restore point:** Button to snapshot current categories, incomes, and expenses into a JSON payload.
- **Restore:** Clicking restore replaces all current household data with the snapshot contents, with a confirmation dialog.
- Automated/scheduled snapshots deferred to a future phase.

