# Spec: Office Trip Logging

**Status:** Draft  
**Last updated:** 2026-06-15

---

## 1. Overview

Allow logging of office visits ("trips") against a project from the calendar month view. A trip covers one or more consecutive days and has a time-of-day granularity for its start and end (morning, mid-day, or evening). Each trip is stored as a single FreeAgent Note on the relevant project. Trips render as a narrow horizontal bar just above the day number row, spanning the days they cover.

---

## 2. Data model

### Trip object
```ts
interface OfficeTrip {
  startDate: string;    // YYYY-MM-DD
  startTime: 'morning' | 'midday' | 'evening';
  endDate: string;      // YYYY-MM-DD
  endTime: 'morning' | 'midday' | 'evening';
  description?: string;
}
```

### Note format
Each trip is stored as a single FreeAgent Note on the project. The note body uses a typed prefix line followed by `Key: value` fields, one per line:

```
fatt:trip
Start: 2026-06-10 morning
End: 2026-06-12 evening
Description: Visit office
```

`Description` is optional. Notes without it are valid.

The prefix `fatt:<type>` namespaces all fatt-written notes and allows future data types (e.g. `fatt:goal`, `fatt:budget`) to coexist in the same project's notes without collision. Each future type defines its own set of `Key: value` fields.

Parsing: check the first line equals `fatt:trip`; parse remaining lines by splitting on `": "` to get key/value pairs. Ignore notes whose first line does not start with `fatt:`.

No changes to `FattSettings` are required. Trips are discovered at read time by listing `GET /v2/notes?project=<url>` and filtering for the `fatt:trip` prefix.

### Storage operations
- **Create**: `POST /v2/notes` with `{ note: { project: projectUrl, note: "fatt:trip\nStart: ...\nEnd: ..." } }`
- **Read**: `GET /v2/notes?project=<url>` (paginated), filter for `fatt:trip` first line, parse `Key: value` fields
- **Delete** (future): `DELETE /v2/notes/:id`

---

## 3. User-facing behaviour

### Entry point
- Right-clicking any day opens the existing context menu.
- A new **"Log office trip…"** item appears at the bottom of the context menu (below "Log travel expense…").

### Create trip dialog

Fields:

| Field      | Notes |
|------------|-------|
| Project    | Hidden if only one eligible project (auto-selected); dropdown otherwise. Same eligibility rules as mileage/travel: active projects with at least one billable task. |
| Start date | Pre-filled from the right-clicked day. Date input. |
| Start time | Select: **Morning** / **Mid-day** / **Evening**. Default: Morning. |
| End date   | Pre-filled same as start date. Date input. |
| End time   | Select: **Morning** / **Mid-day** / **Evening**. Default: Evening. |
| Description | Optional free-text. Brief label for the trip (e.g. "Visit office", "Client site — Leeds"). |

- End date must be ≥ start date. Validate on submit.
- Submitting saves the trip and closes the dialog.

### Time-of-day to horizontal position

| Value   | Bar offset from left edge of day cell |
|---------|---------------------------------------|
| Morning | 20% |
| Mid-day | 50% |
| Evening | 80% |

---

## 4. Rendering

### Bar placement
A trip bar renders in a dedicated strip immediately above `dayBlockTop` in each day cell. The strip has a fixed height (e.g. 6px) and is part of the day cell's layout (not absolutely positioned over the calendar).

### Single-week trip
The bar spans from the start-time offset of the start day to the end-time offset of the end day, rendered as a single continuous element using CSS (e.g. a positioned element inside a row-level container, or via a per-cell approach with overflow).

### Week-spanning trips (split rendering)
When a trip crosses a row boundary (Sunday → Monday), it is split into one segment per calendar row:
- **First segment**: starts at the start-time offset of the start day, runs to the right edge of the last day of that row (Sunday). Right end is **square** (indicating the trip continues).
- **Intermediate segments** (if any): full-width bar from left edge of Monday to right edge of Sunday. Both ends **square**.
- **Last segment**: starts at the left edge of Monday, ends at the end-time offset of the end day. Left end is **square** (indicating continuation from previous row).

