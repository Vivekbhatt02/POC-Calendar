import {CALENDAR_EDIT_MODE, EDIT_LOCK_REASON, FIRST_SUPPORTED_YEAR, SERVICES} from './constants';
import {
    addDays,
    buildCalendarContext,
    cycleName,
    describeEnrolmentRule,
    enrolmentWindow,
    findCycle,
    formatDay,
    formatDayWithYear,
    getEditLock,
    hasLessonsOnWeekday,
    isDayGenerated,
    lessonDaysIn,
    nextCycleToGenerate,
    weekdayIndex
} from './calendarRules';

export const COMMAND = {
    SELECT_SERVICE: 'SELECT_SERVICE',
    CHANGE_YEAR: 'CHANGE_YEAR',
    SHOW_YEAR: 'SHOW_YEAR',
    START_EDITING: 'START_EDITING',
    FINISH_EDITING: 'FINISH_EDITING',
    SET_EDIT_MODE: 'SET_EDIT_MODE',
    CLICK_DAY: 'CLICK_DAY',
    SAVE_ENROLMENT_RULE: 'SAVE_ENROLMENT_RULE',
    GENERATE_NEXT_CYCLE: 'GENERATE_NEXT_CYCLE',
    DISMISS_NOTICE: 'DISMISS_NOTICE'
};

export function createInitialState({today, schedules}) {
    return {
        today,
        year: Math.max(FIRST_SUPPORTED_YEAR, Number(today.slice(0, 4))),
        serviceKeycode: Object.keys(SERVICES)[0],
        isEditing: false,
        editMode: CALENDAR_EDIT_MODE.CYCLE_START,
        rangeAnchor: null,
        schedules,
        notice: null
    };
}

export const contextFor = (state) => buildCalendarContext({
    service: SERVICES[state.serviceKeycode],
    schedule: state.schedules[state.serviceKeycode],
    today: state.today
});

const withNotice = (state, text) => ({...state, notice: {text, id: (state.notice?.id ?? 0) + 1}});

const updateSchedule = (state, update) => ({
    ...state,
    schedules: {...state.schedules, [state.serviceKeycode]: update(state.schedules[state.serviceKeycode])}
});

const toggleFlag = (flags, key, isOn) => {
    const next = {...flags};
    if (isOn) next[key] = true; else delete next[key];
    return next;
};

const LOCK_MESSAGE = {
    [EDIT_LOCK_REASON.PAST_DAY]: () => 'This day has already passed.',
    [EDIT_LOCK_REASON.NO_LESSONS_ON_WEEKDAY]: () => 'There are no lessons on this weekday.',
    [EDIT_LOCK_REASON.DAY_GENERATED]: () => "Can't change this day: lessons are already generated for this day.",
    [EDIT_LOCK_REASON.CYCLE_GENERATED]: (lock, state) => `Can't change this day: the ${cycleName(lock.cycleStart, state.year)} already has generated days.`
};

function blockRange(state, anchor, dateKey) {
    const context = contextFor(state);
    const [from, to] = anchor.date < dateKey ? [anchor.date, dateKey] : [dateKey, anchor.date];
    const changed = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
        if (hasLessonsOnWeekday(context.service, weekdayIndex(day)) && !getEditLock(context, day, CALENDAR_EDIT_MODE.BLOCK_DAY)) changed.push(day);
    }
    const next = updateSchedule(state, (schedule) => ({
        ...schedule,
        blockedDays: changed.reduce((flags, day) => toggleFlag(flags, day, anchor.block), schedule.blockedDays)
    }));
    const verb = anchor.block ? 'blocked' : 'unblocked';
    return withNotice({...next, rangeAnchor: null}, `${changed.length} days ${verb} (${formatDay(from)} to ${formatDay(to)})`);
}

function toggleBlockedDay(state, dateKey) {
    const block = !state.schedules[state.serviceKeycode].blockedDays[dateKey];
    const next = updateSchedule(state, (schedule) => ({...schedule, blockedDays: toggleFlag(schedule.blockedDays, dateKey, block)}));
    const text = block ? `${formatDay(dateKey)} blocked. Shift-click another day to block the range.` : `${formatDay(dateKey)} unblocked`;
    return withNotice({...next, rangeAnchor: {date: dateKey, block}}, text);
}

