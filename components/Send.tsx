"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bricolage_Grotesque } from "next/font/google";
import { Button } from "./ui/button";
import {
  Send,
  Rocket,
  Users2,
  Briefcase,
  Lightbulb,
  Globe,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createChat } from "@/lib/db/actions";
import { generateId } from "ai";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const EXAMPLE_ACTIONS = [
  { icon: <Rocket className="h-4 w-4 text-primary" />, text: "Launching a new product soon 🚀" },
  { icon: <Users2 className="h-4 w-4 text-primary" />, text: "We're hiring talented developers 👩‍💻👨‍💻" },
  { icon: <Briefcase className="h-4 w-4 text-primary" />, text: "Sharing a big career milestone 🎉" },
  { icon: <Lightbulb className="h-4 w-4 text-primary" />, text: "Posting key takeaways from a recent event 💡" },
  { icon: <Globe className="h-4 w-4 text-primary" />, text: "Sharing awesome reasources 🌍" }
];


interface SendComponentProps {
  visitorId: string | null;
}

export default function SendComponent({ visitorId }: SendComponentProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    if (!visitorId || !message.trim() || isLoading) return;
    setIsLoading(true);

    try {
      const id = generateId();
      const title = message.trim().substring(0, 50) + (message.trim().length > 50 ? '...' : '');

      // Store data in sessionStorage for instant access
      sessionStorage.setItem(`initial_message_${id}`, message.trim());
      sessionStorage.setItem(`chat_title_${id}`, title);
      sessionStorage.setItem(`visitor_id_${id}`, visitorId);

      // Create chat first, then navigate
      await createChat(visitorId, title, id);
      router.push(`/${id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExampleClick = (text: string) => {
    setMessage(text);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="flex overflow-hidden flex-grow flex-col h-full w-full items-center justify-center relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute w-64 h-64 rounded-full -bottom-16 -left-16 bg-gradient-to-br from-primary/20 to-background/50 blur-3xl" />
        <div className="absolute w-64 h-64 rounded-full  bg-gradient-to-br from-primary/20 to-background/50 blur-3xl -bottom-16 -right-16" />
        <div className="flex w-1/2 h-24 rounded-full bg-primary/20 blur-3xl absolute -top-10 left-1/2 -translate-x-1/2 text-foreground overflow-hidden" />
        <div className="mx-4 flex flex-col items-center">
          <div className="mb-12 text-center">
            <h1 className={`mb-6 text-5xl md:text-6xl font-medium tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-muted/70 via-foreground/80 ${bricolage.className}`}>
              What do you want to post today?
            </h1>
            <p className="text-lg text-muted-foreground/50 max-w-xl mx-auto">
              {/* LinkedIn Post Agent Description */}
              Every great post starts with a simple idea. Share yours, and we’ll transform it into a LinkedIn story that gets noticed 🚀
            </p>
          </div>

          <div className="mx-auto mb-6 w-full max-w-xl">
            <div className="shadow-primary/20 shadow-2xl relative rounded-lg">
              <div className="flex flex-col rounded-lg border bg-gradient-to-b from-secondary/40 to-background p-3 pb-6 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent to-transparent via-primary pointer-events-none select-none"></div>
                <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-transparent to-transparent via-primary pointer-events-none select-none blur-2xl"></div>
                <textarea
                  placeholder="Type your message here..."
                  className="h-32 w-full outline-none resize-none text-sm"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="mt-auto flex gap-2 absolute bottom-2 right-2 z-10">
                  <Button size="sm" variant="ghost" className="cursor-pointer transition-colors! ease-in-out! duration-500! hover:shadow-2xl hover:shadow-blue-700 text-muted-foreground hover:text-foreground"
                  ><Sparkles /></Button>
                  <Button
                    size="sm"
                    className="cursor-pointer transition-all ease-in duration-300 hover:shadow-2xl hover:shadow-blue-700"
                    onClick={handleSend}
                    disabled={!message.trim() || isLoading}
                  >
                    Send {
                      isLoading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Send />
                      )
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-16 flex w-full max-w-4xl flex-wrap justify-center gap-2">
            {EXAMPLE_ACTIONS.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                className="rounded-full px-4 py-0.5 text-xs"
                onClick={() => handleExampleClick(action.text)}
              >
                {action.icon}
                <span>{action.text}</span>
              </Button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
