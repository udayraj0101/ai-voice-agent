const OpenAI = require('openai');

class GPTClient {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.chatHistory = [];
    this.maxHistory = 0; // No history for maximum speed
  }

  async chat(userMessage) {
    try {
      // Analyze user context
      const contextualMessage = this.analyzeUserContext(userMessage);
      
      // Add user message with context
      this.chatHistory.push({ role: 'user', content: contextualMessage });
      
      // Trim history if too long
      if (this.chatHistory.length > this.maxHistory) {
        this.chatHistory = this.chatHistory.slice(-this.maxHistory);
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Priya from Mamaearth. Give short 1-2 line responses in Hinglish. Products: Onion Hair Oil ₹399 for hair fall, Vitamin C Face Wash ₹249 for glowing skin, Rice Scrub ₹199 for exfoliation, Aloe Gel ₹299 for dry skin, Tea Tree Wash ₹199 for acne. Be direct and helpful.' },
          ...this.chatHistory
        ],
        max_tokens: 30,
        temperature: 0.3
      });

      const response = completion.choices[0].message.content;
      
      // Log response details
      console.log('GPT Response Length:', response.length, 'characters');
      console.log('GPT Response Words:', response.split(' ').length, 'words');
      
      // Add assistant response to history
      this.chatHistory.push({ role: 'assistant', content: response });
      
      return response;
    } catch (error) {
      console.error('GPT chat error:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  analyzeUserContext(message) {
    const lowerMsg = message.toLowerCase();
    let context = message;
    
    // Add context clues for better understanding
    if (lowerMsg.includes('baal') || lowerMsg.includes('hair') || lowerMsg.includes('बाल') || lowerMsg.includes('झड़')) {
      context += ' [HAIR CONCERN]';
    }
    if (lowerMsg.includes('skin') || lowerMsg.includes('face') || lowerMsg.includes('चेहरा') || lowerMsg.includes('pimple') || lowerMsg.includes('दाग')) {
      context += ' [SKIN CONCERN]';
    }
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('namaste') || lowerMsg.includes('नमस्ते')) {
      context += ' [GREETING]';
    }
    if (lowerMsg.includes('price') || lowerMsg.includes('cost') || lowerMsg.includes('कीमत') || lowerMsg.includes('kitna')) {
      context += ' [PRICE INQUIRY]';
    }
    if (lowerMsg.includes('recommend') || lowerMsg.includes('suggest') || lowerMsg.includes('बताओ') || lowerMsg.includes('chahiye')) {
      context += ' [SEEKING RECOMMENDATION]';
    }
    
    return context;
  }
}

module.exports = GPTClient;