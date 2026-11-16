/**
 * The specification for CommandApdu, written as properties that fast-check checks against
 * hundreds of generated commands.
 *
 * A command APDU (ISO/IEC 7816-4) is a 4-byte header, then optionally Lc and the command data,
 * then optionally Le. This library always sends Le. There are two encodings:
 *
 *   short     data 0-255 bytes, Ne 1-256        CLA INS P1 P2 [Lc data] Le
 *   extended  data up to 65535, Ne up to 65536  CLA INS P1 P2 00 Le1 Le2              (no data)
 *                                               CLA INS P1 P2 00 Lc1 Lc2 data Le1 Le2  (with data)
 *
 * An all-zero Le field means the maximum: Ne = 256 in short form, 65536 in extended form. So
 * `le: 0` asks for the maximum, and `le: 256` and `le: 65536` encode as zeros.
 *
 * The spec:
 *   1. Every value in the encoding is a byte, so all the output methods agree.
 *   2. A strict decoder, written separately from the encoder, reads back exactly the header,
 *      data and Ne that were asked for.
 *   3. The extended form is used only when the command needs it.
 *   4. Commands that version 2.0.0 encoded correctly still encode to the same bytes.
 *   5. Input that can't be encoded is rejected with a RangeError, never silently altered.
 *   6. setLe(n) gives the same bytes as building the command with le: n, and a rejected
 *      setLe leaves the command unchanged.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createCommandApdu, CommandApduOptions } from './index.js';

// ---- An ISO 7816-4 decoder, independent of the encoder under test

interface Decoded {
    cla: number;
    ins: number;
    p1: number;
    p2: number;
    data: number[];
    /** Maximum response length the card may return; undefined when there is no Le field. */
    ne: number | undefined;
    extended: boolean;
}

function decode(bytes: number[]): Decoded {
    const n = bytes.length;
    if (n < 4) throw new Error(`Command APDU too short (${n} bytes)`);
    const [cla, ins, p1, p2] = bytes;
    const header = { cla, ins, p1, p2 };

    if (n === 4) return { ...header, data: [], ne: undefined, extended: false };
    const b4 = bytes[4];
    if (n === 5) return { ...header, data: [], ne: b4 || 256, extended: false };

    if (b4 !== 0) {
        const lc = b4;
        const data = bytes.slice(5, 5 + lc);
        if (n === 5 + lc) return { ...header, data, ne: undefined, extended: false };
        if (n === 6 + lc) return { ...header, data, ne: bytes[n - 1] || 256, extended: false };
        throw new Error(`Lc is ${lc} but ${n - 5} bytes follow it`);
    }

    if (n === 7) {
        return { ...header, data: [], ne: (bytes[5] << 8) | bytes[6] || 65536, extended: true };
    }
    if (n < 7) throw new Error('Inconsistent length bytes');
    const lc = (bytes[5] << 8) | bytes[6];
    if (lc === 0) throw new Error('Extended Lc of zero');
    const data = bytes.slice(7, 7 + lc);
    if (n === 7 + lc) return { ...header, data, ne: undefined, extended: true };
    if (n === 9 + lc) {
        const ne = (bytes[n - 2] << 8) | bytes[n - 1] || 65536;
        return { ...header, data, ne, extended: true };
    }
    throw new Error(`Extended Lc is ${lc} but ${n - 7} bytes follow it`);
}

// ---- What the spec says the encoding should contain

const needsExtended = (o: CommandApduOptions): boolean =>
    (o.data?.length ?? 0) > 255 || (o.le ?? 0) > 256;

function expectedNe(o: CommandApduOptions): number {
    const le = o.le ?? 0;
    if (le === 0) return needsExtended(o) ? 65536 : 256;
    return le;
}

// ---- Generators

const byte = fc.integer({ min: 0, max: 255 });

