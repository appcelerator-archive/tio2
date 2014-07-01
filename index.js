var path = require('path'),
	spawn = require('child_process').spawn;

exports.init = function init(spoke, next) {
	spoke.registerJobHandler('tio2', function (job, callback) {
		var child = spawn(process.execPath, [
				path.join(__dirname, 'bin', 'tio2'),
				//path.join(__dirname, 'example'),
				'/Users/chris/appc/workspace/testapp',
				'-p', 'ios',
				'-q'
			]),
			result = '';

		child.stdout.on('data', function (data) {
			result += data.toString();
		});

		child.stderr.on('data', function (data) {
			result += data.toString();
		});

		child.on('close', function (code) {
			callback(code, result);
		});
	});
	next(null, {});
};