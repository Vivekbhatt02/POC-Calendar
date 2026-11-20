import {describe, expect, it} from 'vitest';

import {CALENDAR_EDIT_MODE, CYCLE_STATUS, EDIT_LOCK_REASON, ENROLMENT_RULE_ERROR, SERVICES} from './constants';
import {buildSeedSchedules} from './seedData';
import {buildCalendarContext, buildYearMonths, cycleName, cycleRowsForYear, getEditLock, nextCycleToGenerate, validateEnrolmentRule} from './calendarRules';
import {calendarReducer, COMMAND, createInitialState} from './calendarReducer';

const MOCKUP_TODAY = '2026-11-05';
const abcContext = (today = MOCKUP_TODAY) => buildCalendarContext({service: SERVICES.ABCO, schedule: buildSeedSchedules().ABCO, today});
const rowFor = (rows, start) => rows.find((row) => row.cycle.start === start);

describe('month cycles panel', () => {
    const rows = cycleRowsForYear(abcContext(), 2026);

    it('lists the 2026 cycles, with November left open until December gets a cycle start', () => {
        expect(rows.map((row) => row.cycle.start)).toEqual(['2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01']);
        expect(rowFor(rows, '2026-11-01').cycle.end).toBeNull();
    });

    it('shows October as generated and November as waiting for the next cycle start', () => {
        expect(rowFor(rows, '2026-10-01').status).toBe(CYCLE_STATUS.GENERATED);
        expect(rowFor(rows, '2026-11-01').status).toBe(CYCLE_STATUS.NEEDS_NEXT_CYCLE_START);
        expect(rowFor(rows, '2026-11-01').isCurrent).toBe(true);
    });

    it('counts lessons per weekday and flags weekdays reduced by blocked days', () => {
        const thursday = rowFor(rows, '2026-10-01').weekdays[3];
        expect(thursday).toMatchObject({lessonCount: 4, blockedCount: 1});
        expect(rowFor(rows, '2026-10-01').weekdays[0].hasLessons).toBe(false);
    });

    it('names a cycle with its year only when it belongs to another year', () => {
        expect(cycleName('2026-12-28', 2026)).toBe('January 2027 cycle');
        expect(cycleName('2026-04-01', 2026)).toBe('April cycle');
    });
});

describe('year grid', () => {
    const months = buildYearMonths(abcContext(), 2026);

    it('shows thirteen months, ending with January of the next year', () => {
        expect(months).toHaveLength(13);
        expect(months[12]).toMatchObject({monthIndex: 0, year: 2027, isNextYear: true});
    });

    it('derives each day state from the schedule', () => {
        const november = months[10].days;
        expect(november[0]).toMatchObject({isCycleStart: true, isGenerated: true});
        expect(november[28]).toMatchObject({isBlocked: true, isGenerated: false});
        expect(november[1]).toMatchObject({hasLessons: false, isInCycle: false});
        expect(november[4]).toMatchObject({isToday: true});
        expect(months[11].days[0]).toMatchObject({isCycleStart: false, isInCycle: true, isGenerated: false});
    });
});

describe('edit locks', () => {
    it('locks past days, generated days, and weekdays without lessons', () => {
        const context = abcContext();
        expect(getEditLock(context, '2026-11-01', CALENDAR_EDIT_MODE.BLOCK_DAY).reason).toBe(EDIT_LOCK_REASON.PAST_DAY);
        expect(getEditLock(context, '2026-11-20', CALENDAR_EDIT_MODE.BLOCK_DAY).reason).toBe(EDIT_LOCK_REASON.DAY_GENERATED);
        expect(getEditLock(context, '2026-12-07', CALENDAR_EDIT_MODE.BLOCK_DAY).reason).toBe(EDIT_LOCK_REASON.NO_LESSONS_ON_WEEKDAY);
        expect(getEditLock(context, '2026-11-20', CALENDAR_EDIT_MODE.CYCLE_START).reason).toBe(EDIT_LOCK_REASON.CYCLE_GENERATED);
        expect(getEditLock(context, '2026-12-08', CALENDAR_EDIT_MODE.BLOCK_DAY)).toBeNull();
    });

    it('allows a cycle start that leaves every generated day in the earlier cycle', () => {
        expect(getEditLock(abcContext(), '2026-12-01', CALENDAR_EDIT_MODE.CYCLE_START)).toBeNull();
    });

    it('rejects enrolment dates that close sign-ups after the cycle starts', () => {
        expect(validateEnrolmentRule({opensOnDay: 1, cancellationsCloseOnDay: 16, signUpsCloseOnDay: 21})).toBeNull();
        expect(validateEnrolmentRule({opensOnDay: 16, cancellationsCloseOnDay: 16, signUpsCloseOnDay: 21})).toBe(ENROLMENT_RULE_ERROR.CANCEL_BEFORE_OPEN);
        expect(validateEnrolmentRule({opensOnDay: 1, cancellationsCloseOnDay: 22, signUpsCloseOnDay: 21})).toBe(ENROLMENT_RULE_ERROR.CANCEL_AFTER_SIGN_UPS_CLOSE);
        expect(validateEnrolmentRule({opensOnDay: 1, cancellationsCloseOnDay: 16, signUpsCloseOnDay: 21}, '2027-03-16')).toBe(ENROLMENT_RULE_ERROR.SIGN_UPS_CLOSE_AFTER_START);
    });
});

