'use strict';

import CommandApdu from './command-apdu';
import ResponseApdu from './response-apdu';


const ins = {
    APPEND_RECORD: 0xE2,
    ENVELOPE: 0xC2,
    ERASE_BINARY: 0x0E,
    EXTERNAL_AUTHENTICATE: 0x82,
    GET_CHALLENGE: 0x84,
    GET_DATA: 0xCA,
    GET_RESPONSE: 0xC0,
    INTERNAL_AUTHENTICATE: 0x88,
    MANAGE_CHANNEL: 0x70,
    PUT_DATA: 0xDA,
    READ_BINARY: 0xB0,
    READ_RECORD: 0xB2,
    SELECT_FILE: 0xA4,
    UPDATE_BINARY: 0xD6,
    UPDATE_RECORD: 0xDC,
    VERIFY: 0x20,
    WRITE_BINARY: 0xD0,
    WRITE_RECORD: 0xD2
};


function Iso7816(card) {
    this.card = card;
}

Iso7816.prototype.issueCommand = function(commandApdu) {
    return this.card
        .transmit(commandApdu.toBuffer())
        .then(resp => {
            var response = ResponseApdu(resp);
            if (response.hasMoreBytesAvailable()) {
                return this.getResponse(response.numberOfBytesAvailable());
            } else if (response.isWrongLength()) {
                commandApdu.setLe(response.correctLength());
                return this.issueCommand(commandApdu);
            }
            return response;
        });
};

Iso7816.prototype.selectFile = function(bytes, p1, p2) {
    return this.issueCommand(CommandApdu({
        cla: 0x00,
        ins: ins.SELECT_FILE,
        p1: p1 || 0x04,
        p2: p2 || 0x00,
        data: bytes
    }));
};

Iso7816.prototype.getResponse = function(length) {
    return this.issueCommand(CommandApdu({
        cla: 0x00,
        ins: ins.GET_RESPONSE,
        p1: 0x00,
        p2: 0x00,
        le: length
    }));
};

Iso7816.prototype.readRecord = function(sfi, record) {
    return this.issueCommand(CommandApdu({
        cla: 0x00,
        ins: ins.READ_RECORD,
        p1: record,
        p2: (sfi << 3) + 4,
        le: 0
    }));
};

Iso7816.prototype.getData = function(p1, p2) {
    return this.issueCommand(CommandApdu({
        cla: 0x00,
        ins: ins.GET_DATA,
        p1: p1,
        p2: p2,
        le: 0
    }));
};


function create(card) {
    return new Iso7816(card);
}

module.exports = create;
