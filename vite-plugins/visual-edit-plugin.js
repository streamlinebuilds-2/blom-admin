import { parse } from '@babel/parser';
import { default as traverse } from '@babel/traverse';
import { default as generate } from '@babel/generator';
import * as t from '@babel/types';


// Helper function to check if JSX element contains dynamic content
function checkIfElementHasDynamicContent(jsxElement) {
	let hasDynamicContent = false;

	// Helper function to check if any node contains dynamic patterns
	function checkNodeForDynamicContent(node) {
		// JSX expressions like {variable}, {func()}, {obj.prop}
		if (t.isJSXExpressionContainer(node)) {
			const expression = node.expression;

			// Skip empty expressions {}
			if (t.isJSXEmptyExpression(expression)) {
				return false;
			}

			// Any non-literal expression is considered dynamic
			if (!t.isLiteral(expression)) {
				return true;
			}
		}

		// Template literals with expressions `Hello ${name}`
		if (t.isTemplateLiteral(node) && node.expressions.length > 0) {
			return true;
		}

		// Member expressions like props.title, state.value
		if (t.isMemberExpression(node)) {
			return true;
		}

		// Function calls like getData(), format()
		if (t.isCallExpression(node)) {
			return true;
		}

		// Conditional expressions like condition ? "yes" : "no"
		if (t.isConditionalExpression(node)) {
			return true;
		}

		// Identifier references (could be props, state, variables)
		if (t.isIdentifier(node)) {
			// Common dynamic identifiers
			const dynamicNames = ['props', 'state', 'data', 'item', 'value', 'text', 'content'];
			if (dynamicNames.some(name => node.name.includes(name))) {
				return true;
			}
		}

		return false;
	}

	// Recursively traverse all child nodes
	function traverseNode(node) {
		if (checkNodeForDynamicContent(node)) {
			hasDynamicContent = true;
			return;
		}

		// Recursively check child nodes
		Object.keys(node).forEach(key => {
			const value = node[key];

			if (Array.isArray(value)) {
				value.forEach(child => {
					if (child && typeof child === 'object' && child.type) {
						traverseNode(child);
					}
				});
			} else if (value && typeof value === 'object' && value.type) {
				traverseNode(value);
			}
		});
	}

	// Check all children of the JSX element
	jsxElement.children.forEach(child => {
		if (hasDynamicContent) return; // Early exit if already found dynamic content
		traverseNode(child);
	});

	return hasDynamicContent;
}

export function visualEditPlugin() {
	return {
		name: 'visual-edit-transform',
		enforce: 'pre',
		order: 'pre',
		// Inject Tailwind CDN for visual editing capabilities
		transformIndexHtml(html) {
			// Inject the Tailwind CSS CDN script right before the closing </head> tag
			const tailwindScript = `    <!-- Tailwind CSS CDN for visual editing -->\n    <script src="https://cdn.tailwindcss.com"></script>\n  `;
			return html.replace('</head>', tailwindScript + '</head>');
		},
		transform(code, id) {
			// Skip node_modules and visual-edit-agent itself
			if (id.includes('node_modules') || id.includes('visual-edit-agent')) {
				return null;
			}

			// Process JS/JSX/TS/TSX files
			if (!id.match(/\.(jsx?|tsx?)$/)) {
				return null;
			}

			console.log(`[Visual Edit Plugin] Processing file: ${id}`);

			// Extract filename from path, preserving pages/ or components/ structure
			const pathParts = id.split('/');
			let filename;

			// Check if this is a pages or components file
			if (id.includes('/pages/')) {
				const pagesIndex = pathParts.findIndex(part => part === 'pages');
				if (pagesIndex >= 0 && pagesIndex < pathParts.length - 1) {
					// Get all parts from 'pages' to the file, preserving nested structure
					const relevantParts = pathParts.slice(pagesIndex, pathParts.length);
					const lastPart = relevantParts[relevantParts.length - 1];
					// Remove file extension from the last part
					relevantParts[relevantParts.length - 1] = lastPart.includes('.') ? lastPart.split('.')[0] : lastPart;
					filename = relevantParts.join('/');
				} else {
					filename = pathParts[pathParts.length - 1];
					if (filename.includes('.')) {
						filename = filename.split('.')[0];
					}
				}
			} else if (id.includes('/components/')) {
				const componentsIndex = pathParts.findIndex(part => part === 'components');
				if (componentsIndex >= 0 && componentsIndex < pathParts.length - 1) {
					// Get all parts from 'components' to the file, preserving nested structure
					const relevantParts = pathParts.slice(componentsIndex, pathParts.length);
					const lastPart = relevantParts[relevantParts.length - 1];
					// Remove file extension from the last part
					relevantParts[relevantParts.length - 1] = lastPart.includes('.') ? lastPart.split('.')[0] : lastPart;
					filename = relevantParts.join('/');
				} else {
					filename = pathParts[pathParts.length - 1];
					if (filename.includes('.')) {
						filename = filename.split('.')[0];
					}
				}
			} else {
				// For other files (like layout), just use the filename
				filename = pathParts[pathParts.length - 1];
				if (filename.includes('.')) {
					filename = filename.split('.')[0];
				}
			}

			try {
				// Parse the code into an AST
				const ast = parse(code, {
					sourceType: 'module',
					plugins: [
						'jsx',
						'typescript',
						'decorators-legacy',
						'classProperties',
						'objectRestSpread',
						'functionBind',
						'exportDefaultFrom',
						'exportNamespaceFrom',
						'dynamicImport',
						'nullishCoalescingOperator',
						'optionalChaining',
						'asyncGenerators',
						'bigInt',
						'optionalCatchBinding',
						'throwExpressions'
					],
				});

				// Traverse the AST and add source location and dynamic content attributes to JSX elements
				let elementsProcessed = 0;
				traverse.default(ast, {
					JSXElement(path) {
						const jsxElement = path.node;
						const openingElement = jsxElement.openingElement;

						// Skip fragments
						if (t.isJSXFragment(jsxElement)) return;

						// Skip if already has source location attribute
						const hasSourceLocation = openingElement.attributes.some(attr =>
							t.isJSXAttribute(attr) &&
							t.isJSXIdentifier(attr.name) &&
							attr.name.name === 'data-source-location'
						);

						if (hasSourceLocation) return;

						// Get line and column from AST node location
						const { line, column } = openingElement.loc?.start || { line: 1, column: 0 };

						// Create the source location attribute
						const sourceLocationAttr = t.jsxAttribute(
							t.jsxIdentifier('data-source-location'),
							t.stringLiteral(`${filename}:${line}:${column}`)
						);

						// Check if element has dynamic content
						const isDynamic = checkIfElementHasDynamicContent(jsxElement);

						// Create the dynamic content attribute
						const dynamicContentAttr = t.jsxAttribute(
							t.jsxIdentifier('data-dynamic-content'),
							t.stringLiteral(isDynamic ? 'true' : 'false')
						);

						// Add both attributes to the beginning of the attributes array
						openingElement.attributes.unshift(sourceLocationAttr, dynamicContentAttr);
						elementsProcessed++;
					}
				});

				// Generate the code back from the AST
				const result = generate.default(ast, {
					compact: false,
					concise: false,
					retainLines: true
				});

				console.log(`[Visual Edit Plugin] Successfully transformed ${id} - processed ${elementsProcessed} JSX elements`);

				return {
					code: result.code,
					map: null
				};

			} catch (error) {
				console.error('Failed to add source location to JSX:', error);
				return {
					code: code, // Return original code on failure
					map: null
				};
			}
		}
	};
}