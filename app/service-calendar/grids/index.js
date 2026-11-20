import {lazy} from 'react';

export const GRID_LIBRARIES = {
    'mui-x': {label: 'MUI X DateCalendar', Grid: lazy(() => import('./MuiDateCalendarGrid'))},
    'big-calendar': {label: 'react-big-calendar', Grid: lazy(() => import('./BigCalendarGrid'))}
};

export const DEFAULT_GRID_LIBRARY = 'mui-x';
