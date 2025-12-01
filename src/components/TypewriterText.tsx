import { useEffect, useRef, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  delay?: number;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  delay = 0,
  speed = 30,
  onComplete,
  className = ''
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (delay > 0) {
      const delayTimeout = setTimeout(() => {
        startTyping();
      }, delay);
      return () => clearTimeout(delayTimeout);
    } else {
      startTyping();
    }
  }, [text, delay, speed]);

  const startTyping = () => {
    const interval = setInterval(() => {
      if (currentIndexRef.current < text.length) {
        setDisplayedText(text.slice(0, currentIndexRef.current + 1));
        currentIndexRef.current++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
      }
    }, speed);

    return () => clearInterval(interval);
  };

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && <span className="typewriter-cursor">|</span>}
    </span>
  );
};
