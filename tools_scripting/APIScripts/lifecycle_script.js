const fs = require('fs').promises;
const http = require('http');
const  login  = require('./login'); // Assuming you have a login module

// Function to generate the payloads
function payload_script() {
    login((err, token) => {
        if (err) {
            console.error(err.message);
            return;
        }

        // Read the mappings file
        fs.readFile('Mappings.txt', 'utf8')
            .then(data => {
                const mappings = JSON.parse(data);

                // Create the payloads based on the specified order
                const payloads = mappings.map((mapping, index) => {
                    let payload = { stage: "Flash" };

                    if (index < 30 || (index >= 90 && index < 100)) {
                        payload.imei = mapping.imei;
                    } else if (index >= 30 && index < 60) {
                        payload.serial_No = mapping.serial_No;
                    } else if (index >= 60 && index < 90) {
                        payload.deviceId = mapping.deviceId;
                    }

                    return payload;
                });

                console.log('Payloads:', payloads);

                // Write the payloads to a file
                return fs.writeFile('Payloads.txt', JSON.stringify(payloads, null, 2))
                    .then(() => {
                        console.log('Payloads written to Payloads.txt');

                        // Define the API endpoint for payload creation
                        const payloadApiUrl = 'http://139.59.89.112:5000/payload/create';

                        // Log the payloads to verify their structure
                        console.log('Payloads:', payloads);

                        const payloadData = JSON.stringify(payloads);

                        // Set up the request options for payload creation
                        const payloadOptions = {
                            hostname: '139.59.89.112',
                            // port: 5000,
                            path: '/lifecycle/create',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': payloadData.length,
                                'Authorization': `Bearer ${token}`
                            }
                        };

                        // Make the API request for payload creation
                        const payloadReq = http.request(payloadOptions, (res) => {
                            let responseData = '';

                            // Collect the response data
                            res.on('data', (chunk) => {
                                responseData += chunk;
                            });

                            // Handle the response once it's complete
                            res.on('end', () => {
                                console.log(`Payload Status Code: ${res.statusCode}`);
                                console.log(`Payload Response Data: ${responseData}`);
                                if (res.statusCode === 200 || res.statusCode === 201) {
                                    fs.writeFile('PayloadResponse.txt', responseData, (err) => {
                                        if (err) {
                                            console.error('Failed to write to file', err);
                                        } else {
                                            console.log('Payload response data written to PayloadResponse.txt');
                                        }
                                    });
                                } else {
                                    console.error(`Failed to create payload. Status code: ${res.statusCode}`);
                                    console.error(`Payload Response Data: ${responseData}`);
                                }
                            });
                        });

                        // Handle request errors for payload creation
                        payloadReq.on('error', (e) => {
                            console.error(`Problem with payload request: ${e.message}`);
                        });

                        // Write data to payload request body
                        payloadReq.write(payloadData);
                        payloadReq.end();
                    });
            })
            .catch(err => {
                console.error('Error:', err.message);
            });
    });
}

module.exports = payload_script;