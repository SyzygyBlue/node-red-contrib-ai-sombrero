/**
 * Integration Module
 * Exports all integration-related functionality
 */

const LLMClient = require('./llm-client');
const { 
  validateLLMConfig, 
  normalizeLLMConfig, 
  createLLMClient 
} = require('./config-manager');

module.exports = {
  // Core client
  LLMClient,
  
  // Configuration
  validateLLMConfig,
  normalizeLLMConfig,
  createLLMClient,
  
  // Re-export provider-specific clients if they exist
  // These would be added by provider-specific modules
};

// Auto-initialize default providers if needed
// This allows for dynamic loading of providers
const fs = require('fs');
const path = require('path');

// Look for provider implementations in the providers directory
try {
  const providersDir = path.join(__dirname, 'providers');
  if (fs.existsSync(providersDir)) {
    const providerFiles = fs.readdirSync(providersDir)
      .filter(file => file.endsWith('-client.js'));
    
    providerFiles.forEach(file => {
      try {
        const providerName = file.replace('-client.js', '');
        const providerModule = require(`./providers/${file}`);
        
        // Add to exports
        module.exports[`${providerName}Client`] = providerModule;
      } catch (error) {
        console.error(`Failed to load provider from ${file}:`, error);
      }
    });
  }
} catch (error) {
  console.error('Error loading provider modules:', error);
}
