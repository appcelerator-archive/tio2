var appc = require('node-appc'),
	async = require('async'),
	ejs = require('ejs'),
	fs = require('fs'),
	ioslib = require('ioslib'),
	path = require('path'),
	sprintf = require('sprintf'),
	temp = require('temp'),
	tiappxml = require('tiapp.xml'),
	UglifyJS = require('uglify-js'),
	winston = require('winston'),
	wrench = require('wrench'),
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

module.exports = Runner;

function Runner(params) {
	// init the logger
	if (params.quiet) {
		logger.transports.console.silent = true;
	}
	if (params.logLevel) {
		logger.transports.console.level = params.logLevel;
	}
	this.logger = logger;

	this.harnessDir = path.resolve(params.harnessDir);
	this.specsDir = path.join(this.harnessDir, 'specs');
	this.buildDir = temp.path({ prefix: 'tio2_' });
	this.buildResourcesDir = path.join(this.buildDir, 'Resources');
	this.tiappPath = path.join(this.buildDir, 'tiapp.xml');
	this.tiapp = null;
	this.results = {};

	this.nodeModulesDir = path.resolve(__dirname, '..', 'node_modules');
	this.timocha = path.resolve(this.nodeModulesDir, 'ti-mocha', 'ti-mocha.js');
	this.should = path.resolve(this.nodeModulesDir, 'should', 'should.js');

	this.platform = (params.platform || '').toLowerCase();
	/^(?:iphone|ipad)$/.test(this.platform) && (this.platform = 'ios');
	this.target = (params.target || '').toLowerCase();
	this.iterations = params.iterations || 1;
}

