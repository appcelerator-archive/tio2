const
	androidlib = require('androidlib'),
	appc = require('node-appc'),
	ejs = require('ejs'),
	fs = require('fs'),
	ioslib = require('ioslib'),
	path = require('path'),
	spawn = require('child_process').spawn,
	sprintf = require('sprintf'),
	temp = require('temp'),
	tiappxml = require('tiapp.xml'),
	UglifyJS = require('uglify-js'),
	wrench = require('wrench'),
	ignoreDirs = /^(\.svn|_svn|\.git|\.hg|\.?[Cc][Vv][Ss]|\.bzr|\$RECYCLE\.BIN)$/,
	ignoreFiles = /^(\.gitignore|\.npmignore|\.cvsignore|\.DS_Store|\._.*|[Tt]humbs.db|\.vspscc|\.vssscc|\.sublime-project|\.sublime-workspace|\.project|\.tmproj)$/;

module.exports = Suite;

function Suite(name, suiteDir, runner) {
	this.name = name;
	this.suiteDir = suiteDir;

	this.harnessDir = runner.harnessDir;
	this.timocha = runner.timocha;
	this.should = runner.should;
	this.sdkVersion = runner.sdkVersion;
	this.platform = runner.platform;
	this.target = runner.target;
	this.iosVersion = runner.iosVersion;
	this.iterations = runner.iterations;

	this.buildDir = temp.path({ prefix: 'tio2_' });
	this.buildResourcesDir = path.join(this.buildDir, 'Resources');
	this.tiapp = null;
	this.results = {};
}

Suite.prototype.run = function run(callback) {
	appc.async.series(this, [
		'copyHarnessApp',
		'copySpecResources',
		'copyTestDependencies',
		'prepareTiapp',
		'prepareAppjs',
		'buildApp',
		'runApp'
	], function (err) {
		logger.tio2('Cleaning up');
		wrench.rmdirSyncRecursive(this.buildDir);

		typeof callback === 'function' && callback(err, this.results);
	});
};

Suite.prototype.copyHarnessApp = function copyHarnessApp() {
	logger.tio2('Build directory: %s', this.buildDir.cyan);
	logger.tio2('Copying harness app files from %s...', this.harnessDir.cyan);

	// initialize the temp build directory
	wrench.mkdirSyncRecursive(this.buildResourcesDir);

	// copy the project into our build directory
	copyDirSync(this.harnessDir, this.buildDir, null, this.harnessDir);
};

Suite.prototype.copySpecResources = function copySpecResources() {
	logger.tio2('Copying spec resource files from %s...', this.suiteDir.cyan);

	// copy all files except the tiapp.xml and any .js files
	copyDirSync(this.suiteDir, this.buildResourcesDir, /^(?!(tiapp\.xml(?:\.ejs)?|.*\.js)$).*/i, this.suiteDir);

	['tiapp.xml', 'tiapp.xml.ejs'].forEach(function (filename) {
		var customTiapp = path.join(this.suiteDir, filename);
		if (fs.existsSync(customTiapp)) {
			copyFileSync(customTiapp, path.join(this.buildDir, filename), this.harnessDir);
		}
	}, this);
};

Suite.prototype.copyTestDependencies = function copyTestDependencies() {
	var nodeModulesDir = path.dirname(this.timocha);
	logger.tio2('Copying test dependency files from %s...', nodeModulesDir.cyan);
	copyFileSync(this.timocha, path.join(this.buildResourcesDir, path.basename(this.timocha)), nodeModulesDir);
	copyFileSync(this.should, path.join(this.buildResourcesDir, path.basename(this.should)), nodeModulesDir);
};

Suite.prototype.prepareTiapp = function prepareTiapp(next) {
	logger.tio2('Preparing tiapp.xml');

	var tiappFile = path.join(this.buildDir, 'tiapp.xml'),
		ejsTiapp = path.join(this.buildDir, 'tiapp.xml.ejs'),
		moduleZip;

	// find the tiapp.xml
	if (fs.existsSync(ejsTiapp)) {
		fs.writeFileSync(tiappFile, ejs.render(fs.readFileSync(ejsTiapp).toString(), this));
		fs.unlinkSync(ejsTiapp);
	}

	this.tiapp = tiappxml.load(tiappFile);

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

Suite.prototype.prepareAppjs = function prepareAppjs() {
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
	})(this.suiteDir, /\.js$/);

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
	logger.tio2('Writing new app.js: %s', dest.cyan);
	fs.writeFileSync(dest, ejs.render(fs.readFileSync(template).toString(), {
		suites: suites
	}));

	fs.unlinkSync(template);
};

Suite.prototype.buildApp = function buildApp(next) {
	var args = [
		'--no-colors',
		'--no-progress-bars',
		'--no-banner',
		'--no-prompt',
		'--log-level', 'trace'
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
		function (cb) {
			// add iOS args
			if (this.platform !== 'ios') return cb();

			this.iosVersion && args.push('--ios-version', this.iosVersion);
			if (this.target === 'device') {
				ioslib.profile.find(this.tiapp.id, function(err, results) {
					err || args.push(
						'--developer-name', results.developer_name.replace('iPhone Developer: ', ''),
						'--pp-uuid', results.profiles[0],
						'--device-id', results.device_id
					);
					cb(err);
				});
			}
			cb();
		}
	], function (err) {
		if (err) return next(err);

		logger.tio2('Executing: %s', ('titanium "' + args.join('" "') + '"').cyan);

		var child = spawn('titanium', args);

		child.stdout.on('data', function (data) {
			logger['tio2-debug'](data.toString().trim());
		});

		child.stderr.on('data', function (data) {
			logger['tio2-debug'](data.toString().trim());
		});

		child.on('exit', function (code) {
			next(code);
		});
	});
};

Suite.prototype.runApp = function runApp(next) {
	logger.tio2('Running app');

	var resultsStartRegex = /\!TEST_RESULTS_START\!/,
		resultsEndRegex = /\!TEST_RESULTS_STOP\!/,
		inResults,
		appOutput = [],
		target = this.target,
		finished,
		targetLib,
		finalize = function () {
			if (finished) return;
			finished = true;
			targetLib && targetLib[target].stop();
			next();
		};

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
		target || (target = 'simulator');
		targetLib = ioslib;

		if (!ioslib[target]) {
			return next(new Error(sprintf('Unsupported iOS target "%s"', target)));
		}

		logger.tio2('Launching iOS app on %s', target.cyan);
		logger['tio2-debug']('Build directory: %s', path.join(this.buildDir, 'build', 'iphone', 'build', 'Debug-' + (target === 'device' ? 'iphoneos' : 'iphonesimulator'), this.tiapp.name + '.app').cyan);
		ioslib[target].launch({
			build_dir: path.join(this.buildDir, 'build', 'iphone', 'build', 'Debug-' + (target === 'device' ? 'iphoneos' : 'iphonesimulator'), this.tiapp.name + '.app'),
			unit: true,
			hide: true,
			logger: outputWatcher.bind(this),
			callback: finalize
		});
		return;
	}

	if (this.platform === 'android') {
		var name = this.tiapp.name.charAt(0).toUpperCase() + this.tiapp.name.substring(1);
		target || (target = 'emulator');
		targetLib = androidlib;

		logger.tio2('Launching Android app on %s', target.cyan);
		androidlib[program.target].launch({
			apk: path.join(buildDir, 'build', 'android', 'bin', name + '.apk'),
			name: name,
			appid: this.tiapp.id,
			target: target,
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