module.exports = {
    root: true,
    extends: '@sveltejs',
    plugins: ['import'],
    rules: {
        quotes: [2, 'single', { avoidEscape: true }]
    },
    settings: {
        'import/resolver': {
            typescript: {} // this loads <rootdir>/tsconfig.json to eslint
        }
    }
};