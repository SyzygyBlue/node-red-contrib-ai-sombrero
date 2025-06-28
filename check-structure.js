const fs = require('fs');
const path = require('path');

console.log('=== PROJECT STRUCTURE CHECKER ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Check if we can find the nodes directory
const nodesDir = path.join(__dirname, 'nodes');
console.log('\n=== NODES DIRECTORY ===');
console.log('Path:', nodesDir);
console.log('Exists:', fs.existsSync(nodesDir) ? 'Yes' : 'No');

if (fs.existsSync(nodesDir)) {
  console.log('Contents:', fs.readdirSync(nodesDir));
  
  // Check llm-connector directory
  const llmConnectorDir = path.join(nodesDir, 'llm-connector');
  console.log('\n=== LLM CONNECTOR DIRECTORY ===');
  console.log('Path:', llmConnectorDir);
  console.log('Exists:', fs.existsSync(llmConnectorDir) ? 'Yes' : 'No');
  
  if (fs.existsSync(llmConnectorDir)) {
    console.log('Contents:', fs.readdirSync(llmConnectorDir));
    
    // Check for helper file
    const helperFile = path.join(llmConnectorDir, 'llm-connector-helpers.js');
    console.log('\n=== HELPER FILE ===');
    console.log('Path:', helperFile);
    console.log('Exists:', fs.existsSync(helperFile) ? 'Yes' : 'No');
    
    if (fs.existsSync(helperFile)) {
      console.log('File size:', fs.statSync(helperFile).size, 'bytes');
      
      // Try to require the module
      try {
        console.log('\n=== ATTEMPTING TO REQUIRE MODULE ===');
        const module = require(helperFile);
        console.log('Module loaded successfully!');
        console.log('Exported keys:', Object.keys(module));
      } catch (error) {
        console.error('Error requiring module:', error);
      }
    }
  }
}

// Check if we're in a Node-RED project
const packageJsonPath = path.join(__dirname, 'package.json');
console.log('\n=== PACKAGE.JSON ===');
console.log('Path:', packageJsonPath);
console.log('Exists:', fs.existsSync(packageJsonPath) ? 'Yes' : 'No');

if (fs.existsSync(packageJsonPath)) {
  try {
    const pkg = require(packageJsonPath);
    console.log('Name:', pkg.name);
    console.log('Version:', pkg.version);
    console.log('Main:', pkg.main);
  } catch (error) {
    console.error('Error reading package.json:', error);
  }
}

console.log('\n=== CHECK COMPLETE ===');
