function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function compute_rest_props(props, keys) {
    const rest = {};
    keys = new Set(keys);
    for (const k in props)
        if (!keys.has(k) && k[0] !== '$')
            rest[k] = props[k];
    return rest;
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail);
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
        }
    };
}

// source: https://html.spec.whatwg.org/multipage/indices.html
const boolean_attributes = new Set([
    'allowfullscreen',
    'allowpaymentrequest',
    'async',
    'autofocus',
    'autoplay',
    'checked',
    'controls',
    'default',
    'defer',
    'disabled',
    'formnovalidate',
    'hidden',
    'ismap',
    'loop',
    'multiple',
    'muted',
    'nomodule',
    'novalidate',
    'open',
    'playsinline',
    'readonly',
    'required',
    'reversed',
    'selected'
]);

const invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
// https://infra.spec.whatwg.org/#noncharacter
function spread(args, classes_to_add) {
    const attributes = Object.assign({}, ...args);
    if (classes_to_add) {
        if (attributes.class == null) {
            attributes.class = classes_to_add;
        }
        else {
            attributes.class += ' ' + classes_to_add;
        }
    }
    let str = '';
    Object.keys(attributes).forEach(name => {
        if (invalid_attribute_name_character.test(name))
            return;
        const value = attributes[name];
        if (value === true)
            str += " " + name;
        else if (boolean_attributes.has(name.toLowerCase())) {
            if (value)
                str += " " + name;
        }
        else if (value != null) {
            str += ` ${name}="${String(value).replace(/"/g, '&#34;').replace(/'/g, '&#39;')}"`;
        }
    });
    return str;
}
const escaped = {
    '"': '&quot;',
    "'": '&#39;',
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};
function escape(html) {
    return String(html).replace(/["'&<>]/g, match => escaped[match]);
}
function validate_component(component, name) {
    if (!component || !component.$$render) {
        if (name === 'svelte:component')
            name += ' this={...}';
        throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
    }
    return component;
}
let on_destroy;
function create_ssr_component(fn) {
    function $$render(result, props, bindings, slots) {
        const parent_component = current_component;
        const $$ = {
            on_destroy,
            context: new Map(parent_component ? parent_component.$$.context : []),
            // these will be immediately discarded
            on_mount: [],
            before_update: [],
            after_update: [],
            callbacks: blank_object()
        };
        set_current_component({ $$ });
        const html = fn(result, props, bindings, slots);
        set_current_component(parent_component);
        return html;
    }
    return {
        render: (props = {}, options = {}) => {
            on_destroy = [];
            const result = { title: '', head: '', css: new Set() };
            const html = $$render(result, props, {}, options);
            run_all(on_destroy);
            return {
                html,
                css: {
                    code: Array.from(result.css).map(css => css.code).join('\n'),
                    map: null // TODO
                },
                head: result.title + result.head
            };
        },
        $$render
    };
}

function getDisabled(disabled) {
    return disabled ? 'disabled' : ''
}

/* src\SafeAnchor\SafeAnchor.svelte generated by Svelte v3.29.0 */

function isTrivialHref(href) {
	return !href || href.trim() === "#";
}

const SafeAnchor = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $$restProps = compute_rest_props($$props, ["href","role","disabled","tabindex"]);
	let { href } = $$props;
	let { role = "" } = $$props;
	let { disabled = false } = $$props;
	let { tabindex = "" } = $$props;
	delete $$restProps.class;
	const dispatch = createEventDispatcher();
	let props = { role, tabindex };

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

	const css = [$$props.class, getDisabled(disabled)].filter(Boolean).join(" ").trim();
	if ($$props.href === void 0 && $$bindings.href && href !== void 0) $$bindings.href(href);
	if ($$props.role === void 0 && $$bindings.role && role !== void 0) $$bindings.role(role);
	if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0) $$bindings.disabled(disabled);
	if ($$props.tabindex === void 0 && $$bindings.tabindex && tabindex !== void 0) $$bindings.tabindex(tabindex);
	return `<a${spread([{ class: escape(css) }, { href: escape(href) }, props, $$restProps])}>${slots.default ? slots.default({}) : ``}</a>`;
});

