import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5000;

async function testAI(model) {
  console.log(`\nTesting model: ${model}...`);
  try {
    const response = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is chemistry?',
        model: model
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log(`✅ ${model.toUpperCase()} Success!`);
      console.log(`Response: ${data.reply.slice(0, 100)}...`);
    } else {
      console.log(`❌ ${model.toUpperCase()} Failed:`, data.reply);
    }
  } catch (error) {
    console.log(`❌ ${model.toUpperCase()} Error:`, error.message);
  }
}

async function runTests() {
  console.log('--- Starting AI Integration Tests ---');
  await testAI('gemini');
  await testAI('llama');
  console.log('\n--- Tests Finished ---');
  process.exit();
}

runTests();
