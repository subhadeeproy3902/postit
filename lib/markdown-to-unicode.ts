/**
 * Converts markdown text to Unicode formatted text for LinkedIn posts
 * LinkedIn doesn't support markdown, so we need to convert to Unicode variants
 */

// Unicode character mappings for different text styles
const UNICODE_STYLES = {
  // Mathematical Bold
  bold: {
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
    'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
    'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
    'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
    'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗'
  },
  // Mathematical Italic
  italic: {
    'a': '𝑎', 'b': '𝑏', 'c': '𝑐', 'd': '𝑑', 'e': '𝑒', 'f': '𝑓', 'g': '𝑔', 'h': 'ℎ', 'i': '𝑖', 'j': '𝑗',
    'k': '𝑘', 'l': '𝑙', 'm': '𝑚', 'n': '𝑛', 'o': '𝑜', 'p': '𝑝', 'q': '𝑞', 'r': '𝑟', 's': '𝑠', 't': '𝑡',
    'u': '𝑢', 'v': '𝑣', 'w': '𝑤', 'x': '𝑥', 'y': '𝑦', 'z': '𝑧',
    'A': '𝐴', 'B': '𝐵', 'C': '𝐶', 'D': '𝐷', 'E': '𝐸', 'F': '𝐹', 'G': '𝐺', 'H': '𝐻', 'I': '𝐼', 'J': '𝐽',
    'K': '𝐾', 'L': '𝐿', 'M': '𝑀', 'N': '𝑁', 'O': '𝑂', 'P': '𝑃', 'Q': '𝑄', 'R': '𝑅', 'S': '𝑆', 'T': '𝑇',
    'U': '𝑈', 'V': '𝑉', 'W': '𝑊', 'X': '𝑋', 'Y': '𝑌', 'Z': '𝑍'
  }
};

// Strikethrough using combining characters
const STRIKETHROUGH_CHAR = '\u0336'; // Combining Long Stroke Overlay

// Underline using combining characters  
const UNDERLINE_CHAR = '\u0332'; // Combining Low Line

/**
 * Converts text to bold Unicode characters
 */
function toBold(text: string): string {
  return text.split('').map(char => UNICODE_STYLES.bold[char as keyof typeof UNICODE_STYLES.bold] || char).join('');
}

/**
 * Converts text to italic Unicode characters
 */
function toItalic(text: string): string {
  return text.split('').map(char => UNICODE_STYLES.italic[char as keyof typeof UNICODE_STYLES.italic] || char).join('');
}

/**
 * Converts text to strikethrough using combining characters
 */
function toStrikethrough(text: string): string {
  return text.split('').map(char => char + STRIKETHROUGH_CHAR).join('');
}

/**
 * Converts text to underlined using combining characters
 */
function toUnderline(text: string): string {
  return text.split('').map(char => char + UNDERLINE_CHAR).join('');
}

/**
 * Converts markdown bullet points to Unicode bullet points
 */
function convertBulletPoints(text: string): string {
  // Convert markdown bullet points to Unicode bullets
  return text
    .replace(/^[\s]*[-*+]\s+/gm, '• ') // Convert -, *, + to bullet
    .replace(/^[\s]*\d+\.\s+/gm, (match, offset, string) => {
      // Convert numbered lists to Unicode numbers with periods
      const lineStart = string.lastIndexOf('\n', offset) + 1;
      const line = string.substring(lineStart, offset + match.length);
      const number = match.match(/\d+/)?.[0] || '1';
      const indent = match.match(/^[\s]*/)?.[0] || '';
      return `${indent}${number}. `;
    });
}

/**
 * Main function to convert markdown to Unicode formatted text for LinkedIn
 */
export function markdownToUnicode(text: string): string {
  let result = text;

  // Convert bullet points first
  result = convertBulletPoints(result);

  // Convert bold text (**text** or __text__)
  result = result.replace(/\*\*(.*?)\*\*/g, (match, content) => toBold(content));
  result = result.replace(/__(.*?)__/g, (match, content) => toBold(content));

  // Convert italic text (*text* or _text_)
  result = result.replace(/\*(.*?)\*/g, (match, content) => toItalic(content));
  result = result.replace(/_(.*?)_/g, (match, content) => toItalic(content));

  // Convert strikethrough text (~~text~~)
  result = result.replace(/~~(.*?)~~/g, (match, content) => toStrikethrough(content));

  // Convert underline text (++text++ or <u>text</u>)
  result = result.replace(/\+\+(.*?)\+\+/g, (match, content) => toUnderline(content));
  result = result.replace(/<u>(.*?)<\/u>/g, (match, content) => toUnderline(content));

  // Remove any remaining markdown syntax that we don't support
  result = result.replace(/#{1,6}\s+/g, ''); // Remove headers
  result = result.replace(/`([^`]+)`/g, '$1'); // Remove inline code formatting
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    // Remove code block formatting but keep content
    return match.replace(/```[\w]*\n?/g, '').replace(/```/g, '');
  });

  // Clean up extra whitespace
  result = result.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
  result = result.trim();

  return result;
}

/**
 * Enhanced version that also handles the existing unicode-text-styler functionality
 * This is a fallback that uses the existing library if our custom conversion fails
 */
export function convertMarkdownToLinkedInFormat(text: string): string {
  try {
    // First try our custom markdown conversion
    const converted = markdownToUnicode(text);
    
    // If the conversion seems successful (has Unicode characters), return it
    if (converted !== text && /[\u{1D400}-\u{1D7FF}]/u.test(converted)) {
      return converted;
    }
    
    // Fallback to the existing unicode-text-styler for basic formatting
    const { toUnicodeVariant } = require('unicode-text-styler');
    return toUnicodeVariant(text);
  } catch (error) {
    console.warn('Markdown to Unicode conversion failed, returning original text:', error);
    return text;
  }
}
