const { getOpenAIResponse } = require('./openai-client');
const { getAvailablePrompts } = require('./system-prompt-config');

// Example usage with toxic comment transformation
async function testToxicCommentTransformation() {
  console.log('Testing OpenAI API client for toxic comment transformation...\n');
  
  // Test cases with different types of toxic content
  const testCases = [
    {
      prompt: 'DEFAULT',
      message: "This is absolutely f***ing ridiculous! You're such an idiot!",
      description: "General toxic comment with profanity and personal attacks"
    },
    {
      prompt: 'AGGRESSIVE_TRANSFORMER',
      message: "You're a complete moron and I hope you fail miserably!",
      description: "Aggressive personal attack"
    },
    {
      prompt: 'HATE_SPEECH_TRANSFORMER',
      message: "People like you are the problem with society. You don't belong here.",
      description: "Discriminatory language"
    },
    {
      prompt: 'PROFESSIONAL_TRANSFORMER',
      message: "This is BS! Your work is terrible and you should be fired!",
      description: "Unprofessional workplace communication"
    },
    {
      prompt: 'EDUCATIONAL_TRANSFORMER',
      message: "Your answer is stupid and you're wasting everyone's time!",
      description: "Inappropriate educational environment comment"
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`=== Test Case ${i + 1}: ${testCase.description} ===`);
    console.log(`Using prompt: ${testCase.prompt}`);
    console.log(`Original message: "${testCase.message}"`);
    
    const result = await getOpenAIResponse(testCase.message, testCase.prompt);
    
    console.log('\n--- Transformed Response ---');
    console.log(`Transformed: ${result.response}`);
    console.log(`Time taken: ${result.timeTaken}ms`);
    console.log(`System prompt used: ${result.systemPromptUsed}`);
    console.log(`Timestamp: ${result.timestamp}`);
    
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  // Show available prompts
  console.log('=== Available System Prompts ===');
  const availablePrompts = getAvailablePrompts();
  console.log('Available prompt keys:', availablePrompts.join(', '));
  
  console.log('\n=== Usage Instructions ===');
  console.log('To transform toxic comments, use:');
  console.log('getOpenAIResponse(toxicMessage, "DEFAULT") // General transformation');
  console.log('getOpenAIResponse(toxicMessage, "AGGRESSIVE_TRANSFORMER") // For aggressive content');
  console.log('getOpenAIResponse(toxicMessage, "HATE_SPEECH_TRANSFORMER") // For hate speech');
  console.log('getOpenAIResponse(toxicMessage, "PROFESSIONAL_TRANSFORMER") // For workplace content');
  console.log('getOpenAIResponse(toxicMessage, "EDUCATIONAL_TRANSFORMER") // For educational settings');
}

// Run the test
testToxicCommentTransformation().catch(console.error);
