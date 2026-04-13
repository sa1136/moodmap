import { useState, useRef, useEffect, Fragment, type ReactNode } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  currentMood?: string;
  currentCity?: string;
}

/** Dark indigo + lilac — reads as a separate “assistant” surface vs dashboard violet buttons */
const AI_ASSISTANT = {
  solid: '#312e81',
  solidHover: '#1e1b4b',
  light: '#f5f3ff',
  lightHover: '#ede9fe',
  border: '#c4b5fd',
  borderStrong: '#8b5cf6',
  textOnLight: '#4c1d95',
  glow: '0 4px 22px rgba(30, 27, 75, 0.55), 0 0 0 1px rgba(196, 181, 253, 0.35)',
  glowHover: '0 6px 28px rgba(15, 23, 42, 0.5), 0 0 0 1px rgba(196, 181, 253, 0.5)',
  userBubble: '#5b21b6',
  userBubbleBorder: '#4c1d95',
} as const;

/** Normalize model output into clearer paragraph / list boundaries. */
function formatBotMessage(text: string): string {
  let t = (text || '').trim();
  if (!t) return t;

  t = t.replace(/\r\n/g, '\n');

  // Break before common list intros
  t = t.replace(/\b(include|options?|such as|try|consider)\s*:/gi, '\n\n$1:\n');

  // Numbered run-on lists → one item per line
  if (/\b1\.\s+\S/.test(t) && /\b2\.\s+\S/.test(t)) {
    t = t.replace(/\s+(\d+)\.\s+/g, '\n$1. ');
  }

  // Colon then dash-list (common LLM pattern)
  t = t.replace(/:\s*-\s+/g, ':\n\n- ');

  // Newline before list markers after a sentence
  t = t.replace(/([.!?])\s+([-*•])\s+/g, '$1\n\n$2 ');

  t = t.replace(/([.!?])\s*\n-\s/g, '$1\n\n- ');

  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/** Safe inline **bold** (no HTML). */
function inlineFormatted(line: string): ReactNode {
  const segments = line.split(/(\*\*[^*]+\*\*)/g).filter((s) => s.length > 0);
  if (segments.length === 1) return line;
  return segments.map((seg, i) => {
    const m = seg.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {m[1]}
        </strong>
      );
    }
    return <Fragment key={i}>{seg}</Fragment>;
  });
}

function renderBotBlock(block: string, key: number): ReactNode {
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const bulletLine = (l: string) =>
    /^[-–—•*]\s+/.test(l) || /^[-–—•*][^\s]/.test(l);
  const numberedLine = (l: string) => /^\d{1,2}[.)]\s+/.test(l);

  if (lines.length >= 2 && lines.every(bulletLine)) {
    return (
      <ul
        key={key}
        className="my-1 pl-4 space-y-1.5 list-disc text-gray-800 marker:text-indigo-600"
      >
        {lines.map((l, i) => (
          <li key={i} className="leading-snug pl-0.5">
            {inlineFormatted(l.replace(/^[-–—•*]\s*/, '').replace(/^[-–—•*]/, ''))}
          </li>
        ))}
      </ul>
    );
  }

  if (lines.length >= 2 && lines.every(numberedLine)) {
    return (
      <ol
        key={key}
        className="my-1 pl-4 space-y-1.5 list-decimal text-gray-800 marker:text-indigo-600 marker:font-semibold"
      >
        {lines.map((l, i) => (
          <li key={i} className="leading-snug pl-1">
            {inlineFormatted(l.replace(/^\d{1,2}[.)]\s+/, ''))}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <p key={key} className="my-0 leading-relaxed text-gray-800">
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? <br /> : null}
          {inlineFormatted(line)}
        </Fragment>
      ))}
    </p>
  );
}

function BotMessageContent({ text }: { text: string }) {
  const formatted = formatBotMessage(text);
  const blocks = formatted.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-2.5 text-xs sm:text-sm font-normal">
      {blocks.map((block, idx) => renderBotBlock(block, idx))}
    </div>
  );
}

