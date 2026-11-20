import {DEFAULT_ENROLMENT_RULE, SERVICE_KEYCODES} from './constants';
import {addDays} from './calendarRules';

const SERVICE_A_CYCLE_STARTS = ['2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'];
const SERVICE_B_CYCLE_STARTS = ['2026-07-28', '2026-09-01', '2026-10-06', '2026-11-03'];

const SERVICE_A_BLOCKED_DAYS = ['2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02', '2026-05-03', '2026-06-30', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-15', '2026-08-16', '2026-09-22', '2026-09-23', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-29'];
const SERVICE_B_BLOCKED_DAYS = ['2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];

const GENERATED_THROUGH = '2026-11-30';

const asFlags = (dates) => Object.fromEntries(dates.map((date) => [date, true]));

function daysBetween(from, to) {
    const days = [];
    for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
    return days;
}

function buildSchedule(cycleStarts, blockedDays, generations) {
    return {
        cycleStarts: Object.fromEntries(cycleStarts.map((start) => [start, {...DEFAULT_ENROLMENT_RULE}])),
        blockedDays: asFlags(blockedDays),
        generatedDays: asFlags(daysBetween(cycleStarts[0], GENERATED_THROUGH)),
        generations,
        enrolmentStamp: {...DEFAULT_ENROLMENT_RULE}
    };
}

export function buildSeedSchedules() {
    return {
        [SERVICE_KEYCODES.SERVICE_A]: buildSchedule(SERVICE_A_CYCLE_STARTS, SERVICE_A_BLOCKED_DAYS, {'2026-10-01': '23 Sep', '2026-11-01': '23 Oct'}),
        [SERVICE_KEYCODES.SERVICE_B]: buildSchedule(SERVICE_B_CYCLE_STARTS, SERVICE_B_BLOCKED_DAYS, {'2026-10-06': '23 Sep', '2026-11-03': '23 Oct'})
    };
}
