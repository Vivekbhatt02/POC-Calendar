import {CYCLE_STATUS, CYCLE_STATUS_DISPLAY, STATUS_TONE} from './constants';
import {canEditCycleEnrolment, cycleName, cycleRowsForYear, formatDay, formatDayWithYear} from './calendarRules';

const WEEKDAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const styles = {
    panel: 'sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col rounded-[10px] bg-white shadow-sm',
    head: 'px-4 pt-[18px] pb-2.5 text-sm font-semibold',
    headYear: 'font-normal text-[#6B7280]',
    list: 'min-h-0 flex-1 overflow-y-auto',
    row: 'cursor-pointer border-b border-[#ECEDF0] px-4 py-[9px] hover:bg-[#F7F8FA]',
    currentRow: 'bg-[#F7FAFE] shadow-[inset_3px_0_0_#1A5EA5]',
    rowTop: 'mb-1.5 flex items-center justify-between gap-2',
    name: 'text-[12.5px] font-semibold',
    pastName: 'text-[#6B7280]',
    nowBadge: 'ml-1 rounded-lg bg-[#1A5EA5] px-[7px] py-px align-[1px] text-[10px] font-semibold text-white',
    dates: 'text-xs text-[#6B7280]',
    nextYearLink: 'ml-1.5 text-[11.5px] font-semibold text-[#1A5EA5] hover:underline',
    enrolment: 'mb-[7px] flex items-center gap-2 text-[11px] text-[#6B7280]',
    enrolmentEdit: 'ml-auto text-[11.5px] font-semibold text-[#1A5EA5] hover:underline',
    weekdays: 'flex gap-1',
    weekday: 'flex flex-1 flex-col items-center rounded-[7px] bg-[#F3F4F6] pt-[3px] pb-1 text-[9.5px] leading-tight font-semibold text-[#8A8F98] uppercase',
    weekdayReduced: '!bg-[#FFF3E0]',
    weekdayNone: '!bg-[#FAFAFB]',
    weekdayCount: 'text-sm font-semibold text-[#1D1E1C]',
    weekdayCountReduced: '!text-[#B26A00]',
    weekdayCountNone: '!text-[#C4C8CE]',
    empty: 'px-4 py-6 text-sm text-[#6B7280]',
    needsEnd: 'text-xs text-[#6B7280]',
    footnote: 'flex items-start gap-2 border-t border-[#ECEDF0] px-4 py-3 text-[11px] text-[#6B7280]',
    footnoteBadge: 'grid h-4 w-4 shrink-0 place-items-center rounded bg-[#FFF3E0] text-[10px] font-bold text-[#B26A00]'
};

const STATUS_TONE_STYLE = {
    [STATUS_TONE.SUCCESS]: 'bg-[#E7F7EE] text-[#2E9E5B]',
    [STATUS_TONE.WARNING]: 'bg-[#FFF3E0] text-[#B26A00]',
    [STATUS_TONE.INFO]: 'bg-[#E9F1F8] text-[#134677]',
    [STATUS_TONE.NEUTRAL]: 'bg-[#F1F2F4] text-[#6B7280]',
    [STATUS_TONE.ERROR]: 'bg-[#FBEAEC] text-[#C0392B]'
};
const STATUS_CHIP = 'shrink-0 whitespace-nowrap rounded-[10px] px-[9px] py-[3px] text-[11px] font-semibold';

function statusLabel(row) {
    if (row.status === CYCLE_STATUS.PARTLY_GENERATED) return `Generated ${row.generatedCount.generated} of ${row.generatedCount.total} days`;
    if (row.status === CYCLE_STATUS.GENERATED && row.generatedAt) return `✓ Generated ${row.generatedAt}`;
    return CYCLE_STATUS_DISPLAY[row.status].label;
}

function WeekdayCounts({weekdays}) {
    return (
        <div className={styles.weekdays}>
            {weekdays.map((day) => {
                const isReduced = day.blockedCount > 0;
                const title = day.hasLessons ? `${day.lessonCount} lessons${isReduced ? `, ${day.blockedCount} blocked` : ''}` : 'No lessons';
                return (
                    <span key={day.weekday} title={title} className={`${styles.weekday} ${!day.hasLessons ? styles.weekdayNone : isReduced ? styles.weekdayReduced : ''}`}>
                        {WEEKDAY_SHORT[day.weekday]}
                        <b className={`${styles.weekdayCount} ${!day.hasLessons ? styles.weekdayCountNone : isReduced ? styles.weekdayCountReduced : ''}`}>
                            {day.hasLessons ? day.lessonCount : '–'}
                        </b>
                    </span>
                );
            })}
        </div>
    );
}

export default function MonthCyclesPanel({context, year, isEditing, onSelectCycle, onShowYear, onEditEnrolment}) {
    const rows = cycleRowsForYear(context, year);

    return (
        <aside className={styles.panel} data-testid="cycles-panel">
            <div className={styles.head}>Month cycles <span className={styles.headYear}>{year}</span></div>
            <div className={styles.list}>
                {!rows.length && <div className={styles.empty}>No {context.service.name} cycles in {year}. Use Edit calendar and click the first lesson day of each cycle.</div>}
                {rows.map((row) => {
                    const {cycle, enrolment} = row;
                    const startLabel = row.startsBeforeYear ? formatDayWithYear(cycle.start) : formatDay(cycle.start);
                    return (
                        <div key={cycle.start} data-cycle={cycle.start} className={`${styles.row} ${row.isCurrent ? styles.currentRow : ''}`} onClick={() => onSelectCycle(cycle.start)}>
                            <div className={styles.rowTop}>
                                <div className="min-w-0 flex-1">
                                    <div className={`${styles.name} ${row.isPast ? styles.pastName : ''}`}>
                                        {cycleName(cycle.start, year)}{row.isCurrent && <span className={styles.nowBadge}>Now</span>}
                                    </div>
                                    <div className={styles.dates}>
                                        {startLabel} to {cycle.end ? formatDayWithYear(cycle.end) : '…'}
                                        {row.continuesIntoNextYear && (
                                            <button className={styles.nextYearLink} onClick={(event) => { event.stopPropagation(); onShowYear(year + 1); }}>Continues in {year + 1} →</button>
                                        )}
                                    </div>
                                </div>
                                <span className={`${STATUS_CHIP} ${STATUS_TONE_STYLE[CYCLE_STATUS_DISPLAY[row.status].tone]}`}>{statusLabel(row)}</span>
                            </div>
                            <div className={styles.enrolment}>
                                <span>Sign-ups {formatDay(enrolment.opensOn)} – {formatDay(enrolment.signUpsUntil)} · cancel to {formatDay(enrolment.cancellationsUntil)}</span>
                                {isEditing && canEditCycleEnrolment(context, cycle) && (
                                    <button className={styles.enrolmentEdit} onClick={(event) => { event.stopPropagation(); onEditEnrolment(cycle.start); }}>✎ Edit</button>
                                )}
                            </div>
                            {cycle.end
                                ? <WeekdayCounts weekdays={row.weekdays}/>
                                : <div className={styles.needsEnd}>Click the next cycle start to set the end of this cycle.</div>}
                        </div>
                    );
                })}
            </div>
            <div className={styles.footnote}>
                <span className={styles.footnoteBadge}>3</span>
                Fewer lessons than usual on that weekday, because of blocked days
            </div>
        </aside>
    );
}