function Chatbot({ currentMood, currentCity }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hi! I'm your MoodMap assistant. I can help you find the perfect places based on your mood. ${currentMood ? `I see you're feeling ${currentMood.toLowerCase()}.` : 'How are you feeling today?'}`,
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageOverride?: string) => {
    const messageToSend = messageOverride ?? inputValue.trim();
    if (!messageToSend) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageToSend,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Call backend chatbot endpoint
      const response = await axios.post(`${API_BASE_URL}/api/chatbot`, {
        message: messageToSend,
        mood: currentMood,
        city: currentCity,
        conversationHistory: messages.slice(-5).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date()
      };

      setTimeout(() => {
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 500);
    } catch (error: any) {
      console.error('Chatbot error:', error);
      let errorText = "I'm having trouble connecting right now. Please try again in a moment!";
      
      // Provide more specific error messages
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        errorText = "Can't connect to the server. Please make sure the backend is running on port 5001.";
      } else if (error.response?.status === 404) {
        errorText = "The chatbot endpoint wasn't found. Please check the server configuration.";
      } else if (error.response?.status === 500) {
        errorText = error.response?.data?.response || "Server error occurred. Please try again.";
      } else if (error.response?.data?.response) {
        errorText = error.response.data.response;
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(); // no override — uses inputValue
    }
  };

  const quickQuestions = [
    "What places match my mood?",
    "Show me quiet places",
    "Where can I be active?",
    "Find social spots"
  ];

  return (
    <>
      {/* Chatbot Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-10 z-50 text-white p-3 sm:p-4 md:p-5 transition-all duration-300 hover:scale-110"
        style={{
          marginBottom: 'max(0px, env(safe-area-inset-bottom))',
          marginRight: 'max(0px, env(safe-area-inset-right))',
          backgroundColor: AI_ASSISTANT.solid,
          borderRadius: '50%',
          border: '2px solid rgba(196, 181, 253, 0.45)',
          fontFamily: "'Inter', sans-serif",
          boxShadow: AI_ASSISTANT.glow,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = AI_ASSISTANT.solidHover;
          e.currentTarget.style.boxShadow = AI_ASSISTANT.glowHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = AI_ASSISTANT.solid;
          e.currentTarget.style.boxShadow = AI_ASSISTANT.glow;
        }}
        aria-label="Open chatbot"
      >
        {isOpen ? (
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div
          className="fixed bottom-20 sm:bottom-24 right-2 sm:right-6 lg:bottom-28 lg:right-10 z-50 w-[calc(100vw-1rem)] sm:w-96 lg:w-[26rem] h-[calc(100vh-6rem)] sm:h-[600px] max-h-[600px] bg-white flex flex-col"
          style={{
            borderRadius: '16px',
            border: `2px solid ${AI_ASSISTANT.border}`,
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(196, 181, 253, 0.2)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Header */}
          <div
            className="text-white p-4"
            style={{
              background: `linear-gradient(135deg, #3730a3 0%, ${AI_ASSISTANT.solidHover} 100%)`,
              borderRadius: '14px 14px 0 0',
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base sm:text-lg md:text-xl truncate" style={{ fontFamily: "'Poppins', sans-serif" }}>MoodMap Assistant</h3>
                <p className="text-xs sm:text-sm font-medium" style={{ color: 'rgba(221, 214, 254, 0.95)' }}>
                  AI assistant
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white transition-colors"
                style={{ color: 'white' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ddd6fe')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'white')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="scrollbar-none flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4"
            style={{ backgroundColor: AI_ASSISTANT.light }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 ${
                    message.sender === 'user' ? 'font-semibold text-white' : 'bg-white border border-gray-200'
                  }`}
                  style={{
                    borderRadius: '12px',
                    ...(message.sender === 'user'
                      ? {
                          backgroundColor: AI_ASSISTANT.userBubble,
                          border: `1px solid ${AI_ASSISTANT.userBubbleBorder}`,
                        }
                      : {
                          border: `1px solid ${AI_ASSISTANT.border}`,
                        }),
                  }}
                >
                  {message.sender === 'bot' ? (
                    <div className="break-words">
                      <BotMessageContent text={message.text} />
                    </div>
                  ) : (
                    <p
                      className="text-xs sm:text-sm break-words"
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {message.text}
                    </p>
                  )}
                  <p
                    className={`text-[10px] sm:text-xs mt-2 pt-1.5 border-t border-opacity-30 ${
                      message.sender === 'user' ? 'border-white/25' : 'border-gray-200'
                    } ${message.sender === 'user' ? '' : 'text-gray-500'}`}
                    style={
                      message.sender === 'user' ? { color: 'rgba(237, 233, 254, 0.92)' } : {}
                    }
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div
                  className="rounded-lg px-4 py-2 shadow-sm border"
                  style={{ backgroundColor: 'white', borderColor: AI_ASSISTANT.border }}
                >
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: AI_ASSISTANT.solid, animationDelay: '0ms' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: AI_ASSISTANT.solid, animationDelay: '150ms' }}
                    />
                    <div
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ backgroundColor: AI_ASSISTANT.solid, animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold mb-2" style={{ color: AI_ASSISTANT.textOnLight }}>
                  Quick questions:
                </p>
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="w-full text-left text-xs sm:text-sm px-3 sm:px-4 py-2 transition-all font-semibold"
                    style={{
                      borderRadius: '10px',
                      fontFamily: "'Inter', sans-serif",
                      backgroundColor: 'white',
                      color: AI_ASSISTANT.textOnLight,
                      border: `2px solid ${AI_ASSISTANT.borderStrong}`,
                      boxShadow: '0 2px 10px rgba(49, 46, 129, 0.12)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = AI_ASSISTANT.lightHover;
                      e.currentTarget.style.borderColor = AI_ASSISTANT.solid;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = AI_ASSISTANT.borderStrong;
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="p-2 sm:p-4 border-t bg-white"
            style={{ borderRadius: '0 0 14px 14px', borderTopColor: AI_ASSISTANT.border }}
          >
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything…"
                className="flex-1 px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base outline-none focus:ring-2 focus:ring-violet-500/35 focus:border-violet-500"
                style={{
                  borderRadius: '10px',
                  border: `2px solid ${AI_ASSISTANT.border}`,
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: AI_ASSISTANT.light,
                  color: '#1e293b',
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="text-white px-3 sm:px-4 py-2 font-semibold disabled:opacity-50 transition-all flex-shrink-0 rounded-lg"
                style={{
                  backgroundColor: AI_ASSISTANT.solid,
                  fontFamily: "'Inter', sans-serif",
                  border: `1px solid ${AI_ASSISTANT.solidHover}`,
                  boxShadow: '0 2px 12px rgba(30, 27, 75, 0.4)',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = AI_ASSISTANT.solidHover;
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = AI_ASSISTANT.solid;
                }}
                aria-label="Send message"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Chatbot;
