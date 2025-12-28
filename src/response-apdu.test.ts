import { describe, it, expect } from 'vitest';
import { createResponseApdu } from './index.js';

describe('ResponseApdu', () => {
    describe('constructor', () => {
        it('should throw error for empty buffer', () => {
            expect(() => createResponseApdu(Buffer.from([]))).toThrow(/at least 2 bytes/i);
        });

        it('should throw error for single byte buffer', () => {
            expect(() => createResponseApdu(Buffer.from([0x90]))).toThrow(/at least 2 bytes/i);
        });

        it('should accept buffer with exactly 2 bytes', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));
            expect(response.isOk()).toBe(true);
        });
    });

    describe('getBuffer()', () => {
        it('should return the original buffer', () => {
            const originalBuffer = Buffer.from([0x90, 0x00]);
            const response = createResponseApdu(originalBuffer);

            const result = response.getBuffer();

            expect(Buffer.isBuffer(result)).toBe(true);
            expect(result).toEqual(originalBuffer);
        });
    });

    describe('getStatusCode()', () => {
        it('should return last 4 hex characters as status code', () => {
            const response = createResponseApdu(Buffer.from([0x6a, 0x82]));

            expect(response.getStatusCode()).toBe('6a82');
        });

        it('should extract status from longer response', () => {
            const response = createResponseApdu(Buffer.from([0x01, 0x02, 0x03, 0x90, 0x00]));

            expect(response.getStatusCode()).toBe('9000');
        });
    });

    describe('isOk()', () => {
        it('should return true for 9000 status', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            expect(response.isOk()).toBe(true);
        });

        it('should return false for error status', () => {
            const response = createResponseApdu(Buffer.from([0x6a, 0x82]));

            expect(response.isOk()).toBe(false);
        });
    });

    describe('hasMoreBytesAvailable()', () => {
        it('should return true for 61xx status', () => {
            const response = createResponseApdu(Buffer.from([0x61, 0x10]));

            expect(response.hasMoreBytesAvailable()).toBe(true);
        });

        it('should return false for 9000 status', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            expect(response.hasMoreBytesAvailable()).toBe(false);
        });
    });

    describe('numberOfBytesAvailable()', () => {
        it('should return number of bytes from 61xx status', () => {
            const response = createResponseApdu(Buffer.from([0x61, 0x10]));

            expect(response.numberOfBytesAvailable()).toBe(16);
        });
    });

    describe('isWrongLength()', () => {
        it('should return true for 6cxx status', () => {
            const response = createResponseApdu(Buffer.from([0x6c, 0x20]));

            expect(response.isWrongLength()).toBe(true);
        });

        it('should return false for 9000 status', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            expect(response.isWrongLength()).toBe(false);
        });
    });

    describe('correctLength()', () => {
        it('should return correct length from 6cxx status', () => {
            const response = createResponseApdu(Buffer.from([0x6c, 0x20]));

            expect(response.correctLength()).toBe(32);
        });
    });

    describe('toString()', () => {
        it('should return hex string of response', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            expect(response.toString()).toBe('9000');
        });
    });

    describe('getStatus()', () => {
        it('should return status object with code and meaning', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            const status = response.getStatus();

            expect(status.code).toBe('9000');
            expect(status.meaning).toBe('Normal processing');
        });

        it('should return correct meaning for file not found (6a82)', () => {
            const response = createResponseApdu(Buffer.from([0x6a, 0x82]));

            const status = response.getStatus();

            expect(status.code).toBe('6a82');
            expect(status.meaning.toLowerCase()).toContain('not found');
        });

        it('should return correct meaning for authentication failed (6300)', () => {
            const response = createResponseApdu(Buffer.from([0x63, 0x00]));

            const status = response.getStatus();

            expect(status.code).toBe('6300');
            expect(status.meaning.toLowerCase()).toContain('authentication');
        });

        it('should return Unknown for unrecognized status code', () => {
            const response = createResponseApdu(Buffer.from([0xaa, 0xbb]));

            const status = response.getStatus();

            expect(status.code).toBe('aabb');
            expect(status.meaning).toBe('Unknown');
        });
    });
});
