// MuContext is the evaluation environment for µ() interpolations and -µ:
// directives. Expressions are plain JavaScript, compiled once per source via
// new Function and evaluated against a scope that contains the skin
// variables ($), the color API and any user-defined helpers.

import { Lighten, Alpha, MixColors, AlphaValue, ParseColor, FormatColor } from "../api/Colors.mjs";

// Legacy PhPxUnit: numbers become "<n>px", everything else (e.g. calc()
// strings) passes through unchanged.
export function PxUnit(_value) {
	return typeof _value === "number" ? `${_value}px` : String(_value);
}

const BUILTINS = { Lighten, Alpha, MixColors, AlphaValue, ParseColor, FormatColor, PxUnit };

const compileCache = new Map();

function _Compile(_source, _scopeKeys) {
	const cacheKey = `${_scopeKeys.join(",")}\u0000${_source}`;
	let fn = compileCache.get(cacheKey);
	if (!fn) {
		try {
			// eslint-disable-next-line no-new-func
			fn = new Function(..._scopeKeys, `"use strict";\nreturn (${_source}\n);`);
		} catch (error) {
			// new Function reports the error without any source reference.
			throw new Error(`invalid JavaScript expression "${_source}" (${error.message})`, { cause: error });
		}
		compileCache.set(cacheKey, fn);
	}
	return fn;
}

export class MuContext {
	// _options.vars: skin variables, accessible as $.name
	// _options.helpers: user functions, accessible by their name
	constructor(_options = {}) {
		this.vars = _options.vars ?? {};
		this.helpers = _options.helpers ?? {};
	}

	// Evaluates a JavaScript expression. _extraScope adds (or overrides)
	// bindings for this single evaluation, e.g. rule-bound directive helpers.
	//
	// Helper functions (declared with "function", not arrows) are invoked
	// with "this" bound to the evaluation scope, so macros can use
	// this.AddProperty(...), this.InsertRule(...), this.rule, this.$ etc.
	// like the legacy µ.$.* functions used the µ globals. The binding also
	// survives indirect calls, e.g. afterWork hooks passed to Sprite().
	Evaluate(_source, _extraScope = {}) {
		const scope = { $: this.vars, ...BUILTINS, ...this.helpers, ..._extraScope };
		for (const key of Object.keys(this.helpers)) {
			const helper = this.helpers[key];
			if (typeof helper === "function" && scope[key] === helper) {
				scope[key] = function (..._args) { return helper.apply(scope, _args); };
			}
		}
		const keys = Object.keys(scope).filter((_key) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(_key));
		const fn = _Compile(_source, keys);
		return fn(...keys.map((_key) => scope[_key]));
	}
}
