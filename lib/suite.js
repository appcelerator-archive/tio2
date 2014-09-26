const
	androidlib = require('androidlib'),
	appc = require('node-appc'),
	ejs = require('ejs'),
	fs = require('fs'),
	ioslib = require('ioslib'),
	path = require('path'),
	SourceMap = require("source-map"),
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
	this.appDir = '',
	this.appjs = '';
	this.sourceMap = null;
	this.injected = false;
	this.results = {};

	this.passed = 0;
	this.failed = 0;
}

Suite.prototype.run = function run(callback) {
	appc.async.series(this, [
		'validateSuite',
		'copyHarnessApp',
		'copySuiteResources',
		'copyTestDependencies',
		'prepareTiapp',
		'prepareAppjs',
		'buildApp',
		'runApp',
		'processResults',
		'cleanup'
	], function (err) {
		typeof callback === 'function' && callback(err, this.results);
	});
};

Suite.prototype.validateSuite = function validateSuite(next) {
	var appjs = path.join(this.suiteDir, 'app.js');
	if (!fs.existsSync(appjs)) {
		return next(new Error(sprintf("Suite %s is missing an app.js", appjs.cyan)));
	}

	next();
};

Suite.prototype.copyHarnessApp = function copyHarnessApp() {
	logger.tio2('Build directory: %s', this.buildDir.cyan);
	logger.tio2('Copying harness app files from %s...', this.harnessDir.cyan);

	// initialize the temp build directory
	wrench.mkdirSyncRecursive(this.buildResourcesDir);

	// copy the harness (minus the app.js) into our build directory
	copyDirSync(this.harnessDir, this.buildDir, null, this.harnessDir);

	this.appjsTemplate = fs.readFileSync(path.join(this.harnessDir, 'Resources', 'app.js')).toString();
};

