/**
 * Options for creating a CommandApdu
 */
export interface CommandApduOptions {
    /** Class byte (0-255) */
    cla: number;
    /** Instruction byte (0-255) */
    ins: number;
    /** Parameter 1 (0-255) */
    p1: number;
    /** Parameter 2 (0-255) */
    p2: number;
    /** Command data, up to 65535 bytes. More than 255 bytes uses the extended length form. */
    data?: number[];
    /**
     * Expected response length (Ne), from 0 to 65536. The default, 0, asks for the maximum: 256,
     * or 65536 in the extended form. More than 256 uses the extended length form.
     */
    le?: number;
}

const MAX_DATA_LENGTH = 65535;
const MAX_LE = 65536;

/**
 * APDU Command class for building ISO 7816 command APDUs.
 *
 * The command always includes Le. It uses the short form when the data is at most 255 bytes and
 * Le is at most 256, and the extended form otherwise (ISO/IEC 7816-4):
 *
 *   short     CLA INS P1 P2 [Lc data] Le
 *   extended  CLA INS P1 P2 00 Le1 Le2                (no data)
 *             CLA INS P1 P2 00 Lc1 Lc2 data Le1 Le2   (with data)
 *
 * A value that can't be encoded throws a RangeError instead of being truncated. The full
 * specification is in command-apdu.properties.test.ts.
 */
export class CommandApdu {
    private readonly _header: number[];
    private readonly _data: number[];
    private _bytes: number[];

    constructor(options: CommandApduOptions) {
        const { cla, ins, p1, p2, le = 0 } = options;
        const data = options.data ?? [];

        this._header = [
            checkByte('cla', cla),
            checkByte('ins', ins),
            checkByte('p1', p1),
            checkByte('p2', p2),
        ];
        if (data.length > MAX_DATA_LENGTH) {
            throw new RangeError(`data is ${data.length} bytes; the maximum is ${MAX_DATA_LENGTH}`);
        }
        this._data = Array.from(data, (b, i) => checkByte(`data[${i}]`, b));
        this._bytes = encode(this._header, this._data, checkLe(le));
    }

    /**
     * Get the bytes array (read-only copy)
     */
    get bytes(): number[] {
        return [...this._bytes];
    }

    /**
     * Convert to hex string representation
     */
    toString(): string {
        return Buffer.from(this._bytes).toString('hex');
    }

    /**
     * Get bytes as array
     */
    toByteArray(): number[] {
        return this._bytes;
    }

    /**
     * Convert to Node.js Buffer
     */
    toBuffer(): Buffer {
        return Buffer.from(this._bytes);
    }

    /**
     * Update expected response length (Le). Re-encodes the command, so a Le over 256 switches
     * it to the extended form. Throws a RangeError, leaving the command unchanged, if `le` is
     * not an integer from 0 to 65536.
     */
    setLe(le: number): void {
        this._bytes = encode(this._header, this._data, checkLe(le));
    }
}

function checkByte(name: string, value: number): number {
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
        throw new RangeError(`${name} must be a byte (0-255), got ${value}`);
    }
    return value;
}

function checkLe(le: number): number {
    if (!Number.isInteger(le) || le < 0 || le > MAX_LE) {
        throw new RangeError(`le must be an integer from 0 to ${MAX_LE}, got ${le}`);
    }
    return le;
}

/** Encodes a validated command. An Le of 256 (short) or 65536 (extended) encodes as zeros. */
function encode(header: number[], data: number[], le: number): number[] {
    const nc = data.length;

    if (nc <= 255 && le <= 256) {
        const lc = nc > 0 ? [nc, ...data] : [];
        return [...header, ...lc, le & 0xff];
    }

    const lc = nc > 0 ? [0x00, nc >> 8, nc & 0xff, ...data] : [0x00];
    return [...header, ...lc, (le >> 8) & 0xff, le & 0xff];
}

/**
 * Factory function to create a CommandApdu
 */
export default function createCommandApdu(options: CommandApduOptions): CommandApdu {
    return new CommandApdu(options);
}
