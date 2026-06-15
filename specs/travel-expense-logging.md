# Spec: Travel Expense Logging

**Status:** Draft  
**Last updated:** 2026-06-15

---

## 1. Overview

Allow quick logging of travel-related expenses (accommodation and meals, or general travel costs) against a specific day from the calendar view. Expenses are stored as FreeAgent expenses against one of two categories:

| Category         | FreeAgent category URL                                   |
|------------------|----------------------------------------------------------|
| Accommodation & Meals | `https://api.freeagent.com/v2/categories/285`      |
| Travel           | `https://api.freeagent.com/v2/categories/365`           |

Days with logged travel expenses show a badge in the day cell with the count of expenses and total gross value (e.g. "2 · £87.50").

---

## 2. User-facing behaviour

### Entry point
- Right-clicking a day on the calendar opens the existing context menu.
- A new **"Log travel expense…"** item appears at the bottom of the context menu, alongside the existing **"Log mileage…"** item (below the same separator).
- Clicking it opens the travel expense dialog for that day.

### Travel expense dialog

Fields:

| Field       | Notes                                                                                       |
|-------------|---------------------------------------------------------------------------------------------|
| Date        | Pre-filled from the right-clicked day. Read-only.                                           |
| Project     | Read-only text if only one eligible project; shown as a dropdown otherwise. Same eligibility rules as mileage (active projects with at least one billable task). |
| Category    | Dropdown: **Accommodation & Meals** or **Travel**. Default: Accommodation & Meals.         |
| Description | Free-text. Required. Brief description of the expense (e.g. "Hotel — Manchester", "Train to Leeds"). |
| Amount (£)  | Gross value in GBP. Decimal, required, min 0.01.                                            |

- Submitting the form creates a FreeAgent expense and closes the dialog.
- Currency is always GBP.

### Day cell badge
- Days with one or more travel expenses (categories 285 or 365) show a badge at the bottom of the day cell.
- Badge format: `receipt_long` icon · count · total (e.g. `2 · £87.50`).
- Total is the sum of `gross_value` across all matching expenses for that day, formatted as GBP with 2 decimal places.
- The badge appears below the mileage entry if both are present.

---

## 3. Edge cases & open questions

1. **Currency** — Always GBP for now. Configurable currency could be a later enhancement.

2. **Tax / VAT** — FreeAgent expenses have `sales_tax_rate` and `sales_tax_value` fields. Omit both from the POST body and let FreeAgent apply its own defaults: VAT reclaim on Accommodation & Meals (category 285), zero-rated on Travel (category 365). No VAT field in the UI.

3. **Receipt attachment** — FreeAgent supports attaching receipt images to expenses. Out of scope for v1.

4. **Edit / delete** — Out of scope for v1 (consistent with mileage).

5. **Fetching expenses** — The month page already fetches all expenses for the visible date range via `freeagentGetAll('/v2/expenses', ...)`. Travel expenses can be filtered from the same response by checking `category` against the two target URLs. No additional API call is needed.

6. **Project association** — Same rules as mileage: active projects with at least one billable task. If exactly one eligible project, auto-select silently. If multiple, show a dropdown.

7. **Badge placement** — If both mileage and travel expenses exist on the same day, mileage badge appears first, travel badge below it.

---

## 4. Technical approach

### FreeAgent API

- **Create:** `POST /v2/expenses` with body:
  ```json
  {
    "expense": {
      "user": "https://api.freeagent.com/v2/users/[id]",
      "category": "https://api.freeagent.com/v2/categories/[285|365]",
      "dated_on": "YYYY-MM-DD",
      "gross_value": "[amount]",
      "currency": "GBP",
      "description": "[description]",
      "project": "https://api.freeagent.com/v2/projects/[id]"
    }
  }
  ```

- **Fetch:** Already covered by the existing `freeagentGetAll('/v2/expenses', ...)` call in `page.tsx`. Filter by `category` matching either travel URL.

### Data model changes

- `FreeagentExpense` interface already has `gross_value`, `category`, `dated_on`, `description`, and `project` fields — no changes needed.
- `TimeslipDate` (in `page.tsx`) needs a `travelExpenses: FreeagentExpense[]` field added alongside `mileageExpenses`.

### New files
- `src/app/app/month/[month]/travel-expense-dialog.tsx` — client component, the dialog form.
- New server action `createTravelExpense(date, projectUrl, categoryUrl, description, amount)` in `src/app/actions.ts`.

### Wiring
- `page.tsx`: filter fetched expenses for category 285 or 365 and pass as `travelExpenses` per day on `TimeslipDate`.
- `date.tsx`: add `travelExpenses: FreeagentExpense[]` to `TimeslipDate` props; render travel badge; add "Log travel expense…" context menu item; manage `travelOpen` state similar to `mileageOpen`.
- `ClientPage` / `Calendar` / `Date` prop threading: no new props needed beyond what mileage already established (`eligibleProjects` is already passed down).

### Constants
```ts
const TRAVEL_CATEGORIES = {
  accommodationAndMeals: 'https://api.freeagent.com/v2/categories/285',
  travel: 'https://api.freeagent.com/v2/categories/365',
} as const;
```

---

## 5. Manual test checklist

- [ ] Right-clicking a day shows "Log travel expense…" in the context menu
- [ ] Clicking "Log travel expense…" opens the dialog with the correct date pre-filled
- [ ] Category dropdown defaults to "Accommodation & Meals"
- [ ] Switching category to "Travel" and submitting creates an expense with category 365
- [ ] Submitting with Accommodation & Meals creates an expense with category 285
- [ ] Description and amount are required — form does not submit if either is blank
- [ ] Created expense appears in FreeAgent with the correct date, project, category, description, and gross value
- [ ] Day cell shows receipt badge with correct count and total after logging
- [ ] Badge total sums correctly when multiple travel expenses exist on the same day
- [ ] Expenses from both category 285 and 365 contribute to the same badge
- [ ] Badge does not appear on days with no travel expenses
- [ ] Mileage badge and travel badge both render correctly when both are present on the same day
- [ ] When only one eligible project exists, no project picker is shown
- [ ] When multiple eligible projects exist, a project dropdown is shown and the selected project is linked
