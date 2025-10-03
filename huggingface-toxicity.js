/**
 * Hugging Face Toxicity Detection Module
 * This module provides functionality to detect toxicity levels in text using Hugging Face's RoBERTa toxicity classifier
 */

require('dotenv').config();

/**
 * Queries the Hugging Face RoBERTa toxicity classifier to determine toxicity level of a message
 * @param {string} message - The message to analyze for toxicity
 * @returns {Promise<Object>} Object containing toxicity analysis results
 */
async function detectToxicity(message) {
  try {
    // Check if HF_TOKEN is available
    if (!process.env.HF_TOKEN) {
      console.warn('HF_TOKEN not found in environment variables. Using fallback toxicity detection.');
      return fallbackToxicityDetection(message);
    }

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/s-nlp/roberta_toxicity_classifier",
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: message }),
      }
    );

    if (!response.ok) {
      console.warn(`Hugging Face API error: ${response.status}. Using fallback detection.`);
      return fallbackToxicityDetection(message);
    }

    const result = await response.json();
    console.log('HF API Response:', JSON.stringify(result, null, 2)); // Debug log
    
    // Process the result to extract toxicity score
    const toxicityScore = extractToxicityScore(result);
    
    if (isNaN(toxicityScore)) {
      console.warn('Invalid toxicity score from HF API. Using fallback detection.');
      return fallbackToxicityDetection(message);
    }
    
    return {
      message: message,
      toxicityScore: toxicityScore,
      isToxic: toxicityScore > 0.5, // Threshold for considering text toxic
      confidence: Math.abs(toxicityScore - 0.5) * 2, // Confidence in the classification
      rawResult: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn(`Hugging Face API error: ${error.message}. Using fallback detection.`);
    return fallbackToxicityDetection(message);
  }
}

/**
 * Fallback toxicity detection using simple keyword matching
 * @param {string} message - The message to analyze
 * @returns {Object} Toxicity analysis result
 */
function fallbackToxicityDetection(message) {
  const toxicKeywords = [
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'idiot', 'moron', 'stupid',
    'hate', 'kill', 'die', 'fucking', 'bullshit', 'crap', 'suck'
  ];
  
  const aggressiveKeywords = [
    'you\'re', 'you are', 'you should', 'you need to', 'you must',
    'terrible', 'awful', 'horrible', 'disgusting', 'pathetic'
  ];
  
  const messageLower = message.toLowerCase();
  
  let toxicityScore = 0;
  let toxicCount = 0;
  let aggressiveCount = 0;
  
  // Check for toxic keywords
  toxicKeywords.forEach(keyword => {
    if (messageLower.includes(keyword)) {
      toxicCount++;
      toxicityScore += 0.3;
    }
  });
  
  // Check for aggressive patterns
  aggressiveKeywords.forEach(keyword => {
    if (messageLower.includes(keyword)) {
      aggressiveCount++;
      toxicityScore += 0.1;
    }
  });
  
  // Check for exclamation marks and caps (aggressive tone)
  const exclamationCount = (message.match(/!/g) || []).length;
  const capsCount = (message.match(/[A-Z]/g) || []).length;
  
  if (exclamationCount > 2) toxicityScore += 0.2;
  if (capsCount > message.length * 0.3) toxicityScore += 0.1;
  
  // Normalize score to 0-1 range
  toxicityScore = Math.min(toxicityScore, 1.0);
  
  return {
    message: message,
    toxicityScore: toxicityScore,
    isToxic: toxicityScore > 0.5,
    confidence: Math.abs(toxicityScore - 0.5) * 2,
    method: 'fallback',
    timestamp: new Date().toISOString()
  };
}

/**
 * Extracts toxicity score from Hugging Face API response
 * @param {Array|Object} apiResponse - The raw response from the API
 * @returns {number} Toxicity score between 0 and 1
 */
function extractToxicityScore(apiResponse) {
  try {
    console.log('Extracting score from:', JSON.stringify(apiResponse, null, 2));
    
    // Handle nested array response format: [[{label: "toxic", score: 0.99}, {label: "neutral", score: 0.01}]]
    if (Array.isArray(apiResponse) && apiResponse.length > 0) {
      // Check if it's a nested array
      if (Array.isArray(apiResponse[0])) {
        const innerArray = apiResponse[0];
        if (innerArray.length > 0) {
          // Look for toxic label in the inner array
          const toxicResult = innerArray.find(item => 
            item.label && item.label.toLowerCase() === 'toxic'
          );
          
          if (toxicResult && typeof toxicResult.score === 'number') {
            console.log('Found toxic score:', toxicResult.score);
            return toxicResult.score;
          }
          
          // If no toxic label found, return the highest score
          const scores = innerArray.map(item => item.score).filter(score => typeof score === 'number');
          if (scores.length > 0) {
            const maxScore = Math.max(...scores);
            console.log('Using max score:', maxScore);
            return maxScore;
          }
        }
      } else {
        // Handle flat array format
        const toxicResult = apiResponse.find(item => 
          item.label && (
            item.label.toLowerCase() === 'toxic' ||
            item.label.toUpperCase().includes('TOXIC') ||
            item.label.toUpperCase().includes('HATE') ||
            item.label.toUpperCase().includes('OFFENSIVE')
          )
        );
        
        if (toxicResult && typeof toxicResult.score === 'number') {
          console.log('Found toxic score (flat):', toxicResult.score);
          return toxicResult.score;
        }
        
        // If no toxic label found, return the highest score
        const scores = apiResponse.map(item => item.score).filter(score => typeof score === 'number');
        if (scores.length > 0) {
          const maxScore = Math.max(...scores);
          console.log('Using max score (flat):', maxScore);
          return maxScore;
        }
      }
    } else if (typeof apiResponse === 'object') {
      // Handle single object response
      if (apiResponse.score && typeof apiResponse.score === 'number') {
        console.log('Found single score:', apiResponse.score);
        return apiResponse.score;
      }
      if (apiResponse.label && apiResponse.label.toLowerCase() === 'toxic') {
        const score = apiResponse.score || 0.8; // Default high score for toxic label
        console.log('Found toxic label with score:', score);
        return score;
      }
    }
    
    console.warn('Could not extract valid score from API response');
    return NaN; // This will trigger fallback
  } catch (error) {
    console.error('Error extracting toxicity score:', error);
    return NaN; // This will trigger fallback
  }
}

/**
 * Analyzes multiple messages for toxicity
 * @param {string[]} messages - Array of messages to analyze
 * @returns {Promise<Object[]>} Array of toxicity analysis results
 */
async function detectToxicityBatch(messages) {
  const results = [];
  
  for (const message of messages) {
    const result = await detectToxicity(message);
    results.push(result);
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

/**
 * Gets toxicity level description based on score
 * @param {number} score - Toxicity score (0-1)
 * @returns {string} Human-readable toxicity level
 */
function getToxicityLevel(score) {
  if (score < 0.2) return 'Very Low';
  if (score < 0.4) return 'Low';
  if (score < 0.6) return 'Medium';
  if (score < 0.8) return 'High';
  return 'Very High';
}

module.exports = {
  detectToxicity,
  detectToxicityBatch,
  getToxicityLevel,
  extractToxicityScore,
  fallbackToxicityDetection
};
