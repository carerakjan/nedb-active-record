'use strict';

var Q = require('q');
var DB = require('nedb');
var _ = require('lodash');

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
        return F.update({_id: this._id}, _.clone(this), {upsert: true})
            .then(function(data){
                _.isArray(data) && _.extend(this, data[1]);
                return data;
            }.bind(this));
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
        var self = this, chain = dbCursor;

        _.each(['sort', 'skip', 'limit', 'projection'], function(fName) {
            self[fName] = function() {
                chain = chain[fName].apply(chain, arguments);
                return self;
            }
        });

        this.exec = function(){
            return convertToPromise(chain, 'exec', [])
                .then(function(data){
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

            var promise = convertToPromise(db, fnName, arguments);

            switch(fnName){
                default: return promise;
                case 'find': return promise.then(dbCallbacks.find);
                case 'findOne': return promise.then(dbCallbacks.findOne);
            }
        };
    }

    function convertToPromise(ctx, method, args) {
        return Q.nfapply(ctx[method].bind(ctx), args);
    }

    function createRecord(doc) {
        return new F(doc);
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

    F.update = function(){
        return convertToPromise(db, 'update', arguments)
            .then(dbCallbacks.update);
    };

    F.insert = function(){
        return convertToPromise(db, 'insert', arguments)
            .then(dbCallbacks.insert);
    };

    F.find = generateCursorApi('find');

    F.count = generateCursorApi('count');

    F.findOne = generateCursorApi('findOne');


    F.remove = Q.nbind(db.remove, db);

    F.ensureIndex = Q.nbind(db.ensureIndex, db);

    F.removeIndex = Q.nbind(db.removeIndex, db);

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