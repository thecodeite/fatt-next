# Spec: Mileage Logging

**Status:** Draft  
**Last updated:** 2026-06-02

---

## 1. Overview

Allow quick logging of business mileage against a specific day from the calendar view. Mileage is stored as a FreeAgent expense. Because journeys are typically round-trips to the same place, the UI should suggest previous destinations and auto-fill the distance when a known destination is selected. Start and end odometer readings are optionally stored in the FreeAgent expense description field so a separate odometer log is maintained alongside the official HMRC mileage record.

---

## 2. User-facing behaviour

### Entry point
- Right-clicking a day on the calendar opens the existing context menu.
- A new **"Log mileage…"** item appears at the bottom of that menu (below a separator).
- Clicking it opens a mileage dialog for that day.

### Mileage dialog
Fields:
| Field            | Notes                                                                       |
|------------------|-----------------------------------------------------------------------------|
| Date             | Pre-filled from the right-clicked day. Read-only.                           |
| Project          | Readonly text if only one eligible project; shown as a dropdown otherwise.  |
| Destination      | Free-text with autocomplete suggestions from previous destinations.         |
| Distance (miles) | Auto-filled when a known destination is selected. Editable.                 |
| Start odometer   | Optional. Numeric.                                                          |
| End odometer     | Optional. Numeric. Auto-filled as `start + distance` when start is entered. |

- If a known destination is selected and its distance differs from what was auto-filled, the user can override it.
- Submitting the form creates a FreeAgent expense and closes the dialog.
- If start/end odometer values are provided, they are encoded into the expense description (see §4).

### Destination suggestions
- Previous destinations are stored in `FattSettings` (the existing FreeAgent Note mechanism).
- Each saved destination stores: `name` (string), `defaultDistance` (number in miles).
- When the user enters a destination that isn't in the list and submits, it is saved automatically with the distance used.
- If the distance is changed from the saved default for a known destination, the user is prompted: **"Update saved distance for [destination] to [X] miles?"** — yes/no.

---

## 3. Edge cases & open questions

1. **Vehicle/engine settings** — Single vehicle, always the same: `vehicle_type: car`, `engine_type: petrol`, `engine_size: 1401_to_2000cc` (1999cc engine).
   - _Decision:_ Store vehicle values in `FattSettings` with sensible defaults baked in. No setup UI needed.

2. **FreeAgent expense category** — Confirmed: `https://api.freeagent.com/v2/categories/249` ("Mileage", nominal code 249). Hardcode this URL.

3. **Miles vs km** — FreeAgent supports both. Assume miles (UK usage) for now; can be made configurable later.

4. **Project association** — Filter active projects that have at least one billable task.
   - If exactly one such project exists → auto-select it silently; no picker shown in the dialog.
   - If multiple exist → show a project dropdown in the dialog, pre-selected to the first option.
   - `projects` and `tasks` are already fetched on the month page and available as props on the `Date` component (tasks) and `ClientPage` (projects). `projects` will need passing down to `Date`.

5. **Odometer description format** — Must be parseable if we want to display the log later.
   - _Proposal:_ `"[Destination] | odo: [start]→[end]"` e.g. `"London Office | odo: 12345→12678"`. If no odometer values, just `"[Destination]"`.

6. **Viewing logged mileage** — Should the calendar day show a mileage entry the same way it shows timeslips? Out of scope for v1.

7. **Edit / delete mileage** — Out of scope for v1.

---

## 4. Technical approach

### FreeAgent API
- **Create:** `POST /v2/expenses` with body:
  ```json
  {
    "expense": {
      "user": "https://api.freeagent.com/v2/users/[id]",
      "category": "https://api.freeagent.com/v2/categories/249",
      "dated_on": "YYYY-MM-DD",
      "gross_value": "0.0",
      "currency": "GBP",
      "mileage": "[distance]",
      "vehicle_type": "Car",
      "engine_type": "Petrol",
      "engine_size": "1401-2000cc",
      "reclaim_mileage": true,
      "project": "https://api.freeagent.com/v2/projects/[id]",
      "description": "[Destination] | odo: [start]→[end]"
    }
  }
  ```
  > **Note:** `engine_type` and `engine_size` string values are taken from the `mileage_settings` response (`"Petrol"`, `"1401-2000cc"`). Confirm these are also the accepted POST values with a test submission. `gross_value` may be calculated automatically by FreeAgent when `reclaim_mileage: true` — verify with a test POST.
  
  > **HMRC rates (for reference):** 45p/mile for first 10,000 miles, 25p thereafter. Rises to 55p from 6 April 2026. FreeAgent applies the correct rate automatically based on `dated_on`.

- **Mileage rates:** `GET /v2/expenses/mileage_settings` — no need to fetch at runtime; rates are handled server-side by FreeAgent.

### Data storage
- Vehicle settings and saved destinations stored in `FattSettings` (existing FreeAgent Note blob):
  ```ts
  interface FattSettings {
    tasks?: ...
    mileage?: {
      vehicleType: string;
      engineType: string;
      engineSize: string;
      destinations: Record<string, { defaultDistance: number }>;
    }
  }
  ```

### New files
- `src/app/app/month/[month]/mileage-dialog.tsx` — client component, the dialog form.
- New server action `createMileageExpense(date, projectUrl, destination, distance, startOdo?, endOdo?)` in `src/app/actions.ts`.

### Wiring
- Add **"Log mileage…"** item to the context menu in `date.tsx`.
- The `Date` component manages open/close state for the dialog (similar to the existing context menu state pattern).
- Pass `projects: FreeagentProject[]` down from `ClientPage` → `Calendar` → `Date` (projects are already fetched in `page.tsx`).
- Eligible projects (active + has billable task) computed once in `ClientPage` before passing down.
- `tasks` and `fattSettings` are already props on `Date`, so no new server-side fetching needed.

---

## 5. Manual test checklist

- [ ] Right-clicking a day shows "Log mileage…" in the context menu
- [ ] Clicking "Log mileage…" opens the mileage dialog with the correct date pre-filled
- [ ] Typing a new destination and submitting creates a FreeAgent expense with the correct date, distance, and description
- [ ] The new destination appears in autocomplete suggestions on subsequent uses
- [ ] Selecting a known destination auto-fills the distance
- [ ] Entering start odometer auto-fills end odometer as start + distance
- [ ] Submitting with odometer values encodes them in the FreeAgent expense description
- [ ] Mileage expense is created with correct vehicle type (car), engine type (petrol), and engine size (1401–2000cc)
- [ ] When only one eligible project exists, no project picker is shown and the expense is linked to it automatically
- [ ] When multiple eligible projects exist, a project dropdown is shown and the selected project is used
