const SIZES = {
    sm: 'btn-sm',
    lg: 'btn-lg'
};

const VARIANTS = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    danger: 'btn-danger',
    warning: 'btn-warning',
    info: 'btn-info',
    dark: 'btn-dark',
    light: 'btn-light',
    link: 'btn-link',
    'outline-primary': 'btn-outline-primary',
    'outline-secondary': 'btn-outline-secondary',
    'outline-success': 'btn-outline-success',
    'outline-danger': 'btn-outline-danger',
    'outline-warning': 'btn-outline-warning',
    'outline-info': 'btn-outline-info',
    'outline-dark': 'btn-outline-dark',
    'outline-light': 'btn-outline-light'
};

/**
 * @returns {string}
 */
export function getButtonPrefix() {
    return 'btn';
}

/**
 * @param {string} size 
 * @returns {string}
 */
export function getSize(size) {
    return SIZES[size] || '';
}

/**
 * @returns {string}
 */
export function getBlock(block) {
    return block ? 'btn-block' : '';
}

/**
 * @returns {string}
 */
export function getActive(active) {
    return active ? 'active' : '';
}

/**
 * @param {string} variant 
 * @returns {string}
 */
export function getVariant(variant) {
    return VARIANTS[variant] || VARIANTS['primary'];
}