Suite.prototype.copySuiteResources = function copySuiteResources() {
	logger.tio2('Copying suite resource files from %s...', this.suiteDir.cyan);

	// copy all files except the tiapp.xml and any .js files
	copyDirSync(this.suiteDir, this.buildResourcesDir, /^(?!(tiapp\.xml(?:\.ejs)?)$).*/i, this.suiteDir);

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
/*
function getType(node) {
	var types = [
			'AST_Node',
			'AST_Token',
			'AST_Statement',
			'AST_Debugger',
			'AST_Directive',
			'AST_SimpleStatement',
			'AST_Block',
			'AST_BlockStatement',
			'AST_EmptyStatement',
			'AST_StatementWithBody',
			'AST_LabeledStatement',
			'AST_DWLoop',
			'AST_Do',
			'AST_While',
			'AST_For',
			'AST_ForIn',
			'AST_With',
			'AST_Scope',
			'AST_Toplevel',
			'AST_SymbolDeclaration',
			'AST_String',
			'AST_Assign',
			'AST_Sub',
			'AST_Lambda',
			'AST_Accessor',
			'AST_Function',
			'AST_Defun',
			'AST_Jump',
			'AST_Exit',
			'AST_Return',
			'AST_Throw',
			'AST_LoopControl',
			'AST_Break',
			'AST_Continue',
			'AST_If',
			'AST_Switch',
			'AST_SwitchBranch',
			'AST_Default',
			'AST_Case',
			'AST_Try',
			'AST_Catch',
			'AST_Finally',
			'AST_Definitions',
			'AST_Var',
			'AST_Const',
			'AST_VarDef',
			'AST_Call',
			'AST_New',
			'AST_Seq',
			'AST_PropAccess',
			'AST_Dot',
			'AST_Sub',
			'AST_Unary',
			'AST_UnaryPrefix',
			'AST_UnaryPostfix',
			'AST_Binary',
			'AST_Conditional',
			'AST_Assign',
			'AST_Array',
			'AST_Object',
			'AST_ObjectProperty',
			'AST_ObjectKeyVal',
			'AST_ObjectSetter',
			'AST_ObjectGetter',
			'AST_Symbol',
			'AST_SymbolAccessor',
			'AST_SymbolDeclaration',
			'AST_SymbolVar',
			'AST_SymbolConst',
			'AST_SymbolFunarg',
			'AST_SymbolDefun',
			'AST_SymbolLambda',
			'AST_SymbolCatch',
			'AST_Label',
			'AST_SymbolRef',
			'AST_LabelRef',
			'AST_This',
			'AST_Constant',
			'AST_Number',
			'AST_RegExp',
			'AST_Atom',
			'AST_Null',
			'AST_NaN',
			'AST_Undefined',
			'AST_Hole',
			'AST_Infinity',
			'AST_Boolean',
			'AST_False',
			'AST_True'
		],
		matches = [];

	types.forEach(function (t) {
		if (node instanceof UglifyJS[t]) {
			matches.push(t);
		}
	});

	return matches;
}

var util = require('util');
function dump() {
	for (var i = 0; i < arguments.length; i++) {
		console.error(util.inspect(arguments[i], false, null, true));
	}
}
*/
Suite.prototype.prepareAppjs = function prepareAppjs() {
	var dest = path.join(this.buildResourcesDir, 'app.js'),
		appjsContents = fs.readFileSync(dest).toString(),
		ast = UglifyJS.parse(appjsContents, {
			filename: 'app.js'
		});

	// determine the scope for variables so we can find variables and see if they are functions
	ast.figure_out_scope({ screw_ie8: true });

	var stack = [],
		functionsToWrap = [],
		shouldRefs = [];

	/**
	 * The plan:
	 * - walk the ast tree
	 * - find all functions and scan the stack to see if we're inside an async it() call
	 * - for each function definition in an async it()
	 *   - scan the stack to see if the function is being passed into a should() call
	 *     - if it's a should call, then do NOT wrap it since it's probably a throw() test
	 *   - add the test to the functionsToWrap
	 * - if the node is a should() call, determine if the value is a function
	 *   - if should()'s value is a function, then add it to a list of shouldRefs to be excluded
	 */
	var appjsSuiteAST = ast.transform(new UglifyJS.TreeTransformer(function (node, descend) {
			if (node instanceof UglifyJS.AST_Function) {
				// found a function definition, check that it is an it() call with 2+ args and the 2nd one is a function that takes 1+ args (i.e. it's async)
				var i, j, n;
				for (i = stack.length - 1; i >= 0; i--) {
					n = stack[i];
					if (n instanceof UglifyJS.AST_Call && n.expression.name === 'it' && n.args.length >= 2 && n.args[1] instanceof UglifyJS.AST_Function && n.args[1].argnames.length > 0 && stack.length > i + 1) {
						// if this function is being directly passed into a should call, then we do NOT want to wrap it
						// because this is probably a should(function(){}).throw() type call
						var inShould = false;
						for (j = stack.length - 1; j > i; j--) {
							if (stack[j] instanceof UglifyJS.AST_Call && stack[j].expression.name === 'should') {
								inShould = true;
								break;
							}
						}

						if (!inShould) {
							functionsToWrap.push({
								node: node,
								callback: n.args[1].argnames[0].name
							});
							break;
						}
					}
				}
			} else if (node instanceof UglifyJS.AST_Call && node.expression.name === 'should' && node.args.length > 0 && node.args[0] instanceof UglifyJS.AST_SymbolRef) {
				// found a should() call, so we want to check if the value is a function that we'll mark to be excluded from being wrapped
				var ref = node.args[0].thedef.init;
				while (ref && ref instanceof UglifyJS.AST_SymbolRef) {
					ref = ref.thedef.init;
				}
				ref && ref instanceof UglifyJS.AST_Function && shouldRefs.push(ref);
			}

			// add the node to a stack so we can determine if we're in an it() or should() call
			stack.push(node);
			descend(node, this);
			stack.pop();

			return node;
		}));

	// for each function we found, if it's not in the exclusion shouldRefs, then wrap the contents in a try/catch
	functionsToWrap.forEach(function (fn) {
		if (shouldRefs.indexOf(fn.node) === -1) {
			fn.node.body = [
				new UglifyJS.AST_Try({
					body: fn.node.body,
					bcatch: new UglifyJS.AST_Catch({
						argname: new UglifyJS.AST_SymbolCatch({
							name: '$ex'
						}),
						body: [
							new UglifyJS.AST_SimpleStatement({
								body: new UglifyJS.AST_Call({
									args: [
										new UglifyJS.AST_SymbolRef({
											name: '$ex'
										})
									],
									expression: new UglifyJS.AST_SymbolRef({
										name: fn.callback
									})
								})
							})
						]
					})
				})
			];
		}
	});

	// second, inject the suite ast into the template ast
	var injected = false,
		appjsAST = UglifyJS.parse(this.appjsTemplate, {
				filename: 'harness_app.js'
			}).transform(new UglifyJS.TreeTransformer(function (node, descend) {
				if (injected) return node;

				if (node instanceof UglifyJS.AST_SimpleStatement && node.body.value === 'tests go here') {
					// we found our insertion node!
					injected = true;
					return appjsSuiteAST;
				}

				descend(node, this);
				return node;
			}));

	this.injected = injected;

	var sourceMap = this.sourceMap = UglifyJS.SourceMap({
			file: 'app.js',
			orig: null,
			root: null
		}),
		stream = UglifyJS.OutputStream({
			beautify: true,
			screw_ie8: true,
			source_map: sourceMap
		});

	sourceMap.get().setSourceContent('harness_app.js', this.appjsTemplate);
	sourceMap.get().setSourceContent('app.js', appjsContents);

	appjsAST.print(stream);

	fs.existsSync(dest) && fs.unlinkSync(dest);

	// render the custom app.js template
	logger.tio2('Writing new app.js: %s', dest.cyan);
	this.appjs = stream.toString();
	fs.writeFileSync(dest, this.appjs);
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

			if (this.target !== 'device') {
				return cb();
			}

			// find us a device
			ioslib.device.detect(function (err, deviceResults) {
				if (!deviceResults.devices.length) {
					// no devices connected
					return done(new Error('No iOS devices connected'));
				}

				ioslib.certs.detect(function (err, certResults) {
					var certs = [];
					Object.keys(certResults.certs.keychains).forEach(function (keychain) {
						var types = certResults.certs.keychains[keychain];
						Object.keys(types).forEach(function (type) {
							certs = certs.concat(types[type]);
						});
					});

					if (!certs.length) {
						return cb(new Error('No iOS certificates'));
					}

					// find us a provisioning profile
					ioslib.provisioning.find({
						appId: this.tiapp.id,
						certs: certs,
						devicesUDIDs: deviceResults.devices.map(function (device) { return device.udid; })
					}, function (err, profiles) {
						if (err || !profiles.length) {
							return cb(new Error('No provisioning profiles found'));
						}

						var profile = profiles.shift(),
							deviceUDID = deviceResults.devices.filter(function (device) { return profile.devices.indexOf(device.udid) !== -1; }).shift().udid,
							certName = certs.filter(function (cert) {
								var prefix = cert.pem.replace(/^-----BEGIN CERTIFICATE-----\n/, '').substring(0, 60);
								return profile.certs.some(function (pc) {
									return pc.indexOf(prefix) === 0;
								});
							}).shift().name;

						args.push(
							'--developer-name', certName.replace('iPhone Developer: ', ''),
							'--pp-uuid', profile.udid,
							'--device-id', deviceUDID
						);
					});
					cb(err);
				});
			});
		}
	], function (err) {
		if (err) return next(err);

		logger.tio2('Executing: %s', ('titanium "' + args.join('" "') + '"').cyan);

		var child = spawn('titanium', args);

		child.stdout.on('data', function (data) {
			logger['tio2-trace'](data.toString().trim());
		});

		child.stderr.on('data', function (data) {
			logger['tio2-trace'](data.toString().trim());
		});

		child.on('close', function (code) {
			this.appDir = path.join(this.buildDir, 'build', 'iphone', 'build', 'Debug-' + (this.target === 'device' ? 'iphoneos' : 'iphonesimulator'), this.tiapp.name + '.app');
			next(code);
		}.bind(this));
	});
};

