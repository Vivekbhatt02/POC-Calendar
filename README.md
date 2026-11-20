# Calendar library POC

The app is a plain Vite app on React 18.3.1, the same React version as BackOffice. `index.html` loads `app/main.jsx`, which reads `?lib=` and `?today=` and renders `ServiceCalendarPage`.

This POC rebuilds the Service Calendar screen from `Subscriptions_Mockup_v8.html#cal` on the two finalist libraries, MUI X DateCalendar and react-big-calendar. The findings are in [EVALUATION.md](EVALUATION.md).

The code lives in `app/service-calendar/`:

- `calendarRules.js` derives cycles, statuses, enrolment windows, edit locks, and day cells from a schedule. It has no UI code.
- `calendarReducer.js` applies edit commands and returns the notice text.
- `seedData.js` holds the ABC Online and CFK Online schedules copied from the mockup.
- `ServiceCalendarPage.jsx` renders the page. The year grid comes from `grids/`, one file per library, picked by `?lib=`. `DayCell.jsx` holds the day classes and content that every grid shares.
- `MonthCyclesPanel.jsx`, `EnrolmentDialog.jsx`, and `CalendarLegend.jsx` render the side panel, the enrolment dialog, and the legend.

## MUI X DateCalendar compared with react-big-calendar

Both libraries render the same screen from the same rules and pass the same checks on React 18.3.1. They differ in how much work it takes to get there, and in what they can grow into. The measurements and run details are in [EVALUATION.md](EVALUATION.md).

| | MUI X DateCalendar 9.18 | react-big-calendar 1.20 |
| --- | --- | --- |
| Built for | Small month grids, as used in date pickers | Event calendars with month, week, and day views |
| Year of 13 months | 13 `DateCalendar` instances | 13 month views. There is no year view |
| Custom day cell | The `day` slot renders our cell. This is a documented extension point | `dateCellWrapper` clones the library's internal cell element and replaces its content |
| Click and Shift-click | Our own `onClick` on the cell | Works only after the date-header row gets `pointer-events: none` |
| Monday-first weeks | A moment locale with `dow: 1`, in `grids/mondayLocale.js` | The moment localizer ignored the locale for the grid, so it uses `luxonLocalizer` with `firstDayOfWeek: 1` |
| Styling | `sx` objects. No conflicts with our classes | Its unlayered stylesheet overrode Tailwind classes. `serviceCalendar.css` overrides its borders |
| Month titles and divider | Our own, drawn by `YearLayout.jsx` | Our own, drawn by `YearLayout.jsx` |
| Library chunk, gzipped | 58 KB | 74 KB, including luxon |
| New packages in BackOffice | None. BackOffice already uses MUI 9, `@mui/x-date-pickers`, and moment | `react-big-calendar` and its dependencies, including lodash, luxon, and globalize |
| Checks on React 18.3.1 | 23 of 23 in all 7 runs | 23 of 23 in 11 of 14 runs. In 3 runs, one timed click showed no DOM change within 3 seconds, although the day still toggled. Cause not found |
| Console warnings | None | On React 19, "outdated JSX transform", because its build calls `React.createElement` directly |
| Keyboard navigation | Lost. Our cells replace `PickerDay`, so we must add our own | Not tested |
| Timed events later | Not possible. It only picks dates | Possible, with week and day views |

Recommendation: use MUI X DateCalendar. It needs no workarounds, adds no packages to BackOffice, and had no unexplained misses. Choose react-big-calendar only if this screen will later need timed events.

## Run the POC

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Library buttons above the grid switch between MUI X DateCalendar and react-big-calendar. You can also add `?lib=mui-x` or `?lib=big-calendar` to the URL. Today is the current date in IST (`Asia/Kolkata`). To pretend it is another day, add `?today=YYYY-MM-DD`, as in http://localhost:5173/?today=2026-11-05, the mockup's demo date. `npm run verify` uses that date so its checks do not change from day to day.

Click **Edit calendar** to set cycle starts or block days. In **Block day** mode, Shift-click a second day to block the range in between.

The sample data in `seedData.js` ends with the November cycle, and everything up to 30 Nov is generated. December starts blank. To build and generate it, click **Edit calendar**, choose **Set cycle start**, and click 1 Dec and then 1 Jan. A cycle ends the day before the next cycle start, so it needs both clicks. Click **Done**, then **Generate December cycle**. Generation is recorded per day in `generatedDays`, and the cycle is stamped with today's date in `generations`. The Generate button only acts on the selected service, and it does not wait for enrolment to close.

## Run the checks

```bash
npm test
npm run verify
```

- `npm test` runs the rule tests. It needs no server.
- `npm run verify` needs `npm run dev` running. It fails if the page is not running on React 18.3.1. It tests MUI X by default. To test another library, set `LIB`, as in `LIB=big-calendar npm run verify`. It also prints `TIMING` lines for click to paint and year switch. It drives Chrome through `playwright-core`, prints one `PASS` or `FAIL` line per check, and exits with code 1 if any check fails. Screenshots go to `verify-shots/`. To use a different Chrome binary, set `CHROME_PATH`.

The first page load after `npm install` can fail once while Vite rebuilds its dependency cache. Reload the page or rerun the check.

`npm run build` writes a production build to `dist/`.
