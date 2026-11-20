import {SERVICES} from './constants';

const BADGE = 'inline-grid h-[18px] min-w-[18px] place-items-center rounded px-0.5 text-[8px] font-bold text-white';

export default function ServiceIcon({keycode}) {
    const service = SERVICES[keycode];
    return <span className={BADGE} style={{background: service.accentColor}} title={service.name}>{service.shortName}</span>;
}
