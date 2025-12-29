// components/chatbot/ChatBotWrapper.tsx
import { useLocation } from "react-router-dom";
import { ChatBot } from "./ChatBot";

export const ChatBotWrapper = () => {
  const location = useLocation();

  // Don't show chatbot on profile page
  if (location.pathname === "/profile") {
    return null;
  }

  return <ChatBot />;
};
