// Typewriter text effect

export class Typewriter {
  constructor(element, options = {}) {
    this.element = element;
    this.speed = options.speed || 20;
    this.delay = options.delay || 0;
    this.cursor = options.cursor !== false;
    this.html = options.html || false;
    this.onComplete = options.onComplete || null;
  }

  async type(text) {
    if (this.delay) {
      await new Promise(r => setTimeout(r, this.delay));
    }

    if (this.cursor) {
      this.element.style.borderRight = '2px solid var(--cyan)';
    }

    if (this.html) {
      // For HTML content, reveal character by character but parse HTML tags atomically
      let i = 0;
      let output = '';
      const chars = [];
      let inTag = false;
      let currentTag = '';

      // Pre-process to separate tags from text
      for (let c = 0; c < text.length; c++) {
        if (text[c] === '<') {
          inTag = true;
          currentTag = '<';
        } else if (text[c] === '>' && inTag) {
          currentTag += '>';
          chars.push(currentTag);
          inTag = false;
          currentTag = '';
        } else if (inTag) {
          currentTag += text[c];
        } else {
          chars.push(text[c]);
        }
      }

      for (const char of chars) {
        output += char;
        this.element.innerHTML = output;
        // Don't delay for tags
        if (!char.startsWith('<')) {
          await new Promise(r => setTimeout(r, this.speed));
        }
      }
    } else {
      for (let i = 0; i < text.length; i++) {
        this.element.textContent += text[i];
        await new Promise(r => setTimeout(r, this.speed));
      }
    }

    if (this.cursor) {
      // Blink cursor then remove
      setTimeout(() => {
        this.element.style.borderRight = 'none';
      }, 1500);
    }

    if (this.onComplete) this.onComplete();
  }
}
