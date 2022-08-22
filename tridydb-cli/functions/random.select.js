export default function(params) {
	const querywise = params.args[1] ?? false;
	
	const args = params.args;
	
	args.splice(0, 2);
	
	if (args.length === 0) {
		throw new Error('Missing arguments!');
	}
	
	const seed   = querywise ? params.random[0].query : params.random[0].call;
	const random = Math.floor(seed * args.length);
	
	return args[random];
}
