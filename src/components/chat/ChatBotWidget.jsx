import React, { useState, useRef, useEffect } from 'react';
import { aiApi } from '../../api/aiApi';
import { transactionApi } from '../../api/transactionApi';

export default function ChatBotWidget({ isFloating = false, onClose }) {
  // Always start with a fresh new chat session
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hi! I'm FinMitra AI, your personal financial assistant. Ask me anything about your finances, or upload a receipt to automatically log a transaction!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  const [showHistory, setShowHistory] = useState(false);
  const [historyMessages, setHistoryMessages] = useState([]);
  
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load history from localStorage once on mount
  useEffect(() => {
    const saved = localStorage.getItem('finmitra_ai_chat_history');
    if (saved) {
      try {
        setHistoryMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showHistory]);

  const appendToHistory = (newMsg) => {
    setHistoryMessages(prev => {
      const updated = [...prev, newMsg];
      localStorage.setItem('finmitra_ai_chat_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || inputMsg;
    if (!query.trim()) return;

    const userMessage = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    appendToHistory(userMessage);
    
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
      appendToHistory(aiMessage);
    } catch (err) {
      const errorMsg = {
        sender: 'ai',
        text: "Sorry, I had trouble analyzing your finances right now. Please try again!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
      appendToHistory(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result.split(',')[1];
      const mimeType = file.type;

      const userMsg = {
        sender: 'user',
        text: `[Uploaded Receipt: ${file.name}]`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);
      appendToHistory(userMsg);
      
      setLoading(true);

      try {
        const parsedData = await aiApi.parseReceiptImage(base64String, mimeType);
        
        let aiMsg;
        if (parsedData && parsedData.amount > 0 && parsedData.category) {
          const merchantName = (parsedData.merchant && parsedData.merchant !== 'Unknown Merchant')
            ? parsedData.merchant
            : (parsedData.note || 'Receipt Expense');

          const txPayload = {
            amount: parseFloat(parsedData.amount),
            category: parsedData.category,
            note: merchantName,
            type: (parsedData.type || 'EXPENSE').toUpperCase(),
            date: parsedData.date || new Date().toISOString().split('T')[0]
          };

          await transactionApi.createTransaction(txPayload);
          aiMsg = {
            sender: 'ai',
            text: `Successfully extracted and saved receipt transaction!\nMerchant: ${merchantName}\nAmount: ₹${txPayload.amount.toLocaleString('en-IN')}\nCategory: ${txPayload.category}\nDate: ${txPayload.date}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        } else {
          aiMsg = {
            sender: 'ai',
            text: "I couldn't confidently extract transaction details from this receipt. Please ensure the image is clear and contains a payment amount.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        setMessages(prev => [...prev, aiMsg]);
        appendToHistory(aiMsg);
      } catch (err) {
        const errObj = {
          sender: 'ai',
          text: "Sorry, there was an error analyzing the receipt.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errObj]);
        appendToHistory(errObj);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const clearHistory = () => {
    localStorage.removeItem('finmitra_ai_chat_history');
    setHistoryMessages([]);
    setMessages([{
      sender: 'ai',
      text: "Chat history cleared. How can I help you today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setShowHistory(false);
  };

  const quickChips = [
    "Total expense?",
    "Highest spend?",
    "Am I over budget?",
    "Savings advice"
  ];

  const displayedMessages = showHistory ? historyMessages : messages;

  return (
    <div className={`flex flex-col bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden h-[600px] ${isFloating ? 'fixed bottom-4 right-4 w-80 md:w-96 shadow-lg z-50' : 'w-full'}`}>
      {/* Header */}
      <div className="bg-surface-container px-4 py-3 border-b border-outline-variant flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm flex items-center justify-center shrink-0 border border-outline-variant bg-surface-container-high">
            <img src="/logo.png" alt="FinMitra AI" className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="font-label-md text-primary">FinMitra AI</h4>
            <span className="font-label-sm text-secondary flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
              {showHistory ? 'Viewing History' : 'Online'}
            </span>
          </div>
        </div>

        <div className="flex gap-2 text-on-surface-variant">
          <button 
            className={`p-1.5 rounded hover:bg-surface-container-high transition-colors ${showHistory ? 'text-secondary' : ''}`}
            onClick={() => setShowHistory(!showHistory)} 
            title={showHistory ? "Back to Chat" : "History"}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
          </button>
          <button className="p-1.5 rounded hover:bg-surface-container-high transition-colors" onClick={clearHistory} title="Clear Chat">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
          {isFloating && onClose && (
            <button className="p-1.5 rounded hover:bg-surface-container-high transition-colors" onClick={onClose} title="Close">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface/50">
        {displayedMessages.length === 0 && showHistory && (
          <div className="text-center text-on-surface-variant font-body-md mt-4">No past conversations found.</div>
        )}
        {displayedMessages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
            <div className={`p-3 rounded-xl font-body-md shadow-sm whitespace-pre-wrap ${
              msg.sender === 'user' 
                ? 'bg-primary text-on-primary rounded-tr-sm' 
                : 'bg-surface-container-lowest border border-outline-variant text-on-surface rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
            <span className="text-[10px] text-on-surface-variant mt-1 px-1">{msg.time}</span>
          </div>
        ))}
        {loading && !showHistory && (
          <div className="flex flex-col max-w-[85%] self-start items-start">
            <div className="p-3 rounded-xl font-body-md bg-surface-container-lowest border border-outline-variant text-on-surface rounded-tl-sm flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-[16px] text-secondary">refresh</span>
              Analyzing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Chips */}
      {!showHistory && (
        <div className="px-3 pb-2 pt-1 flex gap-2 overflow-x-auto shrink-0 scrollbar-hide">
          {quickChips.map((chip, idx) => (
            <button 
              key={idx} 
              className="whitespace-nowrap px-3 py-1.5 bg-surface-container border border-outline-variant rounded-full font-label-sm text-primary hover:bg-surface-container-high transition-colors"
              onClick={() => handleSend(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      {!showHistory ? (
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-surface-container-lowest border-t border-outline-variant flex items-center gap-2 shrink-0">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-full text-secondary hover:bg-surface-container transition-colors disabled:opacity-50 shrink-0"
            title="Upload Receipt"
          >
            <span className="material-symbols-outlined">attach_file</span>
          </button>
          
          <input 
            type="text" 
            placeholder="Ask FinMitra AI..."
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={loading}
            className="flex-1 bg-surface-container-low border border-outline-variant rounded-full px-4 py-2 font-body-md text-on-surface focus:outline-none focus:border-secondary disabled:opacity-50"
          />
          
          <button 
            type="submit" 
            disabled={loading || !inputMsg.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>
      ) : (
        <div className="p-4 bg-surface-container-lowest border-t border-outline-variant flex flex-col items-center shrink-0">
          <p className="font-label-sm text-on-surface-variant mb-2">You are viewing past conversations.</p>
          <button 
            onClick={() => setShowHistory(false)} 
            className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-label-md hover:bg-secondary-container transition-colors"
          >
            Return to Chat
          </button>
        </div>
      )}
    </div>
  );
}