Suite.prototype.runApp = function runApp(next) {
	logger.tio2('Running app');

	var self = this,
		target = this.target,
		inTiMochaResult = false,
		tiMochaResults = [],
		logLevelRegExp = /^\[\w+\]\s*/;

	if (this.platform === 'ios') {
		target || (target = 'simulator');

		if (!ioslib[target]) {
			return next(new Error(sprintf('Unsupported iOS target "%s"', target)));
		}

		logger.tio2('Launching iOS app on %s', target.cyan);
		logger['tio2-debug']('Build directory: %s', path.join(this.buildDir, 'build', 'iphone', 'build', 'Debug-' + (target === 'device' ? 'iphoneos' : 'iphonesimulator'), this.tiapp.name + '.app').cyan);

		if (target === 'simulator') {
			var simHandle,
				emitter;

			function watch(line) {
				line = line.replace(logLevelRegExp, '');
				if (line === '!TI_MOCHA_RESULTS_START!') {
					inTiMochaResult = true;
				} else if (inTiMochaResult && line === '!TI_MOCHA_RESULTS_STOP!') {
					emitter.removeListener('log', watch);
					emitter.removeListener('logFile', watch);
					ioslib.simulator.stop(simHandle, function () {
						try {
							self.results = tiMochaResults.length ? JSON.parse(tiMochaResults.join('\n').trim()) : {};
							next();
						} catch (ex) {
							next(new Error('Results are not valid JSON'));
						}
					});
				} else if (inTiMochaResult && line) {
					tiMochaResults.push(line);
				}
			}

			emitter = ioslib.simulator.launch(null, {
					appPath: this.appDir,
					hide: true,
					logFilename: this.tiapp.guid + '.log',
					simVersion: '7.1'
				})
				.on('launched', function (sh) {
					simHandle = sh;
				})
				.on('log', watch)
				.on('log-debug', function (msg) {
					logger['tio2-debug']('[ioslib] '.magenta + msg.replace(/(?:(\[[^\]]+\]) )*/, function (m) { return m.magenta; }));
				})
				.on('log-file', watch);

		} else if (target === 'device') {
			// TODO: device
		}
		return;
	}

