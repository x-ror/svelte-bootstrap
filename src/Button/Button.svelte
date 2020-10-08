<script>
    /**
     * One or more button variant combinations
     *
     * buttons may be one of a variety of visual variants such as:
     *
     * `'primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark', 'light', 'link'`
     *
     * as well as "outline" versions (prefixed by 'outline-*')
     *
     * `'outline-primary', 'outline-secondary', 'outline-success', 'outline-danger', 'outline-warning', 'outline-info', 'outline-dark', 'outline-light'`
     */
    export let variant = "primary";

    export let active = false;
    export let block = false;
    export let disabled = false;
    export let size;
    export let type = "button";

    let css = [];
    if (size === "sm") {
        css.push("btn-sm");
    } else if (size === "lg") {
        css.push("btn-lg");
    }

    if (variant) {
        css.push(`btn-${variant}`);
    } else {
        css.push("btn-primary");
    }

    css.push($$props.class);
    const string_css = css.join(" ").filter(Boolean).trim();
</script>

<button
    {...$$restProps}
    class:btn-block={block}
    class:active
    class="btn {string_css}"
    {type}
    {disabled}>
    <slot />
</button>
