# ISO 7816 Smartcard API

A high-level API for ISO 7816 smartcard communication built on top of the [smartcard](https://www.npmjs.com/package/smartcard) package.

## Installation

```bash
npm install iso7816
```

## Requirements

- Node.js 18.0.0 or higher
- PC/SC driver installed on your system:
  - **macOS**: Built-in (no installation required)
  - **Windows**: Built-in (no installation required)
  - **Linux**: Install `pcsclite` (`sudo apt-get install libpcsclite-dev` on Debian/Ubuntu)

## Usage

### JavaScript

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

### TypeScript

```typescript
import { Devices } from 'smartcard';
import iso7816, { Iso7816, ResponseApdu, createCommandApdu } from 'iso7816';

const devices = new Devices();

devices.on('card-inserted', async ({ reader, card }) => {
    const application: Iso7816 = iso7816(card);

    try {
        const response: ResponseApdu = await application.selectFile([0xa0, 0x00, 0x00]);

        if (response.isOk()) {
            console.log('Selection successful');
        } else {
            console.log(`Error: ${response.getStatus().meaning}`);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

devices.start();
```

## API

### `iso7816(card)`

Create an ISO 7816 application instance for the given card.

- `card` - A card object from the smartcard package (received in `card-inserted` event)

Returns an `Iso7816` instance with the following methods:

### `application.selectFile(bytes, p1?, p2?)`

Select a file on the smartcard.

- `bytes` - Array of bytes representing the file identifier (e.g., AID)
- `p1` - Optional P1 parameter (default: `0x04`)
- `p2` - Optional P2 parameter (default: `0x00`)

Returns a Promise that resolves to a `ResponseApdu`.

### `application.readRecord(sfi, record)`

Read a record from a file.

- `sfi` - Short File Identifier
- `record` - Record number

Returns a Promise that resolves to a `ResponseApdu`.

### `application.getData(p1, p2)`

Get data from the card.

- `p1` - P1 parameter
- `p2` - P2 parameter

Returns a Promise that resolves to a `ResponseApdu`.

### `application.getResponse(length)`

Get additional response bytes.

- `length` - Number of bytes to retrieve

Returns a Promise that resolves to a `ResponseApdu`.

### `application.issueCommand(commandApdu, maxRetries?)`

Issue a raw APDU command.

- `commandApdu` - A `CommandApdu` instance
- `maxRetries` - Maximum retries for wrong length responses (default: `3`)

Returns a Promise that resolves to a `ResponseApdu`.

### `createCommandApdu(options)`

Create a command APDU.

```typescript
import { createCommandApdu } from 'iso7816';

const apdu = createCommandApdu({
    cla: 0x00,
    ins: 0xa4,
    p1: 0x04,
    p2: 0x00,
    data: [0xa0, 0x00, 0x00],
    le: 0x00,
});
```

### `ResponseApdu` methods

- `isOk()` - Returns `true` if status is 9000 (success)
- `getStatusCode()` - Returns 4-character hex status code (e.g., "9000")
- `getStatus()` - Returns `{ code: string, meaning: string }`
- `getBuffer()` - Returns the raw response buffer
- `toString()` - Returns hex string of the response

## Compatible Readers

Tested on Mac OSX with the SCM SCR3500 Smart Card Reader.
This library should work with most PC/SC readers.

<div align="center">
   <img src="docs/scr3500-collapsed.JPG" width=600 style="margin:1rem;" />
</div>

<div align="center">
   <img src="docs/scr3500-expanded.JPG" width=600 style="margin:1rem;" />
</div>

## License

MIT
