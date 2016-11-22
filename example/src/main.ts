import load from 'dojo-core/load';

load(require, './renderMessage').then((modules: any) => {
	const renderMessage = modules[0];

	renderMessage('Hello, world!');
});
