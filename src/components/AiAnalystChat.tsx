import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, X, Send, Sparkles, RefreshCw, Copy, Check, MessageSquare, 
  ChevronDown, Minimize2, AlertCircle, Zap, ShieldAlert, TrendingUp, Layers
} from "lucide-react";
import { GeneratedReport } from "../types";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface AiAnalystChatProps {
  report?: GeneratedReport | null;
  addToast?: (title: string, message: string, type?: "info" | "success" | "warning" | "error", duration?: number) => void;
}

export const AiAnalystChat: React.FC<AiAnalystChatProps> = ({ report, addToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "👋 Hello! I am your **PMO AI Lead Analyst**. Ask me anything about the active Jira report metrics, team throughput, risks, or blocker mitigation strategies.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  const QUICK_PROMPTS = [
    { label: "🚨 Top Delivery Risks", prompt: "What are our primary sprint delivery risks and bottlenecks?" },
    { label: "⚡ Velocity Insights", prompt: "Summarize our current velocity performance and story points completion." },
    { label: "🎯 Blocker Mitigation", prompt: "How can we unblock high-priority issues currently stalling progress?" },
    { label: "📊 Executive Briefing", prompt: "Provide a 3-bullet executive briefing summary for stakeholders." },
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/pmo/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          reportContext: report ? {
            metrics: report.metrics,
            config: report.config,
            issues: report.issues?.slice(0, 30),
            summary: report.aiSummary
          } : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: "ai",
          text: data.reply || "I have analyzed the data.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error("AI Analyst service temporarily unreachable.");
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: "ai",
        text: `⚠️ **Analyst Note:** ${err.message || "Failed to process request."} Utilizing fallback report data analysis.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast?.("Copied to Clipboard", "AI response text copied.", "success", 2000);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "ai",
        text: "Conversation cleared. Ask me any follow-up questions about your active Jira metrics!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Helper to parse simple markdown formatting (bold, lists)
  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, lIdx) => {
      // Replace **text** with <strong>
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pIdx} className="font-black text-indigo-200">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
        return (
          <div key={lIdx} className="flex items-start gap-1.5 my-1 pl-1">
            <span className="text-indigo-400 font-bold shrink-0">•</span>
            <span>{renderedParts}</span>
          </div>
        );
      }
      
      if (line.trim().match(/^\d+\.\s/)) {
        return (
          <div key={lIdx} className="my-1 pl-1 font-medium">
            {renderedParts}
          </div>
        );
      }

      return (
        <p key={lIdx} className={line.trim() === "" ? "h-2" : "my-0.5"}>
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button (Launcher) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="fixed bottom-6 right-6 z-50 group bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white p-3.5 rounded-full shadow-[0_8px_32px_rgba(79,70,229,0.4)] hover:shadow-[0_12px_40px_rgba(79,70,229,0.6)] border border-indigo-400/40 transition-all duration-300 flex items-center gap-2.5 cursor-pointer scale-100 hover:scale-105"
          title="Open AI PMO Analyst Chat"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-900" />
          </div>
          <span className="hidden sm:inline text-xs font-black uppercase tracking-wider pr-1">
            AI Analyst
          </span>
          <span className="bg-white/20 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-white/20">
            Gemini 3.6
          </span>
        </button>
      )}

      {/* Floating Chat Modal Box */}
      {isOpen && (
        <div 
          className={`fixed right-4 sm:right-6 z-50 transition-all duration-300 ease-out shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-2xl border border-indigo-500/30 bg-slate-950/95 backdrop-blur-2xl flex flex-col overflow-hidden ${
            isMinimized 
              ? "bottom-6 w-80 h-14" 
              : "bottom-6 w-[calc(100vw-32px)] sm:w-[440px] h-[560px] max-h-[85vh]"
          }`}
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-blue-950/90 border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">
                    AI Report Analyst
                  </h3>
                  <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {report ? `Active Report: ${report.config?.selectedProjects?.join(", ") || "All Scope"}` : "No Active Report Loaded"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                title="Clear Chat History"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                title={isMinimized ? "Expand Chat" : "Minimize Chat"}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-all"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content (if not minimized) */}
          {!isMinimized && (
            <>
              {/* Quick Prompt Chips */}
              <div className="px-3 py-2 bg-slate-900/60 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(qp.prompt)}
                    className="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-600/30 border border-indigo-500/20 rounded-lg px-2.5 py-1 whitespace-nowrap transition-all shrink-0 cursor-pointer"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[9px] font-mono text-slate-500">
                      <span>{msg.sender === "user" ? "You" : "AI Lead Analyst"}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div
                      className={`group relative p-3 rounded-2xl max-w-[88%] leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-indigo-600 text-white rounded-tr-xs shadow-md"
                          : "bg-slate-900/90 text-slate-200 border border-white/10 rounded-tl-xs shadow-lg"
                      }`}
                    >
                      <div className="text-xs">
                        {renderFormattedText(msg.text)}
                      </div>

                      {msg.sender === "ai" && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white bg-slate-950/80 rounded transition-all"
                          title="Copy Answer"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[9px] font-mono text-slate-500">
                      <span>AI Lead Analyst</span>
                      <span>•</span>
                      <span>Analyzing...</span>
                    </div>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-3 text-slate-400 flex items-center gap-2 rounded-tl-xs">
                      <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                      <span className="text-xs font-medium">Evaluating active report context & metrics...</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Input Footer */}
              <div className="p-3 border-t border-white/10 bg-slate-950 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask follow-up questions about this Jira report..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
