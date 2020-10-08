<script lang="ts">
    import type { Variant, Size, Type } from "./types";
    import { VariantCss, SizeCss } from "./enums";
    export let active: boolean = false;
    export let block: boolean = false;
    export let disabled: boolean = false;
    export let variant: Variant = "primary";
    export let size: Size;
    export let type: Type = "button";

    const css: string = [
        // "btn",
        VariantCss[variant],
        SizeCss[size],
        $$props.class,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();
</script>

<button
    {...$$restProps}
    class:btn-block={block}
    class:active
    class="btn {css}"
    {type}
    {disabled}>
    <slot />
</button>