/**
 * Lengths and Le values are drawn from the whole range, with extra weight near the short/extended
 * boundary and the maximum. Ranges rather than fixed lists, and withCrossShrink, so a failure
 * shrinks to the smallest value that still fails.
 */
const nearBoundaries = (max: number) =>
    fc.oneof(
        { withCrossShrink: true },
        fc.integer({ min: 0, max }),
        fc.integer({ min: 250, max: 262 }),
        fc.integer({ min: max - 8, max })
    );

/** Command data from empty to the 65535-byte maximum. */
const dataArb = fc.oneof(
    { withCrossShrink: true },
    fc.array(byte, { maxLength: 300 }),
    fc
        .record({ length: nearBoundaries(65535), seed: byte })
        .map(({ length, seed }) => Array.from({ length }, (_, i) => (seed + i * 7) & 0xff))
);

const leArb = nearBoundaries(65536);

const validOptions: fc.Arbitrary<CommandApduOptions> = fc.record({
    cla: byte,
    ins: byte,
    p1: byte,
    p2: byte,
    data: fc.option(dataArb, { nil: undefined }),
    le: fc.option(leArb, { nil: undefined }),
});

/** Numbers that are not bytes: too big, negative, fractional, NaN or infinite. */
const notAByte = fc.oneof(
    fc.integer({ min: 256 }),
    fc.integer({ max: -1 }),
    fc.double({ noInteger: true })
);

const badLe = fc.oneof(
    fc.integer({ min: 65537 }),
    fc.integer({ max: -1 }),
    fc.double({ noInteger: true })
);

const hex = (bytes: number[]) => Buffer.from(bytes).toString('hex');

const sameBytes = (a: ArrayLike<number>, b: ArrayLike<number>): boolean =>
    a.length === b.length && Array.from(a).every((x, i) => x === b[i]);

/** True when `fn` throws a RangeError. */
function rejects(fn: () => unknown): boolean {
    try {
        fn();
    } catch (e) {
        return e instanceof RangeError;
    }
    return false;
}

// ---- The properties
//
// Each property returns true or false rather than calling expect(), so that when one fails,
// fast-check can shrink a 65535-byte counterexample quickly and report the smallest one it finds.

