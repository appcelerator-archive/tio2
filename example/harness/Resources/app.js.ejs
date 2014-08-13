require('ti-mocha');

var should = require('should'),
	$timer = require('com.appcelerator.timer'),
	$results = [];

<%- tests %>

// add a special mocha reporter that will time each test run using
// our microsecond timer
function $Reporter(runner) {
	var started,
		title;

	runner.on('suite', function (suite) {
		title = suite.title;
	});

	runner.on('test',function (test) {
		started = $timer.time();
	});

	runner.on('fail', function (test, err) {
		test.err = err;
	});

	runner.on('test end',function (test) {
		var tdiff = $timer.time() - started;
		$results.push({
			state: test.state || 'skipped',
			duration: tdiff,
			suite: title,
			title: test.title,
			error: test.err
		});
	});
};

mocha.setup({
	reporter: $Reporter,
	quiet: true
});

// dump the output, which will get interpreted above in the logging code
mocha.run(function () {
	Ti.API.info('!TEST_RESULTS_START!');
	Ti.API.info(JSON.stringify({
		date: new Date,
		results: $results,
		platform: {
			ostype: Ti.Platform.ostype,
			name: Ti.Platform.name,
			osname: Ti.Platform.osname,
			ostype: Ti.Platform.ostype,
			version: Ti.Platform.version,
			address: Ti.Platform.address,
			macaddress: Ti.Platform.macaddress,
			architecture: Ti.Platform.architecture,
			availableMemory: Ti.Platform.availableMemory,
			manufacturer : Ti.Platform.manufacturer,
			model: Ti.Platform.model
		},
		displayCaps: {
			density: Ti.Platform.displayCaps.density,
			dpi: Ti.Platform.displayCaps.dpi,
			platformHeight: Ti.Platform.displayCaps.platformHeight,
			platformWidth: Ti.Platform.displayCaps.platformWidth,
			xdpi: Ti.Platform.displayCaps.xdpi,
			ydpi: Ti.Platform.displayCaps.ydpi
		},
		build: {
			date: Ti.buildDate,
			git: Ti.buildHash,
			version: Ti.version
		}
	}, null, '\t'));
	Ti.API.info('!TEST_RESULTS_STOP!');
});