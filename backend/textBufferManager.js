class TextBufferManager {
  constructor() {
    this.textBuffer = '';
    this.lastUpdateTime = Date.now();
    this.isComplete = false;
  }

  addText(text) {
    if (text && text.trim()) {
      this.textBuffer += text.trim() + ' ';
      this.lastUpdateTime = Date.now();
      console.log('📝 Text added:', text.trim());
    }
  }

  getText() {
    return this.textBuffer.trim();
  }

  isReady() {
    // Ready if we have text and no updates for 500ms
    return this.textBuffer.length > 0 && (Date.now() - this.lastUpdateTime > 500);
  }

  clear() {
    const text = this.textBuffer.trim();
    this.textBuffer = '';
    this.lastUpdateTime = Date.now();
    this.isComplete = false;
    return text;
  }

  isEmpty() {
    return this.textBuffer.trim().length === 0;
  }
}

module.exports = TextBufferManager;