/*
	if (this.platform === 'android') {
		var name = this.tiapp.name.charAt(0).toUpperCase() + this.tiapp.name.substring(1);
		target || (target = 'emulator');

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
*/

	// unsupported platform
	next(new Error(sprintf('Unsupported platform "%s"', this.platform)));
};

Suite.prototype.processResults = function processResults() {
	logger.tio2('Processing results');

	var results = this.results.results;

	if (!Array.isArray(results)) {
		return;
	}

	var sourceMappings = new SourceMap.SourceMapConsumer(this.sourceMap.toString()),
		sources = {
			'app.js': this.appjs.split('\n')
		};

	results.forEach(function (r) {
		if (r.state === 'passed') {
			this.passed++;
		} else if (r.state === 'failed') {
			this.failed++;

			// fix up the exceptions if we injected the tests
			if (this.injected && r.error && r.error.backtrace) {
				var bt = r.error.backtrace.split('\n'),
					backtrace = [],
					i = 0,
					l = bt.length,
					info,
					data,
					file,
					pos;

				for (; i < l; i++) {
					info = bt[i].split(/\s/).pop().match(/^(.*\/(.*))\:(\d+)(?:,(\d+))?$/);
					if (info && (backtrace.length || info[2] !== 'should.js')) {
						data = {
							original: bt[i],
							file: (this.appDir ? info[1].replace(this.appDir, '') : info[1]).replace(/^\//, ''),
							line: ~~info[3],
							column: info[4] ? ~~info[4] : null,
							source: null
						};
						if (!sources[data.file]) {
							file = path.join(this.buildResourcesDir, data.file);
							if (fs.existsSync(file)) {
								sources[data.file] = fs.readFileSync(file).toString();
							}
						}
						if (sources[data.file]) {
							pos = data.column ? sourceMappings.originalPositionFor({ line: data, column: data.column }) : null;
							if (!pos || !pos.line) {
								// no column or bad column, try again
								if (line && (data.column = sources[data.file][data.line].match(/\w/).index)) {
									pos = sourceMappings.originalPositionFor(data);
								}
							}
							if (pos && pos.line) {
								data.source = sources[data.file][pos.line];
							}
						}
						backtrace.push(data);
					}
				}

				r.error.backtrace = backtrace;
			}
		}
	}, this);
};

Suite.prototype.cleanup = function cleanup() {
	logger.tio2('Cleaning up');
	wrench.rmdirSyncRecursive(this.buildDir);
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
				// we only want to apply the filter to the root of the directory being copied... I think
				!ignoreDirs.test(name) && copyDirSync(from, to, null, rel);
				// !ignoreDirs.test(name) && copyDirSync(from, to, filter, rel);
			} else if (!ignoreFiles.test(name)) {
				copyFileSync(from, to, rel);
			}
		}
	});
}