const SIZES = {
    'sm': 'btn-sm',
    'lg': 'btn-lg'
};

const VARIANTS = {
    'primary': 'btn-primary',
    'secondary': 'btn-secondary',
    'success': 'btn-success',
    'danger': 'btn-danger',
    'warning': 'btn-warning',
    'info': 'btn-info',
    'dark': 'btn-dark',
    'light': 'btn-light',
    'link': 'btn-link',
    'outline-primary': 'btn-outline-primary',
    'outline-secondary': 'btn-outline-secondary',
    'outline-success': 'btn-outline-success',
    'outline-danger': 'btn-outline-danger',
    'outline-warning': 'btn-outline-warning',
    'outline-info': 'btn-outline-info',
    'outline-dark': 'btn-outline-dark',
    'outline-light': 'btn-outline-light',
};

/**
 * @returns {string}
 */
function getButtonPrefix() {
    return 'btn';
}

/**
 * @param {string} size 
 * @returns {string}
 */
function getSize(size) {
    return SIZES[size] || '';
}

/**
 * @returns {string}
 */
function getBlock(block) {
    return block ? 'btn-block' : ''
}

/**
 * @returns {string}
 */
function getActive(active) {
    return active ? 'active' : ''
}

/**
 * @param {string} variant 
 * @returns {string}
 */
function getVariant(variant) {
    return VARIANTS[variant] || VARIANTS['primary'];
}

/* src\Button\Button.svelte generated by Svelte v3.29.0 */

const Button = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $$restProps = compute_rest_props($$props, ["variant","active","block","disabled","size","href","as","type"]);
	let { variant = "primary" } = $$props;
	let { active = false } = $$props;
	let { block = false } = $$props;
	let { disabled = false } = $$props;
	let { size = "" } = $$props;
	let { href = "" } = $$props;
	let { as = "" } = $$props;
	let { type = "button" } = $$props;

	const css = [
		getButtonPrefix(),
		getVariant(variant),
		getSize(size),
		getActive(active),
		getBlock(block),
		$$props.class
	].filter(Boolean).join(" ").trim();

	if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0) $$bindings.variant(variant);
	if ($$props.active === void 0 && $$bindings.active && active !== void 0) $$bindings.active(active);
	if ($$props.block === void 0 && $$bindings.block && block !== void 0) $$bindings.block(block);
	if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0) $$bindings.disabled(disabled);
	if ($$props.size === void 0 && $$bindings.size && size !== void 0) $$bindings.size(size);
	if ($$props.href === void 0 && $$bindings.href && href !== void 0) $$bindings.href(href);
	if ($$props.as === void 0 && $$bindings.as && as !== void 0) $$bindings.as(as);
	if ($$props.type === void 0 && $$bindings.type && type !== void 0) $$bindings.type(type);

	return `${href
	? `${validate_component(SafeAnchor, "SafeAnchor").$$render($$result, Object.assign({ href }, { class: css }, { disabled }, $$restProps), {}, {
			default: () => `${slots.default ? slots.default({}) : ``}`
		})}`
	: `${as === "input"
		? `<input${spread([
				{ class: escape(css) },
				{ type: escape(type) },
				{ disabled: disabled || null },
				$$restProps
			])}>`
		: `<button${spread([
				{ class: escape(css) },
				{ type: escape(type) },
				{ disabled: disabled || null },
				$$restProps
			])}>${slots.default ? slots.default({}) : ``}</button>`}`}`;
});

const VARIANTS$1 = {
    'primary': 'bg-primary',
    'secondary': 'bg-secondary',
    'success': 'bg-success',
    'danger': 'bg-danger',
    'warning': 'bg-warning',
    'info': 'bg-info',
    'light': 'bg-light',
    'dark': 'bg-dark'
};

