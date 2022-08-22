import seedrandom from 'seedrandom';

let last_nonce;
let last_random;

export default function(params) {
	const querywise = params.args[1] ?? false;
	const length    = params.args[2] ?? 16;
	const wishlist  = params.args[3] ?? '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`~!@#$%^&*()-_=+[{]}\|;:,<.>/?';
	let   escaped   = params.args[4] ?? null;
	const escape    = params.args[5] ?? '\\';
	
	if (querywise === true) {
		if (last_nonce === params.random[0].query) {
			return last_random;
		}
		
		last_nonce = params.random[0].query;
	}
	
	let random = (params.random.length > 1) ? params.random[1].call : params.random[0].call;
	
	const prng = new seedrandom(random, { entropy: false });
	random     = new Uint32Array(length).map(() => prng.int32());
	random     = Array.from(random).map((x) => wishlist[x % wishlist.length]).join('');
	
	if (escaped !== null) {
		const regex = new RegExp('(' + escaped + ')', 'g');
		random = random.replace(regex, escape + "$1");
	}
	
	if (querywise === true) {
		last_random = random;
	}
	
	return random;
}