describe('editing commands', () => {
    const editing = () => calendarReducer(createInitialState({today: MOCKUP_TODAY, schedules: buildSeedSchedules()}), {type: COMMAND.START_EDITING});
    const blockMode = () => calendarReducer(editing(), {type: COMMAND.SET_EDIT_MODE, mode: CALENDAR_EDIT_MODE.BLOCK_DAY});

    it('ignores clicks outside edit mode', () => {
        const state = createInitialState({today: MOCKUP_TODAY, schedules: buildSeedSchedules()});
        expect(calendarReducer(state, {type: COMMAND.CLICK_DAY, date: '2026-12-08'})).toBe(state);
    });

    it('blocks a day, then shift-click blocks the lesson days in between', () => {
        const first = calendarReducer(blockMode(), {type: COMMAND.CLICK_DAY, date: '2026-12-08'});
        expect(first.schedules.ABCO.blockedDays['2026-12-08']).toBe(true);
        const ranged = calendarReducer(first, {type: COMMAND.CLICK_DAY, date: '2026-12-15', extendRange: true});
        expect(['2026-12-09', '2026-12-13', '2026-12-15'].every((day) => ranged.schedules.ABCO.blockedDays[day])).toBe(true);
        expect(ranged.schedules.ABCO.blockedDays['2026-12-14']).toBeUndefined();
        expect(ranged.notice.text).toBe('7 days blocked (8 Dec to 15 Dec)');
    });

    it('adds a cycle start stamped with the current enrolment dates and splits the cycle', () => {
        const state = calendarReducer(editing(), {type: COMMAND.CLICK_DAY, date: '2027-03-16'});
        expect(state.schedules.ABCO.cycleStarts['2027-03-16']).toEqual(state.schedules.ABCO.enrolmentStamp);
        expect(state.notice.text).toContain("but sign-ups close");
    });

    it('sets the December and January cycle starts, then generates December with one command', () => {
        const withDecemberOnly = calendarReducer(editing(), {type: COMMAND.CLICK_DAY, date: '2026-12-01'});
        expect(nextCycleToGenerate(buildCalendarContext({service: SERVICES.ABCO, schedule: withDecemberOnly.schedules.ABCO, today: MOCKUP_TODAY}))).toBeNull();
        const withDecember = calendarReducer(withDecemberOnly, {type: COMMAND.CLICK_DAY, date: '2027-01-01'});
        const context = buildCalendarContext({service: SERVICES.ABCO, schedule: withDecember.schedules.ABCO, today: MOCKUP_TODAY});
        const december = rowFor(cycleRowsForYear(context, 2026), '2026-12-01');
        expect(december.status).toBe(CYCLE_STATUS.ENROLMENT_OPEN);
        expect([december.enrolment.opensOn, december.enrolment.signUpsUntil, december.enrolment.cancellationsUntil]).toEqual(['2026-11-01', '2026-11-20', '2026-11-15']);
        expect(rowFor(cycleRowsForYear(context, 2026), '2026-11-01').status).toBe(CYCLE_STATUS.GENERATED);

        const generated = calendarReducer(calendarReducer(withDecember, {type: COMMAND.FINISH_EDITING}), {type: COMMAND.GENERATE_NEXT_CYCLE});
        const after = buildCalendarContext({service: SERVICES.ABCO, schedule: generated.schedules.ABCO, today: MOCKUP_TODAY});
        const row = rowFor(cycleRowsForYear(after, 2026), '2026-12-01');
        expect(row.status).toBe(CYCLE_STATUS.GENERATED);
        expect(row.generatedAt).toBe('5 Nov');
        expect(generated.notice.text).toMatch(/^December cycle generated: \d+ lesson days, 1 Dec to 31 Dec$/);
        expect(buildYearMonths(after, 2026)[11].days[1].isGenerated).toBe(true);
    });

    it('explains why a locked day cannot change', () => {
        const state = calendarReducer(editing(), {type: COMMAND.CLICK_DAY, date: '2026-11-03'});
        expect(state.notice.text).toBe('This day has already passed.');
        expect(state.schedules).toEqual(editing().schedules);
    });
});
