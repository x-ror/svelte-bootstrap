const DISPLAY = {
    '1': 'display-1',
    '2': 'display-2',
    '3': 'display-3',
    '4': 'display-4',
    '5': 'display-5',
    '6': 'display-6',
}

export function getDisplay(display) {
    return DISPLAY[display] || '';
}