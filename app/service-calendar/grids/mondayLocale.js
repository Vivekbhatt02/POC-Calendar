import moment from 'moment';

export const MONDAY_LOCALE = 'en-monday';

if (!moment.locales().includes(MONDAY_LOCALE)) {
    const globalLocale = moment.locale();
    moment.defineLocale(MONDAY_LOCALE, {parentLocale: 'en', week: {dow: 1, doy: 4}});
    moment.locale(globalLocale);
}
