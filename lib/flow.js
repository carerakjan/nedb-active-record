'use strict';

function Flow() {
    this._queue = require('q')(true);
}

Flow.prototype.execute = function (fn) {
    this._queue = this._queue.then(fn);
    return this;
};

Flow.prototype.then = function(fn) {
    return this.execute(fn);
};

module.exports = Flow;