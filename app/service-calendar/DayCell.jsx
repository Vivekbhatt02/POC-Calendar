const dayStyles = {
    base: 'service-day relative mx-px my-px h-[38px] rounded-md text-center text-xs leading-[38px] select-none',
    noLessons: 'bg-white text-[#C4C8CE]',
    inCycle: 'bg-[#EEF0F4]',
    outsideCycle: 'bg-white',
    generated: '!bg-[#D3EFDD] text-[#17663A]',
    generatedPast: '!bg-[#E4F5EA] text-[#5E9C77]',
    past: 'text-[#A3A8B0]',
    blocked: 'service-day-blocked !bg-[#D9DCE1] font-semibold text-[#4B515A]',
    cycleStart: 'border-l-4 border-l-[var(--svc)] font-bold text-[var(--svc)]',
    editable: 'cursor-pointer hover:outline-2 hover:outline-offset-1 hover:outline-[#1A5EA5]'
};

const markerStyles = {
    stack: 'pointer-events-none absolute bottom-[5px] left-1/2 flex w-[19px] -translate-x-1/2 flex-col gap-0.5',
    pastStack: 'opacity-50',
    signUps: 'h-[3px] rounded-sm bg-[rgba(38,42,50,.62)]',
    cancellations: 'service-cancel-marker h-[3px]',
    empty: 'h-[3px]',
    number: 'relative -top-[5px]',
    today: 'relative -top-[5px] inline-block h-[18px] min-w-[22px] rounded-[9px] bg-[#1A5EA5] px-[5px] align-middle leading-[18px] font-semibold text-white'
};

export const monthTitleStyle = 'mb-1.5 text-[12.5px] font-semibold';

const MONTH_NAME = new Intl.DateTimeFormat('en-GB', {month: 'long', timeZone: 'UTC'});

export function monthTitle(month) {
    const name = MONTH_NAME.format(Date.UTC(month.year, month.monthIndex, 1));
    return month.isNextYear ? `${name} ${month.year}` : name;
}

export function dayClassName(cell, isEditing) {
    const classes = [dayStyles.base];
    classes.push(!cell.hasLessons ? dayStyles.noLessons : cell.isInCycle ? dayStyles.inCycle : dayStyles.outsideCycle);
    if (cell.isPast) classes.push(dayStyles.past);
    if (cell.isGenerated) classes.push(cell.isPast ? dayStyles.generatedPast : dayStyles.generated);
    if (cell.isBlocked) classes.push(dayStyles.blocked);
    if (cell.isCycleStart) classes.push(dayStyles.cycleStart);
    if (isEditing) classes.push(dayStyles.editable);
    return classes.join(' ');
}

export function DayContent({cell}) {
    const marker = cell.enrolmentMarker;
    return (
        <>
            <span className={cell.isToday ? markerStyles.today : markerStyles.number}>{cell.dayOfMonth}</span>
            {marker && (
                <span className={`${markerStyles.stack} ${cell.isPast ? markerStyles.pastStack : ''}`}>
                    <i className={marker.cancellationsOpen ? markerStyles.cancellations : markerStyles.empty}/>
                    <i className={markerStyles.signUps}/>
                </span>
            )}
        </>
    );
}

export function DayButton({cell, isEditing, onDayClick, className = ''}) {
    return (
        <div data-date={cell.date} className={`${dayClassName(cell, isEditing)} ${className}`}
             onClick={(event) => onDayClick(cell.date, event.shiftKey)}>
            <DayContent cell={cell}/>
        </div>
    );
}
