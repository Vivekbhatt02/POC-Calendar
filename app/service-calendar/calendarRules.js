import moment from 'moment';

import {
    CALENDAR_EDIT_MODE,
    CYCLE_MONTH_ROLLOVER_DAY,
    CYCLE_STATUS,
    DATE_KEY_FORMAT,
    DAYS_IN_WEEK,
    EDIT_LOCK_REASON,
    ENROLMENT_RULE_ERROR,
    ENROLMENT_STATE,
    MONTHS_IN_YEAR,
    MONTHS_SHOWN
} from './constants';

const WEEKDAY_INDEXES = Array.from({length: DAYS_IN_WEEK}, (_, index) => index);

const toMoment = (dateKey) => moment.utc(dateKey, DATE_KEY_FORMAT);
const padDay = (day) => String(day).padStart(2, '0');

const toUtcDate = (dateKey) => new Date(`${dateKey}T00:00:00Z`);

export function addDays(dateKey, days) {
    const date = toUtcDate(dateKey);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

export const weekdayIndex = (dateKey) => (toUtcDate(dateKey).getUTCDay() + 6) % DAYS_IN_WEEK;

export const dateKeyOf = (year, monthIndex, day) => moment.utc({year, month: monthIndex, day}).format(DATE_KEY_FORMAT);

export function cycleMonthOf(cycleStart) {
    const start = toMoment(cycleStart);
    const cycleMonth = start.date() > CYCLE_MONTH_ROLLOVER_DAY ? start.clone().add(1, 'month') : start;
    return {monthIndex: cycleMonth.month(), year: cycleMonth.year()};
}

export function buildCycles(schedule) {
    const starts = Object.keys(schedule.cycleStarts).sort();
    return starts.map((start, index) => ({
        start,
        end: starts[index + 1] ? addDays(starts[index + 1], -1) : null,
        index,
        previousStart: starts[index - 1] ?? null
    }));
}

export function buildCalendarContext({service, schedule, today}) {
    const cycles = buildCycles(schedule);
    const enrolmentWindows = new Map(cycles.map((cycle) => [cycle.start, enrolmentWindowFor(cycle.start, schedule.cycleStarts[cycle.start], today)]));
    return {service, schedule, today, cycles, enrolmentWindows};
}

export function findCycle(context, dateKey) {
    return context.cycles.findLast((cycle) => cycle.start <= dateKey && (!cycle.end || cycle.end >= dateKey)) ?? null;
}

const findCycleByStart = (context, start) => context.cycles.find((cycle) => cycle.start === start) ?? null;

export const hasLessonsOnWeekday = (service, weekday) => service.lessonsPerWeekday[weekday] > 0;

export function isLessonDay(context, dateKey) {
    return hasLessonsOnWeekday(context.service, weekdayIndex(dateKey)) && !context.schedule.blockedDays[dateKey];
}

export function lessonDaysIn(context, cycle, from = cycle.start, to = cycle.end) {
    const days = [];
    if (!cycle.end) return days;
    for (let day = from; day <= to; day = addDays(day, 1)) {
        if (isLessonDay(context, day)) days.push(day);
    }
    return days;
}

export function isDayGenerated(context, dateKey) {
    if (!isLessonDay(context, dateKey)) return false;
    return Boolean(context.schedule.generatedDays[dateKey]);
}

export function countGenerated(context, cycle) {
    const days = lessonDaysIn(context, cycle);
    return {total: days.length, generated: days.filter((day) => isDayGenerated(context, day)).length};
}

const hasGeneratedDays = (context, cycle) => Boolean(cycle) && lessonDaysIn(context, cycle).some((day) => isDayGenerated(context, day));

function enrolmentStateOn(today, window) {
    if (today < window.opensOn) return ENROLMENT_STATE.NOT_YET_OPEN;
    if (today <= window.cancellationsUntil) return ENROLMENT_STATE.OPEN;
    if (today <= window.signUpsUntil) return ENROLMENT_STATE.SIGN_UPS_ONLY;
    return ENROLMENT_STATE.CLOSED;
}

export function enrolmentWindowFor(cycleStart, rule, today) {
    const {monthIndex, year} = cycleMonthOf(cycleStart);
    const previousMonth = moment.utc({year, month: monthIndex, day: 1}).subtract(1, 'month');
    const dayOfPreviousMonth = (day) => `${previousMonth.format('YYYY-MM')}-${padDay(day)}`;
    const window = {
        rule,
        opensOn: dayOfPreviousMonth(rule.opensOnDay),
        cancellationsUntil: addDays(dayOfPreviousMonth(rule.cancellationsCloseOnDay), -1),
        signUpsUntil: addDays(dayOfPreviousMonth(rule.signUpsCloseOnDay), -1)
    };
    return {...window, state: enrolmentStateOn(today, window)};
}

export const enrolmentWindow = (context, cycle) => context.enrolmentWindows.get(cycle.start);

export function nextCycleToGenerate(context) {
    return context.cycles.find((cycle) => {
        if (!cycle.end) return false;
        const {total, generated} = countGenerated(context, cycle);
        return generated < total;
    }) ?? null;
}

const STATUS_BY_ENROLMENT_STATE = {
    [ENROLMENT_STATE.NOT_YET_OPEN]: CYCLE_STATUS.UPCOMING,
    [ENROLMENT_STATE.OPEN]: CYCLE_STATUS.ENROLMENT_OPEN,
    [ENROLMENT_STATE.SIGN_UPS_ONLY]: CYCLE_STATUS.SIGN_UPS_ONLY,
    [ENROLMENT_STATE.CLOSED]: CYCLE_STATUS.READY_TO_GENERATE
};

export function cycleStatus(context, cycle) {
    if (!cycle.end) return CYCLE_STATUS.NEEDS_NEXT_CYCLE_START;
    const {total, generated} = countGenerated(context, cycle);
    if (total && generated === total) return CYCLE_STATUS.GENERATED;
    if (generated > 0) return CYCLE_STATUS.PARTLY_GENERATED;
    if (cycle.start <= context.today) return CYCLE_STATUS.NOT_GENERATED;
    if (nextCycleToGenerate(context)?.start !== cycle.start) return CYCLE_STATUS.UPCOMING;
    return STATUS_BY_ENROLMENT_STATE[enrolmentWindow(context, cycle).state];
}

export function weekdayBreakdown(context, cycle) {
    const counts = WEEKDAY_INDEXES.map((weekday) => ({
        weekday,
        hasLessons: hasLessonsOnWeekday(context.service, weekday),
        lessonCount: 0,
        blockedCount: 0
    }));
    if (!cycle.end) return counts;
    for (let day = cycle.start; day <= cycle.end; day = addDays(day, 1)) {
        const count = counts[weekdayIndex(day)];
        if (!count.hasLessons) continue;
        if (context.schedule.blockedDays[day]) count.blockedCount += 1;
        else count.lessonCount += 1;
    }
    return counts;
}

export function enrolmentMarkerOn(context, dateKey) {
    for (const cycle of context.cycles) {
        const window = enrolmentWindow(context, cycle);
        if (dateKey >= window.opensOn && dateKey <= window.signUpsUntil) {
            return {cycleStart: cycle.start, cancellationsOpen: dateKey <= window.cancellationsUntil};
        }
    }
    return null;
}

export function buildDayCell(context, dateKey) {
    const {schedule, today} = context;
    const cycle = findCycle(context, dateKey);
    const hasLessons = hasLessonsOnWeekday(context.service, weekdayIndex(dateKey));
    return {
        date: dateKey,
        dayOfMonth: Number(dateKey.slice(8, 10)),
        hasLessons,
        cycleStart: cycle?.start ?? null,
        isInCycle: Boolean(cycle) && hasLessons,
        isBlocked: hasLessons && Boolean(schedule.blockedDays[dateKey]),
        isCycleStart: Boolean(schedule.cycleStarts[dateKey]),
        isGenerated: isDayGenerated(context, dateKey),
        isPast: dateKey < today,
        isToday: dateKey === today,
        enrolmentMarker: enrolmentMarkerOn(context, dateKey)
    };
}

export function buildYearMonths(context, year) {
    return Array.from({length: MONTHS_SHOWN}, (_, offset) => {
        const first = moment.utc({year, month: 0, day: 1}).add(offset, 'months');
        const firstKey = first.format(DATE_KEY_FORMAT);
        return {
            key: first.format('YYYY-MM'),
            monthIndex: first.month(),
            year: first.year(),
            isNextYear: offset >= MONTHS_IN_YEAR,
            leadingBlankCount: weekdayIndex(firstKey),
            days: Array.from({length: first.daysInMonth()}, (_, index) => buildDayCell(context, addDays(firstKey, index)))
        };
    });
}

export function cycleRowsForYear(context, year) {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    return context.cycles
        .filter((cycle) => cycle.start <= yearEnd && (!cycle.end || cycle.end >= yearStart))
        .map((cycle) => ({
            cycle,
            status: cycleStatus(context, cycle),
            generatedCount: cycle.end ? countGenerated(context, cycle) : null,
            generatedAt: context.schedule.generations[cycle.start] ?? null,
            enrolment: enrolmentWindow(context, cycle),
            weekdays: weekdayBreakdown(context, cycle),
            isCurrent: cycle.start <= context.today && (!cycle.end || cycle.end >= context.today),
            isPast: Boolean(cycle.end && cycle.end < context.today),
            startsBeforeYear: cycle.start < yearStart,
            continuesIntoNextYear: Boolean(cycle.end && cycle.end > yearEnd)
        }));
}

export function canEditCycleEnrolment(context, cycle) {
    return !hasGeneratedDays(context, cycle) && context.today < enrolmentWindow(context, cycle).opensOn;
}

export function getEditLock(context, dateKey, mode) {
    if (dateKey <= context.today) return {reason: EDIT_LOCK_REASON.PAST_DAY};
    if (mode === CALENDAR_EDIT_MODE.BLOCK_DAY) {
        if (!hasLessonsOnWeekday(context.service, weekdayIndex(dateKey))) return {reason: EDIT_LOCK_REASON.NO_LESSONS_ON_WEEKDAY};
        return isDayGenerated(context, dateKey) ? {reason: EDIT_LOCK_REASON.DAY_GENERATED} : null;
    }
    const cycle = findCycle(context, dateKey);
    if (!context.schedule.cycleStarts[dateKey]) {
        const movesGeneratedDays = Boolean(cycle) && Object.keys(context.schedule.generatedDays)
            .some((day) => day >= dateKey && (!cycle.end || day <= cycle.end) && isDayGenerated(context, day));
        return movesGeneratedDays ? {reason: EDIT_LOCK_REASON.CYCLE_GENERATED, cycleStart: cycle.start} : null;
    }
    if (hasGeneratedDays(context, cycle)) return {reason: EDIT_LOCK_REASON.CYCLE_GENERATED, cycleStart: cycle.start};
    const previous = cycle?.previousStart ? findCycleByStart(context, cycle.previousStart) : null;
    if (hasGeneratedDays(context, previous)) return {reason: EDIT_LOCK_REASON.CYCLE_GENERATED, cycleStart: previous.start};
    return null;
}

export function validateEnrolmentRule(rule, cycleStart = null) {
    if (rule.opensOnDay >= rule.cancellationsCloseOnDay) return ENROLMENT_RULE_ERROR.CANCEL_BEFORE_OPEN;
    if (rule.cancellationsCloseOnDay > rule.signUpsCloseOnDay) return ENROLMENT_RULE_ERROR.CANCEL_AFTER_SIGN_UPS_CLOSE;
    if (cycleStart && enrolmentWindowFor(cycleStart, rule, cycleStart).signUpsUntil >= cycleStart) {
        return ENROLMENT_RULE_ERROR.SIGN_UPS_CLOSE_AFTER_START;
    }
    return null;
}

export const formatDay = (dateKey) => toMoment(dateKey).format('D MMM');
export const formatDayWithYear = (dateKey) => toMoment(dateKey).format('D MMM YYYY');
export const ordinal = (day) => moment.localeData().ordinal(day);

export function cycleName(cycleStart, displayedYear) {
    const {monthIndex, year} = cycleMonthOf(cycleStart);
    const month = moment.utc({year, month: monthIndex, day: 1}).format('MMMM');
    return year === displayedYear ? `${month} cycle` : `${month} ${year} cycle`;
}

export function describeEnrolmentRule(rule) {
    return `${ordinal(rule.opensOnDay)}–${ordinal(rule.signUpsCloseOnDay - 1)} · cancel by ${ordinal(rule.cancellationsCloseOnDay - 1)}`;
}
