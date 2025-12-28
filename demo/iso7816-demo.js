import { Devices } from 'smartcard';
import iso7816 from '../dist/index.js';

const devices = new Devices();

devices.on('reader-attached', (reader) => {
    console.log(`Reader '${reader.name}' attached`);
});

devices.on('reader-detached', (reader) => {
    console.log(`Reader '${reader.name}' detached`);
});

devices.on('card-removed', ({ reader }) => {
    console.log(`Card removed from '${reader.name}'`);
});

devices.on('error', (error) => {
    console.error(`Error: ${error.message}`);
});

devices.on('card-inserted', async ({ reader, card }) => {
    console.log(`Card inserted into '${reader.name}', ATR: ${card.atr.toString('hex')}`);

    const application = iso7816(card);

    try {
        // Select PSE (Payment System Environment)
        const response = await application.selectFile([
            0x31, 0x50, 0x41, 0x59, 0x2e, 0x53, 0x59, 0x53, 0x2e, 0x44, 0x44, 0x46, 0x30, 0x31,
        ]);

        console.log(`Select PSE Response: ${response} (${response.getStatus().meaning})`);
    } catch (error) {
        console.error('Error:', error.message);
    }
});

devices.start();
