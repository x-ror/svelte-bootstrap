<script>
    import { getPrefix, getVariant } from './types';
    export let variant;

    const css = [getPrefix(), getVariant(variant), $$props.class]
        .filter(Boolean)
        .join(' ')
        .trim();
</script>

<div class={css} role="alert">
    <slot />
</div>
