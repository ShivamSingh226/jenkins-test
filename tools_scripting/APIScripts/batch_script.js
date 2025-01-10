const http = require('http');
const fs = require('fs');
const login = require('./login');
// BATCH ID CAN BE HARD CODED
// Function to generate a random prefix with any characters
function generateRandomPrefix(length = 6) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let prefix = '';
    for (let i = 0; i < length; i++) {
        prefix += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return prefix;
}

// Main function to execute the script
function batch_script() {
    login((err, token) => {
        if (err) {
            console.error(err.message);
            return;
        }

        // Define the API endpoint
        const api_url = 'http://139.59.89.112:5000/whitelist/create';

        // Generate a random prefix for id_prefix
        const randomPrefix = generateRandomPrefix();

        // Define the payload
        const payload = {
            id_prefix: randomPrefix,
            batch_size: 100,
            cartonSize: 50,
            createdBy: "60d5ec49f1b2c8b1a4e4e4e4",
            count: 100
        };

        // Log the payload to verify its structure
        console.log('Payload:', payload);

        const data = JSON.stringify(payload);

        // Set up the request options
        const options = {
            hostname: '139.59.89.112',
            // port: 5000,
            path: '/batch/create',
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
                    fs.writeFile('Batches.txt', responseData, (err) => {
                        if (err) {
                            console.error('Failed to write to file', err);
                        } else {
                            console.log('Response data written to Batches.txt');
                        }
                    });
                } else {
                    console.error(`Failed to create object. Status code: ${res.statusCode}`);
                    console.error(`Response Data: ${responseData}`);
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

module.exports = batch_script;