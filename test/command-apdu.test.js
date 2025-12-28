import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createCommandApdu } from '../dist/index.js';

describe('CommandApdu', () => {
    describe('toString()', () => {
        it('should return hex string representation of the APDU', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            const result = apdu.toString();

            assert.ok(typeof result === 'string', 'toString() should return a string');
            assert.ok(result.length > 0, 'toString() should return a non-empty string');
        });

        it('should return correct hex for a SELECT command', () => {
            const apdu = createCommandApdu({
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

    describe('toBuffer()', () => {
        it('should return a Buffer instance', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xA4,
                p1: 0x04,
                p2: 0x00
            });

            const result = apdu.toBuffer();

            assert.ok(Buffer.isBuffer(result), 'toBuffer() should return a Buffer');
        });

        it('should contain correct bytes', () => {
            const apdu = createCommandApdu({
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

    describe('toByteArray()', () => {
        it('should return an array of bytes', () => {
            const apdu = createCommandApdu({
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

    describe('setLe()', () => {
        it('should update the LE byte', () => {
            const apdu = createCommandApdu({
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
