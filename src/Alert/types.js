const VARIANTS = {
    primary: 'alert-primary',
    secondary: 'alert-secondary',
    success: 'alert-success',
    danger: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info',
    light: 'alert-light',
    dark: 'alert-dark'
};

export const getPrefix = () => 'alert';
export const getVariant = (variant) => VARIANTS[variant] || VARIANTS.primary;