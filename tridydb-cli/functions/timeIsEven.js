export default function(params) {
	return Math.round(((new Date()).getTime() / 1000) % 1) === 0;
}
