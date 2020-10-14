<script>
    import { getVariant } from "./types";
    export let alt;
    export let src;
    export let variant;

    const css = [getVariant(variant), $$props.class]
        .filter(Boolean)
        .join(" ")
        .trim();
</script>

<img class={css} {src} {alt} {...$$restProps} />
