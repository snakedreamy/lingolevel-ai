import { useState, useEffect, useRef } from "react";
import {
  Message, DifficultyLevel, Scenario, AnalysisResult, BrowserPrefs
} from "./types";
import { LEVELS, SCENARIOS } from "./data";
import SettingsModal from "./components/SettingsModal";
import ChatWindow from "./components/ChatWindow";
import AnalysisSidebar from "./components/AnalysisSidebar";
import WordBook from "./components/WordBook";
import { useBrowserPrefs } from "./features/settings/useBrowserPrefs";
import { useWordBook } from "./features/wordbook/useWordBook";
import {
  BookMarked, Sparkles, HelpCircle, Volume2,
  GraduationCap, Compass, MessageCircle, Menu, X, BookOpen,
  FolderSync, Heart, Settings, Moon, Sun
} from "lucide-react";

export default function App() {
  const { prefs, setPrefs, serverConfig, configMismatch, dismissMismatch } = useBrowserPrefs()
  const { savedWords, addWord, removeWord, clearAllWords } = useWordBook()
  const [currentLevel, setCurrentLevel] = useState<DifficultyLevel>(prefs.level)
  const initialScenario = SCENARIOS.find((s) => s.id === prefs.scenarioId) ?? SCENARIOS[0]
  const [activeScenario, setActiveScenario] = useState<Scenario>(initialScenario)
  const [messages, setMessages] = useState<Message[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  const [inputText, setInputText] = useState("")
  const [isWordBookOpen, setIsWordBookOpen] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Set up initial welcome messages based on level and scenario
  useEffect(() => {
    resetConversationOnScenario(activeScenario, currentLevel);
  }, []);

  // helper to reset chat
  const resetConversationOnScenario = async (scenario: Scenario, level: DifficultyLevel) => {
    const starterEnglish = scenario.starterMessages[Math.floor(Math.random() * scenario.starterMessages.length)];
    
    const initialMsg: Message = {
      id: "starter-" + Date.now(),
      role: "assistant",
      content: starterEnglish,
      timestamp: Date.now()
    };

    setMessages([initialMsg]);
    setIsAnalysisLoading(true);

    try {
      // Analyze the starter message immediately so user gets starting tips instantly
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "",
          assistantMessage: starterEnglish,
          level: level
        })
      });
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
    } catch (err) {
      console.error("Failed to analyze starter message", err);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // Switch scenario handler
  const handleScenarioSelect = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setPrefs((p) => ({ ...p, scenarioId: scenario.id }));
    resetConversationOnScenario(scenario, currentLevel);
  };

  // Switch difficulty level handler
  const handleLevelChange = (level: DifficultyLevel) => {
    setCurrentLevel(level);
    setPrefs((p) => ({ ...p, level }));
    const levelName = LEVELS.find(l => l.id === level)?.name || level;
    const systemMsg: Message = {
      id: "level-notice-" + Date.now(),
      role: "system",
      content: `⚙️ 难度成功调整为: ${levelName} | 下一轮发言 AI 将自动调频适配该难度`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, systemMsg]);
  };

  const handleSavePrefs = (next: BrowserPrefs) => {
    setPrefs(next);
    if (next.level !== currentLevel) {
      handleLevelChange(next.level);
    }
    if (next.scenarioId !== activeScenario.id) {
      const newScenario = SCENARIOS.find((s) => s.id === next.scenarioId) ?? activeScenario;
      handleScenarioSelect(newScenario);
    }
  };

  const handleClearAllWords = () => {
    if (window.confirm("确定要清空您收集的所有单词和口语短语吗？此操作无法撤销。")) {
      clearAllWords();
    }
  };

  // Send Message Loop
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return;

    const userMsg: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: text,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText("");
    setIsChatLoading(true);
    setIsAnalysisLoading(true);

    try {
      // A. Call Chat API to get AI Response matching Level Prompt
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.role === "user" || m.role === "assistant"),
          level: currentLevel,
          scenarioInfo: activeScenario.id !== 'free_chat' ? activeScenario : null
        })
      });

      if (!chatRes.ok) {
        throw new Error("Failed to communicate with AI");
      }

      const chatData = await chatRes.json();
      
      const assistantMsg: Message = {
        id: "assistant-" + Date.now(),
        role: "assistant",
        content: chatData.content,
        timestamp: chatData.timestamp || Date.now(),
        isFallback: !!chatData.isFallback
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsChatLoading(false);

      // B. Instantly prompt analysis in the sidebox (Translates User sentence & corrects grammar)
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: text,
          assistantMessage: chatData.content,
          level: currentLevel
        })
      });

      if (analyzeRes.ok) {
        const analyzeData = await analyzeRes.json();
        setAnalysis(analyzeData);
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: "error-" + Date.now(),
        role: "assistant",
        content: `抱歉，AI 服务暂时无响应。请检查服务器的 .env.local 中 PROVIDER 和对应的 API 密钥是否正确配置，并确认网络连接正常。`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
      setIsAnalysisLoading(false);
    }
  };

  const handleSelectSuggestion = (text: string) => {
    setInputText(text);
    inputRef.current?.focus();
  };

  const handleResetChat = () => {
    if (window.confirm("确定要清空当前对话，重新开始本情景模态口语实战吗？")) {
      resetConversationOnScenario(activeScenario, currentLevel);
    }
  };

  return (
    <div id="app" className="h-screen max-h-screen overflow-hidden bg-stone-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 flex flex-col font-sans relative">
      {/* Visual background decor rings */}
      <div className="absolute top-0 left-12 w-96 h-96 bg-indigo-200/10 dark:bg-indigo-900/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 right-12 w-96 h-96 bg-emerald-200/5 dark:bg-emerald-900/5 rounded-full blur-3xl pointer-events-none" />

      {/* Primary Top Header */}
      <header className="flex-shrink-0 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm">
            E
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold text-zinc-950 dark:text-white tracking-tight flex items-center gap-1.5">
              英语口语 AI 智能教练
              <span className="text-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-1.5 py-0.2 rounded font-bold">
                Level-Adaptive
              </span>
            </h1>
            <p className="text-[11px] text-zinc-500 font-medium">
              专为中国用户打磨的沉浸式智能纠错英语学习沙盒
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setPrefs((p) => ({ ...p, theme: p.theme === 'dark' ? 'light' : 'dark' }))}
            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
            title={prefs.theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {prefs.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer text-zinc-700 dark:text-zinc-300"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">偏好设置</span>
          </button>

          {/* My word book entry */}
          <button
            onClick={() => setIsWordBookOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:hover:bg-indigo-900/60 dark:text-indigo-400 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer relative"
          >
            <BookMarked className="h-4 w-4" />
            <span>我的生词本</span>
            {savedWords.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full h-4.5 w-4.5 text-[9px] font-black flex items-center justify-center scale-95 animate-pulse">
                {savedWords.length}
              </span>
            )}
          </button>

          {/* Collapsible translation menu for small screens */}
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="lg:hidden p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900"
            title="实时语法翻译纠错"
          >
            {showMobileSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-[1550px] w-full mx-auto px-4 md:px-6 py-4 flex flex-col min-h-0 overflow-hidden">
        
        {/* Bottom Dual Panels Section */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-hidden">
          
          {/* Main 3/4 Window: AI Chat Engine */}
          <div className="lg:col-span-3 flex flex-col h-full min-h-0 overflow-hidden">
            <ChatWindow 
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              currentLevel={currentLevel}
              activeScenario={activeScenario}
              onResetChat={handleResetChat}
              inputRef={inputRef}
              inputText={inputText}
              setInputText={setInputText}
            />
          </div>

          {/* Right 1/4 Window: Translation, dictionary, and Grammar corrector */}
          <div className={`lg:col-span-1 h-full min-h-0 transition-all duration-300 ${
            showMobileSidebar ? "fixed inset-0 z-30 pt-16" : "hidden lg:block animate-fade-in"
          }`}>
            <AnalysisSidebar 
              analysis={analysis}
              isLoading={isAnalysisLoading}
              onAddWord={addWord}
              savedWords={savedWords}
              onSelectSuggestion={handleSelectSuggestion}
              userMessageEmpty={inputText.trim() === ""}
            />
          </div>

        </div>
      </main>

      {/* Full-screen Wordbook overlay modal */}
      <WordBook 
        isOpen={isWordBookOpen}
        onClose={() => setIsWordBookOpen(false)}
        wordList={savedWords}
        onRemoveWord={removeWord}
        onClearAll={handleClearAllWords}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentLevel={currentLevel}
        onLevelChange={handleLevelChange}
        activeScenario={activeScenario}
        onScenarioSelect={handleScenarioSelect}
        prefs={prefs}
        onSavePrefs={handleSavePrefs}
        serverConfig={serverConfig}
        configMismatch={configMismatch}
        onDismissMismatch={dismissMismatch}
      />
    </div>
  );
}
