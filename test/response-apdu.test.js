import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createResponseApdu } from '../dist/index.js';

describe('ResponseApdu', () => {
    describe('getBuffer()', () => {
        it('should return the original buffer', () => {
            const originalBuffer = Buffer.from([0x90, 0x00]);
            const response = createResponseApdu(originalBuffer);

            const result = response.getBuffer();

            assert.ok(Buffer.isBuffer(result), 'getBuffer() should return a Buffer');
            assert.deepStrictEqual(result, originalBuffer, 'Should return the original buffer');
        });
    });

    describe('getStatusCode()', () => {
        it('should return last 4 hex characters as status code', () => {
            const response = createResponseApdu(Buffer.from([0x6A, 0x82]));

            assert.strictEqual(response.getStatusCode(), '6a82');
        });

        it('should extract status from longer response', () => {
            const response = createResponseApdu(Buffer.from([0x01, 0x02, 0x03, 0x90, 0x00]));

            assert.strictEqual(response.getStatusCode(), '9000');
        });
    });

    describe('isOk()', () => {
        it('should return true for 9000 status', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            assert.strictEqual(response.isOk(), true);
        });

        it('should return false for error status', () => {
            const response = createResponseApdu(Buffer.from([0x6A, 0x82]));

            assert.strictEqual(response.isOk(), false);
        });
    });

    describe('hasMoreBytesAvailable()', () => {
        it('should return true for 61xx status', () => {
            const response = createResponseApdu(Buffer.from([0x61, 0x10]));

            assert.strictEqual(response.hasMoreBytesAvailable(), true);
        });

        it('should return false for 9000 status', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            assert.strictEqual(response.hasMoreBytesAvailable(), false);
        });
    });

    describe('numberOfBytesAvailable()', () => {
        it('should return number of bytes from 61xx status', () => {
            const response = createResponseApdu(Buffer.from([0x61, 0x10]));

            assert.strictEqual(response.numberOfBytesAvailable(), 16);
        });
    });

    describe('isWrongLength()', () => {
        it('should return true for 6cxx status', () => {
            const response = createResponseApdu(Buffer.from([0x6C, 0x20]));

            assert.strictEqual(response.isWrongLength(), true);
        });

        it('should return false for 9000 status', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            assert.strictEqual(response.isWrongLength(), false);
        });
    });

    describe('correctLength()', () => {
        it('should return correct length from 6cxx status', () => {
            const response = createResponseApdu(Buffer.from([0x6C, 0x20]));

            assert.strictEqual(response.correctLength(), 32);
        });
    });

    describe('toString()', () => {
        it('should return hex string of response', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            assert.strictEqual(response.toString(), '9000');
        });
    });

    describe('getStatus()', () => {
        it('should return status object with code and meaning', () => {
            const response = createResponseApdu(Buffer.from([0x90, 0x00]));

            const status = response.getStatus();

            assert.strictEqual(status.code, '9000');
            assert.strictEqual(status.meaning, 'Normal processing');
        });
    });
});
