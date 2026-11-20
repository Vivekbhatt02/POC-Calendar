import {Suspense, useCallback, useEffect, useMemo, useReducer, useState} from 'react';
import './serviceCalendar.css';

import {CALENDAR_EDIT_MODE, SERVICES} from './constants';
import {buildYearMonths, cycleName, describeEnrolmentRule, nextCycleToGenerate} from './calendarRules';
import {calendarReducer, COMMAND, contextFor, createInitialState} from './calendarReducer';
import {buildSeedSchedules} from './seedData';
import MonthCyclesPanel from './MonthCyclesPanel';
import EnrolmentDialog from './EnrolmentDialog';
import CalendarLegend from './CalendarLegend';
import ServiceIcon from './ServiceIcon';
import {GRID_LIBRARIES} from './grids';

const NOTICE_DURATION_MS = 3000;

const styles = {
    page: 'min-h-screen bg-[#F1F2F4] p-6 text-[#1D1E1C]',
    toolbarCard: 'mb-4 rounded-[10px] bg-white px-4 py-2.5 shadow-sm',
    toolbarRow: 'grid grid-cols-[1fr_auto_1fr] items-center gap-2.5',
    tabs: 'flex h-[34px] items-stretch gap-0.5',
    tab: 'inline-flex items-center gap-1.5 border-b-2 px-2 text-[13.5px] font-semibold whitespace-nowrap',
    tabActive: 'border-[#1A5EA5] text-[#1D1E1C]',
    tabIdle: 'border-transparent text-[#6B7280] hover:text-[#1D1E1C]',
    stepper: 'inline-flex h-[34px] items-center gap-0.5 rounded-md border border-[#C4C7CC] bg-white px-0.5',
    stepperButton: 'grid h-7 w-6 place-items-center rounded text-[#3B4049] hover:bg-[#E9F1F8] disabled:opacity-30',
    stepperYear: 'min-w-[52px] text-center text-[15px] font-semibold',
    actions: 'flex justify-end gap-2',
    editButton: 'inline-flex h-[34px] items-center gap-2 rounded-md border border-[#C4C7CC] bg-white px-3.5 text-[13px] font-semibold hover:bg-[#E9F1F8]',
    primaryButton: 'inline-flex h-[34px] items-center rounded-md bg-[#1A5EA5] px-5 text-[13px] font-semibold text-white hover:bg-[#134677]',
    editRow: '-mx-4 -mb-2.5 mt-2.5 flex flex-wrap items-center gap-2.5 rounded-b-[10px] border-t border-[#ECEDF0] bg-[#F7FAFD] px-4 py-2.5',
    editLabel: 'text-xs font-semibold text-[#6B7280]',
    modeGroup: 'inline-flex h-[34px] overflow-hidden rounded-md border border-[#C4C7CC] bg-white',
    modeButton: 'px-3 text-[13px] font-medium text-[#3B4049] [&+&]:border-l [&+&]:border-[#C4C7CC]',
    modeButtonActive: 'bg-[#E9F1F8] font-semibold text-[#134677]',
    stamp: 'inline-flex h-[34px] items-center overflow-hidden rounded-md border border-[#C4C7CC] bg-white whitespace-nowrap',
    stampLabel: 'pl-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#8A8F98]',
    stampValue: 'px-2 text-[13px] font-medium',
    stampEdit: 'h-full border-l border-[#C4C7CC] px-3 text-[13px] font-semibold text-[#1A5EA5] hover:bg-[#E9F1F8]',
    layout: 'grid grid-cols-[minmax(0,1fr)_380px] items-start gap-4',
    calendarCard: 'service-year rounded-[10px] bg-white p-[18px] shadow-sm',
    librarySwitch: 'mb-3 flex flex-wrap items-center gap-2 text-xs',
    libraryLabel: 'font-semibold uppercase tracking-wider text-[#8A8F98]',
    libraryLink: 'rounded-md border border-[#C4C7CC] bg-white px-2.5 py-1 font-semibold text-[#3B4049] hover:bg-[#E9F1F8]',
    libraryLinkActive: 'border-[#1A5EA5] bg-[#E9F1F8] text-[#134677]',
    gridFallback: 'py-24 text-center text-sm text-[#8A8F98]',
    notice: 'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#1D1E1C] px-4 py-2.5 text-[13px] text-white shadow-xl'
};

function libraryHref(library) {
    const params = new URLSearchParams(location.search);
    params.set('lib', library);
    return `?${params}`;
}

const CHEVRON_LEFT = 'M15 6l-6 6 6 6';
const CHEVRON_RIGHT = 'M9 6l6 6-6 6';

function Chevron({path}) {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>;
}

