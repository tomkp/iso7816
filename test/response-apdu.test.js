import assert from 'assert';
import ResponseApdu from '../src/response-apdu.js';

describe('ResponseApdu', function() {
    describe('getBuffer()', function() {
        it('should return the original buffer', function() {
            const originalBuffer = Buffer.from([0x90, 0x00]);
            const response = ResponseApdu(originalBuffer);

            const result = response.getBuffer();

            assert.ok(Buffer.isBuffer(result), 'getBuffer() should return a Buffer');
            assert.deepStrictEqual(result, originalBuffer, 'Should return the original buffer');
        });
    });

    describe('getStatusCode()', function() {
        it('should return last 4 hex characters as status code', function() {
            const response = ResponseApdu(Buffer.from([0x6A, 0x82]));

            assert.strictEqual(response.getStatusCode(), '6a82');
        });

        it('should extract status from longer response', function() {
            const response = ResponseApdu(Buffer.from([0x01, 0x02, 0x03, 0x90, 0x00]));

            assert.strictEqual(response.getStatusCode(), '9000');
        });
    });

    describe('isOk()', function() {
        it('should return true for 9000 status', function() {
            const response = ResponseApdu(Buffer.from([0x90, 0x00]));

            assert.strictEqual(response.isOk(), true);
        });

        it('should return false for error status', function() {
            const response = ResponseApdu(Buffer.from([0x6A, 0x82]));

            assert.strictEqual(response.isOk(), false);
        });
    });

    describe('hasMoreBytesAvailable()', function() {
        it('should return true for 61xx status', function() {
            const response = ResponseApdu(Buffer.from([0x61, 0x10]));

            assert.strictEqual(response.hasMoreBytesAvailable(), true);
        });

        it('should return false for 9000 status', function() {
            const response = ResponseApdu(Buffer.from([0x90, 0x00]));

            assert.strictEqual(response.hasMoreBytesAvailable(), false);
        });
    });

    describe('numberOfBytesAvailable()', function() {
        it('should return number of bytes from 61xx status', function() {
            const response = ResponseApdu(Buffer.from([0x61, 0x10]));

            assert.strictEqual(response.numberOfBytesAvailable(), 16);
        });
    });

    describe('isWrongLength()', function() {
        it('should return true for 6cxx status', function() {
            const response = ResponseApdu(Buffer.from([0x6C, 0x20]));

            assert.strictEqual(response.isWrongLength(), true);
        });

        it('should return false for 9000 status', function() {
            const response = ResponseApdu(Buffer.from([0x90, 0x00]));

            assert.strictEqual(response.isWrongLength(), false);
        });
    });

    describe('correctLength()', function() {
        it('should return correct length from 6cxx status', function() {
            const response = ResponseApdu(Buffer.from([0x6C, 0x20]));

            assert.strictEqual(response.correctLength(), 32);
        });
    });

    describe('toString()', function() {
        it('should return hex string of response', function() {
            const response = ResponseApdu(Buffer.from([0x90, 0x00]));

            assert.strictEqual(response.toString(), '9000');
        });
    });

    describe('getStatus()', function() {
        it('should return status object with code and meaning', function() {
            const response = ResponseApdu(Buffer.from([0x90, 0x00]));

            const status = response.getStatus();

            assert.strictEqual(status.code, '9000');
            assert.strictEqual(status.meaning, 'Normal processing');
        });
    });
});
