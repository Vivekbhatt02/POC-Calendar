import {cloneElement, createContext, useContext, useMemo} from 'react';
import moment from 'moment';
import {DateTime} from 'luxon';
import {Calendar, luxonLocalizer} from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import {DayContent, dayClassName} from '../DayCell';
import YearLayout from './YearLayout';

const MONDAY = 1;
const localizer = luxonLocalizer(DateTime, {firstDayOfWeek: MONDAY});
const VIEWS = ['month'];
const NO_EVENTS = [];
const NO_OP = () => {};
const FORMATS = {weekdayFormat: (date) => DateTime.fromJSDate(date).toFormat('ccccc')};
const calendarStyle = {height: 'auto'};

const styles = {
    root: 'service-rbc',
    offRange: 'rbc-off-range-bg-hidden'
};

const DayContext = createContext(null);

function DateCellWrapper({value, children}) {
    const {cellsByDate, monthIndex, isEditing, onDayClick} = useContext(DayContext);
    const isOffRange = value.getMonth() !== monthIndex;
    const cell = !isOffRange && cellsByDate.get(moment(value).format('YYYY-MM-DD'));
    if (!cell) return cloneElement(children, {className: `${children.props.className} ${styles.offRange}`});
    return cloneElement(children, {
        'data-date': cell.date,
        className: `${children.props.className} ${dayClassName(cell, isEditing)}`,
        onClick: (event) => onDayClick(cell.date, event.shiftKey),
        children: <DayContent cell={cell}/>
    });
}

const COMPONENTS = {dateCellWrapper: DateCellWrapper, month: {dateHeader: () => null}, toolbar: () => null};

function MonthCalendar({month, isEditing, onDayClick}) {
    const date = useMemo(() => new Date(month.year, month.monthIndex, 1), [month.year, month.monthIndex]);
    const value = useMemo(() => ({
        cellsByDate: new Map(month.days.map((cell) => [cell.date, cell])),
        monthIndex: month.monthIndex,
        isEditing,
        onDayClick
    }), [month, isEditing, onDayClick]);
    return (
        <DayContext.Provider value={value}>
            <Calendar
                className={styles.root}
                localizer={localizer}
                formats={FORMATS}
                events={NO_EVENTS}
                views={VIEWS}
                view="month"
                date={date}
                onNavigate={NO_OP}
                onView={NO_OP}
                toolbar={false}
                components={COMPONENTS}
                style={calendarStyle}
            />
        </DayContext.Provider>
    );
}

export default function BigCalendarGrid({months, isEditing, onDayClick}) {
    return (
        <YearLayout months={months} renderMonth={(month) => (
            <MonthCalendar month={month} isEditing={isEditing} onDayClick={onDayClick}/>
        )}/>
    );
}
