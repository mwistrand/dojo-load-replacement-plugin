const fs = require('fs');
const path = require('path');
const NormalModuleReplacementPlugin = require('webpack/lib/NormalModuleReplacementPlugin');
const RawSource = require('webpack-core/lib/RawSource');

const filename = path.join(__dirname, 'context-require.js');
function writeTempFile(key) {
	const template = `var map = [${key}];
		module.exports = function (ignoredRequire, paths, callback) {
			var modules = paths.map(function (path) {
				return __webpack_require__(map[path]);
			});
			callback(modules);
		};`;
	fs.writeFileSync(filename, template);
}

function DojoLoadReplacementPlugin(options) {
	this.context = options && options.context || 'node_modules/dojo';
	this.coreLoadPattern = options.coreLoadPattern || /^dojo-core\/load$/;
}

DojoLoadReplacementPlugin.prototype.apply = function (compiler) {
	const { context } = this;
	const mapReplaceKey = `dojo-module-id-map-${Date.now()}`;
	writeTempFile(mapReplaceKey);

	compiler.apply(
		new NormalModuleReplacementPlugin(this.coreLoadPattern, filename)
	);

	compiler.plugin('compilation', (compilation) => {
		let map;
		compilation.plugin('after-optimize-module-ids', (modules) => {
			map = modules.reduce((map, module) => {
				const { id, rawRequest } = module;
				map[rawRequest] = id;
				return map;
			}, {});
		});

		compilation.moduleTemplate.plugin('module', (source, module) => {
			if (module.request.indexOf('context-require') > -1) {
				const modified = source.source().replace(`[${mapReplaceKey}]`, JSON.stringify(map));
				return new RawSource(modified);
			}

			return source;
		});
	});

	compiler.plugin('done', () => {
		fs.unlinkSync(filename);
	});

	compiler.parser.apply(
		function () {
			const parser = this;
			parser.plugin('expression require', () => {
				const request = this.state.current.request;

				// Limit the replacement to just the Dojo modules.
				if (request.indexOf(context) > -1) {
					return false;
				}
			});
		}
	);
};

module.exports = DojoLoadReplacementPlugin;
