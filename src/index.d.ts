/**
 * ISO 7816 Smartcard Communication Library
 */

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
 * APDU Command object
 */
export interface CommandApdu {
    /** Internal byte array */
    bytes: number[];
    /** Convert to hex string */
    toString(): string;
    /** Get bytes as array */
    toByteArray(): number[];
    /** Convert to Node.js Buffer */
    toBuffer(): Buffer;
    /** Update expected response length */
    setLe(le: number): void;
}

/**
 * Create a new CommandApdu
 */
export function CommandApdu(options: CommandApduOptions): CommandApdu;

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
 * APDU Response object
 */
export interface ResponseApdu {
    /** Raw response buffer */
    buffer: Buffer;
    /** Response as hex string */
    data: string;
    /** Get status code and meaning */
    getStatus(): Status;
    /** Get 4-character hex status code */
    getStatusCode(): string;
    /** Check if status is 9000 (success) */
    isOk(): boolean;
    /** Get the raw buffer */
    getBuffer(): Buffer;
    /** Check if more bytes are available (61xx status) */
    hasMoreBytesAvailable(): boolean;
    /** Get number of additional bytes available */
    numberOfBytesAvailable(): number;
    /** Check if wrong length was specified (6cxx status) */
    isWrongLength(): boolean;
    /** Get the correct length from 6cxx response */
    correctLength(): number;
    /** Convert to hex string */
    toString(): string;
}

/**
 * Create a new ResponseApdu from a buffer
 */
export function ResponseApdu(buffer: Buffer): ResponseApdu;

/**
 * Card interface (from smartcard package)
 */
export interface Card {
    /** Card ATR (Answer To Reset) */
    atr: Buffer;
    /** Transmit APDU command to card */
    transmit(data: Buffer | number[]): Promise<Buffer>;
}

/**
 * ISO 7816 Application interface
 */
export interface Iso7816 {
    /** The underlying card */
    card: Card;

    /**
     * Issue a raw APDU command
     * @param commandApdu The command to send
     * @returns Promise resolving to the response
     */
    issueCommand(commandApdu: CommandApdu): Promise<ResponseApdu>;

    /**
     * Select a file on the smartcard
     * @param bytes File identifier bytes (e.g., AID)
     * @param p1 P1 parameter (default: 0x04)
     * @param p2 P2 parameter (default: 0x00)
     * @returns Promise resolving to the response
     */
    selectFile(bytes: number[], p1?: number, p2?: number): Promise<ResponseApdu>;

    /**
     * Get additional response bytes
     * @param length Number of bytes to retrieve
     * @returns Promise resolving to the response
     */
    getResponse(length: number): Promise<ResponseApdu>;

    /**
     * Read a record from a file
     * @param sfi Short File Identifier
     * @param record Record number
     * @returns Promise resolving to the response
     */
    readRecord(sfi: number, record: number): Promise<ResponseApdu>;

    /**
     * Get data from the card
     * @param p1 P1 parameter
     * @param p2 P2 parameter
     * @returns Promise resolving to the response
     */
    getData(p1: number, p2: number): Promise<ResponseApdu>;
}

/**
 * Create an ISO 7816 application for the given card
 * @param card A card object from the smartcard package
 * @returns An Iso7816 application instance
 */
declare function createIso7816(card: Card): Iso7816;

export default createIso7816;
