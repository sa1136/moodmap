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

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const messageToSend = inputValue.trim(); // Save message before clearing
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
      handleSend();
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
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-800 to-purple-800 text-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        style={{ 
          borderRadius: '50%',
          border: '4px solid #2d3436',
          boxShadow: '6px 6px 0px rgba(45, 52, 54, 0.3)',
          fontFamily: "'Inter', sans-serif"
        }}
        aria-label="Open chatbot"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white shadow-2xl flex flex-col"
          style={{
            borderRadius: '16px',
            border: '4px solid #2d3436',
            boxShadow: '8px 8px 0px rgba(45, 52, 54, 0.3)',
            fontFamily: "'Inter', sans-serif"
          }}
        >
          {/* Header */}
          <div 
            className="bg-gradient-to-r from-blue-800 via-purple-800 to-teal-800 text-white p-4"
            style={{ borderRadius: '16px' }}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xl" style={{ fontFamily: "'Poppins', sans-serif" }}>MoodMap Assistant</h3>
                <p className="text-sm font-semibold" style={{ color: '#cbd5e1' }}>✨ AI-Powered Recommendations</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-purple-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 font-semibold ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-800 to-purple-800 text-white'
                      : 'bg-slate-700 text-white'
                  }`}
                  style={{
                    borderRadius: '12px',
                    border: '3px solid #2d3436',
                    boxShadow: '3px 3px 0px rgba(45, 52, 54, 0.2)'
                  }}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
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
                    onClick={() => {
                      setInputValue(q);
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="w-full text-left text-sm bg-white hover:bg-yellow-100 font-bold border-3 border-gray-800 px-4 py-2 transition-all"
                    style={{
                      borderRadius: '10px',
                      boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.3)',
                      fontFamily: "'Inter', sans-serif",
                      backgroundColor: '#1e293b',
                      color: 'white'
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
          <div className="p-4 border-t-4 border-slate-900 bg-slate-800" style={{ borderRadius: '0 0 16px 4px' }}>
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything... ✨"
                className="flex-1 px-4 py-2 font-semibold"
                style={{
                  borderRadius: '10px',
                  border: '3px solid #1a1a1a',
                  boxShadow: '3px 3px 0px rgba(0, 0, 0, 0.2)',
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: '#1e293b',
                  color: 'white'
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="doodle-button bg-gradient-to-r from-blue-800 to-purple-800 text-white px-4 py-2 font-semibold disabled:opacity-50 transition-all"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
