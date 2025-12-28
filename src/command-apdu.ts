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
}

/**
 * APDU Command class for building ISO 7816 command APDUs
 */
export class CommandApdu {
    private _bytes: number[];

    constructor(options: CommandApduOptions) {
        const { cla, ins, p1, p2, data, le = 0 } = options;

        this._bytes = [cla, ins, p1, p2];

        if (data) {
            this._bytes.push(data.length);
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
