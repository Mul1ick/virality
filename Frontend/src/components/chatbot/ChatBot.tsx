// components/chatbot/ChatBot.tsx
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api"

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
      text: "Hey there! 👋 I'm your Virality Media assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
  if (!inputValue.trim()) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    text: inputValue,
    sender: "user",
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, userMessage]);
  const currentInput = inputValue; // Capture input before clearing
  setInputValue("");
  setIsTyping(true);

  // --- NEW LOGIC ---
  let detectedPlatform: string | null = null;
  const lowerInput = currentInput.toLowerCase();

  // Simple Platform Detection (enhance as needed)
  if (lowerInput.includes("meta") || lowerInput.includes("facebook") || lowerInput.includes("instagram")) {
      if (lowerInput.includes("ad set") || lowerInput.includes("adset")) {
         detectedPlatform = "meta_adsets"; // <-- NEW
      } else if (lowerInput.includes("ad") && !lowerInput.includes("ad set")) {
         detectedPlatform = "meta_ads"; // <-- NEW
      } else {
         detectedPlatform = "meta"; // Default to campaigns
      }
      }
      else if (lowerInput.includes("google")) {
    // Decide which Google collection is most likely, or enhance detection.
    // Let's default to campaigns for now if just "google" is mentioned.
    if (lowerInput.includes("ad group") || lowerInput.includes("adset")) {
       detectedPlatform = "google_adsets"; // Match schema key [cite: 283]
    } else if (lowerInput.includes("ad") && !lowerInput.includes("ad group")) { // Avoid matching "ad group"
       detectedPlatform = "google_ads"; // Match schema key [cite: 284]
    } else {
       detectedPlatform = "google_campaigns"; // Default Google match [cite: 281]
    }
  } else if (lowerInput.includes("shopify")) {
    detectedPlatform = "shopify"; // Match schema key [cite: 285]
  }
  // Add more keywords/logic as needed

  let botResponseText = "";

  if (detectedPlatform) {
    try {
      console.log(`Chatbot: Querying backend for platform: ${detectedPlatform}, question: ${currentInput}`);
      // Make API call using apiClient (handles auth automatically)
      const response = await apiClient.post(`/analytics/${detectedPlatform}`, {
        question: currentInput,
      });

      console.log("Chatbot: Received response:", response.data);

      const { explanation, results } = response.data;

      if (results && results.length > 0) {
        let resultsSummary = "Here's what I found for you:\n";

        // Helper: safely format any value to a display string
        const formatValue = (key: string, value: any): string => {
          if (value === null || value === undefined) return "N/A";
          if (typeof value === 'object') {
            // Handle nested objects (e.g., _id group keys, date objects)
            // Try to extract meaningful string from the object
            const vals = Object.values(value).filter(v => v !== null && v !== undefined);
            if (vals.length === 0) return "N/A";
            // If all values are primitives, join them
            return vals.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
          }
          if (typeof value === 'number') {
            if (key.toLowerCase().includes('ctr')) {
              return `${value.toFixed(2)}%`;
            } else if (key.toLowerCase().includes('spend') || key.toLowerCase().includes('revenue') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('cpc') || key.toLowerCase().includes('cpm')) {
              return `$${value.toFixed(2)}`;
            } else if (Number.isInteger(value)) {
              return value.toLocaleString();
            } else {
              return value.toFixed(2);
            }
          }
          return String(value);
        };

        // Format the results (show top 5)
        results.slice(0, 5).forEach((item: any) => {
            // 1. Find the "name" field (e.g., ad_name, campaign_name)
            const nameKey = Object.keys(item).find(k =>
              k.toLowerCase().includes('name')
            );

            // Resolve name — could be a string or nested in _id object
            let name = "Result";
            if (nameKey && item[nameKey]) {
              name = typeof item[nameKey] === 'object' ? formatValue(nameKey, item[nameKey]) : String(item[nameKey]);
            } else if (item._id && typeof item._id === 'object') {
              // Try to extract name from grouped _id
              const idNameKey = Object.keys(item._id).find(k => k.toLowerCase().includes('name'));
              if (idNameKey) name = String(item._id[idNameKey]);
              else name = formatValue('_id', item._id);
            } else if (item._id && typeof item._id === 'string') {
              name = item._id;
            }

            // 2. Find all *other* keys that are metrics (not the name, not an id)
            const metricKeys = Object.keys(item).filter(k =>
              k !== nameKey && k !== 'id' && k !== '_id'
            );

            let metricsString = "";
            if (metricKeys.length > 0) {
              // 3. Loop over all found metrics and format them
              metricsString = metricKeys.map(key => {
                const value = item[key];
                const formattedKey = key.replace(/_/g, ' ');
                return `${formattedKey}: ${formatValue(key, value)}`;
              }).join(', ');
            } else {
              metricsString = "(details in data)";
            }

            resultsSummary += `- ${name}: ${metricsString}\n`;
          });
          botResponseText = resultsSummary

      } else if (explanation) {
         botResponseText = `I understood you were asking about: "${explanation}"\n\nHowever, I couldn't find any specific data matching your question.`;
      }
       else {
        botResponseText = "I understood the question, but I couldn't find any specific data for that.";
      }

    } catch (error: any) {
      console.error("Chatbot API Error:", error);
      if (error.response?.status === 401) {
         botResponseText = "Your session has expired. Please log in again to continue.";
      } else if (error.response?.status === 404) {
         botResponseText = "I can't query that platform yet. Try asking about Meta, Google, or Shopify!";
      } else if (error.response?.status === 500) {
         botResponseText = "Something went wrong on our end. Please try again in a moment.";
      } else {
         botResponseText = "Oops! I couldn't process that right now. Please try again.";
      }
    }
  } else {
    // Fallback if no platform detected
    botResponseText = "Which platform are you asking about (Meta, Google, Shopify)? Or maybe I can help with general dashboard features?";
  }
  // --- END NEW LOGIC ---

  // Add bot response message
  const botMessage: Message = {
    id: (Date.now() + 1).toString(),
    text: botResponseText, // Use the generated or fallback text
    sender: "bot",
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, botMessage]);
  setIsTyping(false);
};

// Keep handleKeyPress as it is [cite: 410-411]
const handleKeyPress = (e: React.KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

  // Simple bot responses (replace with actual AI/API integration)
  const getBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes("meta") || input.includes("facebook")) {
      return "I can help you with Meta campaigns! Check out the Meta tab in your dashboard to view all your campaigns, ad sets, and ads. Need help with something specific?";
    }
    if (input.includes("google")) {
      return "For Google Ads, head to the Google tab in your dashboard. You can view all your campaigns and their performance metrics there!";
    }
    if (input.includes("shopify")) {
      return "Your Shopify orders are available in the Shopify tab. You can see all order details, amounts, and statuses there!";
    }
    if (input.includes("connect") || input.includes("integration")) {
      return "To connect new platforms, go to your Profile & Settings page. You can link Meta, Google Ads, and Shopify accounts there!";
    }
    if (input.includes("help") || input.includes("support")) {
      return "I'm here to help! You can ask me about:\n• Meta campaigns and ads\n• Google Ads performance\n• Shopify orders\n• Platform connections\n• Dashboard features\n\nWhat would you like to know?";
    }

    return "I'm here to help with your analytics dashboard! You can ask me about Meta campaigns, Google Ads, Shopify orders, or how to connect platforms. What would you like to know?";
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
                <h3 className="font-semibold text-white">Virality Assistant</h3>
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
                onKeyPress={handleKeyPress}
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