function getVariant$1(variant) {
    return VARIANTS$1[variant] || VARIANTS$1.primary;
}

function getPill(pill) {
    return pill ? 'rounded-pill' : '';
}

function getBadgePrefix() {
    return 'badge';
}

/* src\Badge\Badge.svelte generated by Svelte v3.29.0 */

const Badge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $$restProps = compute_rest_props($$props, ["variant","pill"]);
	let { variant = "" } = $$props;
	let { pill = "" } = $$props;
	const css = [getBadgePrefix(), getVariant$1(variant), getPill(pill), $$props.class].filter(Boolean).join(" ").trim();
	if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0) $$bindings.variant(variant);
	if ($$props.pill === void 0 && $$bindings.pill && pill !== void 0) $$bindings.pill(pill);
	return `<span${spread([{ class: escape(css) }, $$restProps])}>${slots.default ? slots.default({}) : ``}</span>`;
});

const DISPLAY = {
    '1': 'display-1',
    '2': 'display-2',
    '3': 'display-3',
    '4': 'display-4',
    '5': 'display-5',
    '6': 'display-6',
};

function getDisplay(display) {
    return DISPLAY[display] || '';
}

/* src\Heading\H1.svelte generated by Svelte v3.29.0 */

const H1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $$restProps = compute_rest_props($$props, ["display"]);
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();
	if ($$props.display === void 0 && $$bindings.display && display !== void 0) $$bindings.display(display);
	return `<h1${spread([{ class: escape(css) }, $$restProps])}>${slots.default ? slots.default({}) : ``}</h1>`;
});

/* src\Heading\H2.svelte generated by Svelte v3.29.0 */

const H2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $$restProps = compute_rest_props($$props, ["display"]);
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();
	if ($$props.display === void 0 && $$bindings.display && display !== void 0) $$bindings.display(display);
	return `<h2${spread([{ class: escape(css) }, $$restProps])}>${slots.default ? slots.default({}) : ``}</h2>`;
});

/* src\Heading\H3.svelte generated by Svelte v3.29.0 */

const H3 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $$restProps = compute_rest_props($$props, ["display"]);
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();
	if ($$props.display === void 0 && $$bindings.display && display !== void 0) $$bindings.display(display);
	return `<h3${spread([{ class: escape(css) }, $$restProps])}>${slots.default ? slots.default({}) : ``}</h3>`;
});

/* src\Heading\H4.svelte generated by Svelte v3.29.0 */

const H4 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $$restProps = compute_rest_props($$props, ["display"]);
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();
	if ($$props.display === void 0 && $$bindings.display && display !== void 0) $$bindings.display(display);
	return `<h4${spread([{ class: escape(css) }, $$restProps])}>${slots.default ? slots.default({}) : ``}</h4>`;
});

/* src\Heading\H5.svelte generated by Svelte v3.29.0 */

const H5 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $$restProps = compute_rest_props($$props, ["display"]);
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();
	if ($$props.display === void 0 && $$bindings.display && display !== void 0) $$bindings.display(display);
	return `<h5${spread([{ class: escape(css) }, $$restProps])}>${slots.default ? slots.default({}) : ``}</h5>`;
});

/* src\Heading\H6.svelte generated by Svelte v3.29.0 */

const H6 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $$restProps = compute_rest_props($$props, ["display"]);
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();
	if ($$props.display === void 0 && $$bindings.display && display !== void 0) $$bindings.display(display);
	return `<h6${spread([{ class: escape(css) }, $$restProps])}>${slots.default ? slots.default({}) : ``}</h6>`;
});

const SvelteBootstrap = {
    Button,
    SafeAnchor,
    Badge,
    H1,
    H2,
    H3,
    H4,
    H5,
    H6
};

export { Badge, Button, H1, H2, H3, H4, H5, H6, SafeAnchor, SvelteBootstrap };
//# sourceMappingURL=index.mjs.map
