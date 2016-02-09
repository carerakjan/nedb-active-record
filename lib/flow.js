'use strict';

function Flow() {
    this._queue = require('q')(true);
}

Flow.prototype.execute = function (fn) {
    return (this._queue = this._queue.then(fn));
};

module.exports = Flow;