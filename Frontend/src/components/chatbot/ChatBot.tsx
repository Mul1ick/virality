// components/chatbot/ChatBot.tsx
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hey there! 👋 I'm your Virality Media assistant. Ask me about your Meta, Google, or Shopify analytics!",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const detectPlatform = (input: string): string | null => {
    const lower = input.toLowerCase();

    if (
      lower.includes("meta") ||
      lower.includes("facebook") ||
      lower.includes("instagram")
    ) {
      if (lower.includes("ad set") || lower.includes("adset")) {
        return "meta_adsets";
      } else if (lower.includes("ad") && !lower.includes("ad set")) {
        return "meta_ads";
      }
      return "meta";
    }

    if (lower.includes("google")) {
      if (lower.includes("ad group") || lower.includes("adset")) {
        return "google_adsets";
      } else if (lower.includes("ad") && !lower.includes("ad group")) {
        return "google_ads";
      }
      return "google_campaigns";
    }

    if (lower.includes("shopify")) {
      return "shopify";
    }

    return null;
  };

  const getLocalResponse = (input: string): string | null => {
    const lower = input.toLowerCase().trim();

    if (lower === "hi" || lower === "hey" || lower === "hello" || lower === "yo") {
      return "Hey! 👋 How can I help you today? Ask me about your Meta, Google, or Shopify data!";
    }
    if (lower.includes("help") || lower.includes("support")) {
      return "I can help with:\n• Meta campaigns, ad sets & ads\n• Google Ads performance\n• Shopify orders & revenue\n\nJust mention the platform in your question! For example: \"How much did I spend on Meta?\"";
    }
    if (lower.includes("connect") || lower.includes("integration")) {
      return "To connect platforms, go to your Profile & Settings page. You can link Meta, Google Ads, and Shopify accounts there!";
    }
    if (lower.includes("thank")) {
      return "You're welcome! Let me know if you need anything else. 😊";
    }

    return null;
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") {
      const vals = Object.values(value).filter(
        (v) => v !== null && v !== undefined
      );
      if (vals.length === 0) return "N/A";
      return vals
        .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
        .join(", ");
    }
    if (typeof value === "number") {
      const k = key.toLowerCase();
      if (k.includes("ctr")) return `${value.toFixed(2)}%`;
      if (
        k.includes("spend") ||
        k.includes("revenue") ||
        k.includes("cost") ||
        k.includes("cpc") ||
        k.includes("cpm")
      )
        return `$${value.toFixed(2)}`;
      if (Number.isInteger(value)) return value.toLocaleString();
      return value.toFixed(2);
    }
    return String(value);
  };

  const formatResults = (results: any[]): string => {
    let summary = "";

    results.slice(0, 5).forEach((item: any) => {
      const nameKey = Object.keys(item).find((k) =>
        k.toLowerCase().includes("name")
      );

      let name = "Result";
      if (nameKey && item[nameKey]) {
        name =
          typeof item[nameKey] === "object"
            ? formatValue(nameKey, item[nameKey])
            : String(item[nameKey]);
      } else if (item._id && typeof item._id === "object") {
        const idNameKey = Object.keys(item._id).find((k) =>
          k.toLowerCase().includes("name")
        );
        if (idNameKey) name = String(item._id[idNameKey]);
        else name = formatValue("_id", item._id);
      } else if (item._id && typeof item._id === "string") {
        name = item._id;
      }

      const metricKeys = Object.keys(item).filter(
        (k) => k !== nameKey && k !== "id" && k !== "_id"
      );

      let metricsString =
        metricKeys.length > 0
          ? metricKeys
              .map((key) => {
                const formattedKey = key.replace(/_/g, " ");
                return `${formattedKey}: ${formatValue(key, item[key])}`;
              })
              .join(", ")
          : "(details in data)";

      summary += `• ${name}: ${metricsString}\n`;
    });

    if (results.length > 5) {
      summary += `\n...and ${results.length - 5} more results.`;
    }

    return summary;
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsTyping(true);

    let botResponseText = "";

    // Check for local responses first (greetings, help, etc.)
    const localResponse = getLocalResponse(currentInput);
    if (localResponse) {
      botResponseText = localResponse;
    } else {
      const detectedPlatform = detectPlatform(currentInput);

      if (detectedPlatform) {
        try {
          const response = await apiClient.post(
            `/analytics/${detectedPlatform}`,
            { question: currentInput }
          );

          const { answer, explanation, results } = response.data;

          // Prefer the AI-generated answer, then fall back to formatted results
          if (answer && !answer.includes("I can only answer")) {
            botResponseText = answer;
            if (results && results.length > 0) {
              botResponseText +=
                "\n\n📊 Data breakdown:\n" + formatResults(results);
            }
          } else if (results && results.length > 0) {
            botResponseText =
              "Here's what I found:\n\n" + formatResults(results);
          } else if (explanation) {
            botResponseText = `I looked for: "${explanation}"\n\nBut couldn't find any matching data. Try rephrasing your question or check if data exists for that time period.`;
          } else {
            botResponseText =
              "I understood the question, but couldn't find any matching data.";
          }
        } catch (error: any) {
          console.error("Chatbot API Error:", error);

          if (!error.response) {
            // Network error - server unreachable
            botResponseText =
              "Can't reach the server right now. Please check your connection and try again.";
          } else if (error.response.status === 401) {
            botResponseText =
              "Your session has expired. Please log in again to continue.";
          } else if (error.response.status === 404) {
            botResponseText =
              "I can't query that platform yet. Try asking about Meta, Google, or Shopify!";
          } else if (error.response.status === 429) {
            botResponseText =
              "You've hit the query limit (50/hour). Please wait a bit and try again.";
          } else if (error.response.status === 500) {
            const detail = error.response.data?.detail || "";
            if (detail.toLowerCase().includes("gemini")) {
              botResponseText =
                "The AI service is temporarily unavailable. Please try again in a moment.";
            } else if (detail.toLowerCase().includes("mongo")) {
              botResponseText =
                "There was a database issue. Please try again.";
            } else {
              botResponseText =
                "Something went wrong processing your request. Please try again shortly.";
            }
          } else {
            botResponseText =
              "Something unexpected happened. Please try again.";
          }
        }
      } else {
        botResponseText =
          "Please mention a platform (Meta, Google, or Shopify) in your question so I can look up the right data.";
      }
    }

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponseText,
      sender: "bot",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-110 z-50 bg-gradient-to-br from-primary to-secondary"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[380px] h-full sm:h-[600px] bg-card sm:rounded-2xl shadow-2xl flex flex-col z-50 border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  Virality Assistant
                </h3>
                <p className="text-xs text-white/80">Always here to help</p>
              </div>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm",
                    message.sender === "user"
                      ? "bg-primary/90 text-primary-foreground"
                      : "bg-card/80 border border-border/60"
                  )}
                >
                  <p
                    className={cn(
                      "text-[13px] leading-relaxed whitespace-pre-wrap break-words",
                      message.sender === "user"
                        ? "text-primary-foreground"
                        : "text-foreground"
                    )}
                  >
                    {message.text}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-1.5 opacity-60",
                      message.sender === "user"
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-card border-t border-border">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 rounded-xl border-border focus-visible:ring-primary"
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                size="icon"
                className="rounded-xl bg-gradient-to-br from-primary to-secondary hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                {isTyping ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send
            </p>
          </div>
        </div>
      )}
    </>
  );
};
