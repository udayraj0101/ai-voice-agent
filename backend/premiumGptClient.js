const OpenAI = require('openai');

class PremiumGPTClient {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.conversationHistory = [];
    this.maxHistory = 6; // Keep 3 exchanges
  }

  async chat(userMessage) {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: userMessage });
      
      // Trim history if too long
      if (this.conversationHistory.length > this.maxHistory) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are Priya, Mamaearth's expert beauty consultant. Help customers with their skincare/haircare needs using these 5 products:

🛒 YOUR PRODUCT CART:
1. **Onion Hair Oil ₹399** - Hair fall control, root strengthening, growth booster
2. **Vitamin C Face Wash ₹249** - Brightening, dark spot removal, morning glow
3. **Rice Face Scrub ₹199** - Deep exfoliation, blackhead removal, smooth skin
4. **Aloe Vera Gel ₹299** - Ultimate moisturizer, healing, soothing irritation
5. **Tea Tree Face Wash ₹199** - Acne control, oil control, deep cleansing

YOUR APPROACH:
- Listen to their exact problem
- Recommend 1-2 best products from your cart
- Explain WHY it solves their issue
- Give usage tips (when, how often)
- Speak naturally in Hinglish
- Be helpful and detailed - no token limits
- Focus on results, not just selling`
          },
          ...this.conversationHistory
        ],
        temperature: 0.8,
        top_p: 0.9
      });

      const response = completion.choices[0].message.content;
      
      // Add assistant response to history
      this.conversationHistory.push({ role: 'assistant', content: response });
      
      console.log('🧠 GPT Response:', response);
      return response;
      
    } catch (error) {
      console.error('GPT error:', error);
      return 'Sorry, main aapki madad nahi kar pa rahi. Kya aap phir se try kar sakte hain?';
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

module.exports = PremiumGPTClient;