var path = require('path');

exports.init = function init(spoke, next) {
	spoke.registerJobHandler('titanium.sdk.test', function (job, callback) {
		new (require('./lib/dispatcher'))({
			repo: 'https://github.com/appcelerator/titanium_mobile.git',
			branch: job.payload && job.payload.branch || 'master'
		}).go(callback);
	});

	spoke.registerJobHandler('titanium.run.test', function (job, callback) {
		new (require('./lib/runner'))({
			harnessDir: path.join(__dirname, 'example'),
			logLevel: 'debug',
			platform: 'ios'
		}).go(callback);
	});

	next(null, {});
};