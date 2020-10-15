<script>
    import { getBadgePrefix, getVariant, getPill } from './types';
    export let variant = '';
    export let pill = '';

    const css = [
        getBadgePrefix(),
        getVariant(variant),
        getPill(pill),
        $$props.class
    ]
        .filter(Boolean)
        .join(' ')
        .trim();
</script>

<span class={css} {...$$restProps}><slot /></span>
