function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
    const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function exclude_internal_props(props) {
    const result = {};
    for (const k in props)
        if (k[0] !== '$')
            result[k] = props[k];
    return result;
}
function compute_rest_props(props, keys) {
    const rest = {};
    keys = new Set(keys);
    for (const k in props)
        if (!keys.has(k) && k[0] !== '$')
            rest[k] = props[k];
    return rest;
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_attributes(node, attributes) {
    // @ts-ignore
    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    for (const key in attributes) {
        if (attributes[key] == null) {
            node.removeAttribute(key);
        }
        else if (key === 'style') {
            node.style.cssText = attributes[key];
        }
        else if (key === '__value') {
            node.value = node[key] = attributes[key];
        }
        else if (descriptors[key] && descriptors[key].set) {
            node[key] = attributes[key];
        }
        else {
            attr(node, key, attributes[key]);
        }
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function claim_element(nodes, name, attributes, svg) {
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node.nodeName === name) {
            let j = 0;
            const remove = [];
            while (j < node.attributes.length) {
                const attribute = node.attributes[j++];
                if (!attributes[attribute.name]) {
                    remove.push(attribute.name);
                }
            }
            for (let k = 0; k < remove.length; k++) {
                node.removeAttribute(remove[k]);
            }
            return nodes.splice(i, 1)[0];
        }
    }
    return svg ? svg_element(name) : element(name);
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
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        callbacks.slice().forEach(fn => fn(event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}
function create_component(block) {
    block && block.c();
}
function claim_component(block, parent_nodes) {
    block && block.l(parent_nodes);
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

function getDisabled(disabled) {
    return disabled ? 'disabled' : ''
}

/* src\SafeAnchor\SafeAnchor.svelte generated by Svelte v3.29.0 */

function create_fragment(ctx) {
	let a;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[10].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

	let a_levels = [
		{ class: /*css*/ ctx[4] },
		{ href: /*href*/ ctx[0] },
		/*props*/ ctx[1],
		/*$$restProps*/ ctx[5]
	];

	let a_data = {};

	for (let i = 0; i < a_levels.length; i += 1) {
		a_data = assign(a_data, a_levels[i]);
	}

	return {
		c() {
			a = element("a");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			a = claim_element(nodes, "A", { class: true, href: true });
			var a_nodes = children(a);
			if (default_slot) default_slot.l(a_nodes);
			a_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_attributes(a, a_data);
		},
		m(target, anchor) {
			insert(target, a, anchor);

			if (default_slot) {
				default_slot.m(a, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					listen(a, "keydown", /*handleKeyDown*/ ctx[3]),
					listen(a, "click", /*handleClick*/ ctx[2])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 512) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], dirty, null, null);
				}
			}

			set_attributes(a, a_data = get_spread_update(a_levels, [
				{ class: /*css*/ ctx[4] },
				(!current || dirty & /*href*/ 1) && { href: /*href*/ ctx[0] },
				dirty & /*props*/ 2 && /*props*/ ctx[1],
				dirty & /*$$restProps*/ 32 && /*$$restProps*/ ctx[5]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(a);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function isTrivialHref(href) {
	return !href || href.trim() === "#";
}

function instance($$self, $$props, $$invalidate) {
	const omit_props_names = ["href","role","disabled","tabindex"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { href } = $$props;
	let { role = "" } = $$props;
	let { disabled = false } = $$props;
	let { tabindex = "" } = $$props;
	delete $$restProps.class;
	const dispatch = createEventDispatcher();
	const click = () => dispatch("click");
	let props = { role, tabindex };

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

	const css = [$$props.class, getDisabled(disabled)].filter(Boolean).join(" ").trim();

	$$self.$$set = $$new_props => {
		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		$$invalidate(5, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("href" in $$new_props) $$invalidate(0, href = $$new_props.href);
		if ("role" in $$new_props) $$invalidate(6, role = $$new_props.role);
		if ("disabled" in $$new_props) $$invalidate(7, disabled = $$new_props.disabled);
		if ("tabindex" in $$new_props) $$invalidate(8, tabindex = $$new_props.tabindex);
		if ("$$scope" in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);

	return [
		href,
		props,
		handleClick,
		handleKeyDown,
		css,
		$$restProps,
		role,
		disabled,
		tabindex,
		$$scope,
		slots
	];
}

class SafeAnchor extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance, create_fragment, safe_not_equal, {
			href: 0,
			role: 6,
			disabled: 7,
			tabindex: 8
		});
	}
}

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

function create_else_block(ctx) {
	let button;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[10].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], null);

	let button_levels = [
		{ class: /*css*/ ctx[4] },
		{ type: /*type*/ ctx[3] },
		{ disabled: /*disabled*/ ctx[0] },
		/*$$restProps*/ ctx[5]
	];

	let button_data = {};

	for (let i = 0; i < button_levels.length; i += 1) {
		button_data = assign(button_data, button_levels[i]);
	}

	return {
		c() {
			button = element("button");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			button = claim_element(nodes, "BUTTON", { class: true, type: true, disabled: true });
			var button_nodes = children(button);
			if (default_slot) default_slot.l(button_nodes);
			button_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_attributes(button, button_data);
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (default_slot) {
				default_slot.m(button, null);
			}

			current = true;

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler_2*/ ctx[12]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 16384) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[14], dirty, null, null);
				}
			}

			set_attributes(button, button_data = get_spread_update(button_levels, [
				{ class: /*css*/ ctx[4] },
				(!current || dirty & /*type*/ 8) && { type: /*type*/ ctx[3] },
				(!current || dirty & /*disabled*/ 1) && { disabled: /*disabled*/ ctx[0] },
				dirty & /*$$restProps*/ 32 && /*$$restProps*/ ctx[5]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

// (36:25) 
function create_if_block_1(ctx) {
	let input;
	let mounted;
	let dispose;

	let input_levels = [
		{ class: /*css*/ ctx[4] },
		{ type: /*type*/ ctx[3] },
		{ disabled: /*disabled*/ ctx[0] },
		/*$$restProps*/ ctx[5]
	];

	let input_data = {};

	for (let i = 0; i < input_levels.length; i += 1) {
		input_data = assign(input_data, input_levels[i]);
	}

	return {
		c() {
			input = element("input");
			this.h();
		},
		l(nodes) {
			input = claim_element(nodes, "INPUT", { class: true, type: true, disabled: true });
			this.h();
		},
		h() {
			set_attributes(input, input_data);
		},
		m(target, anchor) {
			insert(target, input, anchor);

			if (!mounted) {
				dispose = listen(input, "click", /*click_handler_1*/ ctx[11]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			set_attributes(input, input_data = get_spread_update(input_levels, [
				{ class: /*css*/ ctx[4] },
				dirty & /*type*/ 8 && { type: /*type*/ ctx[3] },
				dirty & /*disabled*/ 1 && { disabled: /*disabled*/ ctx[0] },
				dirty & /*$$restProps*/ 32 && /*$$restProps*/ ctx[5]
			]));
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(input);
			mounted = false;
			dispose();
		}
	};
}

// (32:0) {#if href}
function create_if_block(ctx) {
	let safeanchor;
	let current;

	const safeanchor_spread_levels = [
		{ href: /*href*/ ctx[1] },
		{ class: /*css*/ ctx[4] },
		{ disabled: /*disabled*/ ctx[0] },
		/*$$restProps*/ ctx[5]
	];

	let safeanchor_props = {
		$$slots: { default: [create_default_slot] },
		$$scope: { ctx }
	};

	for (let i = 0; i < safeanchor_spread_levels.length; i += 1) {
		safeanchor_props = assign(safeanchor_props, safeanchor_spread_levels[i]);
	}

	safeanchor = new SafeAnchor({ props: safeanchor_props });
	safeanchor.$on("click", /*click_handler*/ ctx[13]);

	return {
		c() {
			create_component(safeanchor.$$.fragment);
		},
		l(nodes) {
			claim_component(safeanchor.$$.fragment, nodes);
		},
		m(target, anchor) {
			mount_component(safeanchor, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const safeanchor_changes = (dirty & /*href, css, disabled, $$restProps*/ 51)
			? get_spread_update(safeanchor_spread_levels, [
					dirty & /*href*/ 2 && { href: /*href*/ ctx[1] },
					dirty & /*css*/ 16 && { class: /*css*/ ctx[4] },
					dirty & /*disabled*/ 1 && { disabled: /*disabled*/ ctx[0] },
					dirty & /*$$restProps*/ 32 && get_spread_object(/*$$restProps*/ ctx[5])
				])
			: {};

			if (dirty & /*$$scope*/ 16384) {
				safeanchor_changes.$$scope = { dirty, ctx };
			}

			safeanchor.$set(safeanchor_changes);
		},
		i(local) {
			if (current) return;
			transition_in(safeanchor.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(safeanchor.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(safeanchor, detaching);
		}
	};
}

// (33:4) <SafeAnchor on:click {href} class={css} {disabled} {...$$restProps}>
function create_default_slot(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[10].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		l(nodes) {
			if (default_slot) default_slot.l(nodes);
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 16384) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[14], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block, create_if_block_1, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*href*/ ctx[1]) return 0;
		if (/*as*/ ctx[2] === "input") return 1;
		return 2;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		l(nodes) {
			if_block.l(nodes);
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if_blocks[current_block_type_index].d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	const omit_props_names = ["variant","active","block","disabled","size","href","as","type"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
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

	function click_handler_1(event) {
		bubble($$self, event);
	}

	function click_handler_2(event) {
		bubble($$self, event);
	}

	function click_handler(event) {
		bubble($$self, event);
	}

	$$self.$$set = $$new_props => {
		$$invalidate(15, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		$$invalidate(5, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("variant" in $$new_props) $$invalidate(6, variant = $$new_props.variant);
		if ("active" in $$new_props) $$invalidate(7, active = $$new_props.active);
		if ("block" in $$new_props) $$invalidate(8, block = $$new_props.block);
		if ("disabled" in $$new_props) $$invalidate(0, disabled = $$new_props.disabled);
		if ("size" in $$new_props) $$invalidate(9, size = $$new_props.size);
		if ("href" in $$new_props) $$invalidate(1, href = $$new_props.href);
		if ("as" in $$new_props) $$invalidate(2, as = $$new_props.as);
		if ("type" in $$new_props) $$invalidate(3, type = $$new_props.type);
		if ("$$scope" in $$new_props) $$invalidate(14, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);

	return [
		disabled,
		href,
		as,
		type,
		css,
		$$restProps,
		variant,
		active,
		block,
		size,
		slots,
		click_handler_1,
		click_handler_2,
		click_handler,
		$$scope
	];
}

class Button extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
			variant: 6,
			active: 7,
			block: 8,
			disabled: 0,
			size: 9,
			href: 1,
			as: 2,
			type: 3
		});
	}
}

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

function create_fragment$2(ctx) {
	let span;
	let current;
	const default_slot_template = /*#slots*/ ctx[5].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
	let span_levels = [{ class: /*css*/ ctx[0] }, /*$$restProps*/ ctx[1]];
	let span_data = {};

	for (let i = 0; i < span_levels.length; i += 1) {
		span_data = assign(span_data, span_levels[i]);
	}

	return {
		c() {
			span = element("span");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			span = claim_element(nodes, "SPAN", { class: true });
			var span_nodes = children(span);
			if (default_slot) default_slot.l(span_nodes);
			span_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_attributes(span, span_data);
		},
		m(target, anchor) {
			insert(target, span, anchor);

			if (default_slot) {
				default_slot.m(span, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 16) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
				}
			}

			set_attributes(span, span_data = get_spread_update(span_levels, [
				{ class: /*css*/ ctx[0] },
				dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(span);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	const omit_props_names = ["variant","pill"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { variant = "" } = $$props;
	let { pill = "" } = $$props;
	const css = [getBadgePrefix(), getVariant$1(variant), getPill(pill), $$props.class].filter(Boolean).join(" ").trim();

	$$self.$$set = $$new_props => {
		$$invalidate(6, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("variant" in $$new_props) $$invalidate(2, variant = $$new_props.variant);
		if ("pill" in $$new_props) $$invalidate(3, pill = $$new_props.pill);
		if ("$$scope" in $$new_props) $$invalidate(4, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);
	return [css, $$restProps, variant, pill, $$scope, slots];
}

class Badge extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { variant: 2, pill: 3 });
	}
}

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

function create_fragment$3(ctx) {
	let h1;
	let current;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
	let h1_levels = [{ class: /*css*/ ctx[0] }, /*$$restProps*/ ctx[1]];
	let h1_data = {};

	for (let i = 0; i < h1_levels.length; i += 1) {
		h1_data = assign(h1_data, h1_levels[i]);
	}

	return {
		c() {
			h1 = element("h1");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			h1 = claim_element(nodes, "H1", { class: true });
			var h1_nodes = children(h1);
			if (default_slot) default_slot.l(h1_nodes);
			h1_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_attributes(h1, h1_data);
		},
		m(target, anchor) {
			insert(target, h1, anchor);

			if (default_slot) {
				default_slot.m(h1, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}

			set_attributes(h1, h1_data = get_spread_update(h1_levels, [
				{ class: /*css*/ ctx[0] },
				dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h1);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	const omit_props_names = ["display"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();

	$$self.$$set = $$new_props => {
		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("display" in $$new_props) $$invalidate(2, display = $$new_props.display);
		if ("$$scope" in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);
	return [css, $$restProps, display, $$scope, slots];
}

class H1 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { display: 2 });
	}
}

/* src\Heading\H2.svelte generated by Svelte v3.29.0 */

function create_fragment$4(ctx) {
	let h2;
	let current;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
	let h2_levels = [{ class: /*css*/ ctx[0] }, /*$$restProps*/ ctx[1]];
	let h2_data = {};

	for (let i = 0; i < h2_levels.length; i += 1) {
		h2_data = assign(h2_data, h2_levels[i]);
	}

	return {
		c() {
			h2 = element("h2");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			h2 = claim_element(nodes, "H2", { class: true });
			var h2_nodes = children(h2);
			if (default_slot) default_slot.l(h2_nodes);
			h2_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_attributes(h2, h2_data);
		},
		m(target, anchor) {
			insert(target, h2, anchor);

			if (default_slot) {
				default_slot.m(h2, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}

			set_attributes(h2, h2_data = get_spread_update(h2_levels, [
				{ class: /*css*/ ctx[0] },
				dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h2);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	const omit_props_names = ["display"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();

	$$self.$$set = $$new_props => {
		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("display" in $$new_props) $$invalidate(2, display = $$new_props.display);
		if ("$$scope" in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);
	return [css, $$restProps, display, $$scope, slots];
}

class H2 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$4, create_fragment$4, safe_not_equal, { display: 2 });
	}
}

/* src\Heading\H3.svelte generated by Svelte v3.29.0 */

function create_fragment$5(ctx) {
	let h3;
	let current;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
	let h3_levels = [{ class: /*css*/ ctx[0] }, /*$$restProps*/ ctx[1]];
	let h3_data = {};

	for (let i = 0; i < h3_levels.length; i += 1) {
		h3_data = assign(h3_data, h3_levels[i]);
	}

	return {
		c() {
			h3 = element("h3");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			h3 = claim_element(nodes, "H3", { class: true });
			var h3_nodes = children(h3);
			if (default_slot) default_slot.l(h3_nodes);
			h3_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_attributes(h3, h3_data);
		},
		m(target, anchor) {
			insert(target, h3, anchor);

			if (default_slot) {
				default_slot.m(h3, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}

			set_attributes(h3, h3_data = get_spread_update(h3_levels, [
				{ class: /*css*/ ctx[0] },
				dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h3);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	const omit_props_names = ["display"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();

	$$self.$$set = $$new_props => {
		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("display" in $$new_props) $$invalidate(2, display = $$new_props.display);
		if ("$$scope" in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);
	return [css, $$restProps, display, $$scope, slots];
}

class H3 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, create_fragment$5, safe_not_equal, { display: 2 });
	}
}

/* src\Heading\H4.svelte generated by Svelte v3.29.0 */

function create_fragment$6(ctx) {
	let h4;
	let current;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
	let h4_levels = [{ class: /*css*/ ctx[0] }, /*$$restProps*/ ctx[1]];
	let h4_data = {};

	for (let i = 0; i < h4_levels.length; i += 1) {
		h4_data = assign(h4_data, h4_levels[i]);
	}

	return {
		c() {
			h4 = element("h4");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			h4 = claim_element(nodes, "H4", { class: true });
			var h4_nodes = children(h4);
			if (default_slot) default_slot.l(h4_nodes);
			h4_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_attributes(h4, h4_data);
		},
		m(target, anchor) {
			insert(target, h4, anchor);

			if (default_slot) {
				default_slot.m(h4, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}

			set_attributes(h4, h4_data = get_spread_update(h4_levels, [
				{ class: /*css*/ ctx[0] },
				dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h4);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	const omit_props_names = ["display"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();

	$$self.$$set = $$new_props => {
		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("display" in $$new_props) $$invalidate(2, display = $$new_props.display);
		if ("$$scope" in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);
	return [css, $$restProps, display, $$scope, slots];
}

class H4 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$6, create_fragment$6, safe_not_equal, { display: 2 });
	}
}

/* src\Heading\H5.svelte generated by Svelte v3.29.0 */

function create_fragment$7(ctx) {
	let h5;
	let current;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
	let h5_levels = [{ class: /*css*/ ctx[0] }, /*$$restProps*/ ctx[1]];
	let h5_data = {};

	for (let i = 0; i < h5_levels.length; i += 1) {
		h5_data = assign(h5_data, h5_levels[i]);
	}

	return {
		c() {
			h5 = element("h5");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			h5 = claim_element(nodes, "H5", { class: true });
			var h5_nodes = children(h5);
			if (default_slot) default_slot.l(h5_nodes);
			h5_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_attributes(h5, h5_data);
		},
		m(target, anchor) {
			insert(target, h5, anchor);

			if (default_slot) {
				default_slot.m(h5, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}

			set_attributes(h5, h5_data = get_spread_update(h5_levels, [
				{ class: /*css*/ ctx[0] },
				dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h5);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$7($$self, $$props, $$invalidate) {
	const omit_props_names = ["display"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();

	$$self.$$set = $$new_props => {
		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("display" in $$new_props) $$invalidate(2, display = $$new_props.display);
		if ("$$scope" in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);
	return [css, $$restProps, display, $$scope, slots];
}

class H5 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$7, create_fragment$7, safe_not_equal, { display: 2 });
	}
}

/* src\Heading\H6.svelte generated by Svelte v3.29.0 */

function create_fragment$8(ctx) {
	let h6;
	let current;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);
	let h6_levels = [{ class: /*css*/ ctx[0] }, /*$$restProps*/ ctx[1]];
	let h6_data = {};

	for (let i = 0; i < h6_levels.length; i += 1) {
		h6_data = assign(h6_data, h6_levels[i]);
	}

	return {
		c() {
			h6 = element("h6");
			if (default_slot) default_slot.c();
			this.h();
		},
		l(nodes) {
			h6 = claim_element(nodes, "H6", { class: true });
			var h6_nodes = children(h6);
			if (default_slot) default_slot.l(h6_nodes);
			h6_nodes.forEach(detach);
			this.h();
		},
		h() {
			set_attributes(h6, h6_data);
		},
		m(target, anchor) {
			insert(target, h6, anchor);

			if (default_slot) {
				default_slot.m(h6, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}

			set_attributes(h6, h6_data = get_spread_update(h6_levels, [
				{ class: /*css*/ ctx[0] },
				dirty & /*$$restProps*/ 2 && /*$$restProps*/ ctx[1]
			]));
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h6);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$8($$self, $$props, $$invalidate) {
	const omit_props_names = ["display"];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	let { display = "" } = $$props;
	const css = [getDisplay(display), $$props.class].filter(Boolean).join(" ").trim();

	$$self.$$set = $$new_props => {
		$$invalidate(5, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
		$$invalidate(1, $$restProps = compute_rest_props($$props, omit_props_names));
		if ("display" in $$new_props) $$invalidate(2, display = $$new_props.display);
		if ("$$scope" in $$new_props) $$invalidate(3, $$scope = $$new_props.$$scope);
	};

	$$props = exclude_internal_props($$props);
	return [css, $$restProps, display, $$scope, slots];
}

class H6 extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$8, create_fragment$8, safe_not_equal, { display: 2 });
	}
}

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
