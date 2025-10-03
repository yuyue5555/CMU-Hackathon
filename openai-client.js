const OpenAI = require('openai');
const { getSystemPrompt } = require('./system-prompt-config');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Sends a message to OpenAI API and returns the response with timing information
 * @param {string} message - The message to send to OpenAI
 * @param {string} systemPromptKey - The key for the system prompt to use (default: 'DEFAULT')
 * @returns {Promise<Object>} Object containing response and timing information
 */
async function getOpenAIResponse(message, systemPromptKey = 'DEFAULT') {
  const startTime = Date.now();
  
  try {
    const systemPrompt = getSystemPrompt(systemPromptKey);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    return {
      response: completion.choices[0].message.content,
      timeTaken: timeTaken,
      timestamp: new Date().toISOString(),
      systemPromptUsed: systemPromptKey
    };
  } catch (error) {
    const endTime = Date.now();
    const timeTaken = endTime - startTime;
    
    return {
      error: error.message,
      timeTaken: timeTaken,
      timestamp: new Date().toISOString(),
      systemPromptUsed: systemPromptKey
    };
  }
}

module.exports = { getOpenAIResponse };
