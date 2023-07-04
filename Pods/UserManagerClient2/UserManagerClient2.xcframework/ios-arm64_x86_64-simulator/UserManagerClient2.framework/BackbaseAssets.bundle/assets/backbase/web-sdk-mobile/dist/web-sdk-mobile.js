/**
 * @license
 * Backbase Web SDK for Android and iOS webviews - Copyright © Backbase B.V - All Rights Reserved
 * Version 6.1.1
 * https://www.backbase.com
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
/**
 * !This is a stripped down version of Bunyan targeted specifically for the browser
 *
 * -------------------------------------------------------------------------------
 *
 * Copyright (c) 2014 Trent Mick. All rights reserved.
 * Copyright (c) 2014 Joyent Inc. All rights reserved.
 *
 * The bunyan logging library for node.js.
 *
 * -*- mode: js -*-
 * vim: expandtab:ts=4:sw=4
 */
    
'use strict';

var VERSION = '0.4.0';

// Bunyan log format version. This becomes the 'v' field on all log records.
// `0` is until I release a version '1.0.0' of node-bunyan. Thereafter,
// starting with `1`, this will be incremented if there is any backward
// incompatible change to the log record format. Details will be in
// 'CHANGES.md' (the change log).
var LOG_VERSION = 0;

//---- Internal support stuff

var CALL_STACK_ERROR = 'call-stack-error';

/**
 * A shallow copy of an object. Bunyan logging attempts to never cause
 * exceptions, so this function attempts to handle non-objects gracefully.
 */
function objCopy(obj) {
    if (typeof obj === 'undefined' || obj === null) {  // null or undefined
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.slice();
    } else if (typeof (obj) === 'object') {
        var copy = {};
        Object.keys(obj).forEach(function (k) {
            copy[k] = obj[k];
        });
        return copy;
    } else {
        return obj;
    }
}

//---- These are simplified versions of util.format without importing the whole module, which would be bulky when browserified

var inspect = function(obj) {
    if(typeof obj === 'undefined') {
        return 'undefined';
    }
    if(obj === null) {
        return 'null';
    }
    if(Array.isArray(obj)) {
        var items = obj.map(function(obj) {
            return inspect(obj);
        });
        return '[ ' + items.join(', ') + ' ]';
    }
    if(typeof obj === 'object') {
        return JSON.stringify(obj);
    }
    if(typeof obj === 'function') {
        return '[Function: ' + obj.name + ']';
    }
    if(typeof obj === 'boolean' || typeof obj === 'number') {
        return obj;
    }
    return '\'' + obj.toString() + '\'';
};

var format = function(f) {

    if (typeof f !== 'string') {
        var objects = new Array(arguments.length);
        for (var index = 0; index < arguments.length; index++) {
            objects[index] = inspect(arguments[index]);
        }
        return objects.join(' ');
    }


    var formatRegExp = /%[sdj%]/g;

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function(x) {
        if (x === '%%') {
            return '%';
        }
        if (i >= len) {
            return x;
        }
        switch (x) {
            case '%s': return String(args[i++]);
            case '%d': return Number(args[i++]);
            case '%j':
                try {
                    return JSON.stringify(args[i++]);
                } catch (_) {
                    return '[Circular]';
                }
                break;
            default:
                return x;
        }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
        str += ' ' + x;
    }
    return str;
};

function extractSrcFromStacktrace(stack, level) {

    var stackLines = stack.split('\n');

    //chrome starts with error
    if(stackLines[0] && stackLines[0].indexOf(CALL_STACK_ERROR) >= 0) {
        stackLines.shift();
    }

    //the line of the stacktrace
    var targetLine = stackLines[level];
    var lineInfo = null;
    if(targetLine) {
        var execResult = /^\s*(at|.*@)\s*(.+)?$/.exec(targetLine);
        if(Array.isArray(execResult) && execResult[2]) {
            lineInfo = execResult[2];
        } else {
            lineInfo = targetLine;    
        }
    }
    return lineInfo;
}

function _indent(s, indent) {
    if (!indent) {
        indent = '    ';
    }
    var lines = s.split(/\r?\n/g);
    return indent + lines.join('\n' + indent);
}


/**
 * Warn about an bunyan processing error.
 *
 * @param msg {String} Message with which to warn.
 * @param dedupKey {String} Optional. A short string key for this warning to
 *      have its warning only printed once.
 */
function _warn(msg, dedupKey) {
    if (dedupKey) {
        if (_warned[dedupKey]) {
            return;
        }
        _warned[dedupKey] = true;
    }
    console.error(msg + '\n');
}
function _haveWarned(dedupKey) {
    return _warned[dedupKey];
}
var _warned = {};


function ConsoleRawStream() {
}
ConsoleRawStream.prototype.write = function (rec) {
    if (rec.level < INFO) {
        console.log(rec);
    } else if (rec.level < WARN) {
        console.info(rec);
    } else if (rec.level < ERROR) {
        console.warn(rec);
    } else {
        console.error(rec);
    }

    if(rec.err && rec.err.stack) {
        console.error(rec.err.stack);
    }
    if(rec.obj) {
        console.log(rec.obj);
    }
};

function ConsoleFormattedStream(opts) {
    opts = opts || {};
    this.logByLevel = !!opts.logByLevel;
}
ConsoleFormattedStream.prototype.write = function (rec) {

    var levelCss,
        defaultCss = 'color: DimGray',
        msgCss = 'color: SteelBlue',
        srcCss = 'color: DimGray; font-style: italic; font-size: 0.9em',
        consoleMethod;

    var loggerName = rec.childName ? rec.name + '/' + rec.childName : rec.name;

    //get level name and pad start with spacs
    var levelName = nameFromLevel[rec.level];
    var formattedLevelName = (Array(6 - levelName.length).join(' ') + levelName).toUpperCase();

    if(this.logByLevel) {
        if(rec.level === TRACE) {
            levelName = 'debug';
        } else if(rec.level === FATAL) {
            levelName = 'error';
        }
        consoleMethod = typeof console[levelName] === 'function' ? console[levelName] : console.log;
    } else {
        consoleMethod = console.log;
    }

    if (rec.level < DEBUG) {
        levelCss = 'color: DeepPink';
    } else if (rec.level < INFO) {
        levelCss = 'color: GoldenRod';
    } else if (rec.level < WARN) {
        levelCss = 'color: DarkTurquoise';
    } else if (rec.level < ERROR) {
        levelCss = 'color: Purple';
    } else if (rec.level < FATAL) {
        levelCss = 'color: Crimson';
    } else {
        levelCss = 'color: Black';
    }

    function padZeros(number, len) {
        return Array((len + 1) - (number + '').length).join('0') + number;
    }

    var logArgs = [];
    logArgs.push('[%s:%s:%s:%s] %c%s%c: %s: %c%s %c%s');
    logArgs.push(padZeros(rec.time.getHours(), 2));
    logArgs.push(padZeros(rec.time.getMinutes(), 2));
    logArgs.push(padZeros(rec.time.getSeconds(), 2));
    logArgs.push(padZeros(rec.time.getMilliseconds(), 4));
    logArgs.push(levelCss);
    logArgs.push(formattedLevelName);
    logArgs.push(defaultCss);
    logArgs.push(loggerName);
    logArgs.push(msgCss);
    logArgs.push(rec.msg);
    if(rec.src) {
        logArgs.push(srcCss);
        logArgs.push(rec.src);
    }

    consoleMethod.apply(console, logArgs);
    if(rec.err && rec.err.stack) {
        consoleMethod.call(console, '%c%s,', levelCss, rec.err.stack);
    }
    if(rec.obj) {
        consoleMethod.call(console, rec.obj);
    }
};

//---- Levels

var TRACE = 10;
var DEBUG = 20;
var INFO = 30;
var WARN = 40;
var ERROR = 50;
var FATAL = 60;

var levelFromName = {
    'trace': TRACE,
    'debug': DEBUG,
    'info': INFO,
    'warn': WARN,
    'error': ERROR,
    'fatal': FATAL
};
var nameFromLevel = {};
Object.keys(levelFromName).forEach(function (name) {
    nameFromLevel[levelFromName[name]] = name;
});

/**
 * Resolve a level number, name (upper or lowercase) to a level number value.
 *
 * @api public
 */
function resolveLevel(nameOrNum) {
    var level = (typeof (nameOrNum) === 'string' ? levelFromName[nameOrNum.toLowerCase()] : nameOrNum);
    return level;
}

//---- Logger class

/**
 * Create a Logger instance.
 *
 * @param options {Object} See documentation for full details. At minimum
 *    this must include a 'name' string key. Configuration keys:
 *      - `streams`: specify the logger output streams. This is an array of
 *        objects with these fields:
 *          - `type`: The stream type. See README.md for full details.
 *            Often this is implied by the other fields. Examples are
 *            'file', 'stream' and "raw".
 *          - `level`: Defaults to 'info'.
 *          - `path` or `stream`: The specify the file path or writeable
 *            stream to which log records are written. E.g.
 *            `stream: process.stdout`.
 *          - `closeOnExit` (boolean): Optional. Default is true for a
 *            'file' stream when `path` is given, false otherwise.
 *        See README.md for full details.
 *      - `level`: set the level for a single output stream (cannot be used
 *        with `streams`)
 *      - `stream`: the output stream for a logger with just one, e.g.
 *        `process.stdout` (cannot be used with `streams`)
 *      - `serializers`: object mapping log record field names to
 *        serializing functions. See README.md for details.
 *      - `src`: Boolean (default false). Set true to enable 'src' automatic
 *        field with log call source info.
 *    All other keys are log record fields.
 *
 * An alternative *internal* call signature is used for creating a child:
 *    new Logger(<parent logger>, <child options>[, <child opts are simple>]);
 *
 * @param _childSimple (Boolean) An assertion that the given `_childOptions`
 *    (a) only add fields (no config) and (b) no serialization handling is
 *    required for them. IOW, this is a fast path for frequent child
 *    creation.
 */
function Logger(options, _childOptions, _childSimple) {
    if (!(this instanceof Logger)) {
        return new Logger(options, _childOptions);
    }

    // Input arg validation.
    var parent;
    if (_childOptions !== undefined) {
        parent = options;
        options = _childOptions;
        if (!(parent instanceof Logger)) {
            throw new TypeError(
                'invalid Logger creation: do not pass a second arg');
        }
    }
    if (!options) {
        throw new TypeError('options (object) is required');
    }
    if (!parent) {
        if (!options.name) {
            throw new TypeError('options.name (string) is required');
        }
    } else {
        if (options.name) {
            throw new TypeError(
                'invalid options.name: child cannot set logger name');
        }
    }
    if (options.stream && options.streams) {
        throw new TypeError('cannot mix "streams" and "stream" options');
    }
    if (options.streams && !Array.isArray(options.streams)) {
        throw new TypeError('invalid options.streams: must be an array');
    }
    if (options.serializers && (typeof (options.serializers) !== 'object' || Array.isArray(options.serializers))) {
        throw new TypeError('invalid options.serializers: must be an object');
    }

    var fields, name, i;

    // Fast path for simple child creation.
    if (parent && _childSimple) {
        // `_isSimpleChild` is a signal to stream close handling that this child
        // owns none of its streams.
        this._isSimpleChild = true;

        this._level = parent._level;
        this.streams = parent.streams;
        this.serializers = parent.serializers;
        this.src = parent.src;
        fields = this.fields = {};
        var parentFieldNames = Object.keys(parent.fields);
        for (i = 0; i < parentFieldNames.length; i++) {
            name = parentFieldNames[i];
            fields[name] = parent.fields[name];
        }
        var names = Object.keys(options);
        for (i = 0; i < names.length; i++) {
            name = names[i];
            fields[name] = options[name];
        }
        return;
    }

    // Null values.
    var self = this;
    if (parent) {
        this._level = parent._level;
        this.streams = [];
        for (i = 0; i < parent.streams.length; i++) {
            var s = objCopy(parent.streams[i]);
            s.closeOnExit = false; // Don't own parent stream.
            this.streams.push(s);
        }
        this.serializers = objCopy(parent.serializers);
        this.src = parent.src;
        this.fields = objCopy(parent.fields);
        if (options.level) {
            this.level(options.level);
        }
    } else {
        this._level = Number.POSITIVE_INFINITY;
        this.streams = [];
        this.serializers = null;
        this.src = false;
        this.fields = {};
    }

    // Handle *config* options (i.e. options that are not just plain data
    // for log records).
    if (options.stream) {
        self.addStream({
            type: 'stream',
            stream: options.stream,
            closeOnExit: false,
            level: options.level
        });
    } else if (options.streams) {
        options.streams.forEach(function (s) {
            self.addStream(s, options.level);
        });
    } else if (parent && options.level) {
        this.level(options.level);
    } else if (!parent) {

        /*
         * In the browser we'll be emitting to console.log by default.
         * Any console.log worth its salt these days can nicely render
         * and introspect objects (e.g. the Firefox and Chrome console)
         * so let's emit the raw log record. Are there browsers for which
         * that breaks things?
         */
        self.addStream({
            type: 'raw',
            stream: new ConsoleRawStream(),
            closeOnExit: false,
            level: options.level
        });

    }
    if (options.serializers) {
        self.addSerializers(options.serializers);
    }
    if (options.src) {
        this.src = true;
    }

    // Fields.
    // These are the default fields for log records (minus the attributes
    // removed in this constructor). To allow storing raw log records
    // (unrendered), `this.fields` must never be mutated. Create a copy for
    // any changes.
    fields = objCopy(options);
    delete fields.stream;
    delete fields.level;
    delete fields.streams;
    delete fields.serializers;
    delete fields.src;
    if (this.serializers) {
        this._applySerializers(fields);
    }
    Object.keys(fields).forEach(function (k) {
        self.fields[k] = fields[k];
    });
}

/**
 * Add a stream
 *
 * @param stream {Object}. Object with these fields:
 *    - `type`: The stream type. See README.md for full details.
 *      Often this is implied by the other fields. Examples are
 *      'file', 'stream' and "raw".
 *    - `path` or `stream`: The specify the file path or writeable
 *      stream to which log records are written. E.g.
 *      `stream: process.stdout`.
 *    - `level`: Optional. Falls back to `defaultLevel`.
 *    - `closeOnExit` (boolean): Optional. Default is true for a
 *      'file' stream when `path` is given, false otherwise.
 *    See README.md for full details.
 * @param defaultLevel {Number|String} Optional. A level to use if
 *      `stream.level` is not set. If neither is given, this defaults to INFO.
 */
Logger.prototype.addStream = function addStream(s, defaultLevel) {
    var self = this;
    if (defaultLevel === null || defaultLevel === undefined) {
        defaultLevel = INFO;
    }

    s = objCopy(s);

    //in browser bunyan, streams are always raw
    s.type = 'raw';

    if (s.level) {
        s.level = resolveLevel(s.level);
    } else {
        s.level = resolveLevel(defaultLevel);
    }
    if (s.level < self._level) {
        self._level = s.level;
    }

    if (!s.closeOnExit) {
        s.closeOnExit = false;
    }

    self.streams.push(s);
    delete self.haveNonRawStreams;  // reset
};


/**
 * Add serializers
 *
 * @param serializers {Object} Optional. Object mapping log record field names
 *    to serializing functions. See README.md for details.
 */
Logger.prototype.addSerializers = function addSerializers(serializers) {
    var self = this;

    if (!self.serializers) {
        self.serializers = {};
    }
    Object.keys(serializers).forEach(function (field) {
        var serializer = serializers[field];
        if (typeof (serializer) !== 'function') {
            throw new TypeError(format(
                'invalid serializer for "%s" field: must be a function',
                field));
        } else {
            self.serializers[field] = serializer;
        }
    });
};


/**
 * Create a child logger, typically to add a few log record fields.
 *
 * This can be useful when passing a logger to a sub-component, e.g. a
 * 'wuzzle' component of your service:
 *
 *    var wuzzleLog = log.child({component: 'wuzzle'})
 *    var wuzzle = new Wuzzle({..., log: wuzzleLog})
 *
 * Then log records from the wuzzle code will have the same structure as
 * the app log, *plus the component='wuzzle' field*.
 *
 * @param options {Object} Optional. Set of options to apply to the child.
 *    All of the same options for a new Logger apply here. Notes:
 *      - The parent's streams are inherited and cannot be removed in this
 *        call. Any given `streams` are *added* to the set inherited from
 *        the parent.
 *      - The parent's serializers are inherited, though can effectively be
 *        overwritten by using duplicate keys.
 *      - Can use `level` to set the level of the streams inherited from
 *        the parent. The level for the parent is NOT affected.
 * @param simple {Boolean} Optional. Set to true to assert that `options`
 *    (a) only add fields (no config) and (b) no serialization handling is
 *    required for them. IOW, this is a fast path for frequent child
 *    creation. See 'tools/timechild.js' for numbers.
 */
Logger.prototype.child = function (options, simple) {
    return new (this.constructor)(this, options || {}, simple);
};

/**
 * Get/set the level of all streams on this logger.
 *
 * Get Usage:
 *    // Returns the current log level (lowest level of all its streams).
 *    log.level() -> INFO
 *
 * Set Usage:
 *    log.level(INFO)       // set all streams to level INFO
 *    log.level('info')     // can use 'info' et al aliases
 */
Logger.prototype.level = function level(value) {
    if (value === undefined) {
        return this._level;
    }
    var newLevel = resolveLevel(value);
    var len = this.streams.length;
    for (var i = 0; i < len; i++) {
        this.streams[i].level = newLevel;
    }
    this._level = newLevel;
};


/**
 * Get/set the level of a particular stream on this logger.
 *
 * Get Usage:
 *    // Returns an array of the levels of each stream.
 *    log.levels() -> [TRACE, INFO]
 *
 *    // Returns a level of the identified stream.
 *    log.levels(0) -> TRACE      // level of stream at index 0
 *    log.levels('foo')           // level of stream with name 'foo'
 *
 * Set Usage:
 *    log.levels(0, INFO)         // set level of stream 0 to INFO
 *    log.levels(0, 'info')       // can use 'info' et al aliases
 *    log.levels('foo', WARN)     // set stream named 'foo' to WARN
 *
 * Stream names: When streams are defined, they can optionally be given
 * a name. For example,
 *       log = new Logger({
 *         streams: [
 *           {
 *             name: 'foo',
 *             path: '/var/log/my-service/foo.log'
 *             level: 'trace'
 *           },
 *         ...
 *
 * @param name {String|Number} The stream index or name.
 * @param value {Number|String} The level value (INFO) or alias ('info').
 *    If not given, this is a 'get' operation.
 * @throws {Error} If there is no stream with the given name.
 */
Logger.prototype.levels = function levels(name, value) {
    if (name === undefined) {
        return this.streams.map(
            function (s) {
                return s.level;
            });
    }
    var stream;
    if (typeof (name) === 'number') {
        stream = this.streams[name];
        if (stream === undefined) {
            throw new Error('invalid stream index: ' + name);
        }
    } else {
        var len = this.streams.length;
        for (var i = 0; i < len; i++) {
            var s = this.streams[i];
            if (s.name === name) {
                stream = s;
                break;
            }
        }
        if (!stream) {
            throw new Error(format('no stream with name "%s"', name));
        }
    }
    if (value === undefined) {
        return stream.level;
    } else {
        var newLevel = resolveLevel(value);
        stream.level = newLevel;
        if (newLevel < this._level) {
            this._level = newLevel;
        }
    }
};


/**
 * Apply registered serializers to the appropriate keys in the given fields.
 *
 * Pre-condition: This is only called if there is at least one serializer.
 *
 * @param fields (Object) The log record fields.
 * @param excludeFields (Object) Optional mapping of keys to `true` for
 *    keys to NOT apply a serializer.
 */
Logger.prototype._applySerializers = function (fields, excludeFields) {
    var self = this;

    // Check each serializer against these (presuming number of serializers
    // is typically less than number of fields).
    Object.keys(this.serializers).forEach(function (name) {
        if (fields[name] === undefined ||
            (excludeFields && excludeFields[name])) {
            return;
        }
        try {
            fields[name] = self.serializers[name](fields[name]);
        } catch (err) {
            _warn(format('bunyan: ERROR: Exception thrown from the "%s" ' +
                    'Bunyan serializer. This should never happen. This is a bug' +
                    'in that serializer function.\n%s',
                name, err.stack || err));
            fields[name] = format('(Error in Bunyan log "%s" serializer broke field. See stderr for details.)', name);
        }
    });
};


/**
 * Emit a log record.
 *
 * @param rec {log record}
 * @param noemit {Boolean} Optional. Set to true to skip emission
 *      and just return the JSON string.
 */
Logger.prototype._emit = function (rec, noemit) {
    var i;

    // Lazily determine if this Logger has non-'raw' streams. If there are
    // any, then we need to stringify the log record.
    if (this.haveNonRawStreams === undefined) {
        this.haveNonRawStreams = false;
        for (i = 0; i < this.streams.length; i++) {
            if (!this.streams[i].raw) {
                this.haveNonRawStreams = true;
                break;
            }
        }
    }

    // Stringify the object. Attempt to warn/recover on error.
    var str;
    if (noemit || this.haveNonRawStreams) {
        try {
            str = JSON.stringify(rec, safeCycles()) + '\n';
        } catch (e) {
            var dedupKey = e.stack.split(/\n/g, 2).join('\n');
            _warn('bunyan: ERROR: Exception in ' +
                    '`JSON.stringify(rec)`. You can install the ' +
                    '"safe-json-stringify" module to have Bunyan fallback ' +
                    'to safer stringification. Record:\n' +
                    _indent(format('%s\n%s', rec, e.stack)),
                dedupKey);
            str = format('(Exception in JSON.stringify(rec): %j. See stderr for details.)\n', e.message);

        }
    }

    if (noemit) {
        return str;
    }


    var level = rec.level;
    for (i = 0; i < this.streams.length; i++) {
        var s = this.streams[i];
        if (s.level <= level) {
            s.stream.write(rec);
        }
    }

    return str;
};


/**
 * Build a log emitter function for level minLevel. I.e. this is the
 * creator of `log.info`, `log.error`, etc.
 */
function mkLogEmitter(minLevel) {
    return function () {
        var log = this;

        function mkRecord(args) {
            var excludeFields;
            if (args[0] instanceof Error) {
                // `log.<level>(err, ...)`
                fields = {
                    // Use this Logger's err serializer, if defined.
                    err: (log.serializers && log.serializers.err ? log.serializers.err(args[0]) : Logger.stdSerializers.err(args[0]))
                };
                excludeFields = {err: true};
                if (args.length === 1) {
                    msgArgs = [fields.err.message];
                } else {
                    msgArgs = Array.prototype.slice.call(args, 1);
                }
            } else if (typeof (args[0]) !== 'object' && args[0] !== null || Array.isArray(args[0])) {
                // `log.<level>(msg, ...)`
                fields = null;
                msgArgs = Array.prototype.slice.call(args);
            } else {
                // `log.<level>(fields, msg, ...)`
                fields = args[0];
                if (args.length === 1 && fields.err && fields.err instanceof Error)
                {
                    msgArgs = [fields.err.message];
                } else {
                    msgArgs = Array.prototype.slice.call(args, 1);
                }
            }

            // Build up the record object.
            var rec = objCopy(log.fields);
            rec.level = minLevel;
            var recFields = (fields ? objCopy(fields) : null);
            if (recFields) {
                if (log.serializers) {
                    log._applySerializers(recFields, excludeFields);
                }
                Object.keys(recFields).forEach(function (k) {
                    rec[k] = recFields[k];
                });
            }
            rec.levelName = nameFromLevel[minLevel];
            rec.msg = msgArgs.length ? format.apply(log, msgArgs) : '';
            if (!rec.time) {
                rec.time = (new Date());
            }
            // Get call source info
            if (log.src && !rec.src) {
                try {
                    //need to throw the error so there is a stack in IE		 	
                    throw new Error(CALL_STACK_ERROR);
                } catch(err) {
                    var src = extractSrcFromStacktrace(err.stack, 2);
                    if(!src && !_haveWarned('src')) {
                        _warn('Unable to determine src line info', 'src');    
                    }
                    rec.src = src || '';
                }
            }
            rec.v = LOG_VERSION;
            return rec;
        }

        var fields = null;
        var msgArgs = arguments;
        var rec = null;
        if (arguments.length === 0) {   // `log.<level>()`
            return (this._level <= minLevel);
        } else if (this._level > minLevel) {
            /* pass through */
        } else {
            rec = mkRecord(msgArgs);
            this._emit(rec);
        }
    };
}


/**
 * The functions below log a record at a specific level.
 *
 * Usages:
 *    log.<level>()  -> boolean is-trace-enabled
 *    log.<level>(<Error> err, [<string> msg, ...])
 *    log.<level>(<string> msg, ...)
 *    log.<level>(<object> fields, <string> msg, ...)
 *
 * where <level> is the lowercase version of the log level. E.g.:
 *
 *    log.info()
 *
 * @params fields {Object} Optional set of additional fields to log.
 * @params msg {String} Log message. This can be followed by additional
 *    arguments that are handled like
 *    [util.format](http://nodejs.org/docs/latest/api/all.html#util.format).
 */
Logger.prototype.trace = mkLogEmitter(TRACE);
Logger.prototype.debug = mkLogEmitter(DEBUG);
Logger.prototype.info = mkLogEmitter(INFO);
Logger.prototype.warn = mkLogEmitter(WARN);
Logger.prototype.error = mkLogEmitter(ERROR);
Logger.prototype.fatal = mkLogEmitter(FATAL);


//---- Standard serializers
// A serializer is a function that serializes a JavaScript object to a
// JSON representation for logging. There is a standard set of presumed
// interesting objects in node.js-land.

Logger.stdSerializers = {};

/*
 * This function dumps long stack traces for exceptions having a cause()
 * method. The error classes from
 * [verror](https://github.com/davepacheco/node-verror) and
 * [restify v2.0](https://github.com/mcavage/node-restify) are examples.
 *
 * Based on `dumpException` in
 * https://github.com/davepacheco/node-extsprintf/blob/master/lib/extsprintf.js
 */
function getFullErrorStack(ex) {
    var ret = ex.stack || ex.toString();
    if (ex.cause && typeof (ex.cause) === 'function') {
        var cex = ex.cause();
        if (cex) {
            ret += '\nCaused by: ' + getFullErrorStack(cex);
        }
    }
    return (ret);
}

// Serialize an Error object
// (Core error properties are enumerable in node 0.4, not in 0.6).
Logger.stdSerializers.err = function(err) {
    if (!err || !err.stack) {
        return err;
    }

    var obj = {
        message: err.message,
        name: err.name,
        stack: getFullErrorStack(err),
        code: err.code,
        signal: err.signal
    };
    return obj;
};

// A JSON stringifier that handles cycles safely.
// Usage: JSON.stringify(obj, safeCycles())
function safeCycles() {
    var seen = [];
    return function (key, val) {
        if (!val || typeof (val) !== 'object') {
            return val;
        }
        if (seen.indexOf(val) !== -1) {
            return '[Circular]';
        }
        seen.push(val);
        return val;
    };
}

//---- Exports

module.exports = Logger;

module.exports.TRACE = TRACE;
module.exports.DEBUG = DEBUG;
module.exports.INFO = INFO;
module.exports.WARN = WARN;
module.exports.ERROR = ERROR;
module.exports.FATAL = FATAL;
module.exports.resolveLevel = resolveLevel;
module.exports.levelFromName = levelFromName;
module.exports.nameFromLevel = nameFromLevel;

module.exports.VERSION = VERSION;
module.exports.LOG_VERSION = LOG_VERSION;

module.exports.createLogger = function createLogger(options) {
    return new Logger(options);
};

// Useful for custom `type == 'raw'` streams that may do JSON stringification
// of log records themselves. Usage:
//    var str = JSON.stringify(rec, bunyan.safeCycles());
module.exports.safeCycles = safeCycles;

//streams
module.exports.ConsoleFormattedStream = ConsoleFormattedStream;
module.exports.ConsoleRawStream = ConsoleRawStream;

},{}],3:[function(require,module,exports){
'use strict';

var Handlebars = require('handlebars/dist/handlebars.min');

//TODO: once handlebars-helpers is refactored into the widget engine, make this enum common
var securityProfiles = {
    /**Read, Write, Create, Delete, Admin update rights = 16*/
    ADMIN: 16,
    /**Read, Write, Create, Delete = 8*/
    CREATOR: 8,
    /**Read, Write, Create = 4*/
    COLLABORATOR: 4,
    /**Read, Write = 2*/
    CONTRIBUTOR: 2,
    /**Read = 1*/
    CONSUMER: 1,
    /**No rights*/
    NONE: 0
};

/**
 * Loop through a range of two integers inclusive
 * {{#range 1 10}}
 *   <li>Number: {{@index}}</li>
 * {{/range}}
 * @param {number} from An integer to loop from
 * @param {number} to An integer to loop to
 */
function range (from, to, hbOptions) {
    /* jshint validthis: true */
    var accum = '';
    from = parseInt(from, 10);
    to = parseInt(to, 10);

    if(isNaN(from) || isNaN(to)) {
        return '';
    }

    var data;
    var sign = from > to ? -1 : 1;
    var rangeLength = Math.abs(to - from) + 1;

    if (hbOptions.data) {
        data = Handlebars.createFrame(hbOptions.data);
    }

    for (var i = 0; i < rangeLength; i++) {
        if (data) {
            data.index = from + (i * sign);
            data.from = from;
            data.to = to;
        }

        accum += hbOptions.fn(this, { data: data });
    }
    return accum;
}

/**
 * @deprecated Use preferences.name instead
 */
function withPreference(name, hbOptions) {
    /* jshint validthis: true */
    if (this.preferences) {
        return hbOptions.fn(this.preferences[name]);
    }
}

 /**
 * @deprecated Use preferences.name.value instead
 */
function getPreferenceValue (name) {
    /* jshint validthis: true */
    if(this.preferences) {
        var pref = this.preferences[name];
        return pref ? pref.value : null;
    }
    return null;
}

/**
 * Divides one value by another. Returns the largest integer less or equal to the result
 *  `{{divide 25 5 }}` == 5
 * @param {{number}} v1
 * @param {{number}} v2
 * @returns {number}
 */
function divide (v1, v2) {
    return Math.floor(parseFloat(v1) / parseFloat(v2));
}

/**
 * Checks whether both parameters are identical (strictly equal)
 * @param {{any}} v1
 * @param {{any}} v2
 * @returns {Boolean}
 */
function equal (v1, v2) {
    /* jshint eqeqeq: false */
    return v1 == v2; //type coersion ok here
}

/**
 * Checks if the given one or more view hints exists in the property
 * @deprecated Use getViewHint instead
 * @param {Array} viewHints Array of view hints
 * @param {String} name Name parameter can be more than one
 */
function hasViewHint () {
    /* jshint validthis: true */
    var args = Array.prototype.slice.call(arguments);
    var hbOptions = args[args.length - 1];
    var names = args.slice(0, args.length - 1);

    for (var i = 0; i < names.length; i++) {
        if (this.viewhints && this.viewhints.indexOf(names[i]) >= 0) {
            return hbOptions.fn(this);
        }
    }

    return hbOptions.inverse(this);
}

/**
* Gets viewhint value of given type
* @param {String} viewhint type
*/
function getViewHint (viewHintType) {
    /* jshint validthis: true */
    //TODO: this code is temporarily duplicated in cxp-web-apis as a static function of the model helpers.
    //This code and the code in the cxp-web-apis should be consolidated to the widget engine as part of BACKLOG-12205

    var viewHintsMap = {
        designmode: ['designModeOnly'],
        role: ['admin', 'manager', 'user', 'none'],
        input: ['text-input', 'checkbox', 'select-one'],
        order: [],
        options: []
    };

    var viewhints = this.viewhints;
    if(!viewhints || !viewhints.length || !viewHintsMap[viewHintType]) {
        return undefined;
    }

    //TODO: consider use of memoization as the helper tends to be called multiple times
    // with the same argument
    //look for matching value
    var viewHintTypeLength = viewHintType.length;
    var matchedViewHint = viewhints.filter(function(viewHint) {
        return viewHintsMap[viewHintType].indexOf(viewHint) !== -1 ||
            viewHint.slice(0, viewHintTypeLength) === viewHintType;
    })[0];

    // get unprefixed value
    if (matchedViewHint && matchedViewHint.slice(0, viewHintTypeLength) === viewHintType) {
        var separator = matchedViewHint.slice(viewHintTypeLength, viewHintTypeLength + 1);

        // support both '-' (for backwards compatibility) and '=' separator chars for order only
        if (viewHintType === 'order' && (separator === '-' || separator === '=')) {
            var order = matchedViewHint.slice(viewHintTypeLength + 1);
            var parsedOrder = parseFloat(order);

            if (!isNaN(parsedOrder)) {
                order = parsedOrder;
            }
            matchedViewHint = order;
        } else if (separator === '=') {
            matchedViewHint = matchedViewHint.slice(viewHintTypeLength + 1);
        } else {
            // unsupported prefix
            matchedViewHint = undefined;
        }
    }

    //convert to boolean if it's designmode view hint
    if(viewHintType === 'designmode') {
        matchedViewHint = !!matchedViewHint;
    }

    return matchedViewHint;
}

/**
* Finds an option set defined in an options.json
* @param {String} [optionName] option set name. If not specified, the helper assumes that the current options is
* a preference and tries to get option name fron its "options" view hint.
*/
function eachOption (optionName, hbOptions) {
    /* jshint validthis: true */
    var result = '';

    if (!optionName || typeof optionName !== 'string') {
        return result;
    }
    var eachOption = (hbOptions.data && hbOptions.data.options) && hbOptions.data.options[optionName];

    if (!Array.isArray(eachOption)) {
        return result;
    }

    var last = eachOption.length - 1;
    result = eachOption.reduce(function(acc, item, index) {

        var itemMeta = {        
            index: index,
            first: index === 0,
            last: index === last
        };
        
        return acc += hbOptions.fn(item, { data: itemMeta });
    }, '');

    return result;
}

/**
 * Tests whether any of arguments passed have truthy value
 * @returns {Boolean} true if one of arguments is truthy, false otherwise.
 */
function or () {
    return Array.prototype.slice.call(arguments, 0, arguments.length - 1).some(function (val) {
        return !!val;
    });
}

/**
 * Tests whether every argument passed has truthy value
 * @returns {Boolean} true if all arguments are truthy, false otherwise.
 */
function and () {
    return Array.prototype.slice.call(arguments, 0, arguments.length - 1).every(function (val) {
        return !!val;
    });
}

/**
 * Coerces argument to boolean type and inverts it
 * @param {*} value
 * @returns {boolean}
 */
function not (value) {
    return !value;
}

/**
 * Returns a configuration option value
 * @param {String} name configuration option
 * @returns {*}
 */
function getConfig (name, hbOptions) {
    var data = hbOptions.data;
    return data.cxpConfig ? data.cxpConfig[name] : undefined;
}

/**
 * Determines if an item has a given view mode
 * @param {string} viewmode A view mode to check for
 * @returns {boolean}
 */
function hasViewmode (viewmode) {
    /* jshint validthis: true */
    var viewmodes = this.viewmodes || [];
    var givenViewmode = viewmode ? viewmode.toLowerCase() : '';

    return viewmodes.indexOf(givenViewmode) > -1;
}

/**
 * Gets current (the first in the list) view mode of an item
 * @returns {String} Current view mode (if any) or "none" otherwise
 */
function currentViewmode () {
    /* jshint validthis: true */
    return this.viewmodes && this.viewmodes.length ? this.viewmodes[0] : 'none';
}

/**
 * Runs then block if any of the preferences has viewhints
 */
function allowEdit (hbOptions) {
    /* jshint validthis: true */
    var preferences = this.preferences;

    var allowEdit =
        //has preferences
        Object.keys(preferences).length > 0 &&

        //has permissions:
        (this.securityProfile && securityProfiles[this.securityProfile] >= securityProfiles.CONTRIBUTOR) &&

        //view hints enable editing
        //TODO: this will need updating to use preferences as map AND check if for input viewhints
        Object.keys(preferences).some(function(prefName) {
            return preferences[prefName].viewhints && preferences[prefName].viewhints.length > 0;
        });

    if(allowEdit) {
        return hbOptions.fn(this);
    } else {
        return hbOptions.inverse(this);
    }
}

/**
 * Splits a string by given separator
 * @param {string} string A string to be splitted
 * @param {string} [separator=/\s*,+\s*|\s+/g] A separator for splitting
 * @returns {Array} Array of splitted values
 */
function split (string, separator) {
    if(typeof string !== 'string') {
        return [];
    }
    var regex = new RegExp(separator);

    //defaults to comma or spaces separation
    if(typeof separator !== 'string') {
        regex = /\s*,+\s*|\s+/g;
    }
    return string.trim().split(regex);
}

module.exports = {
    range               : range,
    withPreference      : withPreference,
    getPreferenceValue  : getPreferenceValue,
    divide              : divide,
    equal               : equal,
    hasViewHint         : hasViewHint,
    getViewHint         : getViewHint,
    eachOption          : eachOption,
    or                  : or,
    and                 : and,
    not                 : not,
    getConfig           : getConfig,
    hasViewmode         : hasViewmode,
    currentViewmode     : currentViewmode,
    allowEdit           : allowEdit,
    split               : split
};

},{"handlebars/dist/handlebars.min":4}],4:[function(require,module,exports){
/**!

 @license
 handlebars v4.0.10

Copyright (C) 2011-2016 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
!function(a,b){"object"==typeof exports&&"object"==typeof module?module.exports=b():"function"==typeof define&&define.amd?define([],b):"object"==typeof exports?exports.Handlebars=b():a.Handlebars=b()}(this,function(){return function(a){function b(d){if(c[d])return c[d].exports;var e=c[d]={exports:{},id:d,loaded:!1};return a[d].call(e.exports,e,e.exports,b),e.loaded=!0,e.exports}var c={};return b.m=a,b.c=c,b.p="",b(0)}([function(a,b,c){"use strict";function d(){var a=r();return a.compile=function(b,c){return k.compile(b,c,a)},a.precompile=function(b,c){return k.precompile(b,c,a)},a.AST=i["default"],a.Compiler=k.Compiler,a.JavaScriptCompiler=m["default"],a.Parser=j.parser,a.parse=j.parse,a}var e=c(1)["default"];b.__esModule=!0;var f=c(2),g=e(f),h=c(35),i=e(h),j=c(36),k=c(41),l=c(42),m=e(l),n=c(39),o=e(n),p=c(34),q=e(p),r=g["default"].create,s=d();s.create=d,q["default"](s),s.Visitor=o["default"],s["default"]=s,b["default"]=s,a.exports=b["default"]},function(a,b){"use strict";b["default"]=function(a){return a&&a.__esModule?a:{"default":a}},b.__esModule=!0},function(a,b,c){"use strict";function d(){var a=new h.HandlebarsEnvironment;return n.extend(a,h),a.SafeString=j["default"],a.Exception=l["default"],a.Utils=n,a.escapeExpression=n.escapeExpression,a.VM=p,a.template=function(b){return p.template(b,a)},a}var e=c(3)["default"],f=c(1)["default"];b.__esModule=!0;var g=c(4),h=e(g),i=c(21),j=f(i),k=c(6),l=f(k),m=c(5),n=e(m),o=c(22),p=e(o),q=c(34),r=f(q),s=d();s.create=d,r["default"](s),s["default"]=s,b["default"]=s,a.exports=b["default"]},function(a,b){"use strict";b["default"]=function(a){if(a&&a.__esModule)return a;var b={};if(null!=a)for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&(b[c]=a[c]);return b["default"]=a,b},b.__esModule=!0},function(a,b,c){"use strict";function d(a,b,c){this.helpers=a||{},this.partials=b||{},this.decorators=c||{},i.registerDefaultHelpers(this),j.registerDefaultDecorators(this)}var e=c(1)["default"];b.__esModule=!0,b.HandlebarsEnvironment=d;var f=c(5),g=c(6),h=e(g),i=c(10),j=c(18),k=c(20),l=e(k),m="4.0.10";b.VERSION=m;var n=7;b.COMPILER_REVISION=n;var o={1:"<= 1.0.rc.2",2:"== 1.0.0-rc.3",3:"== 1.0.0-rc.4",4:"== 1.x.x",5:"== 2.0.0-alpha.x",6:">= 2.0.0-beta.1",7:">= 4.0.0"};b.REVISION_CHANGES=o;var p="[object Object]";d.prototype={constructor:d,logger:l["default"],log:l["default"].log,registerHelper:function(a,b){if(f.toString.call(a)===p){if(b)throw new h["default"]("Arg not supported with multiple helpers");f.extend(this.helpers,a)}else this.helpers[a]=b},unregisterHelper:function(a){delete this.helpers[a]},registerPartial:function(a,b){if(f.toString.call(a)===p)f.extend(this.partials,a);else{if("undefined"==typeof b)throw new h["default"]('Attempting to register a partial called "'+a+'" as undefined');this.partials[a]=b}},unregisterPartial:function(a){delete this.partials[a]},registerDecorator:function(a,b){if(f.toString.call(a)===p){if(b)throw new h["default"]("Arg not supported with multiple decorators");f.extend(this.decorators,a)}else this.decorators[a]=b},unregisterDecorator:function(a){delete this.decorators[a]}};var q=l["default"].log;b.log=q,b.createFrame=f.createFrame,b.logger=l["default"]},function(a,b){"use strict";function c(a){return k[a]}function d(a){for(var b=1;b<arguments.length;b++)for(var c in arguments[b])Object.prototype.hasOwnProperty.call(arguments[b],c)&&(a[c]=arguments[b][c]);return a}function e(a,b){for(var c=0,d=a.length;c<d;c++)if(a[c]===b)return c;return-1}function f(a){if("string"!=typeof a){if(a&&a.toHTML)return a.toHTML();if(null==a)return"";if(!a)return a+"";a=""+a}return m.test(a)?a.replace(l,c):a}function g(a){return!a&&0!==a||!(!p(a)||0!==a.length)}function h(a){var b=d({},a);return b._parent=a,b}function i(a,b){return a.path=b,a}function j(a,b){return(a?a+".":"")+b}b.__esModule=!0,b.extend=d,b.indexOf=e,b.escapeExpression=f,b.isEmpty=g,b.createFrame=h,b.blockParams=i,b.appendContextPath=j;var k={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;","=":"&#x3D;"},l=/[&<>"'`=]/g,m=/[&<>"'`=]/,n=Object.prototype.toString;b.toString=n;var o=function(a){return"function"==typeof a};o(/x/)&&(b.isFunction=o=function(a){return"function"==typeof a&&"[object Function]"===n.call(a)}),b.isFunction=o;var p=Array.isArray||function(a){return!(!a||"object"!=typeof a)&&"[object Array]"===n.call(a)};b.isArray=p},function(a,b,c){"use strict";function d(a,b){var c=b&&b.loc,g=void 0,h=void 0;c&&(g=c.start.line,h=c.start.column,a+=" - "+g+":"+h);for(var i=Error.prototype.constructor.call(this,a),j=0;j<f.length;j++)this[f[j]]=i[f[j]];Error.captureStackTrace&&Error.captureStackTrace(this,d);try{c&&(this.lineNumber=g,e?Object.defineProperty(this,"column",{value:h,enumerable:!0}):this.column=h)}catch(k){}}var e=c(7)["default"];b.__esModule=!0;var f=["description","fileName","lineNumber","message","name","number","stack"];d.prototype=new Error,b["default"]=d,a.exports=b["default"]},function(a,b,c){a.exports={"default":c(8),__esModule:!0}},function(a,b,c){var d=c(9);a.exports=function(a,b,c){return d.setDesc(a,b,c)}},function(a,b){var c=Object;a.exports={create:c.create,getProto:c.getPrototypeOf,isEnum:{}.propertyIsEnumerable,getDesc:c.getOwnPropertyDescriptor,setDesc:c.defineProperty,setDescs:c.defineProperties,getKeys:c.keys,getNames:c.getOwnPropertyNames,getSymbols:c.getOwnPropertySymbols,each:[].forEach}},function(a,b,c){"use strict";function d(a){g["default"](a),i["default"](a),k["default"](a),m["default"](a),o["default"](a),q["default"](a),s["default"](a)}var e=c(1)["default"];b.__esModule=!0,b.registerDefaultHelpers=d;var f=c(11),g=e(f),h=c(12),i=e(h),j=c(13),k=e(j),l=c(14),m=e(l),n=c(15),o=e(n),p=c(16),q=e(p),r=c(17),s=e(r)},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5);b["default"]=function(a){a.registerHelper("blockHelperMissing",function(b,c){var e=c.inverse,f=c.fn;if(b===!0)return f(this);if(b===!1||null==b)return e(this);if(d.isArray(b))return b.length>0?(c.ids&&(c.ids=[c.name]),a.helpers.each(b,c)):e(this);if(c.data&&c.ids){var g=d.createFrame(c.data);g.contextPath=d.appendContextPath(c.data.contextPath,c.name),c={data:g}}return f(b,c)})},a.exports=b["default"]},function(a,b,c){"use strict";var d=c(1)["default"];b.__esModule=!0;var e=c(5),f=c(6),g=d(f);b["default"]=function(a){a.registerHelper("each",function(a,b){function c(b,c,f){j&&(j.key=b,j.index=c,j.first=0===c,j.last=!!f,k&&(j.contextPath=k+b)),i+=d(a[b],{data:j,blockParams:e.blockParams([a[b],b],[k+b,null])})}if(!b)throw new g["default"]("Must pass iterator to #each");var d=b.fn,f=b.inverse,h=0,i="",j=void 0,k=void 0;if(b.data&&b.ids&&(k=e.appendContextPath(b.data.contextPath,b.ids[0])+"."),e.isFunction(a)&&(a=a.call(this)),b.data&&(j=e.createFrame(b.data)),a&&"object"==typeof a)if(e.isArray(a))for(var l=a.length;h<l;h++)h in a&&c(h,h,h===a.length-1);else{var m=void 0;for(var n in a)a.hasOwnProperty(n)&&(void 0!==m&&c(m,h-1),m=n,h++);void 0!==m&&c(m,h-1,!0)}return 0===h&&(i=f(this)),i})},a.exports=b["default"]},function(a,b,c){"use strict";var d=c(1)["default"];b.__esModule=!0;var e=c(6),f=d(e);b["default"]=function(a){a.registerHelper("helperMissing",function(){if(1!==arguments.length)throw new f["default"]('Missing helper: "'+arguments[arguments.length-1].name+'"')})},a.exports=b["default"]},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5);b["default"]=function(a){a.registerHelper("if",function(a,b){return d.isFunction(a)&&(a=a.call(this)),!b.hash.includeZero&&!a||d.isEmpty(a)?b.inverse(this):b.fn(this)}),a.registerHelper("unless",function(b,c){return a.helpers["if"].call(this,b,{fn:c.inverse,inverse:c.fn,hash:c.hash})})},a.exports=b["default"]},function(a,b){"use strict";b.__esModule=!0,b["default"]=function(a){a.registerHelper("log",function(){for(var b=[void 0],c=arguments[arguments.length-1],d=0;d<arguments.length-1;d++)b.push(arguments[d]);var e=1;null!=c.hash.level?e=c.hash.level:c.data&&null!=c.data.level&&(e=c.data.level),b[0]=e,a.log.apply(a,b)})},a.exports=b["default"]},function(a,b){"use strict";b.__esModule=!0,b["default"]=function(a){a.registerHelper("lookup",function(a,b){return a&&a[b]})},a.exports=b["default"]},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5);b["default"]=function(a){a.registerHelper("with",function(a,b){d.isFunction(a)&&(a=a.call(this));var c=b.fn;if(d.isEmpty(a))return b.inverse(this);var e=b.data;return b.data&&b.ids&&(e=d.createFrame(b.data),e.contextPath=d.appendContextPath(b.data.contextPath,b.ids[0])),c(a,{data:e,blockParams:d.blockParams([a],[e&&e.contextPath])})})},a.exports=b["default"]},function(a,b,c){"use strict";function d(a){g["default"](a)}var e=c(1)["default"];b.__esModule=!0,b.registerDefaultDecorators=d;var f=c(19),g=e(f)},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5);b["default"]=function(a){a.registerDecorator("inline",function(a,b,c,e){var f=a;return b.partials||(b.partials={},f=function(e,f){var g=c.partials;c.partials=d.extend({},g,b.partials);var h=a(e,f);return c.partials=g,h}),b.partials[e.args[0]]=e.fn,f})},a.exports=b["default"]},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5),e={methodMap:["debug","info","warn","error"],level:"info",lookupLevel:function(a){if("string"==typeof a){var b=d.indexOf(e.methodMap,a.toLowerCase());a=b>=0?b:parseInt(a,10)}return a},log:function(a){if(a=e.lookupLevel(a),"undefined"!=typeof console&&e.lookupLevel(e.level)<=a){var b=e.methodMap[a];console[b]||(b="log");for(var c=arguments.length,d=Array(c>1?c-1:0),f=1;f<c;f++)d[f-1]=arguments[f];console[b].apply(console,d)}}};b["default"]=e,a.exports=b["default"]},function(a,b){"use strict";function c(a){this.string=a}b.__esModule=!0,c.prototype.toString=c.prototype.toHTML=function(){return""+this.string},b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){var b=a&&a[0]||1,c=s.COMPILER_REVISION;if(b!==c){if(b<c){var d=s.REVISION_CHANGES[c],e=s.REVISION_CHANGES[b];throw new r["default"]("Template was precompiled with an older version of Handlebars than the current runtime. Please update your precompiler to a newer version ("+d+") or downgrade your runtime to an older version ("+e+").")}throw new r["default"]("Template was precompiled with a newer version of Handlebars than the current runtime. Please update your runtime to a newer version ("+a[1]+").")}}function e(a,b){function c(c,d,e){e.hash&&(d=p.extend({},d,e.hash),e.ids&&(e.ids[0]=!0)),c=b.VM.resolvePartial.call(this,c,d,e);var f=b.VM.invokePartial.call(this,c,d,e);if(null==f&&b.compile&&(e.partials[e.name]=b.compile(c,a.compilerOptions,b),f=e.partials[e.name](d,e)),null!=f){if(e.indent){for(var g=f.split("\n"),h=0,i=g.length;h<i&&(g[h]||h+1!==i);h++)g[h]=e.indent+g[h];f=g.join("\n")}return f}throw new r["default"]("The partial "+e.name+" could not be compiled when running in runtime-only mode")}function d(b){function c(b){return""+a.main(e,b,e.helpers,e.partials,g,i,h)}var f=arguments.length<=1||void 0===arguments[1]?{}:arguments[1],g=f.data;d._setup(f),!f.partial&&a.useData&&(g=j(b,g));var h=void 0,i=a.useBlockParams?[]:void 0;return a.useDepths&&(h=f.depths?b!=f.depths[0]?[b].concat(f.depths):f.depths:[b]),(c=k(a.main,c,e,f.depths||[],g,i))(b,f)}if(!b)throw new r["default"]("No environment passed to template");if(!a||!a.main)throw new r["default"]("Unknown template object: "+typeof a);a.main.decorator=a.main_d,b.VM.checkRevision(a.compiler);var e={strict:function(a,b){if(!(b in a))throw new r["default"]('"'+b+'" not defined in '+a);return a[b]},lookup:function(a,b){for(var c=a.length,d=0;d<c;d++)if(a[d]&&null!=a[d][b])return a[d][b]},lambda:function(a,b){return"function"==typeof a?a.call(b):a},escapeExpression:p.escapeExpression,invokePartial:c,fn:function(b){var c=a[b];return c.decorator=a[b+"_d"],c},programs:[],program:function(a,b,c,d,e){var g=this.programs[a],h=this.fn(a);return b||e||d||c?g=f(this,a,h,b,c,d,e):g||(g=this.programs[a]=f(this,a,h)),g},data:function(a,b){for(;a&&b--;)a=a._parent;return a},merge:function(a,b){var c=a||b;return a&&b&&a!==b&&(c=p.extend({},b,a)),c},nullContext:l({}),noop:b.VM.noop,compilerInfo:a.compiler};return d.isTop=!0,d._setup=function(c){c.partial?(e.helpers=c.helpers,e.partials=c.partials,e.decorators=c.decorators):(e.helpers=e.merge(c.helpers,b.helpers),a.usePartial&&(e.partials=e.merge(c.partials,b.partials)),(a.usePartial||a.useDecorators)&&(e.decorators=e.merge(c.decorators,b.decorators)))},d._child=function(b,c,d,g){if(a.useBlockParams&&!d)throw new r["default"]("must pass block params");if(a.useDepths&&!g)throw new r["default"]("must pass parent depths");return f(e,b,a[b],c,0,d,g)},d}function f(a,b,c,d,e,f,g){function h(b){var e=arguments.length<=1||void 0===arguments[1]?{}:arguments[1],h=g;return!g||b==g[0]||b===a.nullContext&&null===g[0]||(h=[b].concat(g)),c(a,b,a.helpers,a.partials,e.data||d,f&&[e.blockParams].concat(f),h)}return h=k(c,h,a,g,d,f),h.program=b,h.depth=g?g.length:0,h.blockParams=e||0,h}function g(a,b,c){return a?a.call||c.name||(c.name=a,a=c.partials[a]):a="@partial-block"===c.name?c.data["partial-block"]:c.partials[c.name],a}function h(a,b,c){var d=c.data&&c.data["partial-block"];c.partial=!0,c.ids&&(c.data.contextPath=c.ids[0]||c.data.contextPath);var e=void 0;if(c.fn&&c.fn!==i&&!function(){c.data=s.createFrame(c.data);var a=c.fn;e=c.data["partial-block"]=function(b){var c=arguments.length<=1||void 0===arguments[1]?{}:arguments[1];return c.data=s.createFrame(c.data),c.data["partial-block"]=d,a(b,c)},a.partials&&(c.partials=p.extend({},c.partials,a.partials))}(),void 0===a&&e&&(a=e),void 0===a)throw new r["default"]("The partial "+c.name+" could not be found");if(a instanceof Function)return a(b,c)}function i(){return""}function j(a,b){return b&&"root"in b||(b=b?s.createFrame(b):{},b.root=a),b}function k(a,b,c,d,e,f){if(a.decorator){var g={};b=a.decorator(b,g,c,d&&d[0],e,f,d),p.extend(b,g)}return b}var l=c(23)["default"],m=c(3)["default"],n=c(1)["default"];b.__esModule=!0,b.checkRevision=d,b.template=e,b.wrapProgram=f,b.resolvePartial=g,b.invokePartial=h,b.noop=i;var o=c(5),p=m(o),q=c(6),r=n(q),s=c(4)},function(a,b,c){a.exports={"default":c(24),__esModule:!0}},function(a,b,c){c(25),a.exports=c(30).Object.seal},function(a,b,c){var d=c(26);c(27)("seal",function(a){return function(b){return a&&d(b)?a(b):b}})},function(a,b){a.exports=function(a){return"object"==typeof a?null!==a:"function"==typeof a}},function(a,b,c){var d=c(28),e=c(30),f=c(33);a.exports=function(a,b){var c=(e.Object||{})[a]||Object[a],g={};g[a]=b(c),d(d.S+d.F*f(function(){c(1)}),"Object",g)}},function(a,b,c){var d=c(29),e=c(30),f=c(31),g="prototype",h=function(a,b,c){var i,j,k,l=a&h.F,m=a&h.G,n=a&h.S,o=a&h.P,p=a&h.B,q=a&h.W,r=m?e:e[b]||(e[b]={}),s=m?d:n?d[b]:(d[b]||{})[g];m&&(c=b);for(i in c)j=!l&&s&&i in s,j&&i in r||(k=j?s[i]:c[i],r[i]=m&&"function"!=typeof s[i]?c[i]:p&&j?f(k,d):q&&s[i]==k?function(a){var b=function(b){return this instanceof a?new a(b):a(b)};return b[g]=a[g],b}(k):o&&"function"==typeof k?f(Function.call,k):k,o&&((r[g]||(r[g]={}))[i]=k))};h.F=1,h.G=2,h.S=4,h.P=8,h.B=16,h.W=32,a.exports=h},function(a,b){var c=a.exports="undefined"!=typeof window&&window.Math==Math?window:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")();"number"==typeof __g&&(__g=c)},function(a,b){var c=a.exports={version:"1.2.6"};"number"==typeof __e&&(__e=c)},function(a,b,c){var d=c(32);a.exports=function(a,b,c){if(d(a),void 0===b)return a;switch(c){case 1:return function(c){return a.call(b,c)};case 2:return function(c,d){return a.call(b,c,d)};case 3:return function(c,d,e){return a.call(b,c,d,e)}}return function(){return a.apply(b,arguments)}}},function(a,b){a.exports=function(a){if("function"!=typeof a)throw TypeError(a+" is not a function!");return a}},function(a,b){a.exports=function(a){try{return!!a()}catch(b){return!0}}},function(a,b){(function(c){"use strict";b.__esModule=!0,b["default"]=function(a){var b="undefined"!=typeof c?c:window,d=b.Handlebars;a.noConflict=function(){return b.Handlebars===a&&(b.Handlebars=d),a}},a.exports=b["default"]}).call(b,function(){return this}())},function(a,b){"use strict";b.__esModule=!0;var c={helpers:{helperExpression:function(a){return"SubExpression"===a.type||("MustacheStatement"===a.type||"BlockStatement"===a.type)&&!!(a.params&&a.params.length||a.hash)},scopedId:function(a){return/^\.|this\b/.test(a.original)},simpleId:function(a){return 1===a.parts.length&&!c.helpers.scopedId(a)&&!a.depth}}};b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(a,b){if("Program"===a.type)return a;h["default"].yy=n,n.locInfo=function(a){return new n.SourceLocation(b&&b.srcName,a)};var c=new j["default"](b);return c.accept(h["default"].parse(a))}var e=c(1)["default"],f=c(3)["default"];b.__esModule=!0,b.parse=d;var g=c(37),h=e(g),i=c(38),j=e(i),k=c(40),l=f(k),m=c(5);b.parser=h["default"];var n={};m.extend(n,l)},function(a,b){"use strict";b.__esModule=!0;var c=function(){function a(){this.yy={}}var b={trace:function(){},yy:{},symbols_:{error:2,root:3,program:4,EOF:5,program_repetition0:6,statement:7,mustache:8,block:9,rawBlock:10,partial:11,partialBlock:12,content:13,COMMENT:14,CONTENT:15,openRawBlock:16,rawBlock_repetition_plus0:17,END_RAW_BLOCK:18,OPEN_RAW_BLOCK:19,helperName:20,openRawBlock_repetition0:21,openRawBlock_option0:22,CLOSE_RAW_BLOCK:23,openBlock:24,block_option0:25,closeBlock:26,openInverse:27,block_option1:28,OPEN_BLOCK:29,openBlock_repetition0:30,openBlock_option0:31,openBlock_option1:32,CLOSE:33,OPEN_INVERSE:34,openInverse_repetition0:35,openInverse_option0:36,openInverse_option1:37,openInverseChain:38,OPEN_INVERSE_CHAIN:39,openInverseChain_repetition0:40,openInverseChain_option0:41,openInverseChain_option1:42,inverseAndProgram:43,INVERSE:44,inverseChain:45,inverseChain_option0:46,OPEN_ENDBLOCK:47,OPEN:48,mustache_repetition0:49,mustache_option0:50,OPEN_UNESCAPED:51,mustache_repetition1:52,mustache_option1:53,CLOSE_UNESCAPED:54,OPEN_PARTIAL:55,partialName:56,partial_repetition0:57,partial_option0:58,openPartialBlock:59,OPEN_PARTIAL_BLOCK:60,openPartialBlock_repetition0:61,openPartialBlock_option0:62,param:63,sexpr:64,OPEN_SEXPR:65,sexpr_repetition0:66,sexpr_option0:67,CLOSE_SEXPR:68,hash:69,hash_repetition_plus0:70,hashSegment:71,ID:72,EQUALS:73,blockParams:74,OPEN_BLOCK_PARAMS:75,blockParams_repetition_plus0:76,CLOSE_BLOCK_PARAMS:77,path:78,dataName:79,STRING:80,NUMBER:81,BOOLEAN:82,UNDEFINED:83,NULL:84,DATA:85,pathSegments:86,SEP:87,$accept:0,$end:1},terminals_:{2:"error",5:"EOF",14:"COMMENT",15:"CONTENT",18:"END_RAW_BLOCK",19:"OPEN_RAW_BLOCK",23:"CLOSE_RAW_BLOCK",29:"OPEN_BLOCK",33:"CLOSE",34:"OPEN_INVERSE",39:"OPEN_INVERSE_CHAIN",44:"INVERSE",47:"OPEN_ENDBLOCK",48:"OPEN",51:"OPEN_UNESCAPED",54:"CLOSE_UNESCAPED",55:"OPEN_PARTIAL",60:"OPEN_PARTIAL_BLOCK",65:"OPEN_SEXPR",68:"CLOSE_SEXPR",72:"ID",73:"EQUALS",75:"OPEN_BLOCK_PARAMS",77:"CLOSE_BLOCK_PARAMS",80:"STRING",81:"NUMBER",82:"BOOLEAN",83:"UNDEFINED",84:"NULL",85:"DATA",87:"SEP"},productions_:[0,[3,2],[4,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[13,1],[10,3],[16,5],[9,4],[9,4],[24,6],[27,6],[38,6],[43,2],[45,3],[45,1],[26,3],[8,5],[8,5],[11,5],[12,3],[59,5],[63,1],[63,1],[64,5],[69,1],[71,3],[74,3],[20,1],[20,1],[20,1],[20,1],[20,1],[20,1],[20,1],[56,1],[56,1],[79,2],[78,1],[86,3],[86,1],[6,0],[6,2],[17,1],[17,2],[21,0],[21,2],[22,0],[22,1],[25,0],[25,1],[28,0],[28,1],[30,0],[30,2],[31,0],[31,1],[32,0],[32,1],[35,0],[35,2],[36,0],[36,1],[37,0],[37,1],[40,0],[40,2],[41,0],[41,1],[42,0],[42,1],[46,0],[46,1],[49,0],[49,2],[50,0],[50,1],[52,0],[52,2],[53,0],[53,1],[57,0],[57,2],[58,0],[58,1],[61,0],[61,2],[62,0],[62,1],[66,0],[66,2],[67,0],[67,1],[70,1],[70,2],[76,1],[76,2]],performAction:function(a,b,c,d,e,f,g){var h=f.length-1;switch(e){case 1:return f[h-1];case 2:this.$=d.prepareProgram(f[h]);break;case 3:this.$=f[h];break;case 4:this.$=f[h];break;case 5:this.$=f[h];break;case 6:this.$=f[h];break;case 7:this.$=f[h];break;case 8:this.$=f[h];break;case 9:this.$={type:"CommentStatement",value:d.stripComment(f[h]),strip:d.stripFlags(f[h],f[h]),loc:d.locInfo(this._$)};break;case 10:this.$={type:"ContentStatement",original:f[h],value:f[h],loc:d.locInfo(this._$)};break;case 11:this.$=d.prepareRawBlock(f[h-2],f[h-1],f[h],this._$);break;case 12:this.$={path:f[h-3],params:f[h-2],hash:f[h-1]};break;case 13:this.$=d.prepareBlock(f[h-3],f[h-2],f[h-1],f[h],!1,this._$);break;case 14:this.$=d.prepareBlock(f[h-3],f[h-2],f[h-1],f[h],!0,this._$);break;case 15:this.$={open:f[h-5],path:f[h-4],params:f[h-3],hash:f[h-2],blockParams:f[h-1],strip:d.stripFlags(f[h-5],f[h])};break;case 16:this.$={path:f[h-4],params:f[h-3],hash:f[h-2],blockParams:f[h-1],strip:d.stripFlags(f[h-5],f[h])};break;case 17:this.$={path:f[h-4],params:f[h-3],hash:f[h-2],blockParams:f[h-1],strip:d.stripFlags(f[h-5],f[h])};break;case 18:this.$={strip:d.stripFlags(f[h-1],f[h-1]),program:f[h]};break;case 19:var i=d.prepareBlock(f[h-2],f[h-1],f[h],f[h],!1,this._$),j=d.prepareProgram([i],f[h-1].loc);j.chained=!0,this.$={strip:f[h-2].strip,program:j,chain:!0};break;case 20:this.$=f[h];break;case 21:this.$={path:f[h-1],strip:d.stripFlags(f[h-2],f[h])};break;case 22:this.$=d.prepareMustache(f[h-3],f[h-2],f[h-1],f[h-4],d.stripFlags(f[h-4],f[h]),this._$);break;case 23:this.$=d.prepareMustache(f[h-3],f[h-2],f[h-1],f[h-4],d.stripFlags(f[h-4],f[h]),this._$);break;case 24:this.$={type:"PartialStatement",name:f[h-3],params:f[h-2],hash:f[h-1],indent:"",strip:d.stripFlags(f[h-4],f[h]),loc:d.locInfo(this._$)};break;case 25:this.$=d.preparePartialBlock(f[h-2],f[h-1],f[h],this._$);break;case 26:this.$={path:f[h-3],params:f[h-2],hash:f[h-1],strip:d.stripFlags(f[h-4],f[h])};break;case 27:this.$=f[h];break;case 28:this.$=f[h];break;case 29:this.$={type:"SubExpression",path:f[h-3],params:f[h-2],hash:f[h-1],loc:d.locInfo(this._$)};break;case 30:this.$={type:"Hash",pairs:f[h],loc:d.locInfo(this._$)};break;case 31:this.$={type:"HashPair",key:d.id(f[h-2]),value:f[h],loc:d.locInfo(this._$)};break;case 32:this.$=d.id(f[h-1]);break;case 33:this.$=f[h];break;case 34:this.$=f[h];break;case 35:this.$={type:"StringLiteral",value:f[h],original:f[h],loc:d.locInfo(this._$)};break;case 36:this.$={type:"NumberLiteral",value:Number(f[h]),original:Number(f[h]),loc:d.locInfo(this._$)};break;case 37:this.$={type:"BooleanLiteral",value:"true"===f[h],original:"true"===f[h],loc:d.locInfo(this._$)};break;case 38:this.$={type:"UndefinedLiteral",original:void 0,value:void 0,loc:d.locInfo(this._$)};break;case 39:this.$={type:"NullLiteral",original:null,value:null,loc:d.locInfo(this._$)};break;case 40:this.$=f[h];break;case 41:this.$=f[h];break;case 42:this.$=d.preparePath(!0,f[h],this._$);break;case 43:this.$=d.preparePath(!1,f[h],this._$);break;case 44:f[h-2].push({part:d.id(f[h]),original:f[h],separator:f[h-1]}),this.$=f[h-2];break;case 45:this.$=[{part:d.id(f[h]),original:f[h]}];break;case 46:this.$=[];break;case 47:f[h-1].push(f[h]);break;case 48:this.$=[f[h]];break;case 49:f[h-1].push(f[h]);break;case 50:this.$=[];break;case 51:f[h-1].push(f[h]);break;case 58:this.$=[];break;case 59:f[h-1].push(f[h]);break;case 64:this.$=[];break;case 65:f[h-1].push(f[h]);break;case 70:this.$=[];break;case 71:f[h-1].push(f[h]);break;case 78:this.$=[];break;case 79:f[h-1].push(f[h]);break;case 82:this.$=[];break;case 83:f[h-1].push(f[h]);break;case 86:this.$=[];break;case 87:f[h-1].push(f[h]);break;case 90:this.$=[];break;case 91:f[h-1].push(f[h]);break;case 94:this.$=[];break;case 95:f[h-1].push(f[h]);break;case 98:this.$=[f[h]];break;case 99:f[h-1].push(f[h]);break;case 100:this.$=[f[h]];break;case 101:f[h-1].push(f[h])}},table:[{3:1,4:2,5:[2,46],6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{1:[3]},{5:[1,4]},{5:[2,2],7:5,8:6,9:7,10:8,11:9,12:10,13:11,14:[1,12],15:[1,20],16:17,19:[1,23],24:15,27:16,29:[1,21],34:[1,22],39:[2,2],44:[2,2],47:[2,2],48:[1,13],51:[1,14],55:[1,18],59:19,60:[1,24]},{1:[2,1]},{5:[2,47],14:[2,47],15:[2,47],19:[2,47],29:[2,47],34:[2,47],39:[2,47],44:[2,47],47:[2,47],48:[2,47],51:[2,47],55:[2,47],60:[2,47]},{5:[2,3],14:[2,3],15:[2,3],19:[2,3],29:[2,3],34:[2,3],39:[2,3],44:[2,3],47:[2,3],48:[2,3],51:[2,3],55:[2,3],60:[2,3]},{5:[2,4],14:[2,4],15:[2,4],19:[2,4],29:[2,4],34:[2,4],39:[2,4],44:[2,4],47:[2,4],48:[2,4],51:[2,4],55:[2,4],60:[2,4]},{5:[2,5],14:[2,5],15:[2,5],19:[2,5],29:[2,5],34:[2,5],39:[2,5],44:[2,5],47:[2,5],48:[2,5],51:[2,5],55:[2,5],60:[2,5]},{5:[2,6],14:[2,6],15:[2,6],19:[2,6],29:[2,6],34:[2,6],39:[2,6],44:[2,6],47:[2,6],48:[2,6],51:[2,6],55:[2,6],60:[2,6]},{5:[2,7],14:[2,7],15:[2,7],19:[2,7],29:[2,7],34:[2,7],39:[2,7],44:[2,7],47:[2,7],48:[2,7],51:[2,7],55:[2,7],60:[2,7]},{5:[2,8],14:[2,8],15:[2,8],19:[2,8],29:[2,8],34:[2,8],39:[2,8],44:[2,8],47:[2,8],48:[2,8],51:[2,8],55:[2,8],60:[2,8]},{5:[2,9],14:[2,9],15:[2,9],19:[2,9],29:[2,9],34:[2,9],39:[2,9],44:[2,9],47:[2,9],48:[2,9],51:[2,9],55:[2,9],60:[2,9]},{20:25,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:36,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{4:37,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],39:[2,46],44:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{4:38,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],44:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{13:40,15:[1,20],17:39},{20:42,56:41,64:43,65:[1,44],72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{4:45,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{5:[2,10],14:[2,10],15:[2,10],18:[2,10],19:[2,10],29:[2,10],34:[2,10],39:[2,10],44:[2,10],47:[2,10],48:[2,10],51:[2,10],55:[2,10],60:[2,10]},{20:46,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:47,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:48,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:42,56:49,64:43,65:[1,44],72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{33:[2,78],49:50,65:[2,78],72:[2,78],80:[2,78],81:[2,78],82:[2,78],83:[2,78],84:[2,78],85:[2,78]},{23:[2,33],33:[2,33],54:[2,33],65:[2,33],68:[2,33],72:[2,33],75:[2,33],80:[2,33],81:[2,33],82:[2,33],83:[2,33],84:[2,33],85:[2,33]},{23:[2,34],33:[2,34],54:[2,34],65:[2,34],68:[2,34],72:[2,34],75:[2,34],80:[2,34],81:[2,34],82:[2,34],83:[2,34],84:[2,34],85:[2,34]},{23:[2,35],33:[2,35],54:[2,35],65:[2,35],68:[2,35],72:[2,35],75:[2,35],80:[2,35],81:[2,35],82:[2,35],83:[2,35],84:[2,35],85:[2,35]},{23:[2,36],33:[2,36],54:[2,36],65:[2,36],68:[2,36],72:[2,36],75:[2,36],80:[2,36],81:[2,36],82:[2,36],83:[2,36],84:[2,36],85:[2,36]},{23:[2,37],33:[2,37],54:[2,37],65:[2,37],68:[2,37],72:[2,37],75:[2,37],80:[2,37],81:[2,37],82:[2,37],83:[2,37],84:[2,37],85:[2,37]},{23:[2,38],33:[2,38],54:[2,38],65:[2,38],68:[2,38],72:[2,38],75:[2,38],80:[2,38],81:[2,38],82:[2,38],83:[2,38],84:[2,38],85:[2,38]},{23:[2,39],33:[2,39],54:[2,39],65:[2,39],68:[2,39],72:[2,39],75:[2,39],80:[2,39],81:[2,39],82:[2,39],83:[2,39],84:[2,39],85:[2,39]},{23:[2,43],33:[2,43],54:[2,43],65:[2,43],68:[2,43],72:[2,43],75:[2,43],80:[2,43],81:[2,43],82:[2,43],83:[2,43],84:[2,43],85:[2,43],87:[1,51]},{72:[1,35],86:52},{23:[2,45],33:[2,45],54:[2,45],65:[2,45],68:[2,45],72:[2,45],75:[2,45],80:[2,45],81:[2,45],82:[2,45],83:[2,45],84:[2,45],85:[2,45],87:[2,45]},{52:53,54:[2,82],65:[2,82],72:[2,82],80:[2,82],81:[2,82],82:[2,82],83:[2,82],84:[2,82],85:[2,82]},{25:54,38:56,39:[1,58],43:57,44:[1,59],45:55,47:[2,54]},{28:60,43:61,44:[1,59],47:[2,56]},{13:63,15:[1,20],18:[1,62]},{15:[2,48],18:[2,48]},{33:[2,86],57:64,65:[2,86],72:[2,86],80:[2,86],81:[2,86],82:[2,86],83:[2,86],84:[2,86],85:[2,86]},{33:[2,40],65:[2,40],72:[2,40],80:[2,40],81:[2,40],82:[2,40],83:[2,40],84:[2,40],85:[2,40]},{33:[2,41],65:[2,41],72:[2,41],80:[2,41],81:[2,41],82:[2,41],83:[2,41],84:[2,41],85:[2,41]},{20:65,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{26:66,47:[1,67]},{30:68,33:[2,58],65:[2,58],72:[2,58],75:[2,58],80:[2,58],81:[2,58],82:[2,58],83:[2,58],84:[2,58],85:[2,58]},{33:[2,64],35:69,65:[2,64],72:[2,64],75:[2,64],80:[2,64],81:[2,64],82:[2,64],83:[2,64],84:[2,64],85:[2,64]},{21:70,23:[2,50],65:[2,50],72:[2,50],80:[2,50],81:[2,50],82:[2,50],83:[2,50],84:[2,50],85:[2,50]},{33:[2,90],61:71,65:[2,90],72:[2,90],80:[2,90],81:[2,90],82:[2,90],83:[2,90],84:[2,90],85:[2,90]},{20:75,33:[2,80],50:72,63:73,64:76,65:[1,44],69:74,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{72:[1,80]},{23:[2,42],33:[2,42],54:[2,42],65:[2,42],68:[2,42],72:[2,42],75:[2,42],80:[2,42],81:[2,42],82:[2,42],83:[2,42],84:[2,42],85:[2,42],87:[1,51]},{20:75,53:81,54:[2,84],63:82,64:76,65:[1,44],69:83,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{26:84,47:[1,67]},{47:[2,55]},{4:85,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],39:[2,46],44:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{47:[2,20]},{20:86,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{4:87,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{26:88,47:[1,67]},{47:[2,57]},{5:[2,11],14:[2,11],15:[2,11],19:[2,11],29:[2,11],34:[2,11],39:[2,11],44:[2,11],47:[2,11],48:[2,11],51:[2,11],55:[2,11],60:[2,11]},{15:[2,49],18:[2,49]},{20:75,33:[2,88],58:89,63:90,64:76,65:[1,44],69:91,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{65:[2,94],66:92,68:[2,94],72:[2,94],80:[2,94],81:[2,94],82:[2,94],83:[2,94],84:[2,94],85:[2,94]},{5:[2,25],14:[2,25],15:[2,25],19:[2,25],29:[2,25],34:[2,25],39:[2,25],44:[2,25],47:[2,25],48:[2,25],51:[2,25],55:[2,25],60:[2,25]},{20:93,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:75,31:94,33:[2,60],63:95,64:76,65:[1,44],69:96,70:77,71:78,72:[1,79],75:[2,60],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:75,33:[2,66],36:97,63:98,64:76,65:[1,44],69:99,70:77,71:78,72:[1,79],75:[2,66],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:75,22:100,23:[2,52],63:101,64:76,65:[1,44],69:102,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:75,33:[2,92],62:103,63:104,64:76,65:[1,44],69:105,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{33:[1,106]},{33:[2,79],65:[2,79],72:[2,79],80:[2,79],81:[2,79],82:[2,79],83:[2,79],84:[2,79],85:[2,79]},{33:[2,81]},{23:[2,27],33:[2,27],54:[2,27],65:[2,27],68:[2,27],72:[2,27],75:[2,27],80:[2,27],81:[2,27],82:[2,27],83:[2,27],84:[2,27],85:[2,27]},{23:[2,28],33:[2,28],54:[2,28],65:[2,28],68:[2,28],72:[2,28],75:[2,28],80:[2,28],81:[2,28],82:[2,28],83:[2,28],84:[2,28],85:[2,28]},{23:[2,30],33:[2,30],54:[2,30],68:[2,30],71:107,72:[1,108],75:[2,30]},{23:[2,98],33:[2,98],54:[2,98],68:[2,98],72:[2,98],75:[2,98]},{23:[2,45],33:[2,45],54:[2,45],65:[2,45],68:[2,45],72:[2,45],73:[1,109],75:[2,45],80:[2,45],81:[2,45],82:[2,45],83:[2,45],84:[2,45],85:[2,45],87:[2,45]},{23:[2,44],33:[2,44],54:[2,44],65:[2,44],68:[2,44],72:[2,44],75:[2,44],80:[2,44],81:[2,44],82:[2,44],83:[2,44],84:[2,44],85:[2,44],87:[2,44]},{54:[1,110]},{54:[2,83],65:[2,83],72:[2,83],80:[2,83],81:[2,83],82:[2,83],83:[2,83],84:[2,83],85:[2,83]},{54:[2,85]},{5:[2,13],14:[2,13],15:[2,13],19:[2,13],29:[2,13],34:[2,13],39:[2,13],44:[2,13],47:[2,13],48:[2,13],51:[2,13],55:[2,13],60:[2,13]},{38:56,39:[1,58],43:57,44:[1,59],45:112,46:111,47:[2,76]},{33:[2,70],40:113,65:[2,70],72:[2,70],75:[2,70],80:[2,70],81:[2,70],82:[2,70],83:[2,70],84:[2,70],85:[2,70]},{47:[2,18]},{5:[2,14],14:[2,14],15:[2,14],19:[2,14],29:[2,14],34:[2,14],39:[2,14],44:[2,14],47:[2,14],48:[2,14],51:[2,14],55:[2,14],60:[2,14]},{33:[1,114]},{33:[2,87],65:[2,87],72:[2,87],80:[2,87],81:[2,87],82:[2,87],83:[2,87],84:[2,87],
85:[2,87]},{33:[2,89]},{20:75,63:116,64:76,65:[1,44],67:115,68:[2,96],69:117,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{33:[1,118]},{32:119,33:[2,62],74:120,75:[1,121]},{33:[2,59],65:[2,59],72:[2,59],75:[2,59],80:[2,59],81:[2,59],82:[2,59],83:[2,59],84:[2,59],85:[2,59]},{33:[2,61],75:[2,61]},{33:[2,68],37:122,74:123,75:[1,121]},{33:[2,65],65:[2,65],72:[2,65],75:[2,65],80:[2,65],81:[2,65],82:[2,65],83:[2,65],84:[2,65],85:[2,65]},{33:[2,67],75:[2,67]},{23:[1,124]},{23:[2,51],65:[2,51],72:[2,51],80:[2,51],81:[2,51],82:[2,51],83:[2,51],84:[2,51],85:[2,51]},{23:[2,53]},{33:[1,125]},{33:[2,91],65:[2,91],72:[2,91],80:[2,91],81:[2,91],82:[2,91],83:[2,91],84:[2,91],85:[2,91]},{33:[2,93]},{5:[2,22],14:[2,22],15:[2,22],19:[2,22],29:[2,22],34:[2,22],39:[2,22],44:[2,22],47:[2,22],48:[2,22],51:[2,22],55:[2,22],60:[2,22]},{23:[2,99],33:[2,99],54:[2,99],68:[2,99],72:[2,99],75:[2,99]},{73:[1,109]},{20:75,63:126,64:76,65:[1,44],72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{5:[2,23],14:[2,23],15:[2,23],19:[2,23],29:[2,23],34:[2,23],39:[2,23],44:[2,23],47:[2,23],48:[2,23],51:[2,23],55:[2,23],60:[2,23]},{47:[2,19]},{47:[2,77]},{20:75,33:[2,72],41:127,63:128,64:76,65:[1,44],69:129,70:77,71:78,72:[1,79],75:[2,72],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{5:[2,24],14:[2,24],15:[2,24],19:[2,24],29:[2,24],34:[2,24],39:[2,24],44:[2,24],47:[2,24],48:[2,24],51:[2,24],55:[2,24],60:[2,24]},{68:[1,130]},{65:[2,95],68:[2,95],72:[2,95],80:[2,95],81:[2,95],82:[2,95],83:[2,95],84:[2,95],85:[2,95]},{68:[2,97]},{5:[2,21],14:[2,21],15:[2,21],19:[2,21],29:[2,21],34:[2,21],39:[2,21],44:[2,21],47:[2,21],48:[2,21],51:[2,21],55:[2,21],60:[2,21]},{33:[1,131]},{33:[2,63]},{72:[1,133],76:132},{33:[1,134]},{33:[2,69]},{15:[2,12]},{14:[2,26],15:[2,26],19:[2,26],29:[2,26],34:[2,26],47:[2,26],48:[2,26],51:[2,26],55:[2,26],60:[2,26]},{23:[2,31],33:[2,31],54:[2,31],68:[2,31],72:[2,31],75:[2,31]},{33:[2,74],42:135,74:136,75:[1,121]},{33:[2,71],65:[2,71],72:[2,71],75:[2,71],80:[2,71],81:[2,71],82:[2,71],83:[2,71],84:[2,71],85:[2,71]},{33:[2,73],75:[2,73]},{23:[2,29],33:[2,29],54:[2,29],65:[2,29],68:[2,29],72:[2,29],75:[2,29],80:[2,29],81:[2,29],82:[2,29],83:[2,29],84:[2,29],85:[2,29]},{14:[2,15],15:[2,15],19:[2,15],29:[2,15],34:[2,15],39:[2,15],44:[2,15],47:[2,15],48:[2,15],51:[2,15],55:[2,15],60:[2,15]},{72:[1,138],77:[1,137]},{72:[2,100],77:[2,100]},{14:[2,16],15:[2,16],19:[2,16],29:[2,16],34:[2,16],44:[2,16],47:[2,16],48:[2,16],51:[2,16],55:[2,16],60:[2,16]},{33:[1,139]},{33:[2,75]},{33:[2,32]},{72:[2,101],77:[2,101]},{14:[2,17],15:[2,17],19:[2,17],29:[2,17],34:[2,17],39:[2,17],44:[2,17],47:[2,17],48:[2,17],51:[2,17],55:[2,17],60:[2,17]}],defaultActions:{4:[2,1],55:[2,55],57:[2,20],61:[2,57],74:[2,81],83:[2,85],87:[2,18],91:[2,89],102:[2,53],105:[2,93],111:[2,19],112:[2,77],117:[2,97],120:[2,63],123:[2,69],124:[2,12],136:[2,75],137:[2,32]},parseError:function(a,b){throw new Error(a)},parse:function(a){function b(){var a;return a=c.lexer.lex()||1,"number"!=typeof a&&(a=c.symbols_[a]||a),a}var c=this,d=[0],e=[null],f=[],g=this.table,h="",i=0,j=0,k=0;this.lexer.setInput(a),this.lexer.yy=this.yy,this.yy.lexer=this.lexer,this.yy.parser=this,"undefined"==typeof this.lexer.yylloc&&(this.lexer.yylloc={});var l=this.lexer.yylloc;f.push(l);var m=this.lexer.options&&this.lexer.options.ranges;"function"==typeof this.yy.parseError&&(this.parseError=this.yy.parseError);for(var n,o,p,q,r,s,t,u,v,w={};;){if(p=d[d.length-1],this.defaultActions[p]?q=this.defaultActions[p]:(null!==n&&"undefined"!=typeof n||(n=b()),q=g[p]&&g[p][n]),"undefined"==typeof q||!q.length||!q[0]){var x="";if(!k){v=[];for(s in g[p])this.terminals_[s]&&s>2&&v.push("'"+this.terminals_[s]+"'");x=this.lexer.showPosition?"Parse error on line "+(i+1)+":\n"+this.lexer.showPosition()+"\nExpecting "+v.join(", ")+", got '"+(this.terminals_[n]||n)+"'":"Parse error on line "+(i+1)+": Unexpected "+(1==n?"end of input":"'"+(this.terminals_[n]||n)+"'"),this.parseError(x,{text:this.lexer.match,token:this.terminals_[n]||n,line:this.lexer.yylineno,loc:l,expected:v})}}if(q[0]instanceof Array&&q.length>1)throw new Error("Parse Error: multiple actions possible at state: "+p+", token: "+n);switch(q[0]){case 1:d.push(n),e.push(this.lexer.yytext),f.push(this.lexer.yylloc),d.push(q[1]),n=null,o?(n=o,o=null):(j=this.lexer.yyleng,h=this.lexer.yytext,i=this.lexer.yylineno,l=this.lexer.yylloc,k>0&&k--);break;case 2:if(t=this.productions_[q[1]][1],w.$=e[e.length-t],w._$={first_line:f[f.length-(t||1)].first_line,last_line:f[f.length-1].last_line,first_column:f[f.length-(t||1)].first_column,last_column:f[f.length-1].last_column},m&&(w._$.range=[f[f.length-(t||1)].range[0],f[f.length-1].range[1]]),r=this.performAction.call(w,h,j,i,this.yy,q[1],e,f),"undefined"!=typeof r)return r;t&&(d=d.slice(0,-1*t*2),e=e.slice(0,-1*t),f=f.slice(0,-1*t)),d.push(this.productions_[q[1]][0]),e.push(w.$),f.push(w._$),u=g[d[d.length-2]][d[d.length-1]],d.push(u);break;case 3:return!0}}return!0}},c=function(){var a={EOF:1,parseError:function(a,b){if(!this.yy.parser)throw new Error(a);this.yy.parser.parseError(a,b)},setInput:function(a){return this._input=a,this._more=this._less=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var a=this._input[0];this.yytext+=a,this.yyleng++,this.offset++,this.match+=a,this.matched+=a;var b=a.match(/(?:\r\n?|\n).*/g);return b?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),a},unput:function(a){var b=a.length,c=a.split(/(?:\r\n?|\n)/g);this._input=a+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-b-1),this.offset-=b;var d=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),c.length-1&&(this.yylineno-=c.length-1);var e=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:c?(c.length===d.length?this.yylloc.first_column:0)+d[d.length-c.length].length-c[0].length:this.yylloc.first_column-b},this.options.ranges&&(this.yylloc.range=[e[0],e[0]+this.yyleng-b]),this},more:function(){return this._more=!0,this},less:function(a){this.unput(this.match.slice(a))},pastInput:function(){var a=this.matched.substr(0,this.matched.length-this.match.length);return(a.length>20?"...":"")+a.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var a=this.match;return a.length<20&&(a+=this._input.substr(0,20-a.length)),(a.substr(0,20)+(a.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var a=this.pastInput(),b=new Array(a.length+1).join("-");return a+this.upcomingInput()+"\n"+b+"^"},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var a,b,c,d,e;this._more||(this.yytext="",this.match="");for(var f=this._currentRules(),g=0;g<f.length&&(c=this._input.match(this.rules[f[g]]),!c||b&&!(c[0].length>b[0].length)||(b=c,d=g,this.options.flex));g++);return b?(e=b[0].match(/(?:\r\n?|\n).*/g),e&&(this.yylineno+=e.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:e?e[e.length-1].length-e[e.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+b[0].length},this.yytext+=b[0],this.match+=b[0],this.matches=b,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._input=this._input.slice(b[0].length),this.matched+=b[0],a=this.performAction.call(this,this.yy,this,f[d],this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),a?a:void 0):""===this._input?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+". Unrecognized text.\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var a=this.next();return"undefined"!=typeof a?a:this.lex()},begin:function(a){this.conditionStack.push(a)},popState:function(){return this.conditionStack.pop()},_currentRules:function(){return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules},topState:function(){return this.conditionStack[this.conditionStack.length-2]},pushState:function(a){this.begin(a)}};return a.options={},a.performAction=function(a,b,c,d){function e(a,c){return b.yytext=b.yytext.substr(a,b.yyleng-c)}switch(c){case 0:if("\\\\"===b.yytext.slice(-2)?(e(0,1),this.begin("mu")):"\\"===b.yytext.slice(-1)?(e(0,1),this.begin("emu")):this.begin("mu"),b.yytext)return 15;break;case 1:return 15;case 2:return this.popState(),15;case 3:return this.begin("raw"),15;case 4:return this.popState(),"raw"===this.conditionStack[this.conditionStack.length-1]?15:(b.yytext=b.yytext.substr(5,b.yyleng-9),"END_RAW_BLOCK");case 5:return 15;case 6:return this.popState(),14;case 7:return 65;case 8:return 68;case 9:return 19;case 10:return this.popState(),this.begin("raw"),23;case 11:return 55;case 12:return 60;case 13:return 29;case 14:return 47;case 15:return this.popState(),44;case 16:return this.popState(),44;case 17:return 34;case 18:return 39;case 19:return 51;case 20:return 48;case 21:this.unput(b.yytext),this.popState(),this.begin("com");break;case 22:return this.popState(),14;case 23:return 48;case 24:return 73;case 25:return 72;case 26:return 72;case 27:return 87;case 28:break;case 29:return this.popState(),54;case 30:return this.popState(),33;case 31:return b.yytext=e(1,2).replace(/\\"/g,'"'),80;case 32:return b.yytext=e(1,2).replace(/\\'/g,"'"),80;case 33:return 85;case 34:return 82;case 35:return 82;case 36:return 83;case 37:return 84;case 38:return 81;case 39:return 75;case 40:return 77;case 41:return 72;case 42:return b.yytext=b.yytext.replace(/\\([\\\]])/g,"$1"),72;case 43:return"INVALID";case 44:return 5}},a.rules=[/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:\{\{\{\{(?=[^\/]))/,/^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/,/^(?:[^\x00]*?(?=(\{\{\{\{)))/,/^(?:[\s\S]*?--(~)?\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{\{\{)/,/^(?:\}\}\}\})/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#>)/,/^(?:\{\{(~)?#\*?)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^\s*(~)?\}\})/,/^(?:\{\{(~)?\s*else\s*(~)?\}\})/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{(~)?!--)/,/^(?:\{\{(~)?![\s\S]*?\}\})/,/^(?:\{\{(~)?\*?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)|])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:undefined(?=([~}\s)])))/,/^(?:null(?=([~}\s)])))/,/^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/,/^(?:as\s+\|)/,/^(?:\|)/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/,/^(?:\[(\\\]|[^\]])*\])/,/^(?:.)/,/^(?:$)/],a.conditions={mu:{rules:[7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44],inclusive:!1},emu:{rules:[2],inclusive:!1},com:{rules:[6],inclusive:!1},raw:{rules:[3,4,5],inclusive:!1},INITIAL:{rules:[0,1,44],inclusive:!0}},a}();return b.lexer=c,a.prototype=b,b.Parser=a,new a}();b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(){var a=arguments.length<=0||void 0===arguments[0]?{}:arguments[0];this.options=a}function e(a,b,c){void 0===b&&(b=a.length);var d=a[b-1],e=a[b-2];return d?"ContentStatement"===d.type?(e||!c?/\r?\n\s*?$/:/(^|\r?\n)\s*?$/).test(d.original):void 0:c}function f(a,b,c){void 0===b&&(b=-1);var d=a[b+1],e=a[b+2];return d?"ContentStatement"===d.type?(e||!c?/^\s*?\r?\n/:/^\s*?(\r?\n|$)/).test(d.original):void 0:c}function g(a,b,c){var d=a[null==b?0:b+1];if(d&&"ContentStatement"===d.type&&(c||!d.rightStripped)){var e=d.value;d.value=d.value.replace(c?/^\s+/:/^[ \t]*\r?\n?/,""),d.rightStripped=d.value!==e}}function h(a,b,c){var d=a[null==b?a.length-1:b-1];if(d&&"ContentStatement"===d.type&&(c||!d.leftStripped)){var e=d.value;return d.value=d.value.replace(c?/\s+$/:/[ \t]+$/,""),d.leftStripped=d.value!==e,d.leftStripped}}var i=c(1)["default"];b.__esModule=!0;var j=c(39),k=i(j);d.prototype=new k["default"],d.prototype.Program=function(a){var b=!this.options.ignoreStandalone,c=!this.isRootSeen;this.isRootSeen=!0;for(var d=a.body,i=0,j=d.length;i<j;i++){var k=d[i],l=this.accept(k);if(l){var m=e(d,i,c),n=f(d,i,c),o=l.openStandalone&&m,p=l.closeStandalone&&n,q=l.inlineStandalone&&m&&n;l.close&&g(d,i,!0),l.open&&h(d,i,!0),b&&q&&(g(d,i),h(d,i)&&"PartialStatement"===k.type&&(k.indent=/([ \t]+$)/.exec(d[i-1].original)[1])),b&&o&&(g((k.program||k.inverse).body),h(d,i)),b&&p&&(g(d,i),h((k.inverse||k.program).body))}}return a},d.prototype.BlockStatement=d.prototype.DecoratorBlock=d.prototype.PartialBlockStatement=function(a){this.accept(a.program),this.accept(a.inverse);var b=a.program||a.inverse,c=a.program&&a.inverse,d=c,i=c;if(c&&c.chained)for(d=c.body[0].program;i.chained;)i=i.body[i.body.length-1].program;var j={open:a.openStrip.open,close:a.closeStrip.close,openStandalone:f(b.body),closeStandalone:e((d||b).body)};if(a.openStrip.close&&g(b.body,null,!0),c){var k=a.inverseStrip;k.open&&h(b.body,null,!0),k.close&&g(d.body,null,!0),a.closeStrip.open&&h(i.body,null,!0),!this.options.ignoreStandalone&&e(b.body)&&f(d.body)&&(h(b.body),g(d.body))}else a.closeStrip.open&&h(b.body,null,!0);return j},d.prototype.Decorator=d.prototype.MustacheStatement=function(a){return a.strip},d.prototype.PartialStatement=d.prototype.CommentStatement=function(a){var b=a.strip||{};return{inlineStandalone:!0,open:b.open,close:b.close}},b["default"]=d,a.exports=b["default"]},function(a,b,c){"use strict";function d(){this.parents=[]}function e(a){this.acceptRequired(a,"path"),this.acceptArray(a.params),this.acceptKey(a,"hash")}function f(a){e.call(this,a),this.acceptKey(a,"program"),this.acceptKey(a,"inverse")}function g(a){this.acceptRequired(a,"name"),this.acceptArray(a.params),this.acceptKey(a,"hash")}var h=c(1)["default"];b.__esModule=!0;var i=c(6),j=h(i);d.prototype={constructor:d,mutating:!1,acceptKey:function(a,b){var c=this.accept(a[b]);if(this.mutating){if(c&&!d.prototype[c.type])throw new j["default"]('Unexpected node type "'+c.type+'" found when accepting '+b+" on "+a.type);a[b]=c}},acceptRequired:function(a,b){if(this.acceptKey(a,b),!a[b])throw new j["default"](a.type+" requires "+b)},acceptArray:function(a){for(var b=0,c=a.length;b<c;b++)this.acceptKey(a,b),a[b]||(a.splice(b,1),b--,c--)},accept:function(a){if(a){if(!this[a.type])throw new j["default"]("Unknown type: "+a.type,a);this.current&&this.parents.unshift(this.current),this.current=a;var b=this[a.type](a);return this.current=this.parents.shift(),!this.mutating||b?b:b!==!1?a:void 0}},Program:function(a){this.acceptArray(a.body)},MustacheStatement:e,Decorator:e,BlockStatement:f,DecoratorBlock:f,PartialStatement:g,PartialBlockStatement:function(a){g.call(this,a),this.acceptKey(a,"program")},ContentStatement:function(){},CommentStatement:function(){},SubExpression:e,PathExpression:function(){},StringLiteral:function(){},NumberLiteral:function(){},BooleanLiteral:function(){},UndefinedLiteral:function(){},NullLiteral:function(){},Hash:function(a){this.acceptArray(a.pairs)},HashPair:function(a){this.acceptRequired(a,"value")}},b["default"]=d,a.exports=b["default"]},function(a,b,c){"use strict";function d(a,b){if(b=b.path?b.path.original:b,a.path.original!==b){var c={loc:a.path.loc};throw new q["default"](a.path.original+" doesn't match "+b,c)}}function e(a,b){this.source=a,this.start={line:b.first_line,column:b.first_column},this.end={line:b.last_line,column:b.last_column}}function f(a){return/^\[.*\]$/.test(a)?a.substr(1,a.length-2):a}function g(a,b){return{open:"~"===a.charAt(2),close:"~"===b.charAt(b.length-3)}}function h(a){return a.replace(/^\{\{~?\!-?-?/,"").replace(/-?-?~?\}\}$/,"")}function i(a,b,c){c=this.locInfo(c);for(var d=a?"@":"",e=[],f=0,g="",h=0,i=b.length;h<i;h++){var j=b[h].part,k=b[h].original!==j;if(d+=(b[h].separator||"")+j,k||".."!==j&&"."!==j&&"this"!==j)e.push(j);else{if(e.length>0)throw new q["default"]("Invalid path: "+d,{loc:c});".."===j&&(f++,g+="../")}}return{type:"PathExpression",data:a,depth:f,parts:e,original:d,loc:c}}function j(a,b,c,d,e,f){var g=d.charAt(3)||d.charAt(2),h="{"!==g&&"&"!==g,i=/\*/.test(d);return{type:i?"Decorator":"MustacheStatement",path:a,params:b,hash:c,escaped:h,strip:e,loc:this.locInfo(f)}}function k(a,b,c,e){d(a,c),e=this.locInfo(e);var f={type:"Program",body:b,strip:{},loc:e};return{type:"BlockStatement",path:a.path,params:a.params,hash:a.hash,program:f,openStrip:{},inverseStrip:{},closeStrip:{},loc:e}}function l(a,b,c,e,f,g){e&&e.path&&d(a,e);var h=/\*/.test(a.open);b.blockParams=a.blockParams;var i=void 0,j=void 0;if(c){if(h)throw new q["default"]("Unexpected inverse block on decorator",c);c.chain&&(c.program.body[0].closeStrip=e.strip),j=c.strip,i=c.program}return f&&(f=i,i=b,b=f),{type:h?"DecoratorBlock":"BlockStatement",path:a.path,params:a.params,hash:a.hash,program:b,inverse:i,openStrip:a.strip,inverseStrip:j,closeStrip:e&&e.strip,loc:this.locInfo(g)}}function m(a,b){if(!b&&a.length){var c=a[0].loc,d=a[a.length-1].loc;c&&d&&(b={source:c.source,start:{line:c.start.line,column:c.start.column},end:{line:d.end.line,column:d.end.column}})}return{type:"Program",body:a,strip:{},loc:b}}function n(a,b,c,e){return d(a,c),{type:"PartialBlockStatement",name:a.path,params:a.params,hash:a.hash,program:b,openStrip:a.strip,closeStrip:c&&c.strip,loc:this.locInfo(e)}}var o=c(1)["default"];b.__esModule=!0,b.SourceLocation=e,b.id=f,b.stripFlags=g,b.stripComment=h,b.preparePath=i,b.prepareMustache=j,b.prepareRawBlock=k,b.prepareBlock=l,b.prepareProgram=m,b.preparePartialBlock=n;var p=c(6),q=o(p)},function(a,b,c){"use strict";function d(){}function e(a,b,c){if(null==a||"string"!=typeof a&&"Program"!==a.type)throw new k["default"]("You must pass a string or Handlebars AST to Handlebars.precompile. You passed "+a);b=b||{},"data"in b||(b.data=!0),b.compat&&(b.useDepths=!0);var d=c.parse(a,b),e=(new c.Compiler).compile(d,b);return(new c.JavaScriptCompiler).compile(e,b)}function f(a,b,c){function d(){var d=c.parse(a,b),e=(new c.Compiler).compile(d,b),f=(new c.JavaScriptCompiler).compile(e,b,void 0,!0);return c.template(f)}function e(a,b){return f||(f=d()),f.call(this,a,b)}if(void 0===b&&(b={}),null==a||"string"!=typeof a&&"Program"!==a.type)throw new k["default"]("You must pass a string or Handlebars AST to Handlebars.compile. You passed "+a);b=l.extend({},b),"data"in b||(b.data=!0),b.compat&&(b.useDepths=!0);var f=void 0;return e._setup=function(a){return f||(f=d()),f._setup(a)},e._child=function(a,b,c,e){return f||(f=d()),f._child(a,b,c,e)},e}function g(a,b){if(a===b)return!0;if(l.isArray(a)&&l.isArray(b)&&a.length===b.length){for(var c=0;c<a.length;c++)if(!g(a[c],b[c]))return!1;return!0}}function h(a){if(!a.path.parts){var b=a.path;a.path={type:"PathExpression",data:!1,depth:0,parts:[b.original+""],original:b.original+"",loc:b.loc}}}var i=c(1)["default"];b.__esModule=!0,b.Compiler=d,b.precompile=e,b.compile=f;var j=c(6),k=i(j),l=c(5),m=c(35),n=i(m),o=[].slice;d.prototype={compiler:d,equals:function(a){var b=this.opcodes.length;if(a.opcodes.length!==b)return!1;for(var c=0;c<b;c++){var d=this.opcodes[c],e=a.opcodes[c];if(d.opcode!==e.opcode||!g(d.args,e.args))return!1}b=this.children.length;for(var c=0;c<b;c++)if(!this.children[c].equals(a.children[c]))return!1;return!0},guid:0,compile:function(a,b){this.sourceNode=[],this.opcodes=[],this.children=[],this.options=b,this.stringParams=b.stringParams,this.trackIds=b.trackIds,b.blockParams=b.blockParams||[];var c=b.knownHelpers;if(b.knownHelpers={helperMissing:!0,blockHelperMissing:!0,each:!0,"if":!0,unless:!0,"with":!0,log:!0,lookup:!0},c)for(var d in c)d in c&&(this.options.knownHelpers[d]=c[d]);return this.accept(a)},compileProgram:function(a){var b=new this.compiler,c=b.compile(a,this.options),d=this.guid++;return this.usePartial=this.usePartial||c.usePartial,this.children[d]=c,this.useDepths=this.useDepths||c.useDepths,d},accept:function(a){if(!this[a.type])throw new k["default"]("Unknown type: "+a.type,a);this.sourceNode.unshift(a);var b=this[a.type](a);return this.sourceNode.shift(),b},Program:function(a){this.options.blockParams.unshift(a.blockParams);for(var b=a.body,c=b.length,d=0;d<c;d++)this.accept(b[d]);return this.options.blockParams.shift(),this.isSimple=1===c,this.blockParams=a.blockParams?a.blockParams.length:0,this},BlockStatement:function(a){h(a);var b=a.program,c=a.inverse;b=b&&this.compileProgram(b),c=c&&this.compileProgram(c);var d=this.classifySexpr(a);"helper"===d?this.helperSexpr(a,b,c):"simple"===d?(this.simpleSexpr(a),this.opcode("pushProgram",b),this.opcode("pushProgram",c),this.opcode("emptyHash"),this.opcode("blockValue",a.path.original)):(this.ambiguousSexpr(a,b,c),this.opcode("pushProgram",b),this.opcode("pushProgram",c),this.opcode("emptyHash"),this.opcode("ambiguousBlockValue")),this.opcode("append")},DecoratorBlock:function(a){var b=a.program&&this.compileProgram(a.program),c=this.setupFullMustacheParams(a,b,void 0),d=a.path;this.useDecorators=!0,this.opcode("registerDecorator",c.length,d.original)},PartialStatement:function(a){this.usePartial=!0;var b=a.program;b&&(b=this.compileProgram(a.program));var c=a.params;if(c.length>1)throw new k["default"]("Unsupported number of partial arguments: "+c.length,a);c.length||(this.options.explicitPartialContext?this.opcode("pushLiteral","undefined"):c.push({type:"PathExpression",parts:[],depth:0}));var d=a.name.original,e="SubExpression"===a.name.type;e&&this.accept(a.name),this.setupFullMustacheParams(a,b,void 0,!0);var f=a.indent||"";this.options.preventIndent&&f&&(this.opcode("appendContent",f),f=""),this.opcode("invokePartial",e,d,f),this.opcode("append")},PartialBlockStatement:function(a){this.PartialStatement(a)},MustacheStatement:function(a){this.SubExpression(a),a.escaped&&!this.options.noEscape?this.opcode("appendEscaped"):this.opcode("append")},Decorator:function(a){this.DecoratorBlock(a)},ContentStatement:function(a){a.value&&this.opcode("appendContent",a.value)},CommentStatement:function(){},SubExpression:function(a){h(a);var b=this.classifySexpr(a);"simple"===b?this.simpleSexpr(a):"helper"===b?this.helperSexpr(a):this.ambiguousSexpr(a)},ambiguousSexpr:function(a,b,c){var d=a.path,e=d.parts[0],f=null!=b||null!=c;this.opcode("getContext",d.depth),this.opcode("pushProgram",b),this.opcode("pushProgram",c),d.strict=!0,this.accept(d),this.opcode("invokeAmbiguous",e,f)},simpleSexpr:function(a){var b=a.path;b.strict=!0,this.accept(b),this.opcode("resolvePossibleLambda")},helperSexpr:function(a,b,c){var d=this.setupFullMustacheParams(a,b,c),e=a.path,f=e.parts[0];if(this.options.knownHelpers[f])this.opcode("invokeKnownHelper",d.length,f);else{if(this.options.knownHelpersOnly)throw new k["default"]("You specified knownHelpersOnly, but used the unknown helper "+f,a);e.strict=!0,e.falsy=!0,this.accept(e),this.opcode("invokeHelper",d.length,e.original,n["default"].helpers.simpleId(e))}},PathExpression:function(a){this.addDepth(a.depth),this.opcode("getContext",a.depth);var b=a.parts[0],c=n["default"].helpers.scopedId(a),d=!a.depth&&!c&&this.blockParamIndex(b);d?this.opcode("lookupBlockParam",d,a.parts):b?a.data?(this.options.data=!0,this.opcode("lookupData",a.depth,a.parts,a.strict)):this.opcode("lookupOnContext",a.parts,a.falsy,a.strict,c):this.opcode("pushContext")},StringLiteral:function(a){this.opcode("pushString",a.value)},NumberLiteral:function(a){this.opcode("pushLiteral",a.value)},BooleanLiteral:function(a){this.opcode("pushLiteral",a.value)},UndefinedLiteral:function(){this.opcode("pushLiteral","undefined")},NullLiteral:function(){this.opcode("pushLiteral","null")},Hash:function(a){var b=a.pairs,c=0,d=b.length;for(this.opcode("pushHash");c<d;c++)this.pushParam(b[c].value);for(;c--;)this.opcode("assignToHash",b[c].key);this.opcode("popHash")},opcode:function(a){this.opcodes.push({opcode:a,args:o.call(arguments,1),loc:this.sourceNode[0].loc})},addDepth:function(a){a&&(this.useDepths=!0)},classifySexpr:function(a){var b=n["default"].helpers.simpleId(a.path),c=b&&!!this.blockParamIndex(a.path.parts[0]),d=!c&&n["default"].helpers.helperExpression(a),e=!c&&(d||b);if(e&&!d){var f=a.path.parts[0],g=this.options;g.knownHelpers[f]?d=!0:g.knownHelpersOnly&&(e=!1)}return d?"helper":e?"ambiguous":"simple"},pushParams:function(a){for(var b=0,c=a.length;b<c;b++)this.pushParam(a[b])},pushParam:function(a){var b=null!=a.value?a.value:a.original||"";if(this.stringParams)b.replace&&(b=b.replace(/^(\.?\.\/)*/g,"").replace(/\//g,".")),a.depth&&this.addDepth(a.depth),this.opcode("getContext",a.depth||0),this.opcode("pushStringParam",b,a.type),"SubExpression"===a.type&&this.accept(a);else{if(this.trackIds){var c=void 0;if(!a.parts||n["default"].helpers.scopedId(a)||a.depth||(c=this.blockParamIndex(a.parts[0])),c){var d=a.parts.slice(1).join(".");this.opcode("pushId","BlockParam",c,d)}else b=a.original||b,b.replace&&(b=b.replace(/^this(?:\.|$)/,"").replace(/^\.\//,"").replace(/^\.$/,"")),this.opcode("pushId",a.type,b)}this.accept(a)}},setupFullMustacheParams:function(a,b,c,d){var e=a.params;return this.pushParams(e),this.opcode("pushProgram",b),this.opcode("pushProgram",c),a.hash?this.accept(a.hash):this.opcode("emptyHash",d),e},blockParamIndex:function(a){for(var b=0,c=this.options.blockParams.length;b<c;b++){var d=this.options.blockParams[b],e=d&&l.indexOf(d,a);if(d&&e>=0)return[b,e]}}}},function(a,b,c){"use strict";function d(a){this.value=a}function e(){}function f(a,b,c,d){var e=b.popStack(),f=0,g=c.length;for(a&&g--;f<g;f++)e=b.nameLookup(e,c[f],d);return a?[b.aliasable("container.strict"),"(",e,", ",b.quotedString(c[f]),")"]:e}var g=c(1)["default"];b.__esModule=!0;var h=c(4),i=c(6),j=g(i),k=c(5),l=c(43),m=g(l);e.prototype={nameLookup:function(a,b){return e.isValidJavaScriptVariableName(b)?[a,".",b]:[a,"[",JSON.stringify(b),"]"]},depthedLookup:function(a){return[this.aliasable("container.lookup"),'(depths, "',a,'")']},compilerInfo:function(){var a=h.COMPILER_REVISION,b=h.REVISION_CHANGES[a];return[a,b]},appendToBuffer:function(a,b,c){return k.isArray(a)||(a=[a]),a=this.source.wrap(a,b),this.environment.isSimple?["return ",a,";"]:c?["buffer += ",a,";"]:(a.appendToBuffer=!0,a)},initializeBuffer:function(){return this.quotedString("")},compile:function(a,b,c,d){this.environment=a,this.options=b,this.stringParams=this.options.stringParams,this.trackIds=this.options.trackIds,this.precompile=!d,this.name=this.environment.name,this.isChild=!!c,this.context=c||{decorators:[],programs:[],environments:[]},this.preamble(),this.stackSlot=0,this.stackVars=[],this.aliases={},this.registers={list:[]},this.hashes=[],this.compileStack=[],this.inlineStack=[],this.blockParams=[],this.compileChildren(a,b),this.useDepths=this.useDepths||a.useDepths||a.useDecorators||this.options.compat,this.useBlockParams=this.useBlockParams||a.useBlockParams;var e=a.opcodes,f=void 0,g=void 0,h=void 0,i=void 0;for(h=0,i=e.length;h<i;h++)f=e[h],this.source.currentLocation=f.loc,g=g||f.loc,this[f.opcode].apply(this,f.args);if(this.source.currentLocation=g,this.pushSource(""),this.stackSlot||this.inlineStack.length||this.compileStack.length)throw new j["default"]("Compile completed with content left on stack");this.decorators.isEmpty()?this.decorators=void 0:(this.useDecorators=!0,this.decorators.prepend("var decorators = container.decorators;\n"),this.decorators.push("return fn;"),d?this.decorators=Function.apply(this,["fn","props","container","depth0","data","blockParams","depths",this.decorators.merge()]):(this.decorators.prepend("function(fn, props, container, depth0, data, blockParams, depths) {\n"),this.decorators.push("}\n"),this.decorators=this.decorators.merge()));var k=this.createFunctionContext(d);if(this.isChild)return k;var l={compiler:this.compilerInfo(),main:k};this.decorators&&(l.main_d=this.decorators,l.useDecorators=!0);var m=this.context,n=m.programs,o=m.decorators;for(h=0,i=n.length;h<i;h++)n[h]&&(l[h]=n[h],o[h]&&(l[h+"_d"]=o[h],l.useDecorators=!0));return this.environment.usePartial&&(l.usePartial=!0),this.options.data&&(l.useData=!0),this.useDepths&&(l.useDepths=!0),this.useBlockParams&&(l.useBlockParams=!0),this.options.compat&&(l.compat=!0),d?l.compilerOptions=this.options:(l.compiler=JSON.stringify(l.compiler),this.source.currentLocation={start:{line:1,column:0}},l=this.objectLiteral(l),b.srcName?(l=l.toStringWithSourceMap({file:b.destName}),l.map=l.map&&l.map.toString()):l=l.toString()),l},preamble:function(){this.lastContext=0,this.source=new m["default"](this.options.srcName),this.decorators=new m["default"](this.options.srcName)},createFunctionContext:function(a){var b="",c=this.stackVars.concat(this.registers.list);c.length>0&&(b+=", "+c.join(", "));var d=0;for(var e in this.aliases){var f=this.aliases[e];this.aliases.hasOwnProperty(e)&&f.children&&f.referenceCount>1&&(b+=", alias"+ ++d+"="+e,f.children[0]="alias"+d)}var g=["container","depth0","helpers","partials","data"];(this.useBlockParams||this.useDepths)&&g.push("blockParams"),this.useDepths&&g.push("depths");var h=this.mergeSource(b);return a?(g.push(h),Function.apply(this,g)):this.source.wrap(["function(",g.join(","),") {\n  ",h,"}"])},mergeSource:function(a){var b=this.environment.isSimple,c=!this.forceBuffer,d=void 0,e=void 0,f=void 0,g=void 0;return this.source.each(function(a){a.appendToBuffer?(f?a.prepend("  + "):f=a,g=a):(f&&(e?f.prepend("buffer += "):d=!0,g.add(";"),f=g=void 0),e=!0,b||(c=!1))}),c?f?(f.prepend("return "),g.add(";")):e||this.source.push('return "";'):(a+=", buffer = "+(d?"":this.initializeBuffer()),f?(f.prepend("return buffer + "),g.add(";")):this.source.push("return buffer;")),a&&this.source.prepend("var "+a.substring(2)+(d?"":";\n")),this.source.merge()},blockValue:function(a){var b=this.aliasable("helpers.blockHelperMissing"),c=[this.contextName(0)];this.setupHelperArgs(a,0,c);var d=this.popStack();c.splice(1,0,d),this.push(this.source.functionCall(b,"call",c))},ambiguousBlockValue:function(){var a=this.aliasable("helpers.blockHelperMissing"),b=[this.contextName(0)];this.setupHelperArgs("",0,b,!0),this.flushInline();var c=this.topStack();b.splice(1,0,c),this.pushSource(["if (!",this.lastHelper,") { ",c," = ",this.source.functionCall(a,"call",b),"}"])},appendContent:function(a){this.pendingContent?a=this.pendingContent+a:this.pendingLocation=this.source.currentLocation,this.pendingContent=a},append:function(){if(this.isInline())this.replaceStack(function(a){return[" != null ? ",a,' : ""']}),this.pushSource(this.appendToBuffer(this.popStack()));else{var a=this.popStack();this.pushSource(["if (",a," != null) { ",this.appendToBuffer(a,void 0,!0)," }"]),this.environment.isSimple&&this.pushSource(["else { ",this.appendToBuffer("''",void 0,!0)," }"])}},appendEscaped:function(){this.pushSource(this.appendToBuffer([this.aliasable("container.escapeExpression"),"(",this.popStack(),")"]))},getContext:function(a){this.lastContext=a},pushContext:function(){this.pushStackLiteral(this.contextName(this.lastContext))},lookupOnContext:function(a,b,c,d){var e=0;d||!this.options.compat||this.lastContext?this.pushContext():this.push(this.depthedLookup(a[e++])),this.resolvePath("context",a,e,b,c)},lookupBlockParam:function(a,b){this.useBlockParams=!0,this.push(["blockParams[",a[0],"][",a[1],"]"]),this.resolvePath("context",b,1)},lookupData:function(a,b,c){a?this.pushStackLiteral("container.data(data, "+a+")"):this.pushStackLiteral("data"),this.resolvePath("data",b,0,!0,c)},resolvePath:function(a,b,c,d,e){var g=this;if(this.options.strict||this.options.assumeObjects)return void this.push(f(this.options.strict&&e,this,b,a));for(var h=b.length;c<h;c++)this.replaceStack(function(e){
var f=g.nameLookup(e,b[c],a);return d?[" && ",f]:[" != null ? ",f," : ",e]})},resolvePossibleLambda:function(){this.push([this.aliasable("container.lambda"),"(",this.popStack(),", ",this.contextName(0),")"])},pushStringParam:function(a,b){this.pushContext(),this.pushString(b),"SubExpression"!==b&&("string"==typeof a?this.pushString(a):this.pushStackLiteral(a))},emptyHash:function(a){this.trackIds&&this.push("{}"),this.stringParams&&(this.push("{}"),this.push("{}")),this.pushStackLiteral(a?"undefined":"{}")},pushHash:function(){this.hash&&this.hashes.push(this.hash),this.hash={values:[],types:[],contexts:[],ids:[]}},popHash:function(){var a=this.hash;this.hash=this.hashes.pop(),this.trackIds&&this.push(this.objectLiteral(a.ids)),this.stringParams&&(this.push(this.objectLiteral(a.contexts)),this.push(this.objectLiteral(a.types))),this.push(this.objectLiteral(a.values))},pushString:function(a){this.pushStackLiteral(this.quotedString(a))},pushLiteral:function(a){this.pushStackLiteral(a)},pushProgram:function(a){null!=a?this.pushStackLiteral(this.programExpression(a)):this.pushStackLiteral(null)},registerDecorator:function(a,b){var c=this.nameLookup("decorators",b,"decorator"),d=this.setupHelperArgs(b,a);this.decorators.push(["fn = ",this.decorators.functionCall(c,"",["fn","props","container",d])," || fn;"])},invokeHelper:function(a,b,c){var d=this.popStack(),e=this.setupHelper(a,b),f=c?[e.name," || "]:"",g=["("].concat(f,d);this.options.strict||g.push(" || ",this.aliasable("helpers.helperMissing")),g.push(")"),this.push(this.source.functionCall(g,"call",e.callParams))},invokeKnownHelper:function(a,b){var c=this.setupHelper(a,b);this.push(this.source.functionCall(c.name,"call",c.callParams))},invokeAmbiguous:function(a,b){this.useRegister("helper");var c=this.popStack();this.emptyHash();var d=this.setupHelper(0,a,b),e=this.lastHelper=this.nameLookup("helpers",a,"helper"),f=["(","(helper = ",e," || ",c,")"];this.options.strict||(f[0]="(helper = ",f.push(" != null ? helper : ",this.aliasable("helpers.helperMissing"))),this.push(["(",f,d.paramsInit?["),(",d.paramsInit]:[],"),","(typeof helper === ",this.aliasable('"function"')," ? ",this.source.functionCall("helper","call",d.callParams)," : helper))"])},invokePartial:function(a,b,c){var d=[],e=this.setupParams(b,1,d);a&&(b=this.popStack(),delete e.name),c&&(e.indent=JSON.stringify(c)),e.helpers="helpers",e.partials="partials",e.decorators="container.decorators",a?d.unshift(b):d.unshift(this.nameLookup("partials",b,"partial")),this.options.compat&&(e.depths="depths"),e=this.objectLiteral(e),d.push(e),this.push(this.source.functionCall("container.invokePartial","",d))},assignToHash:function(a){var b=this.popStack(),c=void 0,d=void 0,e=void 0;this.trackIds&&(e=this.popStack()),this.stringParams&&(d=this.popStack(),c=this.popStack());var f=this.hash;c&&(f.contexts[a]=c),d&&(f.types[a]=d),e&&(f.ids[a]=e),f.values[a]=b},pushId:function(a,b,c){"BlockParam"===a?this.pushStackLiteral("blockParams["+b[0]+"].path["+b[1]+"]"+(c?" + "+JSON.stringify("."+c):"")):"PathExpression"===a?this.pushString(b):"SubExpression"===a?this.pushStackLiteral("true"):this.pushStackLiteral("null")},compiler:e,compileChildren:function(a,b){for(var c=a.children,d=void 0,e=void 0,f=0,g=c.length;f<g;f++){d=c[f],e=new this.compiler;var h=this.matchExistingProgram(d);if(null==h){this.context.programs.push("");var i=this.context.programs.length;d.index=i,d.name="program"+i,this.context.programs[i]=e.compile(d,b,this.context,!this.precompile),this.context.decorators[i]=e.decorators,this.context.environments[i]=d,this.useDepths=this.useDepths||e.useDepths,this.useBlockParams=this.useBlockParams||e.useBlockParams,d.useDepths=this.useDepths,d.useBlockParams=this.useBlockParams}else d.index=h.index,d.name="program"+h.index,this.useDepths=this.useDepths||h.useDepths,this.useBlockParams=this.useBlockParams||h.useBlockParams}},matchExistingProgram:function(a){for(var b=0,c=this.context.environments.length;b<c;b++){var d=this.context.environments[b];if(d&&d.equals(a))return d}},programExpression:function(a){var b=this.environment.children[a],c=[b.index,"data",b.blockParams];return(this.useBlockParams||this.useDepths)&&c.push("blockParams"),this.useDepths&&c.push("depths"),"container.program("+c.join(", ")+")"},useRegister:function(a){this.registers[a]||(this.registers[a]=!0,this.registers.list.push(a))},push:function(a){return a instanceof d||(a=this.source.wrap(a)),this.inlineStack.push(a),a},pushStackLiteral:function(a){this.push(new d(a))},pushSource:function(a){this.pendingContent&&(this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent),this.pendingLocation)),this.pendingContent=void 0),a&&this.source.push(a)},replaceStack:function(a){var b=["("],c=void 0,e=void 0,f=void 0;if(!this.isInline())throw new j["default"]("replaceStack on non-inline");var g=this.popStack(!0);if(g instanceof d)c=[g.value],b=["(",c],f=!0;else{e=!0;var h=this.incrStack();b=["((",this.push(h)," = ",g,")"],c=this.topStack()}var i=a.call(this,c);f||this.popStack(),e&&this.stackSlot--,this.push(b.concat(i,")"))},incrStack:function(){return this.stackSlot++,this.stackSlot>this.stackVars.length&&this.stackVars.push("stack"+this.stackSlot),this.topStackName()},topStackName:function(){return"stack"+this.stackSlot},flushInline:function(){var a=this.inlineStack;this.inlineStack=[];for(var b=0,c=a.length;b<c;b++){var e=a[b];if(e instanceof d)this.compileStack.push(e);else{var f=this.incrStack();this.pushSource([f," = ",e,";"]),this.compileStack.push(f)}}},isInline:function(){return this.inlineStack.length},popStack:function(a){var b=this.isInline(),c=(b?this.inlineStack:this.compileStack).pop();if(!a&&c instanceof d)return c.value;if(!b){if(!this.stackSlot)throw new j["default"]("Invalid stack pop");this.stackSlot--}return c},topStack:function(){var a=this.isInline()?this.inlineStack:this.compileStack,b=a[a.length-1];return b instanceof d?b.value:b},contextName:function(a){return this.useDepths&&a?"depths["+a+"]":"depth"+a},quotedString:function(a){return this.source.quotedString(a)},objectLiteral:function(a){return this.source.objectLiteral(a)},aliasable:function(a){var b=this.aliases[a];return b?(b.referenceCount++,b):(b=this.aliases[a]=this.source.wrap(a),b.aliasable=!0,b.referenceCount=1,b)},setupHelper:function(a,b,c){var d=[],e=this.setupHelperArgs(b,a,d,c),f=this.nameLookup("helpers",b,"helper"),g=this.aliasable(this.contextName(0)+" != null ? "+this.contextName(0)+" : (container.nullContext || {})");return{params:d,paramsInit:e,name:f,callParams:[g].concat(d)}},setupParams:function(a,b,c){var d={},e=[],f=[],g=[],h=!c,i=void 0;h&&(c=[]),d.name=this.quotedString(a),d.hash=this.popStack(),this.trackIds&&(d.hashIds=this.popStack()),this.stringParams&&(d.hashTypes=this.popStack(),d.hashContexts=this.popStack());var j=this.popStack(),k=this.popStack();(k||j)&&(d.fn=k||"container.noop",d.inverse=j||"container.noop");for(var l=b;l--;)i=this.popStack(),c[l]=i,this.trackIds&&(g[l]=this.popStack()),this.stringParams&&(f[l]=this.popStack(),e[l]=this.popStack());return h&&(d.args=this.source.generateArray(c)),this.trackIds&&(d.ids=this.source.generateArray(g)),this.stringParams&&(d.types=this.source.generateArray(f),d.contexts=this.source.generateArray(e)),this.options.data&&(d.data="data"),this.useBlockParams&&(d.blockParams="blockParams"),d},setupHelperArgs:function(a,b,c,d){var e=this.setupParams(a,b,c);return e=this.objectLiteral(e),d?(this.useRegister("options"),c.push("options"),["options=",e]):c?(c.push(e),""):e}},function(){for(var a="break else new var case finally return void catch for switch while continue function this with default if throw delete in try do instanceof typeof abstract enum int short boolean export interface static byte extends long super char final native synchronized class float package throws const goto private transient debugger implements protected volatile double import public let yield await null true false".split(" "),b=e.RESERVED_WORDS={},c=0,d=a.length;c<d;c++)b[a[c]]=!0}(),e.isValidJavaScriptVariableName=function(a){return!e.RESERVED_WORDS[a]&&/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(a)},b["default"]=e,a.exports=b["default"]},function(a,b,c){"use strict";function d(a,b,c){if(f.isArray(a)){for(var d=[],e=0,g=a.length;e<g;e++)d.push(b.wrap(a[e],c));return d}return"boolean"==typeof a||"number"==typeof a?a+"":a}function e(a){this.srcFile=a,this.source=[]}b.__esModule=!0;var f=c(5),g=void 0;try{}catch(h){}g||(g=function(a,b,c,d){this.src="",d&&this.add(d)},g.prototype={add:function(a){f.isArray(a)&&(a=a.join("")),this.src+=a},prepend:function(a){f.isArray(a)&&(a=a.join("")),this.src=a+this.src},toStringWithSourceMap:function(){return{code:this.toString()}},toString:function(){return this.src}}),e.prototype={isEmpty:function(){return!this.source.length},prepend:function(a,b){this.source.unshift(this.wrap(a,b))},push:function(a,b){this.source.push(this.wrap(a,b))},merge:function(){var a=this.empty();return this.each(function(b){a.add(["  ",b,"\n"])}),a},each:function(a){for(var b=0,c=this.source.length;b<c;b++)a(this.source[b])},empty:function(){var a=this.currentLocation||{start:{}};return new g(a.start.line,a.start.column,this.srcFile)},wrap:function(a){var b=arguments.length<=1||void 0===arguments[1]?this.currentLocation||{start:{}}:arguments[1];return a instanceof g?a:(a=d(a,this,b),new g(b.start.line,b.start.column,this.srcFile,a))},functionCall:function(a,b,c){return c=this.generateList(c),this.wrap([a,b?"."+b+"(":"(",c,")"])},quotedString:function(a){return'"'+(a+"").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")+'"'},objectLiteral:function(a){var b=[];for(var c in a)if(a.hasOwnProperty(c)){var e=d(a[c],this);"undefined"!==e&&b.push([this.quotedString(c),":",e])}var f=this.generateList(b);return f.prepend("{"),f.add("}"),f},generateList:function(a){for(var b=this.empty(),c=0,e=a.length;c<e;c++)c&&b.add(","),b.add(d(a[c],this));return b},generateArray:function(a){var b=this.generateList(a);return b.prepend("["),b.add("]"),b}},b["default"]=e,a.exports=b["default"]}])});
},{}],5:[function(require,module,exports){
/* jshint node:true */
'use strict';

// Add all locale data to `HandlebarsIntl`. This module will be ignored when
// bundling for the browser with Browserify/Webpack.
require('./lib/locales');

exports = module.exports = require('./lib/handlebars-intl');

},{"./lib/handlebars-intl":7,"./lib/locales":1}],6:[function(require,module,exports){
// GENERATED FILE
"use strict";
exports["default"] = {"locale":"en","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n10==1&&n100!=11?"one":n10==2&&n100!=12?"two":n10==3&&n100!=13?"few":"other";return n==1&&v0?"one":"other"},"fields":{"year":{"displayName":"Year","relative":{"0":"this year","1":"next year","-1":"last year"},"relativeTime":{"future":{"one":"in {0} year","other":"in {0} years"},"past":{"one":"{0} year ago","other":"{0} years ago"}}},"month":{"displayName":"Month","relative":{"0":"this month","1":"next month","-1":"last month"},"relativeTime":{"future":{"one":"in {0} month","other":"in {0} months"},"past":{"one":"{0} month ago","other":"{0} months ago"}}},"day":{"displayName":"Day","relative":{"0":"today","1":"tomorrow","-1":"yesterday"},"relativeTime":{"future":{"one":"in {0} day","other":"in {0} days"},"past":{"one":"{0} day ago","other":"{0} days ago"}}},"hour":{"displayName":"Hour","relativeTime":{"future":{"one":"in {0} hour","other":"in {0} hours"},"past":{"one":"{0} hour ago","other":"{0} hours ago"}}},"minute":{"displayName":"Minute","relativeTime":{"future":{"one":"in {0} minute","other":"in {0} minutes"},"past":{"one":"{0} minute ago","other":"{0} minutes ago"}}},"second":{"displayName":"Second","relative":{"0":"now"},"relativeTime":{"future":{"one":"in {0} second","other":"in {0} seconds"},"past":{"one":"{0} second ago","other":"{0} seconds ago"}}}}};


},{}],7:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jshint esnext: true */

"use strict";
exports.__addLocaleData = __addLocaleData;
var intl$messageformat$$ = require("intl-messageformat"), intl$relativeformat$$ = require("intl-relativeformat"), src$helpers$$ = require("./helpers.js"), src$en$$ = require("./en.js");
function __addLocaleData(data) {
    intl$messageformat$$["default"].__addLocaleData(data);
    intl$relativeformat$$["default"].__addLocaleData(data);
}

__addLocaleData(src$en$$["default"]);
exports.registerWith = src$helpers$$.registerWith;


},{"./en.js":6,"./helpers.js":8,"intl-messageformat":13,"intl-relativeformat":22}],8:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jshint esnext: true */

"use strict";
var intl$messageformat$$ = require("intl-messageformat"), intl$relativeformat$$ = require("intl-relativeformat"), intl$format$cache$$ = require("intl-format-cache"), src$utils$$ = require("./utils.js");

// -----------------------------------------------------------------------------

var getNumberFormat   = intl$format$cache$$["default"](Intl.NumberFormat);
var getDateTimeFormat = intl$format$cache$$["default"](Intl.DateTimeFormat);
var getMessageFormat  = intl$format$cache$$["default"](intl$messageformat$$["default"]);
var getRelativeFormat = intl$format$cache$$["default"](intl$relativeformat$$["default"]);

function registerWith(Handlebars) {
    var SafeString  = Handlebars.SafeString,
        createFrame = Handlebars.createFrame,
        escape      = Handlebars.Utils.escapeExpression;

    var helpers = {
        intl             : intl,
        intlGet          : intlGet,
        formatDate       : formatDate,
        formatTime       : formatTime,
        formatRelative   : formatRelative,
        formatNumber     : formatNumber,
        formatMessage    : formatMessage,
        formatHTMLMessage: formatHTMLMessage,

        // Deprecated helpers (renamed):
        intlDate       : deprecate('intlDate', formatDate),
        intlTime       : deprecate('intlTime', formatTime),
        intlNumber     : deprecate('intlNumber', formatNumber),
        intlMessage    : deprecate('intlMessage', formatMessage),
        intlHTMLMessage: deprecate('intlHTMLMessage', formatHTMLMessage)
    };

    for (var name in helpers) {
        if (helpers.hasOwnProperty(name)) {
            Handlebars.registerHelper(name, helpers[name]);
        }
    }

    function deprecate(name, suggestion) {
        return function () {
            if (typeof console !== 'undefined' &&
                typeof console.warn === 'function') {

                console.warn(
                    '{{' + name + '}} is deprecated, use: ' +
                    '{{' + suggestion.name + '}}'
                );
            }

            return suggestion.apply(this, arguments);
        };
    }

    // -- Helpers --------------------------------------------------------------

    function intl(options) {
        /* jshint validthis:true */

        if (!options.fn) {
            throw new Error('{{#intl}} must be invoked as a block helper');
        }

        // Create a new data frame linked the parent and create a new intl data
        // object and extend it with `options.data.intl` and `options.hash`.
        var data     = createFrame(options.data),
            intlData = src$utils$$.extend({}, data.intl, options.hash);

        data.intl = intlData;

        return options.fn(this, {data: data});
    }

    function intlGet(path, options) {
        var intlData  = options.data && options.data.intl,
            pathParts = path.split('.');

        var obj, len, i;

        // Use the path to walk the Intl data to find the object at the given
        // path, and throw a descriptive error if it's not found.
        try {
            for (i = 0, len = pathParts.length; i < len; i++) {
                obj = intlData = intlData[pathParts[i]];
            }
        } finally {
            if (obj === undefined) {
                throw new ReferenceError('Could not find Intl object: ' + path);
            }
        }

        return obj;
    }

    function formatDate(date, format, options) {
        date = new Date(date);
        assertIsDate(date, 'A date or timestamp must be provided to {{formatDate}}');

        if (!options) {
            options = format;
            format  = null;
        }

        var locales       = options.data.intl && options.data.intl.locales;
        var formatOptions = getFormatOptions('date', format, options);

        return getDateTimeFormat(locales, formatOptions).format(date);
    }

    function formatTime(date, format, options) {
        date = new Date(date);
        assertIsDate(date, 'A date or timestamp must be provided to {{formatTime}}');

        if (!options) {
            options = format;
            format  = null;
        }

        var locales       = options.data.intl && options.data.intl.locales;
        var formatOptions = getFormatOptions('time', format, options);

        return getDateTimeFormat(locales, formatOptions).format(date);
    }

    function formatRelative(date, format, options) {
        date = new Date(date);
        assertIsDate(date, 'A date or timestamp must be provided to {{formatRelative}}');

        if (!options) {
            options = format;
            format  = null;
        }

        var locales       = options.data.intl && options.data.intl.locales;
        var formatOptions = getFormatOptions('relative', format, options);
        var now           = options.hash.now;

        // Remove `now` from the options passed to the `IntlRelativeFormat`
        // constructor, because it's only used when calling `format()`.
        delete formatOptions.now;

        return getRelativeFormat(locales, formatOptions).format(date, {
            now: now
        });
    }

    function formatNumber(num, format, options) {
        assertIsNumber(num, 'A number must be provided to {{formatNumber}}');

        if (!options) {
            options = format;
            format  = null;
        }

        var locales       = options.data.intl && options.data.intl.locales;
        var formatOptions = getFormatOptions('number', format, options);

        return getNumberFormat(locales, formatOptions).format(num);
    }

    function formatMessage(message, options) {
        if (!options) {
            options = message;
            message = null;
        }

        var hash = options.hash;

        // TODO: remove support form `hash.intlName` once Handlebars bugs with
        // subexpressions are fixed.
        if (!(message || typeof message === 'string' || hash.intlName)) {
            throw new ReferenceError(
                '{{formatMessage}} must be provided a message or intlName'
            );
        }

        var intlData = options.data.intl || {},
            locales  = intlData.locales,
            formats  = intlData.formats;

        // Lookup message by path name. User must supply the full path to the
        // message on `options.data.intl`.
        if (!message && hash.intlName) {
            message = intlGet(hash.intlName, options);
        }

        // When `message` is a function, assume it's an IntlMessageFormat
        // instance's `format()` method passed by reference, and call it. This
        // is possible because its `this` will be pre-bound to the instance.
        if (typeof message === 'function') {
            return message(hash);
        }

        if (typeof message === 'string') {
            message = getMessageFormat(message, locales, formats);
        }

        return message.format(hash);
    }

    function formatHTMLMessage() {
        /* jshint validthis:true */
        var options = [].slice.call(arguments).pop(),
            hash    = options.hash;

        var key, value;

        // Replace string properties in `options.hash` with HTML-escaped
        // strings.
        for (key in hash) {
            if (hash.hasOwnProperty(key)) {
                value = hash[key];

                // Escape string value.
                if (typeof value === 'string') {
                    hash[key] = escape(value);
                }
            }
        }

        // Return a Handlebars `SafeString`. This first unwraps the result to
        // make sure it's not returning a double-wrapped `SafeString`.
        return new SafeString(String(formatMessage.apply(this, arguments)));
    }

    // -- Utilities ------------------------------------------------------------

    function assertIsDate(date, errMsg) {
        // Determine if the `date` is valid by checking if it is finite, which
        // is the same way that `Intl.DateTimeFormat#format()` checks.
        if (!isFinite(date)) {
            throw new TypeError(errMsg);
        }
    }

    function assertIsNumber(num, errMsg) {
        if (typeof num !== 'number') {
            throw new TypeError(errMsg);
        }
    }

    function getFormatOptions(type, format, options) {
        var hash = options.hash;
        var formatOptions;

        if (format) {
            if (typeof format === 'string') {
                formatOptions = intlGet('formats.' + type + '.' + format, options);
            }

            formatOptions = src$utils$$.extend({}, formatOptions, hash);
        } else {
            formatOptions = hash;
        }

        return formatOptions;
    }
}
exports.registerWith = registerWith;


},{"./utils.js":9,"intl-format-cache":10,"intl-messageformat":13,"intl-relativeformat":22}],9:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jshint esnext: true */

"use strict";

// -----------------------------------------------------------------------------

function extend(obj) {
    var sources = Array.prototype.slice.call(arguments, 1),
        i, len, source, key;

    for (i = 0, len = sources.length; i < len; i += 1) {
        source = sources[i];
        if (!source) { continue; }

        for (key in source) {
            if (source.hasOwnProperty(key)) {
                obj[key] = source[key];
            }
        }
    }

    return obj;
}
exports.extend = extend;


},{}],10:[function(require,module,exports){
'use strict';

exports = module.exports = require('./lib/memoizer')['default'];
exports['default'] = exports;

},{"./lib/memoizer":12}],11:[function(require,module,exports){
"use strict";
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

// Function.prototype.bind implementation from Mozilla Developer Network:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#Polyfill

var bind = Function.prototype.bind || function (oThis) {
    if (typeof this !== 'function') {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs   = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP    = function() {},
        fBound  = function() {
          return fToBind.apply(this instanceof fNOP
                 ? this
                 : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    if (this.prototype) {
      // native functions don't have a prototype
      fNOP.prototype = this.prototype;
    }
    fBound.prototype = new fNOP();

    return fBound;
};

// Purposely using the same implementation as the Intl.js `Intl` polyfill.
// Copyright 2013 Andy Earnshaw, MIT License

var hop = Object.prototype.hasOwnProperty;

var realDefineProp = (function () {
    try { return !!Object.defineProperty({}, 'a', {}); }
    catch (e) { return false; }
})();

var es3 = !realDefineProp && !Object.prototype.__defineGetter__;

var defineProperty = realDefineProp ? Object.defineProperty :
        function (obj, name, desc) {

    if ('get' in desc && obj.__defineGetter__) {
        obj.__defineGetter__(name, desc.get);
    } else if (!hop.call(obj, name) || 'value' in desc) {
        obj[name] = desc.value;
    }
};

var objCreate = Object.create || function (proto, props) {
    var obj, k;

    function F() {}
    F.prototype = proto;
    obj = new F();

    for (k in props) {
        if (hop.call(props, k)) {
            defineProperty(obj, k, props[k]);
        }
    }

    return obj;
};

exports.bind = bind, exports.defineProperty = defineProperty, exports.objCreate = objCreate;


},{}],12:[function(require,module,exports){
"use strict";
var src$es5$$ = require("./es5");
exports["default"] = createFormatCache;

// -----------------------------------------------------------------------------

function createFormatCache(FormatConstructor) {
    var cache = src$es5$$.objCreate(null);

    return function () {
        var args    = Array.prototype.slice.call(arguments);
        var cacheId = getCacheId(args);
        var format  = cacheId && cache[cacheId];

        if (!format) {
            format = new (src$es5$$.bind.apply(FormatConstructor, [null].concat(args)))();

            if (cacheId) {
                cache[cacheId] = format;
            }
        }

        return format;
    };
}

// -- Utilities ----------------------------------------------------------------

function getCacheId(inputs) {
    // When JSON is not available in the runtime, we will not create a cache id.
    if (typeof JSON === 'undefined') { return; }

    var cacheId = [];

    var i, len, input;

    for (i = 0, len = inputs.length; i < len; i += 1) {
        input = inputs[i];

        if (input && typeof input === 'object') {
            cacheId.push(orderedProps(input));
        } else {
            cacheId.push(input);
        }
    }

    return JSON.stringify(cacheId);
}

function orderedProps(obj) {
    var props = [],
        keys  = [];

    var key, i, len, prop;

    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            keys.push(key);
        }
    }

    var orderedKeys = keys.sort();

    for (i = 0, len = orderedKeys.length; i < len; i += 1) {
        key  = orderedKeys[i];
        prop = {};

        prop[key] = obj[key];
        props[i]  = prop;
    }

    return props;
}


},{"./es5":11}],13:[function(require,module,exports){
/* jshint node:true */

'use strict';

var IntlMessageFormat = require('./lib/main')['default'];

// Add all locale data to `IntlMessageFormat`. This module will be ignored when
// bundling for the browser with Browserify/Webpack.
require('./lib/locales');

// Re-export `IntlMessageFormat` as the CommonJS default exports with all the
// locale data registered, and with English set as the default locale. Define
// the `default` prop for use with other compiled ES6 Modules.
exports = module.exports = IntlMessageFormat;
exports['default'] = exports;

},{"./lib/locales":1,"./lib/main":18}],14:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
exports["default"] = Compiler;

function Compiler(locales, formats, pluralFn) {
    this.locales  = locales;
    this.formats  = formats;
    this.pluralFn = pluralFn;
}

Compiler.prototype.compile = function (ast) {
    this.pluralStack        = [];
    this.currentPlural      = null;
    this.pluralNumberFormat = null;

    return this.compileMessage(ast);
};

Compiler.prototype.compileMessage = function (ast) {
    if (!(ast && ast.type === 'messageFormatPattern')) {
        throw new Error('Message AST is not of type: "messageFormatPattern"');
    }

    var elements = ast.elements,
        pattern  = [];

    var i, len, element;

    for (i = 0, len = elements.length; i < len; i += 1) {
        element = elements[i];

        switch (element.type) {
            case 'messageTextElement':
                pattern.push(this.compileMessageText(element));
                break;

            case 'argumentElement':
                pattern.push(this.compileArgument(element));
                break;

            default:
                throw new Error('Message element does not have a valid type');
        }
    }

    return pattern;
};

Compiler.prototype.compileMessageText = function (element) {
    // When this `element` is part of plural sub-pattern and its value contains
    // an unescaped '#', use a `PluralOffsetString` helper to properly output
    // the number with the correct offset in the string.
    if (this.currentPlural && /(^|[^\\])#/g.test(element.value)) {
        // Create a cache a NumberFormat instance that can be reused for any
        // PluralOffsetString instance in this message.
        if (!this.pluralNumberFormat) {
            this.pluralNumberFormat = new Intl.NumberFormat(this.locales);
        }

        return new PluralOffsetString(
                this.currentPlural.id,
                this.currentPlural.format.offset,
                this.pluralNumberFormat,
                element.value);
    }

    // Unescape the escaped '#'s in the message text.
    return element.value.replace(/\\#/g, '#');
};

Compiler.prototype.compileArgument = function (element) {
    var format = element.format;

    if (!format) {
        return new StringFormat(element.id);
    }

    var formats  = this.formats,
        locales  = this.locales,
        pluralFn = this.pluralFn,
        options;

    switch (format.type) {
        case 'numberFormat':
            options = formats.number[format.style];
            return {
                id    : element.id,
                format: new Intl.NumberFormat(locales, options).format
            };

        case 'dateFormat':
            options = formats.date[format.style];
            return {
                id    : element.id,
                format: new Intl.DateTimeFormat(locales, options).format
            };

        case 'timeFormat':
            options = formats.time[format.style];
            return {
                id    : element.id,
                format: new Intl.DateTimeFormat(locales, options).format
            };

        case 'pluralFormat':
            options = this.compileOptions(element);
            return new PluralFormat(
                element.id, format.ordinal, format.offset, options, pluralFn
            );

        case 'selectFormat':
            options = this.compileOptions(element);
            return new SelectFormat(element.id, options);

        default:
            throw new Error('Message element does not have a valid format type');
    }
};

Compiler.prototype.compileOptions = function (element) {
    var format      = element.format,
        options     = format.options,
        optionsHash = {};

    // Save the current plural element, if any, then set it to a new value when
    // compiling the options sub-patterns. This conforms the spec's algorithm
    // for handling `"#"` syntax in message text.
    this.pluralStack.push(this.currentPlural);
    this.currentPlural = format.type === 'pluralFormat' ? element : null;

    var i, len, option;

    for (i = 0, len = options.length; i < len; i += 1) {
        option = options[i];

        // Compile the sub-pattern and save it under the options's selector.
        optionsHash[option.selector] = this.compileMessage(option.value);
    }

    // Pop the plural stack to put back the original current plural value.
    this.currentPlural = this.pluralStack.pop();

    return optionsHash;
};

// -- Compiler Helper Classes --------------------------------------------------

function StringFormat(id) {
    this.id = id;
}

StringFormat.prototype.format = function (value) {
    if (!value) {
        return '';
    }

    return typeof value === 'string' ? value : String(value);
};

function PluralFormat(id, useOrdinal, offset, options, pluralFn) {
    this.id         = id;
    this.useOrdinal = useOrdinal;
    this.offset     = offset;
    this.options    = options;
    this.pluralFn   = pluralFn;
}

PluralFormat.prototype.getOption = function (value) {
    var options = this.options;

    var option = options['=' + value] ||
            options[this.pluralFn(value - this.offset, this.useOrdinal)];

    return option || options.other;
};

function PluralOffsetString(id, offset, numberFormat, string) {
    this.id           = id;
    this.offset       = offset;
    this.numberFormat = numberFormat;
    this.string       = string;
}

PluralOffsetString.prototype.format = function (value) {
    var number = this.numberFormat.format(value - this.offset);

    return this.string
            .replace(/(^|[^\\])#/g, '$1' + number)
            .replace(/\\#/g, '#');
};

function SelectFormat(id, options) {
    this.id      = id;
    this.options = options;
}

SelectFormat.prototype.getOption = function (value) {
    var options = this.options;
    return options[value] || options.other;
};


},{}],15:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
var src$utils$$ = require("./utils"), src$es5$$ = require("./es5"), src$compiler$$ = require("./compiler"), intl$messageformat$parser$$ = require("intl-messageformat-parser");
exports["default"] = MessageFormat;

// -- MessageFormat --------------------------------------------------------

function MessageFormat(message, locales, formats) {
    // Parse string messages into an AST.
    var ast = typeof message === 'string' ?
            MessageFormat.__parse(message) : message;

    if (!(ast && ast.type === 'messageFormatPattern')) {
        throw new TypeError('A message must be provided as a String or AST.');
    }

    // Creates a new object with the specified `formats` merged with the default
    // formats.
    formats = this._mergeFormats(MessageFormat.formats, formats);

    // Defined first because it's used to build the format pattern.
    src$es5$$.defineProperty(this, '_locale',  {value: this._resolveLocale(locales)});

    // Compile the `ast` to a pattern that is highly optimized for repeated
    // `format()` invocations. **Note:** This passes the `locales` set provided
    // to the constructor instead of just the resolved locale.
    var pluralFn = this._findPluralRuleFunction(this._locale);
    var pattern  = this._compilePattern(ast, locales, formats, pluralFn);

    // "Bind" `format()` method to `this` so it can be passed by reference like
    // the other `Intl` APIs.
    var messageFormat = this;
    this.format = function (values) {
        return messageFormat._format(pattern, values);
    };
}

// Default format options used as the prototype of the `formats` provided to the
// constructor. These are used when constructing the internal Intl.NumberFormat
// and Intl.DateTimeFormat instances.
src$es5$$.defineProperty(MessageFormat, 'formats', {
    enumerable: true,

    value: {
        number: {
            'currency': {
                style: 'currency'
            },

            'percent': {
                style: 'percent'
            }
        },

        date: {
            'short': {
                month: 'numeric',
                day  : 'numeric',
                year : '2-digit'
            },

            'medium': {
                month: 'short',
                day  : 'numeric',
                year : 'numeric'
            },

            'long': {
                month: 'long',
                day  : 'numeric',
                year : 'numeric'
            },

            'full': {
                weekday: 'long',
                month  : 'long',
                day    : 'numeric',
                year   : 'numeric'
            }
        },

        time: {
            'short': {
                hour  : 'numeric',
                minute: 'numeric'
            },

            'medium':  {
                hour  : 'numeric',
                minute: 'numeric',
                second: 'numeric'
            },

            'long': {
                hour        : 'numeric',
                minute      : 'numeric',
                second      : 'numeric',
                timeZoneName: 'short'
            },

            'full': {
                hour        : 'numeric',
                minute      : 'numeric',
                second      : 'numeric',
                timeZoneName: 'short'
            }
        }
    }
});

// Define internal private properties for dealing with locale data.
src$es5$$.defineProperty(MessageFormat, '__localeData__', {value: src$es5$$.objCreate(null)});
src$es5$$.defineProperty(MessageFormat, '__addLocaleData', {value: function (data) {
    if (!(data && data.locale)) {
        throw new Error(
            'Locale data provided to IntlMessageFormat is missing a ' +
            '`locale` property'
        );
    }

    MessageFormat.__localeData__[data.locale.toLowerCase()] = data;
}});

// Defines `__parse()` static method as an exposed private.
src$es5$$.defineProperty(MessageFormat, '__parse', {value: intl$messageformat$parser$$["default"].parse});

// Define public `defaultLocale` property which defaults to English, but can be
// set by the developer.
src$es5$$.defineProperty(MessageFormat, 'defaultLocale', {
    enumerable: true,
    writable  : true,
    value     : undefined
});

MessageFormat.prototype.resolvedOptions = function () {
    // TODO: Provide anything else?
    return {
        locale: this._locale
    };
};

MessageFormat.prototype._compilePattern = function (ast, locales, formats, pluralFn) {
    var compiler = new src$compiler$$["default"](locales, formats, pluralFn);
    return compiler.compile(ast);
};

MessageFormat.prototype._findPluralRuleFunction = function (locale) {
    var localeData = MessageFormat.__localeData__;
    var data       = localeData[locale.toLowerCase()];

    // The locale data is de-duplicated, so we have to traverse the locale's
    // hierarchy until we find a `pluralRuleFunction` to return.
    while (data) {
        if (data.pluralRuleFunction) {
            return data.pluralRuleFunction;
        }

        data = data.parentLocale && localeData[data.parentLocale.toLowerCase()];
    }

    throw new Error(
        'Locale data added to IntlMessageFormat is missing a ' +
        '`pluralRuleFunction` for :' + locale
    );
};

MessageFormat.prototype._format = function (pattern, values) {
    var result = '',
        i, len, part, id, value;

    for (i = 0, len = pattern.length; i < len; i += 1) {
        part = pattern[i];

        // Exist early for string parts.
        if (typeof part === 'string') {
            result += part;
            continue;
        }

        id = part.id;

        // Enforce that all required values are provided by the caller.
        if (!(values && src$utils$$.hop.call(values, id))) {
            throw new Error('A value must be provided for: ' + id);
        }

        value = values[id];

        // Recursively format plural and select parts' option — which can be a
        // nested pattern structure. The choosing of the option to use is
        // abstracted-by and delegated-to the part helper object.
        if (part.options) {
            result += this._format(part.getOption(value), values);
        } else {
            result += part.format(value);
        }
    }

    return result;
};

MessageFormat.prototype._mergeFormats = function (defaults, formats) {
    var mergedFormats = {},
        type, mergedType;

    for (type in defaults) {
        if (!src$utils$$.hop.call(defaults, type)) { continue; }

        mergedFormats[type] = mergedType = src$es5$$.objCreate(defaults[type]);

        if (formats && src$utils$$.hop.call(formats, type)) {
            src$utils$$.extend(mergedType, formats[type]);
        }
    }

    return mergedFormats;
};

MessageFormat.prototype._resolveLocale = function (locales) {
    if (typeof locales === 'string') {
        locales = [locales];
    }

    // Create a copy of the array so we can push on the default locale.
    locales = (locales || []).concat(MessageFormat.defaultLocale);

    var localeData = MessageFormat.__localeData__;
    var i, len, localeParts, data;

    // Using the set of locales + the default locale, we look for the first one
    // which that has been registered. When data does not exist for a locale, we
    // traverse its ancestors to find something that's been registered within
    // its hierarchy of locales. Since we lack the proper `parentLocale` data
    // here, we must take a naive approach to traversal.
    for (i = 0, len = locales.length; i < len; i += 1) {
        localeParts = locales[i].toLowerCase().split('-');

        while (localeParts.length) {
            data = localeData[localeParts.join('-')];
            if (data) {
                // Return the normalized locale string; e.g., we return "en-US",
                // instead of "en-us".
                return data.locale;
            }

            localeParts.pop();
        }
    }

    var defaultLocale = locales.pop();
    throw new Error(
        'No locale data has been added to IntlMessageFormat for: ' +
        locales.join(', ') + ', or the default locale: ' + defaultLocale
    );
};


},{"./compiler":14,"./es5":17,"./utils":19,"intl-messageformat-parser":20}],16:[function(require,module,exports){
// GENERATED FILE
"use strict";
exports["default"] = {"locale":"en","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n10==1&&n100!=11?"one":n10==2&&n100!=12?"two":n10==3&&n100!=13?"few":"other";return n==1&&v0?"one":"other"}};


},{}],17:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
var src$utils$$ = require("./utils");

// Purposely using the same implementation as the Intl.js `Intl` polyfill.
// Copyright 2013 Andy Earnshaw, MIT License

var realDefineProp = (function () {
    try { return !!Object.defineProperty({}, 'a', {}); }
    catch (e) { return false; }
})();

var es3 = !realDefineProp && !Object.prototype.__defineGetter__;

var defineProperty = realDefineProp ? Object.defineProperty :
        function (obj, name, desc) {

    if ('get' in desc && obj.__defineGetter__) {
        obj.__defineGetter__(name, desc.get);
    } else if (!src$utils$$.hop.call(obj, name) || 'value' in desc) {
        obj[name] = desc.value;
    }
};

var objCreate = Object.create || function (proto, props) {
    var obj, k;

    function F() {}
    F.prototype = proto;
    obj = new F();

    for (k in props) {
        if (src$utils$$.hop.call(props, k)) {
            defineProperty(obj, k, props[k]);
        }
    }

    return obj;
};
exports.defineProperty = defineProperty, exports.objCreate = objCreate;


},{"./utils":19}],18:[function(require,module,exports){
/* jslint esnext: true */

"use strict";
var src$core$$ = require("./core"), src$en$$ = require("./en");

src$core$$["default"].__addLocaleData(src$en$$["default"]);
src$core$$["default"].defaultLocale = 'en';

exports["default"] = src$core$$["default"];


},{"./core":15,"./en":16}],19:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
exports.extend = extend;
var hop = Object.prototype.hasOwnProperty;

function extend(obj) {
    var sources = Array.prototype.slice.call(arguments, 1),
        i, len, source, key;

    for (i = 0, len = sources.length; i < len; i += 1) {
        source = sources[i];
        if (!source) { continue; }

        for (key in source) {
            if (hop.call(source, key)) {
                obj[key] = source[key];
            }
        }
    }

    return obj;
}
exports.hop = hop;


},{}],20:[function(require,module,exports){
'use strict';

exports = module.exports = require('./lib/parser')['default'];
exports['default'] = exports;

},{"./lib/parser":21}],21:[function(require,module,exports){
"use strict";

exports["default"] = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = [],
        peg$c1 = function(elements) {
                return {
                    type    : 'messageFormatPattern',
                    elements: elements
                };
            },
        peg$c2 = peg$FAILED,
        peg$c3 = function(text) {
                var string = '',
                    i, j, outerLen, inner, innerLen;

                for (i = 0, outerLen = text.length; i < outerLen; i += 1) {
                    inner = text[i];

                    for (j = 0, innerLen = inner.length; j < innerLen; j += 1) {
                        string += inner[j];
                    }
                }

                return string;
            },
        peg$c4 = function(messageText) {
                return {
                    type : 'messageTextElement',
                    value: messageText
                };
            },
        peg$c5 = /^[^ \t\n\r,.+={}#]/,
        peg$c6 = { type: "class", value: "[^ \\t\\n\\r,.+={}#]", description: "[^ \\t\\n\\r,.+={}#]" },
        peg$c7 = "{",
        peg$c8 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c9 = null,
        peg$c10 = ",",
        peg$c11 = { type: "literal", value: ",", description: "\",\"" },
        peg$c12 = "}",
        peg$c13 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c14 = function(id, format) {
                return {
                    type  : 'argumentElement',
                    id    : id,
                    format: format && format[2]
                };
            },
        peg$c15 = "number",
        peg$c16 = { type: "literal", value: "number", description: "\"number\"" },
        peg$c17 = "date",
        peg$c18 = { type: "literal", value: "date", description: "\"date\"" },
        peg$c19 = "time",
        peg$c20 = { type: "literal", value: "time", description: "\"time\"" },
        peg$c21 = function(type, style) {
                return {
                    type : type + 'Format',
                    style: style && style[2]
                };
            },
        peg$c22 = "plural",
        peg$c23 = { type: "literal", value: "plural", description: "\"plural\"" },
        peg$c24 = function(pluralStyle) {
                return {
                    type   : pluralStyle.type,
                    ordinal: false,
                    offset : pluralStyle.offset || 0,
                    options: pluralStyle.options
                };
            },
        peg$c25 = "selectordinal",
        peg$c26 = { type: "literal", value: "selectordinal", description: "\"selectordinal\"" },
        peg$c27 = function(pluralStyle) {
                return {
                    type   : pluralStyle.type,
                    ordinal: true,
                    offset : pluralStyle.offset || 0,
                    options: pluralStyle.options
                }
            },
        peg$c28 = "select",
        peg$c29 = { type: "literal", value: "select", description: "\"select\"" },
        peg$c30 = function(options) {
                return {
                    type   : 'selectFormat',
                    options: options
                };
            },
        peg$c31 = "=",
        peg$c32 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c33 = function(selector, pattern) {
                return {
                    type    : 'optionalFormatPattern',
                    selector: selector,
                    value   : pattern
                };
            },
        peg$c34 = "offset:",
        peg$c35 = { type: "literal", value: "offset:", description: "\"offset:\"" },
        peg$c36 = function(number) {
                return number;
            },
        peg$c37 = function(offset, options) {
                return {
                    type   : 'pluralFormat',
                    offset : offset,
                    options: options
                };
            },
        peg$c38 = { type: "other", description: "whitespace" },
        peg$c39 = /^[ \t\n\r]/,
        peg$c40 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
        peg$c41 = { type: "other", description: "optionalWhitespace" },
        peg$c42 = /^[0-9]/,
        peg$c43 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c44 = /^[0-9a-f]/i,
        peg$c45 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
        peg$c46 = "0",
        peg$c47 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c48 = /^[1-9]/,
        peg$c49 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c50 = function(digits) {
            return parseInt(digits, 10);
        },
        peg$c51 = /^[^{}\\\0-\x1F \t\n\r]/,
        peg$c52 = { type: "class", value: "[^{}\\\\\\0-\\x1F \\t\\n\\r]", description: "[^{}\\\\\\0-\\x1F \\t\\n\\r]" },
        peg$c53 = "\\#",
        peg$c54 = { type: "literal", value: "\\#", description: "\"\\\\#\"" },
        peg$c55 = function() { return '\\#'; },
        peg$c56 = "\\{",
        peg$c57 = { type: "literal", value: "\\{", description: "\"\\\\{\"" },
        peg$c58 = function() { return '\u007B'; },
        peg$c59 = "\\}",
        peg$c60 = { type: "literal", value: "\\}", description: "\"\\\\}\"" },
        peg$c61 = function() { return '\u007D'; },
        peg$c62 = "\\u",
        peg$c63 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },
        peg$c64 = function(digits) {
                return String.fromCharCode(parseInt(digits, 16));
            },
        peg$c65 = function(chars) { return chars.join(''); },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parsemessageFormatPattern();

      return s0;
    }

    function peg$parsemessageFormatPattern() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsemessageFormatElement();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsemessageFormatElement();
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c1(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsemessageFormatElement() {
      var s0;

      s0 = peg$parsemessageTextElement();
      if (s0 === peg$FAILED) {
        s0 = peg$parseargumentElement();
      }

      return s0;
    }

    function peg$parsemessageText() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$currPos;
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsechars();
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s3 = [s3, s4, s5];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c2;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$c2;
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$currPos;
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsechars();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c2;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c2;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
        }
      } else {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c3(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsews();
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parsemessageTextElement() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parsemessageText();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c4(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseargument() {
      var s0, s1, s2;

      s0 = peg$parsenumber();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        if (peg$c5.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c6); }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (peg$c5.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c6); }
            }
          }
        } else {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseargumentElement() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c7;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseargument();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 44) {
                s6 = peg$c10;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseelementFormat();
                  if (s8 !== peg$FAILED) {
                    s6 = [s6, s7, s8];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c2;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$c2;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c2;
              }
              if (s5 === peg$FAILED) {
                s5 = peg$c9;
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 125) {
                    s7 = peg$c12;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c13); }
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c14(s3, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseelementFormat() {
      var s0;

      s0 = peg$parsesimpleFormat();
      if (s0 === peg$FAILED) {
        s0 = peg$parsepluralFormat();
        if (s0 === peg$FAILED) {
          s0 = peg$parseselectOrdinalFormat();
          if (s0 === peg$FAILED) {
            s0 = peg$parseselectFormat();
          }
        }
      }

      return s0;
    }

    function peg$parsesimpleFormat() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c15) {
        s1 = peg$c15;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c16); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c17) {
          s1 = peg$c17;
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c18); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c19) {
            s1 = peg$c19;
            peg$currPos += 4;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c20); }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 44) {
            s4 = peg$c10;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsechars();
              if (s6 !== peg$FAILED) {
                s4 = [s4, s5, s6];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c2;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c2;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c2;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$c9;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c21(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parsepluralFormat() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c22) {
        s1 = peg$c22;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsepluralStyle();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c24(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseselectOrdinalFormat() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 13) === peg$c25) {
        s1 = peg$c25;
        peg$currPos += 13;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsepluralStyle();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c27(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseselectFormat() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c28) {
        s1 = peg$c28;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c10;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseoptionalFormatPattern();
              if (s6 !== peg$FAILED) {
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parseoptionalFormatPattern();
                }
              } else {
                s5 = peg$c2;
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c30(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseselector() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 61) {
        s2 = peg$c31;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parsenumber();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c2;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$parsechars();
      }

      return s0;
    }

    function peg$parseoptionalFormatPattern() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseselector();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 123) {
              s4 = peg$c7;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c8); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parsemessageFormatPattern();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 125) {
                      s8 = peg$c12;
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c13); }
                    }
                    if (s8 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c33(s2, s6);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c2;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c2;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c2;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parseoffset() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c34) {
        s1 = peg$c34;
        peg$currPos += 7;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c35); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsenumber();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c36(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parsepluralStyle() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parseoffset();
      if (s1 === peg$FAILED) {
        s1 = peg$c9;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseoptionalFormatPattern();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseoptionalFormatPattern();
            }
          } else {
            s3 = peg$c2;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c37(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c2;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c2;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c2;
      }

      return s0;
    }

    function peg$parsews() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c39.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c40); }
      }
      if (s1 !== peg$FAILED) {
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          if (peg$c39.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c40); }
          }
        }
      } else {
        s0 = peg$c2;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c38); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsews();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsews();
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c41); }
      }

      return s0;
    }

    function peg$parsedigit() {
      var s0;

      if (peg$c42.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c43); }
      }

      return s0;
    }

    function peg$parsehexDigit() {
      var s0;

      if (peg$c44.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c45); }
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 48) {
        s1 = peg$c46;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c47); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        s2 = peg$currPos;
        if (peg$c48.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c49); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parsedigit();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parsedigit();
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c2;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          s2 = input.substring(s1, peg$currPos);
        }
        s1 = s2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c50(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsechar() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      if (peg$c51.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c52); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c53) {
          s1 = peg$c53;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c54); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c55();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c56) {
            s1 = peg$c56;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c57); }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c58();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c59) {
              s1 = peg$c59;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c60); }
            }
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c61();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c62) {
                s1 = peg$c62;
                peg$currPos += 2;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c63); }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$currPos;
                s3 = peg$currPos;
                s4 = peg$parsehexDigit();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsehexDigit();
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parsehexDigit();
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parsehexDigit();
                      if (s7 !== peg$FAILED) {
                        s4 = [s4, s5, s6, s7];
                        s3 = s4;
                      } else {
                        peg$currPos = s3;
                        s3 = peg$c2;
                      }
                    } else {
                      peg$currPos = s3;
                      s3 = peg$c2;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c2;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c2;
                }
                if (s3 !== peg$FAILED) {
                  s3 = input.substring(s2, peg$currPos);
                }
                s2 = s3;
                if (s2 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c64(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c2;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c2;
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsechars() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsechar();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsechar();
        }
      } else {
        s1 = peg$c2;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c65(s1);
      }
      s0 = s1;

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();


},{}],22:[function(require,module,exports){
/* jshint node:true */

'use strict';

var IntlRelativeFormat = require('./lib/main')['default'];

// Add all locale data to `IntlRelativeFormat`. This module will be ignored when
// bundling for the browser with Browserify/Webpack.
require('./lib/locales');

// Re-export `IntlRelativeFormat` as the CommonJS default exports with all the
// locale data registered, and with English set as the default locale. Define
// the `default` prop for use with other compiled ES6 Modules.
exports = module.exports = IntlRelativeFormat;
exports['default'] = exports;

},{"./lib/locales":1,"./lib/main":27}],23:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";
var intl$messageformat$$ = require("intl-messageformat"), src$diff$$ = require("./diff"), src$es5$$ = require("./es5");
exports["default"] = RelativeFormat;

// -----------------------------------------------------------------------------

var FIELDS = ['second', 'minute', 'hour', 'day', 'month', 'year'];
var STYLES = ['best fit', 'numeric'];

// -- RelativeFormat -----------------------------------------------------------

function RelativeFormat(locales, options) {
    options = options || {};

    // Make a copy of `locales` if it's an array, so that it doesn't change
    // since it's used lazily.
    if (src$es5$$.isArray(locales)) {
        locales = locales.concat();
    }

    src$es5$$.defineProperty(this, '_locale', {value: this._resolveLocale(locales)});
    src$es5$$.defineProperty(this, '_options', {value: {
        style: this._resolveStyle(options.style),
        units: this._isValidUnits(options.units) && options.units
    }});

    src$es5$$.defineProperty(this, '_locales', {value: locales});
    src$es5$$.defineProperty(this, '_fields', {value: this._findFields(this._locale)});
    src$es5$$.defineProperty(this, '_messages', {value: src$es5$$.objCreate(null)});

    // "Bind" `format()` method to `this` so it can be passed by reference like
    // the other `Intl` APIs.
    var relativeFormat = this;
    this.format = function format(date, options) {
        return relativeFormat._format(date, options);
    };
}

// Define internal private properties for dealing with locale data.
src$es5$$.defineProperty(RelativeFormat, '__localeData__', {value: src$es5$$.objCreate(null)});
src$es5$$.defineProperty(RelativeFormat, '__addLocaleData', {value: function (data) {
    if (!(data && data.locale)) {
        throw new Error(
            'Locale data provided to IntlRelativeFormat is missing a ' +
            '`locale` property value'
        );
    }

    RelativeFormat.__localeData__[data.locale.toLowerCase()] = data;

    // Add data to IntlMessageFormat.
    intl$messageformat$$["default"].__addLocaleData(data);
}});

// Define public `defaultLocale` property which can be set by the developer, or
// it will be set when the first RelativeFormat instance is created by
// leveraging the resolved locale from `Intl`.
src$es5$$.defineProperty(RelativeFormat, 'defaultLocale', {
    enumerable: true,
    writable  : true,
    value     : undefined
});

// Define public `thresholds` property which can be set by the developer, and
// defaults to relative time thresholds from moment.js.
src$es5$$.defineProperty(RelativeFormat, 'thresholds', {
    enumerable: true,

    value: {
        second: 45,  // seconds to minute
        minute: 45,  // minutes to hour
        hour  : 22,  // hours to day
        day   : 26,  // days to month
        month : 11   // months to year
    }
});

RelativeFormat.prototype.resolvedOptions = function () {
    return {
        locale: this._locale,
        style : this._options.style,
        units : this._options.units
    };
};

RelativeFormat.prototype._compileMessage = function (units) {
    // `this._locales` is the original set of locales the user specified to the
    // constructor, while `this._locale` is the resolved root locale.
    var locales        = this._locales;
    var resolvedLocale = this._locale;

    var field        = this._fields[units];
    var relativeTime = field.relativeTime;
    var future       = '';
    var past         = '';
    var i;

    for (i in relativeTime.future) {
        if (relativeTime.future.hasOwnProperty(i)) {
            future += ' ' + i + ' {' +
                relativeTime.future[i].replace('{0}', '#') + '}';
        }
    }

    for (i in relativeTime.past) {
        if (relativeTime.past.hasOwnProperty(i)) {
            past += ' ' + i + ' {' +
                relativeTime.past[i].replace('{0}', '#') + '}';
        }
    }

    var message = '{when, select, future {{0, plural, ' + future + '}}' +
                                 'past {{0, plural, ' + past + '}}}';

    // Create the synthetic IntlMessageFormat instance using the original
    // locales value specified by the user when constructing the the parent
    // IntlRelativeFormat instance.
    return new intl$messageformat$$["default"](message, locales);
};

RelativeFormat.prototype._getMessage = function (units) {
    var messages = this._messages;

    // Create a new synthetic message based on the locale data from CLDR.
    if (!messages[units]) {
        messages[units] = this._compileMessage(units);
    }

    return messages[units];
};

RelativeFormat.prototype._getRelativeUnits = function (diff, units) {
    var field = this._fields[units];

    if (field.relative) {
        return field.relative[diff];
    }
};

RelativeFormat.prototype._findFields = function (locale) {
    var localeData = RelativeFormat.__localeData__;
    var data       = localeData[locale.toLowerCase()];

    // The locale data is de-duplicated, so we have to traverse the locale's
    // hierarchy until we find `fields` to return.
    while (data) {
        if (data.fields) {
            return data.fields;
        }

        data = data.parentLocale && localeData[data.parentLocale.toLowerCase()];
    }

    throw new Error(
        'Locale data added to IntlRelativeFormat is missing `fields` for :' +
        locale
    );
};

RelativeFormat.prototype._format = function (date, options) {
    var now = options && options.now !== undefined ? options.now : src$es5$$.dateNow();

    if (date === undefined) {
        date = now;
    }

    // Determine if the `date` and optional `now` values are valid, and throw a
    // similar error to what `Intl.DateTimeFormat#format()` would throw.
    if (!isFinite(now)) {
        throw new RangeError(
            'The `now` option provided to IntlRelativeFormat#format() is not ' +
            'in valid range.'
        );
    }

    if (!isFinite(date)) {
        throw new RangeError(
            'The date value provided to IntlRelativeFormat#format() is not ' +
            'in valid range.'
        );
    }

    var diffReport  = src$diff$$["default"](now, date);
    var units       = this._options.units || this._selectUnits(diffReport);
    var diffInUnits = diffReport[units];

    if (this._options.style !== 'numeric') {
        var relativeUnits = this._getRelativeUnits(diffInUnits, units);
        if (relativeUnits) {
            return relativeUnits;
        }
    }

    return this._getMessage(units).format({
        '0' : Math.abs(diffInUnits),
        when: diffInUnits < 0 ? 'past' : 'future'
    });
};

RelativeFormat.prototype._isValidUnits = function (units) {
    if (!units || src$es5$$.arrIndexOf.call(FIELDS, units) >= 0) {
        return true;
    }

    if (typeof units === 'string') {
        var suggestion = /s$/.test(units) && units.substr(0, units.length - 1);
        if (suggestion && src$es5$$.arrIndexOf.call(FIELDS, suggestion) >= 0) {
            throw new Error(
                '"' + units + '" is not a valid IntlRelativeFormat `units` ' +
                'value, did you mean: ' + suggestion
            );
        }
    }

    throw new Error(
        '"' + units + '" is not a valid IntlRelativeFormat `units` value, it ' +
        'must be one of: "' + FIELDS.join('", "') + '"'
    );
};

RelativeFormat.prototype._resolveLocale = function (locales) {
    if (typeof locales === 'string') {
        locales = [locales];
    }

    // Create a copy of the array so we can push on the default locale.
    locales = (locales || []).concat(RelativeFormat.defaultLocale);

    var localeData = RelativeFormat.__localeData__;
    var i, len, localeParts, data;

    // Using the set of locales + the default locale, we look for the first one
    // which that has been registered. When data does not exist for a locale, we
    // traverse its ancestors to find something that's been registered within
    // its hierarchy of locales. Since we lack the proper `parentLocale` data
    // here, we must take a naive approach to traversal.
    for (i = 0, len = locales.length; i < len; i += 1) {
        localeParts = locales[i].toLowerCase().split('-');

        while (localeParts.length) {
            data = localeData[localeParts.join('-')];
            if (data) {
                // Return the normalized locale string; e.g., we return "en-US",
                // instead of "en-us".
                return data.locale;
            }

            localeParts.pop();
        }
    }

    var defaultLocale = locales.pop();
    throw new Error(
        'No locale data has been added to IntlRelativeFormat for: ' +
        locales.join(', ') + ', or the default locale: ' + defaultLocale
    );
};

RelativeFormat.prototype._resolveStyle = function (style) {
    // Default to "best fit" style.
    if (!style) {
        return STYLES[0];
    }

    if (src$es5$$.arrIndexOf.call(STYLES, style) >= 0) {
        return style;
    }

    throw new Error(
        '"' + style + '" is not a valid IntlRelativeFormat `style` value, it ' +
        'must be one of: "' + STYLES.join('", "') + '"'
    );
};

RelativeFormat.prototype._selectUnits = function (diffReport) {
    var i, l, units;

    for (i = 0, l = FIELDS.length; i < l; i += 1) {
        units = FIELDS[i];

        if (Math.abs(diffReport[units]) < RelativeFormat.thresholds[units]) {
            break;
        }
    }

    return units;
};


},{"./diff":24,"./es5":26,"intl-messageformat":13}],24:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";

var round = Math.round;

function daysToYears(days) {
    // 400 years have 146097 days (taking into account leap year rules)
    return days * 400 / 146097;
}

exports["default"] = function (from, to) {
    // Convert to ms timestamps.
    from = +from;
    to   = +to;

    var millisecond = round(to - from),
        second      = round(millisecond / 1000),
        minute      = round(second / 60),
        hour        = round(minute / 60),
        day         = round(hour / 24),
        week        = round(day / 7);

    var rawYears = daysToYears(day),
        month    = round(rawYears * 12),
        year     = round(rawYears);

    return {
        millisecond: millisecond,
        second     : second,
        minute     : minute,
        hour       : hour,
        day        : day,
        week       : week,
        month      : month,
        year       : year
    };
};


},{}],25:[function(require,module,exports){
arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],26:[function(require,module,exports){
/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

"use strict";

// Purposely using the same implementation as the Intl.js `Intl` polyfill.
// Copyright 2013 Andy Earnshaw, MIT License

var hop = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

var realDefineProp = (function () {
    try { return !!Object.defineProperty({}, 'a', {}); }
    catch (e) { return false; }
})();

var es3 = !realDefineProp && !Object.prototype.__defineGetter__;

var defineProperty = realDefineProp ? Object.defineProperty :
        function (obj, name, desc) {

    if ('get' in desc && obj.__defineGetter__) {
        obj.__defineGetter__(name, desc.get);
    } else if (!hop.call(obj, name) || 'value' in desc) {
        obj[name] = desc.value;
    }
};

var objCreate = Object.create || function (proto, props) {
    var obj, k;

    function F() {}
    F.prototype = proto;
    obj = new F();

    for (k in props) {
        if (hop.call(props, k)) {
            defineProperty(obj, k, props[k]);
        }
    }

    return obj;
};

var arrIndexOf = Array.prototype.indexOf || function (search, fromIndex) {
    /*jshint validthis:true */
    var arr = this;
    if (!arr.length) {
        return -1;
    }

    for (var i = fromIndex || 0, max = arr.length; i < max; i++) {
        if (arr[i] === search) {
            return i;
        }
    }

    return -1;
};

var isArray = Array.isArray || function (obj) {
    return toString.call(obj) === '[object Array]';
};

var dateNow = Date.now || function () {
    return new Date().getTime();
};
exports.defineProperty = defineProperty, exports.objCreate = objCreate, exports.arrIndexOf = arrIndexOf, exports.isArray = isArray, exports.dateNow = dateNow;


},{}],27:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./core":23,"./en":25,"dup":18}],28:[function(require,module,exports){
/**!

 @license
 handlebars v4.0.13

Copyright (C) 2011-2017 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
!function(a,b){"object"==typeof exports&&"object"==typeof module?module.exports=b():"function"==typeof define&&define.amd?define([],b):"object"==typeof exports?exports.Handlebars=b():a.Handlebars=b()}(this,function(){return function(a){function b(d){if(c[d])return c[d].exports;var e=c[d]={exports:{},id:d,loaded:!1};return a[d].call(e.exports,e,e.exports,b),e.loaded=!0,e.exports}var c={};return b.m=a,b.c=c,b.p="",b(0)}([function(a,b,c){"use strict";function d(){var a=r();return a.compile=function(b,c){return k.compile(b,c,a)},a.precompile=function(b,c){return k.precompile(b,c,a)},a.AST=i["default"],a.Compiler=k.Compiler,a.JavaScriptCompiler=m["default"],a.Parser=j.parser,a.parse=j.parse,a}var e=c(1)["default"];b.__esModule=!0;var f=c(2),g=e(f),h=c(35),i=e(h),j=c(36),k=c(41),l=c(42),m=e(l),n=c(39),o=e(n),p=c(34),q=e(p),r=g["default"].create,s=d();s.create=d,q["default"](s),s.Visitor=o["default"],s["default"]=s,b["default"]=s,a.exports=b["default"]},function(a,b){"use strict";b["default"]=function(a){return a&&a.__esModule?a:{"default":a}},b.__esModule=!0},function(a,b,c){"use strict";function d(){var a=new h.HandlebarsEnvironment;return n.extend(a,h),a.SafeString=j["default"],a.Exception=l["default"],a.Utils=n,a.escapeExpression=n.escapeExpression,a.VM=p,a.template=function(b){return p.template(b,a)},a}var e=c(3)["default"],f=c(1)["default"];b.__esModule=!0;var g=c(4),h=e(g),i=c(21),j=f(i),k=c(6),l=f(k),m=c(5),n=e(m),o=c(22),p=e(o),q=c(34),r=f(q),s=d();s.create=d,r["default"](s),s["default"]=s,b["default"]=s,a.exports=b["default"]},function(a,b){"use strict";b["default"]=function(a){if(a&&a.__esModule)return a;var b={};if(null!=a)for(var c in a)Object.prototype.hasOwnProperty.call(a,c)&&(b[c]=a[c]);return b["default"]=a,b},b.__esModule=!0},function(a,b,c){"use strict";function d(a,b,c){this.helpers=a||{},this.partials=b||{},this.decorators=c||{},i.registerDefaultHelpers(this),j.registerDefaultDecorators(this)}var e=c(1)["default"];b.__esModule=!0,b.HandlebarsEnvironment=d;var f=c(5),g=c(6),h=e(g),i=c(10),j=c(18),k=c(20),l=e(k),m="4.0.13";b.VERSION=m;var n=7;b.COMPILER_REVISION=n;var o={1:"<= 1.0.rc.2",2:"== 1.0.0-rc.3",3:"== 1.0.0-rc.4",4:"== 1.x.x",5:"== 2.0.0-alpha.x",6:">= 2.0.0-beta.1",7:">= 4.0.0"};b.REVISION_CHANGES=o;var p="[object Object]";d.prototype={constructor:d,logger:l["default"],log:l["default"].log,registerHelper:function(a,b){if(f.toString.call(a)===p){if(b)throw new h["default"]("Arg not supported with multiple helpers");f.extend(this.helpers,a)}else this.helpers[a]=b},unregisterHelper:function(a){delete this.helpers[a]},registerPartial:function(a,b){if(f.toString.call(a)===p)f.extend(this.partials,a);else{if("undefined"==typeof b)throw new h["default"]('Attempting to register a partial called "'+a+'" as undefined');this.partials[a]=b}},unregisterPartial:function(a){delete this.partials[a]},registerDecorator:function(a,b){if(f.toString.call(a)===p){if(b)throw new h["default"]("Arg not supported with multiple decorators");f.extend(this.decorators,a)}else this.decorators[a]=b},unregisterDecorator:function(a){delete this.decorators[a]}};var q=l["default"].log;b.log=q,b.createFrame=f.createFrame,b.logger=l["default"]},function(a,b){"use strict";function c(a){return k[a]}function d(a){for(var b=1;b<arguments.length;b++)for(var c in arguments[b])Object.prototype.hasOwnProperty.call(arguments[b],c)&&(a[c]=arguments[b][c]);return a}function e(a,b){for(var c=0,d=a.length;c<d;c++)if(a[c]===b)return c;return-1}function f(a){if("string"!=typeof a){if(a&&a.toHTML)return a.toHTML();if(null==a)return"";if(!a)return a+"";a=""+a}return m.test(a)?a.replace(l,c):a}function g(a){return!a&&0!==a||!(!p(a)||0!==a.length)}function h(a){var b=d({},a);return b._parent=a,b}function i(a,b){return a.path=b,a}function j(a,b){return(a?a+".":"")+b}b.__esModule=!0,b.extend=d,b.indexOf=e,b.escapeExpression=f,b.isEmpty=g,b.createFrame=h,b.blockParams=i,b.appendContextPath=j;var k={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;","=":"&#x3D;"},l=/[&<>"'`=]/g,m=/[&<>"'`=]/,n=Object.prototype.toString;b.toString=n;var o=function(a){return"function"==typeof a};o(/x/)&&(b.isFunction=o=function(a){return"function"==typeof a&&"[object Function]"===n.call(a)}),b.isFunction=o;var p=Array.isArray||function(a){return!(!a||"object"!=typeof a)&&"[object Array]"===n.call(a)};b.isArray=p},function(a,b,c){"use strict";function d(a,b){var c=b&&b.loc,g=void 0,h=void 0;c&&(g=c.start.line,h=c.start.column,a+=" - "+g+":"+h);for(var i=Error.prototype.constructor.call(this,a),j=0;j<f.length;j++)this[f[j]]=i[f[j]];Error.captureStackTrace&&Error.captureStackTrace(this,d);try{c&&(this.lineNumber=g,e?Object.defineProperty(this,"column",{value:h,enumerable:!0}):this.column=h)}catch(k){}}var e=c(7)["default"];b.__esModule=!0;var f=["description","fileName","lineNumber","message","name","number","stack"];d.prototype=new Error,b["default"]=d,a.exports=b["default"]},function(a,b,c){a.exports={"default":c(8),__esModule:!0}},function(a,b,c){var d=c(9);a.exports=function(a,b,c){return d.setDesc(a,b,c)}},function(a,b){var c=Object;a.exports={create:c.create,getProto:c.getPrototypeOf,isEnum:{}.propertyIsEnumerable,getDesc:c.getOwnPropertyDescriptor,setDesc:c.defineProperty,setDescs:c.defineProperties,getKeys:c.keys,getNames:c.getOwnPropertyNames,getSymbols:c.getOwnPropertySymbols,each:[].forEach}},function(a,b,c){"use strict";function d(a){g["default"](a),i["default"](a),k["default"](a),m["default"](a),o["default"](a),q["default"](a),s["default"](a)}var e=c(1)["default"];b.__esModule=!0,b.registerDefaultHelpers=d;var f=c(11),g=e(f),h=c(12),i=e(h),j=c(13),k=e(j),l=c(14),m=e(l),n=c(15),o=e(n),p=c(16),q=e(p),r=c(17),s=e(r)},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5);b["default"]=function(a){a.registerHelper("blockHelperMissing",function(b,c){var e=c.inverse,f=c.fn;if(b===!0)return f(this);if(b===!1||null==b)return e(this);if(d.isArray(b))return b.length>0?(c.ids&&(c.ids=[c.name]),a.helpers.each(b,c)):e(this);if(c.data&&c.ids){var g=d.createFrame(c.data);g.contextPath=d.appendContextPath(c.data.contextPath,c.name),c={data:g}}return f(b,c)})},a.exports=b["default"]},function(a,b,c){"use strict";var d=c(1)["default"];b.__esModule=!0;var e=c(5),f=c(6),g=d(f);b["default"]=function(a){a.registerHelper("each",function(a,b){function c(b,c,f){j&&(j.key=b,j.index=c,j.first=0===c,j.last=!!f,k&&(j.contextPath=k+b)),i+=d(a[b],{data:j,blockParams:e.blockParams([a[b],b],[k+b,null])})}if(!b)throw new g["default"]("Must pass iterator to #each");var d=b.fn,f=b.inverse,h=0,i="",j=void 0,k=void 0;if(b.data&&b.ids&&(k=e.appendContextPath(b.data.contextPath,b.ids[0])+"."),e.isFunction(a)&&(a=a.call(this)),b.data&&(j=e.createFrame(b.data)),a&&"object"==typeof a)if(e.isArray(a))for(var l=a.length;h<l;h++)h in a&&c(h,h,h===a.length-1);else{var m=void 0;for(var n in a)a.hasOwnProperty(n)&&(void 0!==m&&c(m,h-1),m=n,h++);void 0!==m&&c(m,h-1,!0)}return 0===h&&(i=f(this)),i})},a.exports=b["default"]},function(a,b,c){"use strict";var d=c(1)["default"];b.__esModule=!0;var e=c(6),f=d(e);b["default"]=function(a){a.registerHelper("helperMissing",function(){if(1!==arguments.length)throw new f["default"]('Missing helper: "'+arguments[arguments.length-1].name+'"')})},a.exports=b["default"]},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5);b["default"]=function(a){a.registerHelper("if",function(a,b){return d.isFunction(a)&&(a=a.call(this)),!b.hash.includeZero&&!a||d.isEmpty(a)?b.inverse(this):b.fn(this)}),a.registerHelper("unless",function(b,c){return a.helpers["if"].call(this,b,{fn:c.inverse,inverse:c.fn,hash:c.hash})})},a.exports=b["default"]},function(a,b){"use strict";b.__esModule=!0,b["default"]=function(a){a.registerHelper("log",function(){for(var b=[void 0],c=arguments[arguments.length-1],d=0;d<arguments.length-1;d++)b.push(arguments[d]);var e=1;null!=c.hash.level?e=c.hash.level:c.data&&null!=c.data.level&&(e=c.data.level),b[0]=e,a.log.apply(a,b)})},a.exports=b["default"]},function(a,b){"use strict";b.__esModule=!0,b["default"]=function(a){a.registerHelper("lookup",function(a,b){return a&&a[b]})},a.exports=b["default"]},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5);b["default"]=function(a){a.registerHelper("with",function(a,b){d.isFunction(a)&&(a=a.call(this));var c=b.fn;if(d.isEmpty(a))return b.inverse(this);var e=b.data;return b.data&&b.ids&&(e=d.createFrame(b.data),e.contextPath=d.appendContextPath(b.data.contextPath,b.ids[0])),c(a,{data:e,blockParams:d.blockParams([a],[e&&e.contextPath])})})},a.exports=b["default"]},function(a,b,c){"use strict";function d(a){g["default"](a)}var e=c(1)["default"];b.__esModule=!0,b.registerDefaultDecorators=d;var f=c(19),g=e(f)},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5);b["default"]=function(a){a.registerDecorator("inline",function(a,b,c,e){var f=a;return b.partials||(b.partials={},f=function(e,f){var g=c.partials;c.partials=d.extend({},g,b.partials);var h=a(e,f);return c.partials=g,h}),b.partials[e.args[0]]=e.fn,f})},a.exports=b["default"]},function(a,b,c){"use strict";b.__esModule=!0;var d=c(5),e={methodMap:["debug","info","warn","error"],level:"info",lookupLevel:function(a){if("string"==typeof a){var b=d.indexOf(e.methodMap,a.toLowerCase());a=b>=0?b:parseInt(a,10)}return a},log:function(a){if(a=e.lookupLevel(a),"undefined"!=typeof console&&e.lookupLevel(e.level)<=a){var b=e.methodMap[a];console[b]||(b="log");for(var c=arguments.length,d=Array(c>1?c-1:0),f=1;f<c;f++)d[f-1]=arguments[f];console[b].apply(console,d)}}};b["default"]=e,a.exports=b["default"]},function(a,b){"use strict";function c(a){this.string=a}b.__esModule=!0,c.prototype.toString=c.prototype.toHTML=function(){return""+this.string},b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(a){var b=a&&a[0]||1,c=s.COMPILER_REVISION;if(b!==c){if(b<c){var d=s.REVISION_CHANGES[c],e=s.REVISION_CHANGES[b];throw new r["default"]("Template was precompiled with an older version of Handlebars than the current runtime. Please update your precompiler to a newer version ("+d+") or downgrade your runtime to an older version ("+e+").")}throw new r["default"]("Template was precompiled with a newer version of Handlebars than the current runtime. Please update your runtime to a newer version ("+a[1]+").")}}function e(a,b){function c(c,d,e){e.hash&&(d=p.extend({},d,e.hash),e.ids&&(e.ids[0]=!0)),c=b.VM.resolvePartial.call(this,c,d,e);var f=b.VM.invokePartial.call(this,c,d,e);if(null==f&&b.compile&&(e.partials[e.name]=b.compile(c,a.compilerOptions,b),f=e.partials[e.name](d,e)),null!=f){if(e.indent){for(var g=f.split("\n"),h=0,i=g.length;h<i&&(g[h]||h+1!==i);h++)g[h]=e.indent+g[h];f=g.join("\n")}return f}throw new r["default"]("The partial "+e.name+" could not be compiled when running in runtime-only mode")}function d(b){function c(b){return""+a.main(e,b,e.helpers,e.partials,g,i,h)}var f=arguments.length<=1||void 0===arguments[1]?{}:arguments[1],g=f.data;d._setup(f),!f.partial&&a.useData&&(g=j(b,g));var h=void 0,i=a.useBlockParams?[]:void 0;return a.useDepths&&(h=f.depths?b!=f.depths[0]?[b].concat(f.depths):f.depths:[b]),(c=k(a.main,c,e,f.depths||[],g,i))(b,f)}if(!b)throw new r["default"]("No environment passed to template");if(!a||!a.main)throw new r["default"]("Unknown template object: "+typeof a);a.main.decorator=a.main_d,b.VM.checkRevision(a.compiler);var e={strict:function(a,b){if(!(b in a))throw new r["default"]('"'+b+'" not defined in '+a);return a[b]},lookup:function(a,b){for(var c=a.length,d=0;d<c;d++)if(a[d]&&null!=a[d][b])return a[d][b]},lambda:function(a,b){return"function"==typeof a?a.call(b):a},escapeExpression:p.escapeExpression,invokePartial:c,fn:function(b){var c=a[b];return c.decorator=a[b+"_d"],c},programs:[],program:function(a,b,c,d,e){var g=this.programs[a],h=this.fn(a);return b||e||d||c?g=f(this,a,h,b,c,d,e):g||(g=this.programs[a]=f(this,a,h)),g},data:function(a,b){for(;a&&b--;)a=a._parent;return a},merge:function(a,b){var c=a||b;return a&&b&&a!==b&&(c=p.extend({},b,a)),c},nullContext:l({}),noop:b.VM.noop,compilerInfo:a.compiler};return d.isTop=!0,d._setup=function(c){c.partial?(e.helpers=c.helpers,e.partials=c.partials,e.decorators=c.decorators):(e.helpers=e.merge(c.helpers,b.helpers),a.usePartial&&(e.partials=e.merge(c.partials,b.partials)),(a.usePartial||a.useDecorators)&&(e.decorators=e.merge(c.decorators,b.decorators)))},d._child=function(b,c,d,g){if(a.useBlockParams&&!d)throw new r["default"]("must pass block params");if(a.useDepths&&!g)throw new r["default"]("must pass parent depths");return f(e,b,a[b],c,0,d,g)},d}function f(a,b,c,d,e,f,g){function h(b){var e=arguments.length<=1||void 0===arguments[1]?{}:arguments[1],h=g;return!g||b==g[0]||b===a.nullContext&&null===g[0]||(h=[b].concat(g)),c(a,b,a.helpers,a.partials,e.data||d,f&&[e.blockParams].concat(f),h)}return h=k(c,h,a,g,d,f),h.program=b,h.depth=g?g.length:0,h.blockParams=e||0,h}function g(a,b,c){return a?a.call||c.name||(c.name=a,a=c.partials[a]):a="@partial-block"===c.name?c.data["partial-block"]:c.partials[c.name],a}function h(a,b,c){var d=c.data&&c.data["partial-block"];c.partial=!0,c.ids&&(c.data.contextPath=c.ids[0]||c.data.contextPath);var e=void 0;if(c.fn&&c.fn!==i&&!function(){c.data=s.createFrame(c.data);var a=c.fn;e=c.data["partial-block"]=function(b){var c=arguments.length<=1||void 0===arguments[1]?{}:arguments[1];return c.data=s.createFrame(c.data),c.data["partial-block"]=d,a(b,c)},a.partials&&(c.partials=p.extend({},c.partials,a.partials))}(),void 0===a&&e&&(a=e),void 0===a)throw new r["default"]("The partial "+c.name+" could not be found");if(a instanceof Function)return a(b,c)}function i(){return""}function j(a,b){return b&&"root"in b||(b=b?s.createFrame(b):{},b.root=a),b}function k(a,b,c,d,e,f){if(a.decorator){var g={};b=a.decorator(b,g,c,d&&d[0],e,f,d),p.extend(b,g)}return b}var l=c(23)["default"],m=c(3)["default"],n=c(1)["default"];b.__esModule=!0,b.checkRevision=d,b.template=e,b.wrapProgram=f,b.resolvePartial=g,b.invokePartial=h,b.noop=i;var o=c(5),p=m(o),q=c(6),r=n(q),s=c(4)},function(a,b,c){a.exports={"default":c(24),__esModule:!0}},function(a,b,c){c(25),a.exports=c(30).Object.seal},function(a,b,c){var d=c(26);c(27)("seal",function(a){return function(b){return a&&d(b)?a(b):b}})},function(a,b){a.exports=function(a){return"object"==typeof a?null!==a:"function"==typeof a}},function(a,b,c){var d=c(28),e=c(30),f=c(33);a.exports=function(a,b){var c=(e.Object||{})[a]||Object[a],g={};g[a]=b(c),d(d.S+d.F*f(function(){c(1)}),"Object",g)}},function(a,b,c){var d=c(29),e=c(30),f=c(31),g="prototype",h=function(a,b,c){var i,j,k,l=a&h.F,m=a&h.G,n=a&h.S,o=a&h.P,p=a&h.B,q=a&h.W,r=m?e:e[b]||(e[b]={}),s=m?d:n?d[b]:(d[b]||{})[g];m&&(c=b);for(i in c)j=!l&&s&&i in s,j&&i in r||(k=j?s[i]:c[i],r[i]=m&&"function"!=typeof s[i]?c[i]:p&&j?f(k,d):q&&s[i]==k?function(a){var b=function(b){return this instanceof a?new a(b):a(b)};return b[g]=a[g],b}(k):o&&"function"==typeof k?f(Function.call,k):k,o&&((r[g]||(r[g]={}))[i]=k))};h.F=1,h.G=2,h.S=4,h.P=8,h.B=16,h.W=32,a.exports=h},function(a,b){var c=a.exports="undefined"!=typeof window&&window.Math==Math?window:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")();"number"==typeof __g&&(__g=c)},function(a,b){var c=a.exports={version:"1.2.6"};"number"==typeof __e&&(__e=c)},function(a,b,c){var d=c(32);a.exports=function(a,b,c){if(d(a),void 0===b)return a;switch(c){case 1:return function(c){return a.call(b,c)};case 2:return function(c,d){return a.call(b,c,d)};case 3:return function(c,d,e){return a.call(b,c,d,e)}}return function(){return a.apply(b,arguments)}}},function(a,b){a.exports=function(a){if("function"!=typeof a)throw TypeError(a+" is not a function!");return a}},function(a,b){a.exports=function(a){try{return!!a()}catch(b){return!0}}},function(a,b){(function(c){"use strict";b.__esModule=!0,b["default"]=function(a){var b="undefined"!=typeof c?c:window,d=b.Handlebars;a.noConflict=function(){return b.Handlebars===a&&(b.Handlebars=d),a}},a.exports=b["default"]}).call(b,function(){return this}())},function(a,b){"use strict";b.__esModule=!0;var c={helpers:{helperExpression:function(a){return"SubExpression"===a.type||("MustacheStatement"===a.type||"BlockStatement"===a.type)&&!!(a.params&&a.params.length||a.hash)},scopedId:function(a){return/^\.|this\b/.test(a.original)},simpleId:function(a){return 1===a.parts.length&&!c.helpers.scopedId(a)&&!a.depth}}};b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(a,b){if("Program"===a.type)return a;h["default"].yy=n,n.locInfo=function(a){return new n.SourceLocation(b&&b.srcName,a)};var c=new j["default"](b);return c.accept(h["default"].parse(a))}var e=c(1)["default"],f=c(3)["default"];b.__esModule=!0,b.parse=d;var g=c(37),h=e(g),i=c(38),j=e(i),k=c(40),l=f(k),m=c(5);b.parser=h["default"];var n={};m.extend(n,l)},function(a,b){"use strict";b.__esModule=!0;var c=function(){function a(){this.yy={}}var b={trace:function(){},yy:{},symbols_:{error:2,root:3,program:4,EOF:5,program_repetition0:6,statement:7,mustache:8,block:9,rawBlock:10,partial:11,partialBlock:12,content:13,COMMENT:14,CONTENT:15,openRawBlock:16,rawBlock_repetition_plus0:17,END_RAW_BLOCK:18,OPEN_RAW_BLOCK:19,helperName:20,openRawBlock_repetition0:21,openRawBlock_option0:22,CLOSE_RAW_BLOCK:23,openBlock:24,block_option0:25,closeBlock:26,openInverse:27,block_option1:28,OPEN_BLOCK:29,openBlock_repetition0:30,openBlock_option0:31,openBlock_option1:32,CLOSE:33,OPEN_INVERSE:34,openInverse_repetition0:35,openInverse_option0:36,openInverse_option1:37,openInverseChain:38,OPEN_INVERSE_CHAIN:39,openInverseChain_repetition0:40,openInverseChain_option0:41,openInverseChain_option1:42,inverseAndProgram:43,INVERSE:44,inverseChain:45,inverseChain_option0:46,OPEN_ENDBLOCK:47,OPEN:48,mustache_repetition0:49,mustache_option0:50,OPEN_UNESCAPED:51,mustache_repetition1:52,mustache_option1:53,CLOSE_UNESCAPED:54,OPEN_PARTIAL:55,partialName:56,partial_repetition0:57,partial_option0:58,openPartialBlock:59,OPEN_PARTIAL_BLOCK:60,openPartialBlock_repetition0:61,openPartialBlock_option0:62,param:63,sexpr:64,OPEN_SEXPR:65,sexpr_repetition0:66,sexpr_option0:67,CLOSE_SEXPR:68,hash:69,hash_repetition_plus0:70,hashSegment:71,ID:72,EQUALS:73,blockParams:74,OPEN_BLOCK_PARAMS:75,blockParams_repetition_plus0:76,CLOSE_BLOCK_PARAMS:77,path:78,dataName:79,STRING:80,NUMBER:81,BOOLEAN:82,UNDEFINED:83,NULL:84,DATA:85,pathSegments:86,SEP:87,$accept:0,$end:1},terminals_:{2:"error",5:"EOF",14:"COMMENT",15:"CONTENT",18:"END_RAW_BLOCK",19:"OPEN_RAW_BLOCK",23:"CLOSE_RAW_BLOCK",29:"OPEN_BLOCK",33:"CLOSE",34:"OPEN_INVERSE",39:"OPEN_INVERSE_CHAIN",44:"INVERSE",47:"OPEN_ENDBLOCK",48:"OPEN",51:"OPEN_UNESCAPED",54:"CLOSE_UNESCAPED",55:"OPEN_PARTIAL",60:"OPEN_PARTIAL_BLOCK",65:"OPEN_SEXPR",68:"CLOSE_SEXPR",72:"ID",73:"EQUALS",75:"OPEN_BLOCK_PARAMS",77:"CLOSE_BLOCK_PARAMS",80:"STRING",81:"NUMBER",82:"BOOLEAN",83:"UNDEFINED",84:"NULL",85:"DATA",87:"SEP"},productions_:[0,[3,2],[4,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[7,1],[13,1],[10,3],[16,5],[9,4],[9,4],[24,6],[27,6],[38,6],[43,2],[45,3],[45,1],[26,3],[8,5],[8,5],[11,5],[12,3],[59,5],[63,1],[63,1],[64,5],[69,1],[71,3],[74,3],[20,1],[20,1],[20,1],[20,1],[20,1],[20,1],[20,1],[56,1],[56,1],[79,2],[78,1],[86,3],[86,1],[6,0],[6,2],[17,1],[17,2],[21,0],[21,2],[22,0],[22,1],[25,0],[25,1],[28,0],[28,1],[30,0],[30,2],[31,0],[31,1],[32,0],[32,1],[35,0],[35,2],[36,0],[36,1],[37,0],[37,1],[40,0],[40,2],[41,0],[41,1],[42,0],[42,1],[46,0],[46,1],[49,0],[49,2],[50,0],[50,1],[52,0],[52,2],[53,0],[53,1],[57,0],[57,2],[58,0],[58,1],[61,0],[61,2],[62,0],[62,1],[66,0],[66,2],[67,0],[67,1],[70,1],[70,2],[76,1],[76,2]],performAction:function(a,b,c,d,e,f,g){var h=f.length-1;switch(e){case 1:return f[h-1];case 2:this.$=d.prepareProgram(f[h]);break;case 3:this.$=f[h];break;case 4:this.$=f[h];break;case 5:this.$=f[h];break;case 6:this.$=f[h];break;case 7:this.$=f[h];break;case 8:this.$=f[h];break;case 9:this.$={type:"CommentStatement",value:d.stripComment(f[h]),strip:d.stripFlags(f[h],f[h]),loc:d.locInfo(this._$)};break;case 10:this.$={type:"ContentStatement",original:f[h],value:f[h],loc:d.locInfo(this._$)};break;case 11:this.$=d.prepareRawBlock(f[h-2],f[h-1],f[h],this._$);break;case 12:this.$={path:f[h-3],params:f[h-2],hash:f[h-1]};break;case 13:this.$=d.prepareBlock(f[h-3],f[h-2],f[h-1],f[h],!1,this._$);break;case 14:this.$=d.prepareBlock(f[h-3],f[h-2],f[h-1],f[h],!0,this._$);break;case 15:this.$={open:f[h-5],path:f[h-4],params:f[h-3],hash:f[h-2],blockParams:f[h-1],strip:d.stripFlags(f[h-5],f[h])};break;case 16:this.$={path:f[h-4],params:f[h-3],hash:f[h-2],blockParams:f[h-1],strip:d.stripFlags(f[h-5],f[h])};break;case 17:this.$={path:f[h-4],params:f[h-3],hash:f[h-2],blockParams:f[h-1],strip:d.stripFlags(f[h-5],f[h])};break;case 18:this.$={strip:d.stripFlags(f[h-1],f[h-1]),program:f[h]};break;case 19:var i=d.prepareBlock(f[h-2],f[h-1],f[h],f[h],!1,this._$),j=d.prepareProgram([i],f[h-1].loc);j.chained=!0,this.$={strip:f[h-2].strip,program:j,chain:!0};break;case 20:this.$=f[h];break;case 21:this.$={path:f[h-1],strip:d.stripFlags(f[h-2],f[h])};break;case 22:this.$=d.prepareMustache(f[h-3],f[h-2],f[h-1],f[h-4],d.stripFlags(f[h-4],f[h]),this._$);break;case 23:this.$=d.prepareMustache(f[h-3],f[h-2],f[h-1],f[h-4],d.stripFlags(f[h-4],f[h]),this._$);break;case 24:this.$={type:"PartialStatement",name:f[h-3],params:f[h-2],hash:f[h-1],indent:"",strip:d.stripFlags(f[h-4],f[h]),loc:d.locInfo(this._$)};break;case 25:this.$=d.preparePartialBlock(f[h-2],f[h-1],f[h],this._$);break;case 26:this.$={path:f[h-3],params:f[h-2],hash:f[h-1],strip:d.stripFlags(f[h-4],f[h])};break;case 27:this.$=f[h];break;case 28:this.$=f[h];break;case 29:this.$={type:"SubExpression",path:f[h-3],params:f[h-2],hash:f[h-1],loc:d.locInfo(this._$)};break;case 30:this.$={type:"Hash",pairs:f[h],loc:d.locInfo(this._$)};break;case 31:this.$={type:"HashPair",key:d.id(f[h-2]),value:f[h],loc:d.locInfo(this._$)};break;case 32:this.$=d.id(f[h-1]);break;case 33:this.$=f[h];break;case 34:this.$=f[h];break;case 35:this.$={type:"StringLiteral",value:f[h],original:f[h],loc:d.locInfo(this._$)};break;case 36:this.$={type:"NumberLiteral",value:Number(f[h]),original:Number(f[h]),loc:d.locInfo(this._$)};break;case 37:this.$={type:"BooleanLiteral",value:"true"===f[h],original:"true"===f[h],loc:d.locInfo(this._$)};break;case 38:this.$={type:"UndefinedLiteral",original:void 0,value:void 0,loc:d.locInfo(this._$)};break;case 39:this.$={type:"NullLiteral",original:null,value:null,loc:d.locInfo(this._$)};break;case 40:this.$=f[h];break;case 41:this.$=f[h];break;case 42:this.$=d.preparePath(!0,f[h],this._$);break;case 43:this.$=d.preparePath(!1,f[h],this._$);break;case 44:f[h-2].push({part:d.id(f[h]),original:f[h],separator:f[h-1]}),this.$=f[h-2];break;case 45:this.$=[{part:d.id(f[h]),original:f[h]}];break;case 46:this.$=[];break;case 47:f[h-1].push(f[h]);break;case 48:this.$=[f[h]];break;case 49:f[h-1].push(f[h]);break;case 50:this.$=[];break;case 51:f[h-1].push(f[h]);break;case 58:this.$=[];break;case 59:f[h-1].push(f[h]);break;case 64:this.$=[];break;case 65:f[h-1].push(f[h]);break;case 70:this.$=[];break;case 71:f[h-1].push(f[h]);break;case 78:this.$=[];break;case 79:f[h-1].push(f[h]);break;case 82:this.$=[];break;case 83:f[h-1].push(f[h]);break;case 86:this.$=[];break;case 87:f[h-1].push(f[h]);break;case 90:this.$=[];break;case 91:f[h-1].push(f[h]);break;case 94:this.$=[];break;case 95:f[h-1].push(f[h]);break;case 98:this.$=[f[h]];break;case 99:f[h-1].push(f[h]);break;case 100:this.$=[f[h]];break;case 101:f[h-1].push(f[h])}},table:[{3:1,4:2,5:[2,46],6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{1:[3]},{5:[1,4]},{5:[2,2],7:5,8:6,9:7,10:8,11:9,12:10,13:11,14:[1,12],15:[1,20],16:17,19:[1,23],24:15,27:16,29:[1,21],34:[1,22],39:[2,2],44:[2,2],47:[2,2],48:[1,13],51:[1,14],55:[1,18],59:19,60:[1,24]},{1:[2,1]},{5:[2,47],14:[2,47],15:[2,47],19:[2,47],29:[2,47],34:[2,47],39:[2,47],44:[2,47],47:[2,47],48:[2,47],51:[2,47],55:[2,47],60:[2,47]},{5:[2,3],14:[2,3],15:[2,3],19:[2,3],29:[2,3],34:[2,3],39:[2,3],44:[2,3],47:[2,3],48:[2,3],51:[2,3],55:[2,3],60:[2,3]},{5:[2,4],14:[2,4],15:[2,4],19:[2,4],29:[2,4],34:[2,4],39:[2,4],44:[2,4],47:[2,4],48:[2,4],51:[2,4],55:[2,4],60:[2,4]},{5:[2,5],14:[2,5],15:[2,5],19:[2,5],29:[2,5],34:[2,5],39:[2,5],44:[2,5],47:[2,5],48:[2,5],51:[2,5],55:[2,5],60:[2,5]},{5:[2,6],14:[2,6],15:[2,6],19:[2,6],29:[2,6],34:[2,6],39:[2,6],44:[2,6],47:[2,6],48:[2,6],51:[2,6],55:[2,6],60:[2,6]},{5:[2,7],14:[2,7],15:[2,7],19:[2,7],29:[2,7],34:[2,7],39:[2,7],44:[2,7],47:[2,7],48:[2,7],51:[2,7],55:[2,7],60:[2,7]},{5:[2,8],14:[2,8],15:[2,8],19:[2,8],29:[2,8],34:[2,8],39:[2,8],44:[2,8],47:[2,8],48:[2,8],51:[2,8],55:[2,8],60:[2,8]},{5:[2,9],14:[2,9],15:[2,9],19:[2,9],29:[2,9],34:[2,9],39:[2,9],44:[2,9],47:[2,9],48:[2,9],51:[2,9],55:[2,9],60:[2,9]},{20:25,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:36,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{4:37,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],39:[2,46],44:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{4:38,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],44:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{13:40,15:[1,20],17:39},{20:42,56:41,64:43,65:[1,44],72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{4:45,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{5:[2,10],14:[2,10],15:[2,10],18:[2,10],19:[2,10],29:[2,10],34:[2,10],39:[2,10],44:[2,10],47:[2,10],48:[2,10],51:[2,10],55:[2,10],60:[2,10]},{20:46,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:47,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:48,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:42,56:49,64:43,65:[1,44],72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{33:[2,78],49:50,65:[2,78],72:[2,78],80:[2,78],81:[2,78],82:[2,78],83:[2,78],84:[2,78],85:[2,78]},{23:[2,33],33:[2,33],54:[2,33],65:[2,33],68:[2,33],72:[2,33],75:[2,33],80:[2,33],81:[2,33],82:[2,33],83:[2,33],84:[2,33],85:[2,33]},{23:[2,34],33:[2,34],54:[2,34],65:[2,34],68:[2,34],72:[2,34],75:[2,34],80:[2,34],81:[2,34],82:[2,34],83:[2,34],84:[2,34],85:[2,34]},{23:[2,35],33:[2,35],54:[2,35],65:[2,35],68:[2,35],72:[2,35],75:[2,35],80:[2,35],81:[2,35],82:[2,35],83:[2,35],84:[2,35],85:[2,35]},{23:[2,36],33:[2,36],54:[2,36],65:[2,36],68:[2,36],72:[2,36],75:[2,36],80:[2,36],81:[2,36],82:[2,36],83:[2,36],84:[2,36],85:[2,36]},{23:[2,37],33:[2,37],54:[2,37],65:[2,37],68:[2,37],72:[2,37],75:[2,37],80:[2,37],81:[2,37],82:[2,37],83:[2,37],84:[2,37],85:[2,37]},{23:[2,38],33:[2,38],54:[2,38],65:[2,38],68:[2,38],72:[2,38],75:[2,38],80:[2,38],81:[2,38],82:[2,38],83:[2,38],84:[2,38],85:[2,38]},{23:[2,39],33:[2,39],54:[2,39],65:[2,39],68:[2,39],72:[2,39],75:[2,39],80:[2,39],81:[2,39],82:[2,39],83:[2,39],84:[2,39],85:[2,39]},{23:[2,43],33:[2,43],54:[2,43],65:[2,43],68:[2,43],72:[2,43],75:[2,43],80:[2,43],81:[2,43],82:[2,43],83:[2,43],84:[2,43],85:[2,43],87:[1,51]},{72:[1,35],86:52},{23:[2,45],33:[2,45],54:[2,45],65:[2,45],68:[2,45],72:[2,45],75:[2,45],80:[2,45],81:[2,45],82:[2,45],83:[2,45],84:[2,45],85:[2,45],87:[2,45]},{52:53,54:[2,82],65:[2,82],72:[2,82],80:[2,82],81:[2,82],82:[2,82],83:[2,82],84:[2,82],85:[2,82]},{25:54,38:56,39:[1,58],43:57,44:[1,59],45:55,47:[2,54]},{28:60,43:61,44:[1,59],47:[2,56]},{13:63,15:[1,20],18:[1,62]},{15:[2,48],18:[2,48]},{33:[2,86],57:64,65:[2,86],72:[2,86],80:[2,86],81:[2,86],82:[2,86],83:[2,86],84:[2,86],85:[2,86]},{33:[2,40],65:[2,40],72:[2,40],80:[2,40],81:[2,40],82:[2,40],83:[2,40],84:[2,40],85:[2,40]},{33:[2,41],65:[2,41],72:[2,41],80:[2,41],81:[2,41],82:[2,41],83:[2,41],84:[2,41],85:[2,41]},{20:65,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{26:66,47:[1,67]},{30:68,33:[2,58],65:[2,58],72:[2,58],75:[2,58],80:[2,58],81:[2,58],82:[2,58],83:[2,58],84:[2,58],85:[2,58]},{33:[2,64],35:69,65:[2,64],72:[2,64],75:[2,64],80:[2,64],81:[2,64],82:[2,64],83:[2,64],84:[2,64],85:[2,64]},{21:70,23:[2,50],65:[2,50],72:[2,50],80:[2,50],81:[2,50],82:[2,50],83:[2,50],84:[2,50],85:[2,50]},{33:[2,90],61:71,65:[2,90],72:[2,90],80:[2,90],81:[2,90],82:[2,90],83:[2,90],84:[2,90],85:[2,90]},{20:75,33:[2,80],50:72,63:73,64:76,65:[1,44],69:74,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{72:[1,80]},{23:[2,42],33:[2,42],54:[2,42],65:[2,42],68:[2,42],72:[2,42],75:[2,42],80:[2,42],81:[2,42],82:[2,42],83:[2,42],84:[2,42],85:[2,42],87:[1,51]},{20:75,53:81,54:[2,84],63:82,64:76,65:[1,44],69:83,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{26:84,47:[1,67]},{47:[2,55]},{4:85,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],39:[2,46],44:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{47:[2,20]},{20:86,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{4:87,6:3,14:[2,46],15:[2,46],19:[2,46],29:[2,46],34:[2,46],47:[2,46],48:[2,46],51:[2,46],55:[2,46],60:[2,46]},{26:88,47:[1,67]},{47:[2,57]},{5:[2,11],14:[2,11],15:[2,11],19:[2,11],29:[2,11],34:[2,11],39:[2,11],44:[2,11],47:[2,11],48:[2,11],51:[2,11],55:[2,11],60:[2,11]},{15:[2,49],18:[2,49]},{20:75,33:[2,88],58:89,63:90,64:76,65:[1,44],69:91,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{65:[2,94],66:92,68:[2,94],72:[2,94],80:[2,94],81:[2,94],82:[2,94],83:[2,94],84:[2,94],85:[2,94]},{5:[2,25],14:[2,25],15:[2,25],19:[2,25],29:[2,25],34:[2,25],39:[2,25],44:[2,25],47:[2,25],48:[2,25],51:[2,25],55:[2,25],60:[2,25]},{20:93,72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:75,31:94,33:[2,60],63:95,64:76,65:[1,44],69:96,70:77,71:78,72:[1,79],75:[2,60],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:75,33:[2,66],36:97,63:98,64:76,65:[1,44],69:99,70:77,71:78,72:[1,79],75:[2,66],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:75,22:100,23:[2,52],63:101,64:76,65:[1,44],69:102,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{20:75,33:[2,92],62:103,63:104,64:76,65:[1,44],69:105,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{33:[1,106]},{33:[2,79],65:[2,79],72:[2,79],80:[2,79],81:[2,79],82:[2,79],83:[2,79],84:[2,79],85:[2,79]},{33:[2,81]},{23:[2,27],33:[2,27],54:[2,27],65:[2,27],68:[2,27],72:[2,27],75:[2,27],80:[2,27],81:[2,27],82:[2,27],83:[2,27],84:[2,27],85:[2,27]},{23:[2,28],33:[2,28],54:[2,28],65:[2,28],68:[2,28],72:[2,28],75:[2,28],80:[2,28],81:[2,28],82:[2,28],83:[2,28],84:[2,28],85:[2,28]},{23:[2,30],33:[2,30],54:[2,30],68:[2,30],71:107,72:[1,108],75:[2,30]},{23:[2,98],33:[2,98],54:[2,98],68:[2,98],72:[2,98],75:[2,98]},{23:[2,45],33:[2,45],54:[2,45],65:[2,45],68:[2,45],72:[2,45],73:[1,109],75:[2,45],80:[2,45],81:[2,45],82:[2,45],83:[2,45],84:[2,45],85:[2,45],87:[2,45]},{23:[2,44],33:[2,44],54:[2,44],65:[2,44],68:[2,44],72:[2,44],75:[2,44],80:[2,44],81:[2,44],82:[2,44],83:[2,44],84:[2,44],85:[2,44],87:[2,44]},{54:[1,110]},{54:[2,83],65:[2,83],72:[2,83],80:[2,83],81:[2,83],82:[2,83],83:[2,83],84:[2,83],85:[2,83]},{54:[2,85]},{5:[2,13],14:[2,13],15:[2,13],19:[2,13],29:[2,13],34:[2,13],39:[2,13],44:[2,13],47:[2,13],48:[2,13],51:[2,13],55:[2,13],60:[2,13]},{38:56,39:[1,58],43:57,44:[1,59],45:112,46:111,47:[2,76]},{33:[2,70],40:113,65:[2,70],72:[2,70],75:[2,70],80:[2,70],81:[2,70],82:[2,70],83:[2,70],84:[2,70],85:[2,70]},{47:[2,18]},{5:[2,14],14:[2,14],15:[2,14],19:[2,14],29:[2,14],34:[2,14],39:[2,14],44:[2,14],47:[2,14],48:[2,14],51:[2,14],55:[2,14],60:[2,14]},{33:[1,114]},{33:[2,87],65:[2,87],72:[2,87],80:[2,87],81:[2,87],82:[2,87],83:[2,87],84:[2,87],
85:[2,87]},{33:[2,89]},{20:75,63:116,64:76,65:[1,44],67:115,68:[2,96],69:117,70:77,71:78,72:[1,79],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{33:[1,118]},{32:119,33:[2,62],74:120,75:[1,121]},{33:[2,59],65:[2,59],72:[2,59],75:[2,59],80:[2,59],81:[2,59],82:[2,59],83:[2,59],84:[2,59],85:[2,59]},{33:[2,61],75:[2,61]},{33:[2,68],37:122,74:123,75:[1,121]},{33:[2,65],65:[2,65],72:[2,65],75:[2,65],80:[2,65],81:[2,65],82:[2,65],83:[2,65],84:[2,65],85:[2,65]},{33:[2,67],75:[2,67]},{23:[1,124]},{23:[2,51],65:[2,51],72:[2,51],80:[2,51],81:[2,51],82:[2,51],83:[2,51],84:[2,51],85:[2,51]},{23:[2,53]},{33:[1,125]},{33:[2,91],65:[2,91],72:[2,91],80:[2,91],81:[2,91],82:[2,91],83:[2,91],84:[2,91],85:[2,91]},{33:[2,93]},{5:[2,22],14:[2,22],15:[2,22],19:[2,22],29:[2,22],34:[2,22],39:[2,22],44:[2,22],47:[2,22],48:[2,22],51:[2,22],55:[2,22],60:[2,22]},{23:[2,99],33:[2,99],54:[2,99],68:[2,99],72:[2,99],75:[2,99]},{73:[1,109]},{20:75,63:126,64:76,65:[1,44],72:[1,35],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{5:[2,23],14:[2,23],15:[2,23],19:[2,23],29:[2,23],34:[2,23],39:[2,23],44:[2,23],47:[2,23],48:[2,23],51:[2,23],55:[2,23],60:[2,23]},{47:[2,19]},{47:[2,77]},{20:75,33:[2,72],41:127,63:128,64:76,65:[1,44],69:129,70:77,71:78,72:[1,79],75:[2,72],78:26,79:27,80:[1,28],81:[1,29],82:[1,30],83:[1,31],84:[1,32],85:[1,34],86:33},{5:[2,24],14:[2,24],15:[2,24],19:[2,24],29:[2,24],34:[2,24],39:[2,24],44:[2,24],47:[2,24],48:[2,24],51:[2,24],55:[2,24],60:[2,24]},{68:[1,130]},{65:[2,95],68:[2,95],72:[2,95],80:[2,95],81:[2,95],82:[2,95],83:[2,95],84:[2,95],85:[2,95]},{68:[2,97]},{5:[2,21],14:[2,21],15:[2,21],19:[2,21],29:[2,21],34:[2,21],39:[2,21],44:[2,21],47:[2,21],48:[2,21],51:[2,21],55:[2,21],60:[2,21]},{33:[1,131]},{33:[2,63]},{72:[1,133],76:132},{33:[1,134]},{33:[2,69]},{15:[2,12]},{14:[2,26],15:[2,26],19:[2,26],29:[2,26],34:[2,26],47:[2,26],48:[2,26],51:[2,26],55:[2,26],60:[2,26]},{23:[2,31],33:[2,31],54:[2,31],68:[2,31],72:[2,31],75:[2,31]},{33:[2,74],42:135,74:136,75:[1,121]},{33:[2,71],65:[2,71],72:[2,71],75:[2,71],80:[2,71],81:[2,71],82:[2,71],83:[2,71],84:[2,71],85:[2,71]},{33:[2,73],75:[2,73]},{23:[2,29],33:[2,29],54:[2,29],65:[2,29],68:[2,29],72:[2,29],75:[2,29],80:[2,29],81:[2,29],82:[2,29],83:[2,29],84:[2,29],85:[2,29]},{14:[2,15],15:[2,15],19:[2,15],29:[2,15],34:[2,15],39:[2,15],44:[2,15],47:[2,15],48:[2,15],51:[2,15],55:[2,15],60:[2,15]},{72:[1,138],77:[1,137]},{72:[2,100],77:[2,100]},{14:[2,16],15:[2,16],19:[2,16],29:[2,16],34:[2,16],44:[2,16],47:[2,16],48:[2,16],51:[2,16],55:[2,16],60:[2,16]},{33:[1,139]},{33:[2,75]},{33:[2,32]},{72:[2,101],77:[2,101]},{14:[2,17],15:[2,17],19:[2,17],29:[2,17],34:[2,17],39:[2,17],44:[2,17],47:[2,17],48:[2,17],51:[2,17],55:[2,17],60:[2,17]}],defaultActions:{4:[2,1],55:[2,55],57:[2,20],61:[2,57],74:[2,81],83:[2,85],87:[2,18],91:[2,89],102:[2,53],105:[2,93],111:[2,19],112:[2,77],117:[2,97],120:[2,63],123:[2,69],124:[2,12],136:[2,75],137:[2,32]},parseError:function(a,b){throw new Error(a)},parse:function(a){function b(){var a;return a=c.lexer.lex()||1,"number"!=typeof a&&(a=c.symbols_[a]||a),a}var c=this,d=[0],e=[null],f=[],g=this.table,h="",i=0,j=0,k=0;this.lexer.setInput(a),this.lexer.yy=this.yy,this.yy.lexer=this.lexer,this.yy.parser=this,"undefined"==typeof this.lexer.yylloc&&(this.lexer.yylloc={});var l=this.lexer.yylloc;f.push(l);var m=this.lexer.options&&this.lexer.options.ranges;"function"==typeof this.yy.parseError&&(this.parseError=this.yy.parseError);for(var n,o,p,q,r,s,t,u,v,w={};;){if(p=d[d.length-1],this.defaultActions[p]?q=this.defaultActions[p]:(null!==n&&"undefined"!=typeof n||(n=b()),q=g[p]&&g[p][n]),"undefined"==typeof q||!q.length||!q[0]){var x="";if(!k){v=[];for(s in g[p])this.terminals_[s]&&s>2&&v.push("'"+this.terminals_[s]+"'");x=this.lexer.showPosition?"Parse error on line "+(i+1)+":\n"+this.lexer.showPosition()+"\nExpecting "+v.join(", ")+", got '"+(this.terminals_[n]||n)+"'":"Parse error on line "+(i+1)+": Unexpected "+(1==n?"end of input":"'"+(this.terminals_[n]||n)+"'"),this.parseError(x,{text:this.lexer.match,token:this.terminals_[n]||n,line:this.lexer.yylineno,loc:l,expected:v})}}if(q[0]instanceof Array&&q.length>1)throw new Error("Parse Error: multiple actions possible at state: "+p+", token: "+n);switch(q[0]){case 1:d.push(n),e.push(this.lexer.yytext),f.push(this.lexer.yylloc),d.push(q[1]),n=null,o?(n=o,o=null):(j=this.lexer.yyleng,h=this.lexer.yytext,i=this.lexer.yylineno,l=this.lexer.yylloc,k>0&&k--);break;case 2:if(t=this.productions_[q[1]][1],w.$=e[e.length-t],w._$={first_line:f[f.length-(t||1)].first_line,last_line:f[f.length-1].last_line,first_column:f[f.length-(t||1)].first_column,last_column:f[f.length-1].last_column},m&&(w._$.range=[f[f.length-(t||1)].range[0],f[f.length-1].range[1]]),r=this.performAction.call(w,h,j,i,this.yy,q[1],e,f),"undefined"!=typeof r)return r;t&&(d=d.slice(0,-1*t*2),e=e.slice(0,-1*t),f=f.slice(0,-1*t)),d.push(this.productions_[q[1]][0]),e.push(w.$),f.push(w._$),u=g[d[d.length-2]][d[d.length-1]],d.push(u);break;case 3:return!0}}return!0}},c=function(){var a={EOF:1,parseError:function(a,b){if(!this.yy.parser)throw new Error(a);this.yy.parser.parseError(a,b)},setInput:function(a){return this._input=a,this._more=this._less=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var a=this._input[0];this.yytext+=a,this.yyleng++,this.offset++,this.match+=a,this.matched+=a;var b=a.match(/(?:\r\n?|\n).*/g);return b?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),a},unput:function(a){var b=a.length,c=a.split(/(?:\r\n?|\n)/g);this._input=a+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-b-1),this.offset-=b;var d=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),c.length-1&&(this.yylineno-=c.length-1);var e=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:c?(c.length===d.length?this.yylloc.first_column:0)+d[d.length-c.length].length-c[0].length:this.yylloc.first_column-b},this.options.ranges&&(this.yylloc.range=[e[0],e[0]+this.yyleng-b]),this},more:function(){return this._more=!0,this},less:function(a){this.unput(this.match.slice(a))},pastInput:function(){var a=this.matched.substr(0,this.matched.length-this.match.length);return(a.length>20?"...":"")+a.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var a=this.match;return a.length<20&&(a+=this._input.substr(0,20-a.length)),(a.substr(0,20)+(a.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var a=this.pastInput(),b=new Array(a.length+1).join("-");return a+this.upcomingInput()+"\n"+b+"^"},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var a,b,c,d,e;this._more||(this.yytext="",this.match="");for(var f=this._currentRules(),g=0;g<f.length&&(c=this._input.match(this.rules[f[g]]),!c||b&&!(c[0].length>b[0].length)||(b=c,d=g,this.options.flex));g++);return b?(e=b[0].match(/(?:\r\n?|\n).*/g),e&&(this.yylineno+=e.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:e?e[e.length-1].length-e[e.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+b[0].length},this.yytext+=b[0],this.match+=b[0],this.matches=b,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._input=this._input.slice(b[0].length),this.matched+=b[0],a=this.performAction.call(this,this.yy,this,f[d],this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),a?a:void 0):""===this._input?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+". Unrecognized text.\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var a=this.next();return"undefined"!=typeof a?a:this.lex()},begin:function(a){this.conditionStack.push(a)},popState:function(){return this.conditionStack.pop()},_currentRules:function(){return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules},topState:function(){return this.conditionStack[this.conditionStack.length-2]},pushState:function(a){this.begin(a)}};return a.options={},a.performAction=function(a,b,c,d){function e(a,c){return b.yytext=b.yytext.substr(a,b.yyleng-c)}switch(c){case 0:if("\\\\"===b.yytext.slice(-2)?(e(0,1),this.begin("mu")):"\\"===b.yytext.slice(-1)?(e(0,1),this.begin("emu")):this.begin("mu"),b.yytext)return 15;break;case 1:return 15;case 2:return this.popState(),15;case 3:return this.begin("raw"),15;case 4:return this.popState(),"raw"===this.conditionStack[this.conditionStack.length-1]?15:(b.yytext=b.yytext.substr(5,b.yyleng-9),"END_RAW_BLOCK");case 5:return 15;case 6:return this.popState(),14;case 7:return 65;case 8:return 68;case 9:return 19;case 10:return this.popState(),this.begin("raw"),23;case 11:return 55;case 12:return 60;case 13:return 29;case 14:return 47;case 15:return this.popState(),44;case 16:return this.popState(),44;case 17:return 34;case 18:return 39;case 19:return 51;case 20:return 48;case 21:this.unput(b.yytext),this.popState(),this.begin("com");break;case 22:return this.popState(),14;case 23:return 48;case 24:return 73;case 25:return 72;case 26:return 72;case 27:return 87;case 28:break;case 29:return this.popState(),54;case 30:return this.popState(),33;case 31:return b.yytext=e(1,2).replace(/\\"/g,'"'),80;case 32:return b.yytext=e(1,2).replace(/\\'/g,"'"),80;case 33:return 85;case 34:return 82;case 35:return 82;case 36:return 83;case 37:return 84;case 38:return 81;case 39:return 75;case 40:return 77;case 41:return 72;case 42:return b.yytext=b.yytext.replace(/\\([\\\]])/g,"$1"),72;case 43:return"INVALID";case 44:return 5}},a.rules=[/^(?:[^\x00]*?(?=(\{\{)))/,/^(?:[^\x00]+)/,/^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/,/^(?:\{\{\{\{(?=[^\/]))/,/^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/,/^(?:[^\x00]*?(?=(\{\{\{\{)))/,/^(?:[\s\S]*?--(~)?\}\})/,/^(?:\()/,/^(?:\))/,/^(?:\{\{\{\{)/,/^(?:\}\}\}\})/,/^(?:\{\{(~)?>)/,/^(?:\{\{(~)?#>)/,/^(?:\{\{(~)?#\*?)/,/^(?:\{\{(~)?\/)/,/^(?:\{\{(~)?\^\s*(~)?\}\})/,/^(?:\{\{(~)?\s*else\s*(~)?\}\})/,/^(?:\{\{(~)?\^)/,/^(?:\{\{(~)?\s*else\b)/,/^(?:\{\{(~)?\{)/,/^(?:\{\{(~)?&)/,/^(?:\{\{(~)?!--)/,/^(?:\{\{(~)?![\s\S]*?\}\})/,/^(?:\{\{(~)?\*?)/,/^(?:=)/,/^(?:\.\.)/,/^(?:\.(?=([=~}\s\/.)|])))/,/^(?:[\/.])/,/^(?:\s+)/,/^(?:\}(~)?\}\})/,/^(?:(~)?\}\})/,/^(?:"(\\["]|[^"])*")/,/^(?:'(\\[']|[^'])*')/,/^(?:@)/,/^(?:true(?=([~}\s)])))/,/^(?:false(?=([~}\s)])))/,/^(?:undefined(?=([~}\s)])))/,/^(?:null(?=([~}\s)])))/,/^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/,/^(?:as\s+\|)/,/^(?:\|)/,/^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/,/^(?:\[(\\\]|[^\]])*\])/,/^(?:.)/,/^(?:$)/],a.conditions={mu:{rules:[7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44],inclusive:!1},emu:{rules:[2],inclusive:!1},com:{rules:[6],inclusive:!1},raw:{rules:[3,4,5],inclusive:!1},INITIAL:{rules:[0,1,44],inclusive:!0}},a}();return b.lexer=c,a.prototype=b,b.Parser=a,new a}();b["default"]=c,a.exports=b["default"]},function(a,b,c){"use strict";function d(){var a=arguments.length<=0||void 0===arguments[0]?{}:arguments[0];this.options=a}function e(a,b,c){void 0===b&&(b=a.length);var d=a[b-1],e=a[b-2];return d?"ContentStatement"===d.type?(e||!c?/\r?\n\s*?$/:/(^|\r?\n)\s*?$/).test(d.original):void 0:c}function f(a,b,c){void 0===b&&(b=-1);var d=a[b+1],e=a[b+2];return d?"ContentStatement"===d.type?(e||!c?/^\s*?\r?\n/:/^\s*?(\r?\n|$)/).test(d.original):void 0:c}function g(a,b,c){var d=a[null==b?0:b+1];if(d&&"ContentStatement"===d.type&&(c||!d.rightStripped)){var e=d.value;d.value=d.value.replace(c?/^\s+/:/^[ \t]*\r?\n?/,""),d.rightStripped=d.value!==e}}function h(a,b,c){var d=a[null==b?a.length-1:b-1];if(d&&"ContentStatement"===d.type&&(c||!d.leftStripped)){var e=d.value;return d.value=d.value.replace(c?/\s+$/:/[ \t]+$/,""),d.leftStripped=d.value!==e,d.leftStripped}}var i=c(1)["default"];b.__esModule=!0;var j=c(39),k=i(j);d.prototype=new k["default"],d.prototype.Program=function(a){var b=!this.options.ignoreStandalone,c=!this.isRootSeen;this.isRootSeen=!0;for(var d=a.body,i=0,j=d.length;i<j;i++){var k=d[i],l=this.accept(k);if(l){var m=e(d,i,c),n=f(d,i,c),o=l.openStandalone&&m,p=l.closeStandalone&&n,q=l.inlineStandalone&&m&&n;l.close&&g(d,i,!0),l.open&&h(d,i,!0),b&&q&&(g(d,i),h(d,i)&&"PartialStatement"===k.type&&(k.indent=/([ \t]+$)/.exec(d[i-1].original)[1])),b&&o&&(g((k.program||k.inverse).body),h(d,i)),b&&p&&(g(d,i),h((k.inverse||k.program).body))}}return a},d.prototype.BlockStatement=d.prototype.DecoratorBlock=d.prototype.PartialBlockStatement=function(a){this.accept(a.program),this.accept(a.inverse);var b=a.program||a.inverse,c=a.program&&a.inverse,d=c,i=c;if(c&&c.chained)for(d=c.body[0].program;i.chained;)i=i.body[i.body.length-1].program;var j={open:a.openStrip.open,close:a.closeStrip.close,openStandalone:f(b.body),closeStandalone:e((d||b).body)};if(a.openStrip.close&&g(b.body,null,!0),c){var k=a.inverseStrip;k.open&&h(b.body,null,!0),k.close&&g(d.body,null,!0),a.closeStrip.open&&h(i.body,null,!0),!this.options.ignoreStandalone&&e(b.body)&&f(d.body)&&(h(b.body),g(d.body))}else a.closeStrip.open&&h(b.body,null,!0);return j},d.prototype.Decorator=d.prototype.MustacheStatement=function(a){return a.strip},d.prototype.PartialStatement=d.prototype.CommentStatement=function(a){var b=a.strip||{};return{inlineStandalone:!0,open:b.open,close:b.close}},b["default"]=d,a.exports=b["default"]},function(a,b,c){"use strict";function d(){this.parents=[]}function e(a){this.acceptRequired(a,"path"),this.acceptArray(a.params),this.acceptKey(a,"hash")}function f(a){e.call(this,a),this.acceptKey(a,"program"),this.acceptKey(a,"inverse")}function g(a){this.acceptRequired(a,"name"),this.acceptArray(a.params),this.acceptKey(a,"hash")}var h=c(1)["default"];b.__esModule=!0;var i=c(6),j=h(i);d.prototype={constructor:d,mutating:!1,acceptKey:function(a,b){var c=this.accept(a[b]);if(this.mutating){if(c&&!d.prototype[c.type])throw new j["default"]('Unexpected node type "'+c.type+'" found when accepting '+b+" on "+a.type);a[b]=c}},acceptRequired:function(a,b){if(this.acceptKey(a,b),!a[b])throw new j["default"](a.type+" requires "+b)},acceptArray:function(a){for(var b=0,c=a.length;b<c;b++)this.acceptKey(a,b),a[b]||(a.splice(b,1),b--,c--)},accept:function(a){if(a){if(!this[a.type])throw new j["default"]("Unknown type: "+a.type,a);this.current&&this.parents.unshift(this.current),this.current=a;var b=this[a.type](a);return this.current=this.parents.shift(),!this.mutating||b?b:b!==!1?a:void 0}},Program:function(a){this.acceptArray(a.body)},MustacheStatement:e,Decorator:e,BlockStatement:f,DecoratorBlock:f,PartialStatement:g,PartialBlockStatement:function(a){g.call(this,a),this.acceptKey(a,"program")},ContentStatement:function(){},CommentStatement:function(){},SubExpression:e,PathExpression:function(){},StringLiteral:function(){},NumberLiteral:function(){},BooleanLiteral:function(){},UndefinedLiteral:function(){},NullLiteral:function(){},Hash:function(a){this.acceptArray(a.pairs)},HashPair:function(a){this.acceptRequired(a,"value")}},b["default"]=d,a.exports=b["default"]},function(a,b,c){"use strict";function d(a,b){if(b=b.path?b.path.original:b,a.path.original!==b){var c={loc:a.path.loc};throw new q["default"](a.path.original+" doesn't match "+b,c)}}function e(a,b){this.source=a,this.start={line:b.first_line,column:b.first_column},this.end={line:b.last_line,column:b.last_column}}function f(a){return/^\[.*\]$/.test(a)?a.substr(1,a.length-2):a}function g(a,b){return{open:"~"===a.charAt(2),close:"~"===b.charAt(b.length-3)}}function h(a){return a.replace(/^\{\{~?!-?-?/,"").replace(/-?-?~?\}\}$/,"")}function i(a,b,c){c=this.locInfo(c);for(var d=a?"@":"",e=[],f=0,g=0,h=b.length;g<h;g++){var i=b[g].part,j=b[g].original!==i;if(d+=(b[g].separator||"")+i,j||".."!==i&&"."!==i&&"this"!==i)e.push(i);else{if(e.length>0)throw new q["default"]("Invalid path: "+d,{loc:c});".."===i&&f++}}return{type:"PathExpression",data:a,depth:f,parts:e,original:d,loc:c}}function j(a,b,c,d,e,f){var g=d.charAt(3)||d.charAt(2),h="{"!==g&&"&"!==g,i=/\*/.test(d);return{type:i?"Decorator":"MustacheStatement",path:a,params:b,hash:c,escaped:h,strip:e,loc:this.locInfo(f)}}function k(a,b,c,e){d(a,c),e=this.locInfo(e);var f={type:"Program",body:b,strip:{},loc:e};return{type:"BlockStatement",path:a.path,params:a.params,hash:a.hash,program:f,openStrip:{},inverseStrip:{},closeStrip:{},loc:e}}function l(a,b,c,e,f,g){e&&e.path&&d(a,e);var h=/\*/.test(a.open);b.blockParams=a.blockParams;var i=void 0,j=void 0;if(c){if(h)throw new q["default"]("Unexpected inverse block on decorator",c);c.chain&&(c.program.body[0].closeStrip=e.strip),j=c.strip,i=c.program}return f&&(f=i,i=b,b=f),{type:h?"DecoratorBlock":"BlockStatement",path:a.path,params:a.params,hash:a.hash,program:b,inverse:i,openStrip:a.strip,inverseStrip:j,closeStrip:e&&e.strip,loc:this.locInfo(g)}}function m(a,b){if(!b&&a.length){var c=a[0].loc,d=a[a.length-1].loc;c&&d&&(b={source:c.source,start:{line:c.start.line,column:c.start.column},end:{line:d.end.line,column:d.end.column}})}return{type:"Program",body:a,strip:{},loc:b}}function n(a,b,c,e){return d(a,c),{type:"PartialBlockStatement",name:a.path,params:a.params,hash:a.hash,program:b,openStrip:a.strip,closeStrip:c&&c.strip,loc:this.locInfo(e)}}var o=c(1)["default"];b.__esModule=!0,b.SourceLocation=e,b.id=f,b.stripFlags=g,b.stripComment=h,b.preparePath=i,b.prepareMustache=j,b.prepareRawBlock=k,b.prepareBlock=l,b.prepareProgram=m,b.preparePartialBlock=n;var p=c(6),q=o(p)},function(a,b,c){"use strict";function d(){}function e(a,b,c){if(null==a||"string"!=typeof a&&"Program"!==a.type)throw new k["default"]("You must pass a string or Handlebars AST to Handlebars.precompile. You passed "+a);b=b||{},"data"in b||(b.data=!0),b.compat&&(b.useDepths=!0);var d=c.parse(a,b),e=(new c.Compiler).compile(d,b);return(new c.JavaScriptCompiler).compile(e,b)}function f(a,b,c){function d(){var d=c.parse(a,b),e=(new c.Compiler).compile(d,b),f=(new c.JavaScriptCompiler).compile(e,b,void 0,!0);return c.template(f)}function e(a,b){return f||(f=d()),f.call(this,a,b)}if(void 0===b&&(b={}),null==a||"string"!=typeof a&&"Program"!==a.type)throw new k["default"]("You must pass a string or Handlebars AST to Handlebars.compile. You passed "+a);b=l.extend({},b),"data"in b||(b.data=!0),b.compat&&(b.useDepths=!0);var f=void 0;return e._setup=function(a){return f||(f=d()),f._setup(a)},e._child=function(a,b,c,e){return f||(f=d()),f._child(a,b,c,e)},e}function g(a,b){if(a===b)return!0;if(l.isArray(a)&&l.isArray(b)&&a.length===b.length){for(var c=0;c<a.length;c++)if(!g(a[c],b[c]))return!1;return!0}}function h(a){if(!a.path.parts){var b=a.path;a.path={type:"PathExpression",data:!1,depth:0,parts:[b.original+""],original:b.original+"",loc:b.loc}}}var i=c(1)["default"];b.__esModule=!0,b.Compiler=d,b.precompile=e,b.compile=f;var j=c(6),k=i(j),l=c(5),m=c(35),n=i(m),o=[].slice;d.prototype={compiler:d,equals:function(a){var b=this.opcodes.length;if(a.opcodes.length!==b)return!1;for(var c=0;c<b;c++){var d=this.opcodes[c],e=a.opcodes[c];if(d.opcode!==e.opcode||!g(d.args,e.args))return!1}b=this.children.length;for(var c=0;c<b;c++)if(!this.children[c].equals(a.children[c]))return!1;return!0},guid:0,compile:function(a,b){this.sourceNode=[],this.opcodes=[],this.children=[],this.options=b,this.stringParams=b.stringParams,this.trackIds=b.trackIds,b.blockParams=b.blockParams||[];var c=b.knownHelpers;if(b.knownHelpers={helperMissing:!0,blockHelperMissing:!0,each:!0,"if":!0,unless:!0,"with":!0,log:!0,lookup:!0},c)for(var d in c)this.options.knownHelpers[d]=c[d];return this.accept(a)},compileProgram:function(a){var b=new this.compiler,c=b.compile(a,this.options),d=this.guid++;return this.usePartial=this.usePartial||c.usePartial,this.children[d]=c,this.useDepths=this.useDepths||c.useDepths,d},accept:function(a){if(!this[a.type])throw new k["default"]("Unknown type: "+a.type,a);this.sourceNode.unshift(a);var b=this[a.type](a);return this.sourceNode.shift(),b},Program:function(a){this.options.blockParams.unshift(a.blockParams);for(var b=a.body,c=b.length,d=0;d<c;d++)this.accept(b[d]);return this.options.blockParams.shift(),this.isSimple=1===c,this.blockParams=a.blockParams?a.blockParams.length:0,this},BlockStatement:function(a){h(a);var b=a.program,c=a.inverse;b=b&&this.compileProgram(b),c=c&&this.compileProgram(c);var d=this.classifySexpr(a);"helper"===d?this.helperSexpr(a,b,c):"simple"===d?(this.simpleSexpr(a),this.opcode("pushProgram",b),this.opcode("pushProgram",c),this.opcode("emptyHash"),this.opcode("blockValue",a.path.original)):(this.ambiguousSexpr(a,b,c),this.opcode("pushProgram",b),this.opcode("pushProgram",c),this.opcode("emptyHash"),this.opcode("ambiguousBlockValue")),this.opcode("append")},DecoratorBlock:function(a){var b=a.program&&this.compileProgram(a.program),c=this.setupFullMustacheParams(a,b,void 0),d=a.path;this.useDecorators=!0,this.opcode("registerDecorator",c.length,d.original)},PartialStatement:function(a){this.usePartial=!0;var b=a.program;b&&(b=this.compileProgram(a.program));var c=a.params;if(c.length>1)throw new k["default"]("Unsupported number of partial arguments: "+c.length,a);c.length||(this.options.explicitPartialContext?this.opcode("pushLiteral","undefined"):c.push({type:"PathExpression",parts:[],depth:0}));var d=a.name.original,e="SubExpression"===a.name.type;e&&this.accept(a.name),this.setupFullMustacheParams(a,b,void 0,!0);var f=a.indent||"";this.options.preventIndent&&f&&(this.opcode("appendContent",f),f=""),this.opcode("invokePartial",e,d,f),this.opcode("append")},PartialBlockStatement:function(a){this.PartialStatement(a)},MustacheStatement:function(a){this.SubExpression(a),a.escaped&&!this.options.noEscape?this.opcode("appendEscaped"):this.opcode("append")},Decorator:function(a){this.DecoratorBlock(a)},ContentStatement:function(a){a.value&&this.opcode("appendContent",a.value)},CommentStatement:function(){},SubExpression:function(a){h(a);var b=this.classifySexpr(a);"simple"===b?this.simpleSexpr(a):"helper"===b?this.helperSexpr(a):this.ambiguousSexpr(a)},ambiguousSexpr:function(a,b,c){var d=a.path,e=d.parts[0],f=null!=b||null!=c;this.opcode("getContext",d.depth),this.opcode("pushProgram",b),this.opcode("pushProgram",c),d.strict=!0,this.accept(d),this.opcode("invokeAmbiguous",e,f)},simpleSexpr:function(a){var b=a.path;b.strict=!0,this.accept(b),this.opcode("resolvePossibleLambda")},helperSexpr:function(a,b,c){var d=this.setupFullMustacheParams(a,b,c),e=a.path,f=e.parts[0];if(this.options.knownHelpers[f])this.opcode("invokeKnownHelper",d.length,f);else{if(this.options.knownHelpersOnly)throw new k["default"]("You specified knownHelpersOnly, but used the unknown helper "+f,a);e.strict=!0,e.falsy=!0,this.accept(e),this.opcode("invokeHelper",d.length,e.original,n["default"].helpers.simpleId(e))}},PathExpression:function(a){this.addDepth(a.depth),this.opcode("getContext",a.depth);var b=a.parts[0],c=n["default"].helpers.scopedId(a),d=!a.depth&&!c&&this.blockParamIndex(b);d?this.opcode("lookupBlockParam",d,a.parts):b?a.data?(this.options.data=!0,this.opcode("lookupData",a.depth,a.parts,a.strict)):this.opcode("lookupOnContext",a.parts,a.falsy,a.strict,c):this.opcode("pushContext")},StringLiteral:function(a){this.opcode("pushString",a.value)},NumberLiteral:function(a){this.opcode("pushLiteral",a.value)},BooleanLiteral:function(a){this.opcode("pushLiteral",a.value)},UndefinedLiteral:function(){this.opcode("pushLiteral","undefined")},NullLiteral:function(){this.opcode("pushLiteral","null")},Hash:function(a){var b=a.pairs,c=0,d=b.length;for(this.opcode("pushHash");c<d;c++)this.pushParam(b[c].value);for(;c--;)this.opcode("assignToHash",b[c].key);this.opcode("popHash")},opcode:function(a){this.opcodes.push({opcode:a,args:o.call(arguments,1),loc:this.sourceNode[0].loc})},addDepth:function(a){a&&(this.useDepths=!0)},classifySexpr:function(a){var b=n["default"].helpers.simpleId(a.path),c=b&&!!this.blockParamIndex(a.path.parts[0]),d=!c&&n["default"].helpers.helperExpression(a),e=!c&&(d||b);if(e&&!d){var f=a.path.parts[0],g=this.options;g.knownHelpers[f]?d=!0:g.knownHelpersOnly&&(e=!1)}return d?"helper":e?"ambiguous":"simple"},pushParams:function(a){for(var b=0,c=a.length;b<c;b++)this.pushParam(a[b])},pushParam:function(a){var b=null!=a.value?a.value:a.original||"";if(this.stringParams)b.replace&&(b=b.replace(/^(\.?\.\/)*/g,"").replace(/\//g,".")),a.depth&&this.addDepth(a.depth),this.opcode("getContext",a.depth||0),this.opcode("pushStringParam",b,a.type),"SubExpression"===a.type&&this.accept(a);else{if(this.trackIds){var c=void 0;if(!a.parts||n["default"].helpers.scopedId(a)||a.depth||(c=this.blockParamIndex(a.parts[0])),c){var d=a.parts.slice(1).join(".");this.opcode("pushId","BlockParam",c,d)}else b=a.original||b,b.replace&&(b=b.replace(/^this(?:\.|$)/,"").replace(/^\.\//,"").replace(/^\.$/,"")),this.opcode("pushId",a.type,b)}this.accept(a)}},setupFullMustacheParams:function(a,b,c,d){var e=a.params;return this.pushParams(e),this.opcode("pushProgram",b),this.opcode("pushProgram",c),a.hash?this.accept(a.hash):this.opcode("emptyHash",d),e},blockParamIndex:function(a){for(var b=0,c=this.options.blockParams.length;b<c;b++){var d=this.options.blockParams[b],e=d&&l.indexOf(d,a);if(d&&e>=0)return[b,e]}}}},function(a,b,c){"use strict";function d(a){this.value=a}function e(){}function f(a,b,c,d){var e=b.popStack(),f=0,g=c.length;for(a&&g--;f<g;f++)e=b.nameLookup(e,c[f],d);return a?[b.aliasable("container.strict"),"(",e,", ",b.quotedString(c[f]),")"]:e}var g=c(1)["default"];b.__esModule=!0;var h=c(4),i=c(6),j=g(i),k=c(5),l=c(43),m=g(l);e.prototype={nameLookup:function(a,b){return"constructor"===b?["(",a,".propertyIsEnumerable('constructor') ? ",a,".constructor : undefined",")"]:e.isValidJavaScriptVariableName(b)?[a,".",b]:[a,"[",JSON.stringify(b),"]"]},depthedLookup:function(a){return[this.aliasable("container.lookup"),'(depths, "',a,'")']},compilerInfo:function(){var a=h.COMPILER_REVISION,b=h.REVISION_CHANGES[a];return[a,b]},appendToBuffer:function(a,b,c){return k.isArray(a)||(a=[a]),a=this.source.wrap(a,b),this.environment.isSimple?["return ",a,";"]:c?["buffer += ",a,";"]:(a.appendToBuffer=!0,a)},initializeBuffer:function(){return this.quotedString("")},compile:function(a,b,c,d){this.environment=a,this.options=b,this.stringParams=this.options.stringParams,this.trackIds=this.options.trackIds,this.precompile=!d,this.name=this.environment.name,this.isChild=!!c,this.context=c||{decorators:[],programs:[],environments:[]},this.preamble(),this.stackSlot=0,this.stackVars=[],this.aliases={},this.registers={list:[]},this.hashes=[],this.compileStack=[],this.inlineStack=[],this.blockParams=[],this.compileChildren(a,b),this.useDepths=this.useDepths||a.useDepths||a.useDecorators||this.options.compat,this.useBlockParams=this.useBlockParams||a.useBlockParams;var e=a.opcodes,f=void 0,g=void 0,h=void 0,i=void 0;for(h=0,i=e.length;h<i;h++)f=e[h],this.source.currentLocation=f.loc,g=g||f.loc,this[f.opcode].apply(this,f.args);if(this.source.currentLocation=g,this.pushSource(""),this.stackSlot||this.inlineStack.length||this.compileStack.length)throw new j["default"]("Compile completed with content left on stack");this.decorators.isEmpty()?this.decorators=void 0:(this.useDecorators=!0,this.decorators.prepend("var decorators = container.decorators;\n"),this.decorators.push("return fn;"),d?this.decorators=Function.apply(this,["fn","props","container","depth0","data","blockParams","depths",this.decorators.merge()]):(this.decorators.prepend("function(fn, props, container, depth0, data, blockParams, depths) {\n"),this.decorators.push("}\n"),this.decorators=this.decorators.merge()));var k=this.createFunctionContext(d);if(this.isChild)return k;var l={compiler:this.compilerInfo(),main:k};this.decorators&&(l.main_d=this.decorators,l.useDecorators=!0);var m=this.context,n=m.programs,o=m.decorators;for(h=0,i=n.length;h<i;h++)n[h]&&(l[h]=n[h],o[h]&&(l[h+"_d"]=o[h],l.useDecorators=!0));return this.environment.usePartial&&(l.usePartial=!0),this.options.data&&(l.useData=!0),this.useDepths&&(l.useDepths=!0),this.useBlockParams&&(l.useBlockParams=!0),this.options.compat&&(l.compat=!0),d?l.compilerOptions=this.options:(l.compiler=JSON.stringify(l.compiler),this.source.currentLocation={start:{line:1,column:0}},l=this.objectLiteral(l),b.srcName?(l=l.toStringWithSourceMap({file:b.destName}),l.map=l.map&&l.map.toString()):l=l.toString()),l},preamble:function(){this.lastContext=0,this.source=new m["default"](this.options.srcName),this.decorators=new m["default"](this.options.srcName)},createFunctionContext:function(a){var b="",c=this.stackVars.concat(this.registers.list);c.length>0&&(b+=", "+c.join(", "));var d=0;for(var e in this.aliases){var f=this.aliases[e];this.aliases.hasOwnProperty(e)&&f.children&&f.referenceCount>1&&(b+=", alias"+ ++d+"="+e,f.children[0]="alias"+d)}var g=["container","depth0","helpers","partials","data"];(this.useBlockParams||this.useDepths)&&g.push("blockParams"),this.useDepths&&g.push("depths");var h=this.mergeSource(b);return a?(g.push(h),Function.apply(this,g)):this.source.wrap(["function(",g.join(","),") {\n  ",h,"}"])},mergeSource:function(a){var b=this.environment.isSimple,c=!this.forceBuffer,d=void 0,e=void 0,f=void 0,g=void 0;return this.source.each(function(a){a.appendToBuffer?(f?a.prepend("  + "):f=a,g=a):(f&&(e?f.prepend("buffer += "):d=!0,g.add(";"),f=g=void 0),e=!0,b||(c=!1))}),c?f?(f.prepend("return "),g.add(";")):e||this.source.push('return "";'):(a+=", buffer = "+(d?"":this.initializeBuffer()),f?(f.prepend("return buffer + "),g.add(";")):this.source.push("return buffer;")),a&&this.source.prepend("var "+a.substring(2)+(d?"":";\n")),this.source.merge()},blockValue:function(a){var b=this.aliasable("helpers.blockHelperMissing"),c=[this.contextName(0)];this.setupHelperArgs(a,0,c);var d=this.popStack();c.splice(1,0,d),this.push(this.source.functionCall(b,"call",c))},ambiguousBlockValue:function(){var a=this.aliasable("helpers.blockHelperMissing"),b=[this.contextName(0)];this.setupHelperArgs("",0,b,!0),this.flushInline();var c=this.topStack();b.splice(1,0,c),this.pushSource(["if (!",this.lastHelper,") { ",c," = ",this.source.functionCall(a,"call",b),"}"])},appendContent:function(a){this.pendingContent?a=this.pendingContent+a:this.pendingLocation=this.source.currentLocation,this.pendingContent=a},append:function(){if(this.isInline())this.replaceStack(function(a){return[" != null ? ",a,' : ""']}),this.pushSource(this.appendToBuffer(this.popStack()));else{var a=this.popStack();this.pushSource(["if (",a," != null) { ",this.appendToBuffer(a,void 0,!0)," }"]),this.environment.isSimple&&this.pushSource(["else { ",this.appendToBuffer("''",void 0,!0)," }"])}},appendEscaped:function(){this.pushSource(this.appendToBuffer([this.aliasable("container.escapeExpression"),"(",this.popStack(),")"]))},getContext:function(a){this.lastContext=a},pushContext:function(){this.pushStackLiteral(this.contextName(this.lastContext))},lookupOnContext:function(a,b,c,d){var e=0;d||!this.options.compat||this.lastContext?this.pushContext():this.push(this.depthedLookup(a[e++])),this.resolvePath("context",a,e,b,c)},lookupBlockParam:function(a,b){this.useBlockParams=!0,this.push(["blockParams[",a[0],"][",a[1],"]"]),this.resolvePath("context",b,1)},lookupData:function(a,b,c){a?this.pushStackLiteral("container.data(data, "+a+")"):this.pushStackLiteral("data"),this.resolvePath("data",b,0,!0,c)},resolvePath:function(a,b,c,d,e){var g=this;if(this.options.strict||this.options.assumeObjects)return void this.push(f(this.options.strict&&e,this,b,a));
for(var h=b.length;c<h;c++)this.replaceStack(function(e){var f=g.nameLookup(e,b[c],a);return d?[" && ",f]:[" != null ? ",f," : ",e]})},resolvePossibleLambda:function(){this.push([this.aliasable("container.lambda"),"(",this.popStack(),", ",this.contextName(0),")"])},pushStringParam:function(a,b){this.pushContext(),this.pushString(b),"SubExpression"!==b&&("string"==typeof a?this.pushString(a):this.pushStackLiteral(a))},emptyHash:function(a){this.trackIds&&this.push("{}"),this.stringParams&&(this.push("{}"),this.push("{}")),this.pushStackLiteral(a?"undefined":"{}")},pushHash:function(){this.hash&&this.hashes.push(this.hash),this.hash={values:[],types:[],contexts:[],ids:[]}},popHash:function(){var a=this.hash;this.hash=this.hashes.pop(),this.trackIds&&this.push(this.objectLiteral(a.ids)),this.stringParams&&(this.push(this.objectLiteral(a.contexts)),this.push(this.objectLiteral(a.types))),this.push(this.objectLiteral(a.values))},pushString:function(a){this.pushStackLiteral(this.quotedString(a))},pushLiteral:function(a){this.pushStackLiteral(a)},pushProgram:function(a){null!=a?this.pushStackLiteral(this.programExpression(a)):this.pushStackLiteral(null)},registerDecorator:function(a,b){var c=this.nameLookup("decorators",b,"decorator"),d=this.setupHelperArgs(b,a);this.decorators.push(["fn = ",this.decorators.functionCall(c,"",["fn","props","container",d])," || fn;"])},invokeHelper:function(a,b,c){var d=this.popStack(),e=this.setupHelper(a,b),f=c?[e.name," || "]:"",g=["("].concat(f,d);this.options.strict||g.push(" || ",this.aliasable("helpers.helperMissing")),g.push(")"),this.push(this.source.functionCall(g,"call",e.callParams))},invokeKnownHelper:function(a,b){var c=this.setupHelper(a,b);this.push(this.source.functionCall(c.name,"call",c.callParams))},invokeAmbiguous:function(a,b){this.useRegister("helper");var c=this.popStack();this.emptyHash();var d=this.setupHelper(0,a,b),e=this.lastHelper=this.nameLookup("helpers",a,"helper"),f=["(","(helper = ",e," || ",c,")"];this.options.strict||(f[0]="(helper = ",f.push(" != null ? helper : ",this.aliasable("helpers.helperMissing"))),this.push(["(",f,d.paramsInit?["),(",d.paramsInit]:[],"),","(typeof helper === ",this.aliasable('"function"')," ? ",this.source.functionCall("helper","call",d.callParams)," : helper))"])},invokePartial:function(a,b,c){var d=[],e=this.setupParams(b,1,d);a&&(b=this.popStack(),delete e.name),c&&(e.indent=JSON.stringify(c)),e.helpers="helpers",e.partials="partials",e.decorators="container.decorators",a?d.unshift(b):d.unshift(this.nameLookup("partials",b,"partial")),this.options.compat&&(e.depths="depths"),e=this.objectLiteral(e),d.push(e),this.push(this.source.functionCall("container.invokePartial","",d))},assignToHash:function(a){var b=this.popStack(),c=void 0,d=void 0,e=void 0;this.trackIds&&(e=this.popStack()),this.stringParams&&(d=this.popStack(),c=this.popStack());var f=this.hash;c&&(f.contexts[a]=c),d&&(f.types[a]=d),e&&(f.ids[a]=e),f.values[a]=b},pushId:function(a,b,c){"BlockParam"===a?this.pushStackLiteral("blockParams["+b[0]+"].path["+b[1]+"]"+(c?" + "+JSON.stringify("."+c):"")):"PathExpression"===a?this.pushString(b):"SubExpression"===a?this.pushStackLiteral("true"):this.pushStackLiteral("null")},compiler:e,compileChildren:function(a,b){for(var c=a.children,d=void 0,e=void 0,f=0,g=c.length;f<g;f++){d=c[f],e=new this.compiler;var h=this.matchExistingProgram(d);if(null==h){this.context.programs.push("");var i=this.context.programs.length;d.index=i,d.name="program"+i,this.context.programs[i]=e.compile(d,b,this.context,!this.precompile),this.context.decorators[i]=e.decorators,this.context.environments[i]=d,this.useDepths=this.useDepths||e.useDepths,this.useBlockParams=this.useBlockParams||e.useBlockParams,d.useDepths=this.useDepths,d.useBlockParams=this.useBlockParams}else d.index=h.index,d.name="program"+h.index,this.useDepths=this.useDepths||h.useDepths,this.useBlockParams=this.useBlockParams||h.useBlockParams}},matchExistingProgram:function(a){for(var b=0,c=this.context.environments.length;b<c;b++){var d=this.context.environments[b];if(d&&d.equals(a))return d}},programExpression:function(a){var b=this.environment.children[a],c=[b.index,"data",b.blockParams];return(this.useBlockParams||this.useDepths)&&c.push("blockParams"),this.useDepths&&c.push("depths"),"container.program("+c.join(", ")+")"},useRegister:function(a){this.registers[a]||(this.registers[a]=!0,this.registers.list.push(a))},push:function(a){return a instanceof d||(a=this.source.wrap(a)),this.inlineStack.push(a),a},pushStackLiteral:function(a){this.push(new d(a))},pushSource:function(a){this.pendingContent&&(this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent),this.pendingLocation)),this.pendingContent=void 0),a&&this.source.push(a)},replaceStack:function(a){var b=["("],c=void 0,e=void 0,f=void 0;if(!this.isInline())throw new j["default"]("replaceStack on non-inline");var g=this.popStack(!0);if(g instanceof d)c=[g.value],b=["(",c],f=!0;else{e=!0;var h=this.incrStack();b=["((",this.push(h)," = ",g,")"],c=this.topStack()}var i=a.call(this,c);f||this.popStack(),e&&this.stackSlot--,this.push(b.concat(i,")"))},incrStack:function(){return this.stackSlot++,this.stackSlot>this.stackVars.length&&this.stackVars.push("stack"+this.stackSlot),this.topStackName()},topStackName:function(){return"stack"+this.stackSlot},flushInline:function(){var a=this.inlineStack;this.inlineStack=[];for(var b=0,c=a.length;b<c;b++){var e=a[b];if(e instanceof d)this.compileStack.push(e);else{var f=this.incrStack();this.pushSource([f," = ",e,";"]),this.compileStack.push(f)}}},isInline:function(){return this.inlineStack.length},popStack:function(a){var b=this.isInline(),c=(b?this.inlineStack:this.compileStack).pop();if(!a&&c instanceof d)return c.value;if(!b){if(!this.stackSlot)throw new j["default"]("Invalid stack pop");this.stackSlot--}return c},topStack:function(){var a=this.isInline()?this.inlineStack:this.compileStack,b=a[a.length-1];return b instanceof d?b.value:b},contextName:function(a){return this.useDepths&&a?"depths["+a+"]":"depth"+a},quotedString:function(a){return this.source.quotedString(a)},objectLiteral:function(a){return this.source.objectLiteral(a)},aliasable:function(a){var b=this.aliases[a];return b?(b.referenceCount++,b):(b=this.aliases[a]=this.source.wrap(a),b.aliasable=!0,b.referenceCount=1,b)},setupHelper:function(a,b,c){var d=[],e=this.setupHelperArgs(b,a,d,c),f=this.nameLookup("helpers",b,"helper"),g=this.aliasable(this.contextName(0)+" != null ? "+this.contextName(0)+" : (container.nullContext || {})");return{params:d,paramsInit:e,name:f,callParams:[g].concat(d)}},setupParams:function(a,b,c){var d={},e=[],f=[],g=[],h=!c,i=void 0;h&&(c=[]),d.name=this.quotedString(a),d.hash=this.popStack(),this.trackIds&&(d.hashIds=this.popStack()),this.stringParams&&(d.hashTypes=this.popStack(),d.hashContexts=this.popStack());var j=this.popStack(),k=this.popStack();(k||j)&&(d.fn=k||"container.noop",d.inverse=j||"container.noop");for(var l=b;l--;)i=this.popStack(),c[l]=i,this.trackIds&&(g[l]=this.popStack()),this.stringParams&&(f[l]=this.popStack(),e[l]=this.popStack());return h&&(d.args=this.source.generateArray(c)),this.trackIds&&(d.ids=this.source.generateArray(g)),this.stringParams&&(d.types=this.source.generateArray(f),d.contexts=this.source.generateArray(e)),this.options.data&&(d.data="data"),this.useBlockParams&&(d.blockParams="blockParams"),d},setupHelperArgs:function(a,b,c,d){var e=this.setupParams(a,b,c);return e=this.objectLiteral(e),d?(this.useRegister("options"),c.push("options"),["options=",e]):c?(c.push(e),""):e}},function(){for(var a="break else new var case finally return void catch for switch while continue function this with default if throw delete in try do instanceof typeof abstract enum int short boolean export interface static byte extends long super char final native synchronized class float package throws const goto private transient debugger implements protected volatile double import public let yield await null true false".split(" "),b=e.RESERVED_WORDS={},c=0,d=a.length;c<d;c++)b[a[c]]=!0}(),e.isValidJavaScriptVariableName=function(a){return!e.RESERVED_WORDS[a]&&/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(a)},b["default"]=e,a.exports=b["default"]},function(a,b,c){"use strict";function d(a,b,c){if(f.isArray(a)){for(var d=[],e=0,g=a.length;e<g;e++)d.push(b.wrap(a[e],c));return d}return"boolean"==typeof a||"number"==typeof a?a+"":a}function e(a){this.srcFile=a,this.source=[]}b.__esModule=!0;var f=c(5),g=void 0;try{}catch(h){}g||(g=function(a,b,c,d){this.src="",d&&this.add(d)},g.prototype={add:function(a){f.isArray(a)&&(a=a.join("")),this.src+=a},prepend:function(a){f.isArray(a)&&(a=a.join("")),this.src=a+this.src},toStringWithSourceMap:function(){return{code:this.toString()}},toString:function(){return this.src}}),e.prototype={isEmpty:function(){return!this.source.length},prepend:function(a,b){this.source.unshift(this.wrap(a,b))},push:function(a,b){this.source.push(this.wrap(a,b))},merge:function(){var a=this.empty();return this.each(function(b){a.add(["  ",b,"\n"])}),a},each:function(a){for(var b=0,c=this.source.length;b<c;b++)a(this.source[b])},empty:function(){var a=this.currentLocation||{start:{}};return new g(a.start.line,a.start.column,this.srcFile)},wrap:function(a){var b=arguments.length<=1||void 0===arguments[1]?this.currentLocation||{start:{}}:arguments[1];return a instanceof g?a:(a=d(a,this,b),new g(b.start.line,b.start.column,this.srcFile,a))},functionCall:function(a,b,c){return c=this.generateList(c),this.wrap([a,b?"."+b+"(":"(",c,")"])},quotedString:function(a){return'"'+(a+"").replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")+'"'},objectLiteral:function(a){var b=[];for(var c in a)if(a.hasOwnProperty(c)){var e=d(a[c],this);"undefined"!==e&&b.push([this.quotedString(c),":",e])}var f=this.generateList(b);return f.prepend("{"),f.add("}"),f},generateList:function(a){for(var b=this.empty(),c=0,e=a.length;c<e;c++)c&&b.add(","),b.add(d(a[c],this));return b},generateArray:function(a){var b=this.generateList(a);return b.prepend("["),b.add("]"),b}},b["default"]=e,a.exports=b["default"]}])});
},{}],29:[function(require,module,exports){
/**
 * Creates attribute policy object
 * @module attribute-policy-builder
 */

/**
 * @param {string} attrName An attribute name
 * @param {string} tagName A tag name
 * @param {Object} valuePolicy An attribute value policy object
 * @returns {Object} An attribute policy object
 */
module.exports = function buildAttributePolicy(attrName, tagName, valuePolicy) {
    var policy = {
        attr: attrName.toLowerCase()
    };
    if (tagName) {
        policy.tag = tagName.toLowerCase();
    }
    if (valuePolicy) {
        policy.valuePolicy = valuePolicy;
    }

    return policy;
};

},{}],30:[function(require,module,exports){
/**
 * Implements sanitizer interface by adapting insane HTML sanitizer interface
 * @module insane-adapter
 */

var insane = require('insane');
var configBuilder = require('./insane-config-builder');

/**
 * Creates a sanitizer function
 * @param {Object} config A normalized sanitizer configuration object
 * @returns {Function} A function which takes HTML as a string and sanitizes it according to the provided configuration
 */
module.exports = function create(config) {
    var insaneConfig = configBuilder(config);

    return function sanitize(htmlStr) {
        return insane(htmlStr, insaneConfig, true);
    };
};

},{"./insane-config-builder":31,"insane":37}],31:[function(require,module,exports){
/**
 * Adapts normalized sanitizer configuration to insane-specific one
 * @module insane-config-builder
 */

var attrPolicyBuilder = require('./attribute-policy-builder');
var isDefined = require('./utils').isDefined;

/**
 * Converts attribute value to a string. Null and undefined values converted to an empty string.
 * 
 * @private
 * @param {*} value An attribute value
 * @returns Normalized value
 */
function normalizeAttrValue(value) {
    return isDefined(value) ? String(value) : '';
}

/**
 * Takes attributes from a token object and looks for an attribute name in case insensitive manner
 * 
 * @private
 * @param {string} attr An attribute name
 * @param {object} token A token object provided by insane library
 * @returns {string|undefined} Original attribute name if found, undefined otherwise
 */
function getAttrNameFromToken(attr, token) {
    var origAttrNames = Object.keys(token.attrs);
    var normalizedAttrNames = origAttrNames.map(function (attrName) {
        return attrName.toLowerCase();
    });
    var attrPositionInList = normalizedAttrNames.indexOf(attr);

    return attrPositionInList > -1 ? origAttrNames[attrPositionInList] : undefined;
}

/**
 * Converts list of tag policies to just tag names
 * @private
 * @param {object[]} tagPolicies A list of tag policies
 * @returns {string[]} A list of tag names
 */
function convertTagPoliciesToTags(tagPolicies) {
    return tagPolicies.map(function (policy) {
        return policy.name.toLowerCase();
    });
}

/**
 * Converts a list of attribute policies to an allowed attribute config object
 * 
 * @private
 * @param {object[]} attrPolicies A list of attribute policies
 * @param {string[]} tags A list of tag names. They are used to convert global attribute policies.
 * @returns {object} An allowed attribute config object insane library expects
 */
function convertAttrPoliciesToAttrOptions(attrPolicies, tags) {
    var globalPolicies = attrPolicies.global.reduce(function (policies, globalPolicy) {
        var taggedPolicies = tags.map(function (tag) {
            return attrPolicyBuilder(globalPolicy.attr, tag, globalPolicy.valuePolicy);
        });
        return policies.concat(taggedPolicies);
    }, []);

    return attrPolicies.tagSpecific.concat(globalPolicies).reduce(function (config, policy) {
        var tagAttrConfig = config[policy.tag];
        var attrName = policy.attr;

        if (!tagAttrConfig) {
            tagAttrConfig = config[policy.tag] = [];
        }
        if (tagAttrConfig.indexOf(attrName) === -1) {
            tagAttrConfig.push(attrName);
        }

        return config;
    }, {});
}

/**
 * Converts a list of attribute policies which have value policy to a list of functions that apply
 * those policies
 *
 * @private
 * @param {object} attrPolicies An attribute policies object
 * @returns {Function[]} A list of functions which apply attribute value policies
 */
function convertAttrPoliciesToFilters(attrPolicies) {
    return attrPolicies.tagSpecific.concat(attrPolicies.global).filter(function (policy) {
        var filter = policy.valuePolicy;
        return filter && isDefined(filter.values);
    }).map(function (policy) {
        var tag = policy.tag;
        var attr = policy.attr;
        var filter = policy.valuePolicy;
        var ignoreCase = filter.ignoreCase !== false;
        var possibleValues = [].concat(filter.values).map(function (value) {
            var strValue = normalizeAttrValue(value);
            return ignoreCase ? strValue.toLowerCase() : strValue;
        });

        return function filterAttrByValue(token) {
            var rawAttrName = getAttrNameFromToken(attr, token);
            var attrValue = normalizeAttrValue(token.attrs[rawAttrName]);
            var value = ignoreCase ? attrValue.toLowerCase() : attrValue;

            if ((!tag || token.tag === tag) && rawAttrName) {
                if (possibleValues.indexOf(value) === -1) {
                    delete token.attrs[rawAttrName];
                }
            }
            return true; // don't remove element itself
        };
    });
}

/**
 * Createa a function which adds rel="nofollow noopener noreferrer" attribute to anchor tags
 *
 * @private
 * @returns {Function}
 */
function createNofollowFilter() {
    return function noFollowFilter(token) {
        var relAttr = getAttrNameFromToken('rel', token);
        var relValue = token.attrs[relAttr];

        if (token.tag === 'a') {
            if (!relAttr) {
                relAttr = 'rel';
            }

            if (!isDefined(relValue)) {
                relValue = '';
            }
            token.attrs[relAttr] = relValue + (relValue.length ? ' ' : '') + 'nofollow noopener noreferrer';
        }

        return true;
    };
}

/**
 * Accepts normalized sanitizer configuration object and builds insane-specific one
 *
 * @param {object} config A normalized sanitizer configuration object
 * @returns {object} insane-specific config object
 */
module.exports = function build(config) {
    var insaneConfig = {};

    var tags = convertTagPoliciesToTags(config.tagPolicies);
    var attrs = convertAttrPoliciesToAttrOptions(config.attrPolicies, tags);
    var filters = convertAttrPoliciesToFilters(config.attrPolicies);

    if (config.requireNofollowOnAnchors) {
        filters.push(createNofollowFilter());
    }

    insaneConfig.allowedTags = tags;
    insaneConfig.allowedAttributes = attrs;
    insaneConfig.allowedSchemes = config.urlProtocols;

    if (filters.length) {
        insaneConfig.filter = function runAllFilters(token) {
            return filters.reduce(function (proceed, filterFunc) {
                return proceed ? filterFunc(token) : false;
            }, true);
        };
    }

    return insaneConfig;
};

},{"./attribute-policy-builder":29,"./utils":33}],32:[function(require,module,exports){
/**
 * Whitelist based HTML sanitizer
 * @module sanitizer
 */
var attrPolicyBuilder = require('./attribute-policy-builder');
var isDefined = require('./utils').isDefined;
var sanitizer = require('./insane-adapter');

/**
 * Extracts tag policies from the sanitizer configuration
 * @private
 * @param {SanitizerConfig} config A configuration object
 * @returns {object[]} A list of tag policies
 */
function getTagPolicies(config) {
    var tags = isDefined(config.elements) ? [].concat(config.elements) : [];

    return tags.filter(function (tag) {
        return typeof tag === 'string';
    }).map(function (tag) {
        return {
            name: tag.toLowerCase()
        };
    });
}

/**
 * Extracts attribute policies from the sanitizer configuration
 * @private
 * @param {SanitizerConfig} config A configuration object
 * @returns {object} An attribute policies object which holds global and tag-specific policies
 */
function getAttrPolicies(config) {
    var attributes = isDefined(config.attributes) ? [].concat(config.attributes) : [];
    var policies = {
        global: [],
        tagSpecific: []
    };

    attributes.filter(function (attrConfig) {
        return isDefined(attrConfig.names);
    }).forEach(function (attrConfig) {
        var onElements = isDefined(attrConfig.on) ? [].concat(attrConfig.on) : [];

        [].concat(attrConfig.names).filter(function (attrName) {
            return typeof attrName === 'string';
        }).forEach(function (attrName) {
            if (onElements.length > 0) {
                onElements.forEach(function (tagName) {
                    policies.tagSpecific.push(attrPolicyBuilder(attrName, tagName, attrConfig.matching));
                });
            } else {
                policies.global.push(attrPolicyBuilder(attrName, null, attrConfig.matching));
            }
        });
    });

    return policies;
}

/**
 * Whitelist sanitizer configurtion object
 * @typedef SanitizerConfig
 * @type {object}
 * @property {string[]} elements A list of allowed tags. Example ['a', 'div', 'ol'].
 * @property {AttributePolicy[]} attributes A list of attribute policies
 * @property {string[]} urlProtocols A list of allowed protocols in URL-aware attributes (such as src, href, etc)
 * @property {boolean} [requireRelNofollowOnLinks=true] Defines whether rel="nofollow" attribute should put on "a" tags
 *
 * Attribute policy object
 * @typedef AttributePolicy
 * @type {object}
 * @property {string[]} names A list of allowed attributes. Example: ['class', 'src', 'width', 'height']
 * @property {string[]} [on] A list of tags the attributes are allowed on. If it's not specified then
 * attributes are allowed globally, i.e. on every allowed tag.
 * @property {AttrValuePolicy} [matching] An attribute value policy. If it's not specified attributes
 * with any value are allowed.
 *
 * Attribute value police object
 * @typedef AttrValuePolicy
 * @type {object}
 * @property {boolean} [ignoreCase=true] If true, the case will be ignored in value comparison
 * @property {string[]} values A list of possible values an attribute may have
 */

/**
 * Converts a sanitizer configuration object to an object used internally
 * @private
 * @param {SanitizerConfig} config A configuration object
 * @returns {object} A normalized configuration object
 */
function normalizeConfig(config) {
    var _config = typeof config === 'object' ? config : {};
    var normalConfig = {};

    normalConfig.tagPolicies = getTagPolicies(_config);
    normalConfig.attrPolicies = getAttrPolicies(_config);
    normalConfig.urlProtocols = _config.urlProtocols;
    normalConfig.requireNofollowOnAnchors = _config.requireRelNofollowOnLinks !== false;

    return normalConfig;
}

/**
 * Creates a reusable function which can be used to sanitize HTML
 * @param {SanitizerConfig} config A configuration that defines whitelist sanitizer policies
 * @returns {Function} A function which takes HTML as a string and sanitizes it according to the provided configuration
 */
function create(config) {
    var normalConfig = normalizeConfig(config);

    return sanitizer(normalConfig);
}

module.exports = {
    create: create
};

},{"./attribute-policy-builder":29,"./insane-adapter":30,"./utils":33}],33:[function(require,module,exports){
function isDefined(value) {
    return value !== undefined && value !== null;
}

module.exports = {
    isDefined: isDefined
};

},{}],34:[function(require,module,exports){
'use strict';

var toMap = require('./toMap');
var uris = ['background', 'base', 'cite', 'href', 'longdesc', 'src', 'usemap'];

module.exports = {
  uris: toMap(uris) // attributes that have an href and hence need to be sanitized
};

},{"./toMap":43}],35:[function(require,module,exports){
'use strict';

var defaults = {
  allowedAttributes: {
    a: ['href', 'name', 'target', 'title', 'aria-label'],
    iframe: ['allowfullscreen', 'frameborder', 'src'],
    img: ['src', 'alt', 'title', 'aria-label']
  },
  allowedClasses: {},
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedTags: [
    'a', 'abbr', 'article', 'b', 'blockquote', 'br', 'caption', 'code', 'del', 'details', 'div', 'em',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'main', 'mark',
    'ol', 'p', 'pre', 'section', 'span', 'strike', 'strong', 'sub', 'summary', 'sup', 'table',
    'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul'
  ],
  filter: null
};

module.exports = defaults;

},{}],36:[function(require,module,exports){
'use strict';

var toMap = require('./toMap');
var voids = ['area', 'br', 'col', 'hr', 'img', 'wbr', 'input', 'base', 'basefont', 'link', 'meta'];

module.exports = {
  voids: toMap(voids)
};

},{"./toMap":43}],37:[function(require,module,exports){
'use strict';

var he = require('he');
var assign = require('assignment');
var parser = require('./parser');
var sanitizer = require('./sanitizer');
var defaults = require('./defaults');

function insane (html, options, strict) {
  var buffer = [];
  var configuration = strict === true ? options : assign({}, defaults, options);
  var handler = sanitizer(buffer, configuration);

  parser(html, handler);

  return buffer.join('');
}

insane.defaults = defaults;
module.exports = insane;

},{"./defaults":35,"./parser":40,"./sanitizer":41,"assignment":39,"he":42}],38:[function(require,module,exports){
'use strict';

module.exports = function lowercase (string) {
  return typeof string === 'string' ? string.toLowerCase() : string;
};

},{}],39:[function(require,module,exports){
'use strict';

function assignment (result) {
  var stack = Array.prototype.slice.call(arguments, 1);
  var item;
  var key;
  while (stack.length) {
    item = stack.shift();
    for (key in item) {
      if (item.hasOwnProperty(key)) {
        if (Object.prototype.toString.call(result[key]) === '[object Object]') {
          result[key] = assignment(result[key], item[key]);
        } else {
          result[key] = item[key];
        }
      }
    }
  }
  return result;
}

module.exports = assignment;

},{}],40:[function(require,module,exports){
'use strict';

var he = require('he');
var lowercase = require('./lowercase');
var attributes = require('./attributes');
var elements = require('./elements');
var rstart = /^<\s*([\w:-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)\s*>/;
var rend = /^<\s*\/\s*([\w:-]+)[^>]*>/;
var rattrs = /([\w:-]+)(?:\s*=\s*(?:(?:"((?:[^"])*)")|(?:'((?:[^'])*)')|([^>\s]+)))?/g;
var rtag = /^</;
var rtagend = /^<\s*\//;

function createStack () {
  var stack = [];
  stack.lastItem = function lastItem () {
    return stack[stack.length - 1];
  };
  return stack;
}

function parser (html, handler) {
  var stack = createStack();
  var last = html;
  var chars;

  while (html) {
    parsePart();
  }
  parseEndTag(); // clean up any remaining tags

  function parsePart () {
    chars = true;
    parseTag();

    var same = html === last;
    last = html;

    if (same) { // discard, because it's invalid
      html = '';
    }
  }

  function parseTag () {
    if (html.substr(0, 4) === '<!--') { // comments
      parseComment();
    } else if (rtagend.test(html)) {
      parseEdge(rend, parseEndTag);
    } else if (rtag.test(html)) {
      parseEdge(rstart, parseStartTag);
    }
    parseTagDecode();
  }

  function parseEdge (regex, parser) {
    var match = html.match(regex);
    if (match) {
      html = html.substring(match[0].length);
      match[0].replace(regex, parser);
      chars = false;
    }
  }

  function parseComment () {
    var index = html.indexOf('-->');
    if (index >= 0) {
      if (handler.comment) {
        handler.comment(html.substring(4, index));
      }
      html = html.substring(index + 3);
      chars = false;
    }
  }

  function parseTagDecode () {
    if (!chars) {
      return;
    }
    var text;
    var index = html.indexOf('<');
    if (index >= 0) {
      text = html.substring(0, index);
      html = html.substring(index);
    } else {
      text = html;
      html = '';
    }
    if (handler.chars) {
      handler.chars(text);
    }
  }

  function parseStartTag (tag, tagName, rest, unary) {
    var attrs = {};
    var low = lowercase(tagName);
    var u = elements.voids[low] || !!unary;

    rest.replace(rattrs, attrReplacer);

    if (!u) {
      stack.push(low);
    }
    if (handler.start) {
      handler.start(low, attrs, u);
    }

    function attrReplacer (match, name, doubleQuotedValue, singleQuotedValue, unquotedValue) {
      if (doubleQuotedValue === void 0 && singleQuotedValue === void 0 && unquotedValue === void 0) {
        attrs[name] = void 0; // attribute is like <button disabled></button>
      } else {
        attrs[name] = he.decode(doubleQuotedValue || singleQuotedValue || unquotedValue || '');
      }
    }
  }

  function parseEndTag (tag, tagName) {
    var i;
    var pos = 0;
    var low = lowercase(tagName);
    if (low) {
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos] === low) {
          break; // find the closest opened tag of the same type
        }
      }
    }
    if (pos >= 0) {
      for (i = stack.length - 1; i >= pos; i--) {
        if (handler.end) { // close all the open elements, up the stack
          handler.end(stack[i]);
        }
      }
      stack.length = pos;
    }
  }
}

module.exports = parser;

},{"./attributes":34,"./elements":36,"./lowercase":38,"he":42}],41:[function(require,module,exports){
'use strict';

var he = require('he');
var lowercase = require('./lowercase');
var attributes = require('./attributes');
var elements = require('./elements');

function sanitizer (buffer, options) {
  var last;
  var context;
  var o = options || {};

  reset();

  return {
    start: start,
    end: end,
    chars: chars
  };

  function out (value) {
    buffer.push(value);
  }

  function start (tag, attrs, unary) {
    var low = lowercase(tag);

    if (context.ignoring) {
      ignore(low); return;
    }
    if ((o.allowedTags || []).indexOf(low) === -1) {
      ignore(low); return;
    }
    if (o.filter && !o.filter({ tag: low, attrs: attrs })) {
      ignore(low); return;
    }

    out('<');
    out(low);
    Object.keys(attrs).forEach(parse);
    out(unary ? '/>' : '>');

    function parse (key) {
      var value = attrs[key];
      var classesOk = (o.allowedClasses || {})[low] || [];
      var attrsOk = (o.allowedAttributes || {})[low] || [];
      var valid;
      var lkey = lowercase(key);
      if (lkey === 'class' && attrsOk.indexOf(lkey) === -1) {
        value = value.split(' ').filter(isValidClass).join(' ').trim();
        valid = value.length;
      } else {
        valid = attrsOk.indexOf(lkey) !== -1 && (attributes.uris[lkey] !== true || testUrl(value));
      }
      if (valid) {
        out(' ');
        out(key);
        if (typeof value === 'string') {
          out('="');
          out(he.encode(value));
          out('"');
        }
      }
      function isValidClass (className) {
        return classesOk && classesOk.indexOf(className) !== -1;
      }
    }
  }

  function end (tag) {
    var low = lowercase(tag);
    var allowed = (o.allowedTags || []).indexOf(low) !== -1;
    if (allowed) {
      if (context.ignoring === false) {
        out('</');
        out(low);
        out('>');
      } else {
        unignore(low);
      }
    } else {
      unignore(low);
    }
  }

  function testUrl (text) {
    var start = text[0];
    if (start === '#' || start === '/') {
      return true;
    }
    var colon = text.indexOf(':');
    if (colon === -1) {
      return true;
    }
    var questionmark = text.indexOf('?');
    if (questionmark !== -1 && colon > questionmark) {
      return true;
    }
    var hash = text.indexOf('#');
    if (hash !== -1 && colon > hash) {
      return true;
    }
    return o.allowedSchemes.some(matches);

    function matches (scheme) {
      return text.indexOf(scheme + ':') === 0;
    }
  }

  function chars (text) {
    if (context.ignoring === false) {
      out(o.transformText ? o.transformText(text) : text);
    }
  }

  function ignore (tag) {
    if (elements.voids[tag]) {
      return;
    }
    if (context.ignoring === false) {
      context = { ignoring: tag, depth: 1 };
    } else if (context.ignoring === tag) {
      context.depth++;
    }
  }

  function unignore (tag) {
    if (context.ignoring === tag) {
      if (--context.depth <= 0) {
        reset();
      }
    }
  }

  function reset () {
    context = { ignoring: false, depth: 0 };
  }
}

module.exports = sanitizer;

},{"./attributes":34,"./elements":36,"./lowercase":38,"he":42}],42:[function(require,module,exports){
'use strict';

var escapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};
var unescapes = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'"
};
var rescaped = /(&amp;|&lt;|&gt;|&quot;|&#39;)/g;
var runescaped = /[&<>"']/g;

function escapeHtmlChar (match) {
  return escapes[match];
}
function unescapeHtmlChar (match) {
  return unescapes[match];
}

function escapeHtml (text) {
  return text == null ? '' : String(text).replace(runescaped, escapeHtmlChar);
}

function unescapeHtml (html) {
  return html == null ? '' : String(html).replace(rescaped, unescapeHtmlChar);
}

escapeHtml.options = unescapeHtml.options = {};

module.exports = {
  encode: escapeHtml,
  escape: escapeHtml,
  decode: unescapeHtml,
  unescape: unescapeHtml,
  version: '1.0.0-browser'
};

},{}],43:[function(require,module,exports){
'use strict';

function toMap (list) {
  return list.reduce(asKey, {});
}

function asKey (accumulator, item) {
  accumulator[item] = true;
  return accumulator;
}

module.exports = toMap;

},{}],44:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var DataView = getNative(root, 'DataView');

module.exports = DataView;

},{"./_getNative":111,"./_root":152}],45:[function(require,module,exports){
var hashClear = require('./_hashClear'),
    hashDelete = require('./_hashDelete'),
    hashGet = require('./_hashGet'),
    hashHas = require('./_hashHas'),
    hashSet = require('./_hashSet');

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

module.exports = Hash;

},{"./_hashClear":118,"./_hashDelete":119,"./_hashGet":120,"./_hashHas":121,"./_hashSet":122}],46:[function(require,module,exports){
var listCacheClear = require('./_listCacheClear'),
    listCacheDelete = require('./_listCacheDelete'),
    listCacheGet = require('./_listCacheGet'),
    listCacheHas = require('./_listCacheHas'),
    listCacheSet = require('./_listCacheSet');

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

module.exports = ListCache;

},{"./_listCacheClear":133,"./_listCacheDelete":134,"./_listCacheGet":135,"./_listCacheHas":136,"./_listCacheSet":137}],47:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map');

module.exports = Map;

},{"./_getNative":111,"./_root":152}],48:[function(require,module,exports){
var mapCacheClear = require('./_mapCacheClear'),
    mapCacheDelete = require('./_mapCacheDelete'),
    mapCacheGet = require('./_mapCacheGet'),
    mapCacheHas = require('./_mapCacheHas'),
    mapCacheSet = require('./_mapCacheSet');

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

module.exports = MapCache;

},{"./_mapCacheClear":138,"./_mapCacheDelete":139,"./_mapCacheGet":140,"./_mapCacheHas":141,"./_mapCacheSet":142}],49:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Promise = getNative(root, 'Promise');

module.exports = Promise;

},{"./_getNative":111,"./_root":152}],50:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var Set = getNative(root, 'Set');

module.exports = Set;

},{"./_getNative":111,"./_root":152}],51:[function(require,module,exports){
var ListCache = require('./_ListCache'),
    stackClear = require('./_stackClear'),
    stackDelete = require('./_stackDelete'),
    stackGet = require('./_stackGet'),
    stackHas = require('./_stackHas'),
    stackSet = require('./_stackSet');

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

module.exports = Stack;

},{"./_ListCache":46,"./_stackClear":156,"./_stackDelete":157,"./_stackGet":158,"./_stackHas":159,"./_stackSet":160}],52:[function(require,module,exports){
var root = require('./_root');

/** Built-in value references. */
var Symbol = root.Symbol;

module.exports = Symbol;

},{"./_root":152}],53:[function(require,module,exports){
var root = require('./_root');

/** Built-in value references. */
var Uint8Array = root.Uint8Array;

module.exports = Uint8Array;

},{"./_root":152}],54:[function(require,module,exports){
var getNative = require('./_getNative'),
    root = require('./_root');

/* Built-in method references that are verified to be native. */
var WeakMap = getNative(root, 'WeakMap');

module.exports = WeakMap;

},{"./_getNative":111,"./_root":152}],55:[function(require,module,exports){
/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

module.exports = apply;

},{}],56:[function(require,module,exports){
/**
 * A specialized version of `_.forEach` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

module.exports = arrayEach;

},{}],57:[function(require,module,exports){
/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

module.exports = arrayFilter;

},{}],58:[function(require,module,exports){
var baseTimes = require('./_baseTimes'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isBuffer = require('./isBuffer'),
    isIndex = require('./_isIndex'),
    isTypedArray = require('./isTypedArray');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = arrayLikeKeys;

},{"./_baseTimes":86,"./_isIndex":127,"./isArguments":170,"./isArray":171,"./isBuffer":174,"./isTypedArray":183}],59:[function(require,module,exports){
/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

module.exports = arrayMap;

},{}],60:[function(require,module,exports){
/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

module.exports = arrayPush;

},{}],61:[function(require,module,exports){
var baseAssignValue = require('./_baseAssignValue'),
    eq = require('./eq');

/**
 * This function is like `assignValue` except that it doesn't assign
 * `undefined` values.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignMergeValue(object, key, value) {
  if ((value !== undefined && !eq(object[key], value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

module.exports = assignMergeValue;

},{"./_baseAssignValue":66,"./eq":167}],62:[function(require,module,exports){
var baseAssignValue = require('./_baseAssignValue'),
    eq = require('./eq');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

module.exports = assignValue;

},{"./_baseAssignValue":66,"./eq":167}],63:[function(require,module,exports){
var eq = require('./eq');

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

module.exports = assocIndexOf;

},{"./eq":167}],64:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    keys = require('./keys');

/**
 * The base implementation of `_.assign` without support for multiple sources
 * or `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return object && copyObject(source, keys(source), object);
}

module.exports = baseAssign;

},{"./_copyObject":98,"./keys":184}],65:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    keysIn = require('./keysIn');

/**
 * The base implementation of `_.assignIn` without support for multiple sources
 * or `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssignIn(object, source) {
  return object && copyObject(source, keysIn(source), object);
}

module.exports = baseAssignIn;

},{"./_copyObject":98,"./keysIn":185}],66:[function(require,module,exports){
var defineProperty = require('./_defineProperty');

/**
 * The base implementation of `assignValue` and `assignMergeValue` without
 * value checks.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function baseAssignValue(object, key, value) {
  if (key == '__proto__' && defineProperty) {
    defineProperty(object, key, {
      'configurable': true,
      'enumerable': true,
      'value': value,
      'writable': true
    });
  } else {
    object[key] = value;
  }
}

module.exports = baseAssignValue;

},{"./_defineProperty":105}],67:[function(require,module,exports){
var Stack = require('./_Stack'),
    arrayEach = require('./_arrayEach'),
    assignValue = require('./_assignValue'),
    baseAssign = require('./_baseAssign'),
    baseAssignIn = require('./_baseAssignIn'),
    cloneBuffer = require('./_cloneBuffer'),
    copyArray = require('./_copyArray'),
    copySymbols = require('./_copySymbols'),
    copySymbolsIn = require('./_copySymbolsIn'),
    getAllKeys = require('./_getAllKeys'),
    getAllKeysIn = require('./_getAllKeysIn'),
    getTag = require('./_getTag'),
    initCloneArray = require('./_initCloneArray'),
    initCloneByTag = require('./_initCloneByTag'),
    initCloneObject = require('./_initCloneObject'),
    isArray = require('./isArray'),
    isBuffer = require('./isBuffer'),
    isMap = require('./isMap'),
    isObject = require('./isObject'),
    isSet = require('./isSet'),
    keys = require('./keys');

/** Used to compose bitmasks for cloning. */
var CLONE_DEEP_FLAG = 1,
    CLONE_FLAT_FLAG = 2,
    CLONE_SYMBOLS_FLAG = 4;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values supported by `_.clone`. */
var cloneableTags = {};
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
cloneableTags[boolTag] = cloneableTags[dateTag] =
cloneableTags[float32Tag] = cloneableTags[float64Tag] =
cloneableTags[int8Tag] = cloneableTags[int16Tag] =
cloneableTags[int32Tag] = cloneableTags[mapTag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag] = cloneableTags[setTag] =
cloneableTags[stringTag] = cloneableTags[symbolTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag] = cloneableTags[funcTag] =
cloneableTags[weakMapTag] = false;

/**
 * The base implementation of `_.clone` and `_.cloneDeep` which tracks
 * traversed objects.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Deep clone
 *  2 - Flatten inherited properties
 *  4 - Clone symbols
 * @param {Function} [customizer] The function to customize cloning.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The parent object of `value`.
 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, bitmask, customizer, key, object, stack) {
  var result,
      isDeep = bitmask & CLONE_DEEP_FLAG,
      isFlat = bitmask & CLONE_FLAT_FLAG,
      isFull = bitmask & CLONE_SYMBOLS_FLAG;

  if (customizer) {
    result = object ? customizer(value, key, object, stack) : customizer(value);
  }
  if (result !== undefined) {
    return result;
  }
  if (!isObject(value)) {
    return value;
  }
  var isArr = isArray(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) {
      return copyArray(value, result);
    }
  } else {
    var tag = getTag(value),
        isFunc = tag == funcTag || tag == genTag;

    if (isBuffer(value)) {
      return cloneBuffer(value, isDeep);
    }
    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      result = (isFlat || isFunc) ? {} : initCloneObject(value);
      if (!isDeep) {
        return isFlat
          ? copySymbolsIn(value, baseAssignIn(result, value))
          : copySymbols(value, baseAssign(result, value));
      }
    } else {
      if (!cloneableTags[tag]) {
        return object ? value : {};
      }
      result = initCloneByTag(value, tag, isDeep);
    }
  }
  // Check for circular references and return its corresponding clone.
  stack || (stack = new Stack);
  var stacked = stack.get(value);
  if (stacked) {
    return stacked;
  }
  stack.set(value, result);

  if (isSet(value)) {
    value.forEach(function(subValue) {
      result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
    });
  } else if (isMap(value)) {
    value.forEach(function(subValue, key) {
      result.set(key, baseClone(subValue, bitmask, customizer, key, value, stack));
    });
  }

  var keysFunc = isFull
    ? (isFlat ? getAllKeysIn : getAllKeys)
    : (isFlat ? keysIn : keys);

  var props = isArr ? undefined : keysFunc(value);
  arrayEach(props || value, function(subValue, key) {
    if (props) {
      key = subValue;
      subValue = value[key];
    }
    // Recursively populate clone (susceptible to call stack limits).
    assignValue(result, key, baseClone(subValue, bitmask, customizer, key, value, stack));
  });
  return result;
}

module.exports = baseClone;

},{"./_Stack":51,"./_arrayEach":56,"./_assignValue":62,"./_baseAssign":64,"./_baseAssignIn":65,"./_cloneBuffer":92,"./_copyArray":97,"./_copySymbols":99,"./_copySymbolsIn":100,"./_getAllKeys":108,"./_getAllKeysIn":109,"./_getTag":116,"./_initCloneArray":123,"./_initCloneByTag":124,"./_initCloneObject":125,"./isArray":171,"./isBuffer":174,"./isMap":177,"./isObject":178,"./isSet":181,"./keys":184}],68:[function(require,module,exports){
var isObject = require('./isObject');

/** Built-in value references. */
var objectCreate = Object.create;

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} proto The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(proto) {
    if (!isObject(proto)) {
      return {};
    }
    if (objectCreate) {
      return objectCreate(proto);
    }
    object.prototype = proto;
    var result = new object;
    object.prototype = undefined;
    return result;
  };
}());

module.exports = baseCreate;

},{"./isObject":178}],69:[function(require,module,exports){
var arrayPush = require('./_arrayPush'),
    isFlattenable = require('./_isFlattenable');

/**
 * The base implementation of `_.flatten` with support for restricting flattening.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {number} depth The maximum recursion depth.
 * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
 * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, depth, predicate, isStrict, result) {
  var index = -1,
      length = array.length;

  predicate || (predicate = isFlattenable);
  result || (result = []);

  while (++index < length) {
    var value = array[index];
    if (depth > 0 && predicate(value)) {
      if (depth > 1) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, depth - 1, predicate, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

module.exports = baseFlatten;

},{"./_arrayPush":60,"./_isFlattenable":126}],70:[function(require,module,exports){
var createBaseFor = require('./_createBaseFor');

/**
 * The base implementation of `baseForOwn` which iterates over `object`
 * properties returned by `keysFunc` and invokes `iteratee` for each property.
 * Iteratee functions may exit iteration early by explicitly returning `false`.
 *
 * @private
 * @param {Object} object The object to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @returns {Object} Returns `object`.
 */
var baseFor = createBaseFor();

module.exports = baseFor;

},{"./_createBaseFor":103}],71:[function(require,module,exports){
var castPath = require('./_castPath'),
    toKey = require('./_toKey');

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = castPath(path, object);

  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return (index && index == length) ? object : undefined;
}

module.exports = baseGet;

},{"./_castPath":90,"./_toKey":162}],72:[function(require,module,exports){
var arrayPush = require('./_arrayPush'),
    isArray = require('./isArray');

/**
 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @param {Function} symbolsFunc The function to get the symbols of `object`.
 * @returns {Array} Returns the array of property names and symbols.
 */
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
}

module.exports = baseGetAllKeys;

},{"./_arrayPush":60,"./isArray":171}],73:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    getRawTag = require('./_getRawTag'),
    objectToString = require('./_objectToString');

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

module.exports = baseGetTag;

},{"./_Symbol":52,"./_getRawTag":113,"./_objectToString":148}],74:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

module.exports = baseIsArguments;

},{"./_baseGetTag":73,"./isObjectLike":179}],75:[function(require,module,exports){
var getTag = require('./_getTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var mapTag = '[object Map]';

/**
 * The base implementation of `_.isMap` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
 */
function baseIsMap(value) {
  return isObjectLike(value) && getTag(value) == mapTag;
}

module.exports = baseIsMap;

},{"./_getTag":116,"./isObjectLike":179}],76:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isMasked = require('./_isMasked'),
    isObject = require('./isObject'),
    toSource = require('./_toSource');

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

module.exports = baseIsNative;

},{"./_isMasked":131,"./_toSource":163,"./isFunction":175,"./isObject":178}],77:[function(require,module,exports){
var getTag = require('./_getTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var setTag = '[object Set]';

/**
 * The base implementation of `_.isSet` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
 */
function baseIsSet(value) {
  return isObjectLike(value) && getTag(value) == setTag;
}

module.exports = baseIsSet;

},{"./_getTag":116,"./isObjectLike":179}],78:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isLength = require('./isLength'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

module.exports = baseIsTypedArray;

},{"./_baseGetTag":73,"./isLength":176,"./isObjectLike":179}],79:[function(require,module,exports){
var isPrototype = require('./_isPrototype'),
    nativeKeys = require('./_nativeKeys');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

module.exports = baseKeys;

},{"./_isPrototype":132,"./_nativeKeys":145}],80:[function(require,module,exports){
var isObject = require('./isObject'),
    isPrototype = require('./_isPrototype'),
    nativeKeysIn = require('./_nativeKeysIn');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeysIn(object) {
  if (!isObject(object)) {
    return nativeKeysIn(object);
  }
  var isProto = isPrototype(object),
      result = [];

  for (var key in object) {
    if (!(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

module.exports = baseKeysIn;

},{"./_isPrototype":132,"./_nativeKeysIn":146,"./isObject":178}],81:[function(require,module,exports){
var Stack = require('./_Stack'),
    assignMergeValue = require('./_assignMergeValue'),
    baseFor = require('./_baseFor'),
    baseMergeDeep = require('./_baseMergeDeep'),
    isObject = require('./isObject'),
    keysIn = require('./keysIn'),
    safeGet = require('./_safeGet');

/**
 * The base implementation of `_.merge` without support for multiple sources.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} [customizer] The function to customize merged values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMerge(object, source, srcIndex, customizer, stack) {
  if (object === source) {
    return;
  }
  baseFor(source, function(srcValue, key) {
    stack || (stack = new Stack);
    if (isObject(srcValue)) {
      baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
    }
    else {
      var newValue = customizer
        ? customizer(safeGet(object, key), srcValue, (key + ''), object, source, stack)
        : undefined;

      if (newValue === undefined) {
        newValue = srcValue;
      }
      assignMergeValue(object, key, newValue);
    }
  }, keysIn);
}

module.exports = baseMerge;

},{"./_Stack":51,"./_assignMergeValue":61,"./_baseFor":70,"./_baseMergeDeep":82,"./_safeGet":153,"./isObject":178,"./keysIn":185}],82:[function(require,module,exports){
var assignMergeValue = require('./_assignMergeValue'),
    cloneBuffer = require('./_cloneBuffer'),
    cloneTypedArray = require('./_cloneTypedArray'),
    copyArray = require('./_copyArray'),
    initCloneObject = require('./_initCloneObject'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray'),
    isArrayLikeObject = require('./isArrayLikeObject'),
    isBuffer = require('./isBuffer'),
    isFunction = require('./isFunction'),
    isObject = require('./isObject'),
    isPlainObject = require('./isPlainObject'),
    isTypedArray = require('./isTypedArray'),
    safeGet = require('./_safeGet'),
    toPlainObject = require('./toPlainObject');

/**
 * A specialized version of `baseMerge` for arrays and objects which performs
 * deep merges and tracks traversed objects enabling objects with circular
 * references to be merged.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @param {string} key The key of the value to merge.
 * @param {number} srcIndex The index of `source`.
 * @param {Function} mergeFunc The function to merge values.
 * @param {Function} [customizer] The function to customize assigned values.
 * @param {Object} [stack] Tracks traversed source values and their merged
 *  counterparts.
 */
function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
  var objValue = safeGet(object, key),
      srcValue = safeGet(source, key),
      stacked = stack.get(srcValue);

  if (stacked) {
    assignMergeValue(object, key, stacked);
    return;
  }
  var newValue = customizer
    ? customizer(objValue, srcValue, (key + ''), object, source, stack)
    : undefined;

  var isCommon = newValue === undefined;

  if (isCommon) {
    var isArr = isArray(srcValue),
        isBuff = !isArr && isBuffer(srcValue),
        isTyped = !isArr && !isBuff && isTypedArray(srcValue);

    newValue = srcValue;
    if (isArr || isBuff || isTyped) {
      if (isArray(objValue)) {
        newValue = objValue;
      }
      else if (isArrayLikeObject(objValue)) {
        newValue = copyArray(objValue);
      }
      else if (isBuff) {
        isCommon = false;
        newValue = cloneBuffer(srcValue, true);
      }
      else if (isTyped) {
        isCommon = false;
        newValue = cloneTypedArray(srcValue, true);
      }
      else {
        newValue = [];
      }
    }
    else if (isPlainObject(srcValue) || isArguments(srcValue)) {
      newValue = objValue;
      if (isArguments(objValue)) {
        newValue = toPlainObject(objValue);
      }
      else if (!isObject(objValue) || isFunction(objValue)) {
        newValue = initCloneObject(srcValue);
      }
    }
    else {
      isCommon = false;
    }
  }
  if (isCommon) {
    // Recursively merge objects and arrays (susceptible to call stack limits).
    stack.set(srcValue, newValue);
    mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
    stack['delete'](srcValue);
  }
  assignMergeValue(object, key, newValue);
}

module.exports = baseMergeDeep;

},{"./_assignMergeValue":61,"./_cloneBuffer":92,"./_cloneTypedArray":96,"./_copyArray":97,"./_initCloneObject":125,"./_safeGet":153,"./isArguments":170,"./isArray":171,"./isArrayLikeObject":173,"./isBuffer":174,"./isFunction":175,"./isObject":178,"./isPlainObject":180,"./isTypedArray":183,"./toPlainObject":192}],83:[function(require,module,exports){
var identity = require('./identity'),
    overRest = require('./_overRest'),
    setToString = require('./_setToString');

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  return setToString(overRest(func, start, identity), func + '');
}

module.exports = baseRest;

},{"./_overRest":150,"./_setToString":154,"./identity":169}],84:[function(require,module,exports){
var constant = require('./constant'),
    defineProperty = require('./_defineProperty'),
    identity = require('./identity');

/**
 * The base implementation of `setToString` without support for hot loop shorting.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var baseSetToString = !defineProperty ? identity : function(func, string) {
  return defineProperty(func, 'toString', {
    'configurable': true,
    'enumerable': false,
    'value': constant(string),
    'writable': true
  });
};

module.exports = baseSetToString;

},{"./_defineProperty":105,"./constant":166,"./identity":169}],85:[function(require,module,exports){
/**
 * The base implementation of `_.slice` without an iteratee call guard.
 *
 * @private
 * @param {Array} array The array to slice.
 * @param {number} [start=0] The start position.
 * @param {number} [end=array.length] The end position.
 * @returns {Array} Returns the slice of `array`.
 */
function baseSlice(array, start, end) {
  var index = -1,
      length = array.length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  var result = Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

module.exports = baseSlice;

},{}],86:[function(require,module,exports){
/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

module.exports = baseTimes;

},{}],87:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    arrayMap = require('./_arrayMap'),
    isArray = require('./isArray'),
    isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isArray(value)) {
    // Recursively convert values (susceptible to call stack limits).
    return arrayMap(value, baseToString) + '';
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

module.exports = baseToString;

},{"./_Symbol":52,"./_arrayMap":59,"./isArray":171,"./isSymbol":182}],88:[function(require,module,exports){
/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

module.exports = baseUnary;

},{}],89:[function(require,module,exports){
var castPath = require('./_castPath'),
    last = require('./last'),
    parent = require('./_parent'),
    toKey = require('./_toKey');

/**
 * The base implementation of `_.unset`.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {Array|string} path The property path to unset.
 * @returns {boolean} Returns `true` if the property is deleted, else `false`.
 */
function baseUnset(object, path) {
  path = castPath(path, object);
  object = parent(object, path);
  return object == null || delete object[toKey(last(path))];
}

module.exports = baseUnset;

},{"./_castPath":90,"./_parent":151,"./_toKey":162,"./last":186}],90:[function(require,module,exports){
var isArray = require('./isArray'),
    isKey = require('./_isKey'),
    stringToPath = require('./_stringToPath'),
    toString = require('./toString');

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {Object} [object] The object to query keys on.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value, object) {
  if (isArray(value)) {
    return value;
  }
  return isKey(value, object) ? [value] : stringToPath(toString(value));
}

module.exports = castPath;

},{"./_isKey":129,"./_stringToPath":161,"./isArray":171,"./toString":193}],91:[function(require,module,exports){
var Uint8Array = require('./_Uint8Array');

/**
 * Creates a clone of `arrayBuffer`.
 *
 * @private
 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function cloneArrayBuffer(arrayBuffer) {
  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
  return result;
}

module.exports = cloneArrayBuffer;

},{"./_Uint8Array":53}],92:[function(require,module,exports){
var root = require('./_root');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined,
    allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined;

/**
 * Creates a clone of  `buffer`.
 *
 * @private
 * @param {Buffer} buffer The buffer to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Buffer} Returns the cloned buffer.
 */
function cloneBuffer(buffer, isDeep) {
  if (isDeep) {
    return buffer.slice();
  }
  var length = buffer.length,
      result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

  buffer.copy(result);
  return result;
}

module.exports = cloneBuffer;

},{"./_root":152}],93:[function(require,module,exports){
var cloneArrayBuffer = require('./_cloneArrayBuffer');

/**
 * Creates a clone of `dataView`.
 *
 * @private
 * @param {Object} dataView The data view to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned data view.
 */
function cloneDataView(dataView, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
  return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
}

module.exports = cloneDataView;

},{"./_cloneArrayBuffer":91}],94:[function(require,module,exports){
/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/**
 * Creates a clone of `regexp`.
 *
 * @private
 * @param {Object} regexp The regexp to clone.
 * @returns {Object} Returns the cloned regexp.
 */
function cloneRegExp(regexp) {
  var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
  result.lastIndex = regexp.lastIndex;
  return result;
}

module.exports = cloneRegExp;

},{}],95:[function(require,module,exports){
var Symbol = require('./_Symbol');

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

/**
 * Creates a clone of the `symbol` object.
 *
 * @private
 * @param {Object} symbol The symbol object to clone.
 * @returns {Object} Returns the cloned symbol object.
 */
function cloneSymbol(symbol) {
  return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
}

module.exports = cloneSymbol;

},{"./_Symbol":52}],96:[function(require,module,exports){
var cloneArrayBuffer = require('./_cloneArrayBuffer');

/**
 * Creates a clone of `typedArray`.
 *
 * @private
 * @param {Object} typedArray The typed array to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned typed array.
 */
function cloneTypedArray(typedArray, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
}

module.exports = cloneTypedArray;

},{"./_cloneArrayBuffer":91}],97:[function(require,module,exports){
/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function copyArray(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

module.exports = copyArray;

},{}],98:[function(require,module,exports){
var assignValue = require('./_assignValue'),
    baseAssignValue = require('./_baseAssignValue');

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property identifiers to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Function} [customizer] The function to customize copied values.
 * @returns {Object} Returns `object`.
 */
function copyObject(source, props, object, customizer) {
  var isNew = !object;
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];

    var newValue = customizer
      ? customizer(object[key], source[key], key, object, source)
      : undefined;

    if (newValue === undefined) {
      newValue = source[key];
    }
    if (isNew) {
      baseAssignValue(object, key, newValue);
    } else {
      assignValue(object, key, newValue);
    }
  }
  return object;
}

module.exports = copyObject;

},{"./_assignValue":62,"./_baseAssignValue":66}],99:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    getSymbols = require('./_getSymbols');

/**
 * Copies own symbols of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy symbols from.
 * @param {Object} [object={}] The object to copy symbols to.
 * @returns {Object} Returns `object`.
 */
function copySymbols(source, object) {
  return copyObject(source, getSymbols(source), object);
}

module.exports = copySymbols;

},{"./_copyObject":98,"./_getSymbols":114}],100:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    getSymbolsIn = require('./_getSymbolsIn');

/**
 * Copies own and inherited symbols of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy symbols from.
 * @param {Object} [object={}] The object to copy symbols to.
 * @returns {Object} Returns `object`.
 */
function copySymbolsIn(source, object) {
  return copyObject(source, getSymbolsIn(source), object);
}

module.exports = copySymbolsIn;

},{"./_copyObject":98,"./_getSymbolsIn":115}],101:[function(require,module,exports){
var root = require('./_root');

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

module.exports = coreJsData;

},{"./_root":152}],102:[function(require,module,exports){
var baseRest = require('./_baseRest'),
    isIterateeCall = require('./_isIterateeCall');

/**
 * Creates a function like `_.assign`.
 *
 * @private
 * @param {Function} assigner The function to assign values.
 * @returns {Function} Returns the new assigner function.
 */
function createAssigner(assigner) {
  return baseRest(function(object, sources) {
    var index = -1,
        length = sources.length,
        customizer = length > 1 ? sources[length - 1] : undefined,
        guard = length > 2 ? sources[2] : undefined;

    customizer = (assigner.length > 3 && typeof customizer == 'function')
      ? (length--, customizer)
      : undefined;

    if (guard && isIterateeCall(sources[0], sources[1], guard)) {
      customizer = length < 3 ? undefined : customizer;
      length = 1;
    }
    object = Object(object);
    while (++index < length) {
      var source = sources[index];
      if (source) {
        assigner(object, source, index, customizer);
      }
    }
    return object;
  });
}

module.exports = createAssigner;

},{"./_baseRest":83,"./_isIterateeCall":128}],103:[function(require,module,exports){
/**
 * Creates a base function for methods like `_.forIn` and `_.forOwn`.
 *
 * @private
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {Function} Returns the new base function.
 */
function createBaseFor(fromRight) {
  return function(object, iteratee, keysFunc) {
    var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;

    while (length--) {
      var key = props[fromRight ? length : ++index];
      if (iteratee(iterable[key], key, iterable) === false) {
        break;
      }
    }
    return object;
  };
}

module.exports = createBaseFor;

},{}],104:[function(require,module,exports){
var isPlainObject = require('./isPlainObject');

/**
 * Used by `_.omit` to customize its `_.cloneDeep` use to only clone plain
 * objects.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {string} key The key of the property to inspect.
 * @returns {*} Returns the uncloned value or `undefined` to defer cloning to `_.cloneDeep`.
 */
function customOmitClone(value) {
  return isPlainObject(value) ? undefined : value;
}

module.exports = customOmitClone;

},{"./isPlainObject":180}],105:[function(require,module,exports){
var getNative = require('./_getNative');

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

module.exports = defineProperty;

},{"./_getNative":111}],106:[function(require,module,exports){
var flatten = require('./flatten'),
    overRest = require('./_overRest'),
    setToString = require('./_setToString');

/**
 * A specialized version of `baseRest` which flattens the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @returns {Function} Returns the new function.
 */
function flatRest(func) {
  return setToString(overRest(func, undefined, flatten), func + '');
}

module.exports = flatRest;

},{"./_overRest":150,"./_setToString":154,"./flatten":168}],107:[function(require,module,exports){
(function (global){
/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

module.exports = freeGlobal;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],108:[function(require,module,exports){
var baseGetAllKeys = require('./_baseGetAllKeys'),
    getSymbols = require('./_getSymbols'),
    keys = require('./keys');

/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return baseGetAllKeys(object, keys, getSymbols);
}

module.exports = getAllKeys;

},{"./_baseGetAllKeys":72,"./_getSymbols":114,"./keys":184}],109:[function(require,module,exports){
var baseGetAllKeys = require('./_baseGetAllKeys'),
    getSymbolsIn = require('./_getSymbolsIn'),
    keysIn = require('./keysIn');

/**
 * Creates an array of own and inherited enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeysIn(object) {
  return baseGetAllKeys(object, keysIn, getSymbolsIn);
}

module.exports = getAllKeysIn;

},{"./_baseGetAllKeys":72,"./_getSymbolsIn":115,"./keysIn":185}],110:[function(require,module,exports){
var isKeyable = require('./_isKeyable');

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

module.exports = getMapData;

},{"./_isKeyable":130}],111:[function(require,module,exports){
var baseIsNative = require('./_baseIsNative'),
    getValue = require('./_getValue');

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

module.exports = getNative;

},{"./_baseIsNative":76,"./_getValue":117}],112:[function(require,module,exports){
var overArg = require('./_overArg');

/** Built-in value references. */
var getPrototype = overArg(Object.getPrototypeOf, Object);

module.exports = getPrototype;

},{"./_overArg":149}],113:[function(require,module,exports){
var Symbol = require('./_Symbol');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Built-in value references. */
var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

module.exports = getRawTag;

},{"./_Symbol":52}],114:[function(require,module,exports){
var arrayFilter = require('./_arrayFilter'),
    stubArray = require('./stubArray');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return arrayFilter(nativeGetSymbols(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};

module.exports = getSymbols;

},{"./_arrayFilter":57,"./stubArray":190}],115:[function(require,module,exports){
var arrayPush = require('./_arrayPush'),
    getPrototype = require('./_getPrototype'),
    getSymbols = require('./_getSymbols'),
    stubArray = require('./stubArray');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own and inherited enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object) {
  var result = [];
  while (object) {
    arrayPush(result, getSymbols(object));
    object = getPrototype(object);
  }
  return result;
};

module.exports = getSymbolsIn;

},{"./_arrayPush":60,"./_getPrototype":112,"./_getSymbols":114,"./stubArray":190}],116:[function(require,module,exports){
var DataView = require('./_DataView'),
    Map = require('./_Map'),
    Promise = require('./_Promise'),
    Set = require('./_Set'),
    WeakMap = require('./_WeakMap'),
    baseGetTag = require('./_baseGetTag'),
    toSource = require('./_toSource');

/** `Object#toString` result references. */
var mapTag = '[object Map]',
    objectTag = '[object Object]',
    promiseTag = '[object Promise]',
    setTag = '[object Set]',
    weakMapTag = '[object WeakMap]';

var dataViewTag = '[object DataView]';

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = toSource(DataView),
    mapCtorString = toSource(Map),
    promiseCtorString = toSource(Promise),
    setCtorString = toSource(Set),
    weakMapCtorString = toSource(WeakMap);

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
    (Map && getTag(new Map) != mapTag) ||
    (Promise && getTag(Promise.resolve()) != promiseTag) ||
    (Set && getTag(new Set) != setTag) ||
    (WeakMap && getTag(new WeakMap) != weakMapTag)) {
  getTag = function(value) {
    var result = baseGetTag(value),
        Ctor = result == objectTag ? value.constructor : undefined,
        ctorString = Ctor ? toSource(Ctor) : '';

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return dataViewTag;
        case mapCtorString: return mapTag;
        case promiseCtorString: return promiseTag;
        case setCtorString: return setTag;
        case weakMapCtorString: return weakMapTag;
      }
    }
    return result;
  };
}

module.exports = getTag;

},{"./_DataView":44,"./_Map":47,"./_Promise":49,"./_Set":50,"./_WeakMap":54,"./_baseGetTag":73,"./_toSource":163}],117:[function(require,module,exports){
/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

module.exports = getValue;

},{}],118:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

module.exports = hashClear;

},{"./_nativeCreate":144}],119:[function(require,module,exports){
/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = hashDelete;

},{}],120:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

module.exports = hashGet;

},{"./_nativeCreate":144}],121:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

module.exports = hashHas;

},{"./_nativeCreate":144}],122:[function(require,module,exports){
var nativeCreate = require('./_nativeCreate');

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

module.exports = hashSet;

},{"./_nativeCreate":144}],123:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  var length = array.length,
      result = new array.constructor(length);

  // Add properties assigned by `RegExp#exec`.
  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

module.exports = initCloneArray;

},{}],124:[function(require,module,exports){
var cloneArrayBuffer = require('./_cloneArrayBuffer'),
    cloneDataView = require('./_cloneDataView'),
    cloneRegExp = require('./_cloneRegExp'),
    cloneSymbol = require('./_cloneSymbol'),
    cloneTypedArray = require('./_cloneTypedArray');

/** `Object#toString` result references. */
var boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag:
      return cloneArrayBuffer(object);

    case boolTag:
    case dateTag:
      return new Ctor(+object);

    case dataViewTag:
      return cloneDataView(object, isDeep);

    case float32Tag: case float64Tag:
    case int8Tag: case int16Tag: case int32Tag:
    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
      return cloneTypedArray(object, isDeep);

    case mapTag:
      return new Ctor;

    case numberTag:
    case stringTag:
      return new Ctor(object);

    case regexpTag:
      return cloneRegExp(object);

    case setTag:
      return new Ctor;

    case symbolTag:
      return cloneSymbol(object);
  }
}

module.exports = initCloneByTag;

},{"./_cloneArrayBuffer":91,"./_cloneDataView":93,"./_cloneRegExp":94,"./_cloneSymbol":95,"./_cloneTypedArray":96}],125:[function(require,module,exports){
var baseCreate = require('./_baseCreate'),
    getPrototype = require('./_getPrototype'),
    isPrototype = require('./_isPrototype');

/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  return (typeof object.constructor == 'function' && !isPrototype(object))
    ? baseCreate(getPrototype(object))
    : {};
}

module.exports = initCloneObject;

},{"./_baseCreate":68,"./_getPrototype":112,"./_isPrototype":132}],126:[function(require,module,exports){
var Symbol = require('./_Symbol'),
    isArguments = require('./isArguments'),
    isArray = require('./isArray');

/** Built-in value references. */
var spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined;

/**
 * Checks if `value` is a flattenable `arguments` object or array.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
 */
function isFlattenable(value) {
  return isArray(value) || isArguments(value) ||
    !!(spreadableSymbol && value && value[spreadableSymbol]);
}

module.exports = isFlattenable;

},{"./_Symbol":52,"./isArguments":170,"./isArray":171}],127:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

module.exports = isIndex;

},{}],128:[function(require,module,exports){
var eq = require('./eq'),
    isArrayLike = require('./isArrayLike'),
    isIndex = require('./_isIndex'),
    isObject = require('./isObject');

/**
 * Checks if the given arguments are from an iteratee call.
 *
 * @private
 * @param {*} value The potential iteratee value argument.
 * @param {*} index The potential iteratee index or key argument.
 * @param {*} object The potential iteratee object argument.
 * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
 *  else `false`.
 */
function isIterateeCall(value, index, object) {
  if (!isObject(object)) {
    return false;
  }
  var type = typeof index;
  if (type == 'number'
        ? (isArrayLike(object) && isIndex(index, object.length))
        : (type == 'string' && index in object)
      ) {
    return eq(object[index], value);
  }
  return false;
}

module.exports = isIterateeCall;

},{"./_isIndex":127,"./eq":167,"./isArrayLike":172,"./isObject":178}],129:[function(require,module,exports){
var isArray = require('./isArray'),
    isSymbol = require('./isSymbol');

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (type == 'number' || type == 'symbol' || type == 'boolean' ||
      value == null || isSymbol(value)) {
    return true;
  }
  return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
    (object != null && value in Object(object));
}

module.exports = isKey;

},{"./isArray":171,"./isSymbol":182}],130:[function(require,module,exports){
/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

module.exports = isKeyable;

},{}],131:[function(require,module,exports){
var coreJsData = require('./_coreJsData');

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

module.exports = isMasked;

},{"./_coreJsData":101}],132:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

module.exports = isPrototype;

},{}],133:[function(require,module,exports){
/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

module.exports = listCacheClear;

},{}],134:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

module.exports = listCacheDelete;

},{"./_assocIndexOf":63}],135:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

module.exports = listCacheGet;

},{"./_assocIndexOf":63}],136:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

module.exports = listCacheHas;

},{"./_assocIndexOf":63}],137:[function(require,module,exports){
var assocIndexOf = require('./_assocIndexOf');

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

module.exports = listCacheSet;

},{"./_assocIndexOf":63}],138:[function(require,module,exports){
var Hash = require('./_Hash'),
    ListCache = require('./_ListCache'),
    Map = require('./_Map');

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

module.exports = mapCacheClear;

},{"./_Hash":45,"./_ListCache":46,"./_Map":47}],139:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

module.exports = mapCacheDelete;

},{"./_getMapData":110}],140:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

module.exports = mapCacheGet;

},{"./_getMapData":110}],141:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

module.exports = mapCacheHas;

},{"./_getMapData":110}],142:[function(require,module,exports){
var getMapData = require('./_getMapData');

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

module.exports = mapCacheSet;

},{"./_getMapData":110}],143:[function(require,module,exports){
var memoize = require('./memoize');

/** Used as the maximum memoize cache size. */
var MAX_MEMOIZE_SIZE = 500;

/**
 * A specialized version of `_.memoize` which clears the memoized function's
 * cache when it exceeds `MAX_MEMOIZE_SIZE`.
 *
 * @private
 * @param {Function} func The function to have its output memoized.
 * @returns {Function} Returns the new memoized function.
 */
function memoizeCapped(func) {
  var result = memoize(func, function(key) {
    if (cache.size === MAX_MEMOIZE_SIZE) {
      cache.clear();
    }
    return key;
  });

  var cache = result.cache;
  return result;
}

module.exports = memoizeCapped;

},{"./memoize":187}],144:[function(require,module,exports){
var getNative = require('./_getNative');

/* Built-in method references that are verified to be native. */
var nativeCreate = getNative(Object, 'create');

module.exports = nativeCreate;

},{"./_getNative":111}],145:[function(require,module,exports){
var overArg = require('./_overArg');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

module.exports = nativeKeys;

},{"./_overArg":149}],146:[function(require,module,exports){
/**
 * This function is like
 * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * except that it includes inherited enumerable properties.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function nativeKeysIn(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}

module.exports = nativeKeysIn;

},{}],147:[function(require,module,exports){
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    // Use `util.types` for Node.js 10+.
    var types = freeModule && freeModule.require && freeModule.require('util').types;

    if (types) {
      return types;
    }

    // Legacy `process.binding('util')` for Node.js < 10.
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

module.exports = nodeUtil;

},{"./_freeGlobal":107}],148:[function(require,module,exports){
/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

module.exports = objectToString;

},{}],149:[function(require,module,exports){
/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

module.exports = overArg;

},{}],150:[function(require,module,exports){
var apply = require('./_apply');

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * A specialized version of `baseRest` which transforms the rest array.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @param {Function} transform The rest array transform.
 * @returns {Function} Returns the new function.
 */
function overRest(func, start, transform) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = transform(array);
    return apply(func, this, otherArgs);
  };
}

module.exports = overRest;

},{"./_apply":55}],151:[function(require,module,exports){
var baseGet = require('./_baseGet'),
    baseSlice = require('./_baseSlice');

/**
 * Gets the parent value at `path` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array} path The path to get the parent value of.
 * @returns {*} Returns the parent value.
 */
function parent(object, path) {
  return path.length < 2 ? object : baseGet(object, baseSlice(path, 0, -1));
}

module.exports = parent;

},{"./_baseGet":71,"./_baseSlice":85}],152:[function(require,module,exports){
var freeGlobal = require('./_freeGlobal');

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

module.exports = root;

},{"./_freeGlobal":107}],153:[function(require,module,exports){
/**
 * Gets the value at `key`, unless `key` is "__proto__" or "constructor".
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function safeGet(object, key) {
  if (key === 'constructor' && typeof object[key] === 'function') {
    return;
  }

  if (key == '__proto__') {
    return;
  }

  return object[key];
}

module.exports = safeGet;

},{}],154:[function(require,module,exports){
var baseSetToString = require('./_baseSetToString'),
    shortOut = require('./_shortOut');

/**
 * Sets the `toString` method of `func` to return `string`.
 *
 * @private
 * @param {Function} func The function to modify.
 * @param {Function} string The `toString` result.
 * @returns {Function} Returns `func`.
 */
var setToString = shortOut(baseSetToString);

module.exports = setToString;

},{"./_baseSetToString":84,"./_shortOut":155}],155:[function(require,module,exports){
/** Used to detect hot functions by number of calls within a span of milliseconds. */
var HOT_COUNT = 800,
    HOT_SPAN = 16;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeNow = Date.now;

/**
 * Creates a function that'll short out and invoke `identity` instead
 * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
 * milliseconds.
 *
 * @private
 * @param {Function} func The function to restrict.
 * @returns {Function} Returns the new shortable function.
 */
function shortOut(func) {
  var count = 0,
      lastCalled = 0;

  return function() {
    var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);

    lastCalled = stamp;
    if (remaining > 0) {
      if (++count >= HOT_COUNT) {
        return arguments[0];
      }
    } else {
      count = 0;
    }
    return func.apply(undefined, arguments);
  };
}

module.exports = shortOut;

},{}],156:[function(require,module,exports){
var ListCache = require('./_ListCache');

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new ListCache;
  this.size = 0;
}

module.exports = stackClear;

},{"./_ListCache":46}],157:[function(require,module,exports){
/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

module.exports = stackDelete;

},{}],158:[function(require,module,exports){
/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

module.exports = stackGet;

},{}],159:[function(require,module,exports){
/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

module.exports = stackHas;

},{}],160:[function(require,module,exports){
var ListCache = require('./_ListCache'),
    Map = require('./_Map'),
    MapCache = require('./_MapCache');

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache) {
    var pairs = data.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

module.exports = stackSet;

},{"./_ListCache":46,"./_Map":47,"./_MapCache":48}],161:[function(require,module,exports){
var memoizeCapped = require('./_memoizeCapped');

/** Used to match property names within property paths. */
var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoizeCapped(function(string) {
  var result = [];
  if (string.charCodeAt(0) === 46 /* . */) {
    result.push('');
  }
  string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
  });
  return result;
});

module.exports = stringToPath;

},{"./_memoizeCapped":143}],162:[function(require,module,exports){
var isSymbol = require('./isSymbol');

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = (value + '');
  return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
}

module.exports = toKey;

},{"./isSymbol":182}],163:[function(require,module,exports){
/** Used for built-in method references. */
var funcProto = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

module.exports = toSource;

},{}],164:[function(require,module,exports){
var assignValue = require('./_assignValue'),
    copyObject = require('./_copyObject'),
    createAssigner = require('./_createAssigner'),
    isArrayLike = require('./isArrayLike'),
    isPrototype = require('./_isPrototype'),
    keys = require('./keys');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Assigns own enumerable string keyed properties of source objects to the
 * destination object. Source objects are applied from left to right.
 * Subsequent sources overwrite property assignments of previous sources.
 *
 * **Note:** This method mutates `object` and is loosely based on
 * [`Object.assign`](https://mdn.io/Object/assign).
 *
 * @static
 * @memberOf _
 * @since 0.10.0
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @see _.assignIn
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * function Bar() {
 *   this.c = 3;
 * }
 *
 * Foo.prototype.b = 2;
 * Bar.prototype.d = 4;
 *
 * _.assign({ 'a': 0 }, new Foo, new Bar);
 * // => { 'a': 1, 'c': 3 }
 */
var assign = createAssigner(function(object, source) {
  if (isPrototype(source) || isArrayLike(source)) {
    copyObject(source, keys(source), object);
    return;
  }
  for (var key in source) {
    if (hasOwnProperty.call(source, key)) {
      assignValue(object, key, source[key]);
    }
  }
});

module.exports = assign;

},{"./_assignValue":62,"./_copyObject":98,"./_createAssigner":102,"./_isPrototype":132,"./isArrayLike":172,"./keys":184}],165:[function(require,module,exports){
var baseClone = require('./_baseClone');

/** Used to compose bitmasks for cloning. */
var CLONE_DEEP_FLAG = 1,
    CLONE_SYMBOLS_FLAG = 4;

/**
 * This method is like `_.clone` except that it recursively clones `value`.
 *
 * @static
 * @memberOf _
 * @since 1.0.0
 * @category Lang
 * @param {*} value The value to recursively clone.
 * @returns {*} Returns the deep cloned value.
 * @see _.clone
 * @example
 *
 * var objects = [{ 'a': 1 }, { 'b': 2 }];
 *
 * var deep = _.cloneDeep(objects);
 * console.log(deep[0] === objects[0]);
 * // => false
 */
function cloneDeep(value) {
  return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
}

module.exports = cloneDeep;

},{"./_baseClone":67}],166:[function(require,module,exports){
/**
 * Creates a function that returns `value`.
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Util
 * @param {*} value The value to return from the new function.
 * @returns {Function} Returns the new constant function.
 * @example
 *
 * var objects = _.times(2, _.constant({ 'a': 1 }));
 *
 * console.log(objects);
 * // => [{ 'a': 1 }, { 'a': 1 }]
 *
 * console.log(objects[0] === objects[1]);
 * // => true
 */
function constant(value) {
  return function() {
    return value;
  };
}

module.exports = constant;

},{}],167:[function(require,module,exports){
/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

module.exports = eq;

},{}],168:[function(require,module,exports){
var baseFlatten = require('./_baseFlatten');

/**
 * Flattens `array` a single level deep.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to flatten.
 * @returns {Array} Returns the new flattened array.
 * @example
 *
 * _.flatten([1, [2, [3, [4]], 5]]);
 * // => [1, 2, [3, [4]], 5]
 */
function flatten(array) {
  var length = array == null ? 0 : array.length;
  return length ? baseFlatten(array, 1) : [];
}

module.exports = flatten;

},{"./_baseFlatten":69}],169:[function(require,module,exports){
/**
 * This method returns the first argument it receives.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Util
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'a': 1 };
 *
 * console.log(_.identity(object) === object);
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;

},{}],170:[function(require,module,exports){
var baseIsArguments = require('./_baseIsArguments'),
    isObjectLike = require('./isObjectLike');

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable = objectProto.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

module.exports = isArguments;

},{"./_baseIsArguments":74,"./isObjectLike":179}],171:[function(require,module,exports){
/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

module.exports = isArray;

},{}],172:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

module.exports = isArrayLike;

},{"./isFunction":175,"./isLength":176}],173:[function(require,module,exports){
var isArrayLike = require('./isArrayLike'),
    isObjectLike = require('./isObjectLike');

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

module.exports = isArrayLikeObject;

},{"./isArrayLike":172,"./isObjectLike":179}],174:[function(require,module,exports){
var root = require('./_root'),
    stubFalse = require('./stubFalse');

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

module.exports = isBuffer;

},{"./_root":152,"./stubFalse":191}],175:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObject = require('./isObject');

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

module.exports = isFunction;

},{"./_baseGetTag":73,"./isObject":178}],176:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],177:[function(require,module,exports){
var baseIsMap = require('./_baseIsMap'),
    baseUnary = require('./_baseUnary'),
    nodeUtil = require('./_nodeUtil');

/* Node.js helper references. */
var nodeIsMap = nodeUtil && nodeUtil.isMap;

/**
 * Checks if `value` is classified as a `Map` object.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
 * @example
 *
 * _.isMap(new Map);
 * // => true
 *
 * _.isMap(new WeakMap);
 * // => false
 */
var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;

module.exports = isMap;

},{"./_baseIsMap":75,"./_baseUnary":88,"./_nodeUtil":147}],178:[function(require,module,exports){
/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],179:[function(require,module,exports){
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],180:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    getPrototype = require('./_getPrototype'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return typeof Ctor == 'function' && Ctor instanceof Ctor &&
    funcToString.call(Ctor) == objectCtorString;
}

module.exports = isPlainObject;

},{"./_baseGetTag":73,"./_getPrototype":112,"./isObjectLike":179}],181:[function(require,module,exports){
var baseIsSet = require('./_baseIsSet'),
    baseUnary = require('./_baseUnary'),
    nodeUtil = require('./_nodeUtil');

/* Node.js helper references. */
var nodeIsSet = nodeUtil && nodeUtil.isSet;

/**
 * Checks if `value` is classified as a `Set` object.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
 * @example
 *
 * _.isSet(new Set);
 * // => true
 *
 * _.isSet(new WeakSet);
 * // => false
 */
var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;

module.exports = isSet;

},{"./_baseIsSet":77,"./_baseUnary":88,"./_nodeUtil":147}],182:[function(require,module,exports){
var baseGetTag = require('./_baseGetTag'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && baseGetTag(value) == symbolTag);
}

module.exports = isSymbol;

},{"./_baseGetTag":73,"./isObjectLike":179}],183:[function(require,module,exports){
var baseIsTypedArray = require('./_baseIsTypedArray'),
    baseUnary = require('./_baseUnary'),
    nodeUtil = require('./_nodeUtil');

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

module.exports = isTypedArray;

},{"./_baseIsTypedArray":78,"./_baseUnary":88,"./_nodeUtil":147}],184:[function(require,module,exports){
var arrayLikeKeys = require('./_arrayLikeKeys'),
    baseKeys = require('./_baseKeys'),
    isArrayLike = require('./isArrayLike');

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

module.exports = keys;

},{"./_arrayLikeKeys":58,"./_baseKeys":79,"./isArrayLike":172}],185:[function(require,module,exports){
var arrayLikeKeys = require('./_arrayLikeKeys'),
    baseKeysIn = require('./_baseKeysIn'),
    isArrayLike = require('./isArrayLike');

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
}

module.exports = keysIn;

},{"./_arrayLikeKeys":58,"./_baseKeysIn":80,"./isArrayLike":172}],186:[function(require,module,exports){
/**
 * Gets the last element of `array`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to query.
 * @returns {*} Returns the last element of `array`.
 * @example
 *
 * _.last([1, 2, 3]);
 * // => 3
 */
function last(array) {
  var length = array == null ? 0 : array.length;
  return length ? array[length - 1] : undefined;
}

module.exports = last;

},{}],187:[function(require,module,exports){
var MapCache = require('./_MapCache');

/** Error message constants. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `clear`, `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result) || cache;
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache);
  return memoized;
}

// Expose `MapCache`.
memoize.Cache = MapCache;

module.exports = memoize;

},{"./_MapCache":48}],188:[function(require,module,exports){
var baseMerge = require('./_baseMerge'),
    createAssigner = require('./_createAssigner');

/**
 * This method is like `_.assign` except that it recursively merges own and
 * inherited enumerable string keyed properties of source objects into the
 * destination object. Source properties that resolve to `undefined` are
 * skipped if a destination value exists. Array and plain object properties
 * are merged recursively. Other objects and value types are overridden by
 * assignment. Source objects are applied from left to right. Subsequent
 * sources overwrite property assignments of previous sources.
 *
 * **Note:** This method mutates `object`.
 *
 * @static
 * @memberOf _
 * @since 0.5.0
 * @category Object
 * @param {Object} object The destination object.
 * @param {...Object} [sources] The source objects.
 * @returns {Object} Returns `object`.
 * @example
 *
 * var object = {
 *   'a': [{ 'b': 2 }, { 'd': 4 }]
 * };
 *
 * var other = {
 *   'a': [{ 'c': 3 }, { 'e': 5 }]
 * };
 *
 * _.merge(object, other);
 * // => { 'a': [{ 'b': 2, 'c': 3 }, { 'd': 4, 'e': 5 }] }
 */
var merge = createAssigner(function(object, source, srcIndex) {
  baseMerge(object, source, srcIndex);
});

module.exports = merge;

},{"./_baseMerge":81,"./_createAssigner":102}],189:[function(require,module,exports){
var arrayMap = require('./_arrayMap'),
    baseClone = require('./_baseClone'),
    baseUnset = require('./_baseUnset'),
    castPath = require('./_castPath'),
    copyObject = require('./_copyObject'),
    customOmitClone = require('./_customOmitClone'),
    flatRest = require('./_flatRest'),
    getAllKeysIn = require('./_getAllKeysIn');

/** Used to compose bitmasks for cloning. */
var CLONE_DEEP_FLAG = 1,
    CLONE_FLAT_FLAG = 2,
    CLONE_SYMBOLS_FLAG = 4;

/**
 * The opposite of `_.pick`; this method creates an object composed of the
 * own and inherited enumerable property paths of `object` that are not omitted.
 *
 * **Note:** This method is considerably slower than `_.pick`.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The source object.
 * @param {...(string|string[])} [paths] The property paths to omit.
 * @returns {Object} Returns the new object.
 * @example
 *
 * var object = { 'a': 1, 'b': '2', 'c': 3 };
 *
 * _.omit(object, ['a', 'c']);
 * // => { 'b': '2' }
 */
var omit = flatRest(function(object, paths) {
  var result = {};
  if (object == null) {
    return result;
  }
  var isDeep = false;
  paths = arrayMap(paths, function(path) {
    path = castPath(path, object);
    isDeep || (isDeep = path.length > 1);
    return path;
  });
  copyObject(object, getAllKeysIn(object), result);
  if (isDeep) {
    result = baseClone(result, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
  }
  var length = paths.length;
  while (length--) {
    baseUnset(result, paths[length]);
  }
  return result;
});

module.exports = omit;

},{"./_arrayMap":59,"./_baseClone":67,"./_baseUnset":89,"./_castPath":90,"./_copyObject":98,"./_customOmitClone":104,"./_flatRest":106,"./_getAllKeysIn":109}],190:[function(require,module,exports){
/**
 * This method returns a new empty array.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {Array} Returns the new empty array.
 * @example
 *
 * var arrays = _.times(2, _.stubArray);
 *
 * console.log(arrays);
 * // => [[], []]
 *
 * console.log(arrays[0] === arrays[1]);
 * // => false
 */
function stubArray() {
  return [];
}

module.exports = stubArray;

},{}],191:[function(require,module,exports){
/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

module.exports = stubFalse;

},{}],192:[function(require,module,exports){
var copyObject = require('./_copyObject'),
    keysIn = require('./keysIn');

/**
 * Converts `value` to a plain object flattening inherited enumerable string
 * keyed properties of `value` to own properties of the plain object.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {Object} Returns the converted plain object.
 * @example
 *
 * function Foo() {
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.assign({ 'a': 1 }, new Foo);
 * // => { 'a': 1, 'b': 2 }
 *
 * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
 * // => { 'a': 1, 'b': 2, 'c': 3 }
 */
function toPlainObject(value) {
  return copyObject(value, keysIn(value));
}

module.exports = toPlainObject;

},{"./_copyObject":98,"./keysIn":185}],193:[function(require,module,exports){
var baseToString = require('./_baseToString');

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

module.exports = toString;

},{"./_baseToString":87}],194:[function(require,module,exports){
(function (global){
/**
 *
 * Essential extension methods for Promises/A+ implementations
 */

var setImmediate = (function setImmediateImpl() {
    'use strict';

    if (setImmediate) {
        return setImmediate;
    } else if ({}.toString.call(global.process) === '[object process]') {
        return global.process.nextTick.bind(global.process);
    } else {
        return function(handler) {
            setTimeout(handler, 0);
        };
    }
}());

var convertToArray = (function() {
    'use strict';
    var toArray = Array.prototype.slice;
    return function $convertToArray(obj) {
        return obj ? toArray.call(obj) : [];
    };
})();

function createInspectionObject(resolved, valueOrReason) {
    'use strict';

    var insp = {
        isRejected: function() {
            return !resolved;
        },
        isFulfilled: function() {
            return resolved;
        }
    };
    // alias
    insp.isResolved = insp.isFulfilled;

    if (resolved) {
        Object.defineProperty(insp, 'value', {
            enumerable: true,
            value: valueOrReason
        });
    } else {
        Object.defineProperty(insp, 'reason', {
            enumerable: true,
            value: valueOrReason
        });
    }

    return insp;
}

function applyExtensions(Promise) {
    'use strict';

    // spread method
    Promise.prototype.spread = function (fn) {
        return this.then(function (args) {
            return Promise.all(args);
        }).then(function (array) {
            return fn.apply(null, array);
        });
    };

    // delay method
    Promise.prototype.delay = function (timeout) {
        return this.then(function(args) {
            return new Promise(function (resolve) {
                setTimeout(function() {
                    resolve(args);
                }, timeout);
            });
        });
    };

    // static delay method
    Promise.delay = function (resolveValue, timeout) {
        if (timeout === undefined) {
            timeout = resolveValue;
            resolveValue = undefined;
        }
        return this.resolve(resolveValue).delay(timeout);
    };

    // finally method
    Promise.prototype['finally'] = function (fn) {
        var noop = function() {};
        var fnAsPromise = new Promise(function(resolve) {
            var val;
            try {
                val = fn();
            } finally {
                resolve(val);
            }
        }).then(noop, noop);

        return this.then(function (value) {
            return fnAsPromise.then(function () {
                return value;
            });
        }, function(reason) {
            return fnAsPromise.then(function() {
                throw reason;
            });
        });
    };

    // reflect method
    Promise.prototype.reflect = function () {
        return this.then(function(value) {
            return createInspectionObject(true, value);
        }, function(reason) {

            return createInspectionObject(false, reason);
        });
    };

    // static settleAll method
    Promise.settleAll = function(array) {
        var values = Array.isArray(array) ? array : [array];
        return this.all(values.map(function(value) {
            return Promise.resolve(value).reflect();
        }));
    };

    // done method
    Promise.prototype.done = function() {
        this.catch(function (error) {
            setImmediate(function() {
                throw error;
            });
        });
    };

    return Promise;
}

function delegateToInstance(decorator, methods) {
    'use strict';

    methods.forEach(function(method) {
        decorator.prototype[method] = function () {
            var ins = this.__instance;
            var promise = ins[method].apply(ins, convertToArray(arguments));
            return decorator.resolve(promise);
        };
    });
}

function delegateToStatic(decorator, delegate, methods) {
    'use strict';

    methods.forEach(function(method) {
        decorator[method] = function () {
            var promise = delegate[method].apply(delegate, convertToArray(arguments));
            return decorator.resolve(promise);
        };
    });
}

function decorate(promiseFunc) {
    'use strict';

    var PromiseExtensions = function PromiseExtensions(executor) {
        var promise = new promiseFunc(executor);
        // protect base instance from tampering with
        Object.defineProperty(this, '__instance', {
            value: promise
        });
    };

    // resolve method doesn't delegate to original Promise. Other methods heavily rely on it.
    PromiseExtensions.resolve = function resolve(msg) {
        var Constructor = this;
        if (msg && msg.__instance && typeof msg.__instance === 'object') {
            return msg;
        }

        return new Constructor(function(resolve) {
            resolve(msg);
        });
    };

    // delegate known static methods to provided impl
    delegateToStatic(PromiseExtensions, promiseFunc, ['all', 'reject', 'race']);
    // delegate known instance methods to base instance
    delegateToInstance(PromiseExtensions, ['then', 'catch']);
    // define extension methods
    return applyExtensions(PromiseExtensions);
}

module.exports = function(promiseImpl) {
    'use strict';

    var Promise = promiseImpl || global.Promise;
    if (!Promise) {
        throw new Error('No Promise implementation found.');
    }
    if (typeof Promise !== 'function') {
        throw new TypeError('Not supported. The argument provided is not a constructor.');
    }

    return decorate(Promise);
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],195:[function(require,module,exports){
/**
 * Config Aggregator
 * @module core/config-aggregator
 * @exports {ConfigAggregator} The constructor
 */

'use strict';

var util = require('../util/util');
var loggerFactory = require('../util/logger-factory');
var bunyan = require('browser-bunyan');
var defaultWidgetModel = require('./default-widget-model');

/**
 * A <code>ConfigAggregator</code> is used to combine zero or more models into one.
 * @constructor
 */
var ConfigAggregator = function() {
    this.log = loggerFactory.getLogger();
};

/**
 * Combines an array of zero or models into one. A default widget model is always used as a base.
 * @param {Object[]} models An array of widget models
 * @returns {Object} A single widget model
 */
ConfigAggregator.prototype.combine = function(models) {

    var log = this.log;

    var combinedModel = util.cloneDeep(defaultWidgetModel);
    models.forEach(function(model) {
        //merge all other properties
        util.merge(combinedModel, util.omit(model, ['preferences', 'viewmodes']));

        //latest model viewmodes and preferences take precedence
        if(model.viewmodes) {
            combinedModel.viewmodes = model.viewmodes;
        }
        if(model.preferences) {
            combinedModel.preferences = model.preferences;
        }
    });

    log.debug('Aggregated model created.');
    if(log.level() <= bunyan.TRACE) {
        log.trace('Aggregated model is this:\n %s', JSON.stringify(combinedModel, null, '\t'));
    }

    return combinedModel;
};

module.exports = ConfigAggregator;

},{"../util/logger-factory":248,"../util/util":250,"./default-widget-model":198,"browser-bunyan":2}],196:[function(require,module,exports){
/* jshint unused: vars */

/**
 * Config Parser
 * @module core/config-parser
 * @exports {ConfigParser} The constructor
 */
'use strict';

/**
 * A <code>ConfigParser</code> is used to parse a string of data into a widget model
 * @interface
 * @constructor
 * @param {Object} opts Configuration options to initialize with
 * @param {Object} [opts.log] A logger object to use. Defaults to a default logger object
 */
var ConfigParser = function(opts) {};

/**
 * Parses widget config text into a widget model
 * @method
 * @abstract
 * @param {string} configText The text to parse
 * @return {Object} A widget model
 */
ConfigParser.prototype.parse = function(configText) {
    throw new Error('ConfigParser#parse must be overridden.');
};

module.exports = ConfigParser;
},{}],197:[function(require,module,exports){
/* jshint unused: vars */

/**
 * Config Reaser
 * @module core/config-reader
 * @exports {ConfigReader} The constructor
 */

'use strict';

/**
 * A <code>ConfigReader</code> is used to read widget configuration from a source
 * @interface
 * @constructor
 * @param {Object} opts Configuration options to initialize with
 * @param {Object} [opts.useCache] Instructs the reader to cache the widget configuration string
 */
var ConfigReader = function(opts) {
};

/**
 * Reads the config text
 * @param location
 * @returns {Promise} Resolves to a widget model
 */
ConfigReader.prototype.read = function(location) {

    throw new Error('ConfigReader#read must be overridden.');
};

module.exports = ConfigReader;
},{}],198:[function(require,module,exports){
/**
 * Default Widget Model
 * @module core/default-widget-model
 * @exports {Object} The default widget model
 */

'use strict';

//this is the default widget model used as a base for various things
var widgetModel = {
    'id' : null,
    'version' : null,
    'height' : null,
    'width' : null,
    'viewmodes' : [ ],
    'name' : null,
    'shortName' : null,
    'description' : null,
    'author' : null,
    'authorHref' : null,
    'authorEmail' : null,
    'preferences' : {},
    'license' : null,
    'licenseHref' : null,
    'icons' : [ ],
    'content' : {
        'src' : 'index.html',
        'type' : 'text/html',
        'encoding' : 'UTF-8'
    },
    'features' : []
};

module.exports = widgetModel;
},{}],199:[function(require,module,exports){
/**
 * Tne Widget Engine
 * @module core/widget-engine
 * @wxports {WidgetEngine}
 */

'use strict';

var ExtPromise = require('promise-extensions')(Promise);
var util = require('../util/util');
var loggerFactory = require('../util/logger-factory');
var WidgetRenderer = require('./widget-renderer');
var ConfigReader = require('./config-reader');
var ConfigParser = require('./config-parser');
var WidgetStorage = require('./widget-storage');
var WidgetInstanceFactory = require('./widget-instance-factory');
var WidgetFeatureAugmenter = require('./widget-feature-augmenter');
var ConfigAggregator = require('./config-aggregator');
var VError = require('../util/verror');
var DestroyEvent = require('../events/destroy-event');

var CONFIG_FILE_NAME = 'model.xml';

var pluginPhases = {
    POST_READ: 'postRead',
    PRE_RENDER: 'preRender',
    POST_RENDER: 'postRender'
};

var mimeTypes = {
    html : 'text/html',
    hbs : 'text/x-handlebars-template',
    handlebars: 'text/x-handlebars-template',
    'hbs.js': 'application/x-handlebars-template'
};

/**
 * The widget engine.
 * Uses supplied strategies and config to resolve and run a widget
 * @param {Object} config The configuration options to initiailze the widget engine with
 * @param {String} config.widgetPath A base path of the widget (without a file name)
 * @param {String} [config.configFile] The name of the config file to parse the widget meta data from. Usuatlly defaults
 *                                   to 'config.xml'
 * @param {Object} config.reader The reader strategy to use
 * @param {object} config.storage The storage strategy to use
 * @param {Object} config.renderer The rendering strategy to use
 * @param {Object} [config.initialModel] Feed a widgetr model directly into the engine
 * @param {Object} [config.log] A Bunyan logger to log messages with
 * @param {String} [config.initialId] A unique id to associate this widget with. This is declared externally so it can
 *                                    be shared with the externally defined logger
 * @constructor
 */
var WidgetEngine = function(config) {
    this.config = config;

    this.plugins = [];
    this.features = [];

    //stateless tools
    this.widgetInstanceFactory = new WidgetInstanceFactory();
    this.widgetFeatureAugmenter = new WidgetFeatureAugmenter();
    this._widgetInstance = null;

    this.log = loggerFactory.getLogger();

    var failureMessages = validateConfig(this.config);
    if(failureMessages.warnings.length) {
        this.log.debug(failureMessages.warnings.join('\n'));
    }
    if(failureMessages.errors.length) {
        var message = 'Problems with widget config:\n\t' + failureMessages.errors.join('\t\n');
        throw new VError(message);
    }
};

/**
 * Starts the widget rendering process
 * @method
 * @returns {Promise} promise that resolves when complete
 */
WidgetEngine.prototype.start = function() {

    var startTime = new Date().getTime();

    var log = this.log;
    var config = this.config;
    var plugins = this.plugins;
    var features = this.features;
    var initialModel = config.initialModel || {};
    var widgetPath = config.widgetPath;
    var configFile = config.configFile || CONFIG_FILE_NAME;

    //convert empty strings urls to . to force the path as the current directory and not a falsy value
    if(widgetPath === '') {
        widgetPath = '.';
    }

    var widgetInstanceFactory = this.widgetInstanceFactory;
    var widgetFeatureAugmenter = this.widgetFeatureAugmenter;

    log.info('Starting widget @ %s...', widgetPath);
    log.info('Entering READ phase.');

    //READ PHASE
    //read the widget config
    var result = Promise.resolve({});

    if(config.reader) {
        result = result.then(function() {
            var resolvedConfigFile =
                (util.endsWith(widgetPath, '/') ? widgetPath : widgetPath + '/') + configFile;
            return config.reader.read(resolvedConfigFile);
        });
    }
    if(config.parser) {
        result = result.then(function(configText) {
            return config.parser.parse(configText);
        });
    }

    return ExtPromise.all([initialModel, result]).then(function aggregateModels(configModels) {
        log.debug('Aggregating models...');
        var configAggregator = new ConfigAggregator({
            log: log
        });
        return configAggregator.combine(configModels);
    }).then(function postRead(widgetModel) {
        log.info('Invoking plugins for POST READ phase...');
        //POST READ PHASE. Plugins must return a widgetModel
        return invokePluginsForPhase(plugins, log, pluginPhases.POST_READ, [ widgetModel ]);
    }).spread(function createInstance(widgetModel) {
        
        //in older widget models the meta data might not allow a mime type to be specified, this guesses the mime type
        //based on the file extension of the start file.
        //this could potentially be implemented as a post-read plugin, but that seems overkill for this case.
        //if the mime type is not the default value (text/html) do not try to guess it
        if(!widgetModel.content.type  || widgetModel.content.type === mimeTypes.html) {
            widgetModel.content.type = guessContentType(widgetModel);
            log.debug('The start file type was inferred as [%s]', widgetModel.content.type);
        }
        
        widgetModel.content.src = WidgetRenderer.getResolvedStartFilePath(widgetPath, widgetModel);

        log.info('Widget config read for: %s (%s).', widgetModel.id, widgetModel.name);
        log.info('Entering INSTANCE CREATION phase...');

        //INSTANCE CREATION PHASE
        var renderer = config.renderer;
        var storage = config.storage;

        //ensure an id is present for standalone environments where it may not have been populated with a UUID
        widgetModel.id = widgetModel.id || util.randomId();

        //init storage
        storage.init(widgetModel.name, widgetModel.preferences, widgetModel.type);
        log.debug('Widget storage initialized.');

        //create a widget instance (needs renderer for width and height functions)
        var widgetInstance = widgetInstanceFactory.makeWidget(widgetModel, storage, renderer, widgetPath);
        log.debug('Widget instance created.');

        //add features to the widget instance. Features are initiated with a widgetmodel for advanced ops
        widgetFeatureAugmenter.addFeaturesToWidget(widgetInstance, features, widgetModel);
        log.debug('%s feature(s) added to widget.', features.length);

        return [widgetInstance, renderer, widgetModel];
    }).spread(function preRender(widgetInstance, renderer, widgetModel) {
        //PRE RENDER PHASE
        log.info('Invoking plugins for PRE RENDER phase...');
        var widgetPluginPromises =
            invokePluginsForPhase(plugins, log, pluginPhases.PRE_RENDER, [ widgetInstance, renderer, widgetModel ]);
        return widgetPluginPromises;
    }).spread(function render(widgetInstance, renderer, widgetModel) {
        log.info('Entering RENDERING phase...');
        //RENDERING PHASE
        var renderingPromise = renderer.render(widgetModel, widgetInstance);
        return [ widgetInstance, renderer, widgetModel, renderingPromise ];
    }).spread(function postRender(widgetInstance, renderer, widgetModel) {
        log.info('Invoking plugins for POST RENDER phase...');
        //POST RENDER PHASE. Plugins are not expected to return a value
        var widgetPluginPromises =
            invokePluginsForPhase(plugins, log, pluginPhases.POST_RENDER, [ widgetInstance, renderer, widgetModel ]);
        return widgetPluginPromises;
    }).spread(function renderingComplete(widgetInstance, renderer, widgetModel) {
        this._widgetInstance = widgetInstance;

        var details = {};
        var endTime = new Date().getTime();

        details.time = endTime - startTime;
        details.id = widgetModel.id;
        details.message = 'Widget rendering for [' + widgetModel.name + '] completed in ' + details.time + 'ms.';
        details.areaNodes = typeof renderer.getAreaNodes === 'function' ? renderer.getAreaNodes() : null;

        log.info(details.message);

        return details;
    }.bind(this)).catch(function (e) {
        log.error(e);
        throw new VError(e, 'An error occurred whilst starting the widget');
    });
};

/**
 * Adds a new feature
 * @param {Object} feature
 * @returns {WidgetEngine} Returns this. Convenient for chaining
 */
WidgetEngine.prototype.addFeature = function (feature) {

    this.log.info('Adding feature for widget, %s', (feature.name || '[Anonymous feature]'));
    if(typeof feature === 'object') {
        this.features.push(feature);
    }
    return this;
};

/**
 * Adds a plugin
 * @param {Object} plugin
 * @returns {WidgetEngine} Returns this. Convenient for chaining
 */
WidgetEngine.prototype.addPlugin = function (plugin) {

    this.log.info('Adding plugin for widget, %s', (plugin.name || '[Anonymous plugin]'));
    if(typeof plugin === 'object') {
        this.plugins.push(plugin);
    }
    return this;
};

/**
 * @see core/widget-renderer#destroy
 */
WidgetEngine.prototype.destroy = function () {
    var widgetInstance = this._widgetInstance;
    if (widgetInstance && widgetInstance.dispatchEvent) {
        var destroyEvent = new DestroyEvent();
        this._widgetInstance.dispatchEvent(destroyEvent);
        this._widgetInstance = null;
    }

    // Call each plugin's destroy method
    this.plugins.forEach(function (plugin) {
        if (typeof plugin.destroy === 'function') {
            plugin.destroy();
        }
    });

    this.config.renderer.destroy();
};

var validateConfig = function(config) {

    var messages = {
        warnings: [],
        errors: []
    };

    //widgetpath
    if(typeof config.widgetPath !== 'string') {
        messages.errors.push('You must supply a valid widget path');
    } else if(config.widgetPath.indexOf(CONFIG_FILE_NAME) >= 0) {
        messages.errors.push('Please supply the base path of your widget, not its configuration file path');
    }

    if(!config.initialModel && !config.reader) {
        messages.warnings.push('No initial model or widget reader was provided. Can\'t get any config');
    }

    if(config.reader && !config.parser) {
        messages.warnings.push('A widget reader was provided, but not a widget config parser');
    }

    if(config.reader && !(config.reader instanceof ConfigReader)) {
        messages.warnings.push('The configured widget reader might not be a valid ConfigReader instance');
    }

    if(config.parser && !(config.parser instanceof ConfigParser)) {
        messages.warnings.push('The configured widget parser might not be a valid ConfigParser instance');
    }

    //storage
    if(!config.storage) {
        messages.errors.push('No widget storage is configured');
    } else if(!(config.storage instanceof WidgetStorage)) {
        messages.warnings.push('The configured widget storage might not be a valid WidgetStorage instance');
    }

    //renderer
    if(!config.renderer) {
        messages.errors.push('No widget renderer is configured');
    } else if(!(config.renderer instanceof WidgetRenderer)) {
        messages.warnings.push('The configured widget renderer might not be a valid WidgetRenderer instance');
    }

    return messages;
};

var invokePluginsForPhase = function(plugins, log, phase, pluginArgs) {

    var result = ExtPromise.all(pluginArgs);

    //loop through the plugins and sequentially invoke the plugin function for the current phase
    plugins.filter(function(plugin) {
        return typeof plugin[phase] === 'function';
    }).forEach(function(plugin) {
        var pluginName = plugin.name || 'Anonymous plugin';
        var lastArgs;

        result = result.then(function(args) { // args is always an array
            lastArgs = args;
            var promise = plugin[phase].apply(plugin, args);

            return [promise, args];
        }).spread(function(pluginReturnValue, args) {

            // if plugin returned nothing, fallback to arguments it was provided with
            // otherwise we assume it returned what it got as the first argument
            return pluginReturnValue === undefined ? args : [pluginReturnValue].concat(args.slice(1));
        }).catch(function(e) {
            // recover from failure, so that one failed plugin doesn't ruin widget rendering
            var message = 'Failed to invoke plugin [' + pluginName + '] for [' + phase + ']';
            log.error(e, message);

            // keep running plugins with what last successfully invoked plugin returned
            return lastArgs;
        });
    });

    return result;
};

var guessContentType = function(widgetModel) {
    var results = widgetModel.content.src.match(/\.([A-z0-9]+)$/);
    return results && results[1] && mimeTypes[results[1]] || widgetModel.content.type;
};

module.exports = WidgetEngine;

},{"../events/destroy-event":210,"../util/logger-factory":248,"../util/util":250,"../util/verror":251,"./config-aggregator":195,"./config-parser":196,"./config-reader":197,"./widget-feature-augmenter":200,"./widget-instance-factory":201,"./widget-renderer":202,"./widget-storage":203,"promise-extensions":194}],200:[function(require,module,exports){
/**
 * Widget Feature Augmenter
 * This module is an extension of the functionality in the <code>widget-instance-factory</code> for adding features
 * to widget instances.
 * @module core/widget-feature-augmenter
 * @exports {WidgetFeatureAugmenter} The constructor
 */

'use strict';

/**
 * Augments a widget object by initializing and adding a set of feature instances to its feature api
 * @constructor
 */
var WidgetFeatureAugmenter = function() {
};

/**
 * Adds a a list of features to the widget
 * @param {Object} widgetInstance The widget instance to add the features to
 * @param {Array} featureInstances a list of features to augment
 * @param {Object} widgetModel
 * @returns {Object} the widget instance modified
 */
WidgetFeatureAugmenter.prototype.addFeaturesToWidget = function(widgetInstance, featureInstances, widgetModel) {

    featureInstances = featureInstances || [];

    //helpers
    function findFeatureInstance(featureName, featureInstances) {
        return featureInstances.filter(function(featureInstance) {
           return featureInstance.name === featureName;
        })[0] || null;
    }
    function findFeatureConfig(featureName, widgetModel) {
        return widgetModel.features.filter(function(featureConfig) {
            return featureConfig.name === featureName;
        })[0] || null;
    }

    //WORKAROUND:
    //the idea with features is that the widget configuration must include a "feature request" for the feature 
    //to be available on the widget interface. this makes it clear by looking at a widget's configuration what
    //features it uses.
    //However our model does not yet support the "feature request" mechanism which makes features very prohibitive
    //to use. This code is a workaround that ensure all available features are added to the widget config and, 
    //therefore, added to the widget interface
    widgetModel.features = widgetModel.features || [];
    featureInstances.forEach(function (featureInstance) {
        //if the feature is not requested by the widget configuration, add it
        if(featureInstance.name && !findFeatureConfig(featureInstance.name, widgetModel)) {
            widgetModel.features.push({
                name: featureInstance.name,
                params: [],
                required: false
            });
        }
    });

    var featureMap = {};
    for(var i = 0; i < widgetModel.features.length; i++) {
        var featureConfig = widgetModel.features[i];
        var instance = findFeatureInstance(featureConfig.name, featureInstances);
        if (instance) {
            //initialize the feature instance with the widget specific params
            if (typeof instance._init === 'function') {
                instance._init(featureConfig.params, widgetInstance, widgetModel); //memory ok here?
            }
            Object.defineProperty(featureMap, instance.name, {
                enumerable: true,
                value: instance
            });
        } else if (featureConfig.required) {
            //throw an error the instance for a required feature is not available
            var message = 'Unable to render widget. A required feature is not available (' + featureConfig.name + ')';
            throw new Error(message);
        }
    }
    Object.defineProperty(widgetInstance, 'features', {
        enumerable: false,
        value: featureMap
    });

    return widgetInstance;
};

module.exports = WidgetFeatureAugmenter;
},{}],201:[function(require,module,exports){
/**
 * Widget Instance Factory
 * @module core/widget-instance-factory
 */

'use strict';

var util = require('../util/util');

var STRING_PROPS = [
    'author',
    'version',
    'id',
    'authorEmail',
    'authorHref',
    'locale'
];

var LOCALIZABLE_STRING_PROPS = [
    'description',
    'name',
    'shortName'
];

/**
 * Creates widget instances
 * @constructor
 */
var  WidgetInstanceFactory = function() {
};

/**
 * Makes a widget instance
 * @param {Object} widgetModel The model to get the widget data from
 * @param {WidgetStorage} storage The storage strategy implementation to use for preferences
 * @param {WidgetRenderer} renderer A references to the renderer. Necessary for operations such as getting width/height
 * @param {string} The base path of the widget. This is the directory where the configuration doc can be found
 * @returns {Object} The widget instance
 */
WidgetInstanceFactory.prototype.makeWidget = function(widgetModel, storage, renderer, widgetPath) {

    var widget = {};
    var locale = widgetModel.locale || null;

    //baseURI
    Object.defineProperty(widget, 'baseURI',  {
        enumerable: true,
        value: widgetPath
    });

    //define core string properties
    STRING_PROPS.forEach(function (propName) {
        Object.defineProperty(widget, propName, {
            enumerable: true,
            value: typeof widgetModel[propName] !== 'undefined' ? widgetModel[propName] : ''
        });
    });

    //define localizable string properties
    LOCALIZABLE_STRING_PROPS.forEach(function (propName) {

        var value = null;

        //try to find on the localized widget model
        if(locale && widgetModel._lang) {
            //find localized widget model
            var possibleLocales = util.getDescendantLocales(locale);
            var localizedWidgetModels = possibleLocales.map(function(possibleLocale) {
                return widgetModel._lang[possibleLocale];
            });
            var getValueFromLocalizedWidgetModels = function(localizedWidgetModels) {
                var value;
                if(localizedWidgetModels.length) {
                    var model = localizedWidgetModels.pop();
                    if(model) {
                        value = model[propName];
                    }
                    if(typeof value !== 'string') {
                        return getValueFromLocalizedWidgetModels(localizedWidgetModels);
                    }
                }
                return value;
            };
            value = getValueFromLocalizedWidgetModels(localizedWidgetModels);
        }
        //try to find default value if the localized model did not contain a valid value
        if(typeof value !== 'string' && typeof widgetModel[propName] === 'string') {
            value = widgetModel[propName];
        }
        //if there is no default value, try to match to the default locale
        else if(typeof value !== 'string' && widgetModel.defaultlocale) {
            var defaultLocalizedWidgetModel = widgetModel._lang[widgetModel.defaultlocale];
            if(defaultLocalizedWidgetModel) {
                value = defaultLocalizedWidgetModel[propName];
            }
        }

        Object.defineProperty(widget, propName, {
            enumerable: true,
            value: typeof value === 'string' ? value : ''
        });
    });

    //width and height
    Object.defineProperty(widget, 'width', {
        enumerable: true,
        get: function() {
            return renderer.getWidth();
        }
    });
    Object.defineProperty(widget, 'height', {
        enumerable: true,
        get: function() {
            return renderer.getHeight();
        }
    });

    //preferences
    Object.defineProperty(widget, 'preferences', {
        enumerable: false,
        value: storage
    });

    return widget;
};

module.exports = WidgetInstanceFactory;

},{"../util/util":250}],202:[function(require,module,exports){
/* jshint unused: vars */

/**
 * Tne Widget Engine
 * @module core/widget-renderer
 * @exports {WidgetRenderer} The constructor
 */

'use strict';

var util = require('../util/util');

/**
 * Renders a widget
 * @interface
 * @constructor
 * @param {Object} opts
 * @param {String} [opts.useFolderLocalization] Explicitly instructs the renderer to attempt to use folder
 *                                            localization. i.e. To look for the start file in
 *                                            /widgetPath/[locale]/index.html
 */
var WidgetRenderer = function(opts) {};

/**
 * Starts the rendering process
 * @param {Object} widgetModel
 * @param {Object} widgetInstance
 */
WidgetRenderer.prototype.render = function(widgetModel, widgetInstance) {

    throw new Error('WidgetRenderer#render must be overridden.');
};

/**
 * Process a startFile
 * @param {Object} widgetModel
 * @param {Object} widgetInstance
 * @param {String} startFileContent
 */
WidgetRenderer.prototype.process = function(widgetModel, widgetInstance, startFileContent) {

    throw new Error('WidgetRenderer#process must be overridden.');
};

/**
 * Returns the width of the widget
 */
WidgetRenderer.prototype.getWidth = function() {

    throw new Error('WidgetRenderer#getWidth must be overridden.');
};

/**
 * Returns the height of the widget
 */
WidgetRenderer.prototype.getHeight = function() {

    throw new Error('WidgetRenderer#getHeight must be overridden.');
};

/**
 * Returns the (typically) DOM node where the widget is rendered
 */
WidgetRenderer.prototype.getWidgetNode = function() {

    throw new Error('WidgetRenderer#getWidgetNode must be overridden.');
};

/**
 * Return the (typically) parent node of the where the widget was rendered
 */
WidgetRenderer.prototype.getParentNode = function() {
    throw new Error('WidgetRenderer#getContainerNode must be overridden.');
};

/**
 * Sets the parent node
 */
WidgetRenderer.prototype.setParentNode = function() {
    throw new Error('WidgetRenderer#setContainerNode must be overridden.');
};

/**
 * Returns a map of area nodes, which map area keys to dom nodes. Used by widgets that have children (containers)
 */
WidgetRenderer.prototype.getAreaNodes = function() {

    if (this.isContainer) {
        throw new Error('WidgetRenderer#getAreaNodes must be overridden.');
    }
};

/**
 * Cleans up dom elements created during the rendering process
 * (link tags, script tags, widget dom element)
 */
WidgetRenderer.prototype.destroy = function() {
    throw new Error('WidgetRenderer#destroy must be overriden.');
};

/**
 * Determines if the widget has already been rendered
 */
WidgetRenderer.prototype.isRendered = function() {
    throw new Error('WidgetRenderer#isRendered must be overridden.');
};



/**
 * Gets the widget mime type
 * @returns {string}
 */
WidgetRenderer.prototype.getType = function() {

    //default type for renderers
    return 'text/html';
};

/**
 * Returns a stack of start files. Renderers should first attempt to render the top start file in the stack
 * and pop on each failure until a successful start file is found
 * @param widgetPath
 * @param widgetModel
 * @returns {Array}
 */
WidgetRenderer.getResolvedStartFilePath = function(widgetPath, widgetModel) {

    var startFileName = widgetModel.content && widgetModel.content.src ? widgetModel.content.src : 'index.html';
    return makeFullPath(widgetPath, startFileName);
};

function makeFullPath(widgetPath, startFile) {

    var noResolve =
        //start file is absolute (http://...../index.html)
        util.isUrlAbsolute(startFile) ||
        //widget path is site relative (/path/to/widget) and so is start file (/assets/index.html)
        (util.isUrlSiteRelative(widgetPath) && util.isUrlSiteRelative(startFile)) ||
        //start file begins with the widget path    
        (widgetPath && util.startsWith(startFile, widgetPath));

    if (noResolve) {
        return startFile;
    } else {
        var joinWithSlash = !util.endsWith(widgetPath, '/') && !util.startsWith(startFile, '/');
        return joinWithSlash ? widgetPath + '/' + startFile : widgetPath + startFile;
    }
}

module.exports = WidgetRenderer;
},{"../util/util":250}],203:[function(require,module,exports){
/* jshint unused: vars */

/**
 * Widget Storage. This is an implementation of <a href="http://www.w3.org/TR/webstorage/">W3C Web Storage</a>
 * @module core/widget-storage
 * @exports {WidgetStorage} The widget storage constructor
 */

'use strict';

/**
 * Widget decorator for web storage
 * @param storage A web storage implementation. e.g. sessionStorage
 * @constructor
 * @interface
 */
function WidgetStorage(storage) {}

/**
 * Initializes the storage
 * @method
 * @param {string} widgetInstanceId The widget id. Typically used as a key prefix in the underlying impl
 * @param {Array} preferences An array of preferences objects to initialize the storage with
 */
WidgetStorage.prototype.init = function(widgetInstanceId, preferences) {
    throw new Error('WidgetStorage#init must be overridden.');
};

/**
 * Gets an item
 * @param {string} key of the item to get
 */
WidgetStorage.prototype.getItem = function(key) {
    throw new Error('WidgetStorage#getItem must be overridden.');
};

/**
 * Sets or updates an item
 * @param {string} key
 * @param {string} value
 * @param {boolean} readonly
 */
WidgetStorage.prototype.setItem = function(key, value, readonly) {
    throw new Error('WidgetStorage#setItem must be overridden.');
};

/**
 * Removes the item from storage
 * @param {string} key
 */
WidgetStorage.prototype.removeItem = function(key) {
    throw new Error('WidgetStorage#removeItem must be overridden.');
};

/**
 * Clears the storage
 * @param {string} key
 */
WidgetStorage.prototype.clear = function(key) {
    throw new Error('WidgetStorage#removeItem must be overridden.');
};

/**
 * Returns a list of the keys used by this storage
 * @returns {Array} a list of keys
 */
WidgetStorage.prototype.key = function(n) {
    throw new Error('WidgetStorage#key must be overridden.');
};

/**
 * Export the constructor
 * @type {WidgetStorage}
 */
module.exports = WidgetStorage;
},{}],204:[function(require,module,exports){
/**
 * Datasource resolver factory. It accepts resolver creating functions and use them to get
 * a resolver that can handle a datasource. @see {@link datasource/datasource-resolver} for more information on datasource
 * resolver.
 * @module datasource/datasource-resolver-factory
 * @exports {DatasourceResolverFactory}
 */

'use strict';

module.exports = DatasourceResolverFactory;

/**
 * Creates an instance of a factory
 * @param {Object} opts Options object. Holds configuration options that is passed to a resolver creating functions.
 * @constructor
 */
function DatasourceResolverFactory() {
    this._resolvers = [];
}

/**
 * Adds a datasource resolver creating function to a factory.
 * @param {Function} resolverFunc A function that accepts a datasource as the first argument and configuration options
 * object as the second argument. The function should return an instance of a datasource resolver if the resolver can
 * handle that datasource or return undefined otherwise.
 */
DatasourceResolverFactory.prototype.addResolver = function addResolver(resolverFunc) {
    if (typeof resolverFunc !== 'function') {
        throw new TypeError('resolverFunc argument must be a function');
    }

    this._resolvers.push(resolverFunc);
};

/**
 * Finds suitable datasource resolver for the given datasource. Throws an exception if a resolver not found.
 * If more than 1 resolver found, the last one returned.
 * @param {Object} datasource A datasource object
 * @param {string} datasource.name A datasource name
 * @param {string} datasource.uri A datasource URI
 * @param {Array<Object>} datasource.params A collection of objects that represent query parameters. An object has
 * name and value properties.
 * @returns {DatasourceResolver} An instance of a datasource resolver that can handle the datasource.
 */
DatasourceResolverFactory.prototype.getResolver = function getResolver(datasource) {
    var suitableResolvers = this._resolvers.map(function (resolverFunc) {
        return resolverFunc(datasource);
    }).filter(function (resolver) {
        return !!resolver;
    });

    var len = suitableResolvers.length;
    if (len === 0) {
        throw new Error('No datasource resolver found which can handle [' + datasource.uri + '] URI');
    }

    // return the last resolver in case more than one resolver found
    return suitableResolvers[len - 1];
};

},{}],205:[function(require,module,exports){
(function (global){
/**
 * A set of helpers a datasource resolver needs to build a request URL
 */
'use strict';

var EXPRESSION_TOKENIZER = /\$\{([^}\s]+)}/g;
var SLASHES_REGEXP = /^\/+|\/+$/g;

/**
 * Resolves expressions in a string. "${path_to_property}" is an expression where path_to_value is a
 * path to a property in the context object a value of which should replace the expression.
 * Path may reference a property of a nested object, for example ${propA.propB.propC}.
 * @param {Object} context An object an templateString is resolved against
 * @param {string} templateString A template string which may contain "${path}" expressions to be
 * replaced with actual values taken from the context object
 * @returns {string} The template string with resolved expressions
 */
function resolveExpression (context, templateString) {
    if (!templateString) {
        return '';
    }

    return templateString.replace(EXPRESSION_TOKENIZER, function (token, content) {
        var replaceValue = resolveValue(context, content);
        return replaceValue === undefined || replaceValue === null ? '' : replaceValue;
    });
}

/**
 * Takes a value of a property found by path
 * @param {Object} obj An object to traverse
 * @param {string} path A path to a property
 * @returns {*|undefined} A value of a property if it's found, undefined otherwise
 */
function resolveValue (obj, path) {
    var fields = typeof path === 'string' ? path.split('.') : path;
    var index = 0;
    var value = obj;
    var length = fields.length;

    while (value != null && index < length) { // jshint ignore:line
        value = value[fields[index++]];
    }

    return (index && index === length) ? value : undefined;
}

/**
 * Decodes string before encoding in order to avoid double encoding issue
 * @param {string} str A source string
 * @returns {string} URI encoded string
 */
function encodeURIComponent (str) {
    var decodedStr = str;

    try {
        decodedStr = global.decodeURIComponent(str);
    } catch(err) {}

    return global.encodeURIComponent(decodedStr);
}

/**
 * Trims slashes from string
 * @param {string} source A source string
 * @returns {string}
 */
function trimSlashes (source) {
    return source.trim().replace(SLASHES_REGEXP, '');
}

/**
 * Resolves expressions in datasource parameter name and value
 * @param {Object} context An object expressions are resolved against
 * @param {object} param A datasource parameter
 * @returns {Object} A parameter with name and/or value resolved
 */
function resolveParameter (context, parameter) {
    var param = parameter || {};
    var value = param.value;

    return {
        name: resolveExpression(context, param.name),
        value: typeof value === 'string' ? resolveExpression(context, value) : value
    };
}

/**
 * Builds query string from datasource parameters encoding their name and value
 * @param {Array} params An array of datasource parameters
 * @returns {string} A query string (name1=value1&name2=value2)
 */
function buildQueryString(params) {
    return (params || []).map(function (param) {
        return encodeURIComponent(param.name) + '=' + encodeURIComponent(param.value);
    }).join('&');
}

/**
 * Resolves parameter expressions and builds query string
 * @param {Object} context An object expressions are resolved against
 * @param {Array} params An array of datasource parameters
 * @returns {string} A query string
 */
function resolveQueryString(context, params) {
    var resolvedParams = (params || []).map(function (param) {
        return resolveParameter(context, param);
    }).filter(function (param) {
        return !!param.name;
    });

    return buildQueryString(resolvedParams);
}

module.exports = {
    resolveExpression   : resolveExpression,
    resolveParameter    : resolveParameter,
    buildQueryString    : buildQueryString,
    resolveQueryString  : resolveQueryString,
    encodeURIComponent  : encodeURIComponent,
    trimSlashes         : trimSlashes
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],206:[function(require,module,exports){
/**
 * Handles a datasource by relying on an underlying datasource-specific implementation
 * @module datasource/datasource-resolver
 * @exports {DatasourceResolver}
 */

'use strict';
var loggerFactory   = require('../util/logger-factory');
var fetch           = require('../fetch/filtering-fetch');
var responseHelpers = require('../util/response-helpers');

/**
 * Verifies a datasource URI schema
 * @param {string} schema A schema a datasource must have
 * @param {Object} datasource A datasource object
 * @param {string} datasource.uri datasource URI
 * @returns {boolean}
 */
function defaultTestFunc(schema, datasource) {
    var uri = datasource && datasource.uri;
    return uri && uri.slice(0, schema.length).toLowerCase() === schema;
}

/**
 * Gets the value of the given preference
 * @param {Object} preferences A preferences object
 * @param {string} preferenceName name of the preference
 * @returns {string | null}
 */
function getPreferenceValue(preferences, preferenceName) {
    var preference = preferences[preferenceName];

    return preference ? preference.value : null;
}

module.exports = DatasourceResolver;

/**
 * Creates an instance of DatasourceResolver
 * @param {Object} strategy A datasource-specific implementation of a resolver. It must have "resolveUrl" and
 * "processResponse" methods.
 * @constructor
 */
function DatasourceResolver(strategy) {
    this._resolverImpl = strategy;

    var parentLog = loggerFactory.getLogger();
    this._log = parentLog.child({childName: 'datasource-resolver'});
}

/**
 * Loads data from a datasource. Delegates URL resolution and response processing to an underlying implementation.
 * @param {Object} context An object the implementation uses as a context for expression resolution
 * @returns {Promise.<*>} A promise is resolved with what processResponse method of the implementation returns
 */
DatasourceResolver.prototype.loadData = function (context) {
    var resolver = this._resolverImpl;
    var url = resolver.resolveUrl(context);

    var preferences = context.preferences || {};
    var locale = getPreferenceValue(preferences, 'locale');

    var requestHeaders = {
        'Cache-control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
    };

    if(locale) {
        requestHeaders['Accept-Language'] = locale;
    }

    return fetch(url, {
        headers: requestHeaders,
    }).then(function (response) {
        return responseHelpers.isResponseOk(response) ?
            Promise.resolve(response) : 
            Promise.reject(responseHelpers.createError(response));
    }).then(function (response) {
        return resolver.processResponse(response, context);
    });
};

/**
 * Creates a function that can be used by DatasourceResolverFactory to get a relevant datasource resolver
 * @param {string|Function} datasourceSchema Either a datasource URI schema or a function that verifies a resolver
 * can be used to handle a provided datasource
 * @param {Function} Resolver A constructor of datasource-specific resolver implementation.
 * @returns {Function} The function accepts a datasource parameter and returns either an instance of DatasourceResolver
 * initialized with the provided resolver implementation or undefined if the implementation cannot handle that
 * datasource.
 * @static
 */
DatasourceResolver.createFactoryFunction = function factoryFunc(datasourceSchema, Resolver) {
    var log = this._log;
    var testFunc = typeof datasourceSchema === 'function' ?
        datasourceSchema :
        defaultTestFunc.bind(null, datasourceSchema);

    return function (datasource) {
        if (testFunc(datasource)) {
            var resolverImpl = new Resolver(datasource, log);
            return new DatasourceResolver(resolverImpl);
        }
    };
};

},{"../fetch/filtering-fetch":214,"../util/logger-factory":248,"../util/response-helpers":249}],207:[function(require,module,exports){
/**
 * A mixin that implements EventTarget specification
 * https://dom.spec.whatwg.org/#eventtarget
 */
'use strict';

var eventWrapper = require('./event-wrapper');
var helpers = require('./helpers');

var createEventWrapper = eventWrapper.createEventWrapper;
var STOP_IMMEDIATE_PROPAGATION_FLAG = eventWrapper.STOP_IMMEDIATE_PROPAGATION_FLAG;
var PASSIVE_LISTENER_FLAG = eventWrapper.PASSIVE_LISTENER_FLAG;

var PREFIX = '@@';

/**
 * Adds an event listener to a target
 * @private
 * @param {object} self A target object
 * @param {string} type An event type
 * @param {function|object} listener A listener
 * @param {boolean|object} [options] @see https://dom.spec.whatwg.org/#eventtarget
 */
function on(self, type, listener, options) {
    var handlerFunc = helpers.normalizeListener(listener);
    if (!handlerFunc) {
        throw new TypeError('Unrecognized "listener" argument. It must be a function or an object with handleEvent method.');
    }

    var opts = helpers.normalizeOptions(options);
    var handlers;

    if (Object.prototype.hasOwnProperty.call(self, type)) {
        handlers = self[type];
    } else {
        handlers = [];
        Object.defineProperty(self, type, {
            writable: true,
            configurable: true,
            value: handlers
        });
    }

    var handlerExists = handlers.some(function(handler) {
        return handler.func === handlerFunc && handler.opts.capture === opts.capture;
    });
    if (!handlerExists) {
        handlers.push({
            func: handlerFunc,
            opts: opts
        });
    }
}

/**
 * Removes an event listener from a target
 * @private
 * @param {object} self A target object
 * @param {string} type An event type
 * @param {function|object} listener A listener
 * @param {boolean|object} [options] @see https://dom.spec.whatwg.org/#eventtarget
 */
function off(self, type, listener, options) {
    var handlerFunc = helpers.normalizeListener(listener);
    if (!handlerFunc) {
        throw new TypeError('Unrecognized "listener" argument. It must be a function or an object with handleEvent method.');
    }
    
    var opts = helpers.normalizeOptions(options);

    if (Object.prototype.hasOwnProperty.call(self, type)) {
        var handlers = self[type] = self[type].filter(function(handler) {
            return handler.func !== handlerFunc || handler.opts.capture !== opts.capture;
        });
        if (handlers.length === 0) {
            delete self[type];
        }
    }
}

/**
 * Invokes listeners on target passing an event to them
 * @private
 * @param {object} self A target object
 * @param {string} type An event type
 * @param {Event} ev An event object
 * @returns {boolean} true if either event’s cancelable attribute value is false 
 * or its preventDefault() method was not invoked, and false otherwise.
 */
function dispatch(self, type, ev) {
    if (!Object.prototype.hasOwnProperty.call(self, type)) {
        return true;
    }

    var handlers = self[type];
    var wrappedEv = createEventWrapper(ev, self);

    var returnValue = handlers.filter(function(handler) {
        return !handler.opts.capture;
    }).reduce(function(acc, handler) {
        if(wrappedEv[STOP_IMMEDIATE_PROPAGATION_FLAG]) {
            return acc;
        }
        wrappedEv[PASSIVE_LISTENER_FLAG] = handler.opts.passive;
        handler.func.call(self, wrappedEv);
        if (handler.opts.once) {
            handler.remove = true;
        }

        return !wrappedEv.defaultPrevented;
    }, true);

    // remove "once" handlers which have been executed
    handlers = self[type] = handlers.filter(function(handler) {
        return !handler.remove;
    });
    if (handlers.length === 0) {
        delete self[type];
    }

    return returnValue;
}

module.exports = Object.create(Object.prototype, {
    addEventListener: {
        value: function addEventListener(type, listener, options) {
            if (helpers.isEmpty(type)) {
                throw TypeError('Type argument cannot be empty');
            }
            if(typeof listener === 'undefined') {
                throw TypeError('Listener argument is required');
            }
            on(this, PREFIX + type, listener, options);
        }
    },
    removeEventListener: {
        value: function removeEventListener(type, listener, options) {
            if (helpers.isEmpty(type)) {
                throw TypeError('Type argument cannot be empty');
            }
            if(typeof listener === 'undefined') {
                throw TypeError('Listener argument is required');
            }
            off(this, PREFIX + type, listener, options);
        }
    },
    dispatchEvent: {
        value: function dispatchEvent(event) {
            if (!helpers.isObject(event)) {
                throw new TypeError('Event argument is not an object');
            }
            if (helpers.isEmpty(event.type)) {
                throw new TypeError('Event object must have non-empty "type" property');
            }
            return dispatch(this, PREFIX + event.type, event);
        }
    }
});

},{"./event-wrapper":208,"./helpers":209}],208:[function(require,module,exports){
/**
 * @copyright 2015 Toru Nagashima. All rights reserved.
 * 
 * This module has been borrowed from (event-target-shim)[https://github.com/mysticatea/event-target-shim] 
 * package with some modifications.
 * 
 * There are 2 reasons to wrap event objects:
 * 1. it adds Event interface implementation to event objects that are just plain objects.
 * 2. it allows to update certain properties (like target) of native events which are read-only
 * by specification.
 */
'use strict';

/**
 * The key of the flag which is turned on by `stopImmediatePropagation` method.
 *
 * @type {string}
 * @private
 */
var STOP_IMMEDIATE_PROPAGATION_FLAG = '__STOP_IP';

/**
 * The key of the flag which is turned on by `preventDefault` method.
 *
 * @type {string}
 * @private
 */
var CANCELED_FLAG = '__CANCELED';

/**
 * The key of the flag that it cannot use `preventDefault` method.
 *
 * @type {string}
 * @private
 */
var PASSIVE_LISTENER_FLAG = '__PASSIVE_LISTENER';

/**
 * The key of the original event object.
 *
 * @type {string}
 * @private
 */
var ORIGINAL_EVENT = '__ORIG_EVENT';

/**
 * Method definitions for the event wrapper.
 *
 * @type {object}
 * @private
 */
var wrapperPrototypeDefinition = {
    stopPropagation: {
        value: function stopPropagation() {
            var e = this[ORIGINAL_EVENT];
            if (typeof e.stopPropagation === 'function') {
                e.stopPropagation();
            }
        },
        writable: true,
        configurable: true,
    },

    stopImmediatePropagation: {
        value: function stopImmediatePropagation() {
            this[STOP_IMMEDIATE_PROPAGATION_FLAG] = true;

            var e = this[ORIGINAL_EVENT];
            if (typeof e.stopImmediatePropagation === 'function') {
                e.stopImmediatePropagation();
            }
        },
        writable: true,
        configurable: true,
    },

    preventDefault: {
        value: function preventDefault() {
            if (this[PASSIVE_LISTENER_FLAG]) {
                return;
            }
            if (this.cancelable === true) {
                this[CANCELED_FLAG] = true;
            }

            var e = this[ORIGINAL_EVENT];
            if (typeof e.preventDefault === 'function') {
                e.preventDefault();
            }
        },
        writable: true,
        configurable: true,
    },

    defaultPrevented: {
        get: function defaultPrevented() {
            return this[CANCELED_FLAG];
        },
        enumerable: true,
        configurable: true,
    }
};

//-----------------------------------------------------------------------------
// Public Interface
//-----------------------------------------------------------------------------

module.exports.STOP_IMMEDIATE_PROPAGATION_FLAG = STOP_IMMEDIATE_PROPAGATION_FLAG;
module.exports.PASSIVE_LISTENER_FLAG = PASSIVE_LISTENER_FLAG;

/**
 * Creates an event wrapper
 *
 * We cannot modify several properties of `Event` object, so we need to create the wrapper.
 * Plus, this wrapper supports non `Event` objects.
 *
 * @param {Event|Object} event - An original event to create a wrapper for
 * @param {EventTarget} eventTarget - The event target of the event
 * @returns {Event} wrapper object. It implements `Event` interface
 */
module.exports.createEventWrapper = function createEventWrapper(event, eventTarget) {
    var timeStamp = typeof event.timeStamp === 'number' ? event.timeStamp : Date.now();
    var propertyDefinition = {
        //type: {value: event.type},
        target: {value: eventTarget},
        currentTarget: {value: eventTarget},
        eventPhase: {value: 2}, // ON_TARGET
        bubbles: {value: event.bubbles === true},
        cancelable: {value: event.cancelable === true},
        timeStamp: {value: timeStamp},
        isTrusted: {value: false, enumerable: true}
    };
    propertyDefinition[STOP_IMMEDIATE_PROPAGATION_FLAG] = {value: false, writable: true};
    propertyDefinition[CANCELED_FLAG] = {value: false, writable: true};
    propertyDefinition[PASSIVE_LISTENER_FLAG] = {value: false, writable: true};
    propertyDefinition[ORIGINAL_EVENT] = {value: event};

    return Object.create(
        Object.create(event, wrapperPrototypeDefinition),
        propertyDefinition
    );
};

},{}],209:[function(require,module,exports){
'use strict';

/**
 * Checks whether the given value is an object
 * @param {*} value A value to check
 * @returns {boolean} true if the value is an object, false otherwise
 */
function isObject(value) {
    return value !== null && typeof value === 'object';
}

/**
 * Checks whether the given value is undefined, null or an empty string
 * @param {*} value A value to check
 * @returns {boolean}
 */
function isEmpty(value) {
    return typeof value === 'undefined' || value === null || value === '';
}

/**
 * According to EventTarget specification, the "listener" argument of addEventListener and 
 * removeEventListener methods can be either a function or an object with handleEvent method.
 * This function normalizes a listener to a function.
 * @param {function|object} listener A listener
 * @returns {function|null} normalized listener. Returns null if the listener cannot be normalized.
 */
function normalizeListener(listener) {
    var handler = typeof listener === 'function' ? listener : null;
    if (isObject(listener) && typeof listener.handleEvent === 'function') {
        handler = listener.handleEvent;
    }

    return handler;
}

/**
 * According to EventTarget specification, the optional "options" argument of addEventListener and 
 * removeEventListener methods can be either a boolean or an object with some boolean properties.
 * This function normalizes options to an object.
 * @param {boolean|object} options
 * @returns {object} normalized options object
 */
function normalizeOptions(options) {
    var opts = {
        capture: false,
        passive: false,
        once: false
    };
    if (typeof options === 'boolean') {
        opts.capture = options === true;
    } else if (isObject(options)) {
        opts.capture = options.capture === true;
        opts.passive = options.passive === true;
        opts.once = options.once === true;
    }

    return opts;
}

module.exports = {
    isEmpty: isEmpty,
    isObject: isObject,
    normalizeListener: normalizeListener,
    normalizeOptions: normalizeOptions
};

},{}],210:[function(require,module,exports){
(function (global){
'use strict';

function DestroyEvent (eventInit) {
    var eventType = 'destroy';

    if(typeof global.Event === 'function') {
        return new global.Event(eventType, eventInit);
    } else {
        var event = global.document.createEvent('Event');
        var opts = eventInit || {};

        event.initEvent(eventType, opts.bubbles === true, opts.cancelable === true);
        return event;
    }
}

module.exports = DestroyEvent;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],211:[function(require,module,exports){
/**
 * Sets request "credentials" property.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials}
 * @module fetch/credentials-filter
 */

/* globals Request: false */
'use strict';

var util = require('../util/util');

/**
 * Sets "include" value of "credentials" request setting if widgets are loaded from local file system
 * (mobile use scenario) and those widgets make cross-origin requests to a remote server. Sets "same-origin"
 * value otherwise.
 * @private
 * @param {Request} [request] fetch request object
 * @returns {Object}
 */
module.exports = function credentialsFilter(request) {
    if (request.credentials !== 'omit') {
        return request;
    }

    var credentials = util.isRunningOnFilesystem() ? 'include' : 'same-origin';
    return new Request(request, {credentials: credentials});
};
},{"../util/util":250}],212:[function(require,module,exports){
(function (global){
/**
 * Dedupes requests by storing responses in the cache.
 * Decorates Fetch API. Supposed to be used instead of fetch function where response caching is appropriate.
 * @module fetch/deduping-fetch
 */

'use strict';

var loggerFactory   = require('../util/logger-factory');
var util            = require('../util/util');
var fetchFile       = require('./fetch-file');
var responseHelpers = require('../util/response-helpers');

var EXPIRE_TIMESPAN = 1000;

var fetchPromiseCache = {};
var log;

/**
 * Adds an item to the cache.
 * @private
 * @param {string} key The cache key that is used to reference an item.
 * @param {Promise} item An item to insert into the cache.
 * @param {Number} [ttl] The interval in milliseconds between the time a cached object was added/last
 * accessed and the time at which that object expires. If not specified, an item will stay in the cache indefinitely.
 */
function addToCache(key, item, ttl) {
    var cacheItem = createCacheItem(item);
    fetchPromiseCache[key] = cacheItem;

    if (ttl > 0) {
        cacheItem.timeoutId = removeOnExpire(key, ttl);
    }
}

/**
 * Retrieves an item from the cache.
 * @private
 * @param {string} key The cache key that is used to reference an item.
 * @returns {Promise} An item if it's found, undefined otherwise.
 */
function getFromCache(key) {
    var cacheItem = fetchPromiseCache[key];
    var value;

    if (cacheItem) {
        cacheItem.setLastAccessedTime();
        value = cacheItem.value;
    }

    return value;
}

/**
 * Sets a handler that removes an item with sliding expiration policy
 * @private
 * @param {string} key The cache key that is used to reference an item.
 * @param {Number} ttl time-to-live an interval over which an item stays in the cache.
 * @param {Number} [expire] used by recursive calls
 */
function removeOnExpire(key, ttl, expire) {
    var timeout;

    if (typeof expire === 'undefined') {
        timeout = ttl;
        log.debug('setting sliding expire handler to purge item [%s] in %sms', key, timeout);
    } else {
        timeout = expire;
        log.debug('%sms elapsed since last access to item [%s]. Extending expiration time by %sms',
            ttl - expire, key, timeout);
    }

    return setTimeout(function () {
        var cacheItem = fetchPromiseCache[key];
        if (!cacheItem) {
            return;
        }

        var elapsedTime = (new Date()).getTime() - cacheItem.lastAccessed;
        if (elapsedTime >= ttl) {
            log.debug('purging expired item [%s]', key);
            delete fetchPromiseCache[key];
        } else {
            cacheItem.timeoutId = removeOnExpire(key, ttl, ttl - elapsedTime);
        }
    }, timeout);
}

/**
 * Removes all items from the cache
 * @private
 */
function clearCache() {
    // clear remove-on-expire handlers then remove cached item
    Object.keys(fetchPromiseCache).forEach(function (cacheKey) {
        var timeoutId = fetchPromiseCache[cacheKey].timeoutId;

        if (typeof timeoutId !== 'undefined') {
            clearTimeout(timeoutId);
        }

        delete fetchPromiseCache[cacheKey];
    });
}

/**
 * Creates a cache item - an object that wraps a value to store in the cache.
 * @private
 * @param {*} value
 * @returns {Object}
 */
function createCacheItem(value) {
    var timestamp = (new Date()).getTime();
    var cacheItem = Object.create(cacheItemProto);

    cacheItem.value = value;
    cacheItem.created = timestamp;
    cacheItem.lastAccessed = timestamp;

    return cacheItem;
}

var cacheItemProto = {
    setLastAccessedTime: function() {
        this.lastAccessed = (new Date()).getTime();
    }
};

/**
 * Create a request to a resource and caches a successful response. Delegates to the global fetch function.
 * @param {string|Request} url @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch/fetch|input parameter}
 * @param {Object} [options] @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch/fetch|init parameter}
 * @returns {Promise} A Promise that resolves to a Response object.
 */
module.exports = function dedupingFetch(url, options) {
    var resourceUrl = typeof url === 'string' ? url : url.url;
    var key = resourceUrl;
    var method = url.method || (options && options.method) || 'GET';
    var putInCache = typeof method === 'string' && method.toUpperCase() === 'GET';

    // init logger lazily until BACKLOG-12206 is done.
    if (!log) {
        log = loggerFactory.getLogger();
    }

    // clear cache if request other than GET (CXP Model API requires this behaviour)
    if (!putInCache) {
        clearCache();
    }

    var responsePromise = getFromCache(key);

    // make a request if promise is not in cache OR we don't want it from cache
    // (it's possible to have a promise in cache for GET request, but next request to the same URL might have
    // different method)
    if (!responsePromise || !putInCache) {
        // if successfully resolved, re-insert it in the cache with expiration policy
        // remove from the cache otherwise
        log.debug('data from [%s] not found in cache. Requesting it from remote resource...', key);

        var fetchFunc = util.isUrlForFile(resourceUrl) ? fetchFile : global.fetch;
        responsePromise = fetchFunc(url, options).then(function (response) {
            var status = response.status;
            log.debug('response from [%s] received. Status: [%s]', key, status);
            
            if (!responseHelpers.isResponseOk(response)) {
                var error = responseHelpers.createError(response);
                error._response = response;
                throw error;
            }

            return response;
        }).then(function (response) {
            var promise = getFromCache(key);

            if (promise) {
                log.debug('holding data from [%s] in cache for %sms', key, EXPIRE_TIMESPAN);
                addToCache(key, promise, EXPIRE_TIMESPAN);
            }

            return response;
        }).catch(function (err) {
            log.debug('removing data for [%s] from cache as the following error occurred: [%s]', key, err.message);
            delete fetchPromiseCache[key];

            if (err._response) {
                return err._response;
            }

            throw err;
        });

        // cache fetch request until it's settled
        if (putInCache) {
            addToCache(key, responsePromise);
        }
    } else {
        log.debug('returning data for [%s] from cache', key);
    }

    // return cloned response
    return responsePromise.then(function (response) {
        return response.clone();
    });
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../util/logger-factory":248,"../util/response-helpers":249,"../util/util":250,"./fetch-file":213}],213:[function(require,module,exports){
(function (global){
/**
 * Allows for use of fetch API to request resources from local file system
 * @module fetch/fetch-file
 */
'use strict';

var CONTENT_TYPE_HEADER = 'Content-Type';

module.exports = function fetchFile(url) {
    return new Promise(function(resolve, reject) {
        var resourceUrl = typeof url === 'string' ? url : url.url;
        var xhr = new global.XMLHttpRequest();
        xhr.onload = function() {
            var responseConfig = {
                status: xhr.status === 0 ? 200 : xhr.status
            };
            var contentType = xhr.getResponseHeader(CONTENT_TYPE_HEADER);
            if (contentType) {
                responseConfig.headers = {};
                responseConfig.headers[CONTENT_TYPE_HEADER] = contentType;
            }

            resolve(new global.Response(xhr.responseText, responseConfig));
        };
        xhr.onerror = function() {
            reject(new Error('Local request failed for ' + url));
        };
        xhr.open('GET', resourceUrl);
        xhr.send(null);
    });
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],214:[function(require,module,exports){
  /**
 * Provides fetch which can be configured with filters. Supports Fetch API.
 * A filter is a function which is executed before or after main action (fetch a resource) happens
 * and is ussually used to modify a request/response.
 * 2 request filters are added by default: credentials and XSRF filters.
 * It uses deduping fetch under the hood to get a resource.
 * @module fetch/filtering-fetch
 */

 /* globals Request: false */
'use strict';

var fetch = require('./deduping-fetch');
var credentialsFilter = require('./credentials-filter');
var xsrfFilter = require('./xsrf-filter');

var requestFilters = [credentialsFilter, xsrfFilter];

/**
 * Runs request filters before fetching a resource.
 * @param {string|Request} url @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch/fetch|input parameter}
 * @param {Object} [options] @see {@link https://developer.mozilla.org/en-US/docs/Web/API/GlobalFetch/fetch|init parameter}
 * @returns {Promise} A Promise that resolves to a Response object.
 */
function filteringFetch(url, options) {
    var request = requestFilters.reduce(function(req, filter) {
        return filter(req) || req;
    }, new Request(url, options));

    return fetch(request);
}

/**
 * Adds a request filter to the list of filters
 * @param {function} filter  A function which is passed a Request object as the argument. It may return a Request object and 
 * it will be passed to the next filter.
 * @returns {function} A function which removes the filter from the list of filters
 */
filteringFetch.addRequestFilter = function addRequestFilter(filter) {
    if (typeof filter !== 'function') {
        throw new TypeError('The filter argument must be a function');
    }

    requestFilters.push(filter);

    return function() {
        requestFilters = requestFilters.filter(function(requestFilter) {
            return requestFilter !== filter;
        });
    };
};

/**
 * Removes all request filters from the list
 */
filteringFetch.clearRequestFilters = function clearRequestFilters() {
    requestFilters = [];
};

module.exports = filteringFetch;
},{"./credentials-filter":211,"./deduping-fetch":212,"./xsrf-filter":215}],215:[function(require,module,exports){
/**
 * Sets request XSRF header by getting token from document cookies
 * @see {@link https://backbase.atlassian.net/wiki/display/GUIL/CSRF+Implementation}
 * @module fetch/xsrf-filter
 */

'use strict';

var COOKIE_NAME = 'XSRF-TOKEN';
var HEADER_NAME = 'X-XSRF-TOKEN';

var cookieRegex = new RegExp('(?:^|;\\s*)' + COOKIE_NAME + '=([^;]+)');

/**
 * Gets XSRF token from document cookies
 * @returns {string|undefined} A token value if the cookie exists, undefined otherwise
 * @private
 */
function getTokenValue() {
    var cookieMatch = document.cookie.match(cookieRegex);
    return cookieMatch && cookieMatch[1] || undefined;
}

/**
 * Sets XSRF header for any but "GET" request if XSRF token is found
 * @param {Request} a request object
 * @returns {Request}
 */
module.exports = function xsrfFilter(request) {
    if (!request.headers.has(HEADER_NAME) && request.method !== 'GET') {
        var token = getTokenValue();
        if (token) {
            request.headers.set(HEADER_NAME, token);
        }
    }

    return request;
};
},{}],216:[function(require,module,exports){
(function (global){
/**
 * Ths standard CXP Widget Engine Configuration for Portals
 * @module core/widget-engine
 * @exports {Html5SeamlessWidgetEngine}
 */

// HTML5 Seamless widget wrapper
// -----------------------------

'use strict';

//core engine
var WidgetEngine = require('./core/widget-engine');

//strategies
var AutoConfigParser = require('./strategies/parser/auto-config-parser');
var FetchWidgetReader = require('./strategies/reader/fetch-widget-reader');
var Html5SeamlessRenderer = require('./strategies/renderer/html5-seamless-renderer');
var Html5LocalStorage = require('./strategies/storage/html5-local-storage');
var HandlebarsPreprocessor = require('./strategies/renderer/preprocessors/handlebars-preprocessor');

var DatasourceResolverFactory = require('./datasource/datasource-resolver-factory');
var ResourceDatasourceResolver = require('./strategies/datasource/resource-datasource-resolver');
var HttpDatasourceResolver = require('./strategies/datasource/http-datasource-resolver');

//built in plugins
var CxpAdditionsPlugin = require ('./plugins/cxp-additions-plugin');
var ReplaceConfigVarsPlugin = require ('./plugins/replace-config-vars-plugin');
var BackbaseFormatPlugin = require ('./plugins/backbase-format-plugin');

var loggerFactory = require('./util/logger-factory');
var util = require('./util/util');

// even though a new instance of widget engine is created for every item in a page, it's safe to use
// single processor/factory instances as configuration variables don't change.
var handlebarsPreprocessor = null;
var getHandlebarsInstance = function(configVars) {
    return handlebarsPreprocessor || (handlebarsPreprocessor = new HandlebarsPreprocessor(configVars));
};

/**
 * Standard CXP Widget Engine
 * @param {Object} opts Config for construction
 * @param {Object} [opts.log] A custom parent Bunyan logger
 * @param {String} [opts.logLevel] A log level (trace,debug,info,warn,error). Defaults to 'info'
 * @constructor
 */
var Html5WidgetEngine = function(opts) {

    opts = opts || {};
    
    //This will create a static instance of a logger that subsequent calls to loggerFactory.getLogger() will retrieve
    loggerFactory.createLogger({
        parentLog: opts.log,
        loggerName: 'widget',
        logLevel: opts.logLevel,
        appendId: true
    });
};

/**
 * Initialize the container engine
 * @param {Object} opts Config for initialization
 * @param {String} opts.widgetPath A base path of the widget (without a file name)
 * @param {Object} opts.widgetEl The DOM element to render this widget in.
 * @param {String} [opts.configFile] The name of the config file to parse the widget meta data from. Defaults
 *                                   to 'model.xml'. Set this to 'model.xml' for Backbase format widgets
 * @param {Object} [opts.configVars] A map of key/values used to replace placeholders in widget configuration.
 *                                   E.g. $(contextRoot)
 * @constructor
 */
Html5WidgetEngine.prototype.init = function(opts) {

    opts = opts || {};

    var widgetPath = opts.widgetPath;
    var widgetEl = opts.widgetEl;
    var configVars = (this.configVars = opts.configVars || {});

    var reader = opts.reader || (opts.initialModel ? null : new FetchWidgetReader());
    var parser = opts.parser || new AutoConfigParser();
    var storage = opts.storage || new Html5LocalStorage();

    var renderer = opts.renderer;
    if (!renderer) {
        var factory = new DatasourceResolverFactory();
        factory.addResolver(ResourceDatasourceResolver.getInstance);
        factory.addResolver(HttpDatasourceResolver.getInstance);

        this._datasourceResolverFactory = factory;
        renderer = new Html5SeamlessRenderer(widgetEl, factory, {
            configVars: configVars
        });
    }

    //validate configuration options
    var confMsg;
    if(typeof widgetPath !== 'string') {
        confMsg = 'You must provide a widget path';
    } else if(!widgetEl) {
        confMsg = 'You must provide a widget parent node';
    }
    if(confMsg) {
        throw new Error(confMsg);
    }

    //preprocessors for handlebars
    var handlebarsPreprocessor = getHandlebarsInstance(configVars);
    renderer.addPreprocessor('text/x-handlebars-template', handlebarsPreprocessor);
    renderer.addPreprocessor('application/x-handlebars-template', handlebarsPreprocessor);

    //create the internal widget engine
    this.widgetEngine = new WidgetEngine({
        configFile: opts.configFile,
        widgetPath: widgetPath,
        parser: parser,
        reader: reader,
        renderer: renderer,
        storage: storage,
        initialModel: opts.initialModel
    });

    //proprietary backbase stuff that's not deprecated
    this.widgetEngine.addPlugin(new CxpAdditionsPlugin());

    //replaces placeholders $(...) in model value
    this.widgetEngine.addPlugin(new ReplaceConfigVarsPlugin({
        contextRoot: configVars.contextRoot,
        remoteContextRoot: configVars.remoteContextRoot || configVars.contextRoot, //still needed by mobile
        apiRoot: configVars.apiRoot,
        itemRoot: configVars.itemRoot || '',
        staticResourcesRoot: configVars.staticResourcesRoot,
    }, { 
        full: !!configVars.fullConfigReplacement 
    }));

    //angular usage is so ubiquitous we support it out of the box if the widget has an 'angular' preference set to true
    this.widgetEngine.addPlugin({
        name: 'Angular JS',
        postRender: function(widgetInstance, widgetRenderer) {
            var angular = global.angular;
            if(angular) {
                var widgetNode = widgetRenderer.getWidgetNode();
                var angularModule = 
                    widgetNode.getAttribute('widget-ng-app') || widgetNode.getAttribute('data-widget-ng-app');
                if(angularModule) {
                    var strictDi = widgetNode.getAttribute('ng-strict-di') || 
                                   widgetNode.getAttribute('data-ng-strict-di');
                    angular.element(document).ready(function() {
                        angular.module(angularModule).value('widget', widgetInstance);
                        angular.bootstrap(widgetInstance.body, [angularModule], {
                            strictDi: util.parseBoolean(strictDi)
                        });
                    });
                }
            }

            return widgetInstance;
        }
    });

};

/**
 * Add CXP5 compatibility
 * @param configVars
 */
Html5WidgetEngine.prototype.enableCompatibility = function() {
    
    var configVars = this.configVars || {};
    
    var bbPluginOpts = {
        apiRoot: configVars.apiRoot || '',
        contextRoot: configVars.contextRoot || '',
        remoteContextRoot: configVars.remoteContextRoot || ''
    };

    this.widgetEngine.addPlugin(new BackbaseFormatPlugin(bbPluginOpts));
};

/**
 * Start rendering
 * @return {Promise}
 */
Html5WidgetEngine.prototype.start = function() {

    return this.widgetEngine.start();
};

/**
 * Add a plugin
 * @param plugin
 * @return {Html5WidgetEngine}
 */
Html5WidgetEngine.prototype.addPlugin = function(plugin) {

    this.widgetEngine.addPlugin(plugin);
    return this;
};

/**
 * Add a feature
 * @param feature
 * @return {Html5WidgetEngine}
 */
Html5WidgetEngine.prototype.addFeature = function(feature) {

    this.widgetEngine.addFeature(feature);
    return this;
};

/**
 * Get the internal logger instance
 * @return {*}
 */
Html5WidgetEngine.prototype.getLogger = function() {

    return this.log;
};

/**
 * Destroys the widget rendered by this engine
 * @return {*}
 */
Html5WidgetEngine.prototype.destroy = function () {
    return this.widgetEngine.destroy();
};

/**
 * Registers a datasource creating function.
 * @param {Function} resolverFunc A function that accepts a datasource as the first argument and configuration options
 * object as the second one. The function should return an instance of a datasource resolver if the resolver can
 * handle that datasource or should return undefined otherwise.
 * @returns {Html5WidgetEngine}
 */
Html5WidgetEngine.prototype.addDatasourceResolver = function (resolverFunc) {
    if (this._datasourceResolverFactory) {
        this._datasourceResolverFactory.addResolver(resolverFunc);
        return this;
    } else {
        throw new Error('This method cannot be called when custom renderer is provided');
    }
};

//expose the widget engine constructor
module.exports = Html5WidgetEngine;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./core/widget-engine":199,"./datasource/datasource-resolver-factory":204,"./plugins/backbase-format-plugin":217,"./plugins/cxp-additions-plugin":224,"./plugins/replace-config-vars-plugin":225,"./strategies/datasource/http-datasource-resolver":226,"./strategies/datasource/resource-datasource-resolver":227,"./strategies/parser/auto-config-parser":228,"./strategies/reader/fetch-widget-reader":238,"./strategies/renderer/html5-seamless-renderer":239,"./strategies/renderer/preprocessors/handlebars-preprocessor":240,"./strategies/storage/html5-local-storage":243,"./util/logger-factory":248,"./util/util":250}],217:[function(require,module,exports){
'use strict';

var loggerFactory   = require('../util/logger-factory');
var util            = require('../util/util');
var ExtPromise      = require('promise-extensions')();
var widgetHandlers  = require('./backbase-format/widget-handlers');
var legacyWidgetApi = require('./backbase-format/legacy-widget-api');
var IncludeObject   = require('./backbase-format/include-object');

var convertToArray  = Array.prototype.slice.call.bind(Array.prototype.slice);

module.exports = BackbaseFormatPlugin;

function BackbaseFormatPlugin(opts) {

    opts = opts || {};
    this.opts = opts;

    this.name = 'Backbase Format';
    this.portalConf = opts.portalConf || {};
    this.window = typeof window === 'undefined' ? opts.window : window;
    this.log = loggerFactory.getLogger();
    this.opts.log = this.log;
}

/**
 * Makes the widgetInstance backwards compatible with the Backbase Format
 * @param widgetInstance
 * @param renderer
 * @param widgetModel
 * @return Returns the enhanced widget instance
 */
BackbaseFormatPlugin.prototype.preRender = function(widgetInstance, renderer, widgetModel) {

    this.log.info('Backbase format plugin is running in PRE RENDER phase...');

    if(!widgetInstance.preferences.getItem('src')) {
        widgetInstance.preferences.defineItem({
            name: 'src',
            value: widgetModel.content.src,
            readonly: false
        });
    }
    if(!widgetInstance.preferences.getItem('thumbnailUrl')) {
        widgetInstance.preferences.defineItem({
            name: 'thumbnailUrl',
            value: widgetModel.icons[0],
            readonly: false
        });
    }

    //special case for legacy portal 5 preferences
    if(!widgetInstance.preferences.getItem('title')) {
        widgetInstance.preferences.defineItem({
            name: 'title',
            value: widgetModel.title,
            readonly: false
        });
    }

    var bbWidgetInstance = legacyWidgetApi.buildWidget(widgetInstance, widgetModel, this.log, this.portalConf.tags);

    //need to update the preferences' event target if it has already been set to the widget instance that was cloned
    var index = bbWidgetInstance.preferences.eventTarget ?
        bbWidgetInstance.preferences.eventTarget.indexOf(widgetInstance) : -1;
    if(index > -1) {
        bbWidgetInstance.preferences.eventTarget[index] = bbWidgetInstance;
    }

    this.log.info('Backbase format plugin PRE RENDER done.');

    return bbWidgetInstance;
};

/**
 * Parses special markup such as g:onload
 * @param widgetInstance
 * @param renderer
 * @param widgetModel
 */
BackbaseFormatPlugin.prototype.postRender = function(widgetInstance, renderer, widgetModel) {
    var self = this;
    var log = this.log;
    var window = this.window;
    var chain;

    log.info('Backbase format plugin is running in POST RENDER phase...');

    legacyWidgetApi.applyPresentationApi(widgetInstance, renderer, widgetModel, log);

    //g:includes
    var includeElements = convertToArray(widgetInstance.body.getElementsByTagName('g:include'));
    // in case of SSR, includeElements may contain g:includes from child items, so we need to filter
    // them out (issue BACKLOG-14601)
    var includes = includeElements.filter(function (gInclude) {
        return util.ensureElementBelongsToItem(widgetInstance.name, gInclude);
    }).map(function (gInclude) {
        return new IncludeObject(gInclude, widgetInstance, widgetModel, self.opts);
    });

    if (includes.length) {
        // define include related API on a widget instance
        widgetInstance.includes = includes;
        widgetInstance.refreshIncludes = function refreshIncludes() {
            var resultPromises = this.includes.map(function (include) {
                return include.refresh();
            });

            return ExtPromise.settleAll(resultPromises).then(function (inspections) {
                var errorCount = inspections.filter(function(includePromiseInspection) {
                    return includePromiseInspection.isRejected();
                }).length;
                if(errorCount > 0) {
                    log.warn('%s includes failed to resolve.', errorCount);
                }
            });
        };

        // replace g:include element with corresponding content holder node an include object has
        includes.forEach(function (include, i) {
            var gElement = includeElements[i];
            gElement.parentNode.replaceChild(include.htmlNode, gElement);
        });

        chain = widgetInstance.refreshIncludes();
    } else {
        chain = ExtPromise.resolve();
    }

    return chain.then(function () {
        //do handlers
        var chromeNode = findChromeNode(widgetInstance.body) || widgetInstance.body;
        widgetHandlers.handleLoad(window, widgetInstance, log);
        widgetHandlers.handlePrefModified(window, widgetInstance, log);
        widgetHandlers.handleMaximize(window, widgetInstance, chromeNode, log);
        widgetHandlers.handleRestore(window, widgetInstance, chromeNode, log);

        log.info('Backbase format plugin POST RENDER done.');

        return widgetInstance;
    });
};

function findChromeNode (element) {
    var parent = element;

    while (parent) {
        if (typeof parent.hasAttribute === 'function' && parent.hasAttribute('data-chrome')) {
            return parent;
        }
        parent = parent.parentNode;
    }
    
    return null;
}

},{"../util/logger-factory":248,"../util/util":250,"./backbase-format/include-object":219,"./backbase-format/legacy-widget-api":221,"./backbase-format/widget-handlers":223,"promise-extensions":194}],218:[function(require,module,exports){
'use strict';

var util    = require('../../util/util');

var convertToArray = Array.prototype.slice.call.bind(Array.prototype.slice);

module.exports = {
    getStartFileFolder      : getStartFileFolder,
    makeReferenceAbsolute   : makeRefAbsolute,
    resolveExpression       : resolveExpression,
    isEmpty                 : isEmpty,
    convertToArray          : convertToArray
};

function getStartFileFolder (startFile, contextRoot) {

    //strip file from widget src to get path
    var widgetPath = startFile.replace(/\/[^\/]+$/, '');
    //also replace context root placeholder
    widgetPath = widgetPath.replace(/\$\(contextRoot\)/, contextRoot);

    var startFilePath = util.isUrlAbsolute(startFile) ? startFile : widgetPath + '/' + startFile;

    return startFilePath.substring(0, startFilePath.lastIndexOf('/') + 1);
}

function makeRefAbsolute(html, remoteContextRoot) {
    if(typeof DOMParser !== 'undefined') {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var imgs = convertToArray(doc.getElementsByTagName('img'));

        imgs.forEach(function(img) {
            var src = img.getAttribute('src');
            if(src && util.isUrlSiteRelative(src)) {
                src = new URL(src, remoteContextRoot).href;
                img.setAttribute('src', src);
            }
        });

        return doc.body.innerHTML;        
    } else {
        return html;
    }
}

function resolveExpression(expression, context) {
    var parts = expression.split('.');

    function doNextPart(parts, val) {
        val = val[parts.shift()];
        if(parts.length > 0 && val && typeof val === 'object') {
            return doNextPart(parts, val);
        } else {
            return val;
        }
    }

    return doNextPart(parts, context);
}

function isEmpty(value) {
    return value === undefined || value === null || value === '';
}

},{"../../util/util":250}],219:[function(require,module,exports){
(function (global){
/* globals Promise: false */
'use strict';

var util                = require('../../util/util');
var bunyan              = require('browser-bunyan');
var helpers             = require('./include-helpers');
var ParameterBuilder    = require('./include-param-builder');
var fetch               = require('../../fetch/filtering-fetch');
var responseHelpers     = require('../../util/response-helpers');

var FormData    = global.FormData; // jshint ignore:line

module.exports = IncludeObject;

/**
 * Represents g:include element as an object with defined API
 * @param gIncludeNode
 * @param widget
 * @param widgetModel
 * @param opts
 * @constructor
 */
function IncludeObject(gIncludeNode, widget, widgetModel, opts) {
    opts = opts || {};

    var contextRoot = opts.contextRoot || '';
    var remoteContextRoot = opts.remoteContextRoot || '';
    var localSource = gIncludeNode.getAttribute('local') === 'true';
    var config = {
        replaceRegex: /\$\{([a-zA-Z0-9-_.]+)\}/g,
        log: opts.log,
        startFileFolder: helpers.getStartFileFolder(widgetModel.content.src, contextRoot),
        contextRoot: (localSource || !remoteContextRoot) ? contextRoot : remoteContextRoot
    };

    Object.defineProperty(this, '_config', {
        value: config
    });

    this.widget = widget;
    this.uri = {
        template: gIncludeNode.getAttribute('src')
    };
    this.proxy = gIncludeNode.getAttribute('proxy') === 'true';
    this.method = gIncludeNode.getAttribute('method') || 'GET';

    var htmlNode = global.document.createElement('div');
    htmlNode.className = 'bp-g-include';

    this.htmlNode = htmlNode;

    var parameterBuilder = new ParameterBuilder(widgetModel, opts);
    this.params = parameterBuilder.buildParameters(this, gIncludeNode);
}

/**
 * Sets URI a include object should send requests to.
 * @param {String} uri
 */
IncludeObject.prototype.setURI = function setUri (uri) {
    if (uri && typeof uri === 'string') {
        this.uri.template = uri;
    }
};

/**
 * Returns resolved URI
 * @returns {*}
 */
IncludeObject.prototype.getContentURI = function getContentURI () {
    var src = this.uri.template;
    if (!src) {
        return '';
    }

    var config = this._config;
    var self = this;

    src = src.replace(config.replaceRegex, function (match, p1) {
        return self.widget.getPreference(p1);
    });

    src = src.replace('$(contextRoot)', config.contextRoot);
    if (util.isUrlDocumentRelative(src)) {
        src = config.startFileFolder + src;
        config.log.debug('g:include src after resolution is [%s]', src);
    }

    return src;
};

/**
 * Generates a request to a remote service and renders returned contents.
 * @returns {Promise} promise is resolved with html node that corresponds to this object
 */
IncludeObject.prototype.refresh = function refresh () {
    var config = this._config;
    var log = config.log;

    var requestParams = this._getRequestParams();
    var requestUrl = this._resolveRequestUrl(requestParams);
    var requestOptions = this._getRequestOptions(requestParams);

    // send request then append received HTML to htmlNode
    if(log.level() <= bunyan.DEBUG) {
        var fetchOptsJson = JSON.stringify(requestOptions, null, '\t');
        log.debug('Making g:include http request to [%s] with fetch opts: [%s]', requestUrl, fetchOptsJson);
    }

    return fetch(requestUrl, requestOptions).then(function(res) {
        log.debug('g:include request to [%s] completed with status: %s', requestUrl, res.status);
        return responseHelpers.isResponseOk(res) ?
            Promise.resolve(res.text()) : Promise.reject(responseHelpers.createError(res));
    }).catch(function(err) {
        return 'Unable to resolve g:include ( ' + err.message + ' )';
    }).then(function(html) {
        log.trace('Received html response:\n%s', html);
        if(util.isRunningOnFilesystem() && util.isUrlAbsolute(config.contextRoot)) {
            html = helpers.makeReferenceAbsolute(html, config.contextRoot);
        }
        
        this.htmlNode.innerHTML = html;
        this.htmlNode.setAttribute('data-src', requestUrl);

        return this.htmlNode;
    }.bind(this));
};

IncludeObject.prototype._getRequestParams = function getRequestParams () {
    var requestParams = [];

    if (this.proxy) {
        requestParams = this.params.filter(function (param) {
            return param.destination === 'proxy';
        });

        var contentUri = this.getContentURI();
        if (contentUri) {
            var targetQueryParamsString = this.params.filter(function (param) {
                return param.destination === 'target';
            }).map(function (param) {
                return param.toQueryString();
            }).filter(function (qStr) {
                return !!qStr;
            }).join('&');

            // create special 'url' parameter
            var urlParam = {
                name: 'url',
                getQueryParams: function() {
                    return [{
                        name: this.name,
                        value: contentUri + (contentUri.indexOf('?') !== -1 ? '&' : '?') + targetQueryParamsString
                    }];
                },
                toQueryString: function() {
                    var param = this.getQueryParams()[0];
                    return param.name + '=' + encodeURIComponent(param.value);
                }
            };

            requestParams.push(urlParam);
        }
    } else {
        requestParams = this.params.filter(function (param) {
            return param.destination === 'target';
        });
    }

    return requestParams;
};

IncludeObject.prototype._resolveRequestUrl = function resolveRequestUrl(requestParams) {
    var url = this.proxy ? this._config.contextRoot + '/proxy' : this.getContentURI();

    if (this.method && this.method.toUpperCase() !== 'POST') {
        var queryStr = requestParams.map(function (param) {
            return param.toQueryString();
        }).join('&');
        url += (url.indexOf('?') >= 0 ? '&' : '?') + queryStr;
    }

    return url;
};

IncludeObject.prototype._getRequestOptions = function(requestParams) {
    var options = {};

    if (this.method && this.method.toUpperCase() === 'POST') {
        options.method = this.method;
        options.body = this._constructFormData(requestParams);
    }

    return options;
};

IncludeObject.prototype._constructFormData = function constructFormData(params) {
    var formData = new FormData();

    params.reduce(function (acc, param) {
        return acc.concat(param.getQueryParams());
    }, []).forEach(function (queryParam) {
        formData.append(queryParam.name, queryParam.value);
    });

    return formData;
};

// obsolete methods
['getContentIterator', 'hasContent', 'setContent'].forEach(function (method) {
    IncludeObject.prototype[method] = function() {
        this._config.log.warn('%s method is no longer supported in CXP6', method);
    };
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../fetch/filtering-fetch":214,"../../util/response-helpers":249,"../../util/util":250,"./include-helpers":218,"./include-param-builder":220,"browser-bunyan":2}],220:[function(require,module,exports){
'use strict';

var helpers = require('./include-helpers');

module.exports = IncludeParameterBuilder;

/**
 * Builds g:include parameter objects.
 * @param {Object} widgetModel widget model
 * @param {Object} opts options
 * @constructor
 */
function IncludeParameterBuilder(widgetModel, opts) {
    this._widgetModel = widgetModel;
    this._log = opts.log;
    this._remoteContextRoot = opts.remoteContextRoot || '';
    this._contextRoot = opts.contextRoot || '';
    this._apiRoot = opts.apiRoot || '';

    // factory method map
    this._paramFactoryMap = {
        'g:http-param': this._buildHttpParam,
        'g:http-proxy-param': this._buildHttpProxyParam,
        'g:http-preference-param': this._buildPreferenceParam,
        'g:http-preference-param-map': this._buildPreferenceParamMap
    };
}

/**
 * Parses parameters found in g:include element and creates corresponding objects
 * @param {Object} includeObject include object created parameters belong to
 * @param {DOMElement} gIncludeNode g:include element
 * @returns {Array}
 */
IncludeParameterBuilder.prototype.buildParameters = function buildParameters(includeObject, gIncludeNode) {
    var self = this;
    // retain order of parameters
    var params = this._flattenElementTree(gIncludeNode).filter(function (node) {
        var nodeName = node.nodeName.toLowerCase();
        return (nodeName in self._paramFactoryMap);
    }).map(function (paramTag) {
        var nodeName = paramTag.nodeName.toLowerCase();
        var parseFunc = self._paramFactoryMap[nodeName];

        return parseFunc.call(self, paramTag, includeObject);
    }).filter(function (param) {
        return !!param;
    });

    // obsolete methods definition
    params.forEach(function (param) {
        ['getName', 'getValues'].forEach(function (method) {
            param[method] = function() {
                this._log.warn('%s method is no longer supported in CXP6', method);
            };
        });
    });

    return params;
};

/**
 * Converts tree of elements into a flat list of elements. Elements in a list are in document order.
 * @param rootElement
 * @returns {Array}
 * @private
 */
IncludeParameterBuilder.prototype._flattenElementTree = function flattenElementTree(rootElement) {
    var flatList = [];
    var currentNode = rootElement.firstChild;

    while (currentNode) {
        if (currentNode.nodeType === 1) { // element
            flatList.push(currentNode);
        }

        currentNode = currentNode.hasChildNodes() ? currentNode.firstChild : currentNode.nextSibling;
    }

    return flatList;
};

/**
 * Builds parameter object from g:http-param element
 * @param paramTag
 * @param includeObj
 * @param isProxy
 * @returns {Object}
 * @private
 */
IncludeParameterBuilder.prototype._buildHttpParam = function buildHttpParam(paramTag, includeObj, isProxy) {
    var contextRoot = this._remoteContextRoot || this._contextRoot;

    var param = new HttpParameter(paramTag, includeObj, this._log, isProxy, contextRoot, this._apiRoot);
    return param.value.template ? param : null;
};

/**
 * Builds parameter object flom g:http-proxy-param element
 * @param paramTag
 * @param includeObj
 * @returns {Object}
 * @private
 */
IncludeParameterBuilder.prototype._buildHttpProxyParam = function buildHttpProxyParam(paramTag, includeObj) {
    return this._buildHttpParam(paramTag, includeObj, true);
};

/**
 * Builds parameter object from g:http-preference-param element
 * @param paramTag
 * @param includeObj
 * @returns {Object}
 * @private
 */
IncludeParameterBuilder.prototype._buildPreferenceParam = function buildPreferenceParam(paramTag, includeObj) {
    var param = new PreferenceParameter(paramTag, includeObj, this._log);
    return param.name.template ? param : null;
};

/**
 * Builds parameter object from g:http-preference-param-map element
 * @param paramTag
 * @param includeObj
 * @returns {Object}
 * @private
 */
IncludeParameterBuilder.prototype._buildPreferenceParamMap = function buildPrefParamMap(paramTag, includeObj) {
    var param = new PreferenceMapParameter(paramTag, includeObj, this._log, this._widgetModel);
    return param._typeName ? param : null;
};


/**
 * Base parameter object
 * @param paramTag
 * @param includeObject
 * @param log
 * @param destination
 * @constructor
 */
function IncludeParameter(paramTag, includeObject, log, destination) {
    this.name = {
        template: paramTag.getAttribute('name')
    };
    this.value = {
        template: paramTag.getAttribute('value')
    };
    this.destination = destination || 'target';
    this.method = (paramTag.getAttribute('method') || includeObject.method || 'GET').toUpperCase();

    // read-only "internal" properties
    Object.defineProperty(this, '_include', {value: includeObject});
    Object.defineProperty(this, '_log', {value: log});
}


IncludeParameter.prototype.getQueryParams = function toQueryString() {
    return [];
};

IncludeParameter.prototype.toQueryString = function toQueryString() {
    return this.getQueryParams().map(function (param) {
        return param.name + '=' + encodeURIComponent(param.value);
    }).join('&');
};


/**
 * Represents g:http-preference-param-map parameter
 * @param paramTag
 * @param includeObject
 * @param log
 * @param widgetModel
 * @constructor
 */
function PreferenceMapParameter(paramTag, includeObject, log, widgetModel) {
    IncludeParameter.call(this, paramTag, includeObject, log);

    var dataType = paramTag.getAttribute('dataType') || paramTag.getAttribute('datatype');
    // type is used to build query param name
    Object.defineProperty(this, '_typeName',  {
        value: dataType
    });

    // remember name of preferences with the same type
    var prefs = widgetModel.preferences || {};
    var prefsOfType = Object.keys(prefs).filter(function (prefName) {
        return prefs[prefName].type === dataType;
    });

    Object.defineProperty(this, '_prefs',  {
       value: prefsOfType
    });
}

PreferenceMapParameter.prototype = Object.create(IncludeParameter.prototype);

PreferenceMapParameter.prototype.getQueryParams = function() {
    var namespace = this._typeName;
    var self = this;

    return this._prefs.map(function (prefName) {
        return {
            name: namespace + '.' + prefName,
            value: self._include.widget.getPreference(prefName)
        };
    });
};

/**
 * Represents g:http-preference-param parameter
 * @param paramTag
 * @param includeObject
 * @param log
 * @constructor
 */
function PreferenceParameter(paramTag, includeObject, log) {
    IncludeParameter.call(this, paramTag, includeObject, log);
}

PreferenceParameter.prototype = Object.create(IncludeParameter.prototype);

PreferenceParameter.prototype.getQueryParams = function() {
    var name = this.name ? this.name.template : null;
    if (helpers.isEmpty(name)) {
        return [];
    }

    var value = this._include.widget.getPreference(name);
    if (helpers.isEmpty(value)) {
        this._log.warn('Failed to resolve g:include parameter value. Parameter - [%s]', name);
    }

    return [{
        name: name,
        value: value
    }];
};

/**
 * Represents g:http-param & g:http-proxy-param parameters
 * @param paramTag
 * @param includeObject
 * @param log
 * @param isProxy
 * @param contextRoot
 * @constructor
 */
function HttpParameter(paramTag, includeObject, log, isProxy, contextRoot, apiRoot) {
    var destination = isProxy ? 'proxy' : 'target';
    IncludeParameter.call(this, paramTag, includeObject, log, destination);

    // read-only "internal" properties
    Object.defineProperty(this, '_replaceRegex', {value: /\$\{([a-zA-Z0-9-_]+)\}/});
    Object.defineProperty(this, '_contextRoot', {value: contextRoot});
    Object.defineProperty(this, '_apiRoot', {value: apiRoot});
}

HttpParameter.prototype = Object.create(IncludeParameter.prototype);

HttpParameter.prototype.getQueryParams = function() {
    var name = this.name ? this.name.template : null;
    var value = this.value ? this.value.template : null;
    var origValue = value;
    var widget = this._include.widget;
    var contextRoot = this._contextRoot;
    var apiRoot = this._apiRoot;

    if (helpers.isEmpty(name) || helpers.isEmpty(value)) {
        return [];
    }

    // resolve value
    value = value.replace(this._replaceRegex, function (match, p1) {
        //special case for contextRoot & apiRoot
        if (p1 === 'contextRoot') {
            return contextRoot;
        } else if (p1 === 'apiRoot') {
            return apiRoot;
        } else {
            return widget.getPreference(p1);
        }
    });

    if (value.indexOf('__WIDGET__') === 0) {
        var expression = value.split('.').filter(function(it, i) {
            return i !== 0;
        }).join('.');

        value = helpers.resolveExpression(expression, widget);

        if (helpers.isEmpty(value)) {
            this._log.warn('Failed to resolve g:include parameter value. Parameter - [%s], unresolved value - [%s], ' +
                'resolved value - [%s]',
                name, origValue, value);
        }
    }

    return [{
        name: name,
        value: value
    }];
};

},{"./include-helpers":218}],221:[function(require,module,exports){
(function (process,global){
'use strict';

var util                    = require('../../util/util');
var EventTarget             = require('../../event-target/event-target');
var warnDeprecatedAccess    = require('./warn-deprecated-access');
var StorageEvent            = require('../../strategies/storage/storage-event');

function buildWidget(widget, widgetModel, log, tags) {
    var WIDGET_TYPE = 'backbaseWidget';

    // need to clone the widget because we can't change readonly properties
    var bbWidgetInstance = util.cloneWidgetInstance(widget);

    bbWidgetInstance.id         = widgetModel.id || Math.random().toString(36).substr(2, 5);
    bbWidgetInstance.name       = widgetModel.name;
    bbWidgetInstance.nodeType   = 1;
    bbWidgetInstance.nodeValue  = WIDGET_TYPE;
    bbWidgetInstance.margins    = { top: 0, right: 0, bottom: 0, left: 0 };
    
    //the event targets are not cloned because they are not enumerable
    Object.getOwnPropertyNames(widget).forEach(function(key) {
        if(util.startsWith(key, '@@')) {
            bbWidgetInstance[key] = widget[key];
        }
    });
    
    // definition
    bbWidgetInstance.myDefinition = {
        sUrl: widgetModel.content.src
    };

    // node & tag names
    bbWidgetInstance.nodeName = WIDGET_TYPE;
    bbWidgetInstance.tagName = WIDGET_TYPE;

    // tags
    bbWidgetInstance.tags = Array.isArray(tags) ? tags : [];

    // MODEL
    bbWidgetInstance.model = createModel(bbWidgetInstance, widgetModel);

    // DEPRECATED FIELDS
    warnDeprecatedAccess(bbWidgetInstance, log);

    // FUNCTIONS
    setMethods(bbWidgetInstance);

    // EVENTS
    if(bbWidgetInstance.addEventListener && bbWidgetInstance.dispatchEvent) {
        bbWidgetInstance.addEventListener('storage', function (e) {
            log.debug('Chaining StorageEvent to Backbase \'PrefModified\' event...');

            var PREF_MODIFIED_EVENT = 'PrefModified';
            var chainedEvent = new StorageEvent(PREF_MODIFIED_EVENT);
            chainedEvent.initStorageEvent(PREF_MODIFIED_EVENT, false, false, e.key, e.oldValue, e.newValue, e.url,
                bbWidgetInstance.preferences);
            chainedEvent.attrName = e.key;
            chainedEvent.prevValue = e.oldValue;
            bbWidgetInstance.model.dispatchEvent(chainedEvent);
        });
    }

    return bbWidgetInstance;
}

function applyDomRelatedApi(widget, renderer, widgetModel, log) {
    var widgetNode = widget.body || renderer.getWidgetNode();
    var onloadAttr = widgetNode.getAttribute('g:onload');

    //only do this stuff if the widget is using a g:onload
    if(onloadAttr) {
        //wraps the widget in a 'widget body' element
        var body = global.document.createElement('div');
        var widgetParent  = widgetNode.parentNode;
        var widgetSibling = widgetNode.nextSibling;

        body.appendChild(widgetNode);
        body.className = 'bp-widget-body';

        if (widgetSibling) {
            widgetParent.insertBefore(body, widgetSibling);
        } else {
            widgetParent.appendChild(body);
        }

        //assigns the body to the inner body node required by backbase widgets.
        widget.body = body;
    }

    widget.htmlNode = findChromeNode(widgetNode);
    widget.refreshHtml = function () {
        var cxpFeature = this.features && this.features.cxp;
        if (cxpFeature) {
            return cxpFeature.model.item(widgetModel.name, widgetModel.type)
                .get().then(function(model) {
                    return cxpFeature.render.rerenderItem(model.id, model.name, model);
                });
        } else {
            log.warn('A widget is required to have "CXP" feature in order to be able to refresh its view.');
            return Promise.resolve();
        }
    };
}

function createModel(widget, widgetModel) {
    var model = {

        // general stuff
        jxid: 'VIEW-' + widgetModel.name,
        localName: 'Widget',
        name: widgetModel.name,
        tag: 'widget',
        tagName: 'Widget',

        //portal conf
        contextItemName:  widget.features && widget.features.cxp && widget.features.cxp.config ?
            widget.features.cxp.config.get('portalName') : null,
        extendedItemName: widgetModel.extendedItemName || null,
        parentItemName: widgetModel.parentItemName || null,
        securityProfile: widgetModel.securityProfile || null,
        uuid: widgetModel.id || null,

        //preferences
        preferences: makePreferences(widget.preferences),

        //tags
        tags: Array.isArray(widgetModel.tags) ? widgetModel.tags : [],

        // methods
        addEventListener: EventTarget.addEventListener,
        removeEventListener: EventTarget.removeEventListener,
        dispatchEvent: EventTarget.dispatchEvent
    };

    model.save = function(callback) {
        var self = this;
        process.nextTick(function() {
            if(typeof callback === 'function') {
                var ctx = {
                    contextItemName:  self.contextItemName,
                    name: self.name,
                    preferences: self.preferences,
                    tag: self.tag
                };
                var mockXhr = {
                    status: 204,
                    statusText: 'No Content',
                    readyState: 4
                };
                callback.call(global, ctx, mockXhr);
            }

        });
    };

    model.getPreference = function(key) {
        return widget.preferences.getItem(key);
    };
    model.setPreference = function(key, value) {
        widget.preferences.setItem(key, value);
    };

    return model;
}

function setMethods(widget) {
    widget.getPreference = function (key) {
        return this.preferences.getItem(key);
    };

    widget.getPreferenceFromParents = widget.getPreference;
    widget.getAreaPreference = function () {
        return this.preferences.getItem('area') || 0;
    };

    widget.getOrderPreference = function () {
        return this.preferences.getItem('order');
    };

    widget.setPreference = function (key, value) {
        this.preferences.setItem(key, value);
    };

    widget.getDefinition = function () {
        return widget.myDefinition;
    };

    widget.setAreaPreference = function (area) {
        this.preferences.setItem('area', area);
    };

    widget.setOrderPreference = function (order) {
        this.preferences.setItem('order', order);
    };
}

function makePreferences(storage) {
    return storage._items;
}

function findChromeNode (element) {
    var parent = element;

    while (parent) {
        if (typeof parent.hasAttribute === 'function' && parent.hasAttribute('data-chrome')) {
            return parent;
        }
        parent = parent.parentNode;
    }

    return null;
}

module.exports = {
    buildWidget: buildWidget,
    applyPresentationApi: applyDomRelatedApi
};

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../event-target/event-target":207,"../../strategies/storage/storage-event":244,"../../util/util":250,"./warn-deprecated-access":222,"_process":420}],222:[function(require,module,exports){
'use strict';

module.exports = warnDeprecatedPropertyAccess;

// Widget instance variables supported by PC5 but obselete in 6.0
// Access to these fields will print warning on the console
var unsupportedProperties = [
    'attributes', 'childNodes', 'cls_custom', 'cnBase', 'firstChild', 'flex', 'htmlArea',
    'htmlDoc', 'htmlFoot', 'htmlHead', 'lastChild', 'layout', 'local_listeners', 'localName',
    'namespaceURI', 'nextSibling', 'node', 'ownerDocument', 'parentNode', 'perspective',
    'prefix', 'previousSiblings'
];

// Widget instance methods supported by PC5 but obselete in 6.0
// Access to these methods will print warning on the console
var unsupportedMethods = [
    'appendChild', 'cloneNode', 'createDisplay', 'createPerspective', 'destroy',
    'disableDesignMode', 'dragIsTarget', 'enableDesignMode', 'getAreaOrderedChildren',
    'getAttribute', 'getAttributeNS', 'getClassID', 'getCurrentPerspective', 'getDisplay',
    'getDisplayEventTarget', 'getDisplayModel', 'getElementsByTagName', 'getElementsByTagNameNS',
    'getHTMLArea', 'hasAttribute', 'hasAttributeNS', 'hasAttributes', 'hasChildNodes',
    'hideDesignTools', 'hideDragTargets', 'insertBefore', 'insertDisplayChild', 'loadChildren',
    'lookupNamespaceURI', 'refreshIncludes', 'removeAttribute', 'removeAttributeNS', 'removeChild',
    'renderDisplay', 'replaceChild', 'setAttribute', 'setAttributeNS', 'setCurrentPerspective',
    'showDesignTools', 'showDragTargets', 'template'
];

function warnUnsupported (log, field, isMethod) {
    return function () {
        var message = 'COMPATIBILITY: %s is a widget %s that is no longer supported in CXP6';
        log.warn(message, field, isMethod ? 'method' : 'property');
    };
}

function warnDeprecatedPropertyAccess (widgetInstance, log) {
    var unsupportedPropertyDefinitions = unsupportedProperties.reduce(function (defs, field) {
        defs[field] = {
            enumerable: true,
            get: warnUnsupported(log, field),
            set: warnUnsupported(log, field)
        };

        return defs;
    }, {});

    Object.defineProperties(widgetInstance, unsupportedPropertyDefinitions);

    unsupportedMethods.reduce(function (instance, method) {
        instance[method] = warnUnsupported(log, method, true);
        return instance;
    }, widgetInstance);

    return widgetInstance;
}

},{}],223:[function(require,module,exports){
'use strict';

// see https://my.backbase.com/docs/product-documentation/documentation/portal/5.6.1/references_widgetnamespace.html#/list

var util = require('../../util/util');

module.exports = {
    handleLoad: handleLoad,
    handleMaximize: handleMaximize,
    handleRestore : handleRestore,
    handlePrefModified: handlePrefModified
};

/**
 * g:onload
 * @param window
 * @param widgetInstance
 * @param log
 */
function handleLoad(window, widgetInstance, log) {
    var event = 'onload';
    var gOnloadAttr = getEventAttribute(event, widgetInstance.body, widgetInstance.name);
    if(gOnloadAttr) {
        executeScript(window, widgetInstance.id, gOnloadAttr, event, log);
    }
}

/**
 * g:onPrefModified
 * @param window
 * @param widgetInstance
 * @param log
 */
function handlePrefModified(window, widgetInstance, log) {
    var event = 'onPrefModified';
    var gPrefModifiedAttr = getEventAttribute(event, widgetInstance.body, widgetInstance.name);
    if(gPrefModifiedAttr) {
        widgetInstance.model.addEventListener('PrefModified', function() {
            executeScript(window, widgetInstance.id, gPrefModifiedAttr, event, log);
        });
    }
}

/**
 * g:onmaximize
 * @param window
 * @param widgetInstance
 * @param chromeNode
 * @param log
 */
function handleMaximize(window, widgetInstance, chromeNode, log) {
    var event = 'onmaximize';
    var gMaximizeAttr = getEventAttribute(event, widgetInstance.body, widgetInstance.name);
    if(gMaximizeAttr) {
        chromeNode.addEventListener('click', function(ev) {
            if(ev.target.getAttribute('data-cxp-viewmode') === 'maximized') {
                executeScript(window, widgetInstance.id, gMaximizeAttr, event, log);
            }
        });
    }
}

/**
 * g:onrestore
 * @param window
 * @param widgetInstance
 * @param chromeNode
 * @param log
 */
function handleRestore(window, widgetInstance, chromeNode, log) {
    var event = 'onrestore';
    var gRestoreAttr = getEventAttribute(event, widgetInstance.body, widgetInstance.name);
    if(gRestoreAttr) {
        chromeNode.addEventListener('click', function(ev) {
            if(ev.target.getAttribute('data-cxp-viewmode') === 'windowed') {
                executeScript(window, widgetInstance.id, gRestoreAttr, event, log);
            }
        });
    }
}

/**
 * Utility to get the value of g namespaced attribute (g:onload). Getting attributes with namespaces can be fickle
 * @param attrName
 * @param widgetBodyNode
 * @return {*}
 */
function getEventAttribute(attrName, widgetBodyNode, itemName) {

    var el = widgetBodyNode.querySelector('div[g\\:' + attrName + ']'); //need to escape in query selector

    if(el && util.ensureElementBelongsToItem(itemName, el)) {
        return el.getAttribute('g:' + attrName);
    }

    return null;
}

/**
 * Evaluates a script that you'd expect to find in a g namespace handler
 * @param window
 * @param widgetId
 * @param scriptText
 * @param eventName
 * @param log
 */
function executeScript(window, widgetId, scriptText, eventName, log) {
    try {
        log.debug('Executing g:%s script...', eventName);
        var widgetAccessor = window.cxp._widgets ? 'window.cxp._widgets[\'' + widgetId + '\']' : 'window.widget';
        var script = scriptText.replace(/(__WIDGET__|__GADGET__)/, widgetAccessor);
        window.eval('(function() {' + script + '})()');  // jshint ignore:line
    } catch (err) {
        //this gives a bit more context for common errors
        var msgDetails = /is not defined$/.test(err.message) ?
            'This maybe because in CXP6 functions in start files must be explicitly declared on the global scope' : '';
        log.warn('g:%s failed! %s', eventName, msgDetails);
        log.error(err);
    }
}

},{"../../util/util":250}],224:[function(require,module,exports){
'use strict';

var EventTarget = require('../event-target/event-target');

/**
 * This plugins adds a few features that deviate from the spec to support running Widgets in CXP environments
 * @param opts
 * @constructor
 */
var CxpAdditionsPlugin = function() {
    this.name = 'CXP Additions Plugin';
};

/**
* Converts widget preferences array into a preferences object
* @param widgetModel
*/
CxpAdditionsPlugin.prototype.postRead = function(widgetModel) {
    var preferences = widgetModel.preferences;

    //check if it is an array then convert array to object
    if(Array.isArray(preferences)) {
        widgetModel.preferences = preferences.reduce(function (acc, pref) {
            acc[pref.name] = pref;
            return acc;
        }, {});
    }

    return widgetModel;
};

/**
 * Mixes in an EventTarget implementation to the widget interface
 * @param widgetInstance
 */
CxpAdditionsPlugin.prototype.preRender = function(widgetInstance, renderer, widgetModel) {
    // set type of instance
    if (widgetModel.type) {
        Object.defineProperty(widgetInstance, 'type', {
            value: widgetModel.type
        });
    }

    //add event listener
    widgetInstance.addEventListener = EventTarget.addEventListener;
    widgetInstance.removeEventListener = EventTarget.removeEventListener;
    widgetInstance.dispatchEvent = EventTarget.dispatchEvent;

    //if the event target for storage events wasn't already set, default it to the widget instance
    var eventTarget = widgetInstance.preferences.eventTarget = widgetInstance.preferences.eventTarget || [];

    if(eventTarget.indexOf(widgetInstance) === -1) {
        eventTarget.push(widgetInstance);
        widgetInstance.addEventListener('destroy', function() {
            var currentInstance = this;
            var prefs = currentInstance.preferences;
            prefs.eventTarget = prefs.eventTarget.filter(function(instance) {
                return instance !== currentInstance;
            });
        }, {once: true});
    }

    return widgetInstance;
};

module.exports = CxpAdditionsPlugin;
},{"../event-target/event-target":207}],225:[function(require,module,exports){
'use strict';

var loggerFactory = require('../util/logger-factory');
var bunyan = require('browser-bunyan');

/**
 * @class ReplaceConfigVarsPlugins
 * @param varMap
 * @param opts
 * @constructor
 */
var ReplaceConfigVarsPlugins = function (varMap, opts) {
    opts = opts || {};

    this.name = 'Replace Config Vars';
    this.varMap = varMap;
    this.full = !!opts.full;
    this.interpolateStartRegex = opts.interpolateStartRegex || '\\$\\(';
    this.interpolateEndRegex = opts.interpolateEndRegex || '\\)';
    this.log = loggerFactory.getLogger();
};

/**
 * Fix paths in the model
 * @param widgetModel
 */
ReplaceConfigVarsPlugins.prototype.postRead = function (widgetModel) {

    var self = this;
    var log = this.log;

    log.info('Replace config vars plugin is running is POST READ phase...');

    /*
    * This is special case for content widgets where $(contextRoot) should not be replaced
    * in a preference with name "templateUrl" or in a datasource query parameter with name "template".
    * It's a fragile solution but at the moment there is no way to mark a preference in a model for exclusion.
    * */
    var excludeObjects = this._getExcludeObjects(widgetModel);
    if (excludeObjects.length) {
        excludeObjects.forEach(function(obj) {
            obj.value = obj.value.replace('contextRoot', '__contextRoot__');
        });
    }

    if (self.full) {
        log.debug('Doing full config vars replacement...');
        self._traverse(widgetModel);
    } else {
        log.debug('Doing minimal config vars replacement...');

        if (widgetModel.content && widgetModel.content.src) {
            widgetModel.content.src = self._replaceVars('src', widgetModel.content.src);
        }

        if (widgetModel.content && widgetModel.content.config) {
            widgetModel.content.config = self._replaceVars('config', widgetModel.content.config);
        }

        if (widgetModel.icons) {
            widgetModel.icons.forEach(function (icon, index, icons) {
                icons[index] = self._replaceVars('icons[' + index + ']', icon);
            });
        }

        //special preferences
        var messages = widgetModel.preferences.messages;
        if(messages) {
            messages.value = self._replaceVars('messages', messages.value);
        }

        var options = widgetModel.preferences.options;
        if (options) {
            options.value = self._replaceVars('options', options.value);
        }

        if (widgetModel.datasources) {
            self._traverse(widgetModel.datasources);
        }

        if(widgetModel.altContent) {
            var alternateContentNames = Object.keys(widgetModel.altContent);
            alternateContentNames.forEach(function (contentName) {
                var content = widgetModel.altContent[contentName];
                content.src = self._replaceVars('src.' + contentName, content.src);
            });
        }
    }

    if (excludeObjects.length) {
        excludeObjects.forEach(function(obj) {
            obj.value = obj.value.replace('__contextRoot__', 'contextRoot');
        });
    }

    log.info('Replace config vars plugin in POST READ is DONE.');

    return widgetModel;
};

/**
 * Traverse object
 * @param {Object.<string, *>} obj
 * @private
 */
ReplaceConfigVarsPlugins.prototype._traverse = function (obj) {

    Object.keys(obj).forEach(function (key) {
        obj[key] = this._replaceVars(key, obj[key]);

        if (!!obj[key] && typeof obj[key] === 'object') {
            this._traverse(obj[key]);
        }
    }, this);
};

/**
 * Finds "templateUrl" preference and "template" datasource parameters in a widget model
 * @param {Object} widgetModel A widget model
 * @private
 */
ReplaceConfigVarsPlugins.prototype._getExcludeObjects = function (widgetModel) {
    var datasources = widgetModel.datasources || {};

    var templateParams = Object.keys(datasources).map(function (dsName) {
        return datasources[dsName];
    }).reduce(function(params, datasource) {
        return params.concat(datasource.params);
    }, []).filter(function(param) {
        return param.name === 'template' && typeof param.value === 'string';
    });

    var prefs = widgetModel.preferences || {};
    var templatePrefs = Object.keys(prefs).map(function (prefName) {
        return prefs[prefName];
    }).filter(function(pref) {
        return pref.name === 'templateUrl' && typeof pref.value === 'string';
    });

    return templateParams.concat(templatePrefs);
};

/**
 * Replace vars
 * @param key
 * @param value
 * @returns {*}
 * @private
 */
ReplaceConfigVarsPlugins.prototype._replaceVars = function (key, value) {
    if (typeof value !== 'string') {
        return value;
    }

    var self = this;
    var log = self.log;
    var varMap = self.varMap;

    var urlVars = Object.keys(varMap);
    // this is a hack made because Portal keeps using contextRoot when $(itemRoot) is specified.
    value = value.replace(/\$\(contextRoot\)\/static/g, '$(staticResourcesRoot)/static');

    urlVars.forEach(function (urlVar) {
        var varRegexp = new RegExp(self.interpolateStartRegex + urlVar + self.interpolateEndRegex, 'g');

        if (log.level() <= bunyan.DEBUG && varRegexp.test(value)) {
            log.debug('Replacing occurences of [%s] with [%s] where [%s=%s]',
                varRegexp, varMap[urlVar], key, value);
        }

        value = value.replace(varRegexp, varMap[urlVar]);
    });

    return value;
};

module.exports = ReplaceConfigVarsPlugins;

},{"../util/logger-factory":248,"browser-bunyan":2}],226:[function(require,module,exports){
/**
 * Implements "HTTP" datasource resolver
 * @see {@link https://backbase.atlassian.net/wiki/display/PrM/Datasources+URI+spec#DatasourcesURIspec-HTTPURI}
 * @module strategies/datasource/http-datasource-resolver
 * @exports {HttpDatasourceResolver}
 */

'use strict';

var DatasourceResolver  = require('../../datasource/datasource-resolver');
var resolverHelpers     = require('../../datasource/datasource-resolver-helpers');
var util                = require('../../util/util');
var sanitizer           = require('lib-bb-html-sanitizer');

var httpSchemaRegexp = /^https?:/i;

function isHttpDatasource(datasource) {
    var uri = datasource && datasource.uri;

    return uri && httpSchemaRegexp.test(uri);
}

module.exports = HttpDatasourceResolver;

/**
 * HTTP datasource resolver
 * @param {Object} datasource
 * @constructor
 */
function HttpDatasourceResolver(datasource) {
    this._datasource = datasource;
}

/**
 * Builds an endpoint URL of http datasource
 * @param {Object} context An object expressions in datasource URI are resolved against
 * @returns {string} A URL of an endpoint where data can be requested from
 */
HttpDatasourceResolver.prototype.resolveUrl = function (context) {
    var queryString = resolverHelpers.resolveQueryString(context, this._datasource.params);
    var endpoint = resolverHelpers.resolveExpression(context, this._datasource.uri);

    if (queryString) {
        endpoint += '?' + queryString;
    }

    return endpoint;
};

/**
 * Sanitizes response if it's HTML data
 * @param {Response} response Fetch API response object
 * @param {object} context A context object holding data from an item and config options
 * @returns {Promise.<string|Object>} promise resolved with HTML string or plain object
 */
HttpDatasourceResolver.prototype.processResponse = function processResponse(response, context) {
    var self = this;

    return util.getContentBodyAndTypeFromResponse(response).then(function (result) {
        return result.type === 'html' ? self._sanitize(context, result.body) : result.body;
    });
};

/**
 * Initializes sanitizer with whitelist policies if necessary and run it with the html provided
 * @param {object} context A context object
 * @param {string} html An HTML string to apply sanitization to
 * @return {string} Sanitized HTML
 * @private
 */
HttpDatasourceResolver.prototype._sanitize = function sanitize(context, html) {
    if (!this._sanitizer) {
        this._sanitizer = sanitizer.create(context.htmlSanitizerWhitelist);
    }

    return this._sanitizer(html);
};

/**
 * Checks whether a datasource is of http type and creates a resolver instance
 * if check passes. Use this method as a resolver creating function registered with
 * datasource resolver factory.
 * @param {Object} datasource A datasource to check
 * @returns {DatasourceResolver|undefined}
 */
HttpDatasourceResolver.getInstance =
    DatasourceResolver.createFactoryFunction(isHttpDatasource, HttpDatasourceResolver);


},{"../../datasource/datasource-resolver":206,"../../datasource/datasource-resolver-helpers":205,"../../util/util":250,"lib-bb-html-sanitizer":32}],227:[function(require,module,exports){
/**
 * Implements "resource" datasource resolver.
 * @see {@link https://backbase.atlassian.net/wiki/display/PrM/Datasources+URI+spec#DatasourcesURIspec-ResourceURI}
 * @module strategies/datasource/resource-datasource-resolver
 * @exports {ResourceDatasourceResolver}
 */

'use strict';

var DatasourceResolver  = require('../../datasource/datasource-resolver');
var resolverHelpers     = require('../../datasource/datasource-resolver-helpers');
var util                = require('../../util/util');
var sanitizer           = require('lib-bb-html-sanitizer');

module.exports = ResourceDatasourceResolver;

/**
 * Resource datasource resolver
 * @param {Object} datasource
 * @constructor
 */
function ResourceDatasourceResolver(datasource) {
    this._datasource = datasource;
    this._sanitizeParamName = 'sanitize';
}

/**
 * Builds an endpoint URL of resource datasource
 * @param {Object} context An object expressions in datasource URI are resolved against
 * @returns {string} A URL of an endpoint where data can be requested from
 */
ResourceDatasourceResolver.prototype.resolveUrl = function (context) {
    var url = this._datasource.uri;
    var sanitizeParam = this._sanitizeParamName;
    var contextRoot = context.contextRoot || '';
    var baseUrl = context.itemRoot || '';
    var urlComponents = url.split(':');

    if (urlComponents.length !== 2) {
        throw new Error('Invalid resource datasource uri: ', url);
    }

    var params = (this._datasource.params || []).filter(function (param) {
        return param.name !== sanitizeParam;
    });
    var queryString = resolverHelpers.resolveQueryString(context, params);
    var resourcePath = resolverHelpers.resolveExpression(context, urlComponents[1]);
    var endpoint;

    // it would be better to support ${itemRoot} rather than relative/absolute paths
    if (util.isUrlDocumentRelative(resourcePath)) {
        endpoint = baseUrl + '/' + resourcePath;
    } else {
        endpoint = contextRoot + resourcePath;
    }

    if (queryString) {
        endpoint += '?' + queryString;
    }

    return endpoint;
};

/**
 * Sanitizes response if it's HTML data
 * @param {Response} response Fetch API response object
 * @param {object} response Fetch API response object
 * @param {object} context A context object holding data from an item and config options
 * @returns {Promise.<string|Object>} promise resolved with HTML string or plain object
 */
ResourceDatasourceResolver.prototype.processResponse = function processResponse(response, context) {
    var params = this._datasource.params || [];
    var sanitizeParam = this._sanitizeParamName;
    var self = this;

    return util.getContentBodyAndTypeFromResponse(response).then(function (result) {
        var skipSanitization;

        if (result.type === 'html') {
            skipSanitization = params.some(function (param) {
                return param.name === sanitizeParam && param.value === 'false';
            });
        } else {
            skipSanitization = true;
        }

        return skipSanitization ? result.body : self._sanitize(context, result.body);
    });
};

/**
 * Initializes sanitizer with whitelist policies if necessary and run it with the html provided
 * @param {object} context A context object
 * @param {string} html An HTML string to apply sanitization to
 * @return {string} Sanitized HTML
 * @private
 */
ResourceDatasourceResolver.prototype._sanitize = function sanitize(context, html) {
    if (!this._sanitizer) {
        this._sanitizer = sanitizer.create(context.htmlSanitizerWhitelist);
    }

    return this._sanitizer(html);
};

/**
 * Checks whether a datasource is of resource type and creates a resolver instance
 * if check passes. Use this method as a resolver creating function registered with
 * datasource resolver factory.
 * @param {Object} datasource A datasource to check
 * @returns {DatasourceResolver|undefined}
 */
ResourceDatasourceResolver.getInstance =
    DatasourceResolver.createFactoryFunction('resource', ResourceDatasourceResolver);

},{"../../datasource/datasource-resolver":206,"../../datasource/datasource-resolver-helpers":205,"../../util/util":250,"lib-bb-html-sanitizer":32}],228:[function(require,module,exports){
'use strict';

var ConfigParser = require('../../core/config-parser');
var VError = require('../../util/verror');
var loggerFactory = require('../../util/logger-factory');

var defaultParserMap = {
	'json' : {
		parser: require('./commonjs-package-config-parser'),
		testFn: function(str) {
			return typeof str === 'string' && str.trim().indexOf('{') === 0;
		}
	},
    'backbaseXml' : {
        parser: require('./backbase-dom-config-parser'),
        testFn: function(str) {
            return typeof str === 'string' && str.trim().indexOf('<catalog') >= 0;
        }
    },
    'jsObject' : {
        parser: require('./js-object-parser'),
        testFn: function(obj) {
            return typeof obj === 'object';
        }
    }
};

/**
 * Auto config parser
 * @constructor
 */
var AutoConfigParser = function() {
    this.log = loggerFactory.getLogger();
    this.parserMap = defaultParserMap;
};
AutoConfigParser.prototype = Object.create(ConfigParser.prototype);

/**
 *
 * @param configText
 * @returns {*}
 */
AutoConfigParser.prototype.parse = function(configText) {

    var Parser =  null;

    //guess the parser
    for(var parserType in this.parserMap) {
        if(this.parserMap.hasOwnProperty(parserType)) {
            var parserConf = this.parserMap[parserType];
            if(parserConf.testFn(configText)) {
                this.log.debug('Parsing widget config as: %s', parserType);
                Parser = parserConf.parser;
                break;
            }
        }
    }

	if(Parser === null) {
		throw new VError('Could not determine the config parser to use');
	}

    //and parse
    var configParser = new Parser();
    return configParser.parse(configText);
};

/**
 * Hook to extend the Auto Config Parser with custom parsing strategies
 * @param type
 * @param parser
 * @param testFn
 */
AutoConfigParser.prototype.addParserStrategy = function(type, parser, testFn) {

    this.parserMap[type] = {
        parser: parser,
        testFn: testFn
    };
};

module.exports = AutoConfigParser;

},{"../../core/config-parser":196,"../../util/logger-factory":248,"../../util/verror":251,"./backbase-dom-config-parser":229,"./commonjs-package-config-parser":230,"./js-object-parser":231}],229:[function(require,module,exports){
'use strict';

var ConfigParser    = require('../../core/config-parser');
var parseWidget     = require('./xml/widget');
var helpers         = require('./xml/helpers');

/**
 * Sax parser for w3c widget config files
 * @constructor
 */
var BackbaseSaxConfigParser = function() {
};

BackbaseSaxConfigParser.prototype = Object.create(ConfigParser.prototype);

/**
 *
 * @param xml
 * @returns {Promise} Promise of widget object
 */
BackbaseSaxConfigParser.prototype.parse = function(xml) {
    try {
        var domParser = new DOMParser();
        var doc = domParser.parseFromString(xml, 'application/xml');

        var firstNode = doc.documentElement;
        var node = firstNode.tagName === 'catalog' ? helpers.getChildElements(firstNode)[0] : firstNode;

        return Promise.resolve(parseWidget(node));
    } catch(e) {
        return Promise.reject(e);
    }
};

module.exports = BackbaseSaxConfigParser;

},{"../../core/config-parser":196,"./xml/helpers":234,"./xml/widget":237}],230:[function(require,module,exports){
'use strict';

var ConfigParser = require('../../core/config-parser');
var util = require('../../util/util');

/**
 * Sax parser for w3c widget config files
 * @constructor
 */
var CommonJsPackageConfigParser = function() {

};
CommonJsPackageConfigParser.prototype = Object.create(ConfigParser.prototype);

/**
 * See https://backbase.atlassian.net/wiki/display/CXP/Widget+package.json+spec for documentation for the rules
 * used in this method
 * @param xml
 * @returns {*}
 */
CommonJsPackageConfigParser.prototype.parse = function(json) {

    try {
        var packaged = JSON.parse(json);
        var widgetModel = util.cloneDeep(require('../../core/default-widget-model'));

        //common js fields
        widgetModel.id = packaged.name || widgetModel.id;
        widgetModel.version = packaged.version || widgetModel.version;
        widgetModel.description = packaged.description || widgetModel.description;
        widgetModel._lang = packaged.locales || widgetModel._lang;

        //first contributor to author
        if(Array.isArray(packaged.contributors) && packaged.contributors.length > 0) {
            widgetModel.author = packaged.contributors[0].name || widgetModel.author;
            widgetModel.authorEmail = packaged.contributors[0].email || widgetModel.authorEmail;
            widgetModel.authorHref = packaged.contributors[0].web || widgetModel.authorHref;
        }

        //licenses to license
        if(Array.isArray(packaged.licenses) && packaged.licenses.length > 0) {
            widgetModel.license = packaged.licenses[0].type || widgetModel.license;
            widgetModel.licenseHref = packaged.contributors[0].url || widgetModel.licenseHref;
        } else if(typeof widgetModel.license === 'string') {
            widgetModel.license = packaged.license;
        }

        //widget implementation fields
        widgetModel.defaultlocale = packaged.defaultlocale || widgetModel.defaultlocale;
        widgetModel.width = packaged.width || widgetModel.width;
        widgetModel.height = packaged.height || widgetModel.height;
        widgetModel.viewmodes = packaged.viewmodes || widgetModel.viewmodes;
        widgetModel.name = packaged.fullName || widgetModel.name;
        widgetModel.shortName = packaged.shortName || widgetModel.shortName;
        widgetModel.preferences = packaged.preferences || widgetModel.preferences;
        widgetModel.features = packaged.features || widgetModel.features;
        widgetModel.icons = packaged.icons || widgetModel.icons;
        widgetModel.content = packaged.content || widgetModel.content;

        return Promise.resolve(widgetModel);
    } catch(e) {
        return Promise.reject(e);
    }
};

module.exports = CommonJsPackageConfigParser;
},{"../../core/config-parser":196,"../../core/default-widget-model":198,"../../util/util":250}],231:[function(require,module,exports){
'use strict';

var ConfigParser = require('../../core/config-parser');

/**
 * This parser passes the object straight through.
 * It exists so the AutoConfigParser will pass pre-parsed models straight through with modification
 * @constructor
 */
var JsObjectParser = function() {
};
JsObjectParser.prototype = Object.create(ConfigParser.prototype);

/**
 *
 * @param xml
 * @returns {*}
 */
JsObjectParser.prototype.parse = function(object) {
   //pass straight through. Could perform validation, patches etc here if we need
   return object;
};

module.exports = JsObjectParser;
},{"../../core/config-parser":196}],232:[function(require,module,exports){
'use strict';

var helpers = require('./helpers');

module.exports = {
    parseIcons: parseIcons,
    parseChildren: parseChildren
};

/**
 * Extracts icon specific data from given item node and its properties
 * @param {Object} properties Key/Value representation of properties
 * @return {Array}
 */
function parseIcons (properties) {
    var icons = [];
    helpers.pushIfExists(icons, properties.thumbnailUrl);
    helpers.pushIfExists(icons, properties.icon);
    return icons;
}

/**
 * Parses child items
 * @param {Element} element Item element
 * @param {function} childItemParser Child item parsing function
 * @return {Array<object>} Array of item objects
 */
function parseChildren (element, childItemParser) {
    var childrenEl = helpers.getChildElementByName(element, 'children');
    var childrenElements = childrenEl && helpers.getChildElements(childrenEl);

    return childrenElements && childrenElements.map(childItemParser).sort(childComparator);
}

/**
 * Compare function to be used in array.sort like
 * functionality to sort widgets by their area and order
 * @param {Object} first Widget object
 * @param {Object} next Widget object
 * @return {number}
 */
function childComparator (first, next) {
    var firstArea = cast(first, 'area'),
        nextArea = cast(next, 'area'),
        firstOrder = cast(first, 'order'),
        nextOrder = cast(next, 'order');

    var compare = 0;
    if (firstArea < nextArea) {
        compare = -1;
    } else if (firstArea > nextArea) {
        compare = 1;
    } else if (firstOrder < nextOrder) {
        compare = -1;
    } else if (firstOrder > nextOrder) {
        compare = 1;
    }

    return compare;
}

/**
 * @private
 * @param {Object} item an item model
 * @param {string} prefName preference name
 * @returns {null|string|number} number if possible to parse a preference as a number, bare value otherwise.
 */
function cast(item, prefName) {
    if(typeof item.preferences[prefName] === 'undefined') {
        return null;
    }

    var value = item.preferences[prefName].value;
    var numberValue = parseFloat(value);

    return isNaN(numberValue) ? value : numberValue;
}

},{"./helpers":234}],233:[function(require,module,exports){
module.exports.PROPERTY_BLACKLIST = [
    'description',
    'shortName',
    'thumbnailUrl',
    'icon',
    'viewmodes',
    'author',
    'authorEmail',
    'authorHref',
    'license',
    'licenseHref',
    'widgetChrome',
    'config',
    'src',
    'isManageableArea',
    'version',
    'width',
    'height'
];

module.exports.SPECIAL_TYPES = [
    'contentRef',
    'linkRef',
    'datasource'
];

module.exports.NO_LOCALE_NAME = 'no_locale';

},{}],234:[function(require,module,exports){
'use strict';

module.exports = {
    assignIfExists: assignIfExists,
    content:        content,
    isExists:       isExists,
    parseBool:      parseBool,
    parseString:    parseString,
    parseFloat:     parseFloat_,
    parseInt:       parseInt_,
    parseViewhint:  parseViewhint,
    pushIfExists:   pushIfExists,
    toArray:        toArray,
    getChildElementByName: getChildElementByName,
    getChildElements: getChildElements
};

/**
 * Parses given attribute as string
 * @param {Object} attr
 * @return {string|undefined}
 */
function parseString (attr) {
    if (attr && attr.value.length) {
        return attr.value;
    }
}

/**
 * Parses given viewhint string as array of viewhints
 * @param {string} viewhint Viewhint text
 * @return {Array<string>}
 */
function parseViewhint (viewhint) {
    var viewhintTrimmed = parseString(viewhint);

    if (!viewhintTrimmed) { return []; }

    return viewhintTrimmed.split(/[,\s]/).filter(function (hint) {
        return hint.trim().length > 0;
    });
}

/**
 * Checks given value against undefined and null
 * @param {*} val
 * @return {boolean}
 */
function isExists (val) {
    return typeof val !== 'undefined' && val !== null;
}

/**
 * Assigns given value to given object's name property only
 * if given value is not null or undefined. If converter_function is
 * defined given value is mapped over that function
 * @param {Object} obj  Object
 * @param {string} name Object's property name
 * @param {*} value Value to be assigned
 * @param {Function} [converter] Optional value transforming function
 */
function assignIfExists (obj, name, value, converter) {
    if (isExists(value)) {
        obj[name] = converter ? converter(value) : value;
    }
}
/**
 * Pushes given value to given array only if the given
 * value is not null or undefined.
 * @param {Array} arr Array
 * @param {*} value Value to be pushed
 */
function pushIfExists (arr, value) {
    if (isExists(value)) {
        arr.push(value);
    }
}

/**
 * Parses string into boolean. Return true only if given
 * string equals to "true" otherwise it returns "false"
 * @param {string} bool
 * @return {boolean}
 */
function parseBool (bool) {
    if (isExists(bool)) {
        if (typeof bool === 'string') {
            return bool === 'true';
        }

        return bool && bool.value === 'true';
    }
}

/**
 * Transforms given array like object (eg dom children)
 * to real array.
 * @param {T} obj
 * @return {Array.<T>}
 */
function toArray (obj) {
    return [].slice.call(obj);
}

/**
 * Parses given string into float. If the given string represents a number
 * than it returns a floating point number or NaN.
 * @param {string} num
 * @return {number|undefined}
 */
function parseFloat_ (num) {
    if (typeof num === 'string') {
        return parseFloat(num);
    }
}

/**
 * Parses given string into integer. If the given string represents a number
 * than it returns number or NaN.
 * @param {string} num
 * @param {int} radinx
 * @return {number|undefined}
 */
function parseInt_ (num) {
    if (typeof num === 'string') {
        var value = parseInt(num, 10);
        return !isNaN(value) ? value : undefined;
    }
}

/**
 * Finds first element in the given node's children by given element.
 * Unlike getElementsByTagName this function only looks first level of
 * children.
 * @param {Node} node
 * @param {string} elementName
 * @return {Node|undefined}
 */
function getChildElementByName (node, elementName) {
    var children = getChildElements(node);

    for (var i = 0; i < children.length; i++) {
        if (children[i].tagName === elementName) {
            return children[i];
        }
    }
}

/**
 * Returns node's textContent which found by given elementName.
 * If element name is not found in given node's children given
 * default value will be returned.
 * This function only looks first level of children.
 * @param {Element} element
 * @param {string} elementName
 * @param {*} [defaultValue]
 * @return {string}
 */
function content (element, elementName, defaultValue) {
    var childEl = getChildElementByName(element, elementName);

    if (typeof defaultValue === 'undefined') {
        defaultValue = null;
    }

    return (childEl && childEl.textContent) || defaultValue;
}

/**
 * Returns child elements of a node
 * @param {Node} node
 * @returns {Array} child elements
 */
function getChildElements(node) {
    if (typeof node.children !== 'undefined') {
        return toArray(node.children);
    }

    return toArray(node.childNodes).filter(function(childNode) {
        return childNode.nodeType === 1;
    });
}


},{}],235:[function(require,module,exports){
(function (global){
'use strict';

var Constants   = require('./constants');
var i18n        = require('../../../util/i18n');
var helpers     = require('./helpers');

var BLACKLIST       = Constants.PROPERTY_BLACKLIST;
var NO_LOCALE_NAME  = Constants.NO_LOCALE_NAME;

module.exports = parseItem;

/**
 * Extracts base item data from given element. This item
 * data is common between each item type. Other item types
 * use this item parser to get their base data.
 * @param {Element} itemEl Item element
 * @return {Object} Base item data
 */
function parseItem (itemEl) {
    var propertiesParent = helpers.getChildElementByName(itemEl, 'properties');
    var propertyElements = helpers.getChildElements(propertiesParent);

    var currentLocale = helpers.content(itemEl, 'locale') || getDefaultLocale();

    var properties = {};

    //create preferences map object excluding preferences from BLACKLIST
    var propertiesMap = propertyElements.reduce(function (acc, element) {
        var property = parseProperty(element, currentLocale);

        properties[property.name] = property.value;
        if(BLACKLIST.indexOf(property.name) === -1) {
            acc[property.name] = property;
        }
        return acc;
    }, {});

    var item = {
        id:               helpers.content(itemEl, 'uuid'),
        name:             helpers.content(itemEl, 'name', ''),
        shortName:        properties.shortName,
        preferences:      propertiesMap,
        preferencesDict:  properties,
        type:             itemEl.tagName,
        locale:           currentLocale,
        dir:              helpers.content(itemEl, 'dir', 'ltr'),
    };

    helpers.assignIfExists(item, 'tags', parseTags(itemEl));
    helpers.assignIfExists(item, 'extendedItemName', helpers.content(itemEl, 'extendedItemName'));
    helpers.assignIfExists(item, 'parentItemName', helpers.content(itemEl, 'parentItemName'));
    helpers.assignIfExists(item, 'contextItemName', helpers.content(itemEl, 'contextItemName'));
    helpers.assignIfExists(item, 'lockState', helpers.content(itemEl, 'lockState'));
    helpers.assignIfExists(item, 'securityProfile', helpers.content(itemEl, 'securityProfile'));
    helpers.assignIfExists(item, 'manageable', helpers.parseBool(helpers.content(itemEl, 'manageable')));
    helpers.assignIfExists(item, 'path', helpers.content(itemEl, 'path'));

    return item;
}

/**
 * Parses property object from a given property node
 * @param {Element} propertyElement <property ...> node
 * @param {Boolean} currentLocale
 * @return {Object} Property data
 */
function parseProperty (propertyElement, currentLocale) {
    var attrs       = propertyElement.attributes;
    var name        = helpers.parseString(attrs.name);
    var label       = helpers.parseString(attrs.label);
    var itemName    = helpers.parseString(attrs.itemName);
    var manageable  = attrs.manageable;
    var readonly    = helpers.parseBool(attrs.readonly);
    var localizable = helpers.parseBool(attrs.localizable);
    var viewhints   = attrs.viewHint && helpers.parseViewhint(attrs.viewHint);
    

    var valueElements = helpers.toArray(propertyElement.getElementsByTagName('value'));

    var values = valueElements.map(function (valueElement) {
        return parseValue(valueElement);
    });

    var currentLocaleValue = values.filter(function(valueObj) {
        return valueObj.locale === currentLocale;
    })[0];

    // if there is no value in current locale, get fallback value (the one with no locale specified)
    if (!currentLocaleValue) {
        currentLocaleValue = values.sort(function (current, previous) {
            // the locales are ordered in such way that the not localized values are at the end and the localized ones are sorted in a descendent way.
            // i.e 'en-us' will take precedence over 'en', if the effective locale is 'en-us-mi' and there is a value for 'en-us' and another for 'en',
            // the one for 'en-us' will be returned; if the locale is 'en-uk', the value for 'en' will be returned.
            var result = 1;
            if (current.locale) {
                if (previous.locale) {
                    result = previous.locale.localeCompare(current.locale);
                } else {
                    result = -1;
                }
            }
            return result;
        }).filter(function(valueObj) {
            return currentLocale.indexOf(valueObj.locale) === 0 || !valueObj.locale;
        })[0] || {};
    }

    var type = attrs.type && attrs.type.value || currentLocaleValue.type;
    
    var property = {
        name: name,
        readonly: readonly || false,
        value: currentLocaleValue.value
    };

    if (label)      { property.label = label; }
    if (manageable) { property.manageable = helpers.parseBool(manageable); }
    if (viewhints)  { property.viewhints = viewhints; }
    if (itemName)   { property.itemName = itemName; }

    if (type) {
        property.type = type;
    }

    if (localizable) {
        property.localizable = localizable;

        // define _lang object that holds localized values
        property._lang = values.reduce(function (obj, localizedValueObj) {
            var key = localizedValueObj.locale || NO_LOCALE_NAME;
            obj[key] = { value: localizedValueObj.value };
            return obj;
        }, {});

        // define value property as setter/getter to update current locale value in _lang object
        Object.defineProperty(property, 'value', {
            enumerable: true,
            set: function (value) {
                var langObj = this._lang || (this._lang = {});
                var localizedValue = langObj[currentLocale] || (langObj[currentLocale] = {});
                localizedValue.value = value;
                currentLocaleValue = localizedValue;
            },
            get: function () {
                return currentLocaleValue.value;
            }
        });
    }

    return property;
}

/**
 * Parses array of tags from given item node
 * @param {Node} node Item's node
 * @return {Array<object>} Array of tags
 */
function parseTags (node) {
    var parent = helpers.getChildElementByName(node, 'tags');
    var tagElements = (parent && helpers.getChildElements(parent));

    return tagElements && tagElements.map(parseTag);
}

/**
 * Parses tag data from given tag node
 * @param {Node} tagElement <tag ...> node
 * @return {Object}
 */
function parseTag (tagElement) {
    return {
        type: tagElement.attributes.type.value,
        name: helpers.parseString({value: tagElement.textContent})
    };
}

/**
 * Parse localized values for given property
 * @param {Element} valueElement
 * @return {{value: string, locale: string|undefined }}
 */
function parseValue (valueElement) {
    return {
        value: valueElement.textContent,
        type: valueElement.getAttribute('type'),
        locale: valueElement.getAttribute('locale')
    };
}

/**
 * Tries to get locale from localStorage stored under "bb:locale" key. Defaults to system default locale if it's
 * not found in the storage.
 * @returns {string}
 * @private
 */
function getDefaultLocale() {
    var locale;
    var localStorage = getLocalStorage();

    if (localStorage) {
        locale = localStorage.getItem('bb:locale');
    }

    return locale || i18n.defaultLocale;
}

/**
 * Checks if localStorage is available and returns it.
 * @returns {Storage} localStorage object if it's available, null otherwise.
 */
function getLocalStorage() {
    /* globals global */

    var probe = 'bb:__test';
    try {
        var localStorage = global.localStorage;
        localStorage.setItem(probe, probe);
        localStorage.removeItem(probe);
        return localStorage;
    } catch(e) {
        return null;
    }
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../../util/i18n":247,"./constants":233,"./helpers":234}],236:[function(require,module,exports){
'use strict';

var helpers = require('./helpers');
var parseWidget = require('./widget');
var loggerFactory = require('../../../util/logger-factory');

var log;

/**
 * Parses XML item model
 * @param {string} xml XML model
 * @returns {Object} Javascript model object
 */
function parse(xml) {
  /* jshint validthis:true */

  var doc = parseXmlString(xml);

  return this._parseXmlItemModel(doc.documentElement);
}

/**
 * Parses a list of XML item models by taking document element children elements and iterating through them
 * @param {string} xml An XML that represents a list of item models
 * @return {Array.<Object>} An array of javascript item models
 */
function parseList(xml) {
  /* jshint validthis:true */

  var doc = parseXmlString(xml);
  var self = this;

  return helpers
    .getChildElements(doc.documentElement)
    .map(function(itemEl) {
      return self._parseXmlItemModel(itemEl);
    })
    .filter(function(item) {
      return !!item;
    });
}

/**
 * Parses XML DOM element by using type-specific item parser.
 * @param {Element} itemElement XML element
 * @returns {Object} Javascript item model
 * @private
 */
function parseXmlItemModel(itemElement) {
  /* jshint validthis:true */

  var logger = getLogger();
  var itemType = itemElement.tagName.toLowerCase();
  var itemSpecificParser = this.getParser(itemType);

  if (!itemSpecificParser) {
    logger.warn('Unsupported item type [%s]', itemType);
    return null;
  }

  return itemSpecificParser(itemElement, logger);
}

/**
 * Registers type-specific item parser
 * @param {string} type An item type
 * @param {function} parser A parsing function that receives a DOM element as argument and returns javascript object
 */
function setParser(type, parser) {
  /* jshint validthis:true */

  if (!this._typeSpecificParser) {
    this._typeSpecificParser = {};
  }
  this._typeSpecificParser[type] = parser;
}

/**
 * Returns a type-specific parsing function if it's found, "undefined" otherwise
 * @param {string} type An item type
 * @return {undefined|function}
 */
function getParser(type) {
  /* jshint validthis:true */

  return this._typeSpecificParser && this._typeSpecificParser[type];
}

/**
 * Parses XML string into a DOM object
 * @param {Object} xml A DOM object
 * @private
 */
function parseXmlString(xml) {
  var parser = new DOMParser();
  return parser.parseFromString(xml, 'application/xml');
}

/**
 * Instantiate a logger if necessary and returns it
 * @returns {Object}
 * @private
 */
function getLogger() {
  if (!log) {
    var parentLog = loggerFactory.getLogger();
    log = parentLog.child({ childName: 'model-parser' });
  }

  return log;
}

/**
 * @typedef XmlModelParser
 * @type {Object}
 * @property {Function} parse
 * @property {Function} parseList
 * @property {Function} setParser
 * @property {Function} getParser
 */
var XmlModelParser = {
  parse: parse,
  parseList: parseList,
  setParser: setParser,
  getParser: getParser,
  _parseXmlItemModel: parseXmlItemModel
};

/**
 * Creates model parser instance which is capable to parse widgets and containers
 * @returns {XmlModelParser} a new instance of model parser
 */
function createInstance() {
  var instance = Object.create(XmlModelParser);
  instance.setParser('widget', parseWidget);
  instance.setParser('container', parseWidget);

  return instance;
}

/**
 * XML model parser
 * @exports strategies/parser/xml/model-parser
 */
module.exports = {
  createInstance: createInstance
};

},{"../../../util/logger-factory":248,"./helpers":234,"./widget":237}],237:[function(require,module,exports){
'use strict';

var merge           = require('../../../util/util').merge;
var parseItem       = require('./item');
var common          = require('./common');
var helpers         = require('./helpers');
var loggerFactory   = require('../../../util/logger-factory');
var url             = require('url');

var log;

module.exports = parseWidget;

/**
 * Parses widget specific data for given element
 * @param {Element} widgetEl widget node
 * @return {Object} widget object
 */
function parseWidget (widgetEl) {
    var item = parseItem(widgetEl);
    var preferences = item.preferencesDict;

    var widget = {
        content:     parseContent(preferences),
        description: preferences.description,
        icons:       common.parseIcons(preferences),
        title:       preferences.title
    };

    helpers.assignIfExists(widget, 'width',            helpers.parseInt(preferences.width, 10));
    helpers.assignIfExists(widget, 'height',           helpers.parseInt(preferences.height, 10));
    helpers.assignIfExists(widget, 'isManageableArea', helpers.parseBool(preferences.isManageableArea));
    helpers.assignIfExists(widget, 'viewmodes',        parseViewmodes(preferences));
    helpers.assignIfExists(widget, 'author',           preferences.author);
    helpers.assignIfExists(widget, 'authorEmail',      preferences.authorEmail);
    helpers.assignIfExists(widget, 'authorHref',       preferences.authorHref);
    helpers.assignIfExists(widget, 'version',          preferences.version);
    helpers.assignIfExists(widget, 'license',          preferences.license);
    helpers.assignIfExists(widget, 'licenseHref',      preferences.licenseHref);

    // alternative contents
    widget.altContent = parseAlternativeContents(item);

    // data sources
    var datasourceMap = parseDatasources(item);
    if (Object.keys(datasourceMap).length > 0) {
        widget.datasources = datasourceMap;
    }

    var children = common.parseChildren(widgetEl, parseWidget);
    if ((children || []).length > 0) {
        widget.children = children;
    }

    delete item.preferencesDict;

    return merge(item, widget);
}

/**
 * Converts certain preferences into a hash of data source objects
 * @param {Object} item model
 * @returns {Object} hash object of data sources
 */
function parseDatasources(item) {
    var preferences = item.preferences;
    var preferenceNames = Object.keys(preferences);

    return preferenceNames.map(function (prefName) {
        return preferences[prefName];
    }).filter(function (pref) {
        return pref.type === 'datasource';
    }).reduce(function (obj, datasourcePref) {
        // parse value of the preference as URL
        var datasourceConfig = parseDatasourceUri(datasourcePref.value);
        if (datasourceConfig.uri) {
            datasourceConfig.name = datasourcePref.name;
            obj[datasourcePref.name] = datasourceConfig;
        }

        return obj;
    }, {});
}

/**
 * Parses datasource URI into object
 * @param {string} uri
 * @returns {Object}
 */
function parseDatasourceUri(uri) {
    var data = {};

    if (uri) {
        var logger = getLogger();
        var uriObject;
        try {
            uriObject = url.parse(uri, true);
            data.params = Object.keys(uriObject.query).map(function (paramName) {
                return {
                    name: paramName,
                    value: uriObject.query[paramName]
                };
            });
            data.uri = data.params.length > 0 ? uri.slice(0, uri.indexOf('?')) : uri;
        } catch(er) {
            logger.error(er);
        }
    }

    return data;
}

/**
 * Parses start file specific part of widget node
 * @param {Object} properties Properties as Key/Value
 * @return {Object} Content object
 */
function parseContent(properties) {
    var content = { src: '', type: 'text/html', encoding: 'UTF-8' };
    helpers.assignIfExists(content, 'src', properties.src);
    helpers.assignIfExists(content, 'config', properties.config);
    return content;
}

/**
 * Parses alternative contents like src.settings, src.permissions, etc.
 * @param {Object.<string, *>} item
 * @returns {Object.<string, *>}
 */
function parseAlternativeContents(item) {
    var preferences = item.preferences;
    var propertyNames = Object.keys(preferences);
    var sourcePropertyNames = propertyNames.filter(function (name) {
        return /^src\..*/.test(name);
    });

    var contents = sourcePropertyNames.reduce(function (contents, propertyName) {
        var content = preferences[propertyName].value;
        var contentName = propertyName.replace(/^src\./, '');

        contents[contentName] = {
            src: content,
            encoding: 'UTF-8'
        };

        return contents;
    }, {});

    sourcePropertyNames.forEach(function (preferenceName) {
        delete item.preferences[preferenceName];
    });

    return contents;
}

/**
 * Parses viewmodes
 * @param {Object} properties Dictionary (Key/Value) of properties
 * @return {Array<string>} Array of viewmodes
 */
function parseViewmodes(properties) {
    var viewmodes_str = properties.viewmodes;

    if (viewmodes_str) {
        return viewmodes_str.split(/\s+/).filter(function (viewmode) {
            return viewmode.trim().length > 0;
        });
    } else {
        return [];
    }
}

function getLogger() {
    if (!log) {
        var parentLog = loggerFactory.getLogger();
        log = parentLog.child({childName: 'xml-widget-parser'});
    }

    return log;
}

},{"../../../util/logger-factory":248,"../../../util/util":250,"./common":232,"./helpers":234,"./item":235,"url":425}],238:[function(require,module,exports){
'use strict';

var fetch           = require('../../fetch/filtering-fetch');
var ConfigReader    = require('../../core/config-reader');
var VError          = require('../../util/verror');
var loggerFactory   = require('../../util/logger-factory');
var responseHelpers = require('../../util/response-helpers');

var XhrWidgetReader = function(opts) {
    opts = opts || {};
    this.log = loggerFactory.getLogger();
	this.useCache = typeof opts.useCache === 'boolean' ? opts.useCache : true;
    this.responseCache = {};
};
XhrWidgetReader.prototype = Object.create(ConfigReader.prototype);
XhrWidgetReader.prototype.read = function(url) {

    var self = this;
    var log = this.log;

    log.debug('Making http request for widget config to [%s]...', url);

    if(this.responseCache[url]) {
        this.log.debug('Using cached response for [%s]', url);
        return this.responseCache[url];
    }

    return fetch(url).then(function(res) {
            log.debug('Response received for [%s]. Status: %s.', url, res.status);
            return responseHelpers.isResponseOk(res) ?
                Promise.resolve(res) : Promise.reject(responseHelpers.createError(res));
        }).then(function(res) {
            return res.text();
        }).then(function(text) {
            log.trace('Received config:\n%s', text);
            if(self.useCache) {
                self.responseCache[url] = text;
            }
            return text;
        }).catch(function(err) {
            throw new VError(err, 'Failed to XHR get from ' + url);
        });
};

module.exports = XhrWidgetReader;

},{"../../core/config-reader":197,"../../fetch/filtering-fetch":214,"../../util/logger-factory":248,"../../util/response-helpers":249,"../../util/verror":251}],239:[function(require,module,exports){
(function (global){
'use strict';

var VError = require('../../util/verror');
var StartFileProcessor = require('./seamless/start-file-processor');
var fetch = require('../../fetch/filtering-fetch');
var loggerFactory = require('../../util/logger-factory');
var util = require('../../util/util');
var WidgetRenderer  = require('../../core/widget-renderer');
var responseHelpers = require('../../util/response-helpers');

var Html5SeamlessRenderer = function(widgetContainerEl, datasourceResolverFactory, opts) {
    //check some built in dependencies
    if (typeof DOMParser === 'undefined') {
        throw new Error('DOMParser is not shimmed or a native object. This renderer will not work');
    }

    this._domParser = new DOMParser();

    // created dom elements during the rendering. We can use this references to destroy widget and clean up dom
    this.widgetEl = null;
    //container properties
    this.areaMap = null;
    this.preprocessorMap = {};
    this.log = loggerFactory.getLogger();
    this._datasourceResolverFactory = datasourceResolverFactory;

    this.widgetContainerEl = widgetContainerEl;

    this.opts = opts || {};
    this.configVars = this.opts.configVars || {};
    this.parsingFormat = this.opts.parsingFormat || null;
    this.useFolderLocalization = this.opts.useFolderLocalization || false;
};

Html5SeamlessRenderer.prototype = Object.create(WidgetRenderer.prototype);

/**
 * Renders a widget. This calls the template methods <code>fetchStartFile</code> and <code>process</code>
 * in sequence.
 * @final
 * @param {Object} widgetModel The model of the widget to be rendered
 * @param {Object} widgetInstance The widget instance of the widget to be rendered
 * @returns {Promise}
 */
Html5SeamlessRenderer.prototype.render = function(widgetModel, widgetInstance) {
    var self = this;
    var processPromise;

    if (!this.isRendered()) {
        var renderReadyPromises = [];

        //get the start file (template method)
        renderReadyPromises.push(
            this._fetchStartFile(widgetModel).then(function(data) {
                return { name: 'startFile', data: data };
            })
        );

        //look for a message bundle reference
        var messageBundleUrl = widgetModel.preferences.messages && widgetModel.preferences.messages.value;
        var optionsUrl = widgetModel.preferences.options && widgetModel.preferences.options.value;

        if (messageBundleUrl) {
            renderReadyPromises.push(
                this._fetchStaticJSON(messageBundleUrl).then(function(data) {
                    return { name: 'messages', data: data };
                })
            );
        }
        if (optionsUrl) {
            renderReadyPromises.push(
                this._fetchStaticJSON(optionsUrl).then(function(data) {
                    return { name: 'options', data: data };
                })
            );
        }

        //fetch datasources
        var datasources = Object.keys(widgetModel.datasources || {}).map(function(datasourceName) {
            return widgetModel.datasources[datasourceName];
        });
        if (datasources.length > 0) {
            var datasourceResolutionContext = Html5SeamlessRenderer._buildDatasourceContext(widgetModel, widgetInstance, self.configVars);
            var datasourcePromises = datasources.map(function(datasource) {
                return self._fetchDatasource(datasource, datasourceResolutionContext).then(function(data) {
                    return data;
                });
            });
            renderReadyPromises = renderReadyPromises.concat(datasourcePromises);
        }

        //rendering process
    processPromise = Promise.all(renderReadyPromises).then(function(results) {
            var startFile, messageBundle, optionsBundle;

            // Loop over the results of the returned values, we filter out
            // the startfile, messages and options
            var datasourceContext = results.map(function(result) {
                if (result.name === 'startFile') {
                    startFile = result.data;
                } else if (result.name === 'messages') {
                    messageBundle = result.data;
                } else if (result.name === 'options') {
                    optionsBundle = result.data;
                } else {
                    return result;
                }
            })
            // Filter out any undefined returns
            .filter(function(datasource) {
                return datasource;
            })
            // Create an object of the remaining datasources
            .reduce(function(obj, datasource) {
                obj[datasource.name] = datasource.data;
                return obj;
            }, {});

            var renderingContext = util.merge({}, widgetModel, {
                datasources: datasourceContext
            });

            var additionalOptions = {
                messageBundle: messageBundle,
                optionsBundle: optionsBundle
            };

            return self.preprocess(widgetModel, startFile, renderingContext, additionalOptions);
        })
        .then(function(processedStartFileContent) {
            return self.process(widgetModel, widgetInstance, processedStartFileContent);
        })
        .catch(function(err) {
            throw new VError(err, 'The widget [' + widgetModel.name + '] could not be rendered:\n\t' + err.message);
        });
    } else {
        processPromise = Promise.resolve(self.process(widgetModel, widgetInstance, null));
    }

    return processPromise.then(function() {
        return self.postprocess(widgetModel, widgetInstance);
    });
};

/**
 * Applies the registered preprocessors to a start file.
 * The preprocessor must have been registered with a mime type that matches the mime type of the start file
 * @private
 * @param {Object} widgetModel The widget model
 * @param {String} startFileContent The raw start file content to process
 * @param {String} context The rendering or data context
 * @param {Object} messageBundle
 * @returns {Promise}
 */
Html5SeamlessRenderer.prototype.preprocess = function(widgetModel, startFileContent, context, additionalOptions) {
    var mimeType = widgetModel.content.type;
    if (startFileContent && this.preprocessorMap.hasOwnProperty(mimeType)) {
        var processor = this.preprocessorMap[mimeType];
        this.log.debug('Applying preprocessor for [%s] for [%s (%s)] ', processor.name, widgetModel.content.src, mimeType);
        return processor.process(widgetModel, startFileContent, context, additionalOptions);
    } else {
        return startFileContent;
    }
};

/**
 * Template method to fetch a start file. Return either the contents of a start file or a promise which
 * resolves to the contents of a start file
 * @param {Object} widgetModel The model of the widget to be rendered
 * @returns Promise<string>
 */
Html5SeamlessRenderer.prototype._fetchStartFile = function(widgetModel) {
    var log = this.log;

    log.debug('Starting HTML5 seamless rendering...');

    log.debug('Requesting start file [%s] ...', widgetModel.content.src);
    return fetch(widgetModel.content.src).then(function(res) {
        log.debug('Start file request resolved/ Status: %s', res.status);

        if (responseHelpers.isResponseOk(res)) {
            return res.text();
        } else {
            var error = responseHelpers.createError(res);
            error.code = res.status;
            throw error;
        }
    })
    .then(function(html) {
        log.trace('Received HTML\n: %s', html);
        return html;
    })
    .catch(function(e) {
        var error = new VError(e, 'Failed to fetch: ' + widgetModel.content.src);

        // get error code that is a HTTP response code and convert it into a widget engine code
        if (e.code === 404) {
            error.code = 'STARTFILE_NOT_FOUND';
        }

        throw error;
    });
};

/**
 * Does main rendering processing after a start file has been fetched and preprocessed
 * @param {Object} widgetModel The model of the widget to be rendered
 * @param {Object} widgetInstance The widget instance of the widget to be rendered
 * @param {String} startFileHtml The contents of the widget's start file
 * @param {String} startFileDir The actual path of the start file (after considering folder localization etc)
 */
Html5SeamlessRenderer.prototype.process = function(widgetModel, widgetInstance, startFileContent) {
    var widgetEl;
    var startFileProcessor = (this.startFileProcessor = new StartFileProcessor({
        document: document,
        configVars: this.configVars,
        log: this.log,
        startFileSrc: widgetModel.content.src
    }));

    if (startFileContent) {
        //client side render
        //
        //delegate start file parsing and rendering complexities to a dedicated module
        //this process complies with the Backbase Rendering Specs
        //https://backbase.atlassian.net/wiki/display/PrM/Rendering+specs

        var startFileDocument = this._domParser.parseFromString(startFileContent, 'text/html');

        //1. Aggregate external stylesheets from widget head to page head
        //2. Aggregate inline styles from widget head to page head (important not to aggregate from body)
        startFileDocument = startFileProcessor.aggregateStylesheets(widgetModel, startFileDocument);

        //6. Resolve document relative URIs for media elements*: img, video, audio, iframe
        startFileDocument = startFileProcessor.normalizeMediaUrls(widgetModel, startFileDocument);

        //3. Create Invokable script list
        var invokableScripts = startFileProcessor.collateInvokableScripts(widgetModel, startFileDocument);

        //4. Create widget node
        //5. Set root node innerHTML to be widget body innerHTML
        widgetEl = startFileProcessor.createWidgetRootNode(widgetModel, startFileDocument);

        //7. If widget.width is a number, set the width of the root node (element.style.width + p
        //8. If widget.height is a number set the height of the root node (element.style.height +px)
        widgetEl = startFileProcessor.setDimensions(widgetModel, widgetEl);

        //10. Prepare external and inline scripts for invocation
        startFileProcessor.prepareScripts(widgetModel, widgetEl, invokableScripts);

        //9. Inject root node into parent container
        this.widgetContainerEl.appendChild(widgetEl);
    } else {
        //assume already rendered
        for (var i = 0; i < this.widgetContainerEl.children.length; i++) {
            if (this.widgetContainerEl.children[i].hasAttribute('data-widget')) {
                widgetEl = this.widgetContainerEl.children[i];
                break;
            }
        }
    }

    //expose the widget element
    Object.defineProperty(widgetInstance, 'body', {
        enumerable: true,
        writable: !!this.configVars.compat, //required so the Backbase Format Plugin can modify the body
        value: widgetEl
    });

    //global access to the widget interface. Necessary for some plugins. Not nice
    if (global.cxp) {
        global.cxp._widgets = global.cxp._widgets || {};
        global.cxp._widgets[widgetModel.id] = widgetInstance;
    }

    this.widgetEl = widgetEl;
};

/**
 * Invokes widget post processing
 * @param widgetModel
 * @param widgetInstance
 */
Html5SeamlessRenderer.prototype.postprocess = function(widgetModel, widgetInstance) {
    return this.startFileProcessor.invokeScripts(widgetModel, widgetInstance, this.widgetEl);
};

Html5SeamlessRenderer.prototype.getWidgetNode = function() {
    return this.widgetEl || null;
};

Html5SeamlessRenderer.prototype.getParentNode = function() {
    return this.widgetContainerEl || null;
};

Html5SeamlessRenderer.prototype.setParentNode = function(widgetContainerEl) {
    this.widgetContainerEl = widgetContainerEl;
};

Html5SeamlessRenderer.prototype.getWidth = function() {
    return this.getWidgetNode() ? this.getWidgetNode().offsetWidth : 'auto';
};

Html5SeamlessRenderer.prototype.getHeight = function() {
    return this.getWidgetNode() ? this.getWidgetNode().offsetHeight : 'auto';
};

Html5SeamlessRenderer.prototype.isRendered = function() {
    return !!this.widgetContainerEl.innerHTML.trim();
};

Html5SeamlessRenderer.prototype.destroy = function() {
    // Try to find chrome around
    var widgetName = this.widgetEl.getAttribute('data-widget');

    var parent = this.widgetEl.parentElement;
    var chrome = null;

    while (parent) {
        var chromeName = parent.getAttribute('data-chrome');
        if (chromeName === widgetName) {
            chrome = parent;
            break;
        }
        parent = parent.parentElement;
    }

    // Remove created script tags for inline scripts
    this.startFileProcessor.removeInlineScripts(this.widgetEl.id, this.widgetEl);

    // Remove widget DOM
    /*  Because the chrome or the widgetEl could be already removed from the DOM 
        we double check if them have still a parent element before remove.
        This happens specially on IE 11, the element was already removed from the DOM at this point.
    */
    if (chrome && chrome.parentElement) {
        chrome.parentElement.removeChild(chrome);
    } else if (this.widgetEl.parentElement){
        this.widgetEl.parentElement.removeChild(this.widgetEl);
    }

    //Remove widgetInstance object from global.cxp._widgets collection
    if (global.cxp && global.cxp._widgets && this.widgetEl.id) {
         delete global.cxp._widgets[this.widgetEl.id];
    }

    this.widgetEl = null;
};

/**
 * Builds a hash object from data area elements found in the item element
 * @returns {Object} A hash of data area elements where the key is the name of a data area
 */
Html5SeamlessRenderer.prototype.getAreaNodes = function() {
    var self = this;
    
    if (!this.areaMap) {
        var areaAttr = 'data-area';
        var areaSelector = '[' + areaAttr + ']';
        var areaElements = this.widgetEl.querySelectorAll(areaSelector);

        this.areaMap = Array.prototype.slice.call(areaElements).filter(function(areaEl) {
            return util.ensureElementBelongsToItem(self.widgetEl.getAttribute('data-widget'), areaEl);
        }).reduce(function(areaMap, areaEl) {
            var areaName = areaEl.getAttribute(areaAttr);
            areaMap[areaName] = areaEl;

            return areaMap;
        }, {});
    }
    return this.areaMap;
};

/**
 * Adds a preprocessor to the renderer
 * @param {String} mimeType This preprocessor will be applied to start files which have this mimetype
 * @param {Object} preprocessor Apply this preprocessor for start files with a matching mime typeg
 */
Html5SeamlessRenderer.prototype.addPreprocessor = function(mimeType, preprocessor) {
    if (this.preprocessorMap.hasOwnProperty(mimeType)) {
        var oldProcessorName = this.preprocessorMap[mimeType].name;
        this.log.warn('Overriding a previously added preprocessor [%s] for the mime type [%s]', oldProcessorName, mimeType);
    }

    preprocessor.name = preprocessor.name || 'Anonymous preprocessor';
    this.log.debug('Adding the preprocessor [%s] for start files with the mime type [%s]', preprocessor.name, mimeType);
    this.preprocessorMap[mimeType] = preprocessor;
};

/**
 * Fetches message bundles
 * @param url
 * @return {Object}
 * @private
 */
Html5SeamlessRenderer.prototype._fetchStaticJSON = function(url) {
    var self = this;
    return fetch(url).then(function(response) {
        var result = response.json();
        self.log.trace('Fetched JSON file:\n%s', result);
        return result;
    });
};

/**
 * Fetches given datasource from server. Uses datasource resolver factory to get a resolver
 * capable of handling the datasource.
 * @private
 * @param {Object} datasource A datasource to get data from
 * @param {Object} widgetModel A widget/container model
 * @param {Object} widgetInstance A widget/container instance object
 * @returns {Promise}
 */
Html5SeamlessRenderer.prototype._fetchDatasource = function(datasource, context) {
    var self = this;
    var name = datasource.name;
    var resolver = self._datasourceResolverFactory.getResolver(datasource);

    return resolver.loadData(context).then(function(result) {
        self.log.trace('Fetched datasource [%s]:\n%s', name, result);
        return {
            name: name,
            data: result
        };
    }).catch(function(err) {
        self.log.error('Datasource [%s] fetch failed.', name, err);
        return {
            name: name,
            error: err
        };
    });
};

/**
 * Merges an item model and general config options object (which holds apiRoot, contextRoot, etc)
 * to build a new object that is used as a context for expression resolution in data sources.
 * @param {Object} widgetModel
 * @param {Object} widgetInstance
 * @returns {Object}
 * @private
 */
Html5SeamlessRenderer._buildDatasourceContext = function(widgetModel, widgetInstance, configVars) {
  var itemOpts = {
    itemRoot: widgetInstance.baseURI
  };

  return util.merge({}, configVars, itemOpts, widgetModel);
};

module.exports = Html5SeamlessRenderer;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../core/widget-renderer":202,"../../fetch/filtering-fetch":214,"../../util/logger-factory":248,"../../util/response-helpers":249,"../../util/util":250,"../../util/verror":251,"./seamless/start-file-processor":242}],240:[function(require,module,exports){
'use strict';

var Handlebars = require('handlebars/dist/handlebars.min');
var HandlebarsHelpers = require('handlebars-helpers');
var VError = require('../../../util/verror');
var loggerFactory = require('../../../util/logger-factory');
var i18n = require('../../../util/i18n');
var HandlebarsIntl = require('../../../util/handlebars-intl-decorator');

/**
 * Constructs a Handlebars Preprocessor.
 * This will also automatically add the following CXP helpers to Handlebars:
 * * range
 * * math
 * Compiled templates are cached
 * @constructor
 */
var HandlebarsPreprocessor = function(config) {
    this.name = 'Handlebars Preprocessor';
    this.log = loggerFactory.getLogger();
    this.dataObj = {
        cxpConfig: config || {}
    };

    this.templateCache = {};
    this.hbs = Handlebars.create();

    //add default helpers for cxp support
    var helpers = HandlebarsPreprocessor.cxpHelpers;
    for (var helperName in helpers) {
        if (helpers.hasOwnProperty(helperName)) {
            this.hbs.registerHelper(helperName, helpers[helperName]);
        }
    }

    //don't enable Format Js features if Intl API is not available (it requires a polyfill on Safari)
    if (i18n.intlSupported) {
        HandlebarsIntl.registerWith(this.hbs);
    } else {
        this.log.warn('The ECMAScript Internationalization API is not supported on this platform. Some i18n related features will fail.');
    }
};

/**
 * Processes a start file that is expected to be a handlebars template.
 * If the widget start file has a `.js` extension, it assumed the template was precompiled with the 'simple' option.
 * E.g. <code>handlebars index.handlebars -s -f index.js</code>
 * @param widgetModel
 * @param startFileContent
 * @param context
 * @param messageBundle
 * @returns {string} a preprocessed start file
 */
HandlebarsPreprocessor.prototype.process = function(widgetModel, startFileContent, context, additionalOptions) {
    
    var log = this.log;
    var errMessage;

    var templateKey = widgetModel.content.src;
    var template = this.templateCache[templateKey];

    if (!template) {
        //if the start file ends with js, assume it is a precompiled template
        if (widgetModel.content.type && widgetModel.content.type === 'application/x-handlebars-template') {
            //precompiled templates must be evaulated, so this is why we use eval
            var precompiledTemplate = null;
            try {
                eval('precompiledTemplate = ' + startFileContent); // jshint ignore:line
                template = this.hbs.template(precompiledTemplate);
            } catch (err) {
                errMessage = 'There was a problem evaluating a pre-compiled handlebars template. ' + 
                'Ensure it was compiled using the simple option.' +
                'E.g. "handlebars index.handlebars -s -f index.js"';
                this.log.error(err, errMessage);
                throw new VError(err, errMessage);
            }
        } else {
            log.debug('Compiling handlebars template instance for %s', templateKey);
            try {
                template = this.hbs.compile(startFileContent);
            } catch (err) {
                errMessage = 'There was a problem compiling a handlebars template';
                this.log.error(err, errMessage);
                throw new VError(err, errMessage);
            }
        }
        this.templateCache[templateKey] = template;
    }

    if (additionalOptions && additionalOptions.messageBundle) {
        var messages = additionalOptions.messageBundle.messages || {};
        var formats = additionalOptions.messageBundle.formats || {};
        var availableLocales = Object.keys(messages);
        var bestFitLocale = i18n.chooseBestLocale(availableLocales, widgetModel.locale);

        //TODO: consider merging messages by locale fit priority
        //see https://github.com/l20n/l20n.js/blob/v1.0.x/lib/l20n/intl.js
        //this code does not use `intl.messages` but instead puts messages directly on the intl object,
        //see https://backbase.atlassian.net/browse/BACKLOG-12050
        this.dataObj.intl = messages[bestFitLocale] || messages[i18n.defaultLocale] || {};

        if (this.dataObj.intl.locales) {
            this.log.warn('"locales" is a reserved key. It will be overridden');
        }
        this.dataObj.intl.locales = widgetModel.locale === i18n.defaultLocale ? 
            widgetModel.locale : 
            [widgetModel.locale, i18n.defaultLocale];

        if (this.dataObj.intl.formats) {
            this.log.warn('"formats" is a reserved key. It will be overridden');
        }
        this.dataObj.intl.formats = formats;
    }

    if (additionalOptions && additionalOptions.optionsBundle) {
        this.dataObj.options = additionalOptions.optionsBundle.options || {};
    }

    var result;
    try {
        result = template(context, { data: this.dataObj });
        log.trace('Using compiled Handlebars start file for %s:\n%s', templateKey, result);
    } catch (err) {
        log.error(err, 'A handlebars template [%s] could not be processed:\n\t%s', templateKey, err.message);
        throw err;
    }

    return result;
};

/**
 * Registers a handlebars helper with the internal handlebars instance
 * @param {string} name
 * @param {Function} helper
 */
HandlebarsPreprocessor.prototype.registerHelper = function(name, helper) {
    this.hbs.registerHelper(name, helper);
};

/**
 * Registers a handlebars partial with the internal handlebars instance
 * @param {string} name
 * @param {Function} partial
 */
HandlebarsPreprocessor.prototype.registerPartial = function(name, partial) {
    this.hbs.registerPartial(name, partial);
};

HandlebarsPreprocessor.cxpHelpers = HandlebarsHelpers;

module.exports = HandlebarsPreprocessor;

},{"../../../util/handlebars-intl-decorator":246,"../../../util/i18n":247,"../../../util/logger-factory":248,"../../../util/verror":251,"handlebars-helpers":3,"handlebars/dist/handlebars.min":28}],241:[function(require,module,exports){
'use strict';

var PromiseExt = require('promise-extensions')(Promise);

var _loaderInstance;

function ResourceLoader() {
    this._initilized = false;
    this._allLoadingPromises = {};
}

module.exports = function() {
    if (!_loaderInstance){
        _loaderInstance = new ResourceLoader();
    }
    return _loaderInstance;
};

/**
 * Lazily initializes an instance of resource loader.
 * As this object relies on existence of <code>document</code> free variable which may not exist at the moment
 * an instance of resource loader is created.
 * @private
 */
ResourceLoader.prototype._init = function() {
    if (this._initilized) {
        return;
    }

    this.head = document.getElementsByTagName('head')[0] || document.documentElement;
    this.asyncSupported = typeof document.createElement('script').async !== 'undefined';

    this._prepopulateLoadedCache();

    this._initilized = true;
};

ResourceLoader.prototype._prepopulateLoadedCache = function() {

    var self = this;

    var preloadedLinks = Array.prototype.slice.call(document.getElementsByTagName('link'));
    preloadedLinks.forEach(function(link) {
        var src = link.getAttribute('href');
        var isLoadable = link.rel === 'stylesheet' && src;

        if(isLoadable) {
            self._addToCache(src, src);
        }
    });

    var preloadedScripts = Array.prototype.slice.call(document.getElementsByTagName('script'));
    preloadedScripts.forEach(function(script) {
        var src = script.getAttribute('src');
        var isLoadable = !script.innerHTML && src;
        //a note about async scripts:
        //if a script that is already on the page is marked async. Its not possible to guarantee here that the script
        //has completed loading and executing, so it's not added in the loaded script cache. Therefore a script marked
        //async in the page template is likely to be reloaded, if used again in a widget.
        if(isLoadable && !script.async && !self._getFromCache(src)) {
            self._addToCache(src, Promise.resolve(src));
        }
    });
};

/**
 * Normalizes resourceUrl parameter by decoding it, so that encoded and not encoded urls that represent
 * the same resource are considered identical. Also strips off deprecated [BBHOST].
 * @todo : Please remove when support for BBHOST is dropped BACKLOG-16057
 * @param {string} resourceUrl A resource URL (script or style)
 * @returns {string} A normalized URL
 * @private
 */
ResourceLoader.prototype._normalizeKey = function normalizeKey(resourceUrl) {
    var key = decodeURI(resourceUrl);
    return key.replace(/(?:features|widgets|containers|pages|templates)\/\[BBHOST\]/gi, 'items');
};

/**
 * Adds requested resourceUrl to the cache
 * @param {string} resourceUrl A resource URL (script or style)
 * @param {*} value A value to store in the cache
 * @private
 */
ResourceLoader.prototype._addToCache = function addToCache(resourceUrl, value) {
    if (!resourceUrl) {
        return;
    }

    var key = this._normalizeKey(resourceUrl);
    this._allLoadingPromises[key] = value;
};

/**
 * Gets the value from the cache by the resourceUrl
 * @param {string} resourceUrl A resource URL (script or style)
 * @returns {*} A value stored in the cache if found, "undefined" otherwise
 * @private
 */
ResourceLoader.prototype._getFromCache = function addToCache(resourceUrl) {
    if (!resourceUrl) {
        return undefined;
    }

    var key = this._normalizeKey(resourceUrl);
    return this._allLoadingPromises[key];
};

ResourceLoader.prototype.loadScripts = function(scripts) {

    if(!(scripts instanceof Array)) {
        scripts = [ scripts ];
    }

    this._init();
    return this.asyncSupported ? this._loadScriptsAsync(scripts) : this._loadScriptsSync(scripts);
};

//modern approach
ResourceLoader.prototype._loadScriptsAsync = function(scripts) {

    var self = this;

    //this loads all the unloaded scripts asynchronously, but should execute them in order
    // (by turning async off after assigning the source)
    var scriptLoadPromises = scripts.map(function(scriptObj) {

        var src = scriptObj.src;
        var scriptPromise = self._getFromCache(src);

        if (!scriptPromise) {
            var props = {
                async: false,
            };
            var originalAttrs = scriptObj.attributes || {};
            var attrs = {
                src: src,
            };
            
            if (originalAttrs.nonce) {
                attrs.nonce = originalAttrs.nonce;
            }
            
            var scriptEl = self._createScriptElement(attrs, props);

            scriptPromise = self._createScriptPromise(scriptEl);
            self._addToCache(src, scriptPromise);

            self.head.insertBefore(scriptEl, self.head.firstChild);
        }

        return scriptPromise;
    });

    return PromiseExt.settleAll(scriptLoadPromises);
};

// TODO: consider removing this approach as it's up to a browser how to load them
ResourceLoader.prototype._loadScriptsSync = function(scripts) {

    var self = this;

    // define script element/promise pairs. Script load success/failure will settle
    // the corresponding promise.
    var scriptTuples = scripts.map(function (scriptObj) {
        var src = scriptObj.src;
        var scriptPromise = self._getFromCache(src);
        var scriptEl;

        if(!scriptPromise) {
            var originalAttrs = scriptObj.attributes || {};
            var attrs = {
                src: src,
            };
            
            if(originalAttrs.nonce) {
                attrs.nonce = originalAttrs.nonce;
            }

            scriptEl = self._createScriptElement(attrs);

            scriptPromise = self._createScriptPromise(scriptEl);
            self._addToCache(src, scriptPromise);
        }

        return {element: scriptEl, promise: scriptPromise};
    });
    var scriptPromises = scriptTuples.map(function (tuple) {
        return tuple.promise;
    });

    // attaching script element to DOM triggers its load
    function loadScript (scriptTuple) {
        if (scriptTuple.element) {
            self.head.insertBefore(scriptTuple.element, self.head.firstChild);
        }
        return scriptTuple.promise;
    }

    var startOfChainPromise = Promise.resolve(loadScript(scriptTuples[0] || {}));

    // build chain of script loading promises
    // next script starts loading only after the prev one has loaded/failed
    var chain = scriptTuples.slice(1).reduce(function (promise, scriptTuple) {
        var loadNextScript = loadScript.bind(null, scriptTuple);
        return promise.then(loadNextScript, loadNextScript);
    }, startOfChainPromise);

    // terminate chain in case the last script failed to load
    chain.catch(function () {});

    return PromiseExt.settleAll(scriptPromises);
};

ResourceLoader.prototype._createScriptElement = function(attrs, props) {
    var scriptElement = Object.keys(attrs || {}).reduce(function(scriptEl, attrName) {
        scriptEl.setAttribute(attrName, attrs[attrName]);
        return scriptEl;
    }, document.createElement('script'));

    if (props) {
        Object.assign(scriptElement, props);
    }

    return scriptElement;
};

ResourceLoader.prototype._createScriptPromise = function(scriptEl) {
    var src = scriptEl.src;
    return new Promise(function(resolve, reject) {

        scriptEl.onload = function() {
            resolve(src);
        };

        scriptEl.onerror = function() {
            reject(src);
        };
    });
};

ResourceLoader.prototype.loadCss = function(hrefs) {

    if(!(hrefs instanceof Array)) {
        hrefs = [ hrefs ];
    }

    this._init();

    var self = this;
    var head = self.head;
    var currentBatch = [];

    hrefs.forEach(function(src) {

        var stylePromise = self._getFromCache(src);

        if(stylePromise) {
            currentBatch.push(stylePromise);
        } else {
            var newLinkEl = document.createElement('link');
            newLinkEl.setAttribute('rel', 'stylesheet');
            newLinkEl.setAttribute('type', 'text/css');
            newLinkEl.setAttribute('href', src);

            var promise = Promise.resolve(src);

            self._addToCache(src, promise);
            currentBatch.push(promise);

            //logic to insert after last stylesheet element in head
            var sheetLinksEls = Array.prototype.slice.call(head.getElementsByTagName('link')).filter(function(el) {
                return el.rel === 'stylesheet';
            });
            if(sheetLinksEls.length) {
                var lastLinkEl = sheetLinksEls.pop();
                lastLinkEl.parentNode.insertBefore(newLinkEl, lastLinkEl.nextSibling);
            } else {
                head.insertBefore(newLinkEl, head.firstChild);
            }
        }
    });

    return Promise.all(currentBatch);
};

},{"promise-extensions":194}],242:[function(require,module,exports){
(function (global){
'use strict';

var util = require('../../../util/util');
var url = require('url');
var resourceLoader = require('./resource-loader')();
var VError = require('../../../util/verror');

var pathname;
if(global.location) {
    pathname = global.location.pathname;
}

/**
 *
 * @param documentContext
 * @param parentNode
 * @param opts
 * @constructor
 */
function StartFileProcessor(opts) {
    opts = opts || {};
    this.log = opts.log || null;
    this.documentContext = opts.document;
    this.configVars = opts.configVars || {};
    this.startFileSrc = opts.startFileSrc || '';

    //this is needed to differentiate inline scripts for the same widget but different start files.
    //such as in the cx manager inspector widget. It is only set to a value if client side rendering is
    //used. The _getScriptKey() function combines the widget id with the this suffix to generate key
    //unique to a start file
    this._scriptKeySuffix = '';
}

/**
 * a. Aggregate external stylesheets from widget head to page head
 * b. Aggregate inline styles from widget head to page head (important not to aggregate from body)
 *    i.e. any style element that is a direct child of the head
 * @returns The provided start file documented with the aggregated/loaded elements removed
 * @private
 */
StartFileProcessor.prototype.aggregateStylesheets = function(widgetModel, startFileDocument) {
    var self = this;

    var externalStylesBatch = [];
    function addToBatch(linkElem) {
        var href = linkElem.getAttribute('href');
        var linkUrl = self._normalizeResourceUrl(href, widgetModel);
        externalStylesBatch.push(linkUrl);
    }
    function loadBatch() {
        //syncronous call, no catch needed
        resourceLoader.loadCss(externalStylesBatch);
        externalStylesBatch = [];
    }

    //this loads all links and styles in their original order from the start files head
    var styleAndLinkElements = startFileDocument.querySelectorAll(' head > style, head > link[rel=stylesheet]');
    Array.prototype.slice.call(styleAndLinkElements).forEach(function(elem) {
        if (elem.tagName.toLowerCase() === 'style') {
            loadBatch();
            self.documentContext.head.appendChild(elem);
        } else if(elem.getAttribute('href')) {
            addToBatch(elem);
        }
    });
    loadBatch();

    return startFileDocument;
};

/**
 * Create Invocable script list
 * a. For each script ((i.e any script tags where the type attribute is undefined or equal to text/javascript and that
 *    are direct children of the widget head or widget body)
 * b. Add to list
 * c. Resolve document relative src attribute values
 * d. Replace configuration placeholders ( $(itemRoot), $(contextRoot) etc)
 * e. Remove from widget dom
 * @private
 */
StartFileProcessor.prototype.collateInvokableScripts = function(widgetModel, startFileDocument) {
    var self = this;
    var scriptElements = startFileDocument.getElementsByTagName('script');

    var scripts =  Array.prototype.slice.call(scriptElements).reduce(function(processedScripts, scriptElement) {
        if(!scriptElement.type || scriptElement.type === 'text/javascript') {
            var scriptContent = scriptElement.innerHTML;
            var src = scriptElement.getAttribute('src');
            if(scriptContent) {
                processedScripts.push({
                    content: scriptContent
                });
            } else if(src) {
                processedScripts.push({
                    src: self._normalizeResourceUrl(src, widgetModel)
                });
            }
            scriptElement.parentNode.removeChild(scriptElement);
        }
        return processedScripts;
    }, []);

    //also add the onload attribute
    var startFileBody = startFileDocument.getElementsByTagName('body')[0];
    var onloadAttribute = startFileBody.getAttribute('onload');
    if(onloadAttribute) {
        scripts.push({
            content: onloadAttribute
        });
    }

    return scripts;
};

/**
 * a. Resolve document relative URIs for media elements*: img, video, audio, iframe
 * b. Replace configuration placeholders ( $(itemRoot), $(contextRoot) etc)
 * @param startFileDocument
 * @return {*}
 * @private
 */
StartFileProcessor.prototype.normalizeMediaUrls = function(widgetModel, startFileDocument) {
    var self = this;
    var imageElements = startFileDocument.getElementsByTagName('img');
    Array.prototype.slice.call(imageElements).forEach(function(imageElement) {
        var originalSrc = imageElement.getAttribute('src');
        if(originalSrc) {
            var src = self._normalizeResourceUrl(originalSrc, widgetModel);
            if(imageElement.getAttribute('src') !== src) {
                imageElement.src = src;
            }
        }
    });
    return startFileDocument;
};

/**
 * Create root node
 * a. Create a div element
 * b. Set attribute id to be the widget UUID
 * c. Set attribute data-widget to be the widget name
 * d. Copy attributes from widget body to root node (excluding id)
 */
StartFileProcessor.prototype.createWidgetRootNode = function(widgetModel, startFileDocument) {
    //create the widget element
    var widgetNode =  this.documentContext.createElement('div');

    //id and data-widget
    widgetNode.id = widgetModel.id;
    widgetNode.setAttribute('data-widget', widgetModel.name);

    //add body attributes to root widget el
    var startFileBodyElement = startFileDocument.getElementsByTagName('body')[0];
    for (var i = 0; i < startFileBodyElement.attributes.length; i++) {
        var bodyAttr = startFileBodyElement.attributes[i];
        if (bodyAttr.specified && bodyAttr.name !== 'onload' && bodyAttr.name !== 'id') {
            widgetNode.setAttribute(bodyAttr.name, bodyAttr.value);
        }
    }

    widgetNode.innerHTML = startFileBodyElement.innerHTML;
    
    return widgetNode;
};

/**
 * a. If widget.width is a number, set the width of the root node (element.style.width + px)
 * b. If widget.height is a number set the height of the root node (element.style.height +px)
 * @param widgetModel
 * @param widgetEl
 * @return {*}
 * @private
 */
StartFileProcessor.prototype.setDimensions = function(widgetModel, widgetEl) {
    var self = this;

    function setDimension(widthOrHeight) {
        if(widgetModel[widthOrHeight] && !isNaN(parseInt(widgetModel[widthOrHeight]))) {
            widgetEl.style[widthOrHeight] = parseInt(widgetModel[widthOrHeight]) + 'px';
            self.log.debug('Widget %s set to %s.', widthOrHeight, widgetEl.style[widthOrHeight]);
        }
    }
    setDimension('width');
    setDimension('height');

    return widgetEl;
};

/**
 * Prepare external and inline scripts for invocation
 * a. For each script in script list
 *    i. Append to root node and
         - For external scripts, set src attribute to data-src
         - For inline scripts, wrap in widget function wrapper  (see code snippet below)
 * @param widgetModel
 * @param widgetEl
 * @param invokableScripts
 * @private
 */
StartFileProcessor.prototype.prepareScripts = function(widgetModel, widgetEl, invokableScripts) {
    var self = this;

    this._scriptKeySuffix = '_' + this.startFileSrc;
    var scriptKey = this._getScriptKey(widgetModel.id);

    global.cxp = global.cxp || {};
    global.cxp.scripts = global.cxp.scripts || {};
    global.cxp.scripts[scriptKey] = [];

    invokableScripts.forEach(function(script) {
        var cspNonce = self.configVars.cspNonce;
        var scriptEl = self.documentContext.createElement('script');
        
        if (cspNonce) {
            scriptEl.setAttribute('nonce', cspNonce);
        }

        if(script.content) {
            var scriptStart = 'cxp.scripts[\'' + scriptKey + '\'].push(function(widget, __GADGET__,  __WIDGET__) { ';
            var scriptEnd = ' });';
            scriptEl.innerHTML = scriptStart + script.content + scriptEnd;
            scriptEl.setAttribute('data-cxp-script', scriptKey);
            self.documentContext.body.appendChild(scriptEl);
        } else {
            scriptEl.setAttribute('data-src', script.src);
            widgetEl.appendChild(scriptEl);
        }
    });
    return widgetEl;
};

/**
 * Remove inline scripts for given widgetId (for destroying)
 * @param widgetModel
 * @param widgetEl
 * @param invokableScripts
 * @private
 */
StartFileProcessor.prototype.removeInlineScripts = function(widgetId) {

    var scriptKey = this._getScriptKey(widgetId);
    
    //remove scripts array from global scripts object for given widgetId
    global.cxp.scripts = global.cxp.scripts || {};
    delete global.cxp.scripts.scriptKey;

    //remove inline script elements
    var scriptElements = this.documentContext.querySelectorAll('script[data-cxp-script=\'' + scriptKey + '\']');
    Array.prototype.slice.call(scriptElements).forEach(function (scriptEl) {
        scriptEl.parentElement.removeChild(scriptEl);
    });
};

StartFileProcessor.prototype.invokeScripts = function(widgetModel, widgetInstance, widgetEl) {
    var self = this;
    var log = this.log;
    var itemName = widgetModel.name;
    var dataSourceAttr = 'data-src';
    var scriptSelector = 'script[data-src]';

    var externalScriptElements = widgetEl.querySelectorAll(scriptSelector);
    var scriptSources = Array.prototype.slice.call(externalScriptElements).filter(function (scriptElement) {
        // in case of SSR don't pick up scripts from child items
        return util.ensureElementBelongsToItem(itemName, scriptElement);
    }).map(function(scriptElement) {
        var attributes = [].slice.call(scriptElement.attributes).filter(function(attr) {
            return attr.name !== dataSourceAttr;
        }).reduce(function(map, attr) {
            map[attr.name] = attr.value;
            return map;
        }, {});
        var src = scriptElement.getAttribute(dataSourceAttr);

        return {
            src: self._normalizeResourceUrl(src, widgetModel),
            attributes: attributes,
        };
    });

    return resourceLoader.loadScripts(scriptSources).then(function(inspections) {
        log.debug('JS resources have loaded.');
        var failedScripts = [];

        //review external script results
        if(inspections) {
            var errorCount = inspections.filter(function(scriptLoadInspection) {
                var rejected = scriptLoadInspection.isRejected();
                return rejected && failedScripts.push(scriptLoadInspection.reason);
            }).length;
            if(errorCount > 0) {
                log.warn('%s scripts failed to load:\n%s', errorCount, failedScripts.join(', '));
            }
        }

        //invoke inline scripts
        var scriptKey = self._getScriptKey(widgetModel.id);
        if(global.cxp && global.cxp.scripts && Array.isArray(global.cxp.scripts[scriptKey])) {
            try {
                global.cxp.scripts[scriptKey].forEach(function (scriptFn) {
                    if(typeof scriptFn === 'function') {
                        scriptFn.call(null, widgetInstance, widgetInstance, widgetInstance);
                    }
                });
            } catch(err) {
                //TODO: better error
                log.warn('Failed to invoke inline scripts for widget "%s".\n%s', widgetModel.name, err);
            }
        }
    }).catch(function(err) {
        throw new VError(err, 'Failed to render HTML5 seamless widget');
    });    
};

/**
 * Replace path placeholders ( $(contextRoot) etc)
 * @param resourceUrl
 * @param widgetModel
 * @return {String|*}
 * @private
 */
StartFileProcessor.prototype._normalizeResourceUrl = function(resourceUrl, widgetModel) {
    resourceUrl = util.replacePathVars(resourceUrl, this.configVars, this.log);
    
    //need to make paths site relative.
    if(util.isUrlDocumentRelative(resourceUrl)) {
        var startFilePath = widgetModel.content.src;
        var startFileDir = startFilePath.substring(0, startFilePath.lastIndexOf('/') + 1);
        if(util.isUrlDocumentRelative(startFilePath)) {
            var docRoot = pathname.substring(0, pathname.lastIndexOf('/') + 1);
            startFileDir = url.resolve(docRoot, startFileDir);
        }
        resourceUrl = url.resolve(startFileDir, resourceUrl);
    }

    return resourceUrl;
};

StartFileProcessor.prototype._getScriptKey = function(widgetId) {
    return widgetId + this._scriptKeySuffix;
};

module.exports = StartFileProcessor;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../../util/util":250,"../../../util/verror":251,"./resource-loader":241,"url":425}],243:[function(require,module,exports){
/* global window: false*/
'use strict';

var WidgetStorage = require('./web-storage-decorator');

function Html5LocalStorage() {
    WidgetStorage.call(this, window.localStorage);
}
Html5LocalStorage.prototype = Object.create(WidgetStorage.prototype);

module.exports = Html5LocalStorage;
},{"./web-storage-decorator":245}],244:[function(require,module,exports){
'use strict';
var util = require('../../util/util');

/**
 * This class implements [StorageEvent](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent)
 *
 * It would be preferable to use the native StorageEvent class, but doing seemed too difficult; the final argument when
 * calling <code>initStorageEvent</code> must be a valid StorageArea implementation, but I was not able to figure out
 * how to make Firefox think custom storage areas implement the native Storage interface.
 *
 * This event may not work if using it on native EventTarget implementations such as the <code>window</code> object
 *
 * @exports the StorageEvent constructor
 * @type {StorageEvent|exports}
 */

/**
 * Constructor
 * @param type
 * @constructor
 */
function StorageEvent(type) {
    this.type = type;
}

/**
 * Initializes the event in a manner analogous to the similarly-named method in the DOM Events interfaces.
 * @param {String} type The name of the event.
 * @param {Boolean} canBubble A boolean indicating whether the event bubbles up through the DOM or not.
 * @param {Boolean} cancellable A boolean indicating whether the event is cancelable.
 * @param {String} key The key whose value is changing as a result of this event.
 * @param {String} oldValue The key's old value.
 * @param {String} newValue The key's new value.
 * @param {String} url
 * @param {Object} storageArea The DOM Storage object representing the storage area on which this event occurred.
 */
StorageEvent.prototype.initStorageEvent = function(type, canBubble, cancellable, key, oldValue, newValue, url,
                                                   storageArea) {
    this.type = type;
    this.canBubble = canBubble;
    this.cancellable = cancellable;
    this.key = key;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.url = url;
    this.storageArea = storageArea;
};

StorageEvent.prototype.toString = function() {
    return util.format('[object StorageEvent] (key=%s, oldValue=%s, newValue=%s, url=%s)',
        this.key, this.oldValue, this.newValue, this.url);
};

module.exports = StorageEvent;
},{"../../util/util":250}],245:[function(require,module,exports){
(function (process){
'use strict';

/**
 * Use this module to help build new Widget Storage implementations or adapt existing WebStorage implementations
 *
 * The WidgetStorage class provides an <code>init</code> method which initializes the web storage with a set of
 * preferences from a widget's configuration, ensuring readonly preferences are respected
 *
 * When storing widget preferences it will prefix them with the widget's instance id so multiple widgets can
 * share the same storage environment.
 *
 * @example
 *
 * var MyStorageImpl = function() {
 *  var storage = new WebStorageImpl();
 *  WebStorageDecorator.call(this, storage);
 * };
 * MyStorageImpl.prototype = Object.create(WebStorageDecorator.prototype);
 *
 * @exports the WebStorageDecorator constructor
 * @type {WidgetStorage|exports}
 */

//originally adapted from https://gist.github.com/tlrobinson/1334406
var loggerFactory = require('../../util/logger-factory');
var bunyan = require('browser-bunyan');
var WidgetStorage = require('../../core/widget-storage');
var VError = require('../../util/verror');
var StorageEvent = require('./storage-event');
var util = require('../../util/util');

/**
 * WebStorageDecorator constructor for web storage
 * @param {Object} storage A web storage implementation. e.g. sessionStorage
 * @param {Object} [eventTarget] When WebStorage events are generated, they will be dispatched to this object
 * @constructor
 * @implements {WidgetStorage}
 */
function WebStorageDecorator(storage) {

    this.eventTarget = [];
    this.log = loggerFactory.getLogger();

    this._items = [];
    this._storage = storage;
    this._prefix = '';
    this._eventsEnabled = false; //enable after initialization

    //storage needs a length property
    var self = this;
    Object.defineProperty(this, 'length',  {
        enumerable: false,
        configurable: false,
        get: function () {
            return Object.keys(self._items).length;
        }
    });
}

WebStorageDecorator.prototype = Object.create(WidgetStorage.prototype);

/**
 * Initializes the storage
 * @param {string} widgetInstanceId
 * @param {Array} preferences
 */
WebStorageDecorator.prototype.init = function(widgetInstanceId, preferences) {

    var self = this;
    var log = this.log;
    this._prefix = widgetInstanceId || '';

    log.debug('Initializing preference storage for widget [%s]', widgetInstanceId);
    log.debug('Using internal storage [%s]', this._storage.toString());
    if(log.level() <= bunyan.TRACE) {
        log.trace('Initializing storage with the following preferences:\n %s', JSON.stringify(preferences));
    }

    if(preferences) {
        this._items = Object.keys(preferences).map(function(prefName) {
            return self.defineItem(preferences[prefName]);
        });
    }

    //events are disabled until the storage is initialized
    this._eventsEnabled = true;
};

/**
 * Gets an item value from storage
 * @param {string} key
 * @returns {string}
 */
WebStorageDecorator.prototype.getItem = function(key) {

    //look for personalized value in storage
    var value = this._storage.getItem(this._prefix + key);
    if(typeof value === 'undefined' || value === null) {
        //revert to memory
        var item = this._getItemDefinition(key) || null;
        value = item ? item.value : null;
    }
    if(typeof value === 'undefined') {
        //must explicitly return null if the item does not exist
        value = null;
    }
    this.log.trace('Getting preference [%s=%s]', key, value);

    return value;
};

/**
 * Defines an item, so it is accessible as a property of the storage
 * @param {Object} pref
 */
WebStorageDecorator.prototype.defineItem = function(pref) {

    var self = this;
    var key = pref.name;

    this._items.push(pref);

    var propertyDescriptor = {
        enumerable: true,
        configurable: true,
        get: function () {
            return self.getItem(key);
        },
        set: function(val) {
            return self.setItem(self._prefix + key, val);
        }
    };
    Object.defineProperty(this, key, propertyDescriptor);

    return pref;
};

/**
 * Sets an item. Setting an item to null will remove it
 * @param {string} key
 * @param {string} value
 * @param {string} [type]
 * @returns {*}
 */
WebStorageDecorator.prototype.setItem = function(key, value, type) {
    this._ensureItemWritable(key);

    this.log.debug('Setting preference to storage [%s=%s]', key, value);

    //behavior is that setting an item to null will remove it
    if(value === null) {
        return this.removeItem(key);
    } else {
        this._notify(key, this.getItem(key), value);
        return this._storage.setItem(this._prefix + key, value, type);
    }
};

/**
 * Clears personalization of an item
 * @param {string} key
 * @returns {string}
 */
WebStorageDecorator.prototype.removeItem = function(key) {

    this._notify(key, this.getItem(key), null);

    this.log.debug('Removing preference from storage [%s]', key);

    return this._storage.removeItem(this._prefix + key);
};

/**
 * Clears the storage area
 */
WebStorageDecorator.prototype.clear = function() {

    var self = this;

    this._notify(null, null, null);

    this.log.debug('Clearing preferences');

    //must disable events so removeItem does not fire events
    this._eventsEnabled = false;
    Object.keys(this._storage).filter(function(key) {
        return key.indexOf(self._prefix) === 0;
    }).forEach(function(key) {
        self.removeItem(key.substr(self.prefix.length));
    });
    this._eventsEnabled = true;
};

/**
 * Returns the nth key from the list of preferences
 * @returns {string|null} The key of the preference at the requested index
 */
WebStorageDecorator.prototype.key = function(n) {

    return this._items[n] ? this._items[n].name : null;
};

/**
 * Gets an array of they keys stored
 * @deprecated (none standard)
 * @returns {Array}
 */
WebStorageDecorator.prototype.keys = function() {

    var self = this;

    var keys = Object.keys(this._storage).filter(function(key) {
        return key.indexOf(self._prefix) === 0;
    });

    if(keys.length === 0) {
        return [];
    }

    return keys.map(function(key) {
        return key.slice(self._prefix.length);
    });
};

WebStorageDecorator.prototype._getItemDefinition = function(key) {

    var pref = this._items.filter(function(item) {
        return key === item.name;
    })[0];

    return pref || null;
};

/**
 * Helper method for internally propagating storage events
 * @private
 * @param {string} key The key whose value is changing as a result of this event.
 * @param {string} oldVal The key's old value.
 * @param {string} newVal The key's new value.
 */
WebStorageDecorator.prototype._notify = function(key, oldVal, newVal) {
    if(!this._eventsEnabled) {
        return;
    }

    var self = this;
    var eventTargets = Array.isArray(this.eventTarget) ? this.eventTarget : [this.eventTarget];

    eventTargets.filter(function(target) {
        return target !== undefined && target !== null;
    }).forEach(function(eventTarget) {
        if(typeof eventTarget.dispatchEvent !== 'function') {
            var message =
                'Cannot dispatch StorageEvent for preferences. ' +
                'An event target was provided, but it does not implement the EventTarget interface. [%s, %s, %s]';
            self.log.warn(message, key, oldVal, newVal);
            return;
        }

        //please see notes in the StorageEvent jsdoc about using custom vs native event implementations
        var storageEvent = new StorageEvent('storage');
        storageEvent.initStorageEvent('storage', false, false, key, oldVal, newVal, self._prefix, self);

        process.nextTick(function() {
            if(self.log.level() <= bunyan.DEBUG) {
                self.log.debug('Sending StorageEvent [%s] ', storageEvent);
            }
            eventTarget.dispatchEvent(storageEvent);
        });
    });
};

/**
 * Checks whether an item value can be updated. Throws an error if it's readonly.
 * @param {sring} key The item name
 * @throws {VError}
 * @private
 */
WebStorageDecorator.prototype._ensureItemWritable = function(key) {
    //scenarios where setting the preference should fail
    var itemDefinition = this._getItemDefinition(key);
    if(itemDefinition && itemDefinition.readonly) {
        var errorMessage = util.format('Attempted to modify readonly preference [%s]', key);
        this.log.warn(errorMessage);
        throw new VError(errorMessage);
    }
};

module.exports = WebStorageDecorator;

}).call(this,require('_process'))
},{"../../core/widget-storage":203,"../../util/logger-factory":248,"../../util/util":250,"../../util/verror":251,"./storage-event":244,"_process":420,"browser-bunyan":2}],246:[function(require,module,exports){
/**
 * The sole purpose of the decorator is to overcome the limitations of formatNumber helper
 * (https://github.com/yahoo/handlebars-intl) that accepts
 * only number as a value despite the fact that Intl.NumberFormat function which the helper uses internally
 * accepts a value of any type.
 * Issue report https://github.com/yahoo/handlebars-intl/issues/84
 */

'use strict';

var Handlebars = require('handlebars/dist/handlebars.min');
var HandlebarsIntl = require('handlebars-intl');

module.exports = {
    registerWith: registerWith
};

function registerWith(hbs) {
    var mockInstance = Handlebars.create();
    var helpers = {};

    // substitute registerHelper function to collect helpers
    mockInstance.registerHelper = function registerHelper(name, helper) {
        if (typeof name === 'string') {
            helpers[name] = helper;
        } else {
            // name is actually a hash of helpers
            Object.keys(name).forEach(function (helperName) {
                helpers[helperName] = name[helperName];
            });
        }
    };

    // collect helpers
    HandlebarsIntl.registerWith(mockInstance);

    // decorate formatNumber helper
    if (helpers.formatNumber) {
        var formatNumberOriginal = helpers.formatNumber;
        helpers.formatNumber = function formatNumber(num) {
            // convert 1st argument to number and call original function
            var args = [].slice.call(arguments);
            args[0] = Number(num); // this is exactly what Intl.NumberFormat does internally

            return formatNumberOriginal.apply(this, args);
        };
    }

    // register helpers
    hbs.registerHelper(helpers);
}

},{"handlebars-intl":5,"handlebars/dist/handlebars.min":28}],247:[function(require,module,exports){
(function (global){
'use strict';

var RTL_LOCALES = ['ar', 'iw', 'he', 'dv', 'ha', 'fa', 'ps', 'ur', 'yi', 'ji'];

module.exports = {
    defaultLocale: 'en',
    
    intlSupported: typeof global.Intl !== 'undefined',

    /**
     * Returns direction for the given locale (rtl or ltr)
     * @param {String} locale
     * @returns {string}
     */
    getDirection: function (locale) {
        return locale.length >= 2 && RTL_LOCALES.indexOf(locale.substr(0, 2)) >= 0 ? 'rtl' : 'ltr';
    },

    /**
     * Returns best matching locale in available locales considering
     * desired one.
     * @param {String[]} availableLocales
     * @param {String} desiredLocale
     * @returns {String|undefined}
     */
    chooseBestLocale: function (availableLocales, desiredLocale) {
        // 1. Let candidate be locale
        var candidate = desiredLocale;

        // 2. Repeat
        while (candidate) {
            // a. If availableLocales contains an element equal to candidate, then return
            // candidate.
            if (Array.prototype.indexOf.call(availableLocales, candidate) > -1) {
                return candidate;
            }

            // b. Let pos be the character index of the last occurrence of "-"
            // (U+002D) within candidate. If that character does not occur, return
            // undefined.
            var pos = candidate.lastIndexOf('-');

            if (pos < 0) {
                return;
            }

            // c. If pos ≥ 2 and the character "-" occurs at index pos-2 of candidate,
            //    then decrease pos by 2.
            if (pos >= 2 && candidate.charAt(pos - 2) === '-') {
                pos -= 2;
            }

            // d. Let candidate be the substring of candidate from position 0, inclusive,
            //    to position pos, exclusive.
            candidate = candidate.substring(0, pos);
        }
    }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],248:[function(require,module,exports){
/**
 * Tne Logger Factory
 * @module util/logger-factory
 * @exports {loggerFactory} The static logger factory
 */


'use strict';

var bunyan = require('browser-bunyan');
var util = require('../util/util');

var loggerMap = {};
var lastLogger = null;

var loggerFactory = {
    defaultLoggerName: 'logger',
    defaultLogLevel: 'info'
};

/**
 * Creates a logger.
 * @static
 * @method
 * @param {Object} opts
 * @param {Object} [opts.parentLog] Specifies a parent logger for a logger to be created as a child logger
 * @param {string} [opts.loggerName] A logger name. If not specified a logger will be given "<i>logger</i>" name.
 * @param {string} [opts.logLevel] The default log level. Defaults to 'info'.
 * @param {boolean} [opts.appendId] If true, a unique string will be appended to a logger name. Defaults to <i>false</i>
 * @returns {Object} A new logger object
 */
loggerFactory.createLogger = function(opts) {

    opts = opts || {};

    var parentLog = opts.parentLog || null;
    var loggerName = opts.loggerName || this.defaultLoggerName;
    var logLevel = opts.logLevel || this.defaultLogLevel;
    var appendId = opts.appendId || false;

    if(appendId) {
        loggerName += '/' + util.randomId();
    }

    var logger;
    if(parentLog) {
        logger = parentLog.child({ childName: loggerName});
    } else {
        logger = bunyan.createLogger({
            name: loggerName,
            streams: [
                {
                    level: logLevel,
                    stream: new bunyan.ConsoleFormattedStream(),
                    type: 'raw'
                }
            ],
            src: bunyan.resolveLevel(logLevel) <= bunyan.DEBUG
        });
    }

    loggerMap[loggerName] = logger;
    lastLogger = logger;

    return logger;
};

/**
 * Gets a logger, first tries to get a logger with the matching name. If no logger name is given or no matching
 * logger is found, get the last created logger. Falls back to creating a new logger.
 * @static
 * @method
 * @param {String} [loggerName]
 * @returns {*}
 */
loggerFactory.getLogger = function(loggerName) {

    if(loggerName && loggerMap[loggerName]) {
        return loggerMap[loggerName];
    } else if(lastLogger) {
        return lastLogger;
    } else {
        return loggerFactory.createLogger();
    }
};

module.exports = loggerFactory;
},{"../util/util":250,"browser-bunyan":2}],249:[function(require,module,exports){
'use strict';

function isResponseOk(response) {
    if (typeof response.ok === 'boolean') {
        return response.ok;
    }

    var status = response.status;
    return status >= 200 && status <= 299;
}

function createError(response) {
    var message = response.statusText || 'Response status ' + (response.status || 'unknown');
    return new Error(message);
}

module.exports = {
    isResponseOk: isResponseOk,
    createError: createError
};

},{}],250:[function(require,module,exports){
(function (global){
/**
 * Common utilities
 * @module util/util
 */

'use strict';

var bunyan = require('browser-bunyan');

//super stripped down lodash. Only what we need
var _ = {
    cloneDeep: require('lodash/cloneDeep'),
    merge: require('lodash/merge'),
    omit: require('lodash/omit'),
    assign: require('lodash/assign')
};

//widget engine utils.
//If available, delegate a util method in this modele to a lodash one. Only require the specific lodash module required
var util = {};

/**
 * <p>Returns true if:
 * <ol>
 *  <li>the value is a boolean and true<br>
 *  <li>the value is a number and not 0<br>
 *  <li>the value is a string and equal to 'true' (after trimming and ignoring case)
 * </ol>
 * @memberOf util
 * @param {*} val The value to parse
 * @return {boolean} A boolean value depending on the parsing result
 */
/* jshint ignore:start */
util.parseBoolean = function (val) {

    //double equals (==) here is deliberate
    return ((typeof val === 'boolean' || val instanceof Boolean) && val == true) ||
        ((typeof val === 'string' || val instanceof String) && /^\s*true\s*$/i.test(val)) ||
        ((typeof val === 'number' || val instanceof Number) && val != 0);
};
/* jshint ignore:end */

/**
 * Determines if an http(s) url is absolute.
 * @param {string} url
 * @returns {boolean} true if the url is absolute
 */
util.isUrlAbsolute = function (url) {
    var absoluteRegex = /^https?:\/\/|file?:\/\//i;
    return absoluteRegex.test(url);
};

/**
 * Determines if a url is site relative (/path/to/page)
 * @param {string} url
 * @returns {boolean} true if the url is site relative
 */
util.isUrlSiteRelative = function (url) {
    return url.indexOf('/') === 0;
};

/**
 * Determines if a url is document relative (path/to/page or ../path/to/page)
 * @param {string} url
 * @returns {boolean}
 */
util.isUrlDocumentRelative = function (url) {
    return !(util.isUrlAbsolute(url) || util.isUrlSiteRelative(url));
};

/**
 * Determines if the widget engine is running on the filesystem
 * @return {boolean}
 */
util.isRunningOnFilesystem = function() {
    return typeof global.location !== 'undefined' && global.location.protocol === 'file:';
};


/**
 * Determines if a url is for a resource on the filesystem
 * @param url
 * @return {boolean}
 */
util.isUrlForFile = function(url) {
    var urlIsAbsoluteForFile = /^file:/.test(url);
    var urlIsRelativeForFile = util.isRunningOnFilesystem() && util.isUrlDocumentRelative(url);
    return urlIsAbsoluteForFile || urlIsRelativeForFile;
};

/**
 * Merges objects
 * @see {@link https://lodash.com/docs#merge}
 */
util.merge = _.merge;

/**
 * Assigns object fields
 * @see {@link https://lodash.com/docs#assign}
 */
util.assign = _.assign;

/**
 * Omit properties from an object
 * @see {@link https://lodash.com/docs#omit}
 */
util.omit = _.omit;

/**
 * Checks if string starts with the given target string.
 * @param {string} string The string to search.
 * @param {string} target The string to search for.
 * @param {number} [position=0] The position to search from.
 * @returns {boolean}
 */
util.startsWith = function(string, target, position){
    position = position || 0;
    return string.substr(position, target.length) === target;
};

/**
 * Checks if string ends with the given target string.
 * @param {string} string The string to search.
 * @param {string} target The string to search for.
 * @param {number} [position=string.length] The position to search up to.
 * @returns {boolean}
 */
util.endsWith = function(string, target, position) {
    if(String.prototype.endsWith){
        return string.endsWith(target, position);
     } else {
        var subjectString = string.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= target.length;
        var lastIndex = subjectString.indexOf(target, position);
        return lastIndex !== -1 && lastIndex === position;
     }
 };

/**
 * Creates a deep clone of value.
 * @see {@link https://lodash.com/docs#cloneDeep}
 */
util.cloneDeep = function () {
    try {
        return _.cloneDeep.apply(_, Array.prototype.slice.call(arguments));
    } catch (e) {
        console.warn(e);
        throw e;
    }
};

/**
 * Checks if value is classified as an Array object.
 * @see {@link https://lodash.com/docs#isArray}
 */
util.isArray = _.isArray;

/**
 * Returns a formatted string using the first argument as a printf-like format.
 * @see {@link https://nodejs.org/api/util.html#util_util_format_format}
 */
util.format = function (f) {

    //This code is adapted from node's util.format, with support for objects removed
    //See https://github.com/joyent/node/blob/master/lib/util.js
    //
    //This code exists because at the time of writing, it is the only function from node util that we need and
    //I'm trying to keep the browserified package size down. PM

    if (f === null) {
        return 'null';
    }

    if (typeof f !== 'string') {
        return f.toString();
    }

    //ignored by jshint, because i wanted to modify this from the original code as little as possible
    /* jshint ignore:start */

    var formatRegExp = /%[sdj%]/g;

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function (x) {
        if (x === '%%') return '%';
        if (i >= len) return x;
        switch (x) {
            case '%s':
                return String(args[i++]);
            case '%d':
                return Number(args[i++]);
            case '%j':
                try {
                    return JSON.stringify(args[i++]);
                } catch (_) {
                    return '[Circular]';
                }
            default:
                return x;
        }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
        str += ' ' + x;
    }
    return str;

    /* jshint ignore:end */
};

/**
 * Given a locale, returns its descendant parts. E.g
 *
 * @param {string} locale
 * @returns {Array}
 */
util.getDescendantLocales = function (locale) {

    //normalize to lowercase
    locale = locale.toLowerCase();

    var descendantLocales = [];
    var parts = locale.split('-');
    var part;
    while (part = parts.shift()) { // jshint ignore:line
        var previousDescendant = descendantLocales[descendantLocales.length - 1];
        descendantLocales.push((previousDescendant ? previousDescendant + '-' : '') + part);
    }

    return descendantLocales;
};

/**
 * Generates a random id
 * @returns {string} The generated id
 */
util.randomId = function () {
    return Math.random().toString(36).substring(7);
};

/**
 * Replaces placeholders in a string using the configVar map.
 * @param   {String} path The path to replace using the config vars
 * @param   {Object} varMap Dictionary object which contains portal data
 * @param   {Object} log Logger instance
 * @returns {String} The updatedp path
 */
util.replacePathVars = function (path, varMap, log) {
    for (var urlVar in varMap) {
        if (varMap.hasOwnProperty(urlVar)) {
            var varRegexp = new RegExp('\\$\\(' + urlVar + '\\)', 'g');

            if (log && log.level() <= bunyan.DEBUG && varRegexp.test(path)) {
                log.debug('Updating resource url. Replacing %s for %s in [%s]', varRegexp, varMap[urlVar], path);
            }

            path = path.replace(varRegexp, varMap[urlVar]);
        }
    }

    return path;
};

/**
 * Given a Response object, returns the JSON or HTML body. Throws an error if the content type was unknown, or
 * undefined and the content type could not be guessed
 * @param response
 * @return {*|Promise|Promise.<TResult>}
 */
util.getContentBodyAndTypeFromResponse = function (response) {

    return response.text().then(function(text) {
        text = text.trim();
        var contentType = response.headers.get('content-type');
        var type = null, err = null;
        
        if(contentType && contentType.indexOf('/json') !== -1) {
            //json
            type = 'json';
        } else if(contentType && contentType.indexOf('text/html') !== -1) {
            //html
            type = 'html';
        } else if(typeof contentType === 'string' && contentType.length > 0) {
            //unknown
            err = new Error('Content type not supported for rendering: ' + contentType);
        } else if (text && util.startsWith(text, '{')) {
            //guess json
            type = 'json';
        } else if (text && util.startsWith(text, '<')) {
            //guess html
            type = 'html';
        } else {
            //couldn't guess
            err = new Error('Undefined content type for response.');
        }
        
        if(err) { 
            throw err;
        }
        
        return {
            type: type,
            body: type === 'json' ? JSON.parse(text) : text
        };
    });
};

/**
 * Determines whether an element passed as the second argument belongs to an item (widget, container).
 * It takes the closest ancestor element that represents an item body (an element with data-widget attribute)
 * and compares a value of the attribute with the value passed as the first argument.
 * @param {string} itemName The name of an item
 * @param {Element} descendantEl An element within item's body
 * @returns {boolean} true if an element belongs to the item and false if it belongs to item's child/descendant item
 */
util.ensureElementBelongsToItem = function (itemName, descendantEl) {
    if (!itemName || !descendantEl) {
        return false;
    }

    var parentEl = descendantEl;
    var parentItemName;

    while (parentEl) {
        parentItemName = typeof parentEl.getAttribute === 'function' ? parentEl.getAttribute('data-widget') : null;

        if (parentItemName) {
            // return false if element belongs to another item
            return parentItemName === itemName;
        }

        parentEl = parentEl.parentNode;
    }

    return false;
};

util.cloneWidgetInstance = function cloneWidgetInstance(widgetInstance) {
    // need to clone the widget because we can't change readonly properties
    var clone = this.cloneDeep(widgetInstance);
    
    // copy own non-enumerable properties
    var descriptorMap = Object.getOwnPropertyNames(widgetInstance).reduce(function(acc, propName) {
        var descriptor = Object.getOwnPropertyDescriptor(widgetInstance, propName);
        if (!descriptor.enumerable) {
            acc[propName] = descriptor;
        }
        return acc;
    }, {});
    Object.defineProperties(clone, descriptorMap);

    return clone;
};

module.exports = util;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"browser-bunyan":2,"lodash/assign":164,"lodash/cloneDeep":165,"lodash/merge":188,"lodash/omit":189}],251:[function(require,module,exports){
// This code is a modification of the VError (https://github.com/davepacheco/node-verror)
// It contains the following simplifications to be optimized for the browser
// * no printf style arguments, instead multiple arguments after the wrapped error are joined into one string

/* jshint ignore:start */
/*
 * VError([cause], fmt[, arg...]): Like JavaScript's built-in Error class, but
 * supports a "cause" argument (another error) and a printf-style message.  The
 * cause argument can be null or omitted entirely.
 *
 * Examples:
 *
 * CODE                                    MESSAGE
 * new VError('something bad happened')    "something bad happened"
 * new VError('missing file: "%s"', file)  "missing file: "/etc/passwd"
 *   with file = '/etc/passwd'
 * new VError(err, 'open failed')          "open failed: file not found"
 *   with err.message = 'file not found'
 */
function VError(options)
{
    var args, obj, causedBy, ctor, tailmsg;

    /*
     * This is a regrettable pattern, but JavaScript's built-in Error class
     * is defined to work this way, so we allow the constructor to be called
     * without "new".
     */
    if (!(this instanceof VError)) {
        args = Array.prototype.slice.call(arguments, 0);
        obj = Object.create(VError.prototype);
        VError.apply(obj, arguments);
        return (obj);
    }

    if (options instanceof Error || typeof (options) === 'object') {
        args = Array.prototype.slice.call(arguments, 1);
    } else {
        args = Array.prototype.slice.call(arguments, 0);
        options = undefined;
    }

    /*
     * extsprintf (which we invoke here with our caller's arguments in order
     * to construct this Error's message) is strict in its interpretation of
     * values to be processed by the "%s" specifier.  The value passed to
     * extsprintf must actually be a string or something convertible to a
     * String using .toString().  Passing other values (notably "null" and
     * "undefined") is considered a programmer error.  The assumption is
     * that if you actually want to print the string "null" or "undefined",
     * then that's easy to do that when you're calling extsprintf; on the
     * other hand, if you did NOT want that (i.e., there's actually a bug
     * where the program assumes some variable is non-null and tries to
     * print it, which might happen when constructing a packet or file in
     * some specific format), then it's better to stop immediately than
     * produce bogus output.
     *
     * However, sometimes the bug is only in the code calling VError, and a
     * programmer might prefer to have the error message contain "null" or
     * "undefined" rather than have the bug in the error path crash the
     * program (making the first bug harder to identify).  For that reason,
     * by default VError converts "null" or "undefined" arguments to their
     * string representations and passes those to extsprintf.  Programmers
     * desiring the strict behavior can use the SError class or pass the
     * "strict" option to the VError constructor.
     */
    if (!options || !options.strict) {
        args = args.map(function (a) {
            return (a === null ? 'null' :
                    a === undefined ? 'undefined' : a);
        });
    }

    tailmsg = args.length > 0 ?
        args.join('; ') : '';
    this.jse_shortmsg = tailmsg;
    this.jse_summary = tailmsg;

    if (options) {
        causedBy = options.cause;

        if (!causedBy || !(options.cause instanceof Error))
            causedBy = options;

        if (causedBy && (causedBy instanceof Error)) {
            this.jse_cause = causedBy;
            this.jse_summary += ': ' + causedBy.message;
        }
    }

    this.message = this.jse_summary;
    Error.call(this, this.jse_summary);

    if (Error.captureStackTrace) {
        ctor = options ? options.constructorOpt : undefined;
        ctor = ctor || arguments.callee;
        Error.captureStackTrace(this, ctor);
    }

    return (this);
}

VError.prototype = Error.prototype;
VError.prototype.name = 'Widget Error';

VError.prototype.toString = function ve_toString()
{
    var str = (this.hasOwnProperty('name') && this.name ||
        this.constructor.name || this.constructor.prototype.name);
    if (this.message)
        str += ': ' + this.message;

    return (str);
};

VError.prototype.cause = function ve_cause()
{
    return (this.jse_cause);
};

/**
 * Checks whether an error or one of its possible causes has a code provided.
 * @method
 * @param {Array|String} code(s) to look for.
 * @returns {Boolean} True if one of codes provided has been found, false otherwise.
 */
VError.prototype.hasCode = function ve_hasCode(code) {
    if (!code) return false;

    var codes = Object.prototype.toString.call(code) !== '[object Array]'
        ? [code] : code;

    if (codes.length === 0) return false;

    var error = this;
    var found = false;

    while(error) {
        if (error.code && codes.indexOf(error.code) > -1) {
             found = true;
            break;
        }

        error = error.cause();
    }

    return found;
};

module.exports = VError;

/* jshint ignore:end */


},{}],252:[function(require,module,exports){
arguments[4][2][0].apply(exports,arguments)
},{"dup":2}],253:[function(require,module,exports){
arguments[4][3][0].apply(exports,arguments)
},{"dup":3,"handlebars/dist/handlebars.min":254}],254:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],255:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],256:[function(require,module,exports){
arguments[4][44][0].apply(exports,arguments)
},{"./_getNative":314,"./_root":351,"dup":44}],257:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"./_hashClear":321,"./_hashDelete":322,"./_hashGet":323,"./_hashHas":324,"./_hashSet":325,"dup":45}],258:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"./_listCacheClear":334,"./_listCacheDelete":335,"./_listCacheGet":336,"./_listCacheHas":337,"./_listCacheSet":338,"dup":46}],259:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"./_getNative":314,"./_root":351,"dup":47}],260:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"./_mapCacheClear":339,"./_mapCacheDelete":340,"./_mapCacheGet":341,"./_mapCacheHas":342,"./_mapCacheSet":343,"dup":48}],261:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"./_getNative":314,"./_root":351,"dup":49}],262:[function(require,module,exports){
arguments[4][50][0].apply(exports,arguments)
},{"./_getNative":314,"./_root":351,"dup":50}],263:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"./_ListCache":258,"./_stackClear":355,"./_stackDelete":356,"./_stackGet":357,"./_stackHas":358,"./_stackSet":359,"dup":51}],264:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"./_root":351,"dup":52}],265:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"./_root":351,"dup":53}],266:[function(require,module,exports){
arguments[4][54][0].apply(exports,arguments)
},{"./_getNative":314,"./_root":351,"dup":54}],267:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"dup":55}],268:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],269:[function(require,module,exports){
arguments[4][57][0].apply(exports,arguments)
},{"dup":57}],270:[function(require,module,exports){
arguments[4][58][0].apply(exports,arguments)
},{"./_baseTimes":294,"./_isIndex":329,"./isArguments":365,"./isArray":366,"./isBuffer":369,"./isTypedArray":377,"dup":58}],271:[function(require,module,exports){
arguments[4][60][0].apply(exports,arguments)
},{"dup":60}],272:[function(require,module,exports){
arguments[4][61][0].apply(exports,arguments)
},{"./_baseAssignValue":277,"./eq":363,"dup":61}],273:[function(require,module,exports){
arguments[4][62][0].apply(exports,arguments)
},{"./_baseAssignValue":277,"./eq":363,"dup":62}],274:[function(require,module,exports){
arguments[4][63][0].apply(exports,arguments)
},{"./eq":363,"dup":63}],275:[function(require,module,exports){
arguments[4][64][0].apply(exports,arguments)
},{"./_copyObject":303,"./keys":378,"dup":64}],276:[function(require,module,exports){
arguments[4][65][0].apply(exports,arguments)
},{"./_copyObject":303,"./keysIn":379,"dup":65}],277:[function(require,module,exports){
arguments[4][66][0].apply(exports,arguments)
},{"./_defineProperty":309,"dup":66}],278:[function(require,module,exports){
arguments[4][67][0].apply(exports,arguments)
},{"./_Stack":263,"./_arrayEach":268,"./_assignValue":273,"./_baseAssign":275,"./_baseAssignIn":276,"./_cloneBuffer":297,"./_copyArray":302,"./_copySymbols":304,"./_copySymbolsIn":305,"./_getAllKeys":311,"./_getAllKeysIn":312,"./_getTag":319,"./_initCloneArray":326,"./_initCloneByTag":327,"./_initCloneObject":328,"./isArray":366,"./isBuffer":369,"./isMap":372,"./isObject":373,"./isSet":376,"./keys":378,"dup":67}],279:[function(require,module,exports){
arguments[4][68][0].apply(exports,arguments)
},{"./isObject":373,"dup":68}],280:[function(require,module,exports){
arguments[4][70][0].apply(exports,arguments)
},{"./_createBaseFor":308,"dup":70}],281:[function(require,module,exports){
arguments[4][72][0].apply(exports,arguments)
},{"./_arrayPush":271,"./isArray":366,"dup":72}],282:[function(require,module,exports){
arguments[4][73][0].apply(exports,arguments)
},{"./_Symbol":264,"./_getRawTag":316,"./_objectToString":348,"dup":73}],283:[function(require,module,exports){
arguments[4][74][0].apply(exports,arguments)
},{"./_baseGetTag":282,"./isObjectLike":374,"dup":74}],284:[function(require,module,exports){
arguments[4][75][0].apply(exports,arguments)
},{"./_getTag":319,"./isObjectLike":374,"dup":75}],285:[function(require,module,exports){
arguments[4][76][0].apply(exports,arguments)
},{"./_isMasked":332,"./_toSource":360,"./isFunction":370,"./isObject":373,"dup":76}],286:[function(require,module,exports){
arguments[4][77][0].apply(exports,arguments)
},{"./_getTag":319,"./isObjectLike":374,"dup":77}],287:[function(require,module,exports){
arguments[4][78][0].apply(exports,arguments)
},{"./_baseGetTag":282,"./isLength":371,"./isObjectLike":374,"dup":78}],288:[function(require,module,exports){
arguments[4][79][0].apply(exports,arguments)
},{"./_isPrototype":333,"./_nativeKeys":345,"dup":79}],289:[function(require,module,exports){
arguments[4][80][0].apply(exports,arguments)
},{"./_isPrototype":333,"./_nativeKeysIn":346,"./isObject":373,"dup":80}],290:[function(require,module,exports){
arguments[4][81][0].apply(exports,arguments)
},{"./_Stack":263,"./_assignMergeValue":272,"./_baseFor":280,"./_baseMergeDeep":291,"./_safeGet":352,"./isObject":373,"./keysIn":379,"dup":81}],291:[function(require,module,exports){
arguments[4][82][0].apply(exports,arguments)
},{"./_assignMergeValue":272,"./_cloneBuffer":297,"./_cloneTypedArray":301,"./_copyArray":302,"./_initCloneObject":328,"./_safeGet":352,"./isArguments":365,"./isArray":366,"./isArrayLikeObject":368,"./isBuffer":369,"./isFunction":370,"./isObject":373,"./isPlainObject":375,"./isTypedArray":377,"./toPlainObject":383,"dup":82}],292:[function(require,module,exports){
arguments[4][83][0].apply(exports,arguments)
},{"./_overRest":350,"./_setToString":353,"./identity":364,"dup":83}],293:[function(require,module,exports){
arguments[4][84][0].apply(exports,arguments)
},{"./_defineProperty":309,"./constant":362,"./identity":364,"dup":84}],294:[function(require,module,exports){
arguments[4][86][0].apply(exports,arguments)
},{"dup":86}],295:[function(require,module,exports){
arguments[4][88][0].apply(exports,arguments)
},{"dup":88}],296:[function(require,module,exports){
arguments[4][91][0].apply(exports,arguments)
},{"./_Uint8Array":265,"dup":91}],297:[function(require,module,exports){
arguments[4][92][0].apply(exports,arguments)
},{"./_root":351,"dup":92}],298:[function(require,module,exports){
arguments[4][93][0].apply(exports,arguments)
},{"./_cloneArrayBuffer":296,"dup":93}],299:[function(require,module,exports){
arguments[4][94][0].apply(exports,arguments)
},{"dup":94}],300:[function(require,module,exports){
arguments[4][95][0].apply(exports,arguments)
},{"./_Symbol":264,"dup":95}],301:[function(require,module,exports){
arguments[4][96][0].apply(exports,arguments)
},{"./_cloneArrayBuffer":296,"dup":96}],302:[function(require,module,exports){
arguments[4][97][0].apply(exports,arguments)
},{"dup":97}],303:[function(require,module,exports){
arguments[4][98][0].apply(exports,arguments)
},{"./_assignValue":273,"./_baseAssignValue":277,"dup":98}],304:[function(require,module,exports){
arguments[4][99][0].apply(exports,arguments)
},{"./_copyObject":303,"./_getSymbols":317,"dup":99}],305:[function(require,module,exports){
arguments[4][100][0].apply(exports,arguments)
},{"./_copyObject":303,"./_getSymbolsIn":318,"dup":100}],306:[function(require,module,exports){
arguments[4][101][0].apply(exports,arguments)
},{"./_root":351,"dup":101}],307:[function(require,module,exports){
arguments[4][102][0].apply(exports,arguments)
},{"./_baseRest":292,"./_isIterateeCall":330,"dup":102}],308:[function(require,module,exports){
arguments[4][103][0].apply(exports,arguments)
},{"dup":103}],309:[function(require,module,exports){
arguments[4][105][0].apply(exports,arguments)
},{"./_getNative":314,"dup":105}],310:[function(require,module,exports){
arguments[4][107][0].apply(exports,arguments)
},{"dup":107}],311:[function(require,module,exports){
arguments[4][108][0].apply(exports,arguments)
},{"./_baseGetAllKeys":281,"./_getSymbols":317,"./keys":378,"dup":108}],312:[function(require,module,exports){
arguments[4][109][0].apply(exports,arguments)
},{"./_baseGetAllKeys":281,"./_getSymbolsIn":318,"./keysIn":379,"dup":109}],313:[function(require,module,exports){
arguments[4][110][0].apply(exports,arguments)
},{"./_isKeyable":331,"dup":110}],314:[function(require,module,exports){
arguments[4][111][0].apply(exports,arguments)
},{"./_baseIsNative":285,"./_getValue":320,"dup":111}],315:[function(require,module,exports){
arguments[4][112][0].apply(exports,arguments)
},{"./_overArg":349,"dup":112}],316:[function(require,module,exports){
arguments[4][113][0].apply(exports,arguments)
},{"./_Symbol":264,"dup":113}],317:[function(require,module,exports){
arguments[4][114][0].apply(exports,arguments)
},{"./_arrayFilter":269,"./stubArray":381,"dup":114}],318:[function(require,module,exports){
arguments[4][115][0].apply(exports,arguments)
},{"./_arrayPush":271,"./_getPrototype":315,"./_getSymbols":317,"./stubArray":381,"dup":115}],319:[function(require,module,exports){
arguments[4][116][0].apply(exports,arguments)
},{"./_DataView":256,"./_Map":259,"./_Promise":261,"./_Set":262,"./_WeakMap":266,"./_baseGetTag":282,"./_toSource":360,"dup":116}],320:[function(require,module,exports){
arguments[4][117][0].apply(exports,arguments)
},{"dup":117}],321:[function(require,module,exports){
arguments[4][118][0].apply(exports,arguments)
},{"./_nativeCreate":344,"dup":118}],322:[function(require,module,exports){
arguments[4][119][0].apply(exports,arguments)
},{"dup":119}],323:[function(require,module,exports){
arguments[4][120][0].apply(exports,arguments)
},{"./_nativeCreate":344,"dup":120}],324:[function(require,module,exports){
arguments[4][121][0].apply(exports,arguments)
},{"./_nativeCreate":344,"dup":121}],325:[function(require,module,exports){
arguments[4][122][0].apply(exports,arguments)
},{"./_nativeCreate":344,"dup":122}],326:[function(require,module,exports){
arguments[4][123][0].apply(exports,arguments)
},{"dup":123}],327:[function(require,module,exports){
arguments[4][124][0].apply(exports,arguments)
},{"./_cloneArrayBuffer":296,"./_cloneDataView":298,"./_cloneRegExp":299,"./_cloneSymbol":300,"./_cloneTypedArray":301,"dup":124}],328:[function(require,module,exports){
arguments[4][125][0].apply(exports,arguments)
},{"./_baseCreate":279,"./_getPrototype":315,"./_isPrototype":333,"dup":125}],329:[function(require,module,exports){
arguments[4][127][0].apply(exports,arguments)
},{"dup":127}],330:[function(require,module,exports){
arguments[4][128][0].apply(exports,arguments)
},{"./_isIndex":329,"./eq":363,"./isArrayLike":367,"./isObject":373,"dup":128}],331:[function(require,module,exports){
arguments[4][130][0].apply(exports,arguments)
},{"dup":130}],332:[function(require,module,exports){
arguments[4][131][0].apply(exports,arguments)
},{"./_coreJsData":306,"dup":131}],333:[function(require,module,exports){
arguments[4][132][0].apply(exports,arguments)
},{"dup":132}],334:[function(require,module,exports){
arguments[4][133][0].apply(exports,arguments)
},{"dup":133}],335:[function(require,module,exports){
arguments[4][134][0].apply(exports,arguments)
},{"./_assocIndexOf":274,"dup":134}],336:[function(require,module,exports){
arguments[4][135][0].apply(exports,arguments)
},{"./_assocIndexOf":274,"dup":135}],337:[function(require,module,exports){
arguments[4][136][0].apply(exports,arguments)
},{"./_assocIndexOf":274,"dup":136}],338:[function(require,module,exports){
arguments[4][137][0].apply(exports,arguments)
},{"./_assocIndexOf":274,"dup":137}],339:[function(require,module,exports){
arguments[4][138][0].apply(exports,arguments)
},{"./_Hash":257,"./_ListCache":258,"./_Map":259,"dup":138}],340:[function(require,module,exports){
arguments[4][139][0].apply(exports,arguments)
},{"./_getMapData":313,"dup":139}],341:[function(require,module,exports){
arguments[4][140][0].apply(exports,arguments)
},{"./_getMapData":313,"dup":140}],342:[function(require,module,exports){
arguments[4][141][0].apply(exports,arguments)
},{"./_getMapData":313,"dup":141}],343:[function(require,module,exports){
arguments[4][142][0].apply(exports,arguments)
},{"./_getMapData":313,"dup":142}],344:[function(require,module,exports){
arguments[4][144][0].apply(exports,arguments)
},{"./_getNative":314,"dup":144}],345:[function(require,module,exports){
arguments[4][145][0].apply(exports,arguments)
},{"./_overArg":349,"dup":145}],346:[function(require,module,exports){
arguments[4][146][0].apply(exports,arguments)
},{"dup":146}],347:[function(require,module,exports){
arguments[4][147][0].apply(exports,arguments)
},{"./_freeGlobal":310,"dup":147}],348:[function(require,module,exports){
arguments[4][148][0].apply(exports,arguments)
},{"dup":148}],349:[function(require,module,exports){
arguments[4][149][0].apply(exports,arguments)
},{"dup":149}],350:[function(require,module,exports){
arguments[4][150][0].apply(exports,arguments)
},{"./_apply":267,"dup":150}],351:[function(require,module,exports){
arguments[4][152][0].apply(exports,arguments)
},{"./_freeGlobal":310,"dup":152}],352:[function(require,module,exports){
arguments[4][153][0].apply(exports,arguments)
},{"dup":153}],353:[function(require,module,exports){
arguments[4][154][0].apply(exports,arguments)
},{"./_baseSetToString":293,"./_shortOut":354,"dup":154}],354:[function(require,module,exports){
arguments[4][155][0].apply(exports,arguments)
},{"dup":155}],355:[function(require,module,exports){
arguments[4][156][0].apply(exports,arguments)
},{"./_ListCache":258,"dup":156}],356:[function(require,module,exports){
arguments[4][157][0].apply(exports,arguments)
},{"dup":157}],357:[function(require,module,exports){
arguments[4][158][0].apply(exports,arguments)
},{"dup":158}],358:[function(require,module,exports){
arguments[4][159][0].apply(exports,arguments)
},{"dup":159}],359:[function(require,module,exports){
arguments[4][160][0].apply(exports,arguments)
},{"./_ListCache":258,"./_Map":259,"./_MapCache":260,"dup":160}],360:[function(require,module,exports){
arguments[4][163][0].apply(exports,arguments)
},{"dup":163}],361:[function(require,module,exports){
arguments[4][165][0].apply(exports,arguments)
},{"./_baseClone":278,"dup":165}],362:[function(require,module,exports){
arguments[4][166][0].apply(exports,arguments)
},{"dup":166}],363:[function(require,module,exports){
arguments[4][167][0].apply(exports,arguments)
},{"dup":167}],364:[function(require,module,exports){
arguments[4][169][0].apply(exports,arguments)
},{"dup":169}],365:[function(require,module,exports){
arguments[4][170][0].apply(exports,arguments)
},{"./_baseIsArguments":283,"./isObjectLike":374,"dup":170}],366:[function(require,module,exports){
arguments[4][171][0].apply(exports,arguments)
},{"dup":171}],367:[function(require,module,exports){
arguments[4][172][0].apply(exports,arguments)
},{"./isFunction":370,"./isLength":371,"dup":172}],368:[function(require,module,exports){
arguments[4][173][0].apply(exports,arguments)
},{"./isArrayLike":367,"./isObjectLike":374,"dup":173}],369:[function(require,module,exports){
arguments[4][174][0].apply(exports,arguments)
},{"./_root":351,"./stubFalse":382,"dup":174}],370:[function(require,module,exports){
arguments[4][175][0].apply(exports,arguments)
},{"./_baseGetTag":282,"./isObject":373,"dup":175}],371:[function(require,module,exports){
arguments[4][176][0].apply(exports,arguments)
},{"dup":176}],372:[function(require,module,exports){
arguments[4][177][0].apply(exports,arguments)
},{"./_baseIsMap":284,"./_baseUnary":295,"./_nodeUtil":347,"dup":177}],373:[function(require,module,exports){
arguments[4][178][0].apply(exports,arguments)
},{"dup":178}],374:[function(require,module,exports){
arguments[4][179][0].apply(exports,arguments)
},{"dup":179}],375:[function(require,module,exports){
arguments[4][180][0].apply(exports,arguments)
},{"./_baseGetTag":282,"./_getPrototype":315,"./isObjectLike":374,"dup":180}],376:[function(require,module,exports){
arguments[4][181][0].apply(exports,arguments)
},{"./_baseIsSet":286,"./_baseUnary":295,"./_nodeUtil":347,"dup":181}],377:[function(require,module,exports){
arguments[4][183][0].apply(exports,arguments)
},{"./_baseIsTypedArray":287,"./_baseUnary":295,"./_nodeUtil":347,"dup":183}],378:[function(require,module,exports){
arguments[4][184][0].apply(exports,arguments)
},{"./_arrayLikeKeys":270,"./_baseKeys":288,"./isArrayLike":367,"dup":184}],379:[function(require,module,exports){
arguments[4][185][0].apply(exports,arguments)
},{"./_arrayLikeKeys":270,"./_baseKeysIn":289,"./isArrayLike":367,"dup":185}],380:[function(require,module,exports){
arguments[4][188][0].apply(exports,arguments)
},{"./_baseMerge":290,"./_createAssigner":307,"dup":188}],381:[function(require,module,exports){
arguments[4][190][0].apply(exports,arguments)
},{"dup":190}],382:[function(require,module,exports){
arguments[4][191][0].apply(exports,arguments)
},{"dup":191}],383:[function(require,module,exports){
arguments[4][192][0].apply(exports,arguments)
},{"./_copyObject":303,"./keysIn":379,"dup":192}],384:[function(require,module,exports){
arguments[4][194][0].apply(exports,arguments)
},{"dup":194}],385:[function(require,module,exports){
/**
 * A central CXP configuration object to be used across multiple web APIs
 * @exports a new CxpConfiguration instance
 * @module configuration/index
 */

'use strict';

var cxpUtil = require('./cxp-util');
var bunyan = require('browser-bunyan');

/**
 * Constructs a new CXP Configuration object
 * @param {Object} [opts] A set of configuration options
 * @param {Object} [opts.log] Provide a completely new logger. This should be a 'browser-bunyan' logger.
 *                            Internally, a new child logger will be created, using the supplied logger as a parent
 * @param {Array} [opts.logStreams] Provide custom log streams to use with the internally generated logger.
 *                                  This will be ignored if your provide your own logger
 * @param {string} [opts.logLevel] Set the logging level. This will be ignored if you provide your own logger.
 * @constructor
 */
var CxpConfiguration = function(opts) {

    opts = opts || {};

    var loggerName = 'cxp-web';
    this.log = opts.log ? opts.log.child({ childName: loggerName}) : bunyan.createLogger({
        name: loggerName || 'logger',
        streams: Array.isArray(opts.logStreams) ? opts.logStreams : [
            {
                level: opts.logLevel || 'info',
                stream: new bunyan.ConsoleFormattedStream(),
                type: 'raw'
            }
        ]
    });

    this.settings = {};
};

/**
 * @deprecated
 */
CxpConfiguration.prototype.util = cxpUtil;

/**
 * Clones configuration object
 * @returns {CxpConfiguration} new CxpConfiguration object
 */
CxpConfiguration.prototype.clone = function() {
    var settings = this.settings;
    var newConfig = new CxpConfiguration({
        logLevel: settings.logLevel
    });

    newConfig.settings = Object.keys(settings).reduce(function(obj, propName) {
        obj[propName] = settings[propName];
        return obj;
    }, {});

    return newConfig;
};

/**
 * Sets a value
 * @param {string} name
 * @param {*} value
 */
CxpConfiguration.prototype.set = function(name, value) {
    this.settings[name] = value;
};

/**
 * Gets a value
 * @param {string} name
 * @returns {*}
 */
CxpConfiguration.prototype.get = function(name) {
    var setting = this.settings[name];

    return typeof setting === 'function' ? setting() : setting;
};

/**
 * Enables a boolean value
 * @param {string} name
 * @deprecated
 */
CxpConfiguration.prototype.enable = function(name) {
    this.log.warn('CxpConfiguration.enable is deprecated, please use CxpConfiguration.set(' + name + ', true)');
    this.settings[name] = true;
};

/**
 * Disables a boolean value
 * @param {string} name
 * @deprecated
 */
CxpConfiguration.prototype.disable = function(name) {
    this.log.warn('CxpConfiguration.disable is deprecated, please use CxpConfiguration.set(' + name + ', false)');
    this.settings[name] = false;
};

/**
 * Checks if a boolean value is true
 * @param {string} name
 * @deprecated
 * @returns {boolean}
 */
CxpConfiguration.prototype.enabled = function(name) {
    this.log.warn('CxpConfiguration.enabled is deprecated, please use CxpConfiguration.get(' + name + ')');
    return !!this.settings[name];
};

/**
 * Checks if a boolean value is false
 * @param {string} name
 * @deprecated
 * @returns {boolean}
 */
CxpConfiguration.prototype.disabled = function(name) {
    this.log.warn('CxpConfiguration.disabled is deprecated, please use CxpConfiguration.get(' + name + ')');
    return !this.settings[name];
};

/**
 * Gets a logger stored internally
 * @returns {CxpConfiguration.log}
 */
CxpConfiguration.prototype.getLogger = function() {
    return this.log;
};

/**
 * Gets the settings as a plain object. Dynamic items such as functions will be omitted
 * @returns {Object}
 */
CxpConfiguration.prototype.toSerializableObject = function() {

    var stringifyBlacklist = ['logStreams', 'storageFactory'];

    return JSON.parse(JSON.stringify(this.settings, function(key, value) {
        return stringifyBlacklist.indexOf(key) > -1 ? undefined: value;
    }));
};

function createConfiguration (cxpOptions) {
    return new CxpConfiguration(cxpOptions);
}

module.exports = {
    Configuration: CxpConfiguration,
    createInstance: createConfiguration
};

},{"./cxp-util":386,"browser-bunyan":252}],386:[function(require,module,exports){
/**
 * @deprecated Avoid using these module.
 */

'use strict';

module.exports = {

    /**
     * @deprecated Use item.preference.name instead
     */
    getPreference: function(item, name) {
        return item.preferences[name] || null;
    },

    /**
     * @deprecated Use item.preference.name.value instead
     */
    getPreferenceValue: function(item, name) {
        var pref = this.getPreference(item, name);
        return pref ? pref.value : null;
    }
};


},{}],387:[function(require,module,exports){
/**
 * Implements "breadcrumb" datasource resolver
 * @see {@link https://backbase.atlassian.net/wiki/display/PrM/Navigation+Datasources#NavigationDatasources-BreadcrumbURI
 *
 * @module datasource/contentrendered-datasource-resolver
 * @exports {BreadcrumbDatasourceResolver}
 */
'use strict';

var DatasourceResolver  = require('backbase-widget-engine/src/datasource/datasource-resolver');
var resolverHelpers     = require('backbase-widget-engine/src/datasource/datasource-resolver-helpers');

module.exports = BreadcrumbDatasourceResolver;

/**
 * Breadcrumb datasource resolver
 * @param {Object} datasource
 * @constructor
 */
function BreadcrumbDatasourceResolver(datasource) {
    this._datasource = datasource;
}

/**
 * Builds an endpoint URL of breadcrumb datasource
 * @param {Object} context An object expressions in datasource URI are resolved against
 * @returns {string} A URL of an endpoint where data can be requested from
 */
BreadcrumbDatasourceResolver.prototype.resolveUrl = function (context) {
    var url = this._datasource.uri;
    var urlComponents = url.split(':');

    if (urlComponents.length !== 2) {
        throw new Error('Invalid breadcrumb datasource uri: ', url);
    }

    var params = [].concat(this._datasource.params || []);
    var linkId = resolverHelpers.trimSlashes(urlComponents[1]);
    if (linkId) {
        params.push({
            name: 'uuid',
            value: linkId
        });
    }

    var apiRoot = context.apiRoot || '';
    var endpointUrl = apiRoot + '/portal/navigation/breadcrumb';

    var queryString = resolverHelpers.resolveQueryString(context, params);
    if (queryString) {
        endpointUrl += '?' + queryString;
    }

    return endpointUrl;
};

/**
 * Parses JSON returned from datasource and returns it
 * @param {Response} response Fetch API response object
 * @returns {Promise.<Object>} promise resolved with an object literal containing JSON data
 */
BreadcrumbDatasourceResolver.prototype.processResponse = function processResponse(response) {
    return response.json();
};

/**
 * Checks whether a datasource is of breadcrumb type and creates a resolver instance
 * if check passes. Use this method as a resolver creating function registered with
 * datasource resolver factory.
 * @param {Object} datasource A datasource to check
 * @returns {DatasourceResolver|undefined}
 */
BreadcrumbDatasourceResolver.getInstance =
    DatasourceResolver.createFactoryFunction('breadcrumb', BreadcrumbDatasourceResolver);

},{"backbase-widget-engine/src/datasource/datasource-resolver":206,"backbase-widget-engine/src/datasource/datasource-resolver-helpers":205}],388:[function(require,module,exports){
/**
 * Implements "contentrendered" datasource resolver
 * @see {@link https://backbase.atlassian.net/wiki/display/PrM/Datasources+URI+spec#DatasourcesURIspec-ContentrenderedURI(legacy-deprecated)}
 * Maps contentrendered:/[uuid]?template=[templatePath] datasource URI to
 * /cxp/portal/contenttemplates/rendered?templateUrl=[templatePath]&contextItemName=[contextItemName]&uuid=[uuid]
 * REST endpoint URI.
 *
 * @module datasource/contentrendered-datasource-resolver
 * @exports {ContentrenderedDatasourceResolver}
 */

'use strict';

var DatasourceResolver  = require('backbase-widget-engine/src/datasource/datasource-resolver');
var resolverHelpers     = require('backbase-widget-engine/src/datasource/datasource-resolver-helpers');
var util                = require('backbase-widget-engine/src/util/util');

/**
 * Optional datasource parameter that can be used to instruct the resolver to skip on setting asset URLs in content
 * to point to remote server (mobile use case only)
 * @type {string}
 */
var ASSET_PARAM = 'assets';

module.exports = ContentrenderedDatasourceResolver;

/**
 * Contentrendered datasource resolver
 *
 * @param {Object} datasource
 * @constructor
 */
function ContentrenderedDatasourceResolver(datasource) {
    this._datasource = datasource;
}

/**
 * Builds an endpoint URL of contentrendered datasource
 *
 * @param {Object} context An object expressions in datasource URI are resolved against
 * @returns {string} A URL of an endpoint where data can be requested from
 */
ContentrenderedDatasourceResolver.prototype.resolveUrl = function (context) {
    var url = this._datasource.uri;
    var urlComponents = url.split(':');

    if (urlComponents.length !== 2) {
        throw new Error('Invalid contentrendered datasource uri: ', url);
    }

    var params = (this._datasource.params || []).map(function (param) {
        var resolvedParam = resolverHelpers.resolveParameter(context, param);
        if (resolvedParam.name === 'template') {
            resolvedParam.name = 'templateUrl';
        }

        return resolvedParam;
    }).filter(function (param) {
        return param.name && param.name !== ASSET_PARAM;
    });

    var contentId = resolverHelpers.resolveExpression(context, resolverHelpers.trimSlashes(urlComponents[1]));
    if (contentId) {
        params.push({
            name: 'uuid',
            value: contentId
        });
    }

    var contextItemName = context.contextItemName;
    if(contextItemName) {
        params.push({
            name: 'contextItemName',
            value: contextItemName
        });
    }

    var apiRoot = context.apiRoot || '';
    var endpointUrl = apiRoot + '/portal/contenttemplates/rendered';

    var encodedParams = resolverHelpers.buildQueryString(params);
    if (encodedParams) {
        endpointUrl += '?' + encodedParams;
    }

    return endpointUrl;
};

/**
 * If necessary handles HTML response by converting asset (images, anchors, etc) relative URLs to absolute ones
 * in mobile environment.
 *
 * @param {Response} response Fetch API response object
 * @param {Object} context An object that holds configuration options
 * @returns {Promise.<Object>} promise resolved with HTML string
 */
ContentrenderedDatasourceResolver.prototype.processResponse = function processResponse(response, context) {
    var self = this;

    return response.text().then(function (html) {
        if(util.isRunningOnFilesystem()) {
            var contextRoot = context.contextRoot || '';
            var remoteContextRoot = context.remoteContextRoot || '';
            var assetsParam = self._datasource.params.filter(function (param) {
                    return param.name === ASSET_PARAM;
                })[0] || {};
            var localAssets = assetsParam.value === 'local';
            var baseUrl = (localAssets || !remoteContextRoot) ? contextRoot : remoteContextRoot;

            return util.isUrlAbsolute(baseUrl) ? self._makeReferenceAbsolute(html, baseUrl) : html;
        } else {
            return html;
        }
    });
};

/**
 * Makes relative URLs absolute for elements that can refer to remote content (with "src" or "href" attributes)
 *
 * @param {string} html HTML string to process
 * @param {string} baseUrl Base URL to be used in relative URL resolution
 * @returns {string} HTML with absolute URLs
 * @private
 */
ContentrenderedDatasourceResolver.prototype._makeReferenceAbsolute = function (html, baseUrl) {
    if(typeof DOMParser !== 'undefined') {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        this._getElementObjectsByAttr(doc.body, 'href')
            .concat(this._getElementObjectsByAttr(doc.body, 'src'))
            .filter(function (item) {
                return item.value && util.isUrlSiteRelative(item.value);
            }).forEach(function (item) {
                var absHref = new URL(item.value, baseUrl).href;
                item.element.setAttribute(item.attr, absHref);
            });

        return doc.body.innerHTML;
    } else {
        return html;
    }
};

/**
 * Finds all elements that have the specified attribute under the provided node
 *
 * @param {Node} node A node under which a search is conducted
 * @param {string} attr An attribute name
 * @returns {Object} An object that holds the element and a value of the attribute
 * @private
 */
ContentrenderedDatasourceResolver.prototype._getElementObjectsByAttr = function (node, attr) {
    return Array.prototype.map.call(node.querySelectorAll('[' + attr + ']'), function (el) {
        return {
            attr: attr,
            value: el.getAttribute(attr),
            element: el
        };
    });
};

/**
 * Checks whether a datasource is of contentrendered type and creates a resolver instance
 * if check passes. Use this method as a resolver creating function registered with
 * datasource resolver factory.
 *
 * @param {Object} datasource A datasource to check
 * @returns {DatasourceResolver|undefined}
 */
ContentrenderedDatasourceResolver.getInstance =
    DatasourceResolver.createFactoryFunction('contentrendered', ContentrenderedDatasourceResolver);

},{"backbase-widget-engine/src/datasource/datasource-resolver":206,"backbase-widget-engine/src/datasource/datasource-resolver-helpers":205,"backbase-widget-engine/src/util/util":250}],389:[function(require,module,exports){
/**
 * Implements "link" datasource resolver
 * @see {@link https://backbase.atlassian.net/wiki/display/PrM/Datasources+URI+spec#DatasourcesURIspec-LinkURI}
 * @module datasource/link-datasource-resolver
 * @exports {LinkDatasourceResolver}
 */

'use strict';

var DatasourceResolver  = require('backbase-widget-engine/src/datasource/datasource-resolver');
var xmlModelParser      = require('../model/parsers/xml/model-parser');
var resolverHelpers     = require('backbase-widget-engine/src/datasource/datasource-resolver-helpers');

module.exports = LinkDatasourceResolver;

/**
 * Link datasource resolver
 * @param {Object} datasource
 * @constructor
 */
function LinkDatasourceResolver(datasource) {
    this._datasource = datasource;
}

/**
 * Builds an endpoint URL of link datasource
 * @param {Object} context An object expressions in datasource URI are resolved against
 * @returns {string} A URL of an endpoint where data can be requested from
 */
LinkDatasourceResolver.prototype.resolveUrl = function (context) {
    var url = this._datasource.uri;
    var urlComponents = url.split(':');

    if (urlComponents.length !== 2) {
        throw new Error('Invalid link datasource uri: ', url);
    }

    // create new array of parameters
    var params = [].concat(this._datasource.params || []);
    var linkId = resolverHelpers.trimSlashes(urlComponents[1]);
    if (linkId) {
        params.push({
            name: 'f',
            value: 'uuid(eq)' + linkId
        });
    }

    var depthParamExists = params.some(function (param) {
        return param.name === 'depth';
    });

    // depth parameter is required for links endpoint,
    // so add it if it's not specified in original url
    if (!depthParamExists) {
        params.push({
            name: 'depth',
            value: 1
        });
    }

    var apiRoot = context.apiRoot || '';
    var portalName = context.portalName;
    var endpointUrl = apiRoot + '/portal/portals/' + portalName + '/links.xml';

    var queryString = resolverHelpers.resolveQueryString(context, params);
    if (queryString) {
        endpointUrl += '?' + queryString;
    }

    return endpointUrl;
};

/**
 * Parses XML returned from datasource and returns the first link (if any)
 * @param {Response} response Fetch API response object
 * @returns {Promise.<Object>} promise resolved with link object
 */
LinkDatasourceResolver.prototype.processResponse = function processResponse(response) {
    return response.text().then(function (xml) {
        var links = xmlModelParser.parseList(xml);
        return links && links.length ? links[0] : null;
    });
};

/**
 * Checks whether a datasource is of link type and creates a resolver instance
 * if check passes. Use this method as a resolver creating function registered with
 * datasource resolver factory.
 * @param {Object} datasource A datasource to check
 * @returns {DatasourceResolver|undefined}
 */
LinkDatasourceResolver.getInstance =
    DatasourceResolver.createFactoryFunction('link', LinkDatasourceResolver);

},{"../model/parsers/xml/model-parser":407,"backbase-widget-engine/src/datasource/datasource-resolver":206,"backbase-widget-engine/src/datasource/datasource-resolver-helpers":205}],390:[function(require,module,exports){
/**
 * Implements "navigation" datasource resolver
 * @see {@link https://backbase.atlassian.net/wiki/display/PrM/Navigation+Datasources}
 * @module datasource/navigation-datasource-resolver
 * @exports {NavigationDatasourceResolver}
 */

'use strict';

var DatasourceResolver  = require('backbase-widget-engine/src/datasource/datasource-resolver');
var resolverHelpers     = require('backbase-widget-engine/src/datasource/datasource-resolver-helpers');

module.exports = NavigationDatasourceResolver;

/**
 * Navigation datasource resolver
 * @param {Object} datasource
 * @constructor
 */
function NavigationDatasourceResolver(datasource) {
    this._datasource = datasource;
}

/**
 * Builds an endpoint URL of navigation datasource
 * @param {Object} context An object expressions in datasource URI are resolved against
 * @returns {string} A URL of an endpoint where data can be requested from
 */
NavigationDatasourceResolver.prototype.resolveUrl = function (context) {
    var url = this._datasource.uri;
    var urlComponents = url.split(':');

    if (urlComponents.length !== 2) {
        throw new Error('Invalid navigation datasource uri: ', url);
    }

    var params = [].concat(this._datasource.params || []);
    var linkId = resolverHelpers.trimSlashes(urlComponents[1]);
    if (linkId) {
        params.push({
            name: 'uuid',
            value: linkId
        });
    }

    var apiRoot = context.apiRoot || '';
    var endpointUrl = apiRoot + '/portal/navigation/tree';

    var queryString = resolverHelpers.resolveQueryString(context, params);
    if (queryString) {
        endpointUrl += '?' + queryString;
    }

    return endpointUrl;
};

/**
 * Parses JSON returned from datasource and returns it
 * @param {Response} response Fetch API response object
 * @returns {Promise.<Object>} promise resolved with an object literal containing JSON data
 */
NavigationDatasourceResolver.prototype.processResponse = function processResponse(response) {
    return response.json();
};

/**
 * Checks whether a datasource is of navigation type and creates a resolver instance
 * if check passes. Use this method as a resolver creating function registered with
 * datasource resolver factory.
 * @param {Object} datasource A datasource to check
 * @returns {DatasourceResolver|undefined}
 */
NavigationDatasourceResolver.getInstance =
    DatasourceResolver.createFactoryFunction('navigation', NavigationDatasourceResolver);

},{"backbase-widget-engine/src/datasource/datasource-resolver":206,"backbase-widget-engine/src/datasource/datasource-resolver-helpers":205}],391:[function(require,module,exports){
/**
 * Implements "portal" datasource resolver
 * @see {@link https://backbase.atlassian.net/wiki/display/PrM/Datasources+URI+spec#DatasourcesURIspec-PortalURI}
 * @module datasource/portal-datasource-resolver
 * @exports {PortalDatasourceResolver}
 */

'use strict';

var DatasourceResolver  = require('backbase-widget-engine/src/datasource/datasource-resolver');
var xmlModelParser      = require('../model/parsers/xml/model-parser');
var resolverHelpers     = require('backbase-widget-engine/src/datasource/datasource-resolver-helpers');

module.exports = PortalDatasourceResolver;

/**
 * Portal datasource resolver
 * @param {Object} datasource
 * @constructor
 */
function PortalDatasourceResolver(datasource) {
    this._datasource = datasource;
}

/**
 * Builds an endpoint URL of portal datasource
 * @param {Object} context An object expressions in datasource URI are resolved against
 * @returns {string} A URL of an endpoint where data can be requested from
 */
PortalDatasourceResolver.prototype.resolveUrl = function (context) {
    var url = this._datasource.uri;
    var urlComponents = url.split(':');

    if (urlComponents.length !== 2) {
        throw new Error('Invalid link datasource uri: ', url);
    }

    var params = [].concat(this._datasource.params || []);
    // add pc=false parameter to have no children in output, otherwise XML will be huge
    params.push({
        name: 'pc',
        value: false
    });

    var apiRoot = context.apiRoot || '';
    var portalName = resolverHelpers.resolveExpression(context, resolverHelpers.trimSlashes(urlComponents[1]));
    var queryString = resolverHelpers.resolveQueryString(context, params);

    return apiRoot + '/portal/portals/' + portalName + '.xml' + '?' + queryString;
};

/**
 * Parses XML returned from datasource
 * @param {Response} response Fetch API response object
 * @returns {Promise.<Object>} promise resolved with portal object
 */
PortalDatasourceResolver.prototype.processResponse = function processResponse(response) {
    return response.text().then(function (xml) {
        return xmlModelParser.parse(xml);
    });
};

/**
 * Checks whether a datasource is of portal type and creates a resolver instance
 * if check passes. Use this method as a resolver creating function registered with
 * datasource resolver factory.
 * @param {Object} datasource A datasource to check
 * @returns {DatasourceResolver|undefined}
 * @static
 */
PortalDatasourceResolver.getInstance =
    DatasourceResolver.createFactoryFunction('portal', PortalDatasourceResolver);

},{"../model/parsers/xml/model-parser":407,"backbase-widget-engine/src/datasource/datasource-resolver":206,"backbase-widget-engine/src/datasource/datasource-resolver-helpers":205}],392:[function(require,module,exports){
'use strict';

var render = require('./render/render.js');
var configuration = require('./configuration/configuration.js');
var xmlCxpModel = require('./model/strategies/xml-cxp-model');

module.exports = {
    // Factory methods
    getRenderer: render.createInstance,
    createConfiguration: configuration.createInstance,
    getModel: xmlCxpModel.createInstance
};
},{"./configuration/configuration.js":385,"./model/strategies/xml-cxp-model":410,"./render/render.js":415}],393:[function(require,module,exports){
'use strict';

/**
 * ItemCollectionContext
 * @module model/core/item-collection-context
 * @exports {ItemCollectionContext}
 */
module.exports = ItemCollectionContext;

/**
 * ItemCollectionContext represents a collection of items.
 * It's responsibility to manipulate items in the given context
 * like creating new items, filtering them.
 * @param {CxpConfiguration} config Cxp configuration
 * @param {string} type Item type
 * @param {string} portalName A portal where an item is located
 * @param filter
 * @constructor
 * @interface
 */
function ItemCollectionContext (config, type, portalName, filter) {
    this._config = config;
    this.type = type;
    this._portalName = portalName;
    this._filter = filter || null;
    this._requiredParams = this._getRequiredParams();

    this._logger = this._config.getLogger().child({
        childName: 'item-collection-context'
    });
}

/**
 * Returns required params for certain types
 * @private
 * @returns {Object} Required params as key/value
 */
ItemCollectionContext.prototype._getRequiredParams = function () {
    switch (this.type) {
        case 'link':
            return {depth: 10, ps: 50};
        case 'page':
            return {depth: 10};

        default:
            return null;
    }
};

/**
 * Gets array of all item objects of the given type in the current context
 * @returns {Promise} Promise of array of items
 */
/* istanbul ignore next */
ItemCollectionContext.prototype.get = function () {
    throw new Error('Method not implemented');
};

/**
 * Creates a new item using the given item model
 * @param {Object} itemModel Item model
 * @returns {Promise} Promise of newly created item model
 */
/* istanbul ignore next */
ItemCollectionContext.prototype.create = function (itemModel) {
    throw new Error('Method not implemented');
};

/**
* Applies a filter to the itemContext which will applied to future get() calls
* @param {String} name
* @param {String} value
* @param {string} operator One of 'lt', 'gt', 'eq', 'not', 'like'
* @return {ItemCollectionContext}
 */
/* istanbul ignore next */
ItemCollectionContext.prototype.filter = function (name, value, operator) {
    throw new Error('Method not implemented');
};

},{}],394:[function(require,module,exports){
'use strict';

/**
 * ItemContext
 * @module model/core/item-context
 * @exports {ItemContext}
 */
module.exports = ItemContext;

/**
 * ItemContext for the item identified by the given name
 * @param {CxpConfiguration} config CXP Configuration
 * @param {String} itemName Item name
 * @param {String} itemType Type of the item
 * @param {Boolean} findById
 * @param {string} portalName A portal where an item is located
 * @constructor
 * @interface
 */
function ItemContext(config, itemName, itemType, findById, portalName) {
    this._config = config;
    this.itemName = itemName;
    this.itemType = itemType;
    this._findById = findById || false;
    this._portalName = portalName;
    this._requiredParams = this._getRequiredParams();

    this._logger = this._config.getLogger().child({
        childName: 'item-context'
    });
}

/**
 * Returns query params to be used to get models of certain item types
 * @private
 * @returns {Object} Required params as key/value
 */
ItemContext.prototype._getRequiredParams = function () {
    var params = {};
    var isInDesignmode = !!this._config.get('designmode');
    var itemType = this.itemType;

    if (itemType === 'link' || itemType === 'page') {
        params.depth = 10;
    }

    if (isInDesignmode && (itemType === 'widget' || itemType === 'container' || itemType === 'page')) {
        params.designmode = true;
    }

    return params;
};

/**
 * Retrieves item model object
 * @param {Object} [options] Additional options
 * @param {boolean} [options.allLocalizedValues] Indicates that model should have all localized preference values
 * @returns {Promise<Object>}
 */
/* istanbul ignore next */
ItemContext.prototype.get = function (options) {
    throw new Error('Method not implemented');
};

/**
 * Updates the item using the given item model
 * @param {Object} model New item model
 * @returns {Promise}
 */
/* istanbul ignore next */
ItemContext.prototype.update = function (model) {
    throw new Error('Method not implemented');
};

/**
 * Reverts item's customizations.
 * @deprecated
 * @returns {Promise}
 */
/* istanbul ignore next */
ItemContext.prototype.revert = function () {
    throw new Error('Method not implemented');
};

/**
 * Removes the item
 * @returns {Promise}
 */
/* istanbul ignore next */
ItemContext.prototype.remove = function () {
    throw new Error('Method not implemented');
};


},{}],395:[function(require,module,exports){
'use strict';

/**
 * ModelHelpers module provides helper functions
 * for manipulating/exploring item model
 * @module model/core/ModelHelpers
 */
module.exports = {
    modifyPreference: modifyPreference,
    generateItemName: generateItemName,
    getViewHint: getViewHint
};

/**
 * Changes preference's value with given one.
 * Throws error if preference not found.
 *
 * @param {Object} model Item model
 * @param {String} name Preference name
 * @param {String} [valueType] Type of the preference value
 * @param {Any} value New value for preference
 */
function modifyPreference(model, name, value, valueType) {
    var preference = model.preferences[name];

    if (!preference) {
        preference = {name: name};
        model.preferences[name] = preference;
    }

    preference.value = value;

    if (valueType) {
        preference.type = valueType;
    }
}

/**
 * Performance optimized UUID generation code
 *
 * @returns {String} uuid
 */
var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); } // jshint ignore:line
function generateUUID () {
    /* jshint ignore:start */
    var d0 = Math.random()*0xffffffff|0;
    var d1 = Math.random()*0xffffffff|0;
    var d2 = Math.random()*0xffffffff|0;
    var d3 = Math.random()*0xffffffff|0;
    return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
        lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
        lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
        lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
    /* jshint ignore:end */
}

/**
 * Generates new item name based on extendedItemName
 * and random generated UUID
 *
 * @param {String} extendedItemName Extended item's name
 * @returns {String} New item name
 */
function generateItemName(extendedItemName) {
    return extendedItemName + generateUUID();
}

function getViewHint(viewHintType, viewhints) {

    //TODO: this code is temporarily duplicated in handlebars-helpers as a static function of the model helpers.
    //This code and the code in the handlebars-helpers should be consolidated to the widget engine as part of BACKLOG-12205
    
    var viewHintsMap = {
        designmode: ['designModeOnly'],
        role: ['admin', 'manager', 'user', 'none'],
        input: ['text-input', 'checkbox', 'select-one'],
        order: []
    };
    
    if(!viewhints || !viewhints.length || !viewHintsMap[viewHintType]) {
        return null;
    }

    //look for matching value
    var matchedViewHint = viewhints.filter(function(viewHint) {
        return viewHintsMap[viewHintType].indexOf(viewHint) !== -1 || viewHint.slice(0, viewHintType.length) === viewHintType;
    })[0];

    //parse order number
    if (matchedViewHint && viewHintType === 'order') {
        var order = matchedViewHint.split('-');
        order = order.length === 2 ? order[1] : null;
        var parsedOrder = parseFloat(order);
        if (!isNaN(parsedOrder)) {
            order = parsedOrder;
        }
        matchedViewHint = order;
    }

    //set default values
    matchedViewHint = matchedViewHint || (viewHintType === 'input' ? 'text-input' : null);

    //convert to boolean if it's designmode view hint
    if(viewHintType === 'designmode') {
        matchedViewHint = !!matchedViewHint;
    }

    return matchedViewHint;
}

},{}],396:[function(require,module,exports){
'use strict';

var modelHelpers = require('../core/model-helpers');

/**
 * Model Api
 * @module model/core/model
 * @exports {Model} The constructor
 */
module.exports = Model;

/**
 * Model gets portal data
 * @param {CxpConfiguration} configuration
 * @constructor
 * @interface
 */
function Model (configuration) {
    this.config = configuration;
    this.helpers = modelHelpers;
}

/**
 * It's a shorthand method for PortalContext.items().
 * @deprecated
 *
 * @see model/core/portal-context
 */
/* istanbul ignore next */
Model.prototype.items = function (itemType, opts) {
    throw new Error('Method not implemented');
};

/**
 * It's a shorthand method for PortalContext.item().
 * @deprecated
 *
 * @see model/core/portal-context
 */
/* istanbul ignore next */
Model.prototype.item = function (itemName, itemType, opts) {
    throw new Error('Method not implemented');
};

/**
 * It's a shorthand method for PortalContext.itemById().
 * @deprecated
 *
 * @see model/core/portal-context
 */
/* istanbul ignore next */
Model.prototype.itemById = function (itemId, itemType, opts) {
    throw new Error('Method not implemented');
};
/**
 * Returns portal context in which operations with items in the portal can be performed
 *
 * @param {String} portalName A portal name
 * @returns {PortalContext}
 */
Model.prototype.portal = function (portalName) {
    throw new Error('Method not implemented');
};

},{"../core/model-helpers":395}],397:[function(require,module,exports){
'use strict';

/**
 *
 * @param {CxpConfiguration} config CXP Configuration object
 * @param {string} [portalName] the name of a portal
 * @constructor
 * @interface
 */
function PortalContext(config, portalName) {
    this._config = config;

    // read-only property portalName
    Object.defineProperty(this, 'portalName', {
        value: portalName || this._config.get('portalName')
    });
}

/**
 * Allows to manage an item identified by the given name
 *
 * @param {String} itemName Name of item
 * @param {String} itemType Type of item
 * @param {Object} [opts]
 * @param {CxpConfiguration} [opts.config] CXP configuration object
 * @returns {ItemContext}
 */
PortalContext.prototype.item = function (itemName, itemType, opts) {
    throw new Error('Method not implemented');
};

/**
 * Allows to manage an item identified by the given id
 *
 * @param {String} itemId Id of an item
 * @param {String} itemType Type of an item
 * @param {Object} [opts]
 * @param {CxpConfiguration} [opts.config] CXP configuration object
 * @returns {ItemContext}
 */
PortalContext.prototype.itemById = function (itemId, itemType, opts) {
    throw new Error('Method not implemented');
};

/**
 * Allows to manage items of the given type in the context of a portal
 *
 * @param {String} itemType Type of items
 * @param {Object} [opts]
 * @param {CxpConfiguration} [opts.config] CXP configuration object
 * @returns {ItemCollectionContext}
 */
PortalContext.prototype.items = function (itemType, opts) {
    throw new Error('Method not implemented');
};

/**
 * @module model/core/portal-context
 * @exports {PortalContext}
 */
module.exports = PortalContext;
},{}],398:[function(require,module,exports){
'use strict';

var fetch = require('backbase-widget-engine/src/fetch/filtering-fetch');
var responseHelpers = require('backbase-widget-engine/src/util/response-helpers');
var util = require('../../util');

/**
 * Manages outgoing AJAX calls
 * @module model/rest-api-consumer
 * @exports {RestApiConsumer} Exports the constructor
 * @exports {createInstance} Exports the factory method
 */
module.exports = {
    RestApiConsumer: RestApiConsumer,
    createInstance: createInstance
};

/**
 * RestApiConsumer responsible for making rest calls, caching?, authentication?
 * @param {Configuration} configuration
 * @constructor
 */
function RestApiConsumer (configuration) {
    this.configuration = configuration;

    var baseUrl = configuration.get('remoteContextRoot');
    if (typeof baseUrl !== 'string') {
        throw new Error('RestApiConsumer needs remoteContextRoot variable to be set');
    }

    // Make sure baseUrl ends with "/"
    if (/\/$/.test(baseUrl) === false) {
        baseUrl += '/';
    }

    this.baseUrl = baseUrl;

    this.logger = configuration.getLogger().child({
        childName: 'rest-api-consumer'
    });
}

/**
 * Encodes given object as query parameters
 * @param {Object} params
 * @returns {String} Encoded parameters
 * @private
 */
RestApiConsumer.prototype._encodeQueryParameters = function (params) {
    var query = [];

    Object.keys(params).forEach(function (key) {
        if (Array.isArray(params[key])) {
            params[key].forEach(function (value) {
                query.push(key + '[]=' + encodeURIComponent(value));
            });
        } else {
            query.push(key + '=' + encodeURIComponent(params[key]));
        }
    });

    return query.join('&');
};

/**
 * Builds full url for given endpoint and parameters
 * @param {String} endpoint
 * @param {Object} [params]
 * @returns {string}
 * @private
 */
RestApiConsumer.prototype._buildUrl = function (endpoint, params) {
    var query = this._encodeQueryParameters(params || {});
    var url = this.baseUrl + endpoint;

    if (query.length > 0) {
        url += (endpoint.indexOf('?') >= 0 ? '&' : '?') + query;
    }

    return url;
};

/**
 * Makes ajax request and manage request's lifecycle.
 * @param {String} endpoint Endpoint url
 * @param {Object} [params] Query parameters
 * @param {Object} options Fetch options
 * @returns {Promise}
 * @private
 */
RestApiConsumer.prototype._makeRequest = function (endpoint, options, params) {
    var self = this;
    var requestUrl = this._buildUrl(endpoint, params);

    this.logger.debug('Making REST request to [%s]', requestUrl);

    var promise = fetch(requestUrl, options).then(function (response) {
        if (!responseHelpers.isResponseOk(response)) {
            var error = responseHelpers.createError(response);
            error.response = response;
            throw error;
        }

        self.logger.debug('Request successful server responds %s', response.status);
        return response;
    });

    promise.catch(function (err) {
        self.logger.error('Request failed with: %s', err);
    });

    return promise;
};

/**
 * Makes a GET request to given endpoint
 * @param {String} endpoint
 * @param {Object} [params] Query params
 * @returns {Promise}
 */
RestApiConsumer.prototype.get = function (endpoint, params) {
    return this._makeRequest(endpoint, {
        method: 'GET',
        headers: {
            // this is to prevent IE/Edge from caching of REST endpoint responses
            'Pragma' : 'no-cache',
            'Cache-Control' : 'no-cache'
        }
    }, params);
};

/**
 * Makes a POST request to given endpoint
 * @param {String} endpoint
 * @param {Object} data Request body
 * @returns {Promise}
 */
RestApiConsumer.prototype.post = function (endpoint, data) {
    var payload = util.isObject(data) ? JSON.stringify(data) : data;
    var headers = {
        'Content-Type': determineContentType(data)
    };

    return this._makeRequest(endpoint, {
        method: 'POST',
        body: payload,
        headers: headers
    });
};

/**
 * Makes a PUT request to given endpoint
 * @param {String} endpoint
 * @param {Object} data Request body
 * @returns {Promise}
 */
RestApiConsumer.prototype.put = function (endpoint, data) {
    var payload = util.isObject(data) ? JSON.stringify(data) : data;
    var headers = {
        'Content-Type': determineContentType(data)
    };

    return this._makeRequest(endpoint, {
        method: 'PUT',
        body: payload || '',
        headers: headers
    });
};

/**
 * Makes a DELETE request to given endpoint
 * @param {String} endpoint
 * @param {Object} params Query params
 * @returns {Promise}
 */
RestApiConsumer.prototype.delete = function (endpoint, params) {

    return this._makeRequest(endpoint, {
        method: 'DELETE'
    }, params);
};

/**
 * Returns an instance of RestApiConsumer
 * @param opts
 * @param opts.baseUrl Base url for api endpoints
 * @param opts.concurrentLimit Maximum number of concurrent ajax calls
 * @returns {RestApiConsumer}
 */
function createInstance (opts) {
    return new RestApiConsumer(opts);
}

/**
 * Finds the best Content-Type header value for the given data
 * @param {Object|String} data
 * @returns {String} Mime type
 */
function determineContentType (data) {
    if (util.isObject(data)) {
        return 'application/json';
    } else if (data && data.indexOf('<?xml') >= 0) {
        return 'text/xml';
    } else {
        return 'application/xml';
    }
}

},{"../../util":418,"backbase-widget-engine/src/fetch/filtering-fetch":214,"backbase-widget-engine/src/util/response-helpers":249}],399:[function(require,module,exports){
'use strict';

var generateProperty = require('./property-generator');

var ITEM_PROPERTY_NAMES = ['type', 'name', 'contextItemName', 'extendedItemName', 'parentItemName'];

var BASIC_PROPERTIES = [
    'shortName',
    'description',
];

/**
 * Generates xml for given link model
 * @param {XmlBuilder} xml XML
 * @param {Object} model
 * @param {Array=} additionalProperties Any additional properties to generate
 * @returns {XmlBuilder} Link xml
 */
module.exports = function(xml, model, additionalProperties) {

    additionalProperties = additionalProperties || [];

    ITEM_PROPERTY_NAMES.forEach(function(propertyName) {
        if (model.hasOwnProperty(propertyName)) {
            xml.beginElement(propertyName);
            xml.text(model[propertyName]);
            xml.endElement(propertyName);
        }
    });

    if (model.id) {
        xml.beginElement('uuid');
        xml.text(model.id);
        xml.endElement('uuid');
    }

    if (typeof model.manageable === 'boolean') {
        xml.beginElement('manageable');
        xml.text(model.manageable ? 'true' : 'false');
        xml.endElement('manageable');
    }

    xml.beginElement('properties');
    BASIC_PROPERTIES.forEach(function(property) {
        if (model[property]) {
            generateProperty(xml, { name: property, readonly: false, value: model[property] });
        }
    });
    if (Array.isArray(additionalProperties) && additionalProperties.length > 0) {
        additionalProperties.forEach(function(property) {
            generateProperty(xml, property);
        });
    }
    if (Array.isArray(model.icons) && model.icons.length > 0) {
        model.icons.forEach(function(icon, i) {
            var propertyName = i === 0 ? 'thumbnailUrl' : 'icon';
            generateProperty(xml, { name: propertyName, readonly: false, value: icon });
        });
    }
    var preferences = model.preferences || {};
    Object.keys(preferences).forEach(function(prefName) {
        generateProperty(xml, preferences[prefName], model.locale);
    });
    xml.endElement('properties');

    if (model.tags && model.tags.length > 0) {
        xml.beginElement('tags');
        model.tags.forEach(function(tag) {
            var attrs = { type: tag.type };
            if (tag.manageable) {
                attrs.manageable = true;
            }
            if (tag.blacklist) {
                attrs.blacklist = true;
            }
            xml.beginElement('tag', attrs);
            xml.text(tag.name);
            xml.endElement('tag');
        });
        xml.endElement('tags');
    }

    return xml;
};
},{"./property-generator":402}],400:[function(require,module,exports){
'use strict';

var XmlBuilder = require('./xml-builder');
var baseXmlGenerator = require('./base-xml-generator');

/**
 * Generates xml for given link model
 * @param {Object} model Link model
 * @returns {String} Link xml
 */
module.exports = function (model) {
    var xml = new XmlBuilder();

    xml.beginElement('link');
    baseXmlGenerator(xml, model);
    xml.endElement('link');

    return xml.toString();
};

},{"./base-xml-generator":399,"./xml-builder":404}],401:[function(require,module,exports){
'use strict';

var XmlBuilder = require('./xml-builder');
var baseXmlGenerator = require('./base-xml-generator');

/**
 * Generates xml for given page model
 * @param {Object} model Page model
 * @returns {String} Page xml
 */
module.exports = function (model) {
    var xml = new XmlBuilder();

    xml.beginElement('page');
    baseXmlGenerator(xml, model);
    xml.endElement('page');

    return xml.toString();
};

},{"./base-xml-generator":399,"./xml-builder":404}],402:[function(require,module,exports){
'use strict';

var NO_LOCALE_NAME = require('backbase-widget-engine/src/strategies/parser/xml/constants').NO_LOCALE_NAME;

/**
 * Generates single property element for given property
 * @param {XmlBuilder} xml The XML builder
 * @param {Object} property The property object
 * @param {string=} currentLocale The current locale
 */
function generateProperty(xml, property, currentLocale) {
    var attrs = {
        name: property.name,
        readonly: property.readonly || false
    };
    var type = property.type || (property.name === 'order' ? 'double' : null);

    if (typeof property.manageable === 'boolean') {
        attrs.manageable = property.manageable;
    }

    if (typeof property.localizable === 'boolean') {
        attrs.localizable = property.localizable;
    }

    if (typeof property.markedForDeletion !== 'undefined' && property.markedForDeletion === true) {
        attrs.markedForDeletion = true;
    }

    if (property.label) {
        attrs.label = property.label;
    }

    if (type) {
        attrs.type = type;
    }

    if (property.viewhints && property.viewhints.length > 0) {
        attrs.viewHint = property.viewhints.join(',');
    }

    xml.beginElement('property', attrs);
    generateValues(xml, property, currentLocale);
    xml.endElement('property');
}

/**
 * Build a basic value element
 * @param {XmlBuilder} xml The XML builder to append to
 * @param {*} value The value of the element
 * @param {Object=} attributes The attributes of the element
 */
function buildValueElement(xml, value, attributes) {
    xml.beginElement('value', attributes);
    xml.text(value);
    xml.endElement('value');
}

/**
 * Generate the values for each element
 * @param {XmlBuilder} xml The XML builder
 * @param {Object} property The property to build
 * @param {string=} currentLocale The current locale for i18n
 */
function generateValues(xml, property, currentLocale) {
    var locale = currentLocale || NO_LOCALE_NAME;

    if (property.localizable) {
        var langObj = property._lang;
        if (!langObj) {
            langObj = {};
            langObj[locale] = { value: property.value };
        }

        Object.keys(langObj).forEach(function (localeName) {
            var localizedValueObj = langObj[localeName] || {};
            var attributes = {};

            if (typeof localizedValueObj.markedForDeletion !== 'undefined' && localizedValueObj.markedForDeletion === true) {
                attributes.markedForDeletion = true;
            }
            if (localeName !== NO_LOCALE_NAME) {
                attributes.locale = localeName;
            }

            buildValueElement(xml, localizedValueObj.value, attributes);
        });
    } else {
        buildValueElement(xml, property.value);
    }
}

module.exports = generateProperty;
},{"backbase-widget-engine/src/strategies/parser/xml/constants":233}],403:[function(require,module,exports){
'use strict';

var XmlBuilder = require('./xml-builder');
var baseXmlGenerator = require('./base-xml-generator');

var WIDGET_PROPERTIES = [
    'author',
    'authorEmail',
    'authorHref',
    'license',
    'licenseHref',
];

/**
 * Generates xml for given widget model
 * @param {Object} model Widget model
 * @param {Boolean} [isContainer]
 * @returns {String} Widget xml
 */
module.exports = function(model, isContainer) {
    var elementName = isContainer ? 'container' : 'widget';

    var additionalProperties = [];

    WIDGET_PROPERTIES.forEach(function(property) {
        if (model[property]) {
            additionalProperties.push({ name: property, readonly: false, value: model[property] });
        }
    });

    if (model.content && model.content.src) {
        additionalProperties.push({ name: 'src', readonly: false, value: model.content.src });
    }

    if (model.altContent) {
        Object.keys(model.altContent).forEach(function(contentName) {
            additionalProperties.push({
                name: 'src.' + contentName,
                readonly: false,
                value: model.altContent[contentName].src
            });
        });
    }

    // viewmodes
    if (model.viewmodes && model.viewmodes.length > 0) {
        additionalProperties.push({ name: 'viewmodes', readonly: false, value: model.viewmodes.join(' ') });
    }

    var xml = new XmlBuilder();
    xml.beginElement(elementName);
    baseXmlGenerator(xml, model, additionalProperties);
    xml.endElement(elementName);

    return xml.toString();
};
},{"./base-xml-generator":399,"./xml-builder":404}],404:[function(require,module,exports){
'use strict';

/**
 * @module model/core/XmlGenerator
 * @export {XmlBuilder}
 */
module.exports = XmlBuilder;

var xmlEntityMap = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '&': '&amp;'
};
var xmlSpecialCharRegexp = /[<>"&]/g;

/**
 * Converts XML reserved characters to corresponding entities
 * @param {string} str
 * @returns {string}
 */
function escapeXML(str) {
    return str.replace(xmlSpecialCharRegexp, function (char) {
        return xmlEntityMap[char] || char;
    });
}

/**
 * Converts a value of any type to a string.
 * @param {*} value
 * @returns {string}
 */
function convertToString(value) {
    return value === null || value === undefined ? '' : String(value);
}

function XmlBuilder () {
    this._xml = '';
}

XmlBuilder.prototype.beginElement = function (tagName, attributes) {
    var attributesString = '';
    if (attributes) {
        attributesString = Object.keys(attributes).reduce(function (str, attrName) {
            var valueStr = convertToString(attributes[attrName]);
            return str + ' ' + attrName + '="' + escapeXML(valueStr) + '"';
        }, '');
    }

    this._xml += '<' + tagName + attributesString + '>';
};

XmlBuilder.prototype.endElement = function (tagName) {
    this._xml += '</' + tagName + '>';
};

XmlBuilder.prototype.text = function (text) {
    this._xml += escapeXML(convertToString(text));
};

/**
 * Adds an XML fragment to the builder
 * @param {string|XmlBuilder} xml
 */
XmlBuilder.prototype.xml = function (xml) {
    this._xml += xml;
};

XmlBuilder.prototype.toString = function () {
    return this._xml;
};

},{}],405:[function(require,module,exports){
'use strict';

var widgetGenerator = require('./widget-xml-generator');
var generatePage = require('./page-xml-generator');
var generateLink = require('./link-xml-generator');
var XmlBuilder = require('./xml-builder');

module.exports = {
    generate: generate,
    generateWidget: generateWidget,
    generateContainer: generateContainer,
    generatePage: generatePage,
    generateLink: generateLink,
    generateCatalog: generateCatalog
};

function generateContainer(model) {
    return widgetGenerator(model, true);
}

function generateWidget(model) {
    return widgetGenerator(model, false);
}

function generate(model, type) {
    var itemType = type || model.type;
    if (!itemType) {
        throw new TypeError('Item type is required. Either provide it as the second argument or set "type" property of the model');
    }

    var methodName = 'generate' + itemType[0].toUpperCase() + itemType.substr(1);
    if (!module.exports[methodName]) {
        throw new Error('Unsupported type passed ' + type);
    }

    return module.exports[methodName](model);
}

/**
 * Serializes item(s) to XML and wraps them into "catalog" element
 *
 * @param {Object|Array<Object>} catalogItems An item or an array of items to serialize in XML
 * @returns {string}
 * @throws {TypeError}
 */
function generateCatalog(catalogItems) {
    if (!catalogItems) {
        throw new TypeError('catalogItems argument is required. It must be an item model object or an array of such objects.');
    }
    if (!Array.isArray(catalogItems)) {
        catalogItems = [catalogItems];
    }

    var xmlBuilder = new XmlBuilder();

    xmlBuilder.beginElement('catalog');
    catalogItems.forEach(function(item) {
        xmlBuilder.xml(generate(item));
    });
    xmlBuilder.endElement('catalog');

    return xmlBuilder.toString();
}
},{"./link-xml-generator":400,"./page-xml-generator":401,"./widget-xml-generator":403,"./xml-builder":404}],406:[function(require,module,exports){
'use strict';

var merge = require('../../../util').merge;
var parseItem = require('backbase-widget-engine/src/strategies/parser/xml/item');
var helpers = require('backbase-widget-engine/src/strategies/parser/xml/helpers');

module.exports = parseLink;

var linkParsers = {
    'LINK': parseHeader,
    'divider': parseDivider,
    'page': parsePage,
    'externalLink': parseExternalLink,
    'redirect': parseRedirect,
    'alias': parseAlias,
    'state': parseState
};

/**
 * Extracts link specific data from given node.
 * @param {Node} node Link node <link ...>
 */
function parseLink(node) {
    var item = parseItem(node);
    var properties = item.preferencesDict;

    // TODO: check for other types
    var type = properties.itemType;
    if (type === 'menuHeader') {
        type = 'LINK';
    }

    var link = {
        children: [],
        itemType: type,
        title: properties.title
    };

    if (typeof linkParsers[type] === 'function') {
        linkParsers[type](link, properties);
    }

    var children = parseChildren(node);
    if ((children || []).length > 0) {
        link.children = children;
    }

    delete link.preferencesDict;

    return merge(item, link);
}

/**
 * Parses Header specific link nodes (Main Navigation, Not in Navigation)
 * @param {Object} link
 * @private
 */
function parseHeader(link) {
    link.navPattern = null;
}

/**
 * Parses Page specific link nodes
 * @param {Object} link
 * @param {Object} properties
 * @private
 */
function parsePage(link, properties) {
    link.itemRef = properties.ItemRef;
    link.href = properties.generatedUrl;

    if (properties.Url) {
        link.url = properties.Url;
    }

    link.generatedUrl = properties.generatedUrl;
}

/**
 * Parses Divider specific link nodes
 * @param {Object} link
 * @param {Object} properties
 * @private
 */
function parseDivider(link, properties) {
    link.className = properties.className;
}

/**
 * Pasers ExternalLink specific link nodes
 * @param {Object} link
 * @param {Object} properties
 * @private
 */
function parseExternalLink(link, properties) {
    link.url = properties.Url;
}

/**
 * Parses Redirect specific link nodes
 * @param {Object} link
 * @param {Object} properties
 * @private
 */
function parseRedirect(link, properties) {
    link.redirectionMethod = properties.redirectionMethod;
    link.url = properties.Url;
    link.targetPage = properties.targetPage;
}

/**
 * Parses Alias specific link nodes
 * @param {Object} link
 * @param {Object} properties
 * @private
 */
function parseAlias(link, properties) {
    link.itemRef = properties.ItemRef;
    link.href = properties.generatedUrl;

    if (properties.Url) {
        link.url = properties.Url;
    }

    link.generatedUrl = properties.generatedUrl;
}

/**
 * Parses State specific link nodes
 * @param {Object} link
 * @param {Object} properties
 * @private
 */
function parseState(link, properties) {
    link.itemRef = properties.ItemRef;
    link.href = properties.generatedUrl;

    if (properties.Url) {
        link.url = properties.Url;
    }

    link.generatedUrl = properties.generatedUrl;

    try {
        link.state = JSON.parse(properties.State);
    } catch (err) {
        //state property cannot be parsed
        throw new Error('Failed to parse "state" property of link [' + link.itemRef + ']. Error: ' + err.message);
    }

    if (properties.sectionName) {
        link.sectionName = properties.sectionName;
    }
}

/**
 * Parses page's childrens.
 * @param {Node} node Page node
 * @return {Array<object>} Array of children pages
 */
function parseChildren(node) {
    var parent = helpers.getChildElementByName(node, 'children');
    var childrenElements = parent && helpers.getChildElements(parent);

    return childrenElements && childrenElements.map(parseLink);
}

},{"../../../util":418,"backbase-widget-engine/src/strategies/parser/xml/helpers":234,"backbase-widget-engine/src/strategies/parser/xml/item":235}],407:[function(require,module,exports){
'use strict';

var parseLink       = require('./link');
var parsePage       = require('./page');
var parsePortal     = require('./portal');
var baseModelParser = require('backbase-widget-engine/src/strategies/parser/xml/model-parser');

var parser = baseModelParser.createInstance();

parser.setParser('link', parseLink);
parser.setParser('page', parsePage);
parser.setParser('portal', parsePortal);

/**
 * XML model parser. It extends model parser from widget by adding capabilities of parsing portal, page and link items.
 * @module model/parsers/xml/model-parser
 */
module.exports = parser;

},{"./link":406,"./page":408,"./portal":409,"backbase-widget-engine/src/strategies/parser/xml/model-parser":236}],408:[function(require,module,exports){
'use strict';

var parseItem   = require('backbase-widget-engine/src/strategies/parser/xml/item');
var parseWidget = require('backbase-widget-engine/src/strategies/parser/xml/widget');
var common      = require('backbase-widget-engine/src/strategies/parser/xml/common');
var helpers     = require('backbase-widget-engine/src/strategies/parser/xml/helpers');
var merge       = require('../../../util').merge;

module.exports = parsePage;

/**
 * Parses given page specific XML element into JS object
 * @param {Element} pageEl <page ...>
 * @returns {Object} page object
 */
function parsePage (pageEl) {
    var item = parseItem(pageEl);
    var properties = item.preferencesDict;

    var page = {
        content:     parseContent(properties),
        children:    [],
        description: properties.description,
        icons:       common.parseIcons(properties)
    };

    var children = common.parseChildren(pageEl, parseWidget);
    if ((children || []).length > 0) {
        page.children = children;
    }

    delete item.preferencesDict;

    return merge(item, page);
}

/**
 * Parses start file specific part of a page
 * @param {Object} properties Properties as Key/Value
 * @return {Object} Content object
 */
function parseContent(properties) {
    var content = { src: '', type: 'text/html', encoding: 'UTF-8' };
    helpers.assignIfExists(content, 'src', properties.src);

    return content;
}

},{"../../../util":418,"backbase-widget-engine/src/strategies/parser/xml/common":232,"backbase-widget-engine/src/strategies/parser/xml/helpers":234,"backbase-widget-engine/src/strategies/parser/xml/item":235,"backbase-widget-engine/src/strategies/parser/xml/widget":237}],409:[function(require,module,exports){
'use strict';

var parseItem = require('backbase-widget-engine/src/strategies/parser/xml/item');

/**
 * Parses portal XML model into JS object
 * @param {Element} portalEl An element object that represents portal model
 * @returns {Object} portal object
 */
function parsePortal (portalEl) {
    var item = parseItem(portalEl);
    delete item.preferencesDict;

    return item;
}

module.exports = parsePortal;
},{"backbase-widget-engine/src/strategies/parser/xml/item":235}],410:[function(require,module,exports){
'use strict';

var Model = require('../core/model');
var XmlPortalContext = require('./xml-portal-context');

/**
 * Model Api - XmlCxp implementation
 * @module model/strategies/xml-cxp-model
 * @exports {XmlCxpModel} The constructor
 */
module.exports = {
    XmlCxpModel: XmlCxpModel,
    createInstance: createInstance
};

/**
 * XmlCxp implementation for Model interface
 * @see model/core/model/Model
 * @param {Configuration} configuration
 * @constructor
 */
function XmlCxpModel(configuration) {
    Model.apply(this, [configuration]);
}

XmlCxpModel.prototype = Object.create(Model.prototype);

/**
 * @see model/core/model#items
 */
XmlCxpModel.prototype.items = function (itemType, opts) {
	return new XmlPortalContext(this.config).items(itemType, opts);
};

/**
 * @see model/core/model#item
 */
XmlCxpModel.prototype.item = function (itemName, itemType, opts) {
    return new XmlPortalContext(this.config).item(itemName, itemType, opts);
};

/**
 * @see model/core/model#itemById
 */
XmlCxpModel.prototype.itemById = function (itemId, itemType, opts) {
    return new XmlPortalContext(this.config).itemById(itemId, itemType, opts);
};

/**
 * @see model/core/model#portal
 */
XmlCxpModel.prototype.portal = function portal(portalName) {
    return new XmlPortalContext(this.config, portalName);
};

/**
 * Creates a new XmlCxpModel instance
 * @param {Configuration} configuration
 * @returns {XmlCxpModel}
 */
function createInstance(configuration) {
    return new XmlCxpModel(configuration);
}

},{"../core/model":396,"./xml-portal-context":414}],411:[function(require,module,exports){
'use strict';

var xmlModelParser          = require('../parsers/xml/model-parser');
var xmlGenerator            = require('../generators/xml-generator');
var ItemCollectionContext   = require('../core/item-collection-context');
var restApiConsumer         = require('../core/rest-api-consumer');

/**
 * XmlItemCollectionContext
 * @module model/strategies/xml-item-collection-context
 * @exports {XmlItemCollectionContext}
 */
module.exports = XmlItemCollectionContext;

/**
 * @see model/core/item-collection-context
 */
function XmlItemCollectionContext (config, type, portalName, filters) {
    ItemCollectionContext.call(this, config, type, portalName, filters);

    this._apiConsumer = restApiConsumer.createInstance(this._config);
}

XmlItemCollectionContext.prototype = Object.create(ItemCollectionContext.prototype);

/**
 * @see model/core/item-collection-context
 */
XmlItemCollectionContext.prototype.get = function () {
    var portalName = this._portalName;
    var endpoint = 'portals/' + portalName + '/' + this.type + 's';
    var filter = this._filter;
    var requiredParams = this._requiredParams;
    var filterQuery = [];
    var requiredParamsQuery = [];

    if (filter) {
        filterQuery = ['f=' + filter.name + '(' + filter.operator + ')' + encodeURIComponent(filter.value)];
    }

    // Some item types requires certain type of query params
    // @see model/core/item-collection-context#_getRequiredParams
    if (requiredParams) {
        requiredParamsQuery = Object.keys(requiredParams).map(function (key) {
            return encodeURIComponent(key) + '=' + encodeURIComponent(requiredParams[key]);
        });
    }

    var query = filterQuery.concat(requiredParamsQuery).join('&');
    endpoint += (query.length > 0 ? '?' + query : '');

    return this._apiConsumer.get(endpoint).then(function (response) {
        return response.text();
    }).then(function (xmlString) {
        this._logger.info('Parsing %s', endpoint);
        var items = xmlModelParser.parseList(xmlString);
        this._logger.info('%s parsed successfully');

        return items;
    }.bind(this));
};

/**
 * @see model/core/item-collection-context
 */
XmlItemCollectionContext.prototype.filter = function (name, value, operator) {
    var filter = { name: name, value: value, operator: operator || 'eq' };
    return new XmlItemCollectionContext(this._config, this.type, this._portalName ,filter);
};

/**
 * @see model/core/item-collection-context#create
 */
XmlItemCollectionContext.prototype.create = function (model) {
    var requiredFields = ['parentItemName'];
    if (this.type !== 'link') {
        requiredFields.push('extendedItemName');
    }

    requiredFields.forEach(function (field) {
        if (typeof model[field] === 'undefined' ||
            typeof model[field] !== 'string' ||
            model[field].length === 0) {
            throw new Error('ItemCollectionContext.create needs the model has the field named: ' + field);
        }
    });

    var portalName = this._portalName;

    model.contextItemName = portalName;

    if (typeof model.preferences === 'undefined') {
        model.preferences = {};
    }

    var itemXml = xmlGenerator.generate(model, this.type);
    var endpoint = 'portals/' + portalName + '/' + this.type + 's';

    return this._apiConsumer.post(endpoint, itemXml).then(function (response) {
        return response.text();
    }).then(function (newItemXml) {
        this._logger.info('Parsing newly created item\'s xml');
        var item = xmlModelParser.parse(newItemXml);
        this._logger.info('Newly created item parsed successfully');

        return item;
    }.bind(this));
};

},{"../core/item-collection-context":393,"../core/rest-api-consumer":398,"../generators/xml-generator":405,"../parsers/xml/model-parser":407}],412:[function(require,module,exports){
'use strict';

var xmlModelParser  = require('../parsers/xml/model-parser');
var xmlGenerator    = require('../generators/xml-generator');
var restApiConsumer = require('../core/rest-api-consumer');
var ItemContext     = require('../core/item-context');

/**
 * XmlItemContext
 * @module model/strategies/xml-item-context
 * @exports {XmlItemContext}
 */
module.exports = XmlItemContext;

/**
 * @see model/core/item-context
 */
function XmlItemContext (config, itemName, itemType, findById, portalName) {
    ItemContext.call(this, config, itemName, itemType, findById, portalName);

    this._apiConsumer = restApiConsumer.createInstance(this._config);
}

XmlItemContext.prototype = Object.create(ItemContext.prototype);

/**
 * @see model/core/item-context/ItemContext#get
 */
XmlItemContext.prototype.get = function (options) {
    var opts = typeof options === 'object' ? options : {};

    if (this._findById) {
        return this._getItemById();
    } else {
        return this._getItemByName(opts);
    }
};

/**
 * @private
 */
XmlItemContext.prototype._buildParams = function () {
    return Object.keys(this._requiredParams).map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(this._requiredParams[key]);
    }.bind(this)).join('&');
};

/**
 * Gets item model by its name
 * @param {Object} opts
 * @private
 */

XmlItemContext.prototype._getItemByName = function (opts) {
    var portalName = this._config.get('portalName');
    var itemEndpointPart = this.itemType + 's/' + this.itemName;
    var endpointEnding = opts.allLocalizedValues === true ? '/details' : '.xml';
    var endpoint = 'portals/' + portalName + '/' + itemEndpointPart + endpointEnding;

    var params = this._buildParams();
    if (params.length > 0) {
        endpoint += '?' + params;
    }

    return this._apiConsumer.get(endpoint).then(function (response) {
        return response.text();
    }).then(function (xmlString) {
        this._logger.info('Parsing response from [%s]', itemEndpointPart);
        var item = xmlModelParser.parse(xmlString);
        this._logger.info('Response from [%s] parsed successfully', itemEndpointPart);

        return item;
    }.bind(this));
};

/**
 * @private
 */
XmlItemContext.prototype._getItemById = function () {
    var portalName = this._config.get('portalName');
    var uuid = encodeURIComponent(this.itemName);
    var itemTypePlural = this.itemType + 's';
    var itemTypeEndpointPart = itemTypePlural + '?f=uuid(eq)' + uuid;
    var endpoint = 'portals/' + portalName + '/' + itemTypeEndpointPart;

    var params = this._buildParams();
    if (params.length > 0) {
        endpoint += '&' + params;
    }

    return this._apiConsumer.get(endpoint).then(function (response) {
        return response.text();
    }).then(function (xmlString) {
        this._logger.info('Parsing response from [%s]', itemTypeEndpointPart);
        var items = xmlModelParser.parseList(xmlString);
        this._logger.info('Response from [%s] parsed successfully', itemTypeEndpointPart);

        var item = items[0];
        if (!item) {
            throw new Error('Item of type [' + this.itemType + '] with id [' + this.itemName + '] not found');
        }

        return item;
    }.bind(this));
};

/**
 * @see model/core/item-context/ItemContext#update
 */
XmlItemContext.prototype.update = function (model) {
    var portalName = this._config.get('portalName');
    var endpoint = 'portals/' + portalName + '/' + this.itemType + 's/' + this.itemName;

    // this is a hacky way to fix BACKLOG-14503 issue. Unset parentItemName to let
    // portal server select the correct one. Also it's safer to unset id as it's going to be changed
    // when an instance of an item is created.
    // TODO: fix virtual extensions issue a proper way
    var modelToSave = model;

    if (model.name && model.name.indexOf('~') > 0) {
        modelToSave = Object.create(model);
        // shadow properties from prototype
        modelToSave.parentItemName = undefined;
        modelToSave.extendedItemName = undefined;
        modelToSave.id = undefined;
    }

    var modelXml = xmlGenerator.generate(modelToSave, this.itemType);

    return this._apiConsumer.put(endpoint, modelXml).then(function () {
        this._logger.info('%s named %s updated successfully', this.itemType, this.itemName);
    }.bind(this));
};

/**
 * @see model/core/item-context/ItemContext#revert
 * @deprecated
 */
XmlItemContext.prototype.revert = function () {
    var endpoint = 'portals/' + this._config.get('portalName') + '/' + this.itemType + 's/' + this.itemName + '.xml';

    return this._apiConsumer.delete(endpoint);
};

/**
 * @see model/core/item-context/ItemContext#remove
 */
XmlItemContext.prototype.remove = function () {
    var endpoint = 'portals/' + this._config.get('portalName') + '/' + this.itemType + 's/' + this.itemName;

    return this._apiConsumer.delete(endpoint);
};

},{"../core/item-context":394,"../core/rest-api-consumer":398,"../generators/xml-generator":405,"../parsers/xml/model-parser":407}],413:[function(require,module,exports){
'use strict';

var xmlModelParser = require('../parsers/xml/model-parser');
var XmlItemContext = require('./xml-item-context');

/**
 * XmlLinkContext
 * @module model/strategies/xml-link-context
 * @exports {XmlLinkContext}
 */
module.exports = XmlLinkContext;

/**
 * @see xml-item-context
 */
function XmlLinkContext(config, itemName, itemType, findById, portalName) {
    XmlItemContext.call(this, config, itemName, itemType, findById, portalName);
}

XmlLinkContext.prototype = Object.create(XmlItemContext.prototype);

/**
 * @see model/core/item-context/ItemContext#duplicate
 */
XmlLinkContext.prototype.duplicate = function () {
    var portalName = this._config.get('portalName');
    var itemEndpointPart = this.itemType + 's/' + this.itemName;
    var endpoint = 'portals/' + portalName  + '/' + itemEndpointPart + '/duplicate';

    return this._apiConsumer.post(endpoint).then(function (response) {
        return response.text();
    }).then(function (xmlString) {
        this._logger.info('Parsing response from [%s]', itemEndpointPart);
        var item = xmlModelParser.parse(xmlString);
        this._logger.info('Response from [%s] parsed successfully', itemEndpointPart);

        return item;
    }.bind(this));
};
},{"../parsers/xml/model-parser":407,"./xml-item-context":412}],414:[function(require,module,exports){
'use strict';

var PortalContext = require('../core/portal-context');
var XmlItemContext = require('./xml-item-context');
var XmlLinkContext = require('./xml-link-context');
var XmlItemCollectionContext = require('./xml-item-collection-context');

function XmlPortalContext() {
    PortalContext.apply(this, [].slice.call(arguments));
}

XmlPortalContext.prototype = Object.create(PortalContext.prototype);

/**
 * Implementation of PortalContext.item method
 * @see model/core/portal-context#item
 */
XmlPortalContext.prototype.item = function (itemName, itemType, opts) {
    var config = opts && opts.config || this._config;
    return this._createItemContext(config, itemName, itemType, false, this._getPortalName(opts));
};

/**
 * Implementation of PortalContext.itemById method
 * @see model/core/portal-context#itemById
 */
XmlPortalContext.prototype.itemById = function (itemId, itemType, opts) {
    var config = opts && opts.config || this._config;
    return this._createItemContext(config, itemId, itemType, true, this._getPortalName(opts));
};

/**
 * Implementation of PortalContext.items method
 * @see model/core/portal-context#items
 */
XmlPortalContext.prototype.items = function (itemType, opts) {
    var config = opts && opts.config || this._config;
    return new XmlItemCollectionContext(config, itemType, this._getPortalName(opts));
};

/**
 * Gets portal name from configuration object if it's set, returns the name of the context otherwise
 * @param {Object} opts
 * @return {*}
 * @private
 */
XmlPortalContext.prototype._getPortalName = function getPortalSetting(opts) {
    var config = opts && opts.config;
    return config && config.get('portalName') || this.portalName;
};

/**
 * Instantiate item by type
 * @param {CxpConfiguration} config CXP Configuration
 * @param {String} itemName Item name
 * @param {String} itemType Type of the item
 * @param {Boolean} findById
 * @param {string} portalName A portal where an item is located
 * @returns {ItemContext}
 * @private
 */
XmlPortalContext.prototype._createItemContext = function getItemByType(config, itemName,
    itemType, findById, portalName) {
    return (itemType === 'link') ?
        new XmlLinkContext(config, itemName, itemType, findById, portalName) :
        new XmlItemContext(config, itemName, itemType, findById, portalName);
};

/**
 * @module model/strategies/xml-portal-context
 * @exports {XmlPortalContext}
 */
module.exports = XmlPortalContext;
},{"../core/portal-context":397,"./xml-item-collection-context":411,"./xml-item-context":412,"./xml-link-context":413}],415:[function(require,module,exports){
'use strict';

var Html5ItemRenderer = require('./strategies/html5-item-renderer');

/**
 * This function constructs a new HTML5 item tree renderer.
 *
 * <p>It uses a a Widget Engine or a Container Engine to render each item in the model tree. Models with children
 * are automatically rendered using the Container Engine and leaf nodes are rendered using the Widget Engine.
 *
 * <p>It uses an <code>itemEngineLocator</code> to determine which Engines to use. You may supply your own locator
 * to provide custom implementations
 *
 * @module cxp-renderer/index
 * @exports {Function} Generates a new instance of a cxp renderer
 * @param {CxpConfig} cxpConfig A CXP configuration object
 * @returns {*|Html5ItemRenderer|exports}
 */
var createRenderer = function(cxpConfig) {

    if(!cxpConfig.get('contextRoot')) {
        cxpConfig.set('contextRoot', '');
    }

    if(!cxpConfig.get('remoteContextRoot')) {
        cxpConfig.set('remoteContextRoot', '');
    }

    return new Html5ItemRenderer(cxpConfig);
};
      
//export
module.exports = {
    createInstance: createRenderer
};

},{"./strategies/html5-item-renderer":417}],416:[function(require,module,exports){
(function (global){
/**
 * Renders a chrome.
 * @module strategies/chrome-renderer
 * @exports {ChromeRenderer} Exports the constructor
 */

'use strict';

var Handlebars          = require('handlebars/dist/handlebars.min');
var HandlebarsHelpers   = require('handlebars-helpers');
var fetch               = require('backbase-widget-engine/src/fetch/filtering-fetch');
var responseHelpers     = require('backbase-widget-engine/src/util/response-helpers');

//chromes is only rendered if a widget has one of these view modes
var CHROME_VIEWMODES = [
    'windowed',
    'maximized'
];

// attributes a chrome must have
var dataChromeAttr = 'data-chrome';
var dataWidgetHolderAttr = 'data-widget-holder';

// chrome template cache (shared among all renderer instances)
var chromeTemplatePromises = {};
var handlebarsInstance = Handlebars.create();

// add default helpers for chrome support
Object.keys(HandlebarsHelpers).forEach(function (helperName) {
    handlebarsInstance.registerHelper(helperName, HandlebarsHelpers[helperName]);
});

module.exports = ChromeRenderer;

/**
 * Creates chrome rendering instance.
 * A chrome template loaded by getting its URL from "chromeSrc" configuration option.
 * Widgets and containers with the view modes 'windowed' or 'maximized' will be wrapped with this template.
 * A widget chrome must have "data-chrome" attribute with the value of the widget name. It also must contain
 * an element with 'data-widget-holder' attribute. This is used to identify where
 * to inject the widget into the template.
 * A simple one div chrome is rendered by default.
 *
 * @param {Object} config CXP configuration option
 * @param {Object} [opts] options object
 * @param {Object} [opts.log] bunyan logger
 * @constructor
 */
function ChromeRenderer(config, opts) {
    opts = opts || {};
    var parentLog = opts.log || config.getLogger();

    this._config = config;
    this._log = parentLog.child({childName: 'chrome-renderer'});
}

/**
 * Implements conditional rendering by trying to find a chrome for a corresponding item and rendering a new one
 * if it's not found.
 * @param {HTMLElement} itemRootElement an element where a chrome should be looked for
 * @param {Object} itemModel item model
 * @param {Object} [opts] rendering options object
 * @param {boolean} [opts.useChrome] explicit false value prevents renderer to use template
 * @returns {Promise} a promise is resolved with an object having "chromeElement" and "widgetHolderElement" properties
 */
ChromeRenderer.prototype.getChrome = function(itemRootElement, itemModel, opts) {
    var chromeEl = this._findChromeElement(itemRootElement, itemModel.name);
    var holderEl = this._findWidgetHolderElement(chromeEl);

    return holderEl ?
         Promise.resolve({chromeElement: chromeEl, widgetHolderElement: holderEl}) :
        this._renderChrome(itemRootElement, itemModel, opts);
};

/**
 * Renders chrome
 * @param itemRootElement
 * @param itemModel
 * @param {Object} [opts]
 * @returns {Promise} A successfully resolved promise with either default chrome object or template-based one
 * @private
 */
ChromeRenderer.prototype._renderChrome = function(itemRootElement, itemModel, opts) {
    var chromeEl;
    var holderEl;
    var self = this;

    var useChrome = !opts || opts.useChrome !== false;
    var document = (itemRootElement && itemRootElement.ownerDocument) || global.document;
    var templatePromise = useChrome ? this._getTemplate() : Promise.resolve(null);

    return templatePromise.then(function (template) {
        // CHROME_VIEWMODES.indexOf(itemModel.viewmodes[0]) >= 0 check notes:
        // The first item in the collection of view modes is the current view mode. Subsequent items are supported
        // view modes in order of precedence.
        if(template && itemModel.viewmodes && CHROME_VIEWMODES.indexOf(itemModel.viewmodes[0]) >= 0) {

            // find out whether chrome layout has holder node and if it doesn't, log a warning
            var templateHtml = template(itemModel);
            var tempEl = document.createElement('div');

            tempEl.innerHTML = templateHtml;
            chromeEl = self._findChromeElement(tempEl, itemModel.name);
            holderEl = self._findWidgetHolderElement(chromeEl);

            if (chromeEl) {
                // remove chrome element from tree
                chromeEl.parentNode.removeChild(chromeEl);
            } else {
                self._log.warn('Chrome layout does not have an element with "data-chrome" attribute. ' +
                    'Falling back to blank chrome.');
            }

            if (!holderEl) {
                chromeEl = null;
                self._log.warn('Chrome layout does not have an element with "data-widget-holder" attribute. ' +
                    'Falling back to blank chrome.');
            }
        }

        // if no chrome rendered (for whatever reason), create simple default chrome
        if (!chromeEl) {
            chromeEl = document.createElement('div');
            chromeEl.setAttribute(dataChromeAttr, itemModel.name);
            chromeEl.setAttribute(dataWidgetHolderAttr, '');

            holderEl = chromeEl;
        }

        return {chromeElement: chromeEl, widgetHolderElement: holderEl};
    });
};

/**
 * Downloads and compiles a chrome template. Saves template in a cache that is shared among all renderer instances.
 * @returns {Promise} A successfully resolved promise with either a compiled template or null if there is a failure in
 * getting a template or compiling it.
 * @private
 */
ChromeRenderer.prototype._getTemplate = function() {
    var chromeUrl = this._config.get('chromeSrc');
    var log = this._log;

    if(!chromeUrl) {
        var message = 'No chrome template configured. Widgets with "windowed" or "maximized" view modes will ' +
            'be displayed without chrome.';
        log.warn(message);
        return Promise.resolve(null);
    }

    // replace contextRoot/apiRoot
    var staticResourcesRoot = this._config.get('staticResourcesRoot');
    var apiRoot = this._config.get('apiRoot');
    var url = chromeUrl.replace(/\$\(contextRoot\)|\$\(staticResourcesRoot\)/, staticResourcesRoot).replace(/\$\(apiRoot\)/, apiRoot);
    
    var compiledTemplatePromise = chromeTemplatePromises[url];

    if(!compiledTemplatePromise) {
        log.debug('Requesting chrome template from %s', url);
        compiledTemplatePromise = fetch(url).then(function(res) {
            log.debug('Chrome template request resolved. Status: %s', res.status);

            if (responseHelpers.isResponseOk(res)) {
                return res.text();
            } else {
                throw responseHelpers.createError(res);
            }
        }).then(function(templateBody) {
            log.trace('Chrome template body\n: %s', templateBody);
            log.debug('Compiling handlebars template instance from %s', url);

            // compile template
            try {
                return handlebarsInstance.compile(templateBody);
            } catch(err) {
                log.error('There was a problem compiling a handlebars template');
                throw err;
            }
        }).catch(function(e) {
            log.error(e);
            delete chromeTemplatePromises[url];

            return null;
        });

        chromeTemplatePromises[url] = compiledTemplatePromise;
    }

    return compiledTemplatePromise;
};

/**
 * Finds chrome element
 * @param {Node} rootNode
 * @param {string} itemName
 * @returns {HTMLElement}
 * @private
 */
ChromeRenderer.prototype._findChromeElement = function(rootNode, itemName) {
    if (!rootNode) {
        return null;
    }

    var selector = '*[' + dataChromeAttr + '="' + (itemName || '') + '"]';
    return rootNode.querySelector(selector);
};

/**
 * Finds widget holder element
 * @param {Node} rootNode
 * @returns {HTMLElement}
 * @private
 */
ChromeRenderer.prototype._findWidgetHolderElement = function(rootNode) {
    if (!rootNode) {
        return null;
    }

    var selector = '*[' + dataWidgetHolderAttr + ']';
    return rootNode.hasAttribute(dataWidgetHolderAttr) ? rootNode : rootNode.querySelector(selector);
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"backbase-widget-engine/src/fetch/filtering-fetch":214,"backbase-widget-engine/src/util/response-helpers":249,"handlebars-helpers":253,"handlebars/dist/handlebars.min":255}],417:[function(require,module,exports){
/**
 * Renders a CXP model tree within one DOM
 * @module strategies/html5-item-renderer
 * @exports {Html5ItemRenderer} Exports the constructor
 */

'use strict';

var WidgetEngine      = require('backbase-widget-engine');
var ExtPromise        = require('promise-extensions')(Promise);
var bunyan            = require('browser-bunyan');
var util              = require('../../util');
var ChromeRenderer    = require('./chrome-renderer');

var LinkDatasourceResolver = require('../../datasource/link-datasource-resolver');
var PortalDatasourceResolver = require('../../datasource/portal-datasource-resolver');
var ContentDatasourceResolver = require('../../datasource/contentrendered-datasource-resolver');
var NavigationDatasourceResolver = require('../../datasource/navigation-datasource-resolver');
var BreadcrumbDatasourceResolver = require('../../datasource/breadcrumb-datasource-resolver');

/**
 * <p>Creates an Html5ItemRenderer instance
 *
 * @constructor
 * @param {Object} cxpConfig.chromeSrc A URL to a Handlebars template for wrapping items with chrome.
 *
 * @example
 * &lt;div class="panel panel-default"&gt;
 *   &lt;div class="pull-right"&gt;
 *   {{#allowEdit}}
 *     &lt;button type="button" class="btn btn-default btn-xs" title="Settings" data-cxp-settings="{{id}}"&gt;
 *       &lt;span class="glyphicon glyphicon-wrench"&gt;&lt;/span&gt;
 *     &lt;/button&gt;
 *   {{/allowEdit}}
 *   &lt;/div&gt;
 *   &lt;div class="panel-heading"&gt;{{name}}&lt;/div&gt;
 *   &lt;div class="panel-body" data-widget-holder&gt;&lt;/div&gt;
 * &lt;/div&gt;
 */
var Html5ItemRenderer = function(cxpConfig) {

    this.config = cxpConfig;

    this.log = cxpConfig.getLogger().child({
        childName: 'html5-item-renderer'
    });

    this.plugins = [];
    this.features = [];
    this._widgetEngines = [];

    this._chromeRenderer = new ChromeRenderer(cxpConfig, {log: this.log});

    this._datasourceResolvers = [
        LinkDatasourceResolver.getInstance,
        PortalDatasourceResolver.getInstance,
        ContentDatasourceResolver.getInstance,
        NavigationDatasourceResolver.getInstance,
        BreadcrumbDatasourceResolver.getInstance
    ];
};

module.exports = Html5ItemRenderer;

/**
 * Starts the rendering process
 * @param {(Object | Object[])} model - A model tree or a list of models to render
 * @param {Node} rootNode - A DOM node to start rendering within
 * @param {Object} [opts] Additional rendering options
 * @param {boolean} opts.useChrome Option which will disable use of a custom chrome template provide in the
 * configuration object. Defaults to true.
 * @param {string} opts.contentName If specified renderer tries to use alternative content file which matches the name
 * @returns {Promise} Resolves when all items are rendered
 */
Html5ItemRenderer.prototype.start = function(model, rootNode, opts) {
    if (!model || model.length === 0) {
        return ExtPromise.resolve();
    }

    opts = opts || {};

    var log = this.log;
    var self = this;

    log.info('Starting item tree rendering...');
    if(log.level() <= bunyan.TRACE) {
        log.trace('Item tree model is this:\n %s', JSON.stringify(model, null, '\t'));
    }

    var startTime = Date.now();
    var modelList = Array.isArray(model) ? model : [model];

    // override content if contentName option exists
    // don't override it if there is more than one model
    if (modelList.length === 1 && opts.contentName) {
        var modelCopy = util.cloneDeep(modelList[0]);
        modelCopy.content = modelCopy.altContent[opts.contentName];

        if (typeof modelCopy.content === 'undefined') {
            var error = new Error('Given content name "' + opts.contentName + '" not found for item named "' + model.name + '"');
            return ExtPromise.reject(error);
        }

        modelList = [modelCopy];
    }

    return this._render(modelList, rootNode, opts).then(function(treeRenderInspections) {
        log.info('Item tree rendering complete.');

        var time = Date.now() - startTime;
        var result = {
            time: time,
            failures: []
        };

        //convert promise inspections into nice result object
        var inspections = self._flattenArray(treeRenderInspections);
        result = inspections.reduce(function(result, inspection) {
            if(inspection.isRejected()) {
                var cause = (typeof inspection.reason.cause === 'function' && inspection.reason.cause()) ||
                    inspection.reason;

                result.failures.push(cause);
            }
            return result;
        }, result);

        var errCount = result.failures.length;
        if(errCount > 0) {
            log.warn('%s/%s items failed to load.', errCount, inspections.length);
        }

        //if every item failed to render, it's bad! Throw an error
        if(errCount === inspections.length) {
            var err = new Error('All items in a rendering tree failed to render');
            err.result = result;
            throw err;
        }

        return result;
    });
};

/**
 * Adds a widget feature to all items being rendered
 * @method
 * @param {Object} feature
 */
Html5ItemRenderer.prototype.addFeature = function(feature) {
    if(typeof feature === 'object') {
        this.features.push(feature);
    }
    return this;
};

/**
 * Adds a widget plugin to all items being rendered
 * @method
 * @param {Object} plugin
 */
Html5ItemRenderer.prototype.addPlugin = function(plugin) {

    if(typeof plugin === 'object') {
        this.plugins.push(plugin);
    }

    return this;
};

/**
 * Renders an item model
 * @private
 * @param itemModel
 * @param domNode
 * @returns {Promise}
 */
Html5ItemRenderer.prototype._renderItem = function (itemModel, domNode) {
    var self = this; // jshint ignore:line
    var config = this.config;

    var widgetPath = '';
    //strip file from widget src to get path
    if (itemModel.content && itemModel.content.src) {
        widgetPath = itemModel.content.src.replace(/\/[^\/]+$/, '');
    //TODO: This logic should be move to model parsing
    } else if (itemModel.content && itemModel.content.config) {
        widgetPath = itemModel.content.config.replace(/\/[^\/]+$/, '');
    }
    //also replace contextRoot & apiRoot placeholder
    widgetPath = widgetPath.replace(/\$\(contextRoot\)|\$\(staticResourcesRoot\)/, config.get('staticResourcesRoot'))
        .replace(/\$\(apiRoot\)/, config.get('apiRoot'));

    //create a widget engine
    var engine = new WidgetEngine({
        log: this.log
    });

    var storageFactory = config.get('storageFactory') ;
    engine.init({
        widgetPath: widgetPath,
        widgetEl: domNode,
        initialModel: itemModel,
        storage: storageFactory ? storageFactory.get(itemModel) : null,
        configVars: config.toSerializableObject()
    });

    this._datasourceResolvers.forEach(function (resolver) {
        engine.addDatasourceResolver(resolver);
    });

    //add user defined plugins
    this.plugins.forEach(function (plugin) {
        engine.addPlugin(plugin);
    });

    //add user defined features
    this.features.forEach(function (feature) {
        engine.addFeature(feature);
    });

    if(!!config.get('compat')) {
        engine.enableCompatibility();
    }

    var engineResult = engine.start(itemModel, domNode);

    //the delay here seems to fix an issue with Safari in iOS where calling DOMParser().parseFromString()
    //a few times in quick succession causes it to return undefined (a browser bug)
    //see: https://backbase.atlassian.net/browse/BACKLOG-9708
    return engineResult.delay(0).then(function (result) {
        self._widgetEngines.push(engine);
        return result;
    });
};

/**
 * Destroy all the widgets including dom and inline scripts
 * created during rendering widget
 */
Html5ItemRenderer.prototype.destroyAllItems = function () {
    this._widgetEngines.forEach(function (engine) {
        engine.destroy();
    });

    this._widgetEngines = [];
};

/**
 * Destroy the given widget and it's resources
 *
 * @param {String} itemId Item id
 */
Html5ItemRenderer.prototype.destroyItem = function (itemId) {
    var engine = this._widgetEngines.filter(function (engine) {
        return engine.widgetEngine.config.initialModel.id === itemId;
    })[0];

    if (!engine) {
        return;
    }

    engine.destroy();

    var widgetConfig = engine.widgetEngine.config;

     // Remove child widget engines
    if (widgetConfig.initialModel && (widgetConfig.initialModel.children && widgetConfig.initialModel.children.length > 0)) {
        var self = this;
        widgetConfig.initialModel.children.forEach(function(child) {
            var childEngine = self._widgetEngines.filter(function(wEngine) {
                if (wEngine.widgetEngine._widgetInstance && wEngine.widgetEngine._widgetInstance.id === child.id) {
                    return wEngine;
                }
            })[0];

            if (!childEngine) {
                return;
            }

            var engineIndex = self._widgetEngines.indexOf(childEngine);
            self._widgetEngines.splice(engineIndex, 1);
        });
    }

    var engineIndex = this._widgetEngines.indexOf(engine);
    this._widgetEngines.splice(engineIndex, 1);
    
    return this;
};

/**
 * Rerenders given item
 *
 * @param {string|object} oldItemId either item id, needed for destroying item, or an item model
 * @param {string} [oldItemName] item name needed for calculating items position in dom. `itemModel.name` is used if 
 * the argument is not specified.
 * @param {object} [itemModel] item model to be rendered. If the argument is not specified, an item model must be
 * provided as the first argument.
 */
Html5ItemRenderer.prototype.rerenderItem = function (oldItemId, oldItemName, itemModel) {
    if (typeof oldItemId === 'object' && typeof itemModel === 'undefined') {
        itemModel = oldItemId;
        oldItemId = itemModel.id;
        oldItemName = itemModel.name;
    }

    var placeholder = document.createElement('div');
    var itemChrome = document.querySelector('[data-chrome="' + oldItemName + '"]');
    itemChrome.parentNode.insertBefore(placeholder, itemChrome);

    this.destroyItem(oldItemId);
    return this.start(itemModel, placeholder).then(function () {
        var newChrome = placeholder.firstElementChild;

        placeholder.parentNode.insertBefore(newChrome, placeholder);
        placeholder.parentNode.removeChild(placeholder);
    });
};

/**
 * Renders items and their trees
 * @param {Array} modelList Array of item models
 * @param {HTMLElement} rootNode An element where all items should be rendered
 * @param {Object} opts rendering options
 * @returns {Promise} Promise resolved with inspection options when all items and their trees are rendered
 * @private
 */
Html5ItemRenderer.prototype._render = function(modelList, rootNode, opts) {
    var self = this;
    var chromePromises = modelList.map(function (itemModel) {
        return self._chromeRenderer.getChrome(rootNode, itemModel, opts);
    });

    return Promise.all(chromePromises).then(function (chromeArr) {
        return chromeArr.map(function (chrome, i) {
            return {
                itemModel: modelList[i],
                chrome: chrome,
                parentEl: rootNode
            };
        });
    }).then(function (itemChromeMapList) {
        var renderResults = [];

        itemChromeMapList.forEach(function (itemChromeMap, idx, array) {
            // insert chrome node into DOM (if it's not) in correct order
            self._attachChrome(itemChromeMap, idx, array);

            // render item
            renderResults.push(self._renderItem(itemChromeMap.itemModel, itemChromeMap.chrome.widgetHolderElement));
        });

        return ExtPromise.settleAll(renderResults);
    }).then(function (inspections) {
        // render children of successfully rendered items
        var childenRenderResults = [];

        inspections.filter(function (inspection) {
            return inspection.isFulfilled();
        }).map(function (fulfilled) {
            return fulfilled.value;
        }).forEach(function (itemRenderResult) {
            var areaNodes = itemRenderResult.areaNodes;

            if (areaNodes) {
                // find corresponding item model
                var itemModel = modelList.filter(function (model) {
                    return model.id === itemRenderResult.id;
                })[0];

                Object.keys(areaNodes).forEach(function (area) {
                    //find child model(s) with matching area
                    var childrenModels = itemModel.children || [];
                    var childrenForArea = childrenModels.filter(function (item) {

                        //need to check if preferences area an array for MBaaS compatibility
                        var currentAreaPref;
                        if(Array.isArray(item.preferences)) {
                            currentAreaPref = item.preferences.filter(function(pref) {
                                return pref.name === 'area';
                            })[0];
                        } else {
                            currentAreaPref = item.preferences.area;
                        }
                        return currentAreaPref && currentAreaPref.value === area;
                    });

                    self.log.info('Rendering %s child item(s) for area [%s] of item [%s]...',
                        childrenForArea.length, area, itemRenderResult.id);

                    //loop through children for this area and render
                    var areaEl = areaNodes[area];

                    childenRenderResults.push(self._render(childrenForArea, areaEl, opts));
                });
            }
        });

        return Promise.all(inspections.concat(childenRenderResults));
    });
};

/**
 * Inserts a chrome element in a proper place. Crucial for conditional rendering.
 * @param {Object} itemChromeMap Holds item model and its corresponding chrome
 * @param {Number} idx Index of an item in a collection of items
 * @param {Array} array Collection of item-chrome map objects
 * @private
 */
Html5ItemRenderer.prototype._attachChrome = function(itemChromeMap, idx, array) {
    var chromeEl = itemChromeMap.chrome.chromeElement;
    var hostEl = itemChromeMap.parentEl;
    var refNode;

    // insert chrome nodes in DOM
    if (!chromeEl.parentNode) {
        if (idx === 0) {
            refNode = hostEl.firstElementChild;

        } else {
            var prevChromeNode = array[idx - 1].chrome.chromeElement;
            refNode = prevChromeNode.nextElementSibling;
        }

        hostEl.insertBefore(chromeEl, refNode);
    }
};

/**
 * Flattens nested arrays
 * @param array
 * @returns {Array}
 * @private
 */
Html5ItemRenderer.prototype._flattenArray = function flatten(array) {
    return array.reduce(function (flattened, item) {
        return flattened.concat(Array.isArray(item) ? flatten(item) : item);
    }, []);
};

},{"../../datasource/breadcrumb-datasource-resolver":387,"../../datasource/contentrendered-datasource-resolver":388,"../../datasource/link-datasource-resolver":389,"../../datasource/navigation-datasource-resolver":390,"../../datasource/portal-datasource-resolver":391,"../../util":418,"./chrome-renderer":416,"backbase-widget-engine":216,"browser-bunyan":252,"promise-extensions":384}],418:[function(require,module,exports){
'use strict';

/**
 * Utils modules expose functional helpers etc.
 * @module Utils
 * @export isObject
 * @export merge
 * @export cloneDeep
 */
module.exports = {
    isObject: require('lodash/isObject'),
    merge: require('lodash/merge'),
    cloneDeep: require('lodash/cloneDeep')
};
},{"lodash/cloneDeep":361,"lodash/isObject":373,"lodash/merge":380}],419:[function(require,module,exports){
/**
* Detect Element Resize
*
* https://github.com/sdecima/javascript-detect-element-resize
* Sebastian Decima
*
* version: 0.5.3
**/

(function () {
	var attachEvent = document.attachEvent,
		stylesCreated = false;
	
	if (!attachEvent) {
		var requestFrame = (function(){
			var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
								function(fn){ return window.setTimeout(fn, 20); };
			return function(fn){ return raf(fn); };
		})();
		
		var cancelFrame = (function(){
			var cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame ||
								   window.clearTimeout;
		  return function(id){ return cancel(id); };
		})();

		function resetTriggers(element){
			var triggers = element.__resizeTriggers__,
				expand = triggers.firstElementChild,
				contract = triggers.lastElementChild,
				expandChild = expand.firstElementChild;
			contract.scrollLeft = contract.scrollWidth;
			contract.scrollTop = contract.scrollHeight;
			expandChild.style.width = expand.offsetWidth + 1 + 'px';
			expandChild.style.height = expand.offsetHeight + 1 + 'px';
			expand.scrollLeft = expand.scrollWidth;
			expand.scrollTop = expand.scrollHeight;
		};

		function checkTriggers(element){
			return element.offsetWidth != element.__resizeLast__.width ||
						 element.offsetHeight != element.__resizeLast__.height;
		}
		
		function scrollListener(e){
			var element = this;
			resetTriggers(this);
			if (this.__resizeRAF__) cancelFrame(this.__resizeRAF__);
			this.__resizeRAF__ = requestFrame(function(){
				if (checkTriggers(element)) {
					element.__resizeLast__.width = element.offsetWidth;
					element.__resizeLast__.height = element.offsetHeight;
					element.__resizeListeners__.forEach(function(fn){
						fn.call(element, e);
					});
				}
			});
		};
		
		/* Detect CSS Animations support to detect element display/re-attach */
		var animation = false,
			animationstring = 'animation',
			keyframeprefix = '',
			animationstartevent = 'animationstart',
			domPrefixes = 'Webkit Moz O ms'.split(' '),
			startEvents = 'webkitAnimationStart animationstart oAnimationStart MSAnimationStart'.split(' '),
			pfx  = '';
		{
			var elm = document.createElement('fakeelement');
			if( elm.style.animationName !== undefined ) { animation = true; }    
			
			if( animation === false ) {
				for( var i = 0; i < domPrefixes.length; i++ ) {
					if( elm.style[ domPrefixes[i] + 'AnimationName' ] !== undefined ) {
						pfx = domPrefixes[ i ];
						animationstring = pfx + 'Animation';
						keyframeprefix = '-' + pfx.toLowerCase() + '-';
						animationstartevent = startEvents[ i ];
						animation = true;
						break;
					}
				}
			}
		}
		
		var animationName = 'resizeanim';
		var animationKeyframes = '@' + keyframeprefix + 'keyframes ' + animationName + ' { from { opacity: 0; } to { opacity: 0; } } ';
		var animationStyle = keyframeprefix + 'animation: 1ms ' + animationName + '; ';
	}
	
	function createStyles() {
		if (!stylesCreated) {
			//opacity:0 works around a chrome bug https://code.google.com/p/chromium/issues/detail?id=286360
			var css = (animationKeyframes ? animationKeyframes : '') +
					'.resize-triggers { ' + (animationStyle ? animationStyle : '') + 'visibility: hidden; opacity: 0; } ' +
					'.resize-triggers, .resize-triggers > div, .contract-trigger:before { content: \" \"; display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; } .resize-triggers > div { background: #eee; overflow: auto; } .contract-trigger:before { width: 200%; height: 200%; }',
				head = document.head || document.getElementsByTagName('head')[0],
				style = document.createElement('style');
			
			style.type = 'text/css';
			if (style.styleSheet) {
				style.styleSheet.cssText = css;
			} else {
				style.appendChild(document.createTextNode(css));
			}

			head.appendChild(style);
			stylesCreated = true;
		}
	}
	
	window.addResizeListener = function(element, fn){
		if (attachEvent) element.attachEvent('onresize', fn);
		else {
			if (!element.__resizeTriggers__) {
				if (getComputedStyle(element).position == 'static') element.style.position = 'relative';
				createStyles();
				element.__resizeLast__ = {};
				element.__resizeListeners__ = [];
				(element.__resizeTriggers__ = document.createElement('div')).className = 'resize-triggers';
				element.__resizeTriggers__.innerHTML = '<div class="expand-trigger"><div></div></div>' +
																						'<div class="contract-trigger"></div>';
				element.appendChild(element.__resizeTriggers__);
				resetTriggers(element);
				element.addEventListener('scroll', scrollListener, true);
				
				/* Listen for a css animation to detect element display/re-attach */
				animationstartevent && element.__resizeTriggers__.addEventListener(animationstartevent, function(e) {
					if(e.animationName == animationName)
						resetTriggers(element);
				});
			}
			element.__resizeListeners__.push(fn);
		}
	};
	
	window.removeResizeListener = function(element, fn){
		if (attachEvent) element.detachEvent('onresize', fn);
		else {
			element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
			if (!element.__resizeListeners__.length) {
					element.removeEventListener('scroll', scrollListener);
					element.__resizeTriggers__ = !element.removeChild(element.__resizeTriggers__);
			}
		}
	}
})();
},{}],420:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],421:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],422:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],423:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],424:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":422,"./encode":423}],425:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":421,"querystring":424}],426:[function(require,module,exports){
/*global document, DOMParser*/
// inspired by https://gist.github.com/1129031

'use strict';

(function(DOMParser) {
    var proto = DOMParser.prototype,
        nativeParse = proto.parseFromString;

    proto.parseFromString = function(markup, type) {
        if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
            var doc = document.implementation.createHTMLDocument('');

            if (markup.toLowerCase().indexOf('<!doctype') > -1) {
                doc.documentElement.innerHTML = markup;
            } else {
                doc.body.innerHTML = markup;
            }
            return doc;
        } else {
            return nativeParse.apply(this, arguments);
        }
    };
}(DOMParser));

window.system_scroll = window.scroll;
window.scroll = function(x, y) {
    window.cxp.mobile.scrollTo('' + x, '' + y);
    window.system_scroll(x, y);
};

},{}],427:[function(require,module,exports){
'use strict';

function encodeURIExtras(str) {
    return encodeURIComponent(str)
        .replace(/[!()*]/g,
            function (c) {
                return '%' + c.charCodeAt(0).toString(16);
            }
        )
        .replace(/[']/g,
            function (c) {
                return '\\\'';
            }
        );
}

module.exports = encodeURIExtras;

},{}],428:[function(require,module,exports){
(function (global){
'use strict';

var window = global.window;  // jshint ignore:line
var document = global.document; // jshint ignore:line

module.exports = {
    convertFromLeanModel: function (model) {
        // conversions to make:
        // preferences from dictionary to array
        // src preference to content.src section.
        var oldModel = model;
        
        var preferences = model.preferences || [];
        oldModel.icons = model.icons || [];
        
        // move the src preference into the content section
        var src = preferences.src;
        delete preferences.src;
        oldModel.content = {'src': src, 'type': 'text/html'};
        
        //reformat the preferences into an array.
        oldModel.preferences = [];
        
        Object.keys(preferences).forEach(function(key) {
            oldModel.preferences.push({'name':key, 'value':preferences[key]});
        });
        
        if (model.children){
            var children = model.children;
            oldModel.children = [];
            var object = this;
            children.forEach(function(child) {
                var oldChild = object.convertFromLeanModel(child);
                oldModel.children.push(oldChild);
            });
        }
        
        return oldModel;
    }
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],429:[function(require,module,exports){
/* jshint ignore:start */
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) { // .length of function is 2
      'use strict';
      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}
/* jshint ignore:end */
},{}],430:[function(require,module,exports){
'use strict';

/**
 * Provides operations for publishing and subscribing to message channels.
 * @class
 */
window.b$.module('gadgets.pubsub', function() {

    var Class = window.b$.Class;

    /**
     * Class for the event bus.
     * @class
     * @private
     */
    var Channel = Class.extend(function() {
        this.callbacks = [];
    },{

        //queue of message
        queue: [],

        /**
         * Subscribes the callback to the channel.
         * @private
         */
        subscribe: function(callback) {
            this.callbacks.push(callback);
        },

        /**
         * Unsubscribes the callback from the channel.
         * @private
         */
        unsubscribe: function(callback) {
            if(!callback) {
                this.callbacks = [];
            }
            else {
                this.callbacks = this.callbacks.filter(function(fChannelCallback) {
                    return fChannelCallback !== callback;
                });
            }
        },

        /**
         * Publishes message to the channel.
         * @private
         */
        publish: function(message, flush) {
            if(flush) {
                this.flush();
            }

            this.callbacks.forEach(function(callback) {
                callback(message);
            });
        },

        /**
         * Clears the queue
         */
        flush: function() {
            this.queue = [];
        }
    });

    /**
     * Class for the event bus.
     * @class
     * @private
     */
    var EventBus = Class.extend(function() {
        this.channels = {};
    },{

        /**
         * Subscribes the callback to the channel.
         * @private
         * @method
         */
        subscribe: function(channelName, callback) {
            if (!this.channels[channelName]) {
                this.channels[channelName] = new Channel();
            }

            this.channels[channelName].subscribe(callback);

            window.cxp.mobile.subscribe(channelName);
        },

        /**
         * Unsubscribes the callback from the channel.
         * @method
         * @private
         */
        unsubscribe: function(channelName, fCallback) {

            if (this.channels[channelName]) {
                this.channels[channelName].unsubscribe(fCallback);

                window.cxp.mobile.unsubscribe(channelName);
            }
        },

        /**
         * Publishes message to the channel.
         * @private
         * @method
         */
        publish: function(channelName, oMessage, flush, eventType) {
            if (this.channels[channelName]) {
                this.channels[channelName].publish(oMessage, flush);
            }
            oMessage = oMessage || {};
            eventType = eventType || '';
            if(eventType !== 'SYSTEM') {
                window.cxp.mobile.publish(channelName, JSON.stringify(oMessage), eventType);
            }
        },

        /**
         * Flushes the message on a channel
         * @param channelName
         */
        flush: function(channelName) {
            if (this.channels[channelName]) {
                this.channels[channelName].flush();
            }
        }
    });

    var mainBus = new EventBus();

    /**
     * Publishes a string-type message to a channel.
     *
     * @param {String} channelName The name of the channel
     * @param {String} message The message to publish
     */
    function publish(channelName, message, flush, eventType) {
        if(typeof flush !== 'boolean') {
            flush = true;
        }
        mainBus.publish(channelName, message, flush, eventType);
    }

    /**
     * Subscribes a widget to a message channel.
     *
     * @param {String} channelName The name of the channel
     * @param {Function} callback A function that will be called with the channel messages
     */
    function subscribe(channelName, callback) {
        mainBus.subscribe(channelName, callback);
    }

    /**
     * Unsubscribes the widget from a message channel.
     *
     * @param {String} channelName The name of the channel
     */
    function unsubscribe(channelName, callback) {
        mainBus.unsubscribe(channelName, callback);
    }

    function flush(channelName) {
        mainBus.flush(channelName);
    }

    // channel support
    function channel(channelPrefix) {
        function getEventKey(eventName) {
            return '[{'+channelPrefix+'}].'+eventName;
        }

        var pubsubImpl = this; // jshint ignore:line

        return {
            publish: function(eventName, message, flush, eventType) {
                pubsubImpl.publish(getEventKey(eventName), message, flush, eventType);
            },
            subscribe: function(eventName, callback) {
                pubsubImpl.subscribe(getEventKey(eventName), callback);
            },
            unsubscribe: function(eventName, callback) {
                pubsubImpl.unsubscribe(getEventKey(eventName), callback);
            },
            flush: function(eventName) {
                pubsubImpl.flush(getEventKey(eventName));
            }
        };
    }

    this.name = 'pubsub'; // feature name
    this.publish = publish;
    this.subscribe = subscribe;
    this.unsubscribe = unsubscribe;
    this.flush = flush;
    this.channel = channel;
});

},{}],431:[function(require,module,exports){
'use strict';

//set up some global namespaces
window.cxp = window.cxp || {};
window.mobile = window.mobile || {};
window.cxp.mobile = window.mobile; //mobile references backbase.mobile because native android can only call one object deep

window.b$ = window.b$ || {};
window.b$.portal = window.b$.portal || {};

//this is the public interface to start rendering
window.cxp.mobile.render = function(widgetRoot, localContextRoot, remoteContextRoot, apiRoot, portalModel, plugins,
                                    logLevel, portalName, isPage, isLeanModel, userGroups) {

    require('./common/object-assign-polyfill');
    require('./common/dom-parser-polyfill');
    require('javascript-detect-element-resize');
    require('./common/pubsub');

    //simple factory to get the desired renderer for the current platform
    var Renderer;
    var isSafariOrUiWebview = /.*AppleWebKit/i.test(navigator.userAgent);
    if(isSafariOrUiWebview) {
        console.info('Portal Client Mobile is rendering in iOS mode');
        var iosBridge = require('./platforms/ios/ios-bridge');
        iosBridge.enable();
        Renderer = require('./platforms/ios/ios-page-renderer');
    } else {
        console.info('Portal client mobile is rendering in Android mode');
        Renderer = require('./platforms/android/android-page-renderer');
    }

    if (isLeanModel) {
        var converter = require('./common/lean-model-converter');
        portalModel = converter.convertFromLeanModel(portalModel);
    }

    window.cxp.mobile.plugins = plugins;
    window.b$.portal.loggedInUserGroup = userGroups;

    // filling the gap
    portalModel.contextItemName = portalName;

    //kick off rendering
    var renderer = new Renderer();
    renderer.render(document.getElementById(widgetRoot), portalModel, window.gadgets.pubsub, {
        portalName: portalName,
        localContextRoot: decodeURI(localContextRoot),
        remoteContextRoot: decodeURI(remoteContextRoot),
        apiRoot: decodeURI(apiRoot),
        staticResourcesRoot: decodeURI(localContextRoot),
        logLevel: logLevel,
        isPage: isPage
    });
};

//legacy interface
window.renderWidget = window.cxp.mobile.render;

},{"./common/dom-parser-polyfill":426,"./common/lean-model-converter":428,"./common/object-assign-polyfill":429,"./common/pubsub":430,"./platforms/android/android-page-renderer":435,"./platforms/ios/ios-bridge":436,"./platforms/ios/ios-page-renderer":437,"javascript-detect-element-resize":419}],432:[function(require,module,exports){
'use strict';

/**
 * Logs records to a buffer until they are flushed to another log stream
 * @param size
 * @constructor
 */
var BufferedLogStream = function(size) {

    this.size = size || 1000;
    this.buffer = [];

    this.decoratedStreams = [];
};

/**
 * Flushing the log will write records to streams added with this method
 * @param stream
 */
BufferedLogStream.prototype.decorateStream = function(stream) {
    this.decoratedStreams.push(stream);
};

/**
 * Write a record to the buffer
 * @param rec
 */
BufferedLogStream.prototype.write = function(rec) {

    if (this.buffer.length >= this.size) {
        this.buffer.shift();
    }

    this.buffer.push(rec);
};

/**
 * Flushes the buffer to a stream
 */
/* jshint ignore:start */
BufferedLogStream.prototype.flush = function() {
    var rec;
    while (rec = this.buffer.shift()) {
        this.decoratedStreams.forEach(function(stream) {
            stream.write(rec);
        });
    }
};
/* jshint ignore:end */

/**
 * Clears the buffer
 */
BufferedLogStream.prototype.clear = function() {
    this.buffer = [];
};

module.exports = BufferedLogStream;
},{}],433:[function(require,module,exports){
'use strict';

/**
 * Logs messages to the console without any pretty formatting.
 * @param opts
 * @constructor
 */
function ConsolePlainStream(opts) {
    opts = opts || {};
    this.printLevel = !!opts.printLevel;
    this.printTimestamp = !!opts.printTimestamp;
}

/**
 * Write a Bunyan log record
 * @param rec
 */
ConsolePlainStream.prototype.write = function(rec) {

    var loggerName = rec.childName ? rec.name + '/' + rec.childName : rec.name;

    var logMethod;
    if (rec.level < 30) {
        logMethod = 'log';
    } else if (rec.level < 40) {
        logMethod = 'info';
    } else if (rec.level < 50) {
        logMethod = 'warn';
    } else {
        logMethod = 'error';
    }

    function padZeros(number, len) {
        return Array((len + 1) - (number + '').length).join('0') + number;
    }

    function getTimestamp() {
        return '[' +
            padZeros(rec.time.getHours(), 2) + ':' +
            padZeros(rec.time.getMinutes(), 2) + ':' +
            padZeros(rec.time.getSeconds(), 2) + ':' +
            padZeros(rec.time.getMilliseconds(), 4) + ']';
    }
    
    var timestamp = this.printTimestamp ? (getTimestamp() + ' ') : '';
    var level = this.printLevel ? (rec.levelName.toUpperCase() + ': ') : '';
    console[logMethod](timestamp + level + loggerName + ': ' + rec.msg);
};

module.exports = ConsolePlainStream;
},{}],434:[function(require,module,exports){
(function (global){
'use strict';

var encodeURIExtras = require('../common/encode-uri-extras');

var document = global.document; // jshint ignore:line

/**
 * Write log messages by create iframes whose src attribute contains the log info. This creates network 
 * request which can be intercepted by the native side.
 * @constructor
 */
var IFrameBridgeLogStream = function() {
};

/**
 * Write a bunyan log record
 * @param rec
 */
IFrameBridgeLogStream.prototype.write = function(rec) {
    var iframe = document.createElement('IFRAME');
    var msg = encodeURIExtras(rec.msg + ' (' + rec.time + ')');

    iframe.setAttribute('src', 'log://?type=' + rec.levelName + '&msg=' + msg);
    document.documentElement.appendChild(iframe);
    iframe.parentNode.removeChild(iframe);
    iframe = null;   
};

module.exports = IFrameBridgeLogStream;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../common/encode-uri-extras":427}],435:[function(require,module,exports){
'use strict';

var PageRenderer = require('../../render/page-renderer');
var ConsolePlainLogStream = require('../../logging/console-plain-log-stream');

/**
 * Android Page Renderer
 * @constructor
 */
var AndroidPageRenderer = function() {
    PageRenderer.call(this);
};

//
AndroidPageRenderer.prototype = Object.create(PageRenderer.prototype);

AndroidPageRenderer.prototype._createLogStreams = function(logLevel) {

    return [{
        level: logLevel,
        stream: new ConsolePlainLogStream()
    }];
};

AndroidPageRenderer.prototype._renderForPlatform = function (widgetModel, renderer, rootEl) {
    renderer.start(widgetModel, rootEl).then(function(details) {
        var message = 'Item tree rendered in ' + details.time + 'ms',
            resizeElement = document.getElementsByTagName('html')[0], //the html could contain paddings/margins
            resizeCallback = function() {
                window.cxp.mobile.resize(resizeElement.scrollHeight);
            };
        window.addResizeListener(resizeElement, resizeCallback);
        console.log(message);
        window.cxp.mobile.itemLoaded();
    }).catch(function(err) {
        console.log(err);
    });
};

module.exports = AndroidPageRenderer;

},{"../../logging/console-plain-log-stream":433,"../../render/page-renderer":440}],436:[function(require,module,exports){
(function (global){
'use strict';

var encodeURIExtras = require('../../common/encode-uri-extras');

var window = global.window;  // jshint ignore:line
var document = global.document; // jshint ignore:line

module.exports = {
    enable: function () {

        //force XMLHttpRequests to include a request header
        if(window.XMLHttpRequest) {
            (function(__send) {
                try {
                    XMLHttpRequest.prototype.send = function(data) {
                        this.setRequestHeader('bb.nsurlrequest.webview', 'true');
                        __send.call(this, data);
                    };
                } catch (error) {}
            })(XMLHttpRequest.prototype.send);
        }

        function addIframe(src) {
            var iframe = document.createElement('IFRAME');
            iframe.setAttribute('src', src);
            document.documentElement.appendChild(iframe);
            iframe.parentNode.removeChild(iframe);
            iframe = null;
        }

        function loaded(time) {
            addIframe('bb-loaded://?time=' + time);
        }

        function reload() {
            addIframe('bb-reload://');
        }

        function resizeTo(width, height) {
            addIframe('bb-resize://?w=' + width + '&h=' + height);
        }

        function scrollTo(x, y) {
            addIframe('bb-scroll://?x=' + x + '&y=' + y);
        }

        function publish(event, payload, eventType) {
            addIframe('bb-publish://?event=' + encodeURIExtras(event) + '&type=' + encodeURIExtras(
                    eventType) + '&payload=' + encodeURIExtras(payload));
        }

        function subscribe(event) {
            addIframe('bb-subscribe://?event=' + encodeURIExtras(event));
        }

        function unsubscribe(event) {
            addIframe('bb-unsubscribe://?event=' + encodeURIExtras(event));
        }

        function executePlugin() {
            if (arguments.length === 0) {
                return;
            }
            var args = [];
            Array.prototype.push.apply(args, arguments);

            var plugin = args.shift();
            var method = args.shift();
            var params = args;
            for (var i = 0; i < params.length; i++) {
                params[i] = encodeURIExtras(params[i]);
            }

            addIframe('bb-plugin://?plugin=' + encodeURIExtras(plugin) + '&method=' +
                encodeURIExtras(method) + '&params=' + params.join('&params='));
        }


        function callPlugin(pluginName, methodName, args, resolve, reject) {
            var _callbackId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, // jshint ignore:line
                    v = c == 'x' ? r : (r & 0x3 | 0x8); // jshint ignore:line
                return v.toString(16);
            });
            var eventName = [pluginName, methodName, _callbackId].join('.');
            var _unsubscribe = function () {
                window.gadgets.pubsub.unsubscribe('plugin.success.' + eventName, _success);
                window.gadgets.pubsub.unsubscribe('plugin.error.' + eventName, _error);
            };
            var _success = function (response) {
                if (!response.keep) {
                    _unsubscribe();
                }
                if (resolve) {
                    resolve(response.data);
                }
            };
            var _error = function (response) {
                if (!response.keep) {
                    _unsubscribe();
                }
                if (reject) {
                    reject(response.data);
                }
            };

            // convert object into JSON.stringify
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (typeof arg === 'object') {
                    args[i] = JSON.stringify(arg);
                }
            }

            window.gadgets.pubsub.subscribe('plugin.success.' + eventName, _success);
            window.gadgets.pubsub.subscribe('plugin.error.' + eventName, _error);

            executePlugin.apply(window.cxp.mobile, [pluginName, methodName, _callbackId].concat(args));
            return _callbackId;
        }

        window.cxp.mobile = {
            loaded: loaded,
            reload: reload,
            resizeTo: resizeTo,
            scrollTo: scrollTo,
            publish: publish,
            subscribe: subscribe,
            unsubscribe: unsubscribe,
            callPlugin: callPlugin
        };
    }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../common/encode-uri-extras":427}],437:[function(require,module,exports){
'use strict';

var PageRenderer = require('../../render/page-renderer');
var ConsolePlainLogStream = require('../../logging/console-plain-log-stream');
var IFrameBridgeLogStream = require('../../logging/iframe-bridge-log-stream');
var BufferedLogStream = require('../../logging/buffered-log-stream');

/**
 * IOS Page Renderer
 * @constructor
 */
var IOSPageRenderer = function() {
    PageRenderer.call(this);
};

//extend PageRenderer
IOSPageRenderer.prototype = Object.create(PageRenderer.prototype);

/**
 * Creates IOS specific log streams
 * @param logLevel
 * @return {*[]}
 * @private
 */
IOSPageRenderer.prototype._createLogStreams = function(logLevel) {

    var consoleStream = new ConsolePlainLogStream({
        printTimestamp: true,
        printLevel: true
    });

    //buffered log stream allows a developer to replay the log by running bufferedLogStream.flush()
    var bufferedLogStream = new BufferedLogStream();
    bufferedLogStream.decorateStream(consoleStream);
    window.bufferedLogStream = bufferedLogStream; //expose globally

    //iframe log stream for logging to native land
    var iframeBridgeLogStream = new IFrameBridgeLogStream();

    //set up log streams
    return [{
        level: logLevel,
        stream: iframeBridgeLogStream
    }, {
        level: logLevel,
        stream: consoleStream
    }, {
        level: logLevel,
        stream: bufferedLogStream
    }];
};

/**
 * Does IOS specific rendering
 * @param widgetModel
 * @param renderer
 * @param rootEl
 * @private
 */
IOSPageRenderer.prototype._renderForPlatform = function(widgetModel, renderer, rootEl) {
    var page = document.getElementsByTagName('html')[0]; //the html could contain paddings/margins
    window.addResizeListener(page, function() {
        window.cxp.mobile.resizeTo(page.scrollWidth, page.scrollHeight);
    });

    renderer.start(widgetModel, rootEl).then(function(details) {
        window.cxp.mobile.loaded(details.time);
        window.cxp.mobile.resizeTo(page.scrollWidth, page.scrollHeight);
        var message = 'Widget-Engine: Item tree rendered in ' + details.time + 'ms';
        console.log(message);
    }).catch(function(err) {
        console.log(err);
    });
};

module.exports = IOSPageRenderer;

},{"../../logging/buffered-log-stream":432,"../../logging/console-plain-log-stream":433,"../../logging/iframe-bridge-log-stream":434,"../../render/page-renderer":440}],438:[function(require,module,exports){
'use strict';

module.exports = function(featureList) {

    featureList = featureList || [];

    return {
        name: 'add-feature-plugin',
        postRead: function (widgetModel) {
            if (featureList.length === 0) {
                return widgetModel;
            }

            if (!Array.isArray(widgetModel.features)) {
                widgetModel.features = [];
            }

            featureList.forEach(function (featureName) {
                var widgetModelAlreadyHasFeature = widgetModel.features.some(function (widgetFeature) {
                    return widgetFeature.name === featureName;
                });

                if (!widgetModelAlreadyHasFeature) {
                    widgetModel.features.push({
                        name: featureName,
                        required: false
                    });
                }
            });

            return widgetModel;
        }
    };
};
},{}],439:[function(require,module,exports){
'use strict';

module.exports = function addSupportToAccessChildren() {
    return {
        name: 'expose-children-plugin',
        preRender: function (widgetInstance, widgetRenderer, widgetModel) {
            widgetInstance.children = widgetModel.children ? widgetModel.children.map(function (child) {
                return {
                    id: child.id,
                    name: child.name
                };
            }) : [];
            return widgetInstance;
        }
    };
};
},{}],440:[function(require,module,exports){
(function (global){
/* jshint unused: vars */

'use strict';

var window = global.window || {}; // jshint ignore:line

//needed for spec to run
if (!global.window) {
    global.window = window;
}

//core portal
var cxpWebApis = require('cxp-web-apis');

//plugins (these are all functions which should be called to get the plugin instance)
var addFeaturePlugin = require('../plugins/add-feature-plugin');
var exposeChildrenPlugin = require('../plugins/expose-children-plugin');

//retreive csrf tokens using this cookie name
var CSRF_TOKEN_COOKIE_NAME = 'bbCSRF';
//send csrf tokens using this request header name
var CSRF_TOKEN_HEADER_NAME = CSRF_TOKEN_COOKIE_NAME;

/**
 * Gets the value of the given preference
 * @param {Object} preferences A preferences object
 * @param {string} preferenceName name of the preference
 * @returns {boolean}
 */
function getPreferenceValue(preferences, preferenceName) {
    if (preferences && preferences.length) {
        for (var i = 0; i < preferences.length; i++) {
            if (preferences[i].name === preferenceName) {
                return preferences[i].value;
            }
        }
    }

    return null;
}

/**
 * Renders a page
 * @interface
 * @constructor
 */
var PageRenderer = function (opts) {
};

/**
 * Starts the rendering process
 * @param rootEl
 * @param model
 * @param pubsub feature implementation
 * @param opts
 */
PageRenderer.prototype.render = function (rootEl, model, pubsub, opts) {

    //options
    opts = opts || {};
    var logLevel = opts.logLevel || 'warn';
    var localContextRoot = opts.localContextRoot || '';
    var remoteContextRoot = opts.remoteContextRoot || '';
    var apiRoot = opts.apiRoot || '';
    var staticResourcesRoot = opts.staticResourcesRoot || '';
    var portalName = opts.portalName || 'anonymous-portal';
    var isPage = opts.isPage || false;

    //set up config
    var config = cxpWebApis.createConfiguration({
        logStreams: this._createLogStreams(logLevel),
    });

    config.set('compat', true);
    config.set('fullConfigReplacement', true); //enables $(contextRoot) replacement for all preferences
    config.set('portalName', portalName);
    config.set('contextRoot', localContextRoot);
    config.set('remoteContextRoot', remoteContextRoot);
    config.set('apiRoot', apiRoot);
    config.set('staticResourcesRoot', staticResourcesRoot);

    // CSRF
    var csrfTokenCookieValue = null; // TODO: where do we get a CSRF token from?
    if (csrfTokenCookieValue) {
        config.set('csrfToken', {
            name: CSRF_TOKEN_HEADER_NAME,
            value: csrfTokenCookieValue
        });
    }

    //set up renderer
    var renderer = cxpWebApis.getRenderer(config);
    renderer.addPlugin(exposeChildrenPlugin());

    //expose CXP as a feature to widgets
    var cxpFeature = {
        name: 'cxp',
        config: config,
        render: renderer,
        model: cxpWebApis.getModel(config)
    };
    renderer.addPlugin(addFeaturePlugin([cxpFeature.name]));
    renderer.addFeature(cxpFeature);
    renderer.addFeature(pubsub); //enable the pubsub feature using the native implementation

    // Page only can be rendered by passing it's children.
    // Page object can't contain features property, thus this check
    // This check is unstable. We should update MBaaS to include a type on items instead
    var widgetModel = model;
    if (isPage) {
        widgetModel = model.children;

        var locale = getPreferenceValue(model.preferences, 'locale');
        for (var i = 0; i < widgetModel.length; i++) {
            widgetModel[i].contextItemName = model.contextItemName;

            var widgetLocale = getPreferenceValue(widgetModel[i].preferences, 'locale');
            if (locale && !widgetLocale) {
                widgetModel[i].preferences.push({
                    name: 'locale',
                    value: locale,
                });
            }
        }
    }

    this._renderForPlatform(widgetModel, renderer, rootEl);
};

/**
 * Should return an array of browser-bunyan log streams.
 * @param opts
 * @private
 */
PageRenderer.prototype._createLogStreams = function (opts) {
    throw new Error('PageRenderer#_createLogStreams must be overridden.');
};

/**
 * Platform specific rendering part
 * @param model
 * @param renderer
 * @param rootEl
 * @private
 */
PageRenderer.prototype._renderForPlatform = function (model, renderer, rootEl) {
    throw new Error('PageRenderer#_renderForPlatform must be overridden.');
};

module.exports = PageRenderer;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../plugins/add-feature-plugin":438,"../plugins/expose-children-plugin":439,"cxp-web-apis":392}]},{},[431]);
