import { GoogleGenerativeAI } from '@google/generative-ai';

export const handler = async (event: any, context: any) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Read the SECURE API key from Netlify cloud environment variables!
    // This value is 100% invisible to browsers and github.
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY environment variable is not configured on Netlify.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in your Netlify site settings.' })
      };
    }

    // Initialize Gemini AI on the server side and generate the text
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text })
    };
  } catch (error: any) {
    console.error('❌ Server-side Gemini proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' })
    };
  }
};