describe('CommandApdu specification', () => {
    it('1. every value in the encoding is a byte, so all the output methods agree', () => {
        fc.assert(
            fc.property(validOptions, (o) => {
                const apdu = createCommandApdu(o);
                const bytes = apdu.toByteArray();
                return (
                    bytes.every((b) => Number.isInteger(b) && b >= 0 && b <= 255) &&
                    sameBytes(apdu.toBuffer(), bytes) &&
                    sameBytes(apdu.bytes, bytes) &&
                    apdu.toString() === hex(bytes)
                );
            })
        );
    });

    it('2. a separate decoder reads back exactly the header, data and Ne asked for', () => {
        fc.assert(
            fc.property(validOptions, (o) => {
                const d = decode(createCommandApdu(o).toByteArray());
                return (
                    d.cla === o.cla &&
                    d.ins === o.ins &&
                    d.p1 === o.p1 &&
                    d.p2 === o.p2 &&
                    sameBytes(d.data, o.data ?? []) &&
                    d.ne === expectedNe(o)
                );
            })
        );
    });

    it('3. the extended form is used only when the command needs it', () => {
        fc.assert(
            fc.property(validOptions, (o) => {
                return decode(createCommandApdu(o).toByteArray()).extended === needsExtended(o);
            })
        );
    });

    it('4. commands that 2.0.0 encoded correctly still encode to the same bytes', () => {
        const legacyOptions = fc.record({
            cla: byte,
            ins: byte,
            p1: byte,
            p2: byte,
            data: fc.option(fc.array(byte, { minLength: 1, maxLength: 255 }), { nil: undefined }),
            le: fc.option(byte, { nil: undefined }),
        });
        fc.assert(
            fc.property(legacyOptions, (o) => {
                const { cla, ins, p1, p2, data, le = 0 } = o;
                const legacy = [cla, ins, p1, p2, ...(data ? [data.length, ...data] : []), le];
                return sameBytes(createCommandApdu(o).toByteArray(), legacy);
            })
        );
    });

    describe('5. input that cannot be encoded is rejected with a RangeError', () => {
        it('a header byte out of range', () => {
            const field = fc.constantFrom('cla', 'ins', 'p1', 'p2');
            fc.assert(
                fc.property(validOptions, field, notAByte, (o, f, bad) =>
                    rejects(() => createCommandApdu({ ...o, [f]: bad }))
                )
            );
        });

        it('a data byte out of range', () => {
            fc.assert(
                fc.property(
                    validOptions,
                    fc.array(byte, { minLength: 1, maxLength: 300 }),
                    fc.nat(),
                    notAByte,
                    (o, data, i, bad) => {
                        // A new array: mutating a generated value breaks fast-check's shrinking.
                        const at = i % data.length;
                        const withBad = data.map((b, j) => (j === at ? bad : b));
                        return rejects(() => createCommandApdu({ ...o, data: withBad }));
                    }
                )
            );
        });

        it('Le out of range', () => {
            fc.assert(
                fc.property(validOptions, badLe, (o, le) =>
                    rejects(() => createCommandApdu({ ...o, le }))
                )
            );
        });

        it('data longer than 65535 bytes', () => {
            const data = new Array<number>(65536).fill(0);
            expect(
                rejects(() => createCommandApdu({ cla: 0, ins: 0xd6, p1: 0, p2: 0, data }))
            ).toBe(true);
        });

        it('data longer than 65535 bytes that has no length, such as a generator', () => {
            function* zeros(n: number) {
                for (let i = 0; i < n; i++) yield 0;
            }
            const data = zeros(65536) as unknown as number[];
            expect(
                rejects(() => createCommandApdu({ cla: 0, ins: 0xd6, p1: 0, p2: 0, data }))
            ).toBe(true);
        });
    });

    describe('6. setLe', () => {
        it('gives the same bytes as building the command with that Le', () => {
            fc.assert(
                fc.property(validOptions, leArb, (o, le) => {
                    const apdu = createCommandApdu(o);
                    apdu.setLe(le);
                    return sameBytes(
                        apdu.toByteArray(),
                        createCommandApdu({ ...o, le }).toByteArray()
                    );
                })
            );
        });

        it('leaves the command unchanged when it rejects the Le', () => {
            fc.assert(
                fc.property(validOptions, badLe, (o, le) => {
                    const apdu = createCommandApdu(o);
                    const before = apdu.bytes;
                    return rejects(() => apdu.setLe(le)) && sameBytes(apdu.bytes, before);
                })
            );
        });
    });
});

// ---- The cases that 2.0.0 got wrong, as plain examples

describe('CommandApdu regressions from 2.0.0', () => {
    const header = { cla: 0x00, ins: 0xa4, p1: 0x04, p2: 0x00 };

    it('empty data sends no Lc, rather than an Lc of 00 that reads as extended length', () => {
        expect(createCommandApdu({ ...header, data: [] }).toString()).toBe('00a4040000');
    });

    it('256 bytes of data use the extended form, rather than an Lc that wraps to 00', () => {
        const data = new Array<number>(256).fill(0xab);
        const bytes = createCommandApdu({ ...header, data }).toByteArray();
        expect(hex(bytes.slice(0, 7))).toBe('00a40400000100');
        expect(bytes.slice(7, 263)).toEqual(data);
        expect(hex(bytes.slice(263))).toBe('0000');
    });

    it('le: 300 uses the extended form, rather than wrapping to 44', () => {
        expect(createCommandApdu({ ...header, le: 300 }).toString()).toBe('00a4040000012c');
    });

    it('p1: 256 is rejected, rather than sent as 00', () => {
        expect(() => createCommandApdu({ ...header, p1: 256 })).toThrow(RangeError);
    });
});
