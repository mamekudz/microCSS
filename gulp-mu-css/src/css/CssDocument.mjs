// CssDocument wraps a PostCSS AST and provides the manipulation API used by
// Gulp pipelines and µ-directives: finding rules by selector path, adding and
// changing properties, and a plain JSON representation (docs/CONCEPT.md,
// sections 3 and 4).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import postcss from "postcss";

// Collapses whitespace so that "div.a >  span" matches "div.a > span".
function _NormalizeSelector(_selector) {
	return _selector.replace(/\s+/g, " ").trim();
}

// Display selector of a node: rules use their selector, at-rules the
// "@name params" form (e.g. "@keyframes spin", "@media (max-width: 600px)").
function _NodeSelector(_node) {
	if (_node.type === "rule") return _NormalizeSelector(_node.selector);
	if (_node.type === "atrule") return _NormalizeSelector(`@${_node.name} ${_node.params}`.trim());
	return "";
}

function _Matches(_node, _matcher) {
	const selector = _NodeSelector(_node);
	if (_matcher instanceof RegExp) return _matcher.test(selector);
	return selector === _NormalizeSelector(String(_matcher));
}

// Wrapper around a PostCSS rule or at-rule node.
export class CssRule {
	constructor(_node) {
		this.node = _node;
	}

	get selector() {
		return _NodeSelector(this.node);
	}

	set selector(_value) {
		if (this.node.type === "rule") this.node.selector = _value;
		else throw new Error("CssRule: cannot set the selector of an at-rule");
	}

	// Returns the value of the first declaration with the given property
	// name, or null if not present.
	GetProperty(_prop) {
		let value = null;
		this.node.each((_child) => {
			if (_child.type === "decl" && _child.prop === _prop && value === null) value = _child.value;
		});
		return value;
	}

	// Appends a declaration (duplicates allowed, like the legacy AddProperty).
	AddProperty(_prop, _value, _important = false) {
		this.node.append({ prop: _prop, value: String(_value), important: _important });
		return this;
	}

	// Changes all declarations with the given property, or appends one if the
	// property does not exist yet.
	ChangeProperty(_prop, _value, _important = false) {
		let found = false;
		this.node.each((_child) => {
			if (_child.type === "decl" && _child.prop === _prop) {
				_child.value = String(_value);
				_child.important = _important;
				found = true;
			}
		});
		if (!found) this.AddProperty(_prop, _value, _important);
		return this;
	}

	// Removes all declarations with the given property name.
	RemoveProperty(_prop) {
		const doomed = [];
		this.node.each((_child) => {
			if (_child.type === "decl" && _child.prop === _prop) doomed.push(_child);
		});
		doomed.forEach((_child) => _child.remove());
		return this;
	}

	// All declarations as { prop, value, important } objects.
	GetProperties() {
		const result = [];
		this.node.each((_child) => {
			if (_child.type === "decl") result.push({ prop: _child.prop, value: _child.value, important: !!_child.important });
		});
		return result;
	}

	// Finds the first direct or nested child rule matching the selector path
	// (one argument per nesting level), e.g. FindRule("50%") inside keyframes.
	FindRule(..._path) {
		return _FindByPath(this.node, _path);
	}

	// All child rules (recursive) matching the selector or regex.
	FindRules(_matcher) {
		return _FindAll(this.node, _matcher);
	}

	// Adds a nested rule and returns its wrapper.
	AddRule(_selector) {
		const rule = postcss.rule({ selector: _selector });
		this.node.append(rule);
		return new CssRule(rule);
	}

	Remove() {
		this.node.remove();
	}
}

function _FindByPath(_container, _path) {
	let current = _container;
	for (const segment of _path) {
		let next = null;
		current.each((_child) => {
			if (next) return;
			if ((_child.type === "rule" || _child.type === "atrule") && _Matches(_child, segment)) next = _child;
		});
		if (!next) return null;
		current = next;
	}
	return current === _container ? null : new CssRule(current);
}

function _FindAll(_container, _matcher) {
	const result = [];
	_container.walkRules((_node) => {
		if (_Matches(_node, _matcher)) result.push(new CssRule(_node));
	});
	_container.walkAtRules((_node) => {
		if (_Matches(_node, _matcher)) result.push(new CssRule(_node));
	});
	return result;
}

// ------------------------------------------------------ JSON representation

function _NodeToJson(_node) {
	switch (_node.type) {
		case "rule":
			return { type: "rule", selector: _node.selector, nodes: _node.nodes.map(_NodeToJson) };
		case "atrule":
			return {
				type: "atrule",
				name: _node.name,
				params: _node.params,
				...(_node.nodes ? { nodes: _node.nodes.map(_NodeToJson) } : {})
			};
		case "decl":
			return { type: "decl", prop: _node.prop, value: _node.value, ...(_node.important ? { important: true } : {}) };
		case "comment":
			return { type: "comment", text: _node.text };
		default:
			throw new Error(`CssDocument.ToJson: unsupported node type "${_node.type}"`);
	}
}

function _NodeFromJson(_json) {
	switch (_json.type) {
		case "rule": {
			const rule = postcss.rule({ selector: _json.selector });
			(_json.nodes || []).forEach((_child) => rule.append(_NodeFromJson(_child)));
			return rule;
		}
		case "atrule": {
			const atrule = postcss.atRule({ name: _json.name, params: _json.params || "" });
			if (_json.nodes) {
				atrule.nodes = [];
				_json.nodes.forEach((_child) => atrule.append(_NodeFromJson(_child)));
			}
			return atrule;
		}
		case "decl":
			return postcss.decl({ prop: _json.prop, value: _json.value, important: !!_json.important });
		case "comment":
			return postcss.comment({ text: _json.text });
		default:
			throw new Error(`CssDocument.FromJson: unsupported node type "${_json.type}"`);
	}
}

// ------------------------------------------------------------- document

export class CssDocument {
	constructor(_root) {
		this.root = _root;
	}

	static FromString(_css, _options = {}) {
		return new CssDocument(postcss.parse(_css, { from: _options.from }));
	}

	static async FromFile(_path) {
		const css = await readFile(_path, "utf8");
		return CssDocument.FromString(css, { from: _path });
	}

	static FromJson(_json) {
		const root = postcss.root();
		(_json.nodes || []).forEach((_child) => root.append(_NodeFromJson(_child)));
		return new CssDocument(root);
	}

	// First top-level (or nested, via path segments) rule matching the path.
	FindRule(..._path) {
		return _FindByPath(this.root, _path);
	}

	// All rules and at-rules (recursive) matching the selector or regex.
	FindRules(_matcher) {
		return _FindAll(this.root, _matcher);
	}

	// Adds a top-level rule and returns its wrapper. By default the rule is
	// appended; _options.after (a CssRule) inserts it behind an existing rule
	// instead, which keeps generated rules near their source position.
	AddRule(_selector, _options = {}) {
		const rule = postcss.rule({ selector: _selector });
		// Insert into the anchor's container so the position also holds for
		// rules nested in at-rules (e.g. inside @media).
		if (_options.after) _options.after.node.parent.insertAfter(_options.after.node, rule);
		else this.root.append(rule);
		return new CssRule(rule);
	}

	ToJson() {
		return { type: "root", nodes: this.root.nodes.map(_NodeToJson) };
	}

	ToCss() {
		return this.root.toString();
	}

	async ToFile(_path, _transform) {
		await mkdir(dirname(_path), { recursive: true });
		const css = this.ToCss();
		await writeFile(_path, _transform ? _transform(css) : css, "utf8");
	}
}
