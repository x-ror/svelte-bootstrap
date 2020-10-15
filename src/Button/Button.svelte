<script>
    import SafeAnchor from '../SafeAnchor/SafeAnchor.svelte';
    import {
        getButtonPrefix,
        getSize,
        getVariant,
        getBlock,
        getActive
    } from './types';
    export let variant = 'primary';
    export let active = false;
    export let block = false;
    export let disabled = false;
    export let size = '';
    export let href = '';
    export let as = '';
    export let type = 'button';

    const css = [
        getButtonPrefix(),
        getVariant(variant),
        getSize(size),
        getActive(active),
        getBlock(block),
        $$props.class
    ]
        .filter(Boolean)
        .join(' ')
        .trim();
</script>

{#if href}
    <SafeAnchor on:click {href} class={css} {disabled} {...$$restProps}>
        <slot />
    </SafeAnchor>
{:else if as === 'input'}
    <input on:click class={css} {type} {disabled} {...$$restProps} />
{:else}
    <button on:click class={css} {type} {disabled} {...$$restProps}>
        <slot />
    </button>
{/if}
