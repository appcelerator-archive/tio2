/**
 * tio2 will run tests written as normal mocha specs in a Titanium app.
 * these tests then are run on device or simulator and collected and sent back to the CLI.
 *
 * See LICENSE for information and copyright.
 */
var colors = require('colors'),
	longjohn = require('longjohn'),
	program = require('commander');

program
	.version(require('../package.json').version)
	.usage('[options] <project_dir>')
	.option('-q, --quiet', 'no build logging')
	.option('-p, --platform [name]', 'platform such as ios, android, etc')
	.option('-c, --count [count]', 'number of iterations to sample for each test case')
	.option('-g, --grep [expr]', 'run regular expression on each test to filter specific tests to execute')
	.option('-t, --target [target]', 'target either device or simulator (default)')
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
	harnessDir: program.args[0],
	iterations: program.count,
	logLevel: program.logLevel,
	platform: program.platform,
	quiet: program.quiet,
	target: program.target
});

runner.go(function (err, results) {
	if (err) {
		(err.message || err.toString()).split('\n').forEach(function (line) { runner.logger.error(line); });
	} else {
		runner.logger.tio2('Finished successfully');
		JSON.stringify(results, null, '\t').split('\n').forEach(function (line) {
			runner.logger['tio2-result'](line);
		});
	}
	process.exit(~~!!err);
});