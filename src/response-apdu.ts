/**
 * ISO 7816 status code mappings
 */
const statusCodes: Record<string, string> = {
    '^9000$': 'Normal processing',
    '^61(.{2})$': 'Normal processing, (sw2 indicates the number of response bytes still available)',
    '^62(.{2})$': 'Warning processing',
    '^6200$': 'no info',
    '^6281$': 'Part of return data may be corrupted',
    '^6282$': 'end of file/record reached before reading le bytes',
    '^6283$': 'ret data may contain structural info',
    '^6284$': 'selected file is invalidated',
    '^6285$': 'file control info not in required format',
    '^6286$': 'unsuccessful writing',
    '^63(.{2})$': 'Warning processing',
    '^6300$': 'no info',
    '^6381$': 'last write filled up file',
    '^6382$': 'execution successful after retry',
    '^64(.{2})$': 'Execution error',
    '^65(.{2})$': 'Execution error',
    '^6500$': 'no info',
    '^6581$': 'memory failure',
    '^66(.{2})$': 'Reserved for future use',
    '^6700$': 'Wrong length',
    '^68(.{2})$': 'Checking error: functions in CLA not supported (see sw2)',
    '^6800$': 'no info',
    '^6881$': 'logical channel not supported',
    '^6882$': 'secure messaging not supported',
    '^69(.{2})$': 'Checking error: command not allowed (see sw2)',
    '^6a(.{2})$': 'Checking error: wrong parameters (p1 or p2)  (see sw2)',
    '^6b(.{2})$': 'Checking error: wrong parameters',
    '^6c(.{2})$': 'Checking error: wrong length (sw2 indicates correct length for le)',
    '^6d(.{2})$': 'Checking error: wrong ins',
    '^6e(.{2})$': 'Checking error: class not supported',
    '^6f(.{2})$': 'Checking error: no precise diagnosis',
};

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
        this._buffer = buffer;
        this._data = buffer.toString('hex');
    }

    /**
     * Get the raw response data as hex string
     */
    get data(): string {
        return this._data;
    }

    /**
     * Get status code and meaning
     */
    getStatus(): Status {
        const statusCode = this.getStatusCode();
        let meaning = 'Unknown';

        for (const prop in statusCodes) {
            if (Object.prototype.hasOwnProperty.call(statusCodes, prop)) {
                const result = statusCodes[prop];
                if (statusCode.match(prop)) {
                    meaning = result;
                    break;
                }
            }
        }

        return {
            code: statusCode,
            meaning: meaning,
        };
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
        return this._data.slice(-4, -2) === '61';
    }

    /**
     * Get number of additional bytes available (from 61xx status)
     */
    numberOfBytesAvailable(): number {
        const hexLength = this._data.slice(-2);
        return parseInt(hexLength, 16);
    }

    /**
     * Check if wrong length was specified (6cxx status)
     */
    isWrongLength(): boolean {
        return this._data.slice(-4, -2) === '6c';
    }

    /**
     * Get the correct length from 6cxx response
     */
    correctLength(): number {
        const hexLength = this._data.slice(-2);
        return parseInt(hexLength, 16);
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
