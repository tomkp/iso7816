import assert from 'assert';
import CommandApdu from '../src/command-apdu.js';

describe('CommandApdu', function() {
    describe('toString()', function() {
        it('should return hex string representation of the APDU', function() {
            const apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            const result = apdu.toString();

            assert.ok(typeof result === 'string', 'toString() should return a string');
            assert.ok(result.length > 0, 'toString() should return a non-empty string');
        });

        it('should return correct hex for a SELECT command', function() {
            const apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00,
                data: [0x31, 0x50, 0x41, 0x59]
            });

            const result = apdu.toString();

            assert.ok(result.toLowerCase().includes('00a40400'), 'Should contain command header');
        });
    });

    describe('toBuffer()', function() {
        it('should return a Buffer instance', function() {
            const apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            const result = apdu.toBuffer();

            assert.ok(Buffer.isBuffer(result), 'toBuffer() should return a Buffer');
        });

        it('should contain correct bytes', function() {
            const apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            const result = apdu.toBuffer();

            assert.strictEqual(result[0], 0x00, 'CLA should be 0x00');
            assert.strictEqual(result[1], 0xA4, 'INS should be 0xA4');
            assert.strictEqual(result[2], 0x04, 'P1 should be 0x04');
            assert.strictEqual(result[3], 0x00, 'P2 should be 0x00');
        });
    });

    describe('toByteArray()', function() {
        it('should return an array of bytes', function() {
            const apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            const result = apdu.toByteArray();

            assert.ok(Array.isArray(result), 'toByteArray() should return an array');
            assert.strictEqual(result[0], 0x00);
            assert.strictEqual(result[1], 0xA4);
        });
    });

    describe('setLe()', function() {
        it('should update the LE byte', function() {
            const apdu = CommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            apdu.setLe(0x10);
            const bytes = apdu.toByteArray();

            assert.strictEqual(bytes[bytes.length - 1], 0x10, 'Last byte should be the new LE value');
        });
    });
});
