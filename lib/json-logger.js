const
	path = require('path'),
	common = require(path.join(path.dirname(require.resolve('winston')), 'winston', 'common.js')),
	events = require('events'),
	Transport = require('winston').Transport,
	util = require('util');

module.exports = JSONLogger;

/**
 * Log data to JSON
 * @param {Object} options - Clorize, prettyPrint, timestamp, label, and stringify
 */
function JSONLogger(options) {
	Transport.call(this, options);
	options = options || {};

	this.output = [];

	this.json        = true;
	this.colorize    = options.colorize    || false;
	this.prettyPrint = options.prettyPrint || false;
	this.timestamp   = typeof options.timestamp !== 'undefined' ? options.timestamp : false;
	this.label       = options.label       || null;

	/**
	 * Stringify logs
	 * @param  {Object} obj - object to write out
	 * @return {string} - string of data
	 */
	this.stringify = options.stringify || function (obj) {
		return JSON.stringify(obj);
	};
}

util.inherits(JSONLogger, Transport);

JSONLogger.prototype.name = 'json-logger';

/**
 * Log data
 * @param  {string} level - log level
 * @param  {string} msg - message to log
 * @param  {string} meta - metadata to log
 * @param  {Function} callback [description]
 */
JSONLogger.prototype.log = function log(level, msg, meta, callback) {
	if (this.silent) {
		return callback(null, true);
	}

	this.output.push(common.log({
		colorize:    this.colorize,
		json:        this.json,
		level:       level,
		message:     msg,
		meta:        meta,
		stringify:   this.stringify,
		timestamp:   this.timestamp,
		prettyPrint: this.prettyPrint,
		raw:         this.raw,
		label:       this.label
	}));

	this.emit('logged');
	callback(null, true);
};

/**
 * Clear logs
 */
JSONLogger.prototype.clearLogs = function () {
	this.output = [];
};
