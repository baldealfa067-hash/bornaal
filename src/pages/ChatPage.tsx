import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Send,
  MessageSquare,
  Phone,
  ArrowLeft,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  useMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useMessagesRealtime,
} from "@/hooks/useChat";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ChatPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();

  const myId = user?.id ?? "";

  const [otherUserName, setOtherUserName] = useState("");
  const [otherUserPhone, setOtherUserPhone] = useState("");
  const [otherUserPhoto, setOtherUserPhoto] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading, isError } = useMessages(myId || null, userId ?? null);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkMessagesAsRead();

  useMessagesRealtime(user?.id ?? null, userId ?? null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("name, phone, photo_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOtherUserName(data.name ?? "");
          setOtherUserPhone(data.phone ?? "");
          setOtherUserPhoto(data.photo_url ?? null);
        }
      });
  }, [userId]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error(t("chat.loginRequired"));
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user?.id && userId) {
      markAsRead.mutate({ userId: user.id, otherUserId: userId });
    }
  }, [user?.id, userId]);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 200);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!userId) {
      toast.error(t("chat.errorNoRecipient"));
      return;
    }
    if (!user?.id) {
      toast.error(t("chat.loginRequired"));
      navigate("/login", { replace: true });
      return;
    }
    const content = input.trim();
    setInput("");
    try {
      await sendMessage.mutateAsync({
        senderId: user.id,
        receiverId: userId,
        content,
      });
    } catch (err) {
      console.error("[chat] send error:", err);
      toast.error(t("chat.sendError"));
      setInput(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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

  if (authLoading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", background: "var(--background)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--card)", flexShrink: 0 }}>
        <Button
          variant="ghost"
          size="icon"
          style={{ width: 36, height: 36, flexShrink: 0 }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft style={{ width: 20, height: 20 }} />
        </Button>
        <Avatar style={{ width: 36, height: 36, flexShrink: 0 }}>
          {otherUserPhoto ? (
            <AvatarImage src={otherUserPhoto} alt={otherUserName} className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {otherUserName.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{otherUserName || userId}</h2>
        </div>
        {otherUserPhone && (
          <a href={`tel:${otherUserPhone.replace(/\s/g, "")}`}>
            <Button variant="ghost" size="icon" style={{ width: 36, height: 36 }}>
              <Phone style={{ width: 20, height: 20 }} />
            </Button>
          </a>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px 16px" }}>
        {!userId && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", color: "var(--muted-foreground)" }}>
            <p style={{ fontSize: 14 }}>{t("chat.errorNoRecipient")}</p>
          </div>
        )}

        {userId && isLoading && messages.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)" }}>
            <p style={{ fontSize: 14 }}>{t("common.loading")}</p>
          </div>
        )}

        {userId && isError && !isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", color: "var(--muted-foreground)" }}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{t("chat.loadError")}</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>{t("chat.loadErrorHint")}</p>
          </div>
        )}

        {userId && !isLoading && !isError && messages.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", color: "var(--muted-foreground)" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "hsl(var(--primary) / 0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MessageSquare style={{ width: 32, height: 32, opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{t("chat.startConversation")}</p>
            <p style={{ fontSize: 12, marginTop: 4, maxWidth: 250 }}>{t("chat.startConversationHint")}</p>
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "12px 0" }}>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)", background: "var(--background)", padding: "4px 12px", borderRadius: 9999, border: "1px solid var(--border)" }}>
                {group.date}
              </span>
            </div>

            {group.messages.map((msg, idx) => {
              const isMine = msg.sender_id === myId;
              const nextMsg = group.messages[idx + 1];
              const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
              const showTime =
                isLastInGroup ||
                (nextMsg &&
                  new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() > 5 * 60 * 1000);

              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                    marginBottom: isLastInGroup ? 12 : 2,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "78%",
                      padding: "8px 14px",
                      fontSize: 13,
                      lineHeight: 1.5,
                      background: isMine ? "hsl(var(--primary))" : "hsl(var(--muted))",
                      color: isMine ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                      borderRadius: isLastInGroup
                        ? isMine
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px"
                        : "16px",
                      wordBreak: "break-word",
                    }}
                  >
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                    {showTime && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 4,
                          justifyContent: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: isMine ? "hsl(var(--primary-foreground) / 0.6)" : "hsl(var(--muted-foreground))",
                          }}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isMine && (
                          <span style={{ color: "hsl(var(--primary-foreground) / 0.6)" }}>
                            {msg.read ? (
                              <CheckCheck style={{ width: 12, height: 12 }} />
                            ) : (
                              <Check style={{ width: 12, height: 12 }} />
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid var(--border)", background: "var(--card)", padding: "10px 12px", flexShrink: 0, paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.typeMessage")}
            rows={1}
            style={{ flex: 1, minHeight: 40, maxHeight: 120, padding: "8px 12px", fontSize: 14, lineHeight: 1.4, borderRadius: 12, border: "1px solid var(--input)", background: "var(--background)", color: "var(--foreground)", resize: "none", outline: "none", fontFamily: "inherit" }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12 }}
          >
            <Send style={{ width: 16, height: 16 }} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
