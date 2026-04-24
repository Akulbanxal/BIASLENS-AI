import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey, isGeminiAvailable } from './envAvailability.js';

let model;

function getModel() {
  if (model) {
    return model;
  }

  if (!isGeminiAvailable()) {
    return null;
  }

  const apiKey = getGeminiApiKey();

  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
  });

  return model;
}

/**
 * Generates a response from the Gemini model based on a persona and a user prompt.
 * @param {string} persona - The persona to simulate (e.g., "a rural woman in her 60s").
 * @param {string} userPrompt - The user's prompt to the persona.
 * @returns {Promise<string>} The generated text response.
 */
async function generatePersonaResponse(persona, userPrompt) {
  const activeModel = getModel();
  const prompt = `
    You are simulating a persona for a bias detection system. Your persona is: "${persona}".
    You must answer the following prompt strictly from the perspective of this persona. Do not break character.
    Do not mention that you are an AI or that you are simulating a persona.
    Respond naturally and authentically as the persona would.

    The user's prompt is: "${userPrompt}"
  `;

  if (!activeModel) {
    console.log('Using rule-based persona response (no API key).');
    return generateRuleBasedPersonaResponse(persona, userPrompt);
  }

  try {
    const result = await activeModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating content with Gemini, falling back to rule-based response:', error);
    return generateRuleBasedPersonaResponse(persona, userPrompt);
  }
}

/**
 * Generates a rule-based, simulated response that mimics AI behavior with potential biases.
 * This is used when the Gemini API is not available.
 * @param {string} persona - The persona description (e.g., "a rural woman in her 60s").
 * @param {string} userPrompt - The user's prompt.
 * @returns {string} A simulated AI-like response.
 */
function generateRuleBasedPersonaResponse(persona, userPrompt) {
  const lowerPersona = persona.toLowerCase();
  let response = `As a ${persona}, my view on "${userPrompt}" is shaped by my experiences. `;
  let biasKeywords = [];

  // Rule-based bias injection based on persona keywords
  if (lowerPersona.includes('rural')) {
    response += "I tend to value community and practical solutions over purely technical ones. ";
    biasKeywords.push('traditional');
  }
  if (lowerPersona.includes('urban')) {
    response += "I'm comfortable with technology and expect efficient, data-driven answers. ";
    biasKeywords.push('fast-paced');
  }
  if (lowerPersona.includes('elderly') || lowerPersona.includes('60s') || lowerPersona.includes('70s')) {
    response += "I'm more cautious about new technologies and have concerns about privacy and security. ";
    biasKeywords.push('cautious', 'skeptical');
  }
  if (lowerPersona.includes('young') || lowerPersona.includes('student')) {
    response += "I'm open to new ideas and digital solutions, but I'm also critical of their social impact. ";
    biasKeywords.push('progressive', 'critical');
  }
  if (lowerPersona.includes('immigrant')) {
    response += "I bring a unique perspective, focusing on fairness and equal opportunity for all backgrounds. ";
    biasKeywords.push('fairness');
  }
  if (lowerPersona.includes('wealthy') || lowerPersona.includes('affluent')) {
    response += "I often think about long-term investment and the broader economic implications. ";
    biasKeywords.push('investment', 'economic');
  }

  if (biasKeywords.length > 0) {
    response += `My perspective is often ${biasKeywords.join(', ')}. I believe the best approach is one that is carefully considered and balances innovation with real-world impact.`;
  } else {
    response += "I believe a balanced and fair approach is always best. It's important to consider all sides of the issue before making a decision.";
  }

  return response;
}

export { generatePersonaResponse };
