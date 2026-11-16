import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import createIso7816 from './iso7816-application.js';
import type { Card } from './iso7816-application.js';
import createCommandApdu from './command-apdu.js';

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

        it('should retry an extended command that gets 6C00 with Le 256, not 65536', async () => {
            const transmit = vi.fn<Card['transmit']>();
            transmit
                .mockResolvedValueOnce(Buffer.from([0x6c, 0x00]))
                .mockResolvedValueOnce(Buffer.from([0x90, 0x00]));
            const app = createIso7816({ atr: Buffer.from([0x3b, 0x00]), transmit });

            const extended = createCommandApdu({
                cla: 0x00,
                ins: 0xd6,
                p1: 0x00,
                p2: 0x00,
                data: new Array<number>(300).fill(0),
            });
            const response = await app.issueCommand(extended);

            expect(response.isOk()).toBe(true);
            const retried = transmit.mock.calls[1][0];
            expect(retried.subarray(-2).toString('hex')).toBe('0100');
        });
    });

    describe('invalid arguments', () => {
        it('should reject, not throw, when a command cannot be encoded', async () => {
            const app = createIso7816({
                atr: Buffer.from([0x3b, 0x00]),
                transmit: vi.fn(() => Promise.resolve(Buffer.from([0x90, 0x00]))),
            });

            const result = app.readRecord(32, 1); // P2 would be (32 << 3) + 4 = 260

            await expect(result).rejects.toThrow(RangeError);
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

        it('should keep the data from every GET RESPONSE when the card sends it in chunks', async () => {
            const data = Buffer.from(Array.from({ length: 300 }, (_, i) => i & 0xff));
            const transmit = vi.fn<Card['transmit']>();
            transmit
                .mockResolvedValueOnce(Buffer.from([0x61, 0x00])) // 256 or more bytes waiting
                .mockResolvedValueOnce(
                    Buffer.concat([data.subarray(0, 256), Buffer.from([0x61, 44])])
                )
                .mockResolvedValueOnce(
                    Buffer.concat([data.subarray(256), Buffer.from([0x90, 0x00])])
                );
            const app = createIso7816({ atr: Buffer.from([0x3b, 0x00]), transmit });

            const response = await app.readRecord(1, 1);

            expect(response.getBuffer()).toEqual(Buffer.concat([data, Buffer.from([0x90, 0x00])]));
        });

        it('should return all the data, in order, however the card splits it', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Data sent with the command's own 61xx response, which may be empty
                    fc.uint8Array({ maxLength: 256 }),
                    // Data sent with each GET RESPONSE
                    fc.array(fc.uint8Array({ minLength: 1, maxLength: 256 }), { maxLength: 6 }),
                    async (first, chunks) => {
                        // Each response announces the size of the next chunk with 61xx, where
                        // 00 means 256. The last one ends with 9000.
                        const all = [first, ...chunks];
                        const responses = all.map((chunk, i) => {
                            const next = all[i + 1];
                            const sw = next ? [0x61, next.length & 0xff] : [0x90, 0x00];
                            return Buffer.from([...chunk, ...sw]);
                        });
                        const transmit = vi.fn<Card['transmit']>();
                        responses.forEach((r) => transmit.mockResolvedValueOnce(r));
                        const app = createIso7816({ atr: Buffer.from([0x3b, 0x00]), transmit });

                        const response = await app.issueCommand(
                            createCommandApdu({ cla: 0x00, ins: 0xb0, p1: 0x00, p2: 0x00 })
                        );

                        const expected = Buffer.concat([...all, Buffer.from([0x90, 0x00])]);
                        const getResponses = transmit.mock.calls
                            .slice(1)
                            .map(([c]) => Buffer.from(c));
                        return (
                            response.getBuffer().equals(expected) &&
                            getResponses.length === chunks.length &&
                            getResponses.every(
                                (c, k) => c[1] === 0xc0 && c[4] === (chunks[k].length & 0xff)
                            )
                        );
                    }
                )
            );
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
