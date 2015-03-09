module.exports = function (grunt) {

	// Project configuration.
	grunt.initConfig({
		appcJs: {
            src: ['Gruntfile.js', 'bin', 'lib/**/*.js']
		}
	});

	// Load grunt plugins for modules
	grunt.loadNpmTasks('grunt-appc-js');

	// register tasks
	grunt.registerTask('default', ['appcJs']);
};
