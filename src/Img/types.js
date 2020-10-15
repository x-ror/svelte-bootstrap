const VARIANTS = {
    fluid: 'img-fluid',
    thumbnail: 'img-thumbnail'
};

export const getVariant = (variant) => VARIANTS[variant] || '';