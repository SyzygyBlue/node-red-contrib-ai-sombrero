const fs = require('fs');
const path = require('path');

// Function to write debug output to a file
function writeDebugOutput(testName, data) {
  const debugDir = path.join(__dirname, 'debug');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${testName.replace(/\s+/g, '-')}-${timestamp}.log`;
  const filepath = path.join(debugDir, filename);
  
  // Create debug directory if it doesn't exist
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  
  // Write the data to the file
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  return filepath;
}

/**
 * Captures debug output during test execution
 * @param {string} testName - Name of the test
 * @param {Function} testFn - Test function to execute
 * @returns {Promise<Object>} Object containing test result and debug data
 */
async function captureDebugOutput(testName, testFn) {
  let debugData = {
    testName,
    input: {},
    output: {}
  };
  
  // Function to set input data for debugging
  const setInput = (input) => {
    debugData.input = { ...debugData.input, ...input };
  };
  
  try {
    // Execute the test function
    const result = await testFn(setInput);
    
    // Capture the output
    debugData.output = {
      result: result,
      timestamp: new Date().toISOString()
    };
    
    // Write debug output to file
    const debugFile = writeDebugOutput(testName, debugData);
    console.log(`Debug output written to: ${debugFile}`);
    
    return { result, debugData };
  } catch (error) {
    // Capture error information
    debugData.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    // Write error to debug file
    const debugFile = writeDebugOutput(`${testName}-error`, debugData);
    console.error(`Error in test '${testName}'. Debug output written to: ${debugFile}`);
    
    throw error;
  }
}

module.exports = { 
  writeDebugOutput, 
  captureDebugOutput 
};
