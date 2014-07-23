const
	appc = require('node-appc'),
	async = require('async'),
	fs = require('fs'),
	path = require('path'),
	sprintf = require('sprintf'),
	Suite = require('./suite'),
	winston = require('winston'),
	defaultLevels = winston.config.cli.levels,
	logger = new winston.Logger({
		padLevels: true,
		levels: appc.util.mix({
			'tio2':        defaultLevels.info,
			'tio2-result': defaultLevels.info,
			'tio2-debug':  defaultLevels.debug,
			'tio2-info':   defaultLevels.info,
			'tio2-warn':   defaultLevels.warn,
			'tio2-error':  defaultLevels.error,
			'tio2-trace':  defaultLevels.trace
		}, defaultLevels),
		colors: {
			'tio2':        'green',
			'tio2-result': 'grey',
			'tio2-debug':  'magenta',
			'tio2-info':   'green',
			'tio2-warn':   'yellow',
			'tio2-error':  'red',
			'tio2-trace':  'grey'
		},
		transports: [
			new winston.transports.Console({
				level: 'info',
				colorize: true,
				timestamp: true
			}),
			new (require('./json-logger'))({
				level: 'debug',
				colorize: false,
				timestamp: true
			})
		]
	}),
	ignoreDirs = /^(\.svn|_svn|\.git|\.hg|\.?[Cc][Vv][Ss]|\.bzr|\$RECYCLE\.BIN)$/,
	ignoreFiles = /^(\.gitignore|\.npmignore|\.cvsignore|\.DS_Store|\._.*|[Tt]humbs.db|\.vspscc|\.vssscc|\.sublime-project|\.sublime-workspace|\.project|\.tmproj)$/;

global.logger = logger;

module.exports = Runner;

function Runner(opts) {
	// init the logger
	if (opts.quiet) {
		logger.transports.console.silent = true;
	}
	if (opts.logLevel) {
		logger.transports.console.level = opts.logLevel;
	}

	this.testDir = path.resolve(opts.testDir || '');
	this.harnessDir = path.join(this.testDir, 'harness');
	this.suitesDir = path.join(this.testDir, 'suites');
	this.suites = [];

	this.results = {
		suites: {}
	};

	var nodeModulesDir = path.resolve(__dirname, '..', 'node_modules');
	this.timocha = path.resolve(nodeModulesDir, 'ti-mocha', 'ti-mocha.js');
	this.should = path.resolve(nodeModulesDir, 'should', 'should.js');

	this.sdkVersion = opts.sdk || '3.3.0.GA';
	this.platform = (opts.platform || '').toLowerCase();
	/^(?:iphone|ipad)$/.test(this.platform) && (this.platform = 'ios');
	this.iosVersion = opts.iosVersion || '7.1'
	this.target = (opts.target || '').toLowerCase();
	this.iterations = opts.iterations || 1;
}

Runner.prototype.go = function go(callback) {
	appc.async.series(this, [
		'validateEnvironment',
		'validateParams',
		'validateTestDir',
		'loadSuites',
		'runSuites',
	], function (err) {
		typeof callback === 'function' && callback(err, this.results);
	});
};

Runner.prototype.validateEnvironment = function validateEnvironment(next) {
	// we are going to inject these modules into generated source
	if (!fs.existsSync(this.timocha)) {
		return next(new Error(sprintf("Couldn't find dependency 'ti-mocha': %s", this.timocha.cyan) + '\nDid you forget to run "npm install"?'));
	}

	if (!fs.existsSync(this.should)) {
		return next(new Error(sprintf("Couldn't find dependency 'should': %s", this.should.cyan) + '\nDid you forget to run "npm install"?'));
	}

	next();
};

Runner.prototype.validateParams = function validateParams(next) {
	if (!this.platform) {
		return next(new Error(sprintf('Missing %s', '--platform <name>'.cyan)));
	}
	next();
};

Runner.prototype.validateTestDir = function validateTestDir(next) {
	// make sure the project directory passed in is valid
	if (!fs.existsSync(this.testDir)) {
		return next(new Error(sprintf("Couldn't find tests at %s", this.testDir.cyan)));
	}

	if (!fs.existsSync(this.harnessDir)) {
		return next(new Error(sprintf("Couldn't find harness at %s", this.harnessDir.cyan)));
	}

	// make sure this is a Ti project
	var harnessTiappPath = path.join(this.harnessDir, 'tiapp.xml.ejs');
	if (!fs.existsSync(harnessTiappPath)) {
		harnessTiappPath = path.join(this.harnessDir, 'tiapp.xml');
		if (!fs.existsSync(harnessTiappPath)) {
			return next(new Error(sprintf("Invalid Titanium project; Couldn't find %s", this.harnessTiappPath.cyan)));
		}
	}

	// make sure the suites folder exists
	if (!fs.existsSync(this.suitesDir)) {
		return next(new Error(sprintf("Couldn't find suites folder at %s", this.suitesDir.cyan)));
	}

	next();
};

Runner.prototype.loadSuites = function loadSuites() {
	fs.readdirSync(this.suitesDir).forEach(function (name) {
		var dir = path.join(this.suitesDir, name);
		if (fs.statSync(dir).isDirectory() && !ignoreDirs.test(name)) {
			this.suites.push(new Suite(name, path.join(this.suitesDir, name), this));
		}
	}, this);
	logger.tio2(this.suites.length === 1 ? 'Found 1 test suite' : 'Found ' + this.suites.length + ' test suites');
};

Runner.prototype.runSuites = function runSuites(next) {
	var self = this;
	async.eachSeries(this.suites, function runSuite(suite, cb) {
		logger.tio2('Running suite: %s', suite.name.cyan);
		suite.run(function (err, results) {
			if (err) {
				logger['tio2-error'](sprintf('Suite %s finished with errors:', suite.name.cyan));
				(err.message || err.toString()).trim().split('\n').forEach(function (line) {
					logger['tio2-error'](line);
				});
			} else {
				logger.tio2('Suite %s finished successfully', suite.name);
			}
			self.results.suites[suite.name] = results;
			cb();
		});
	}, next);
};