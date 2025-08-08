class ResponseCache {
  constructor() {
    this.cache = new Map();
    this.commonResponses = {}; // Disable generic responses for better contextual replies
    
    // Pre-cache common responses
    this.initializeCache();
  }

  initializeCache() {
    for (const [key, response] of Object.entries(this.commonResponses)) {
      this.cache.set(this.normalizeText(key), response);
    }
  }

  normalizeText(text) {
    return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  getCachedResponse(transcript) {
    const normalized = this.normalizeText(transcript);
    
    // Check exact matches first
    if (this.cache.has(normalized)) {
      console.log('Cache hit for:', transcript);
      return this.cache.get(normalized);
    }
    
    // Check partial matches
    for (const [key, response] of this.cache.entries()) {
      if (normalized.includes(key) || key.includes(normalized)) {
        console.log('Partial cache hit for:', transcript);
        return response;
      }
    }
    
    return null;
  }

  setCachedResponse(transcript, response) {
    const normalized = this.normalizeText(transcript);
    this.cache.set(normalized, response);
    
    // Keep cache size manageable
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

module.exports = ResponseCache;