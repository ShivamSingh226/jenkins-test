const fs = require('fs').promises;
const http = require('http');
const login  = require('./login'); // Assuming you have a login module

// Function to generate the mappings
function mapping_script() {
    login((err, token) => {
        if (err) {
            console.error(err.message);
            return;
        }

        // Read the whitelist file
        fs.readFile('Whitelists.txt', 'utf8')
            .then(data => {
                const responseData = JSON.parse(data);

                // Extract IDs based on type
                const sns = responseData.filter(item => item.type === 'SN').map(item => item.id);
                const deviceIds = responseData.filter(item => item.type === 'DeviceID').map(item => item.id);
                const imeis = responseData.filter(item => item.type === 'IMEI').map(item => item.id);

                if (sns.length !== deviceIds.length || sns.length !== imeis.length) {
                    throw new Error('Mismatch in lengths of SNs, DeviceIDs, and IMEIs');
                }

                // Create unique mappings in the specified order
                const mappings = sns.map((sn, index) => ({
                    imei: imeis[index],
                    serial_No: sn,
                    deviceId: deviceIds[index]
                }));

                console.log('Mappings:', mappings);

                // Write the mappings to a file
                return fs.writeFile('Mappings.txt', JSON.stringify(mappings, null, 2))
                    .then(() => {
                        console.log('Mappings written to Mappings.txt');

                        // Define the API endpoint for mapping creation
                        const mappingApiUrl = 'http://139.59.89.112:5000/mapping/create';

                        // Define the payload for mapping creation
                        const mappingPayload = mappings;

                        // Log the payload to verify its structure
                        console.log('Mapping Payload:', mappingPayload);

                        const mappingData = JSON.stringify(mappingPayload);

                        // Set up the request options for mapping creation
                        const mappingOptions = {
                            hostname: '139.59.89.112',
                            // port: 5000,
                            path: '/mapping/create',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Content-Length': mappingData.length,
                                'Authorization': `Bearer ${token}`
                            }
                        };

                        // Make the API request for mapping creation
                        const mappingReq = http.request(mappingOptions, (res) => {
                            let responseData = '';

                            // Collect the response data
                            res.on('data', (chunk) => {
                                responseData += chunk;
                            });

                            // Handle the response once it's complete
                            res.on('end', () => {
                                console.log(`Mapping Status Code: ${res.statusCode}`);
                                console.log(`Mapping Response Data: ${responseData}`);
                                if (res.statusCode === 200 || res.statusCode === 201) {
                                    fs.writeFile('MappingResponse.txt', responseData, (err) => {
                                        if (err) {
                                            console.error('Failed to write to file', err);
                                        } else {
                                            console.log('Mapping response data written to MappingResponse.txt');
                                        }
                                    });
                                } else {
                                    console.error(`Failed to create mapping. Status code: ${res.statusCode}`);
                                    console.error(`Mapping Response Data: ${responseData}`);
                                }
                            });
                        });

                        // Handle request errors for mapping creation
                        mappingReq.on('error', (e) => {
                            console.error(`Problem with mapping request: ${e.message}`);
                        });

                        // Write data to mapping request body
                        mappingReq.write(mappingData);
                        mappingReq.end();
                    });
            })
            .catch(err => {
                console.error('Error:', err.message);
            });
    });
}

module.exports = mapping_script;