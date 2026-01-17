import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import api from '../services/api';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await api.sendMessage(inputValue, conversationId);
      
      if (!conversationId) {
        setConversationId(response.conversationId);
      }

      setMessages(response.history);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (conversationId) {
      try {
        await api.clearHistory(conversationId);
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
    
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#140a24] text-purple-100">
      {/* Header */}
      <header className="bg-[#1b0f2f] border-b border-purple-500/20 p-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-purple-50">Omni Board Chat</h1>
            <p className="text-sm text-purple-300">KiCad MCP Integration</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-none transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center text-purple-300 mt-20">
              <h2 className="text-xl mb-4 text-purple-100">Welcome to Omni Board</h2>
              <p className="mb-2">Ask me to design a PCB circuit, and I'll generate:</p>
              <ul className="text-sm space-y-1">
                <li>✓ KiCad PCB file (.kicad_pcb)</li>
                <li>✓ Design description for PM tools</li>
              </ul>
              <p className="mt-6 text-xs text-purple-400">
                Example: "Design a blinking LED circuit with a 555 timer"
              </p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              isUser={message.role === 'user'}
            />
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="chat-message assistant-message flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating PCB design...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-[#1b0f2f] border-t border-purple-500/20 p-4">
        <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe your PCB design requirements..."
              className="flex-1 bg-[#241336] text-purple-100 border border-purple-500/30 rounded-none px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900 disabled:cursor-not-allowed text-white rounded-none px-6 py-3 flex items-center space-x-2 transition-colors"
            >
              <Send className="w-5 h-5" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
