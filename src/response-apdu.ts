/**
 * ISO 7816 status code mappings (ordered from most specific to least specific)
 */
const statusCodes: Array<[RegExp, string]> = [
    // Specific status codes first
    [/^9000$/, 'Normal processing'],
    [/^6200$/, 'No information given'],
    [/^6281$/, 'Part of return data may be corrupted'],
    [/^6282$/, 'End of file/record reached before reading Le bytes'],
    [/^6283$/, 'Selected file invalidated'],
    [/^6284$/, 'FCI not formatted correctly'],
    [/^6285$/, 'File control info not in required format'],
    [/^6286$/, 'Unsuccessful writing'],
    [/^6300$/, 'Authentication failed'],
    [/^6381$/, 'Last write filled up file'],
    [/^6382$/, 'Execution successful after retry'],
    [/^6500$/, 'No information given'],
    [/^6581$/, 'Memory failure'],
    [/^6700$/, 'Wrong length'],
    [/^6800$/, 'No information given'],
    [/^6881$/, 'Logical channel not supported'],
    [/^6882$/, 'Secure messaging not supported'],
    [/^6981$/, 'Command incompatible with file structure'],
    [/^6982$/, 'Security status not satisfied'],
    [/^6983$/, 'Authentication method blocked'],
    [/^6984$/, 'Referenced data invalidated'],
    [/^6985$/, 'Conditions of use not satisfied'],
    [/^6986$/, 'Command not allowed (no current EF)'],
    [/^6a80$/, 'Incorrect parameters in command data field'],
    [/^6a81$/, 'Function not supported'],
    [/^6a82$/, 'File not found'],
    [/^6a83$/, 'Record not found'],
    [/^6a84$/, 'Not enough memory space'],
    [/^6a85$/, 'Lc inconsistent with TLV structure'],
    [/^6a86$/, 'Incorrect parameters P1-P2'],
    [/^6a87$/, 'Lc inconsistent with P1-P2'],
    [/^6a88$/, 'Referenced data not found'],
    // Generic status codes (wildcards) last
    [/^61(.{2})$/, 'More data available'],
    [/^62(.{2})$/, 'Warning processing'],
    [/^63(.{2})$/, 'Warning processing'],
    [/^64(.{2})$/, 'Execution error'],
    [/^65(.{2})$/, 'Execution error'],
    [/^66(.{2})$/, 'Reserved for future use'],
    [/^68(.{2})$/, 'Functions in CLA not supported'],
    [/^69(.{2})$/, 'Command not allowed'],
    [/^6a(.{2})$/, 'Wrong parameters P1-P2'],
    [/^6b(.{2})$/, 'Wrong parameters'],
    [/^6c(.{2})$/, 'Wrong length Le'],
    [/^6d(.{2})$/, 'Instruction not supported'],
    [/^6e(.{2})$/, 'Class not supported'],
    [/^6f(.{2})$/, 'No precise diagnosis'],
];

/**
 * Status information from a response
 */
export interface Status {
    /** 4-character hex status code (e.g., "9000") */
    code: string;
    /** Human-readable meaning of the status */
    meaning: string;
}

/**
 * APDU Response class for parsing ISO 7816 response APDUs
 */
export class ResponseApdu {
    private readonly _buffer: Buffer;
    private readonly _data: string;

    constructor(buffer: Buffer) {
        if (buffer.length < 2) {
            throw new Error('Response APDU must contain at least 2 bytes (SW1 and SW2)');
        }
        this._buffer = buffer;
        this._data = buffer.toString('hex');
    }

    /**
     * Get SW1 (first status byte) as 2-character hex string
     */
    private getSW1(): string {
        return this._data.slice(-4, -2);
    }

    /**
     * Get SW2 (second status byte) as 2-character hex string
     */
    private getSW2(): string {
        return this._data.slice(-2);
    }

    /**
     * Get status code and meaning
     */
    getStatus(): Status {
        const statusCode = this.getStatusCode();

        for (const [pattern, meaning] of statusCodes) {
            if (pattern.test(statusCode)) {
                return { code: statusCode, meaning };
            }
        }

        return { code: statusCode, meaning: 'Unknown' };
    }

    /**
     * Get 4-character hex status code (SW1 + SW2)
     */
    getStatusCode(): string {
        return this._data.slice(-4);
    }

    /**
     * Check if status is 9000 (success)
     */
    isOk(): boolean {
        return this.getStatusCode() === '9000';
    }

    /**
     * Get the raw buffer
     */
    getBuffer(): Buffer {
        return this._buffer;
    }

    /**
     * Check if more bytes are available (61xx status)
     */
    hasMoreBytesAvailable(): boolean {
        return this.getSW1() === '61';
    }

    /**
     * Get number of additional bytes available (from 61xx status)
     */
    numberOfBytesAvailable(): number {
        return parseInt(this.getSW2(), 16);
    }

    /**
     * Check if wrong length was specified (6cxx status)
     */
    isWrongLength(): boolean {
        return this.getSW1() === '6c';
    }

    /**
     * Get the correct length from 6cxx response
     */
    correctLength(): number {
        return parseInt(this.getSW2(), 16);
    }

    /**
     * Convert to hex string
     */
    toString(): string {
        return this._data;
    }
}

/**
 * Factory function to create a ResponseApdu
 */
export default function createResponseApdu(buffer: Buffer): ResponseApdu {
    return new ResponseApdu(buffer);
}
