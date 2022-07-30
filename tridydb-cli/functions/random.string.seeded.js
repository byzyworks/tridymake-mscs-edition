import seedrandom from 'seedrandom';

export default function(params) {
	const length   = params.args[1] ?? 16;
	const wishlist = params.args[2] ?? '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`~!@#$%^&*()-_=+[{]}\|;:\'",<.>/?';
	
	let random = (params.random.length > 1) ? params.random[1].call : params.random[0].call;
	const prng = new seedrandom(random, { entropy: false });
	random     = new Uint32Array(length).map(() => prng.int32());
	
	return Array.from(random).map((x) => wishlist[x % wishlist.length]).join('');
}
