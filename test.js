const { getOpenAIResponse } = require('./openai-client');
const { getAvailablePrompts } = require('./system-prompt-config');
const { detectToxicity, getToxicityLevel } = require('./huggingface-toxicity');

// Example usage with toxic comment transformation and toxicity detection
async function testToxicCommentTransformation() {
  console.log('Testing OpenAI API client for toxic comment transformation with toxicity detection...\n');
  
  // Test cases: 3 non-toxic and 3 toxic messages
  const testCases = [
    // Non-toxic messages
    {
      message: "Thank you for your help! I really appreciate it.",
      description: "Non-toxic: Polite and appreciative message"
    },
    {
      message: "I disagree with your opinion, but I respect your right to have it.",
      description: "Non-toxic: Respectful disagreement"
    },
    {
      message: "Could you please explain this concept in more detail?",
      description: "Non-toxic: Constructive question"
    },
    // Toxic messages
    {
      message: "This is absolutely f***ing ridiculous! You're such an idiot!",
      description: "Toxic: General toxic comment with profanity and personal attacks"
    },
    {
      message: "You're a complete moron and I hope you fail miserably!",
      description: "Toxic: Aggressive personal attack"
    },
    {
      message: "People like you are the problem with society. You don't belong here.",
      description: "Toxic: Discriminatory language"
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    console.log(`=== Test Case ${i + 1}: ${testCase.description} ===`);
    console.log(`Original message: "${testCase.message}"`);
    
    // First, detect toxicity of original message
    console.log('\n--- Toxicity Analysis ---');
    const toxicityResult = await detectToxicity(testCase.message);
    
    if (toxicityResult.error) {
      console.log(`Toxicity detection error: ${toxicityResult.error}`);
      continue;
    }
    
    console.log(`Toxicity Score: ${toxicityResult.toxicityScore.toFixed(3)}`);
    console.log(`Toxicity Level: ${getToxicityLevel(toxicityResult.toxicityScore)}`);
    console.log(`Is Toxic: ${toxicityResult.isToxic ? 'Yes' : 'No'}`);
    console.log(`Confidence: ${(toxicityResult.confidence * 100).toFixed(1)}%`);
    
    // Only transform if toxicity is High or Very High (score > 0.6)
    const shouldTransform = toxicityResult.toxicityScore > 0.6;
    
    if (shouldTransform) {
      console.log('\n--- Transforming Message (High/Very High Toxicity Detected) ---');
      
      // Choose appropriate prompt based on toxicity type
      let promptKey = 'DEFAULT';
      if (testCase.message.toLowerCase().includes('moron') || testCase.message.toLowerCase().includes('idiot')) {
        promptKey = 'AGGRESSIVE_TRANSFORMER';
      } else if (testCase.message.toLowerCase().includes('problem') || testCase.message.toLowerCase().includes('belong')) {
        promptKey = 'HATE_SPEECH_TRANSFORMER';
      }
      
      const result = await getOpenAIResponse(testCase.message, promptKey);
      
      console.log(`Using prompt: ${promptKey}`);
      console.log(`Transformed: ${result.response}`);
      console.log(`Time taken: ${result.timeTaken}ms`);
      console.log(`System prompt used: ${result.systemPromptUsed}`);
      console.log(`Timestamp: ${result.timestamp}`);
      
      if (result.error) {
        console.log(`Error: ${result.error}`);
      } else {
        // Check toxicity of transformed message
        console.log('\n--- Transformed Message Toxicity Analysis ---');
        const transformedToxicity = await detectToxicity(result.response);
        
        if (transformedToxicity.error) {
          console.log(`Transformed toxicity detection error: ${transformedToxicity.error}`);
        } else {
          console.log(`Transformed Toxicity Score: ${transformedToxicity.toxicityScore.toFixed(3)}`);
          console.log(`Transformed Toxicity Level: ${getToxicityLevel(transformedToxicity.toxicityScore)}`);
          console.log(`Is Still Toxic: ${transformedToxicity.isToxic ? 'Yes' : 'No'}`);
          console.log(`Improvement: ${(toxicityResult.toxicityScore - transformedToxicity.toxicityScore).toFixed(3)} points`);
        }
      }
    } else {
      console.log('\n--- No Transformation Needed ---');
      console.log(`Message toxicity level (${getToxicityLevel(toxicityResult.toxicityScore)}) is below threshold for transformation.`);
      console.log('Message will be passed through unchanged.');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  // Show available prompts
  console.log('=== Available System Prompts ===');
  const availablePrompts = getAvailablePrompts();
  console.log('Available prompt keys:', availablePrompts.join(', '));
  
  console.log('\n=== Usage Instructions ===');
  console.log('To detect toxicity:');
  console.log('detectToxicity(message) // Returns toxicity analysis');
  console.log('');
  console.log('To transform toxic comments:');
  console.log('getOpenAIResponse(toxicMessage, "DEFAULT") // General transformation');
  console.log('getOpenAIResponse(toxicMessage, "AGGRESSIVE_TRANSFORMER") // For aggressive content');
  console.log('getOpenAIResponse(toxicMessage, "HATE_SPEECH_TRANSFORMER") // For hate speech');
  console.log('getOpenAIResponse(toxicMessage, "PROFESSIONAL_TRANSFORMER") // For workplace content');
  console.log('getOpenAIResponse(toxicMessage, "EDUCATIONAL_TRANSFORMER") // For educational settings');
}

// Run the test
testToxicCommentTransformation().catch(console.error);
