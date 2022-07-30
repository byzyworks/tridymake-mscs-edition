export default function(params) {
	const args = params.args;
	
	args.splice(0, 1);
	
	const random = Math.floor(params.random.call * args.length);
	
	return args[random];
}
