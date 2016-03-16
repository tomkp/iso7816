var command = require('./command');
var response = require('./response');


var ins = {
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


function iso7816(cardReader) {

    var issueCommand = function (commandApdu) {
        console.log(`iso7816.issueCommand '${commandApdu}' `);
        return cardReader
            .issueCommand(commandApdu.toBuffer())
            .then(function (resp) {
                var responsex = response(resp);
                console.log(`status code '${responsex.statusCode()}'`);
                if (responsex.hasMoreBytesAvailable()) {
                    console.log(`has '${responsex.numberOfBytesAvailable()}' more bytes available`);
                    return getResponse(responsex.numberOfBytesAvailable());
                } else if (responsex.isWrongLength()) {
                    console.log(`'le' should be '${responsex.correctLength()}' bytes`);
                    commandApdu.setLe(responsex.correctLength());
                    return issueCommand(commandApdu);
                }
                console.log(`return response '${responsex}' `);
                return responsex;
            });
    };
    var selectFile = function (bytes) {
        console.info(`iso7816.selectFile, file='${bytes}'`);
        return issueCommand(command({
            cla: 0x00,
            ins: ins.SELECT_FILE,
            p1: 0x04,
            p2: 0x00,
            data: bytes
        }));
    };
    var getResponse = function (length) {
        console.info(`iso7816.getResponse, length='${length}'`);
        return issueCommand(command({
            cla: 0x00,
            ins: ins.GET_RESPONSE,
            p1: 0x00,
            p2: 0x00,
            le: length
        }));
    };
    var readRecord = function (sfi, record) {
        console.info(`iso7816.readRecord, sfi='${sfi}', record=${record}`);
        return issueCommand(command({
            cla: 0x00,
            ins: ins.READ_RECORD,
            p1: record,
            p2: (sfi << 3) + 4,
            le: 0
        }));
    };
    return {
        issueCommand: issueCommand,
        selectFile: selectFile,
        getResponse: getResponse,
        readRecord: readRecord
    };
}

module.exports = iso7816;