export default function ServiceCalendarPage({today, library}) {
    const [state, dispatch] = useReducer(calendarReducer, {today, schedules: buildSeedSchedules()}, createInitialState);
    const [enrolmentTarget, setEnrolmentTarget] = useState(null);
    const [isMounted, setIsMounted] = useState(false);
    const {Grid} = GRID_LIBRARIES[library];
    const context = useMemo(() => contextFor(state), [state.schedules, state.serviceKeycode, state.today]);
    const service = SERVICES[state.serviceKeycode];
    const schedule = state.schedules[state.serviceKeycode];

    const cycleToGenerate = useMemo(() => nextCycleToGenerate(context), [context]);
    const months = useMemo(() => buildYearMonths(context, state.year), [context, state.year]);

    useEffect(() => setIsMounted(true), []);

    useEffect(() => {
        if (!state.notice) return undefined;
        const timer = setTimeout(() => dispatch({type: COMMAND.DISMISS_NOTICE}), NOTICE_DURATION_MS);
        return () => clearTimeout(timer);
    }, [state.notice]);

    const handleDayClick = useCallback((date, extendRange) => dispatch({type: COMMAND.CLICK_DAY, date, extendRange}), []);

    const jumpToDay = useCallback((dateKey) => {
        const year = Number(dateKey.slice(0, 4));
        if (year !== state.year && year >= state.year) dispatch({type: COMMAND.SHOW_YEAR, year});
        requestAnimationFrame(() => document.querySelector(`[data-date="${dateKey}"]`)?.scrollIntoView({block: 'center', behavior: 'smooth'}));
    }, [state.year]);

    return (
        <main className={styles.page} style={{'--svc': service.accentColor}}>
            <section className={styles.toolbarCard}>
                <div className={styles.toolbarRow}>
                    <div className={styles.tabs}>
                        {Object.values(SERVICES).map((option) => (
                            <button key={option.keycode} className={`${styles.tab} ${option.keycode === service.keycode ? styles.tabActive : styles.tabIdle}`}
                                    onClick={() => dispatch({type: COMMAND.SELECT_SERVICE, keycode: option.keycode})}>
                                <ServiceIcon keycode={option.keycode}/>{option.name}
                            </button>
                        ))}
                    </div>
                    <div className={styles.stepper}>
                        <button aria-label="Previous year" className={styles.stepperButton} disabled={state.year <= 2026} onClick={() => dispatch({type: COMMAND.CHANGE_YEAR, delta: -1})}><Chevron path={CHEVRON_LEFT}/></button>
                        <b className={styles.stepperYear} data-testid="year">{state.year}</b>
                        <button aria-label="Next year" className={styles.stepperButton} onClick={() => dispatch({type: COMMAND.CHANGE_YEAR, delta: 1})}><Chevron path={CHEVRON_RIGHT}/></button>
                    </div>
                    <div className={styles.actions}>
                        {!state.isEditing && cycleToGenerate && (
                            <button className={styles.primaryButton} onClick={() => dispatch({type: COMMAND.GENERATE_NEXT_CYCLE})}>Generate {cycleName(cycleToGenerate.start, state.year)}</button>
                        )}
                        {state.isEditing
                            ? <button className={styles.primaryButton} onClick={() => dispatch({type: COMMAND.FINISH_EDITING})}>Done</button>
                            : <button className={styles.editButton} onClick={() => dispatch({type: COMMAND.START_EDITING})}>✎ Edit calendar</button>}
                    </div>
                </div>
                {state.isEditing && (
                    <div className={styles.editRow}>
                        <span className={styles.editLabel}>Click a day to</span>
                        <div className={styles.modeGroup}>
                            {[[CALENDAR_EDIT_MODE.CYCLE_START, 'Set cycle start'], [CALENDAR_EDIT_MODE.BLOCK_DAY, 'Block day']].map(([mode, label]) => (
                                <button key={mode} className={`${styles.modeButton} ${state.editMode === mode ? styles.modeButtonActive : ''}`}
                                        onClick={() => dispatch({type: COMMAND.SET_EDIT_MODE, mode})}>{label}</button>
                            ))}
                        </div>
                        <div className={styles.stamp}>
                            <span className={styles.stampLabel}>Enrolment</span>
                            <span className={styles.stampValue}>{describeEnrolmentRule(schedule.enrolmentStamp)}</span>
                            <button className={styles.stampEdit} onClick={() => setEnrolmentTarget({cycleStart: null})}>Edit</button>
                        </div>
                    </div>
                )}
            </section>

            <div className={styles.layout}>
                <section className={styles.calendarCard}>
                    <nav className={styles.librarySwitch} aria-label="Calendar library">
                        <span className={styles.libraryLabel}>Library</span>
                        {Object.entries(GRID_LIBRARIES).map(([key, option]) => (
                            <a key={key} href={libraryHref(key)} className={`${styles.libraryLink} ${key === library ? styles.libraryLinkActive : ''}`}>{option.label}</a>
                        ))}
                    </nav>
                    {isMounted
                        ? <Suspense fallback={<div className={styles.gridFallback}>Loading…</div>}><Grid months={months} isEditing={state.isEditing} onDayClick={handleDayClick}/></Suspense>
                        : <div className={styles.gridFallback}>Loading…</div>}
                    <CalendarLegend/>
                </section>
                <MonthCyclesPanel context={context} year={state.year} isEditing={state.isEditing}
                                  onSelectCycle={jumpToDay} onShowYear={(year) => dispatch({type: COMMAND.SHOW_YEAR, year})}
                                  onEditEnrolment={(cycleStart) => setEnrolmentTarget({cycleStart})}/>
            </div>

            {enrolmentTarget && (
                <EnrolmentDialog
                    service={service}
                    cycleStart={enrolmentTarget.cycleStart}
                    initialRule={enrolmentTarget.cycleStart ? schedule.cycleStarts[enrolmentTarget.cycleStart] : schedule.enrolmentStamp}
                    year={state.year}
                    onCancel={() => setEnrolmentTarget(null)}
                    onSave={(rule) => {
                        dispatch({type: COMMAND.SAVE_ENROLMENT_RULE, cycleStart: enrolmentTarget.cycleStart, rule});
                        setEnrolmentTarget(null);
                    }}
                />
            )}
            {state.notice && <div key={state.notice.id} role="status" className={styles.notice}>{state.notice.text}</div>}
        </main>
    );
}
