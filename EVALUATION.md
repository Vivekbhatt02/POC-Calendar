# Calendar library evaluation

Use MUI X DateCalendar for the Service Calendar in the calendar mockup. It and react-big-calendar both render the screen and pass the same checks on React 18.3.1. MUI X needs no workarounds, adds no packages to the main app, and had no unexplained misses. The rest of this document gives the evidence.

All facts were gathered on 2026-11-20. To reproduce the checks, see [README.md](README.md).

## How the libraries were compared

The shortlist was MUI X DateCalendar, react-big-calendar, react-calendar-timeline, and FullCalendar. Each rendered the Service Calendar from the same rules, seed data, toolbar, and side panel. Only the year grid changed, one file per library in `app/service-calendar/grids/`. `scripts/verify-service-calendar.mjs` ran the same checks against each.

Two libraries were dropped after the first round, and their code has been removed:

- **react-calendar-timeline** is a Gantt-style timeline with rows on a time axis. Months became rows on a 1 to 31 axis, so the weekday columns of the mockup cannot be drawn. npm's `latest` tag points to a beta.
- **FullCalendar** rendered the screen, but every month title shows the year, and the "Continues into 2027" divider cannot be added. Its year switch was the slowest, at 378 to 415 ms against 137 to 194 ms for the two finalists.

## Results on React 18.3.1

The POC is a plain Vite app on React 18.3.1, matching the main app. The page reports `React.version`, and the verify script fails unless it is 18.3.1. The numbers come from dev-mode runs under `StrictMode`: 7 runs of MUI X and 14 of react-big-calendar.

| | MUI X DateCalendar 9.18 | react-big-calendar 1.20 |
| --- | --- | --- |
| Checks passed | 23 of 23 in all 7 runs | 23 of 23 in 11 of 14 runs. See the note below |
| Click to paint, median per run | 70 to 76 ms | 67 to 84 ms |
| Year switch, including automation, two runs | 136 and 156 ms | 200 and 214 ms |
| Library chunk, gzipped | 58 KB | 74 KB, including luxon for the Monday-first localizer |
| Console warnings, React 18 | None | None |
| Console warnings, React 19 | None | "outdated JSX transform", because its build calls `React.createElement` directly |

The click timings measure the whole page re-rendering, including the side panel, so they do not separate the libraries.

In 3 of 14 react-big-calendar runs, one of the 12 timed clicks showed no DOM change within 3 seconds. The day still toggled, and the run's final-state check passed. The missed click was a different one each time. I have not found the cause, so treat it as unexplained. It did not happen in any MUI X run.

## Findings per library

**MUI X DateCalendar.**

- The `day` slot receives each date and renders any React content, so Shift-click comes from our own `onClick`.
- Setting the `calendarHeader` slot to `null` removes the picker header. `YearLayout.jsx` draws the month titles and the "Continues into 2027" divider.
- Monday-first weeks need a moment locale with `dow: 1`, defined in `grids/mondayLocale.js`. Importing `moment/locale/en-gb` did not work, because Vite's pre-bundled moment is a different instance.
- The main app already depends on `@mui/x-date-pickers` 9.16, `@mui/material` 9, and moment, so the screen adds no new packages there.
- Because our cell replaces `PickerDay`, the picker's keyboard navigation does not apply. We must add our own.

**react-big-calendar.**

- It has no year view, so the POC draws 13 month views.
- `dayPropGetter` sets only a class and a style. The day content goes in through `dateCellWrapper`, by cloning its child element.
- Clicks reach the cells only after the date-header row gets `pointer-events: none`.
- The moment localizer reads `culture` for the weekday labels but uses moment's global locale for the grid, so weeks stayed Sunday-first. `luxonLocalizer(DateTime, {firstDayOfWeek: 1})` fixed it, and adds luxon to the bundle.
- Its stylesheet is unlayered, so it beat Tailwind v4's layered utilities and removed the cycle-start edge until `serviceCalendar.css` overrode its borders.
- It supports week and day views with timed events, which MUI X DateCalendar cannot.

## Recommendation

Build the Service Calendar on MUI X DateCalendar, and keep `calendarRules.js`, `calendarReducer.js`, and `seedData.js` unchanged. Choose react-big-calendar only if this screen will later need timed events.
