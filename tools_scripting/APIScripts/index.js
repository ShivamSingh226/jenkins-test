// index.js
const whl_script = require('./whl_script.js');
const batch_script=require('./batch_script.js');
const mapping_script=require('./mapping_script.js');
const packlist_script=require('./packlist_script.js')
const lifecycle_script=require('./lifecycle_script.js');
// Add more scripts as needed

// Get the script name from command-line arguments
const scriptName = process.argv[2];

// Run the specified script
switch (scriptName) {
    case 'whl_script':
        whl_script();
        break;
    case 'batch_script':
        batch_script();
        break;
    case 'mapping_script':
        mapping_script();
    case 'packlist_script':
        packlist_script();    
        break;   
    case 'lifecycle_script':
        lifecycle_script();
        break;     
    // Add more cases for additional scripts
    default:
        console.log('Please specify a valid script name.');
}