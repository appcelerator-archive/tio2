/**
 * tio2 will run tests written as normal mocha specs in a Titanium app.
 * these tests then are run on device or simulator and collected and sent back to the CLI.
 *
 * See LICENSE for information and copyright.
 */
const
	appc = require('node-appc'),
	colors = require('colors'),
	longjohn = require('longjohn'),
	program = require('commander');

program
	.version(require('../package.json').version)
	.usage('[options] <test_dir>')
	.option('-q, --quiet', 'no build logging')
	.option('-s, --sdk [ver]', 'the Titanium SDK to use')
	.option('-p, --platform [name]', 'platform such as ios, android, etc')
	.option('-c, --count [count]', 'number of iterations to sample for each test case')
	.option('-g, --grep [expr]', 'run regular expression on each test to filter specific tests to execute')
	.option('-t, --target [target]', 'target either device or simulator (default)')
	.option('-i, --ios-version [ver]', 'the iOS version to build with')
	.option('-l, --log-level [level]', 'set the log-level for logging. defaults to info')
	.option('-j, --json', 'output as json')
	.parse(process.argv);

if (program.args.length !== 1) {
	program.help();
	process.exit();
}

// turn grep into a regular expression
program.grep = program.grep && new RegExp(program.grep);

var runner = new (require('./runner'))({
		testDir: program.args[0],
		sdk: program.sdk,
		iterations: program.count,
		logLevel: program.logLevel,
		platform: program.platform,
		quiet: program.quiet,
		target: program.target,
		iosVersion: program.iosVersion
	}),
	startTime = Date.now();

runner.go(function (err, results) {
	if (err) {
		(err.message || err.toString()).split('\n').forEach(function (line) { logger['tio2-error'](line); });
	} else {
		JSON.stringify(results, null, '\t').split('\n').forEach(function (line) {
            if (program.json) {
                console.log(line);
            } else {
                logger['tio2-result'](line);
            }
		});
	}
	logger.tio2('Finished in %s', appc.time.prettyDiff(startTime, Date.now()).cyan);
	process.exit(~~!!err);
});
