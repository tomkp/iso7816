# ISO 7816

A library for building and parsing ISO 7816 APDU commands and responses.

This library is card reader agnostic - it works with any transport that can send/receive byte arrays. The examples below use the [smartcard](https://www.npmjs.com/package/smartcard) package, but you can use any PC/SC library or even a custom transport.

## Installation

```bash
npm install iso7816
```

## Requirements

- Node.js 18.0.0 or higher

## Usage

### With smartcard package

```bash
npm install iso7816 smartcard
```

```javascript
import { Devices } from 'smartcard';
import iso7816 from 'iso7816';

const devices = new Devices();

devices.on('card-inserted', async ({ reader, card }) => {
    console.log(`Card inserted into '${reader.name}'`);

    const application = iso7816(card);

    try {
        // Select PSE (Payment System Environment)
        const response = await application.selectFile([
            0x31, 0x50, 0x41, 0x59, 0x2e, 0x53, 0x59, 0x53, 0x2e, 0x44, 0x44, 0x46, 0x30, 0x31,
        ]);

        console.log(`Response: ${response.getStatus().meaning}`);

        if (response.isOk()) {
            // Read a record
            const record = await application.readRecord(1, 1);
            console.log(`Record: ${record.toString()}`);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
});

devices.on('error', (error) => {
    console.error(`Error: ${error.message}`);
});

devices.start();
```

### With custom transport

```typescript
import iso7816, { createCommandApdu, createResponseApdu } from 'iso7816';

// Any object with a transmit method works
const card = {
    atr: Buffer.from([0x3b, 0x00]),
    async transmit(command: Buffer): Promise<Buffer> {
        // Send command to your card reader and return response
        return yourCardReader.send(command);
    },
};

const application = iso7816(card);
const response = await application.selectFile([0xa0, 0x00, 0x00]);
```

### Building APDUs directly

```typescript
import { createCommandApdu, createResponseApdu } from 'iso7816';

// Build a SELECT command
const command = createCommandApdu({
    cla: 0x00,
    ins: 0xa4,
    p1: 0x04,
    p2: 0x00,
    data: [0xa0, 0x00, 0x00],
});

console.log(command.toString()); // "00a4040003a0000000"
console.log(command.toBuffer()); // <Buffer 00 a4 04 00 03 a0 00 00 00>

// Parse a response
const response = createResponseApdu(Buffer.from([0x90, 0x00]));
console.log(response.isOk()); // true
console.log(response.getStatus()); // { code: '9000', meaning: 'Normal processing' }
```

## API

### `iso7816(card)`

Create an ISO 7816 application instance.

- `card` - Any object with `transmit(buffer: Buffer): Promise<Buffer>` method

Returns an `Iso7816` instance.

### `application.selectFile(bytes, p1?, p2?)`

Select a file on the card.

- `bytes` - Array of bytes representing the file identifier (e.g., AID)
- `p1` - Optional P1 parameter (default: `0x04`)
- `p2` - Optional P2 parameter (default: `0x00`)

### `application.readRecord(sfi, record)`

Read a record from a file.

- `sfi` - Short File Identifier
- `record` - Record number

### `application.getData(p1, p2)`

Get data from the card.

### `application.getResponse(length)`

Get additional response bytes.

### `application.issueCommand(commandApdu, maxRetries?)`

Issue a raw APDU command.

- `commandApdu` - A `CommandApdu` instance
- `maxRetries` - Maximum retries for wrong length responses (default: `3`)

### `createCommandApdu(options)`

Create a command APDU.

```typescript
const apdu = createCommandApdu({
    cla: 0x00,    // Class byte
    ins: 0xa4,    // Instruction byte
    p1: 0x04,     // Parameter 1
    p2: 0x00,     // Parameter 2
    data: [...], // Optional command data
    le: 0x00,     // Optional expected response length
});

apdu.toString();    // Hex string
apdu.toBuffer();    // Node.js Buffer
apdu.toByteArray(); // number[]
apdu.setLe(0x10);   // Update expected length
```

### `createResponseApdu(buffer)`

Parse a response APDU.

```typescript
const response = createResponseApdu(buffer);

response.isOk();              // true if status is 9000
response.getStatusCode();     // "9000"
response.getStatus();         // { code: "9000", meaning: "Normal processing" }
response.getBuffer();         // Raw buffer
response.toString();          // Hex string
response.hasMoreBytesAvailable(); // true if 61xx status
response.isWrongLength();     // true if 6cxx status
```

## License

MIT