Runner.prototype.go = function go(callback) {
	appc.async.series(this, [
		'validateEnvironment',
		'validateParams',
		'validateHarnessApp',
		'copyHarnessApp',
		'copySpecResources',
		'copyTestDependencies',
		'prepareTiapp',
		'prepareAppjs',
		'buildApp',
		'runApp'
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

Runner.prototype.validateHarnessApp = function validateHarnessApp(next) {
	// make sure the project directory passed in is valid
	if (!fs.existsSync(this.harnessDir)) {
		return next(new Error(sprintf("Couldn't find project at %s", this.harnessDir.cyan)));
	}

	// make sure this is a Ti project
	var harnessTiappPath = path.join(this.harnessDir, 'tiapp.xml');
	if (!fs.existsSync(harnessTiappPath)) {
		return next(new Error(sprintf("Invalid Titanium project; Couldn't find %s", this.harnessTiappPath.cyan)));
	}

	// make sure the specs folder exists
	if (!fs.existsSync(this.specsDir)) {
		return next(new Error(sprintf("Couldn't find specs folder at %s", this.specsDir.cyan)));
	}

	next();
};

Runner.prototype.copyHarnessApp = function copyHarnessApp() {
	logger.tio2('Build directory: %s', this.buildDir.cyan);
	logger.tio2('Copying harness app files from %s...', this.harnessDir.cyan);

	// initialize the temp build directory
	wrench.mkdirSyncRecursive(this.buildResourcesDir);

	// copy the project into our build directory
	copyDirSync(this.harnessDir, this.buildDir, null, this.harnessDir);
};

Runner.prototype.copySpecResources = function copySpecResources() {
	logger.tio2('Copying spec resource files from %s...', this.specsDir.cyan);

	// copy all files except the tiapp.xml and any .js files
	copyDirSync(this.specsDir, this.buildResourcesDir, /^(?!(tiapp\.xml|.*\.js)$).*/i, this.specsDir);

	var customTiapp = path.join(this.specsDir, 'tiapp.xml');
	fs.existsSync(customTiapp) && copyFileSync(customTiapp, this.tiappPath, this.harnessDir);
};

Runner.prototype.copyTestDependencies = function copyTestDependencies() {
	logger.tio2('Copying test dependency files from %s...', this.nodeModulesDir.cyan);
	copyFileSync(this.timocha, path.join(this.buildResourcesDir, path.basename(this.timocha)), this.nodeModulesDir);
	copyFileSync(this.should, path.join(this.buildResourcesDir, path.basename(this.should)), this.nodeModulesDir);
};

Runner.prototype.prepareTiapp = function prepareTiapp(next) {
	logger.tio2('Preparing tiapp.xml');
	this.tiapp = tiappxml.load(this.tiappPath);

	var moduleZip;

	// determine if we're building for iOS or Android, then inject the correct timer module
	if (this.platform === 'android') {
		moduleZip = path.join(__dirname, '..', 'modules', 'android', 'com.appcelerator.timer-android-1.0.zip');
		this.tiapp.setModule('com.appcelerator.timer', '1.0', 'android');
	} else if (this.platform === 'ios') {
		moduleZip = path.join(__dirname, '..', 'modules', 'ios', 'com.appcelerator.timer-iphone-1.0.zip');
		this.tiapp.setModule('com.appcelerator.timer', '1.0', 'iphone');
	}

	if (!moduleZip) return next();

	// save our tiapp.xml
	this.tiapp.write();

	//perform the unzip of the module
	logger.tio2('Unzipping: %s => %s', moduleZip.cyan, this.buildDir.cyan);
	appc.zip.unzip(moduleZip, this.buildDir, null, next);
};

Runner.prototype.prepareAppjs = function prepareAppjs() {
	var template = path.join(this.buildResourcesDir, 'app.js.ejs');

	// if we don't have a template, then just return
	if (!fs.existsSync(template)) {
		return;
	}

	var dest = path.join(this.buildResourcesDir, 'app.js'),
		specFiles = [],
		suites = [],
		self = this;

	logger.tio2('Found app.js template, locating spec files and injecting them...');

	(function walk(dir, filter) {
		fs.existsSync(dir) && fs.readdirSync(dir).forEach(function (name) {
			var file = path.join(dir, name);
			if (fs.existsSync(file) && (!filter || filter.test(name))) {
				if (fs.statSync(file).isDirectory()) {
					!ignoreDirs.test(name) && walk(file, filter);
				} else if (!ignoreFiles.test(name)) {
					specFiles.push(file);
				}
			}
		});
	})(this.specsDir, /\.js$/);

	specFiles.forEach(function (specFile) {
		logger['tio2-debug']('Parsing AST: %s', specFile.cyan);
		var ast = UglifyJS.parse(fs.readFileSync(specFile).toString()),
			// transform each spec file and re-write each test spec to run N times
			// based on the --count value
			tt = new UglifyJS.TreeTransformer(function (node, descend) {
				if (!(node instanceof UglifyJS.AST_SimpleStatement)) {
					return;
				}
				// convert each of our `it` to wrap with an iteration for loop
				if (node.body.start.type === 'name' && node.body.start.value === 'it' && self.iterations > 1) {
					//if (program.grep && !program.grep.test(node.body.args[0].value)) {
					//	// ignore this branch if not matched
					//	return new UglifyJS.AST_EmptyStatement();
					//}

					// create a new node
					return new UglifyJS.AST_For({
						init: new UglifyJS.AST_Var({
							definitions: [
								new UglifyJS.AST_VarDef({
									name: new UglifyJS.AST_SymbolVar({ name: '$r' }),
									value: new UglifyJS.AST_Number({ value: 0 })
								})
							]
						}),
						condition: new UglifyJS.AST_Binary({
							left: new UglifyJS.AST_SymbolRef({ name: '$r' }),
							operator: '<',
							right: new UglifyJS.AST_Number({ value: self.iterations })
						}),
						step: new UglifyJS.AST_UnaryPostfix({
							operator: '++',
							expression: new UglifyJS.AST_SymbolRef({ name: '$r' })
						}),
						body: node.body
					});
				}
			});

		// re-write our JS by adding our wrapping code
		suites.push(ast.transform(tt).print_to_string({beautify:true}));
	});

	fs.existsSync(dest) && fs.unlinkSync(dest);

	// render the custom app.js template
	var contents = ejs.render(fs.readFileSync(template).toString(), {
		suites: suites
	});

	logger.tio2('Writing new app.js: %s', dest.cyan);
	fs.writeFileSync(dest, contents);

	fs.unlinkSync(template);
};

Runner.prototype.buildApp = function buildApp(next) {
	var args = [
		'--no-colors',
		'--no-progress-bars',
		'--no-banner',
		'--no-prompt'
	];

	this.tiapp.sdkVersion && args.push('--sdk', this.tiapp.sdkVersion);

	args.push(
		'build',
		'--project-dir',
		this.buildDir,
		'--build-only',
		'--platform',
		this.platform
	);

	this.target && args.push('--target', this.target);

	appc.async.series(this, [
		function addIOSDeviceArgs(cb) {
			if (this.platform === 'ios' && this.target === 'device') {
				ioslib.profile.find(this.tiapp.id, function(err, results) {
					err || args.push(
						'--developer-name', results.developer_name.replace('iPhone Developer: ', ''),
						'--pp-uuid', results.profiles[0],
						'--device-id', results.device_id
					);
					cb(err);
				});
			} else {
				cb();
			}
		}
	], function (err) {
		if (err) return next(err);

		logger.tio2('Executing: %s', ('titanium "' + args.join('" "') + '"').cyan);

		appc.subprocess.run('titanium', args, function (code, out, err) {
			next(code ? new Error(err.trim()) : '');
		});
	});
};

Runner.prototype.runApp = function runApp(next) {
	logger.tio2('Running app');

	var resultsStartRegex = /\!TEST_RESULTS_START\!/,
		resultsEndRegex = /\!TEST_RESULTS_STOP\!/,
		inResults,
		appOutput = [],
		targetLib,
		finished,
		finalize = function () {
			if (finished) return;
			finished = true;
			logger.tio2('Cleaning up');
			targetLib && targetLib[this.target].stop();
			next();
		}.bind(this);

	function outputWatcher(label, message) {
		if (this.platform === 'ios' && /^Assertion failed: \(AMDeviceTransferApplication/.test(message)) {
			return;
		}
		if (inResults) {
			if (resultsEndRegex.test(message)) {
				inResults = false;
				this.results = JSON.parse(appOutput.join('').trim());
				finalize();
			} else {
				appOutput.push(message);
			}
		} else if (resultsStartRegex.test(message)) {
			inResults = true;
		} else {
			logger['tio2-' + label](message);
		}
	}

	if (this.platform === 'ios') {
		this.target || (this.target = 'simulator');
		targetLib = ioslib;

		if (!ioslib[this.target]) {
			return next(new Error(sprintf('Unsupported iOS target "%s"', this.target)));
		}

		logger.tio2('Launching iOS app on %s', this.target.cyan);
		ioslib[this.target].launch({
			build_dir: path.join(this.buildDir, 'build', 'iphone', 'build', 'Debug-' + (this.target === 'device' ? 'iphoneos' : 'iphonesimulator'), this.tiapp.name + '.app'),
			unit: true,
			hide: true,
			logger: outputWatcher.bind(this),
			callback: finalize
		});
		return;
	}

	if (this.platform === 'android') {
		var name = this.tiapp.name.charAt(0).toUpperCase() + this.tiapp.name.substring(1);
		this.target || (this.target = 'emulator');
		targetLib = androidlib;

		logger.tio2('Launching Android app on %s', this.target.cyan);
		androidlib[program.target].launch({
			apk: path.join(buildDir, 'build', 'android', 'bin', name + '.apk'),
			name: name,
			appid: this.tiapp.id,
			target: this.target,
			unit: true,
			hide: true,
			logger: outputWatcher.bind(this),
			callback: finalize
		});
		return;
	}

	// unsupported platform
	next(new Error(sprintf('Unsupported platform "%s"', this.platform)));
};

function copyFileSync(from, to, rel) {
	logger['tio2-debug']('Copying %s => %s', (rel ? from.replace(rel, '').replace(/^\/|\\/, '') : from).cyan, to.cyan);

	var src = fs.openSync(from, 'r'),
		dest = fs.openSync(to, 'w'),
		buffer = new Buffer(8096),
		bytesRead,
		position = 0;

	while (bytesRead = fs.readSync(src, buffer, 0, 8096, position)) {
		fs.writeSync(dest, buffer, 0, bytesRead);
		position += bytesRead;
	}

	fs.closeSync(src);
	fs.closeSync(dest);
}

function copyDirSync(src, dest, filter, rel) {
	fs.existsSync(dest) || wrench.mkdirSyncRecursive(dest);
	fs.existsSync(src) && fs.readdirSync(src).forEach(function (name) {
		var from = path.join(src, name),
			to = path.join(dest, name);
		if (fs.existsSync(from) && (!filter || filter.test(name))) {
			if (fs.statSync(from).isDirectory()) {
				!ignoreDirs.test(name) && copyDirSync(from, to, filter, rel);
			} else if (!ignoreFiles.test(name)) {
				copyFileSync(from, to, rel);
			}
		}
	});
}