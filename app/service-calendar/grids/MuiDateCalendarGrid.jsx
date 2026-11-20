import {createContext, memo, useContext, useMemo} from 'react';
import moment from 'moment';
import {MONDAY_LOCALE} from './mondayLocale';
import {DateCalendar} from '@mui/x-date-pickers/DateCalendar';
import {LocalizationProvider} from '@mui/x-date-pickers/LocalizationProvider';
import {AdapterMoment} from '@mui/x-date-pickers/AdapterMoment';

import {DayButton} from '../DayCell';
import YearLayout from './YearLayout';

const ADAPTER_LOCALE = MONDAY_LOCALE;
const VIEWS = ['day'];
const NO_HEADER = () => null;
const formatWeekday = (date) => date.format('dd').charAt(0);

const DAY_SIZE = 38;
const calendarSx = {
    width: '100%',
    height: 'auto',
    maxHeight: 'none',
    margin: 0,
    '& .MuiDayCalendar-header, & .MuiDayCalendar-weekContainer': {justifyContent: 'stretch', margin: 0},
    '& .MuiDayCalendar-weekDayLabel': {flex: 1, width: 'auto', height: 18, margin: 0, fontSize: 10, fontWeight: 600, color: '#8A8F98'},
    '& .MuiDayCalendar-slideTransition': {minHeight: 0, overflow: 'visible'},
    '& .MuiDayCalendar-monthContainer': {position: 'relative'}
};
const daySlotSx = {flex: 1, minWidth: 0};
const fillerSx = {flex: 1, height: DAY_SIZE + 2};

const DayContext = createContext(null);

function ServiceDay({day, outsideCurrentMonth}) {
    const {cellsByDate, isEditing, onDayClick} = useContext(DayContext);
    const cell = !outsideCurrentMonth && cellsByDate.get(day.format('YYYY-MM-DD'));
    if (!cell) return <div style={fillerSx}/>;
    return (
        <div style={daySlotSx}>
            <DayButton cell={cell} isEditing={isEditing} onDayClick={onDayClick}/>
        </div>
    );
}

const SLOTS = {day: ServiceDay, calendarHeader: NO_HEADER};

const MonthCalendar = memo(function MonthCalendar({month, days, isEditing, onDayClick}) {
    const referenceDate = useMemo(() => moment({year: month.year, month: month.monthIndex, day: 1}).locale(ADAPTER_LOCALE), [month.year, month.monthIndex]);
    const value = useMemo(() => ({cellsByDate: new Map(days.map((cell) => [cell.date, cell])), isEditing, onDayClick}), [days, isEditing, onDayClick]);
    return (
        <DayContext.Provider value={value}>
            <DateCalendar
                key={month.key}
                value={null}
                referenceDate={referenceDate}
                views={VIEWS}
                slots={SLOTS}
                dayOfWeekFormatter={formatWeekday}
                reduceAnimations
                disableHighlightToday
                sx={calendarSx}
            />
        </DayContext.Provider>
    );
});

export default function MuiDateCalendarGrid({months, isEditing, onDayClick}) {
    return (
        <LocalizationProvider dateAdapter={AdapterMoment} adapterLocale={ADAPTER_LOCALE}>
            <YearLayout months={months} renderMonth={(month) => (
                <MonthCalendar month={month} days={month.days} isEditing={isEditing} onDayClick={onDayClick}/>
            )}/>
        </LocalizationProvider>
    );
}
