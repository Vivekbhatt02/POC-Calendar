const styles = {
    legend: 'mt-3 flex flex-wrap gap-[18px] border-t border-[#ECEDF0] pt-3 text-[11.5px] text-[#6B7280]',
    item: 'inline-flex items-center gap-[7px]',
    swatch: 'inline-block h-3.5 w-3.5 rounded',
    line: 'inline-block h-[3px] w-[19px] rounded-sm'
};

const LEGEND_ITEMS = [
    ['Lesson day', `${styles.swatch} bg-[#EEF0F4]`],
    ['Generated', `${styles.swatch} bg-[#D3EFDD]`],
    ['Cycle start', `${styles.swatch} border-l-4 border-l-[var(--svc)] bg-[#EEF0F4]`],
    ['Today', 'inline-block h-3 w-5 rounded-full bg-[#1A5EA5]'],
    ['Blocked', `${styles.swatch} service-day-blocked bg-[#D9DCE1]`],
    ['No lessons that weekday', `${styles.swatch} border border-[#ECEDF0] bg-white`],
    ['Sign-ups open', `${styles.line} bg-[rgba(38,42,50,.62)]`],
    ['Cancellations open', `${styles.line} service-cancel-marker`]
];

export default function CalendarLegend() {
    return (
        <div className={styles.legend}>
            {LEGEND_ITEMS.map(([label, swatch]) => <span key={label} className={styles.item}><i className={swatch}/>{label}</span>)}
        </div>
    );
}
