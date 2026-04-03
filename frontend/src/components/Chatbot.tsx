import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

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

function formatBotMessage(text: string): string {
  let t = (text || '').trim();
  if (!t) return t;

  // Add newlines before common "Some options:" style intros.
  t = t.replace(/(include:)/gi, '$1\n');

  // Convert inline numbered lists "1. X 2. Y" into multiline bullets.
  // Example: "... include: 1. A - ... 2. B - ..." -> "- A - ...\n- B - ..."
  if (/\b1\.\s+/.test(t) && /\b2\.\s+/.test(t)) {
    t = t.replace(/\s*(\d+)\.\s+/g, '\n- ');
  }

  // Ensure there's spacing after sentence boundaries when a bullet begins.
  t = t.replace(/([.!?])\s*\n-\s/g, '$1\n\n- ');

  // Collapse excessive blank lines.
  t = t.replace(/\n{3,}/g, '\n\n');

  return t.trim();
}

const Chatbot: React.FC<ChatbotProps> = ({ currentMood, currentCity }) => {
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
      const response = await axios.post('http://localhost:5001/api/chatbot', {
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
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 text-white p-3 sm:p-4 md:p-5 transition-all duration-300 hover:scale-110"
        style={{ 
          backgroundColor: '#7c3aed',
          borderRadius: '50%',
          border: 'none',
          fontFamily: "'Inter', sans-serif"
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'} 
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
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
          className="fixed bottom-20 sm:bottom-24 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-96 h-[calc(100vh-6rem)] sm:h-[600px] max-h-[600px] bg-white flex flex-col"
          style={{
            borderRadius: '16px',
            border: '2px solid #e2e8f0',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          {/* Header */}
          <div 
            className="text-white p-4"
            style={{ backgroundColor: '#7c3aed', borderRadius: '16px 16px 0 0' }}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base sm:text-lg md:text-xl truncate" style={{ fontFamily: "'Poppins', sans-serif" }}>MoodMap Assistant</h3>
                <p className="text-xs sm:text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>AI-Powered</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white transition-colors" style={{ color: 'white' }} onMouseEnter={(e) => e.currentTarget.style.color = '#f5f1eb'} onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2 sm:py-3 font-semibold ${
                    message.sender === 'user'
                      ? 'text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                  style={{
                    borderRadius: '12px',
                    ...(message.sender === 'user' ? { backgroundColor: '#7c3aed' } : {})
                  }}
                >
                  <p
                    className="text-xs sm:text-sm break-words"
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {message.sender === 'bot' ? formatBotMessage(message.text) : message.text}
                  </p>
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? '' : 'text-gray-400'}`} style={message.sender === 'user' ? { color: '#f5f1eb' } : {}}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-2">Quick questions:</p>
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="w-full text-left text-xs sm:text-sm px-3 sm:px-4 py-2 transition-all hover:bg-slate-600 font-semibold"
                    style={{
                      borderRadius: '10px',
                      boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.3)',
                      fontFamily: "'Inter', sans-serif",
                      backgroundColor: '#1e293b',
                      color: 'white',
                      border: '3px solid #1a1a1a'
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
          <div className="p-2 sm:p-4 border-t border-gray-200 bg-white" style={{ borderRadius: '0 0 16px 16px' }}>
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything... ✨"
                className="flex-1 px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base"
                style={{
                  borderRadius: '10px',
                  border: '2px solid #e2e8f0',
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: 'white',
                  color: '#1e293b'
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                className="text-white px-3 sm:px-4 py-2 font-semibold disabled:opacity-50 transition-all flex-shrink-0 rounded-lg"
                style={{ backgroundColor: '#7c3aed', fontFamily: "'Inter', sans-serif", border: 'none' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#6d28d9')} 
                onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#7c3aed')}
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
};

export default Chatbot;
