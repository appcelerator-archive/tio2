require('ti-mocha');

var should = require('should');
var osname = Ti.Platform.osname;

"tests go here";

(function () {
	var results = [];

	// add a special mocha reporter that will time each test run using
	// our microsecond timer
	function $Reporter(runner) {
		var timer = require('com.appcelerator.timer'),
			started,
			title;

		runner.on('suite', function (suite) {
			title = suite.title;
		});

		runner.on('test',function (test) {
			started = timer.time();
		});

		runner.on('fail', function (test, err) {
			test.err = err;
		});

		runner.on('test end',function (test) {
			var tdiff = timer.time() - started;
			results.push({
				state: test.state || 'skipped',
				duration: tdiff,
				suite: title,
				title: test.title
			});
		});
	};

	mocha.setup({
		reporter: $Reporter,
		quiet: true
	});

	// dump the output, which will get interpreted above in the logging code
	mocha.run(function () {
		var jsonResults = JSON.stringify({
			date: new Date,
			results: results,
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
		}, null, '\t');
		Ti.API.info('!TEST_RESULTS_START!');
		if(osname == 'android') {
			// Issue 1) Android's logcat has a max limit of around 4000 characters.
			// When the results are more than 4000 characters, the json is truncated.
			// To prevent this, the json is being sent in batches of 1024*3
			// characters along with a marker.
			// Issue 2) A marker is used to filter the results as there is no guarantee
			// that another log entry will not appear inbetween our json logs.
			var marker = '!JSON_RESULTS!';
			var quotient = jsonResults.substring(0,3072);
			var remainder = jsonResults.substring(3072);
			Ti.API.info(marker+quotient);
			while(remainder.length != 0){
				quotient = remainder.substring(0,3072);
				remainder = remainder.substring(3072);
				Ti.API.info(marker+quotient);
			}
		} else {
			Ti.API.info(jsonResults);
		}
		Ti.API.info('!TEST_RESULTS_STOP!');
	});
})();
