import React, { useState, useRef, useEffect } from "react";
import { Message, DifficultyLevel, Scenario } from "../types";
import { 
  Send, 
  Volume2, 
  Mic, 
  MicOff, 
  Settings, 
  RefreshCw, 
  GraduationCap, 
  Languages, 
  HelpCircle,
  Clock,
  CheckCircle,
  Copy,
  Plus
} from "lucide-react";

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  currentLevel: DifficultyLevel;
  activeScenario: Scenario;
  onResetChat: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  inputText: string;
  setInputText: (text: string) => void;
}

export default function ChatWindow({
  messages,
  onSendMessage,
  isLoading,
  currentLevel,
  activeScenario,
  onResetChat,
  inputRef,
  inputText,
  setInputText
}: ChatWindowProps) {
  const [accent, setAccent] = useState<'us' | 'uk'>('us');
  const [speed, setSpeed] = useState<number>(1.0);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  
  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Set up Speech Recognition on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US"; // Practice English speaking

      rec.onstart = () => {
        setIsRecording(true);
        setRecognitionError(null);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(inputText ? inputText + " " + transcript : transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        if (e.error === 'not-allowed') {
          setRecognitionError("麦克风权限被拒绝，请在浏览器地址栏开启麦克风。");
        } else {
          setRecognitionError("未能看清您的声音，请重试或打字输入。");
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Handle Speech Toggle
  const handleToggleRecord = () => {
    if (!recognitionRef.current) {
      alert("您的浏览器不支持 Web Speech API。推荐使用 Chrome 或 Edge 浏览器进行麦克风语音录入。");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Speaks any English sentence with custom speed and accent
  const handleSpeakText = (text: string, messageId: string) => {
    try {
      if (!('speechSynthesis' in window)) {
        alert("浏览器不支持语音合成TTS功能。");
        return;
      }

      window.speechSynthesis.cancel();

      if (isSpeakingId === messageId) {
        // Toggle off if clicking the same speaking bubble
        setIsSpeakingId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = accent === 'us' ? 'en-US' : 'en-GB';
      utterance.rate = speed;

      utterance.onstart = () => {
        setIsSpeakingId(messageId);
      };

      utterance.onend = () => {
        setIsSpeakingId(null);
      };

      utterance.onerror = () => {
        setIsSpeakingId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("TTS speech error", err);
      setIsSpeakingId(null);
    }
  };

  const handleCopyText = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    alert("文本已复制到剪贴板。 (Copied to clipboard!)");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!inputText.trim() || isLoading) return;
      onSendMessage(inputText);
    }
  };

  return (
    <div className="h-full flex flex-col bg-stone-50/40 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden relative">
      
      {/* Top Bar Controls */}
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-90 origin-left">
                {activeScenario.name}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
              Active Context: {activeScenario.description}
            </p>
          </div>
        </div>

        {/* Global Sound/Speak Settings Panel */}
        <div className="flex items-center gap-4">
          {/* Accent toggler */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10.5px] font-semibold border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setAccent('us')}
              className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                accent === 'us'
                  ? "bg-white dark:bg-zinc-900 shadow-xs text-indigo-600 dark:text-indigo-400"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              🇺🇸 美音 (US)
            </button>
            <button
              onClick={() => setAccent('uk')}
              className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                accent === 'uk'
                  ? "bg-white dark:bg-zinc-900 shadow-xs text-indigo-600 dark:text-indigo-400"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              🇬🇧 英音 (UK)
            </button>
          </div>

          {/* Speed slider */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">语速 (Speed)</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-16 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 w-5">
              {speed.toFixed(1)}x
            </span>
          </div>

          <button
            onClick={onResetChat}
            className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-500 hover:text-indigo-600 cursor-pointer transition flex items-center gap-1"
            title="清空记录重新开始对话"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-[11px] font-semibold pr-0.5">重开对话</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 text-zinc-400 max-w-sm mx-auto">
            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-full mb-4">
              <Languages className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-bounce" />
            </div>
            <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">开始您的沉浸式英语之旅</p>
            <p className="text-xs text-zinc-500 mt-2">
              您可用在底部文本框打字，或者开启麦克风朗读，还可以点击右侧的智能建议快捷回复。
            </p>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          if (m.role === "system") {
            return (
              <div key={m.id} className="flex justify-center my-3 animate-fade-in">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shadow-3xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  {m.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={`flex w-full group ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                {/* Message Bubble Container */}
                <div 
                  className={`rounded-2xl px-4 py-3 shadow-xs relative transition-all duration-200 ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-none hover:bg-indigo-700" 
                      : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none hover:shadow-xs"
                  }`}
                >
                  {/* Speech Trigger widget */}
                  <div className="flex justify-between items-start gap-3 mb-1">
                    {/* Speaker indicator badge */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                        isUser
                          ? "bg-indigo-500/65 text-white"
                          : m.isFallback
                          ? "bg-amber-500 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      }`}>
                        {isUser ? "You" : m.isFallback ? "AI Coach (Backup)" : "AI Coach"}
                      </span>
                      {!isUser && m.isFallback && (
                        <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.2 bg-amber-50/90 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-900 animate-pulse">
                          ⚠️ 离线抗压模式 (AI 服务繁忙)
                        </span>
                      )}
                    </div>

                    {/* Speech broadcast, double check, and copy actions for easier interactions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSpeakText(m.content, m.id)}
                        className={`p-1 rounded transition-colors ${
                          isUser 
                            ? "hover:bg-indigo-500 text-indigo-200 hover:text-white" 
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-600"
                        } ${isSpeakingId === m.id ? "animate-pulse text-rose-500! dark:text-rose-400!" : ""}`}
                        title="朗读本句话 (Speak out loud)"
                      >
                        <Volume2 className={`h-3.5 w-3.5 ${isSpeakingId === m.id ? "scale-110" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => handleCopyText(m.content, e)}
                        className={`p-1 rounded transition-colors ${
                          isUser 
                            ? "hover:bg-indigo-500 text-indigo-200 hover:text-white" 
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-600"
                        }`}
                        title="复制这行内容"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Content Bubble Text */}
                  <p className="text-[13px] leading-relaxed break-words font-sans selection:bg-indigo-200">
                    {m.content}
                  </p>
                  
                  {/* Mini Audio visual wave if it's currently reading this message */}
                  {isSpeakingId === m.id && (
                    <div className="flex items-center gap-0.5 mt-2 h-3 justify-center">
                      <div className="w-0.5 h-full bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-0.5 h-full bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-0.5 h-full bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>

                {/* Micro info footer below the bubble */}
                <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-400 font-mono">
                  <Clock className="h-2.5 w-2.5 text-zinc-300" />
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Streaming / AI Loading indicators */}
        {isLoading && (
          <div className="flex w-full justify-start animate-fade-in">
            <div className="max-w-[80%] flex flex-col items-start">
              <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold uppercase px-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded p-0.5">AI Coach</span>
                  <p className="text-[11px] text-zinc-400 italic">Thinking and checking grammar...</p>
                </div>
                <div className="flex items-center gap-1 mt-3">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mic permission/status toast helper */}
      {recognitionError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-amber-50 dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 px-4 py-2 rounded-xl shadow-md flex items-center gap-2 z-20 text-xs animate-slide-up text-amber-700 dark:text-amber-400">
          <HelpCircle className="h-4 w-4 flex-shrink-0 animate-bounce" />
          <span>{recognitionError}</span>
          <button 
            onClick={() => setRecognitionError(null)}
            className="text-[10px] underline font-bold pl-2 cursor-pointer"
          >
            我已知晓
          </button>
        </div>
      )}

      {/* Bottom Input Drawer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 backdrop-blur z-10">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          {/* Audio Speaking Mic Input Button */}
          <button
            type="button"
            onClick={handleToggleRecord}
            className={`p-3 rounded-xl border flex-shrink-0 flex items-center justify-center transition cursor-pointer relative ${
              isRecording 
                ? "bg-rose-50 border-rose-400 text-rose-600 animate-pulse" 
                : "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-400 hover:text-indigo-600"
            }`}
            title={isRecording ? "正在倾听您的发音... 再次点击停止录音" : "开启口语录音 (Practice speaking)"}
          >
            {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            
            {isRecording && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-600 text-[8px] font-extrabold text-white rounded-full flex items-center justify-center border-2 border-white">
                !
              </span>
            )}
          </button>

          {/* Text Area Input */}
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "正在听写您的英文发音..." : "输入英文以练习聊天... (支持 Shift+Enter 换行)"}
              className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 text-[13px] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-xl py-2 pl-3 pr-10 resize-none font-sans"
              disabled={isLoading}
            />
            {inputText.trim() && (
              <button
                type="button"
                onClick={() => setInputText("")}
                className="absolute right-3.5 top-2.5 p-1 text-zinc-300 hover:text-zinc-500"
                title="清空输入框"
              >
                &times;
              </button>
            )}
          </div>

          {/* Send Action */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className={`p-3 px-4 rounded-xl flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
              !inputText.trim() || isLoading
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                : "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:shadow"
            }`}
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </form>

        <div className="flex justify-between items-center mt-2.5 text-[10px] text-zinc-400">
          <span>建议：您可以直接点击右侧智能接话泡泡，帮助您高效构思地道英文。</span>
          <span>按 <strong className="font-semibold text-zinc-600">Enter</strong> 发送</span>
        </div>
      </div>

    </div>
  );
}
