const VARIANTS = {
    'primary': 'bg-primary',
    'secondary': 'bg-secondary',
    'success': 'bg-success',
    'danger': 'bg-danger',
    'warning': 'bg-warning',
    'info': 'bg-info',
    'light': 'bg-light',
    'dark': 'bg-dark'
}

export function getVariant(variant) {
    return VARIANTS[variant] || VARIANTS.primary;
}

export function getPill(pill) {
    return pill ? 'rounded-pill' : '';
}

export function getBadgePrefix() {
    return 'badge';
}