import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';
import autoPreprocess from 'svelte-preprocess';

const name = pkg.name
    .replace(/^(@\S+\/)?(svelte-)?(\S+)/, '$3')
    .replace(/^\w/, (m) => m.toUpperCase())
    .replace(/-\w/g, (m) => m[1].toUpperCase());

const plugins = [
    resolve({})
];

const output = (path) => [
    { file: `${path}/index.mjs`, sourcemap: true, format: 'es' },
    { file: `${path}/index.js`, sourcemap: true, format: 'umd', name },
];

export default [
    {
        input: 'src/index.js',
        output: output('dist'),
        plugins: [svelte({ hydratable: true, preprocess: autoPreprocess() }), ...plugins],
    },
    {
        input: 'src/index.js',
        output: output('dist/ssr'),
        plugins: [svelte({ generate: 'ssr', hydratable: true, preprocess: autoPreprocess() }), ...plugins],
    },
];