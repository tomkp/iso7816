'use strict';

var CommandApdu = require('../lib/command-apdu');
var assert = require('assert');

describe('CommandApdu', function() {
    describe('toString()', function() {
        it('should return hex string representation of the APDU', function() {
            var apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            var result = apdu.toString();

            // Should not throw and should return a hex string
            assert.ok(typeof result === 'string', 'toString() should return a string');
            assert.ok(result.length > 0, 'toString() should return a non-empty string');
        });

        it('should return correct hex for a SELECT command', function() {
            var apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00,
                data: [0x31, 0x50, 0x41, 0x59]
            });

            var result = apdu.toString();

            // CLA=00, INS=A4, P1=04, P2=00, LC=04, DATA=31504159, LE=00
            assert.ok(result.toLowerCase().includes('00a40400'), 'Should contain command header');
        });
    });

    describe('toBuffer()', function() {
        it('should return a Buffer instance', function() {
            var apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            var result = apdu.toBuffer();

            assert.ok(Buffer.isBuffer(result), 'toBuffer() should return a Buffer');
        });

        it('should contain correct bytes', function() {
            var apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            var result = apdu.toBuffer();

            assert.strictEqual(result[0], 0x00, 'CLA should be 0x00');
            assert.strictEqual(result[1], 0xA4, 'INS should be 0xA4');
            assert.strictEqual(result[2], 0x04, 'P1 should be 0x04');
            assert.strictEqual(result[3], 0x00, 'P2 should be 0x00');
        });
    });
});
