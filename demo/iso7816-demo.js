const { Devices } = require('smartcard');
const iso7816 = require('../lib/iso7816-application');

const devices = new Devices();

devices.on('reader-attached', function (reader) {
    console.log(`Reader '${reader.name}' attached`);
});

devices.on('reader-detached', function (reader) {
    console.log(`Reader '${reader.name}' detached`);
});

devices.on('card-removed', function ({ reader }) {
    console.log(`Card removed from '${reader.name}'`);
});

devices.on('error', function (error) {
    console.log(`Error: ${error.message}`);
});

devices.on('card-inserted', function ({ reader, card }) {
    console.log(`Card inserted into '${reader.name}', atr: '${card.atr.toString('hex')}'`);

    const application = iso7816(card);
    application
        .selectFile([0x31, 0x50, 0x41, 0x59, 0x2E, 0x53, 0x59, 0x53, 0x2E, 0x44, 0x44, 0x46, 0x30, 0x31])
        .then(function (response) {
            console.info(`Select PSE Response: '${response}' '${response.getStatus().meaning}'`);
        }).catch(function (error) {
            console.error('Error:', error, error.stack);
        });
});

devices.start();
