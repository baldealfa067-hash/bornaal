import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Send, MessageSquare, Phone, ArrowLeft, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  useMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useMessagesRealtime,
} from "@/hooks/useChat";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherUserId: string;
  otherUserName: string;
  otherUserPhone?: string;
  otherUserPhoto?: string | null;
}

const NO_RESPONSE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const ChatDialog = ({
  open,
  onOpenChange,
  otherUserId,
  otherUserName,
  otherUserPhone,
  otherUserPhoto,
}: ChatDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showNoResponseHint, setShowNoResponseHint] = useState(false);

  const { data: messages = [], isLoading } = useMessages(user?.id ?? null, otherUserId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkMessagesAsRead();

  useMessagesRealtime(user?.id ?? null, otherUserId);

  // Mark incoming messages as read when dialog opens
  useEffect(() => {
    if (open && user?.id && otherUserId) {
      markAsRead.mutate({ userId: user.id, otherUserId });
    }
  }, [open, user?.id, otherUserId]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Check for no-response hint
  useEffect(() => {
    if (!open || messages.length === 0) {
      setShowNoResponseHint(false);
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const isLastFromMe = lastMsg.sender_id === user?.id;

    if (!isLastFromMe) {
      setShowNoResponseHint(false);
      return;
    }

    const lastMsgTime = new Date(lastMsg.created_at).getTime();
    const now = Date.now();
    if (now - lastMsgTime >= NO_RESPONSE_TIMEOUT_MS) {
      setShowNoResponseHint(true);
    } else {
      const remaining = NO_RESPONSE_TIMEOUT_MS - (now - lastMsgTime);
      const timer = setTimeout(() => setShowNoResponseHint(true), remaining);
      return () => clearTimeout(timer);
    }
  }, [messages, user?.id, open]);

  const handleSend = async () => {
    if (!user?.id || !input.trim()) return;
    const content = input.trim();
    setInput("");
    setShowNoResponseHint(false);
    await sendMessage.mutateAsync({
      senderId: user.id,
      receiverId: otherUserId,
      content,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toLocaleDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onOpenChange(false)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9 shrink-0">
          {otherUserPhoto ? (
            <AvatarImage src={otherUserPhoto} alt={otherUserName} className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {otherUserName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{otherUserName}</h2>
        </div>
        {otherUserPhone && (
          <a href={`tel:${otherUserPhone.replace(/\s/g, "")}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Phone className="h-5 w-5" />
            </Button>
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">{t("common.loading")}</p>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-primary/50" />
            </div>
            <p className="text-sm font-medium">{t("chat.startConversation")}</p>
            <p className="text-xs mt-1 max-w-[250px]">{t("chat.startConversationHint")}</p>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-3">
              <span className="text-[11px] text-muted-foreground bg-background px-3 py-1 rounded-full border">
                {group.date}
              </span>
            </div>

            {group.messages.map((msg, idx) => {
              const isMine = msg.sender_id === user?.id;
              const nextMsg = group.messages[idx + 1];
              const isLastInGroup =
                !nextMsg || nextMsg.sender_id !== msg.sender_id;
              const showTime =
                isLastInGroup ||
                (nextMsg &&
                  new Date(nextMsg.created_at).getTime() -
                    new Date(msg.created_at).getTime() >
                    5 * 60 * 1000);

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} ${
                    isLastInGroup ? "mb-3" : "mb-0.5"
                  }`}
                >
                  <div
                    className={`max-w-[78%] px-3.5 py-2 text-[13px] leading-relaxed ${
                      isMine
                        ? `bg-primary text-primary-foreground ${
                            isLastInGroup ? "rounded-2xl rounded-br-sm" : "rounded-2xl"
                          }`
                        : `bg-muted text-foreground ${
                            isLastInGroup ? "rounded-2xl rounded-bl-sm" : "rounded-2xl"
                          }`
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    {showTime && (
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span
                          className={`text-[10px] ${
                            isMine
                              ? "text-primary-foreground/60"
                              : "text-muted-foreground"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isMine && (
                          <span className="text-primary-foreground/60">
                            {msg.read ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* No response hint — suggest calling */}
        {showNoResponseHint && otherUserPhone && (
          <div className="flex justify-center my-3">
            <div className="bg-muted/80 border border-border rounded-xl px-4 py-3 text-center max-w-[85%]">
              <p className="text-xs text-muted-foreground mb-2">
                {t("chat.noResponseHint")}
              </p>
              <a href={`tel:${otherUserPhone.replace(/\s/g, "")}`}>
                <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
                  <Phone className="h-3.5 w-3.5" />
                  {t("common.call")}
                </Button>
              </a>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card px-3 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.typeMessage")}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            className="h-10 w-10 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
