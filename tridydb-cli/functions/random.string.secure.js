import crypto from 'crypto';

export default function(params) {
	const length   = params.args[1] ?? 24;
	const wishlist = params.args[2] ?? '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`~!@#$%^&*()-_=+[{]}\|;:\'",<.>/?';
	
	const random = crypto.randomFillSync(new Uint32Array(length));
	
	return Array.from(random).map((x) => wishlist[x % wishlist.length]).join('');
}
