<script>
    import { getDisplay } from './types';
    export let display = '';

    const css = [
        getDisplay(display),
        $$props.class
    ]
        .filter(Boolean)
        .join(' ')
        .trim();
</script>
<h3 class={css} {...$$restProps}>
    <slot />
</h3>
