var path = require('path');

exports.init = function init(spoke, next) {
	/*spoke.registerJobHandler('titanium.sdk.test', function (job, callback) {
		new (require('./lib/dispatcher'))({
			repo: 'https://github.com/appcelerator/titanium_mobile.git',
			branch: job.payload && job.payload.branch || 'master'
		}).go(callback);
	});*/

	spoke.registerJobHandler('titanium.run.test', function (job, callback) {
		// job.payload = JSON.parse('{"testDir":"/Users/chris/appc/tio2/test","logLevel":"debug","platform":"ios","iosVersion":"7.1"}');
		new (require('./lib/runner'))(job.payload).go(callback);
	});

	next(null, {});
};