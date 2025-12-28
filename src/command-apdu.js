import hexify from 'hexify';

function CommandApdu(obj) {
    let size = obj.size;
    const cla = obj.cla;
    const ins = obj.ins;
    const p1 = obj.p1;
    const p2 = obj.p2;
    const data = obj.data;
    let le = obj.le || 0;
    let lc;

    // case 1
    if (!size && !data && !le) {
        size = 4;
    }
    // case 2
    else if (!size && !data) {
        size = 4 + 2;
    }
    // case 3
    else if (!size && !le) {
        size = data.length + 5 + 4;
    }
    // case 4
    else if (!size) {
        size = data.length + 5 + 4;
    }

    // set data
    if (data) {
        lc = data.length;
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

CommandApdu.prototype.setLe = function(le) {
    this.bytes.pop();
    this.bytes.push(le);
};

function create(obj) {
    return new CommandApdu(obj);
}

export default create;