function toggleCycleStart(state, dateKey) {
    const schedule = state.schedules[state.serviceKeycode];
    if (schedule.cycleStarts[dateKey]) {
        const {[dateKey]: removed, ...cycleStarts} = schedule.cycleStarts;
        return withNotice(updateSchedule(state, (current) => ({...current, cycleStarts})), 'Cycle start removed');
    }
    const next = updateSchedule(state, (current) => ({...current, cycleStarts: {...current.cycleStarts, [dateKey]: {...current.enrolmentStamp}}}));
    const context = contextFor(next);
    const window = enrolmentWindow(context, findCycle(context, dateKey));
    const name = cycleName(dateKey, state.year);
    const text = window.signUpsUntil >= dateKey
        ? `${name} starts ${formatDayWithYear(dateKey)}, but sign-ups close ${formatDay(window.signUpsUntil)}. Edit this cycle's enrolment dates in Month cycles.`
        : `${name} starts ${formatDayWithYear(dateKey)} · Sign-ups ${describeEnrolmentRule(schedule.enrolmentStamp)}`;
    return withNotice(next, text);
}

function clickDay(state, {date, extendRange}) {
    if (!state.isEditing) return state;
    const isBlockMode = state.editMode === CALENDAR_EDIT_MODE.BLOCK_DAY;
    if (isBlockMode && extendRange && state.rangeAnchor) return blockRange(state, state.rangeAnchor, date);
    const lock = getEditLock(contextFor(state), date, state.editMode);
    if (lock) return withNotice(state, LOCK_MESSAGE[lock.reason](lock, state));
    return isBlockMode ? toggleBlockedDay(state, date) : toggleCycleStart(state, date);
}

function generateNextCycle(state) {
    const context = contextFor(state);
    const cycle = nextCycleToGenerate(context);
    if (!cycle) return withNotice(state, 'Every cycle with an end date is already generated.');
    const days = lessonDaysIn(context, cycle).filter((day) => !isDayGenerated(context, day));
    const next = updateSchedule(state, (schedule) => ({
        ...schedule,
        generatedDays: days.reduce((flags, day) => toggleFlag(flags, day, true), schedule.generatedDays),
        generations: {...schedule.generations, [cycle.start]: formatDay(state.today)}
    }));
    return withNotice(next, `${cycleName(cycle.start, state.year)} generated: ${days.length} lesson days, ${formatDay(cycle.start)} to ${formatDay(cycle.end)}`);
}

function saveEnrolmentRule(state, {cycleStart, rule}) {
    const service = SERVICES[state.serviceKeycode];
    if (cycleStart) {
        const next = updateSchedule(state, (schedule) => ({...schedule, cycleStarts: {...schedule.cycleStarts, [cycleStart]: {...rule}}}));
        return withNotice(next, `${service.shortName} ${cycleName(cycleStart, state.year)} enrolment dates updated`);
    }
    const next = updateSchedule(state, (schedule) => ({...schedule, enrolmentStamp: {...rule}}));
    return withNotice(next, `Saved for ${service.name}. New cycle starts get these dates; existing cycles are unchanged.`);
}

export function calendarReducer(state, command) {
    switch (command.type) {
        case COMMAND.SELECT_SERVICE:
            return {...state, serviceKeycode: command.keycode, rangeAnchor: null};
        case COMMAND.CHANGE_YEAR:
            return {...state, year: Math.max(FIRST_SUPPORTED_YEAR, state.year + command.delta)};
        case COMMAND.SHOW_YEAR:
            return {...state, year: Math.max(FIRST_SUPPORTED_YEAR, command.year)};
        case COMMAND.START_EDITING:
            return {...state, isEditing: true};
        case COMMAND.FINISH_EDITING:
            return {...state, isEditing: false, rangeAnchor: null};
        case COMMAND.SET_EDIT_MODE:
            return {...state, editMode: command.mode, rangeAnchor: null};
        case COMMAND.CLICK_DAY:
            return clickDay(state, command);
        case COMMAND.SAVE_ENROLMENT_RULE:
            return saveEnrolmentRule(state, command);
        case COMMAND.GENERATE_NEXT_CYCLE:
            return generateNextCycle(state);
        case COMMAND.DISMISS_NOTICE:
            return {...state, notice: null};
        default:
            return state;
    }
}
