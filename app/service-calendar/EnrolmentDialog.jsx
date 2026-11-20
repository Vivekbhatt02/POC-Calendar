import {useState} from 'react';

import {DAY_OF_MONTH_OPTIONS, ENROLMENT_RULE_ERROR} from './constants';
import {cycleName, formatDay, ordinal, validateEnrolmentRule} from './calendarRules';

const FIELDS = [
    ['opensOnDay', 'Enrolment opens'],
    ['cancellationsCloseOnDay', 'Cancellations close'],
    ['signUpsCloseOnDay', 'Sign-ups close']
];

const ERROR_TEXT = {
    [ENROLMENT_RULE_ERROR.CANCEL_BEFORE_OPEN]: () => 'Cancellations must close after enrolment opens.',
    [ENROLMENT_RULE_ERROR.CANCEL_AFTER_SIGN_UPS_CLOSE]: () => 'Cancellations must close on or before the day sign-ups close.',
    [ENROLMENT_RULE_ERROR.SIGN_UPS_CLOSE_AFTER_START]: (cycleStart) => `Sign-ups must close before the cycle starts on ${formatDay(cycleStart)}.`
};

const styles = {
    backdrop: 'fixed inset-0 z-40 grid place-items-center bg-black/30',
    dialog: 'w-[440px] overflow-hidden rounded-xl bg-white shadow-2xl',
    head: 'bg-[#3A75CC] px-6 py-[18px] text-[19px] font-semibold text-white',
    body: 'flex flex-col gap-3 px-6 py-4',
    row: 'flex items-center gap-3 text-[13px]',
    label: 'w-40 font-medium',
    select: 'rounded-md border border-[#D8DBE0] px-2 py-1.5',
    at: 'text-[#6B7280]',
    error: 'min-h-4 text-xs text-[#C0392B]',
    foot: 'flex justify-end gap-3 px-6 pt-2 pb-[22px]',
    button: 'h-10 rounded-md px-[22px] text-[13.5px] font-semibold uppercase tracking-wide',
    cancel: 'border border-[#3A75CC] bg-white text-[#3A75CC] hover:bg-[#EEF4FC]',
    save: 'bg-[#3A75CC] text-white disabled:bg-[#A9BCD2]'
};

export default function EnrolmentDialog({service, cycleStart, initialRule, year, onCancel, onSave}) {
    const [rule, setRule] = useState(initialRule);
    const error = validateEnrolmentRule(rule, cycleStart);
    const title = cycleStart ? `Enrolment dates · ${service.shortName} ${cycleName(cycleStart, year)}` : `Enrolment dates · ${service.name}`;

    return (
        <div className={styles.backdrop} onClick={(event) => event.target === event.currentTarget && onCancel()}>
            <div role="dialog" aria-label={title} className={styles.dialog}>
                <div className={styles.head}>{title}</div>
                <div className={styles.body}>
                    {FIELDS.map(([field, label]) => (
                        <label key={field} className={styles.row}>
                            <span className={styles.label}>{label}</span>
                            <select className={styles.select} value={rule[field]} onChange={(event) => setRule({...rule, [field]: Number(event.target.value)})}>
                                {DAY_OF_MONTH_OPTIONS.map((day) => <option key={day} value={day}>{ordinal(day)}</option>)}
                            </select>
                            <span className={styles.at}>at 00:00</span>
                        </label>
                    ))}
                    <div className={styles.error}>{error && ERROR_TEXT[error](cycleStart)}</div>
                </div>
                <div className={styles.foot}>
                    <button className={`${styles.button} ${styles.cancel}`} onClick={onCancel}>Cancel</button>
                    <button className={`${styles.button} ${styles.save}`} disabled={Boolean(error)} onClick={() => onSave(rule)}>Save</button>
                </div>
            </div>
        </div>
    );
}
