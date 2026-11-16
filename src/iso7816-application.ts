import createCommandApdu, { CommandApdu } from './command-apdu.js';
import createResponseApdu, { ResponseApdu } from './response-apdu.js';

/**
 * ISO 7816 instruction codes
 */
export const Instructions = {
    APPEND_RECORD: 0xe2,
    ENVELOPE: 0xc2,
    ERASE_BINARY: 0x0e,
    EXTERNAL_AUTHENTICATE: 0x82,
    GET_CHALLENGE: 0x84,
    GET_DATA: 0xca,
    GET_RESPONSE: 0xc0,
    INTERNAL_AUTHENTICATE: 0x88,
    MANAGE_CHANNEL: 0x70,
    PUT_DATA: 0xda,
    READ_BINARY: 0xb0,
    READ_RECORD: 0xb2,
    SELECT_FILE: 0xa4,
    UPDATE_BINARY: 0xd6,
    UPDATE_RECORD: 0xdc,
    VERIFY: 0x20,
    WRITE_BINARY: 0xd0,
    WRITE_RECORD: 0xd2,
} as const;

/**
 * Card interface for any transport that can send/receive APDUs
 */
export interface Card {
    /** Card ATR (Answer To Reset) */
    atr: Buffer;
    /** Transmit APDU command to card */
    transmit(data: Buffer | number[]): Promise<Buffer>;
}

/**
 * ISO 7816 Application class for APDU communication
 */
export class Iso7816 {
    private readonly _card: Card;

    constructor(card: Card) {
        this._card = card;
    }

    /**
     * Get the underlying card
     */
    get card(): Card {
        return this._card;
    }

    /**
     * Issue a raw APDU command. When the card answers 61xx, sends GET RESPONSE until it has
     * everything, and returns all the data with the final status word.
     * @param commandApdu The command to send
     * @param maxRetries Maximum number of retries for wrong length responses (default: 3)
     * @returns Promise resolving to the response
     * @throws Error if maximum retries exceeded
     */
    async issueCommand(commandApdu: CommandApdu, maxRetries: number = 3): Promise<ResponseApdu> {
        let retries = 0;

        const execute = async (): Promise<ResponseApdu> => {
            const resp = await this._card.transmit(commandApdu.toBuffer());
            const response = createResponseApdu(resp);

            if (response.hasMoreBytesAvailable()) {
                // Keep any data that came with this response, then add the rest. getResponse
                // follows further 61xx responses the same way.
                const rest = await this.getResponse(response.numberOfBytesAvailable());
                const data = response.getBuffer().subarray(0, -2);
                return createResponseApdu(Buffer.concat([data, rest.getBuffer()]));
            } else if (response.isWrongLength()) {
                if (retries >= maxRetries) {
                    throw new Error(
                        `Maximum retries (${maxRetries}) exceeded for wrong length response`
                    );
                }
                retries++;
                // SW2 of 00 means exactly 256. setLe(0) would ask for the maximum, which is
                // 65536 for an extended command.
                commandApdu.setLe(response.correctLength() || 256);
                return execute();
            }

            return response;
        };

        return execute();
    }

    /**
     * Select a file on the smartcard
     * @param bytes File identifier bytes (e.g., AID)
     * @param p1 P1 parameter (default: 0x04)
     * @param p2 P2 parameter (default: 0x00)
     * @returns Promise resolving to the response
     */
    async selectFile(bytes: number[], p1: number = 0x04, p2: number = 0x00): Promise<ResponseApdu> {
        return this.issueCommand(
            createCommandApdu({
                cla: 0x00,
                ins: Instructions.SELECT_FILE,
                p1,
                p2,
                data: bytes,
            })
        );
    }

    /**
     * Get additional response bytes
     * @param length Number of bytes to retrieve
     * @returns Promise resolving to the response
     */
    async getResponse(length: number): Promise<ResponseApdu> {
        return this.issueCommand(
            createCommandApdu({
                cla: 0x00,
                ins: Instructions.GET_RESPONSE,
                p1: 0x00,
                p2: 0x00,
                le: length,
            })
        );
    }

    /**
     * Read a record from a file
     * @param sfi Short File Identifier
     * @param record Record number
     * @returns Promise resolving to the response
     */
    async readRecord(sfi: number, record: number): Promise<ResponseApdu> {
        return this.issueCommand(
            createCommandApdu({
                cla: 0x00,
                ins: Instructions.READ_RECORD,
                p1: record,
                p2: (sfi << 3) + 4,
                le: 0,
            })
        );
    }

    /**
     * Get data from the card
     * @param p1 P1 parameter
     * @param p2 P2 parameter
     * @returns Promise resolving to the response
     */
    async getData(p1: number, p2: number): Promise<ResponseApdu> {
        return this.issueCommand(
            createCommandApdu({
                cla: 0x00,
                ins: Instructions.GET_DATA,
                p1,
                p2,
                le: 0,
            })
        );
    }
}

/**
 * Factory function to create an Iso7816 application
 * @param card A card object from the smartcard package
 * @returns An Iso7816 application instance
 */
export default function createIso7816(card: Card): Iso7816 {
    return new Iso7816(card);
}

// Re-export types for convenience
export { CommandApdu, CommandApduOptions } from './command-apdu.js';
export { ResponseApdu, Status } from './response-apdu.js';
