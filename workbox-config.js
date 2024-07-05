module.exports = {
	globDirectory: '.',
	globPatterns: [
		'**/*.{html,svg,json}'
	],
	swDest: 'sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	]
};