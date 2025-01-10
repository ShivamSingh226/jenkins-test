const http = require('http');

function login(callback) {
    const data = JSON.stringify({ serial_No: 'SN123456789' });

    const options = {
        hostname: '139.59.89.112',
        // port: 5000,
        path: '/users/login', // Ensure the path starts with a '/'
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            console.log(`Status Code: ${res.statusCode}`);
            console.log(`Response: ${responseData}`);
            if (res.statusCode === 200) {
                const response = JSON.parse(responseData);
                callback(null, response.token);
            } else {
                callback(new Error(`Failed to login. Status code: ${res.statusCode}`));
            }
        });
    });

    req.on('error', (e) => {
        callback(new Error(`Problem with request: ${e.message}`));
    });

    req.write(data);
    req.end();
}

module.exports = login;