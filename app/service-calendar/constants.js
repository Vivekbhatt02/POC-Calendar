export const DATE_KEY_FORMAT = 'YYYY-MM-DD';
export const MONTHS_IN_YEAR = 12;
export const MONTHS_SHOWN = MONTHS_IN_YEAR + 1;
export const DAYS_IN_WEEK = 7;
export const CYCLE_MONTH_ROLLOVER_DAY = 15;
export const FIRST_SUPPORTED_YEAR = 2026;
export const DAY_OF_MONTH_OPTIONS = Array.from({length: 28}, (_, index) => index + 1);

export const SERVICE_KEYCODES = {
    ABCO: 'ABCO',
    CFKO: 'CFKO'
};

export const SERVICES = {
    [SERVICE_KEYCODES.ABCO]: {
        keycode: SERVICE_KEYCODES.ABCO,
        name: 'ABC Online',
        shortName: 'ABC',
        accentColor: '#4C5575',
        lessonsPerWeekday: [0, 6, 8, 18, 2, 13, 4]
    },
    [SERVICE_KEYCODES.CFKO]: {
        keycode: SERVICE_KEYCODES.CFKO,
        name: 'CFK Online',
        shortName: 'CFK',
        accentColor: '#BC7E7A',
        lessonsPerWeekday: [0, 36, 30, 22, 20, 6, 0]
    }
};

export const CALENDAR_EDIT_MODE = {
    CYCLE_START: 'CYCLE_START',
    BLOCK_DAY: 'BLOCK_DAY'
};

export const ENROLMENT_STATE = {
    NOT_YET_OPEN: 'NOT_YET_OPEN',
    OPEN: 'OPEN',
    SIGN_UPS_ONLY: 'SIGN_UPS_ONLY',
    CLOSED: 'CLOSED'
};

export const DEFAULT_ENROLMENT_RULE = {
    opensOnDay: 1,
    cancellationsCloseOnDay: 16,
    signUpsCloseOnDay: 21
};

export const CYCLE_STATUS = {
    GENERATED: 'GENERATED',
    PARTLY_GENERATED: 'PARTLY_GENERATED',
    READY_TO_GENERATE: 'READY_TO_GENERATE',
    ENROLMENT_OPEN: 'ENROLMENT_OPEN',
    SIGN_UPS_ONLY: 'SIGN_UPS_ONLY',
    UPCOMING: 'UPCOMING',
    NEEDS_NEXT_CYCLE_START: 'NEEDS_NEXT_CYCLE_START',
    NOT_GENERATED: 'NOT_GENERATED'
};

export const STATUS_TONE = {
    SUCCESS: 'SUCCESS',
    WARNING: 'WARNING',
    INFO: 'INFO',
    NEUTRAL: 'NEUTRAL',
    ERROR: 'ERROR'
};

export const CYCLE_STATUS_DISPLAY = {
    [CYCLE_STATUS.GENERATED]: {label: '✓ Generated', tone: STATUS_TONE.SUCCESS},
    [CYCLE_STATUS.PARTLY_GENERATED]: {label: 'Partly generated', tone: STATUS_TONE.WARNING},
    [CYCLE_STATUS.READY_TO_GENERATE]: {label: 'Ready to generate', tone: STATUS_TONE.INFO},
    [CYCLE_STATUS.ENROLMENT_OPEN]: {label: 'Enrolment open', tone: STATUS_TONE.NEUTRAL},
    [CYCLE_STATUS.SIGN_UPS_ONLY]: {label: 'Sign-ups only', tone: STATUS_TONE.NEUTRAL},
    [CYCLE_STATUS.UPCOMING]: {label: 'Upcoming', tone: STATUS_TONE.NEUTRAL},
    [CYCLE_STATUS.NEEDS_NEXT_CYCLE_START]: {label: 'Needs next cycle start', tone: STATUS_TONE.NEUTRAL},
    [CYCLE_STATUS.NOT_GENERATED]: {label: 'Not generated', tone: STATUS_TONE.ERROR}
};

export const EDIT_LOCK_REASON = {
    PAST_DAY: 'PAST_DAY',
    NO_LESSONS_ON_WEEKDAY: 'NO_LESSONS_ON_WEEKDAY',
    DAY_GENERATED: 'DAY_GENERATED',
    CYCLE_GENERATED: 'CYCLE_GENERATED',
    ENROLMENT_STARTED: 'ENROLMENT_STARTED'
};

export const ENROLMENT_RULE_ERROR = {
    CANCEL_BEFORE_OPEN: 'CANCEL_BEFORE_OPEN',
    CANCEL_AFTER_SIGN_UPS_CLOSE: 'CANCEL_AFTER_SIGN_UPS_CLOSE',
    SIGN_UPS_CLOSE_AFTER_START: 'SIGN_UPS_CLOSE_AFTER_START'
};
