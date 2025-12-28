import { describe, it, expect } from 'vitest';
import { createCommandApdu } from './index.js';

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

            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
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

            expect(result.toLowerCase()).toContain('00a40400');
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

            expect(Buffer.isBuffer(result)).toBe(true);
        });

        it('should contain correct bytes', () => {
            const apdu = createCommandApdu({
                cla: 0x00,
                ins: 0xa4,
                p1: 0x04,
                p2: 0x00,
            });

            const result = apdu.toBuffer();

            expect(result[0]).toBe(0x00);
            expect(result[1]).toBe(0xa4);
            expect(result[2]).toBe(0x04);
            expect(result[3]).toBe(0x00);
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

            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toBe(0x00);
            expect(result[1]).toBe(0xa4);
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

            expect(bytes[bytes.length - 1]).toBe(0x10);
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
            expect(bytes2[0]).toBe(0x00);
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

            expect(bytes.length).toBe(5);
            expect(bytes[0]).toBe(0x00);
            expect(bytes[1]).toBe(0xc0);
            expect(bytes[2]).toBe(0x00);
            expect(bytes[3]).toBe(0x00);
            expect(bytes[4]).toBe(0x10);
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

            expect(bytes.length).toBe(9);
            expect(bytes[0]).toBe(0x00);
            expect(bytes[1]).toBe(0xa4);
            expect(bytes[2]).toBe(0x04);
            expect(bytes[3]).toBe(0x00);
            expect(bytes[4]).toBe(0x03);
            expect(bytes[5]).toBe(0xa0);
            expect(bytes[6]).toBe(0x00);
            expect(bytes[7]).toBe(0x00);
            expect(bytes[8]).toBe(0x10);
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

            expect(bytes.length).toBe(4 + 1 + 100 + 1);
            expect(bytes[4]).toBe(100);
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

            expect(hex).toBe('00a40400043150415900');
        });
    });
});
