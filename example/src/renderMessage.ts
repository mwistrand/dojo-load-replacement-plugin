export default function renderMessage(message: string) {
	let node = document.getElementById('message');

	if (!node) {
		node = document.createElement('p');
		node.id = 'message';
	}

	node.textContent = message;
}
