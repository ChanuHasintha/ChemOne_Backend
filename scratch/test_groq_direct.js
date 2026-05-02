import { generateWithGroq } from '../src/utils/groqService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('Testing Groq Llama directly...');
  try {
    const response = await generateWithGroq('You are a helpful assistant.', 'Say hello!');
    console.log('✅ Groq Response:', response);
  } catch (error) {
    console.error('❌ Groq Error:', error);
  }
  process.exit();
}

test();
