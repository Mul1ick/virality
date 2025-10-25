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
    detectedPlatform = "meta"; // Match the collection name used in DATA_SCHEMAS
  } else if (lowerInput.includes("google")) {
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
        // Format the results (simple example: list top 3)
        let resultsSummary = "Here's what I found:\n";
        results.slice(0, 3).forEach((item: any, index: number) => {
          // Try to find a 'name' or use the first few fields
          const name = item.name || item.campaign_name || item.ad_name || `Result ${index + 1}`;
          const valueKey = Object.keys(item).find(k => k.includes('spend') || k.includes('clicks') || k.includes('impressions') || k.includes('revenue') || k.includes('costMicros'));
          const value = valueKey ? item[valueKey] : '(details in data)';
          resultsSummary += `- ${name}: ${value}\n`;
        });
         botResponseText = `${explanation}\n\n${resultsSummary}`;
         if (results.length > 3) {
             botResponseText += `(...and ${results.length - 3} more results)`;
         }

      } else if (explanation) {
         botResponseText = explanation + "\n\nHowever, I couldn't find any specific data matching your question.";
      }
       else {
        botResponseText = "I understood the question, but I couldn't find any specific data for that.";
      }

    } catch (error: any) {
      console.error("Chatbot API Error:", error);
      if (error.response?.status === 401) {
         botResponseText = "Sorry, your session seems to have expired. Please log in again.";
         // Optional: Redirect to login
         // window.location.href = '/signin';
      } else if (error.response?.status === 404 && error.response.data?.detail?.includes("Unknown platform")){
         // This case might happen if our frontend detection logic passes a platform the backend doesn't know
         botResponseText = `Sorry, I can't query the platform '${detectedPlatform}' yet. You can ask about Meta, Google, or Shopify.`;
      }
      else {
         botResponseText = `Sorry, I couldn't process that query right now. Error: ${error.response?.data?.detail || error.message}`;
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
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-110 z-50 bg-gradient-to-br from-primary to-accent"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[600px] bg-card rounded-2xl shadow-2xl flex flex-col z-50 border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-4 flex items-center justify-between">
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/30">
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
                    "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                    message.sender === "user"
                      ? "bg-gradient-to-br from-primary to-accent text-white"
                      : "bg-card border border-border"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm whitespace-pre-wrap",
                      message.sender === "user"
                        ? "text-white"
                        : "text-foreground"
                    )}
                  >
                    {message.text}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      message.sender === "user"
                        ? "text-white/70"
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
                className="rounded-xl bg-gradient-to-br from-primary to-accent hover:shadow-lg transition-all duration-300 hover:scale-105"
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
