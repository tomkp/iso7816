'use strict';

import hexify from "hexify";


function CommandApdu(obj) {

    let size = obj.size;
    let cla = obj.cla;
    let ins = obj.ins;
    let p1 = obj.p1;
    let p2 = obj.p2;
    let data = obj.data;
    let le = obj.le || 0;
    let lc;


    // case 1
    if (!size && !data && !le) {
        //le = -1;
        //console.info('case 1');
        size = 4;
    }
    // case 2
    else if (!size && !data) {
        //console.info('case 2');
        size = 4 + 2;
    }

    // case 3
    else if (!size && !le) {
        //console.info('case 3');
        size = data.length + 5 + 4;
        //le = -1;
    }

    // case 4
    else if (!size) {
        //console.info('case 4');
        size = data.length + 5 + 4;
    }

    // set data
    if (data) {
        lc = data.length;
    } else {
        //lc = 0;
    }

    this.bytes = [];
    this.bytes.push(cla);
    this.bytes.push(ins);
    this.bytes.push(p1);
    this.bytes.push(p2);

    if (data) {
        this.bytes.push(lc);
        this.bytes = this.bytes.concat(data);
    }
    this.bytes.push(le);
}


CommandApdu.prototype.toString = function() {
    return hexify.toHexString(this.bytes);
};

CommandApdu.prototype.toByteArray = function() {
    return this.bytes;
};

CommandApdu.prototype.toBuffer = function() {
    return Buffer.from(this.bytes);
};

CommandApdu.prototype.setLe = function (le) {
    this.bytes.pop();
    this.bytes.push(le);
};

function create(obj) {
    return new CommandApdu(obj);
}

module.exports = create;

