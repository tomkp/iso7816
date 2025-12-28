'use strict';

const statusCodes = {
    '^9000$': 'Normal processing',
    '^61(.{2})$': 'Normal processing, (sw2 indicates the number of response bytes still available)',
    '^62(.{2})$': 'Warning processing',
    '^6200$': 'no info',
    '^6281$': 'Part of return data may be corrupted',
    '^6282$': 'end of file/record reached before reading le bytes',
    '^6283$': 'ret data may contain structural info',
    '^6284$': 'selected file is invalidated',
    '^6285$': 'file control info not in required format',
    '^6286$': 'unsuccessful writing',
    '^63(.{2})$': 'Warning processing',
    '^6300$': 'no info',
    '^6381$': 'last write filled up file',
    '^6382$': 'execution successful after retry',
//          c0	least significant nibble is a counter....
//          ..	..valued from 0 to 15
//          cf
    '^64(.{2})$': 'Execution error',
    '^65(.{2})$': 'Execution error',
    '^6500$': 'no info',
    '^6581$': 'memory failure',
    '^66(.{2})$': 'Reserved for future use',
    '^6700$': 'Wrong length',
    '^68(.{2})$': 'Checking error: functions in CLA not supported (see sw2)',
    '^6800$': 'no info',
    '^6881$': 'logical channel not supported',
    '^6882$': 'secure messaging not supported',
    '^69(.{2})$': 'Checking error: command not allowed (see sw2)',
    '^6a(.{2})$': 'Checking error: wrong parameters (p1 or p2)  (see sw2)',
    '^6b(.{2})$': 'Checking error: wrong parameters',
    '^6c(.{2})$': 'Checking error: wrong length (sw2 indicates correct length for le)',
    '^6d(.{2})$': 'Checking error: wrong ins',
    '^6e(.{2})$': 'Checking error: class not supported',
    '^6f(.{2})$': 'Checking error: no precise diagnosis'
};


function ResponseApdu(buffer) {
    this.buffer = buffer;
    this.data = buffer.toString('hex');
}

ResponseApdu.prototype.getStatus = function() {
    const statusCode = this.getStatusCode();
    let meaning = 'Unknown';
    for (let prop in statusCodes) {
        if (statusCodes.hasOwnProperty(prop)) {
            let result = statusCodes[prop];
            if (statusCode.match(prop)) {
                meaning = result;
                break;
            }

        }
    }
    return {
        code: statusCode,
        meaning: meaning
    };
};
ResponseApdu.prototype.getStatusCode = function() {
    return this.data.substr(-4);
};
ResponseApdu.prototype.isOk = function() {
    return this.getStatusCode() === '9000';
};
ResponseApdu.prototype.getBuffer = function() {
    return this.buffer;
};
ResponseApdu.prototype.hasMoreBytesAvailable = function() {
    return this.data.substr(-4, 2) === '61';
};
ResponseApdu.prototype.numberOfBytesAvailable = function() {
    let hexLength = this.data.substr(-2, 2);
    return parseInt(hexLength, 16);
};
ResponseApdu.prototype.isWrongLength = function() {
    return this.data.substr(-4, 2) === '6c';
};
ResponseApdu.prototype.correctLength = function() {
    let hexLength = this.data.substr(-2, 2);
    return parseInt(hexLength, 16);
};
ResponseApdu.prototype.toString = function() {
    return this.data;
};


function create(buffer) {
    return new ResponseApdu(buffer);
}

module.exports = create;