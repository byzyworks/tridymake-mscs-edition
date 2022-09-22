import fs                from 'fs';
import path              from 'path';
import { fileURLToPath } from 'url';

let file;

let last_nonce;
let last_random;

export default async function(params) {
	const querywise = params.args[1] ?? false;
	
	if (file === undefined) {
		file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dictionary.txt');
		try {
			file = await fs.promises.readFile(file, 'utf-8');
		} catch (err) {
			throw new Error(`Could not find dictionary.txt in the function directory!`);
		}
		file = file.split(/\r?\n/);
	}
	
	if (querywise === true) {
		if (last_nonce === params.random[0].query) {
			return last_random;
		}
		
		last_nonce = params.random[0].query;
	}
	
	let random = (params.random.length > 1) ? params.random[1].call : params.random[0].call;
	random     = Math.floor(random * file.length);
	
	if (querywise === true) {
		last_random = random;
	}
	
	return file[random];
}
