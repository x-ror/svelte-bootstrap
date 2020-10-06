const cssnano = require("cssnano")({ preset: "default" });
const tailwindcss = require("tailwindcss");
const autoprefixer = require('autoprefixer');

const purgecss = require("@fullhuman/postcss-purgecss")({
    content: ["./src/**/*.svelte", "./public/**/*.html"],
    defaultExtractor: content => content.match(/[A-Za-z0-9-_:/]+/g) || []
});

const production = process.env.NODE_ENV === 'production';

module.exports = {
    plugins: production ? [tailwindcss, purgecss, autoprefixer, cssnano] : [tailwindcss]
};