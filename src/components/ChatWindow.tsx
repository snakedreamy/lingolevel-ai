import React, { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import { createSpeechRecognition, speakText, type SpeechAccent, type SpeechRecognition } from "../features/chat/speech";
import type { Message, Scenario } from "../types";
import { ChatToolbar } from "../features/chat/ChatToolbar";
import { ChatMessageList } from "../features/chat/ChatMessageList";
import { ChatInputBar } from "../features/chat/ChatInputBar";

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  activeScenario: Scenario;
  onResetChat: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
}

export default function ChatWindow({
  messages,
  onSendMessage,
  isLoading,
  activeScenario,
  onResetChat,
  inputRef,
  inputText,
  setInputText
}: ChatWindowProps) {
  const [accent, setAccent] = useState<SpeechAccent>("us");
  const [speed, setSpeed] = useState<number>(1.0);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    recognitionRef.current = createSpeechRecognition(
      setInputText,
      setIsRecording,
      setRecognitionError,
    );
  }, [setInputText]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const showStatus = (message: string) => {
    setStatusMessage(message);
  };

  const handleToggleRecord = () => {
    if (!recognitionRef.current) {
      showStatus("当前浏览器不支持语音录入，推荐使用 Chrome 或 Edge。");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error(err);
      showStatus("语音录入暂时无法启动，请稍后再试。");
    }
  };

  const handleSpeakText = (text: string, messageId: string) => {
    try {
      if (isSpeakingId === messageId) {
        window.speechSynthesis.cancel();
        setIsSpeakingId(null);
        return;
      }

      speakText({
        text,
        accent,
        speed,
        onStart: () => setIsSpeakingId(messageId),
        onEnd: () => setIsSpeakingId(null),
      });
    } catch (err) {
      if (err instanceof Error && err.message === "SPEECH_SYNTHESIS_UNAVAILABLE") {
        showStatus("当前浏览器不支持语音朗读功能。");
      }
      console.error("TTS speech error", err);
      setIsSpeakingId(null);
    }
  };

  const handleCopyText = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      showStatus("文本已复制到剪贴板。");
    } catch (err) {
      console.error("Failed to copy text", err);
      showStatus("复制失败，请手动选择文本后复制。");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!inputText.trim() || isLoading) return;
      onSendMessage(inputText);
    }
  };

  return (
    <div className="h-full flex flex-col bg-stone-50/40 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden relative">
      <ChatToolbar
        activeScenario={activeScenario}
        accent={accent}
        speed={speed}
        onAccentChange={setAccent}
        onSpeedChange={setSpeed}
        onResetChat={onResetChat}
      />

      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        isSpeakingId={isSpeakingId}
        onSpeakMessage={handleSpeakText}
        onCopyMessage={handleCopyText}
        messagesEndRef={messagesEndRef}
      />

      {(recognitionError || statusMessage) && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-amber-50 dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 px-4 py-2 rounded-xl shadow-md flex items-center gap-2 z-20 text-xs animate-slide-up text-amber-700 dark:text-amber-400 max-w-[90%]">
          <HelpCircle className="h-4 w-4 flex-shrink-0 animate-bounce" />
          <span>{recognitionError ?? statusMessage}</span>
          {recognitionError && (
            <button
              onClick={() => setRecognitionError(null)}
              className="text-[10px] underline font-bold pl-2 cursor-pointer"
            >
              我已知晓
            </button>
          )}
        </div>
      )}

      <ChatInputBar
        isLoading={isLoading}
        isRecording={isRecording}
        inputText={inputText}
        inputRef={inputRef}
        onInputChange={setInputText}
        onKeyDown={handleKeyDown}
        onSubmit={handleFormSubmit}
        onToggleRecord={handleToggleRecord}
        onClearInput={() => setInputText("")}
      />
    </div>
  );
}
