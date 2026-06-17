import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  HelpCircle, 
  Sparkles, 
  Trash2, 
  Volume2, 
  VolumeX,
  MessageSquare,
  BookOpen,
  ArrowRight
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

const PRESET_QUESTIONS = [
  "What is the importance of Khushu (sincere focus) in Salah?",
  "How do I calculate Zakat on savings?",
  "What are some authentic morning Dhikr?",
  "Explain the virtues of patience (Sabr) in the Quran.",
  "Which Surahs are recommended to read on Fridays?"
];

export default function AIDeen() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("deen_companion_ai_chat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: "welcome",
        role: "model",
        content: "Assalamu Alaikum! I am **AI Deen**, your personal Islamic assistant. How can I help you acquire wisdom or answer your questions about Islam, prayers, moral values, or spiritual practices today?",
        timestamp: new Date()
      }
    ];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Persist messages in localStorage
  useEffect(() => {
    localStorage.setItem("deen_companion_ai_chat", JSON.stringify(messages));
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setErrorMsg(null);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Map history for the request
      const requestHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: textToSend,
          history: requestHistory
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: data.text || "I was unable to formulate a response at this moment. Please ask again shortly.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      console.error("Failed to fetch response:", err);
      setErrorMsg(err.message || "Something went wrong. Please check your connectivity or secrets setup.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your conversation history?")) {
      const reset = [
        {
          id: "welcome",
          role: "model",
          content: "Assalamu Alaikum! I am **AI Deen**, your personal Islamic assistant. How can I help you acquire wisdom or answer your questions about Islam, prayers, moral values, or spiritual practices today?",
          timestamp: new Date()
        }
      ] as Message[];
      setMessages(reset);
      setErrorMsg(null);
    }
  };

  // Basic implementation to format simple markdown elements (bold, paragraphs, etc.)
  const renderFormattedText = (text: string) => {
    const paragraphs = text.split("\n");
    return paragraphs.map((para, pIdx) => {
      if (!para.trim()) return <div key={pIdx} className="h-2"></div>;
      
      // Parse bold elements **text** or __text__
      let segments = para.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      const renderedPara = segments.map((seg, sIdx) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return <strong key={sIdx} className="font-extrabold text-[#735c00]">{seg.slice(2, -2)}</strong>;
        }
        if (seg.startsWith("*") && seg.endsWith("*")) {
          return <em key={sIdx} className="italic">{seg.slice(1, -1)}</em>;
        }
        return seg;
      });

      return (
        <p key={pIdx} className="text-xs leading-relaxed mb-1.5 font-sans font-medium text-slate-800 last:mb-0">
          {renderedPara}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col flex-grow bg-cream-bg space-y-4">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between bg-[#012d1d] text-white p-5 rounded-[28px] border border-gold-accent/30 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-primary-light/5 pointer-events-none"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold-accent/20 border border-gold-accent flex items-center justify-center animate-none">
            <Sparkles className="w-5 h-5 text-gold-accent" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-white flex items-center gap-1.5">
              AI Deen Assistant
            </h3>
            <p className="text-[10px] text-[#a5d0b9] font-medium tracking-wide uppercase">Islamic Scholar AI Guide</p>
          </div>
        </div>
        
        {messages.length > 1 && (
          <button 
            onClick={handleClearHistory}
            className="p-2 bg-white/5 hover:bg-white/15 text-gold-accent hover:text-red-400 rounded-full border-none cursor-pointer transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Main chat viewport */}
      <div className="flex-grow bg-white border border-outline-variant/40 rounded-[32px] p-4.5 shadow-sm min-h-[350px] max-h-[500px] overflow-y-auto space-y-4 flex flex-col justify-between">
        <div className="space-y-4 overflow-y-auto pr-1 flex-grow">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-[20px] px-4 py-3 shadow-xs ${
                  msg.role === 'user' 
                    ? 'bg-[#012d1d] text-white rounded-br-xs' 
                    : 'bg-[#fed65b]/12 border border-gold-accent/20 text-slate-800 rounded-bl-xs'
                }`}
              >
                {/* Custom formatted text container */}
                <div className={`${msg.role === 'user' ? 'text-white' : 'text-slate-900'}`}>
                  {msg.role === 'user' ? (
                    <p className="text-xs font-semibold leading-relaxed font-sans">{msg.content}</p>
                  ) : (
                    renderFormattedText(msg.content)
                  )}
                </div>
                
                <span className={`text-[8px] font-medium tracking-wider block mt-1 ${
                  msg.role === 'user' ? 'text-white/50 text-right' : 'text-slate-500 text-left'
                }`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-[11px] font-sans font-semibold bg-slate-50 w-fit rounded-full px-4 py-2 border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-gold-accent animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 rounded-full bg-gold-accent animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 rounded-full bg-gold-accent animate-bounce"></span>
              <span>AI Deen is reflecting...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-sans font-semibold flex items-center gap-2">
              <span className="text-red-500">⚠</span>
              <span>{errorMsg}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Preset quick chip questions */}
      {messages.length <= 1 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-sans font-extrabold uppercase tracking-wider text-[#735c00] flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-gold-accent" />
            Suggested Questions for Guidance:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-left px-3 py-2 bg-white hover:bg-gold-accent/15 border border-outline-variant/50 hover:border-gold-accent rounded-xl text-[10.5px] font-bold text-slate-700 hover:text-primary-base transition-all duration-300 flex items-center justify-between group cursor-pointer"
              >
                <span>{q}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-gold-accent shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Entry Composer */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="flex gap-2.5 items-center pt-2"
      >
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your Deen..."
          className="flex-grow text-xs font-bold font-sans text-primary-base rounded-2xl border border-outline-variant bg-white p-3.5 focus:outline-none focus:border-gold-accent shadow-sm"
          disabled={isLoading}
        />
        <button 
          type="submit"
          className="p-3.5 bg-primary-base hover:bg-primary-light text-white rounded-2xl shadow transition-all active:scale-95 flex items-center justify-center border-none cursor-pointer text-gold-accent"
          disabled={isLoading || !input.trim()}
        >
          <Send className="w-4 h-4 fill-gold-accent text-gold-accent" />
        </button>
      </form>
    </div>
  );
}
