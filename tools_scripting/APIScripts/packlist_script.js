const fs = require('fs').promises;
const http = require('http');
const  login  = require('./login'); // Assuming you have a login module

// Function to generate the packlist
function packlist_script() {
    login((err, token) => {
        if (err) {
            console.error(err.message);
            return;
        }

        // Read the mappings and batches files
        Promise.all([
            fs.readFile('Mappings.txt', 'utf8'),
            fs.readFile('Batches.txt', 'utf8')
        ])
        .then(([mappingsData, batchesData]) => {
            const mappings = JSON.parse(mappingsData);
            const batches = JSON.parse(batchesData);

            const savedCartons = batches.savedCartons;

            if (savedCartons.length < 2) {
                throw new Error('Not enough cartons available');
            }

            // Create the packlist
            const packlist = mappings.map((mapping, index) => ({
                imei: mapping.imei,
                serial_No: mapping.serial_No,
                deviceId: mapping.deviceId,
                cartonID: index < 50 ? savedCartons[0].cartonId : savedCartons[1].cartonId,
                shipmentDate: new Date().toISOString()
            }));

            console.log('Packlist:', packlist);

            // Write the packlist to a file
            return fs.writeFile('Packlist.txt', JSON.stringify(packlist, null, 2))
                .then(() => {
                    console.log('Packlist written to Packlist.txt');

                    // Define the API endpoint for packlist creation
                    const packlistApiUrl = 'http://139.59.89.112:5000/packlist/create';

                    // Define the payload for packlist creation
                    const packlistPayload = packlist;

                    // Log the payload to verify its structure
                    console.log('Packlist Payload:', packlistPayload);

                    const packlistData = JSON.stringify(packlistPayload);

                    // Set up the request options for packlist creation
                    const packlistOptions = {
                        hostname: '139.59.89.112',
                        // port: 5000,
                        path: '/packlist/create',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Content-Length': packlistData.length,
                            'Authorization': `Bearer ${token}`
                        }
                    };

                    // Make the API request for packlist creation
                    const packlistReq = http.request(packlistOptions, (res) => {
                        let responseData = '';

                        // Collect the response data
                        res.on('data', (chunk) => {
                            responseData += chunk;
                        });

                        // Handle the response once it's complete
                        res.on('end', () => {
                            console.log(`Packlist Status Code: ${res.statusCode}`);
                            console.log(`Packlist Response Data: ${responseData}`);
                            if (res.statusCode === 200 || res.statusCode === 201) {
                                fs.writeFile('PacklistResponse.txt', responseData, (err) => {
                                    if (err) {
                                        console.error('Failed to write to file', err);
                                    } else {
                                        console.log('Packlist response data written to PacklistResponse.txt');
                                    }
                                });
                            } else {
                                console.error(`Failed to create packlist. Status code: ${res.statusCode}`);
                                console.error(`Packlist Response Data: ${responseData}`);
                            }
                        });
                    });

                    // Handle request errors for packlist creation
                    packlistReq.on('error', (e) => {
                        console.error(`Problem with packlist request: ${e.message}`);
                    });

                    // Write data to packlist request body
                    packlistReq.write(packlistData);
                    packlistReq.end();
                });
        })
        .catch(err => {
            console.error('Error:', err.message);
        });
    });
}

module.exports = packlist_script;