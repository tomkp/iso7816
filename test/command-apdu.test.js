import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createCommandApdu } from '../dist/index.js';

describe('CommandApdu', () => {
    describe('toString()', () => {
        it('should return hex string representation of the APDU', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
            });

            const result = apdu.toString();

            assert.ok(typeof result === 'string', 'toString() should return a string');
            assert.ok(result.length > 0, 'toString() should return a non-empty string');
        });

        it('should return correct hex for a SELECT command', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
                data: [0x31, 0x50, 0x41, 0x59],
            });

            const result = apdu.toString();

            assert.ok(result.toLowerCase().includes('00a40400'), 'Should contain command header');
        });
    });

    describe('toBuffer()', () => {
        it('should return a Buffer instance', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
            });

            const result = apdu.toBuffer();

            assert.ok(Buffer.isBuffer(result), 'toBuffer() should return a Buffer');
        });

        it('should contain correct bytes', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
            });

            const result = apdu.toBuffer();

            assert.strictEqual(result[0], 0x00, 'CLA should be 0x00');
            assert.strictEqual(result[1], 0xa4, 'INS should be 0xA4');
            assert.strictEqual(result[2], 0x04, 'P1 should be 0x04');
            assert.strictEqual(result[3], 0x00, 'P2 should be 0x00');
        });
    });

    describe('toByteArray()', () => {
        it('should return an array of bytes', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
            });

            const result = apdu.toByteArray();

            assert.ok(Array.isArray(result), 'toByteArray() should return an array');
            assert.strictEqual(result[0], 0x00);
            assert.strictEqual(result[1], 0xa4);
        });
    });

    describe('setLe()', () => {
        it('should update the LE byte', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
            });

            apdu.setLe(0x10);
            const bytes = apdu.toByteArray();

            assert.strictEqual(
                bytes[bytes.length - 1],
                0x10,
                'Last byte should be the new LE value'
            );
        });
    });

    describe('bytes getter', () => {
        it('should return a copy to prevent external mutation', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
            });

            const bytes1 = apdu.bytes;
            bytes1[0] = 0xff;

            const bytes2 = apdu.bytes;
            assert.strictEqual(bytes2[0], 0x00, 'Original bytes should be unchanged');
        });
    });

    describe('APDU case handling', () => {
        it('should build APDU with Le only (no data) - Case 2', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xc0,
                p1: 0x00,
                p2: 0x00,
                le: 0x10,
            });

            const bytes = apdu.toByteArray();

            // Case 2: CLA INS P1 P2 Le
            assert.strictEqual(bytes.length, 5);
            assert.strictEqual(bytes[0], 0x00);
            assert.strictEqual(bytes[1], 0xc0);
            assert.strictEqual(bytes[2], 0x00);
            assert.strictEqual(bytes[3], 0x00);
            assert.strictEqual(bytes[4], 0x10);
        });

        it('should build APDU with data and Le - Case 4', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
                data: [0xa0, 0x00, 0x00],
                le: 0x10,
            });

            const bytes = apdu.toByteArray();

            // Case 4: CLA INS P1 P2 Lc Data Le
            assert.strictEqual(bytes.length, 9);
            assert.strictEqual(bytes[0], 0x00); // CLA
            assert.strictEqual(bytes[1], 0xa4); // INS
            assert.strictEqual(bytes[2], 0x04); // P1
            assert.strictEqual(bytes[3], 0x00); // P2
            assert.strictEqual(bytes[4], 0x03); // Lc (data length)
            assert.strictEqual(bytes[5], 0xa0); // Data byte 1
            assert.strictEqual(bytes[6], 0x00); // Data byte 2
            assert.strictEqual(bytes[7], 0x00); // Data byte 3
            assert.strictEqual(bytes[8], 0x10); // Le
        });

        it('should handle larger data arrays', () => {
            const data = Array.from({ length: 100 }, (_, i) => i % 256);
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xd6,
                p1: 0x00,
                p2: 0x00,
                data,
            });

            const bytes = apdu.toByteArray();

            // CLA INS P1 P2 Lc Data Le
            assert.strictEqual(bytes.length, 4 + 1 + 100 + 1);
            assert.strictEqual(bytes[4], 100); // Lc should be 100
        });

        it('should include data correctly in output', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
                data: [0x31, 0x50, 0x41, 0x59],
            });

            const hex = apdu.toString();

            // Should contain: 00 a4 04 00 04 31 50 41 59 00
            assert.strictEqual(hex, '00a404000431504159' + '00');
        });
    });
});
