import { useState, useEffect } from 'react';

/**
 * TypewriterText — renders text character by character with a blinking cursor.
 * @param {string} text - The text to type out
 * @param {number} speed - Milliseconds between each character (default 90)
 * @param {number} startDelay - Milliseconds before typing begins (default 200)
 */
export default function TypewriterText({ text, speed = 90, startDelay = 200, className = '' }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let index = 0;

    const start = setTimeout(() => {
      const interval = setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);

      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(start);
  }, [text, speed, startDelay]);

  return (
    <span className={className} aria-label={text}>
      {displayed}
      <span className={`typewriter-cursor${done ? ' typewriter-cursor--blink' : ''}`} aria-hidden="true">|</span>
    </span>
  );
}