Trip **start** and **end** terminations use **rounded** ends; continuation edges (mid-trip row boundaries) use **square** ends. This lets the user visually distinguish "trip starts/ends here" from "trip wraps to next row."

### Overlapping trips
When multiple trips cover the same day, their bars stack vertically within the trip strip. Ordering (top to bottom):
1. Trip with the earliest `startDate` is on top.
2. If `startDate` is equal, the trip with the latest `endDate` is lower.

The strip height expands to accommodate stacked bars (e.g. each bar is 6px with 2px gap).

### Bar colour
A single accent colour for all trips (e.g. a teal/blue distinct from timeslip colours). No per-project colour differentiation in v1.

---

## 5. Edge cases

1. **Same-day trip**: Start and end offsets may be equal or start > end (e.g. evening → morning). Treat as valid; render a minimal-width bar (or enforce end ≥ start time within a day as a soft warning).
2. **Edit / delete**: Out of scope for v1.
3. **Note creation failure**: Surface an error toast if the FreeAgent Note cannot be created.
4. **No eligible projects**: Disable "Log office trip…" menu item (or hide it) if there are no active projects with billable tasks.
5. **Unrecognised notes**: Notes on a project that do not start with `fatt:` are silently ignored during trip loading.

---

## 6. Technical approach

### New / changed files

| File | Change |
|------|--------|
| `src/freeagent.ts` | Add `freeagentPost` call for notes; `FreeagentNote` interface already exists; add `project` field to it |
| `src/app/actions.ts` | Add `getOfficeTrips(projectUrl)`, `createOfficeTrip(projectUrl, trip)` server actions |
| `src/app/app/month/[month]/office-trip-dialog.tsx` | New client component — the create dialog |
| `src/app/app/month/[month]/date.tsx` | Add `officeTrips` prop to `TimeslipDate`; render trip strip; add context menu item |
| `src/app/app/month/[month]/page.tsx` | Load trips for all eligible projects; pass per-day to `TimeslipDate` |
| `src/app/app/month/[month]/page.module.css` | Add trip strip and bar styles |

### Server actions

```ts
// List all trips for a project: GET /v2/notes?project=<url>, filter fatt:trip prefix, parse payload
export async function getOfficeTrips(projectUrl: string): Promise<OfficeTrip[]>

// Create a single trip: POST /v2/notes with fatt:trip prefix body
export async function createOfficeTrip(projectUrl: string, trip: OfficeTrip): Promise<void>
```

`createOfficeTrip` calls `revalidatePath('/', 'layout')` after writing.

### Loading trips on page render
`page.tsx` calls `getOfficeTrips` for each eligible project. Trips are flattened and passed to each `TimeslipDate` filtered by date overlap with that day.

### Bar rendering approach
Each day cell renders a `<div className={styles.tripStrip}>` above `dayBlockTop`. Per-day, each trip that intersects that day is rendered as a `<div className={styles.tripBar}>` inside the strip, positioned with inline `left` / `right` / `width` style values derived from the time-of-day offsets and segment boundary rules (rounded vs square border-radius per end).

---

## 7. Manual test checklist

- [ ] "Log office trip…" appears in the context menu
- [ ] Clicking it opens the dialog with start/end dates pre-filled to the right-clicked day
- [ ] Project picker hidden when one eligible project; shown as dropdown when multiple
- [ ] Submitting creates a trip visible as a bar in the calendar
- [ ] Bar starts at 20% / 50% / 80% from left edge for morning / mid-day / evening
- [ ] Bar ends at 20% / 50% / 80% from left edge for morning / mid-day / evening
- [ ] Single-day trip renders correctly
- [ ] Multi-day same-week trip spans contiguously across days
- [ ] Week-spanning trip splits into segments per row; split edges are square, start/end edges are rounded
- [ ] Two overlapping trips stack vertically; earlier-starting trip is on top
- [ ] Reloading the page preserves trips
- [ ] Each trip creates a separate Note on the project in FreeAgent
- [ ] Note body starts with `fatt:trip` prefix followed by JSON on the next line
- [ ] Non-fatt notes on the project are not affected or parsed
