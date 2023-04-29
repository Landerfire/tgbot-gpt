import { unlink } from 'fs';

export function removeFile(path: string): void {
	unlink(path, (err) => {
		if (err) {
			console.log('Error while: removing voice files', err.message);
		} else {
			console.log('.ogg voices removed');
		}
	});
}
