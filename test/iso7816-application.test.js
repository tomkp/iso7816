import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import createIso7816, { Iso7816 } from '../dist/index.js';

describe('Iso7816', () => {
    describe('issueCommand()', () => {
        it('should throw error after max retries when card keeps returning wrong length', async () => {
            // Mock card that always returns 6cxx (wrong length) status
            const mockCard = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: mock.fn(() => Promise.resolve(Buffer.from([0x6c, 0x10]))),
            };

            const app = createIso7816(mockCard);

            await assert.rejects(
                async () => {
                    await app.selectFile([0xa0, 0x00, 0x00]);
                },
                {
                    name: 'Error',
                    message: /max.*retr/i,
                }
            );

            // Should have tried multiple times but not infinitely
            assert.ok(
                mockCard.transmit.mock.calls.length <= 5,
                `Expected at most 5 retries, got ${mockCard.transmit.mock.calls.length}`
            );
        });

        it('should succeed on first try when card returns success', async () => {
            const mockCard = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: mock.fn(() => Promise.resolve(Buffer.from([0x90, 0x00]))),
            };

            const app = createIso7816(mockCard);
            const response = await app.selectFile([0xa0, 0x00, 0x00]);

            assert.strictEqual(response.isOk(), true);
            assert.strictEqual(mockCard.transmit.mock.calls.length, 1);
        });

        it('should retry once and succeed when card returns correct length on second attempt', async () => {
            let callCount = 0;
            const mockCard = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: mock.fn(() => {
                    callCount++;
                    if (callCount === 1) {
                        return Promise.resolve(Buffer.from([0x6c, 0x10])); // Wrong length
                    }
                    return Promise.resolve(Buffer.from([0x90, 0x00])); // Success
                }),
            };

            const app = createIso7816(mockCard);
            const response = await app.selectFile([0xa0, 0x00, 0x00]);

            assert.strictEqual(response.isOk(), true);
            assert.strictEqual(mockCard.transmit.mock.calls.length, 2);
        });
    });

    describe('selectFile()', () => {
        it('should send correct APDU for file selection', async () => {
            const mockCard = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: mock.fn((buffer) => {
                    // Verify APDU structure: CLA INS P1 P2 Lc Data Le
                    assert.strictEqual(buffer[0], 0x00, 'CLA should be 0x00');
                    assert.strictEqual(buffer[1], 0xa4, 'INS should be SELECT_FILE (0xA4)');
                    assert.strictEqual(buffer[2], 0x04, 'P1 should be 0x04');
                    assert.strictEqual(buffer[3], 0x00, 'P2 should be 0x00');
                    return Promise.resolve(Buffer.from([0x90, 0x00]));
                }),
            };

            const app = createIso7816(mockCard);
            await app.selectFile([0xa0, 0x00, 0x00]);

            assert.strictEqual(mockCard.transmit.mock.calls.length, 1);
        });
    });

    describe('getResponse()', () => {
        it('should automatically fetch more bytes when 61xx status received', async () => {
            let callCount = 0;
            const mockCard = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: mock.fn(() => {
                    callCount++;
                    if (callCount === 1) {
                        return Promise.resolve(Buffer.from([0x61, 0x10])); // More bytes available
                    }
                    return Promise.resolve(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x90, 0x00])); // Data + success
                }),
            };

            const app = createIso7816(mockCard);
            const response = await app.selectFile([0xa0, 0x00, 0x00]);

            assert.strictEqual(response.isOk(), true);
            assert.strictEqual(mockCard.transmit.mock.calls.length, 2);
        });
    });
});
