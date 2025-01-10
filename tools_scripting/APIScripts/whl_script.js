const http = require('http');
const fs = require('fs');
const login = require('./login');



//IMEI 15 characters, One API Post route for all three SN, IMEI, DeviceId
// Function to generate a random ID with a specific prefix
function generateRandomId(prefix) {
    return `${prefix}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
}
function generateRandomDeviceId(prefix) {
    return `${prefix}${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`;
}

// Function to generate a random IMEI of 15 numeric characters
function generateRandomIMEI() {
    return `${Math.floor(Math.random() * 100000000000).toString().padStart(15, '0')}`;
}

// Function to generate unique IDs
function generateUniqueIds(prefix, count, isIMEI = false) {
    const ids = new Set();
    while (ids.size < count) {
        const id = isIMEI ? generateRandomIMEI() : generateRandomDeviceId(prefix);
        ids.add(id);
    }
    return Array.from(ids);
}

// Main function to execute the script
function whl_script() {
    login((err, token) => {
        if (err) {
            console.error(err.message);
            return;
        }

        // Define the API endpoint
        const api_url = 'http://139.59.89.112/whitelist/create';

        // Define the payload based on the type
        const count = 100; // Change this value to test different counts
        let data;

        const deviceIds = generateUniqueIds('GRD', count);
        const imeis = generateUniqueIds('', count, true);

        const payloadData = [
            {
                type: 'SN',
                id_prefix: generateRandomId('SN'),
                count: count
            },
            {
                type: 'DeviceID',
                data: deviceIds.map(id => ({ id, type: 'DeviceID' }))
            },
            {
                type: 'IMEI',
                data: imeis.map(id => ({ id, type: 'IMEI' }))
            }
        ];

        data = JSON.stringify(payloadData);

        // Set up the request options
        const options = {
            hostname: '139.59.89.112',
            // port: 5000,
            path: '/whitelist/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'Authorization': `Bearer ${token}`
            }
        };

        // Make the API request
        const req = http.request(options, (res) => {
            let responseData = '';

            // Collect the response data
            res.on('data', (chunk) => {
                responseData += chunk;
            });

            // Write the response data to a text file once the response is complete
            res.on('end', () => {
                console.log(`Status Code: ${res.statusCode}`);
                console.log(`Response Data: ${responseData}`);
                if (res.statusCode === 200 || res.statusCode === 201) {
                    fs.writeFile('Whitelists.txt', responseData, (err) => {
                        if (err) {
                            console.error('Failed to write to file', err);
                        } else {
                            console.log('Response data written to Whitelists.txt');
                        }
                    });
                } else {
                    console.error(`Failed to create object. Status code: ${res.statusCode}`);
                }
            });
        });

        // Handle request errors
        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
        });

        // Write data to request body
        req.write(data);
        req.end();
    });
}

module.exports = whl_script;