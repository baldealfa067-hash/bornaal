import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, useChat, useSendMessage } from "@/hooks/useMessages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { Link } from "react-router-dom";

const Messages = () => {
  const { user } = useAuth();
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-12 text-center">
        <h1 className="text-xl font-bold mb-2">Mensagens</h1>
        <p className="text-muted-foreground mb-4">Faça login para ver as suas mensagens.</p>
        <Link to="/auth"><Button>Entrar</Button></Link>
      </div>
    );
  }

  if (selectedPartner) {
    return <ChatView userId={user.id} partnerId={selectedPartner} onBack={() => setSelectedPartner(null)} />;
  }

  return <ConversationList userId={user.id} onSelect={setSelectedPartner} />;
};

const ConversationList = ({ userId, onSelect }: { userId: string; onSelect: (id: string) => void }) => {
  const { data: conversations = [], isLoading } = useConversations(userId);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold mb-4">Mensagens</h1>
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12 text-sm">A carregar...</p>
      ) : conversations.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          Ainda sem mensagens. Contacte um prestador para iniciar uma conversa.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {conversations.map((conv) => (
            <button
              key={conv.partnerId}
              onClick={() => onSelect(conv.partnerId)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left w-full"
            >
              <Avatar className="h-11 w-11">
                {conv.partnerPhoto && <AvatarImage src={conv.partnerPhoto} alt={conv.partnerName} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {conv.partnerName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm truncate">{conv.partnerName}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {new Date(conv.lastMessageAt).toLocaleDateString("pt")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center px-1.5">
                  {conv.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ChatView = ({ userId, partnerId, onBack }: { userId: string; partnerId: string; onBack: () => void }) => {
  const { data: messages = [] } = useChat(userId, partnerId);
  const sendMessage = useSendMessage();
  const [text, setText] = useState("");
  const { data: conversations = [] } = useConversations(userId);
  const conv = conversations.find((c) => c.partnerId === partnerId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage.mutate({ senderId: userId, receiverId: partnerId, content: text.trim() });
    setText("");
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar className="h-9 w-9">
          {conv?.partnerPhoto && <AvatarImage src={conv.partnerPhoto} />}
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
            {conv?.partnerName?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm">{conv?.partnerName ?? "Conversa"}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              msg.sender_id === userId
                ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                : "mr-auto bg-muted rounded-bl-md"
            }`}
          >
            <p>{msg.content}</p>
            <p className={`text-[10px] mt-1 ${msg.sender_id === userId ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
              {new Date(msg.created_at).toLocaleTimeString("pt", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t bg-card flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!text.trim() || sendMessage.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default Messages;
