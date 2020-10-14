<script>
    import { createEventDispatcher } from "svelte";
    import { getDisabled } from "./types";
    export let href;
    export let role = "";
    export let disabled = false;
    export let tabindex = "";

    delete $$restProps.class;
    const dispatch = createEventDispatcher();
    const click = () => dispatch("click");

    let props = {
        role,
        tabindex,
    };

    function isTrivialHref(href) {
        return !href || href.trim() === "#";
    }

    function handleClick(event) {
        if (disabled || isTrivialHref(href)) {
            event.preventDefault();
        }

        if (disabled) {
            event.stopPropagation();
            return;
        }

        click();
    }

    function handleKeyDown(event) {
        if (event.key === " ") {
            event.preventDefault();
            handleClick(event);
        }
    }

    if (isTrivialHref(href)) {
        props.role = props.role || "button";
        // we want to make sure there is a href attribute on the node
        // otherwise, the cursor incorrectly styled (except with role='button')
        href = href || "#";
    }

    if (disabled) {
        props["tabindex"] = -1;
        props["aria-disabled"] = true;
    }

    const css = [$$props.class, getDisabled(disabled)]
        .filter(Boolean)
        .join(" ")
        .trim();
</script>

<a
    class={css}
    {href}
    {...props}
    {...$$restProps}
    on:keydown={handleKeyDown}
    on:click={handleClick}>
    <slot />
</a>
