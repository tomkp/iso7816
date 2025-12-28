# ISO 7816 Smartcard API

A high-level API for ISO 7816 smartcard communication built on top of the [smartcard](https://www.npmjs.com/package/smartcard) package.

## Installation

```bash
npm install iso7816
```

## Requirements

- Node.js 18.0.0 or higher

## Examples

```javascript
import { Devices } from 'smartcard';
import iso7816 from 'iso7816';

const devices = new Devices();

devices.on('reader-attached', function (reader) {
    console.info(`Reader '${reader.name}' attached`);
});

devices.on('reader-detached', function (reader) {
    console.info(`Reader '${reader.name}' detached`);
});

devices.on('card-removed', function ({ reader }) {
    console.info(`Card removed from '${reader.name}'`);
});

devices.on('error', function (error) {
    console.error(`Error: ${error.message}`);
});

devices.on('card-inserted', function ({ reader, card }) {
    console.info(`Card inserted into '${reader.name}', atr: '${card.atr.toString('hex')}'`);

    const application = iso7816(card);

    // Select PSE (Payment System Environment)
    application
        .selectFile([0x31, 0x50, 0x41, 0x59, 0x2E, 0x53, 0x59, 0x53, 0x2E, 0x44, 0x44, 0x46, 0x30, 0x31])
        .then(function (response) {
            console.info(`Select PSE Response: '${response}' '${response.getStatus().meaning}'`);
        }).catch(function (error) {
            console.error('Error:', error, error.stack);
        });
});

devices.start();
```

## API

### `iso7816(card)`

Create an ISO 7816 application instance for the given card.

- `card` - A card object from the smartcard package (received in `card-inserted` event)

Returns an `Iso7816` instance with the following methods:

### `application.selectFile(bytes, p1, p2)`

Select a file on the smartcard.

- `bytes` - Array of bytes representing the file identifier (e.g., AID)
- `p1` - Optional P1 parameter (default: 0x04)
- `p2` - Optional P2 parameter (default: 0x00)

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

### `application.issueCommand(commandApdu)`

Issue a raw APDU command.

- `commandApdu` - A CommandApdu instance

Returns a Promise that resolves to a `ResponseApdu`.

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
