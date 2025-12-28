import { describe, it, expect, vi } from 'vitest';
import createIso7816 from './iso7816-application.js';
import type { Card } from './iso7816-application.js';

describe('Iso7816', () => {
    describe('issueCommand()', () => {
        it('should throw error after max retries when card keeps returning wrong length', async () => {
            const mockCard: Card = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: vi.fn(() => Promise.resolve(Buffer.from([0x6c, 0x10]))),
            };

            const app = createIso7816(mockCard);

            await expect(app.selectFile([0xa0, 0x00, 0x00])).rejects.toThrow(/max.*retr/i);

            expect(mockCard.transmit).toHaveBeenCalled();
            expect(
                (mockCard.transmit as ReturnType<typeof vi.fn>).mock.calls.length
            ).toBeLessThanOrEqual(5);
        });

        it('should succeed on first try when card returns success', async () => {
            const mockCard: Card = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: vi.fn(() => Promise.resolve(Buffer.from([0x90, 0x00]))),
            };

            const app = createIso7816(mockCard);
            const response = await app.selectFile([0xa0, 0x00, 0x00]);

            expect(response.isOk()).toBe(true);
            expect(mockCard.transmit).toHaveBeenCalledTimes(1);
        });

        it('should retry once and succeed when card returns correct length on second attempt', async () => {
            let callCount = 0;
            const mockCard: Card = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: vi.fn(() => {
                    callCount++;
                    if (callCount === 1) {
                        return Promise.resolve(Buffer.from([0x6c, 0x10]));
                    }
                    return Promise.resolve(Buffer.from([0x90, 0x00]));
                }),
            };

            const app = createIso7816(mockCard);
            const response = await app.selectFile([0xa0, 0x00, 0x00]);

            expect(response.isOk()).toBe(true);
            expect(mockCard.transmit).toHaveBeenCalledTimes(2);
        });
    });

    describe('selectFile()', () => {
        it('should send correct APDU for file selection', async () => {
            const mockCard: Card = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: vi.fn((buffer: Buffer) => {
                    expect(buffer[0]).toBe(0x00);
                    expect(buffer[1]).toBe(0xa4);
                    expect(buffer[2]).toBe(0x04);
                    expect(buffer[3]).toBe(0x00);
                    return Promise.resolve(Buffer.from([0x90, 0x00]));
                }),
            };

            const app = createIso7816(mockCard);
            await app.selectFile([0xa0, 0x00, 0x00]);

            expect(mockCard.transmit).toHaveBeenCalledTimes(1);
        });
    });

    describe('getResponse()', () => {
        it('should automatically fetch more bytes when 61xx status received', async () => {
            let callCount = 0;
            const mockCard: Card = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: vi.fn(() => {
                    callCount++;
                    if (callCount === 1) {
                        return Promise.resolve(Buffer.from([0x61, 0x10]));
                    }
                    return Promise.resolve(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x90, 0x00]));
                }),
            };

            const app = createIso7816(mockCard);
            const response = await app.selectFile([0xa0, 0x00, 0x00]);

            expect(response.isOk()).toBe(true);
            expect(mockCard.transmit).toHaveBeenCalledTimes(2);
        });
    });

    describe('readRecord()', () => {
        it('should send correct APDU for reading a record', async () => {
            const mockCard: Card = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: vi.fn((buffer: Buffer) => {
                    expect(buffer[0]).toBe(0x00); // CLA
                    expect(buffer[1]).toBe(0xb2); // INS (READ RECORD)
                    expect(buffer[2]).toBe(0x01); // P1 (record number)
                    expect(buffer[3]).toBe(0x14); // P2 (SFI 2 << 3) + 4 = 20 = 0x14
                    return Promise.resolve(Buffer.from([0x01, 0x02, 0x03, 0x90, 0x00]));
                }),
            };

            const app = createIso7816(mockCard);
            const response = await app.readRecord(2, 1);

            expect(response.isOk()).toBe(true);
            expect(mockCard.transmit).toHaveBeenCalledTimes(1);
        });
    });

    describe('getData()', () => {
        it('should send correct APDU for getting data', async () => {
            const mockCard: Card = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: vi.fn((buffer: Buffer) => {
                    expect(buffer[0]).toBe(0x00); // CLA
                    expect(buffer[1]).toBe(0xca); // INS (GET DATA)
                    expect(buffer[2]).toBe(0x9f); // P1
                    expect(buffer[3]).toBe(0x36); // P2
                    return Promise.resolve(Buffer.from([0x9f, 0x36, 0x02, 0x00, 0x60, 0x90, 0x00]));
                }),
            };

            const app = createIso7816(mockCard);
            const response = await app.getData(0x9f, 0x36);

            expect(response.isOk()).toBe(true);
            expect(mockCard.transmit).toHaveBeenCalledTimes(1);
        });
    });

    describe('card getter', () => {
        it('should return the underlying card', () => {
            const mockCard: Card = {
                atr: Buffer.from([0x3b, 0x00]),
                transmit: vi.fn(),
            };

            const app = createIso7816(mockCard);

            expect(app.card).toBe(mockCard);
            expect(app.card.atr).toEqual(Buffer.from([0x3b, 0x00]));
        });
    });
});
