import fs                from 'fs';
import path              from 'path';
import { fileURLToPath } from 'url';

let file;

export default async function(params) {
	if (file === undefined) {
		file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dictionary.txt');
		try {
			file = await fs.promises.readFile(file, 'utf-8');
		} catch (err) {
			throw new Error(`Could not find dictionary.txt in the function directory!`);
		}
		file = file.split(/\r?\n/);
	}
	
	let random = (params.random.length > 1) ? params.random[1].call : params.random[0].call;
	random     = Math.floor(random * file.length);
	
	return file[random];
}
