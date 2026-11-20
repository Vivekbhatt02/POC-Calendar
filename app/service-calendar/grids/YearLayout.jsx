import {monthTitle, monthTitleStyle} from '../DayCell';

const styles = {
    grid: 'grid grid-cols-3 gap-x-5 gap-y-4',
    divider: 'col-span-3 flex items-center gap-3 text-[11.5px] font-semibold text-[#6B7280] before:h-px before:flex-1 before:bg-[#E4E6EA] after:h-px after:flex-1 after:bg-[#E4E6EA]'
};

export default function YearLayout({months, renderMonth}) {
    return (
        <div className={styles.grid}>
            {months.map((month) => (
                <MonthSlot key={month.key} month={month} renderMonth={renderMonth}/>
            ))}
        </div>
    );
}

function MonthSlot({month, renderMonth}) {
    return (
        <>
            {month.isNextYear && <div className={styles.divider}>Continues into {month.year}</div>}
            <div>
                <div className={monthTitleStyle}>{monthTitle(month)}</div>
                {renderMonth(month)}
            </div>
        </>
    );
}
