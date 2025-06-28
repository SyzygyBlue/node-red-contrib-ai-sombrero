const { normalizeMessage } = require('../nodes/llm-connector/llm-connector-helpers');

// Simple test to debug the normalizeMessage function
async function runTest() {
  try {
    const msg = { 
      payload: 'Test message',
      _llm: {
        customField: 'test-value',
        timestamp: '2023-01-01T00:00:00.000Z'
      }
    };

    const node = {
      id: 'test-node',
      role: 'assistant',
      debug: true
    };

    console.log('=== Input ===');
    console.log(JSON.stringify(msg, null, 2));

    const result = await normalizeMessage(msg, node);
    
    console.log('\n=== Output ===');
    console.log(JSON.stringify(result, null, 2));
    
    if (result._llm) {
      console.log('\n=== _llm Properties ===');
      Object.entries(result._llm).forEach(([key, value]) => {
        console.log(`${key}:`, JSON.stringify(value, null, 2));
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest();
