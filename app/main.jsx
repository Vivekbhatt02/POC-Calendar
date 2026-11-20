import {StrictMode, version} from 'react';
import {createRoot} from 'react-dom/client';

import './app.css';
import ServiceCalendarPage from './service-calendar/ServiceCalendarPage';
import {DEFAULT_GRID_LIBRARY, GRID_LIBRARIES} from './service-calendar/grids';

const params = new URLSearchParams(location.search);
const requested = params.get('lib');
const library = requested in GRID_LIBRARIES ? requested : DEFAULT_GRID_LIBRARY;
const BUSINESS_TIME_ZONE = 'Asia/Kolkata';
const todayInBusinessTimeZone = () => new Intl.DateTimeFormat('en-CA', {timeZone: BUSINESS_TIME_ZONE}).format(new Date());
const today = params.get('today') ?? todayInBusinessTimeZone();

window.__REACT_VERSION__ = version;
createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ServiceCalendarPage library={library} today={today}/>
    </StrictMode>
);
