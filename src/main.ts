import WeakMap from 'dojo-shim/WeakMap';
import * as fs from 'fs';
import * as path from 'path';
import * as NormalModuleReplacementPlugin from 'webpack/lib/NormalModuleReplacementPlugin';
import * as RawSource from 'webpack-core/lib/RawSource';

export interface DojoLoadReplacementPluginOptions {
	context: Resource | Resource[];
	resource: Resource;
	tempDirectory?: string;
}

interface PathModuleIdMap {
	[path: string]: number;
}

interface InstanceProperties {
	resource: Resource;
}

export type Resource = string | RegExp;

function matchRequest(this: DojoLoadReplacementPlugin, request: string): boolean {
	const context = Array.isArray(this.context) ? this.context : [ this.context ];

	return context.some((context: Resource) => {
		return typeof context === 'string' ? request.indexOf(context) > -1 : context.test(request);
	});
}

function writeTempFile(tempDirectory: string, timestamp: number): string {
	const timeString = String(timestamp);
	const key = `dojo-module-id-map-${timeString}`;
	const filename = path.join(tempDirectory, `dojo-core-load.${timeString}.js`);
	const template = `var map = [${key}];
		var slice = Array.prototype.slice;
		exports.default = function (ignoredRequire) {
			var paths = slice.call(arguments, 1);
			var modules = paths.map(function (path) {
				return __webpack_require__(map[path]);
			});

			return typeof Promise !== 'undefined' ?
				Promise.resolve(modules) :
				{
					then: function (callback) {
						return callback(modules);
					},
					catch: function () {}
				};
		};`;
	fs.writeFileSync(filename, template);

	return filename;
}

const instanceMap = new WeakMap<DojoLoadReplacementPlugin, InstanceProperties>();

export default class DojoLoadReplacementPlugin {
	protected _timestamp: number;

	context: Resource | Resource[];
	tempDirectory: string;

	get resource(this: DojoLoadReplacementPlugin) {
		return instanceMap.get(this)['resource'];
	}
	set resource(this: DojoLoadReplacementPlugin, resource: Resource) {
		if (typeof resource === 'string') {
			resource = new RegExp(`^${resource}$`);
		}

		instanceMap.get(this)['resource'] = resource;
	}

	constructor(options: DojoLoadReplacementPluginOptions) {
		instanceMap.set(this, Object.create(null) as InstanceProperties);

		this._timestamp = Date.now();
		this.context = options.context;
		this.resource = options.resource;
		this.tempDirectory = options.tempDirectory || __dirname;
	}

	apply(this: DojoLoadReplacementPlugin, compiler: any) {
		const mapReplaceKey = `dojo-module-id-map-${this._timestamp}`;
		const filename = writeTempFile(this.tempDirectory, this._timestamp);

		compiler.apply(
			new NormalModuleReplacementPlugin(this.resource, filename)
		);

		compiler.plugin('compilation', (compilation: any) => {
			let map: PathModuleIdMap;
			compilation.plugin('after-optimize-module-ids', (modules: any) => {
				map = modules.reduce((map: PathModuleIdMap, module: any) => {
					const { id, rawRequest } = module;

					if (rawRequest) {
						map[rawRequest] = id;
					}

					return map;
				}, {});
			});

			compilation.moduleTemplate.plugin('module', (source: any, module: any) => {
				if (module && module.request && module.request === filename) {
					const modified = source.source().replace(`[${mapReplaceKey}]`, JSON.stringify(map));
					return new RawSource(modified);
				}

				return source;
			});
		});

		compiler.plugin('done', () => {
			fs.unlinkSync(filename);
		});

		const match = matchRequest.bind(this);
		compiler.parser.apply(
			function (this: any) {
				const parser = this;
				parser.plugin('expression require', () => {
					return match(this.state.current.request) ? false : undefined;
				});
			}
		);
	}
}
