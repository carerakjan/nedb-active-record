'use strict';

function Flow() {
    this._queue = require('q')(true);
}

Flow.prototype.execute = function (fn, err) {
    return (this._queue = this._queue['then'](fn, err));
};

module.exports = Flow;