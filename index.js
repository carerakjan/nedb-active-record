'use strict';

var Q = require('q');
var DB = require('nedb');
var _ = require('lodash');
var Flow = require('./lib/flow');

/**
 * ActiveRecord for NeDB
 * NeDB sources and specification: https://github.com/louischatriot/nedb
 *
 * @param name
 * @returns {F}
 * @constructor
 */
function ActiveRecord(name) {

    var cfg = {};
    
    var ext = {
        format:'txt',
        location:'database'
    };

    function buildFileName(name) {
        return ext.location + '/' + name + '.' + ext.format;
    }

    ActiveRecord._config &&
    _.extend(cfg, ActiveRecord._config);

    cfg.format &&
    (ext.format = cfg.format) &&
    (delete cfg.format);

    cfg.location &&
    (ext.location = cfg.location) &&
    (delete cfg.location);

    if(name) {
        cfg.filename = buildFileName(name);
    } else {
        throw new Error("Required parameter 'name' is not defined!");
    }

    var db = new DB(cfg);

    !cfg.autoload && db.loadDatabase();

    var flow = new Flow();

    /**
     * The exported class is responsible for a specific collection
     *
     * @param params
     * @constructor
     */
    function F(params) {
        params && (_.extend(this, params));
        generateId(this);
    }

    F.prototype.save = function() {
        var buffer = _.clone(this),
            refreshBuffer = function() {
                this.createdAt &&
                (buffer.createdAt = this.createdAt);
            },
            syncData = function(data){
                return _.isArray(data) &&
                    _.extend(this, data[1]) || data;
            };

        return F.pre(refreshBuffer.bind(this))
            .update({_id: this._id}, buffer, { upsert: true })
            .then(syncData.bind(this));
    };

    F.prototype.remove = function() {
        return F.remove({_id: this._id}, {});
    };

    /**
     * Cursor for methods: find, findOne or count
     *
     * @param dbCursor
     * @constructor
     */
    function C(dbCursor) {
        var chain = dbCursor;

        _.each(['sort', 'skip', 'limit', 'projection'], function(fName) {
            this[fName] = function() {
                chain = chain[fName].apply(chain, arguments);
                return this;
            }
        }.bind(this));

        this.exec = function(){
            return convertToPromise(chain, 'exec', [], function(data) {
                if(_.isArray(data)) return dbCallbacks.find(data);
                if(_.isObject(data)) return dbCallbacks.findOne(data);
                return data;
            });
        };
    }

    function generateId(o){
        o && !o._id && (o._id = db.createNewId());
    }

    /**
     * Generator of functions using Cursor API: sort, limit, skip, projection
     *
     * @example {$$sort:{planet: 1}, $$skip:1, $$limit:2, $$projection: { planet: 1, system: 1 }, $not: { planet: 'Earth' }}
     * @param fnName
     * @returns {*}
     */
    function generateCursorApi(fnName) {
        return function (query, projections) {
            var cursorOptions = _.pick(query, '$$sort', '$$skip', '$$limit', '$$projection');
            query = _.omit.apply(_, _.flatten([query, _.keys(cursorOptions)]));

            if (_.keys(cursorOptions).length || projections) {
                projections && (cursorOptions.$$projection = projections);

                var cursor = new C(db[fnName](query));
                _.reduce(_.keys(cursorOptions), function (c, method) {
                    return c[method.replace('$$','')](cursorOptions[method]);
                }, cursor);

                return cursor.exec();
            }

            return convertToPromise(db, fnName, arguments,
                (fnName === 'find' ? dbCallbacks.find : (fnName === 'findOne' ? dbCallbacks.findOne : null)));
        };
    }

    function convertToPromise(ctx, method, args, success) {
        return flow.execute(function(){
            var promise = Q.nfapply(ctx[method].bind(ctx), args);
            return success
                ? promise.then(success)
                : promise;
        });
    }

    function createRecord(doc) {
        return doc ? new F(doc) : null;
    }

    var dbCallbacks = {
        insert: function(docs){
            return _.isArray(docs)
                ? _.map(docs, createRecord)
                : createRecord(docs);
        },

        find: function(docs) {
            return _.map(docs, createRecord);
        },

        findOne: function(doc) {
            return createRecord(doc);
        },

        update: function(data) {
            _.isArray(data) &&
            (data[1] = createRecord(data[1]));
            return data;
        }
    };

    F.pre = function(fn) {
        return flow.execute(fn) && F;
    };

    F.update = function(){
        return convertToPromise(db, 'update', arguments, dbCallbacks.update);
    };

    F.insert = function(){
        return convertToPromise(db, 'insert', arguments, dbCallbacks.insert);
    };

    F.remove = function(){
        return convertToPromise(db, 'remove', arguments);
    };

    F.ensureIndex = function(){
        return convertToPromise(db, 'ensureIndex', arguments);
    };

    F.removeIndex = function(){
        return convertToPromise(db, 'removeIndex', arguments);
    };

    F.find = generateCursorApi('find');

    F.count = generateCursorApi('count');

    F.findOne = generateCursorApi('findOne');

    return F;
}

/**
 * Initial configuration for all NeDB collections.
 * Required to call before creation of new instance ActiveRecord.
 *
 * @param options
 */
ActiveRecord.config = function(options) {
    ActiveRecord._config = options;
};

module.exports = ActiveRecord;