import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, RefreshCw, X, Sparkles, Paperclip } from 'lucide-react';
import { aiApi } from '../../api/aiApi';
import { transactionApi } from '../../api/transactionApi';
import './ChatBotWidget.css';

export default function ChatBotWidget({ isFloating = false, onClose }) {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('finmitra_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
    return [
      {
        sender: 'ai',
        text: "Hi! I'm FinMitra AI, your personal financial assistant. Ask me anything about your finances, or upload a receipt to automatically log a transaction!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem('finmitra_ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleSend = async (textToSend) => {
    const query = textToSend || inputMsg;
    if (!query.trim()) return;

    const userMessage = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputMsg('');
    setLoading(true);

    try {
      const response = await aiApi.sendMessage(query);
      const replyText = typeof response === 'string' ? response : (response?.reply || response?.response || response?.text || '');
      const aiMessage = {
        sender: 'ai',
        text: replyText || "I am analyzing your finances. Feel free to ask about your transactions or savings!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "Sorry, I had trouble analyzing your finances right now. Please try again!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result.split(',')[1];
      const mimeType = file.type;

      setMessages(prev => [...prev, {
        sender: 'user',
        text: `[Uploaded Receipt: ${file.name}]`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      
      setLoading(true);

      try {
        const parsedData = await aiApi.parseReceiptImage(base64String, mimeType);
        
        if (parsedData && parsedData.amount > 0 && parsedData.category) {
          // Add transaction to DB
          await transactionApi.createTransaction(parsedData);
          
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: `Successfully extracted and saved transaction!\nAmount: ₹${parsedData.amount}\nCategory: ${parsedData.category}\nDate: ${parsedData.date}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            sender: 'ai',
            text: "I couldn't confidently extract transaction details from this receipt. Please ensure the image is clear and contains a payment amount.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      } catch (err) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: "Sorry, there was an error analyzing the receipt.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const clearHistory = () => {
    localStorage.removeItem('finmitra_ai_chat_history');
    setMessages([{
      sender: 'ai',
      text: "Chat history cleared. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const quickChips = [
    "What is my total expense?",
    "Which is my highest spend?",
    "Am I over budget?",
    "Give me savings advice"
  ];

  return (
    <div className={`chatbot-card ${isFloating ? 'floating-card' : ''}`}>
      {/* Chatbot Header */}
      <div className="chatbot-header">
        <div className="bot-info">
          <div className="bot-avatar">
            <Bot size={20} color="#00E676" />
          </div>
          <div>
            <h4 className="bot-name">FinMitra AI Assistant</h4>
            <span className="bot-status">● Active Financial Advisor</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="close-chat-btn" onClick={clearHistory} title="Clear Chat History">
            <RefreshCw size={16} />
          </button>
          {isFloating && onClose && (
            <button className="close-chat-btn" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="chatbot-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-bubble-wrapper ${msg.sender}`}>
            <div className={`message-bubble ${msg.sender}`}>
              <p className="message-text">{msg.text}</p>
              <span className="message-time">{msg.time}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-bubble-wrapper ai">
            <div className="message-bubble ai loading-bubble">
              <RefreshCw size={16} className="spin-icon" /> Analyzing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="chat-chips-row">
        {quickChips.map((chip, idx) => (
          <button 
            key={idx} 
            className="chat-chip"
            onClick={() => handleSend(chip)}
          >
            <Sparkles size={12} /> {chip}
          </button>
        ))}
      </div>

      {/* Input Row */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="chatbot-input-form">
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileUpload}
        />
        <button 
          type="button" 
          className="upload-btn" 
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          title="Upload Receipt"
        >
          <Paperclip size={18} />
        </button>
        
        <input 
          type="text" 
          placeholder="Ask FinMitra AI about your finances..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="send-btn" disabled={loading || !inputMsg.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
