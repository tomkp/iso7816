import hexify from 'hexify';

/**
 * Options for creating a CommandApdu
 */
export interface CommandApduOptions {
    /** Class byte */
    cla: number;
    /** Instruction byte */
    ins: number;
    /** Parameter 1 */
    p1: number;
    /** Parameter 2 */
    p2: number;
    /** Command data */
    data?: number[];
    /** Expected response length */
    le?: number;
    /** Total size (optional, auto-calculated) */
    size?: number;
}

/**
 * APDU Command class for building ISO 7816 command APDUs
 */
export class CommandApdu {
    private _bytes: number[];

    constructor(options: CommandApduOptions) {
        const { cla, ins, p1, p2, data, le = 0 } = options;
        let { size } = options;

        // case 1: No data, no Le
        if (!size && !data && !le) {
            size = 4;
        }
        // case 2: No data, with Le
        else if (!size && !data) {
            size = 4 + 2;
        }
        // case 3: With data, no Le
        else if (!size && !le) {
            size = data!.length + 5 + 4;
        }
        // case 4: With data and Le
        else if (!size) {
            size = data!.length + 5 + 4;
        }

        this._bytes = [];
        this._bytes.push(cla);
        this._bytes.push(ins);
        this._bytes.push(p1);
        this._bytes.push(p2);

        if (data) {
            const lc = data.length;
            this._bytes.push(lc);
            this._bytes = this._bytes.concat(data);
        }
        this._bytes.push(le);
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
        return hexify.toHexString(this._bytes);
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
     * Update expected response length (Le)
     */
    setLe(le: number): void {
        this._bytes.pop();
        this._bytes.push(le);
    }
}

/**
 * Factory function to create a CommandApdu
 */
export default function createCommandApdu(options: CommandApduOptions): CommandApdu {
    return new CommandApdu(options);
}
