const OpenAI = require('openai');

class GPTClientFast {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 5000 // 5 second timeout
    });
    this.chatHistory = [];
    this.maxHistory = 2; // Minimal history
  }

  async chat(message) {
    const startTime = Date.now();
    
    try {
      const messages = [
        { 
          role: 'system', 
          content: 'You are Priya from Mamaearth. Reply in 1-2 short sentences in Hinglish. Products: Onion Hair Oil 399rs, Vitamin C Face Wash 249rs, Rice Scrub 199rs, Aloe Gel 299rs, Tea Tree 199rs.' 
        },
        ...this.chatHistory.slice(-this.maxHistory),
        { role: 'user', content: message }
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 60, // Very short responses
        temperature: 0.3, // Lower for consistency
        top_p: 0.8,
        frequency_penalty: 0.2,
        presence_penalty: 0.1
      });

      const response = completion.choices[0].message.content.trim();
      
      // Update history
      this.chatHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );

      if (this.chatHistory.length > this.maxHistory) {
        this.chatHistory = this.chatHistory.slice(-this.maxHistory);
      }

      const processingTime = Date.now() - startTime;
      console.log('GPT processing:', processingTime + 'ms');
      
      return response;
    } catch (error) {
      console.error('GPT error:', error.message);
      return 'Sorry, main samajh nahi payi. Kya aap repeat kar sakte hain?';
    }
  }
}

module.exports = GPTClientFast;