import { errorOverlayCode } from './ErrorOverlay.js';


export function errorOverlayPlugin() {
	return {
		name: 'error-overlay',
		transform(code, id, opts = {}) {
			if (opts?.ssr) return;

			if (!id.includes('vite/dist/client/client.mjs')) return;

			console.log("🔥 [custom-error-overlay] patching overlay", id);

			return code.replace('class ErrorOverlay', errorOverlayCode + '\nclass OldErrorOverlay');
		}
	}
}