module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		appcJs: {
			src: ['Gruntfile.js', 'bin', 'lib/**/*.js']
		}

	});

	// Load grunt plugins for modules
	grunt.loadNpmTasks('grunt-appc-js');

	grunt.registerTask('sample', 'Run sample tio2 project', function () {
		grunt.util.spawn({
			cmd: './bin/tio2',
			args: ['./example', '--platform', 'ios']
		}, grunt.task.current.async());
	});

	// register tasks
	grunt.registerTask('default', ['appcJs', 'sample']);
};
