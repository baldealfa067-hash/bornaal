import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Send,
  MessageSquare,
  Phone,
  ArrowLeft,
  Check,
  CheckCheck,
  Image as ImageIcon,
  MoreVertical,
  Ban,
  ShieldAlert,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useAnonymousId } from "@/hooks/useAnonymousId";
import {
  useMessages,
  useSendMessage,
  useMarkMessagesAsRead,
  useMessagesRealtime,
} from "@/hooks/useChat";
import { useIsBlockedByMe, useIsBlockedByThem, useBlockUser } from "@/hooks/useBlockedUsers";
import { useReportUser } from "@/hooks/useUserReports";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherUserId: string;
  otherUserName: string;
  otherUserPhone?: string;
  otherUserPhoto?: string | null;
}

const NO_RESPONSE_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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
  const anonymousId = useAnonymousId();
  const myId = user?.id ?? anonymousId;
  const isAnon = !user?.id;

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNoResponseHint, setShowNoResponseHint] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: messages = [], isLoading } = useMessages(myId, otherUserId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkMessagesAsRead();
  const { data: isBlocked = false } = useIsBlockedByMe(myId, otherUserId);
  const { data: isBlockedByThem = false } = useIsBlockedByThem(myId, otherUserId);
  const blockUser = useBlockUser();
  const reportUser = useReportUser();

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reporting, setReporting] = useState(false);

  useMessagesRealtime(user?.id ?? null, otherUserId);

  // Mark incoming messages as read when dialog opens (only for authenticated)
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
    const isLastFromMe = lastMsg.sender_id === myId;

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
  }, [messages, myId, open]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(t("common.imageTooLarge"));
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadAndSendImage = async () => {
    if (!selectedFile || !otherUserId) return;
    setUploading(true);
    try {
      const fileName = `chat/${Date.now()}-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("portfolio")
        .upload(fileName, selectedFile, { contentType: selectedFile.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("portfolio")
        .getPublicUrl(fileName);

      await sendMessage.mutateAsync({
        senderId: myId,
        receiverId: otherUserId,
        content: urlData.publicUrl,
        messageType: "image",
      });

      setImagePreview(null);
      setSelectedFile(null);
    } catch (err) {
      console.error("[chat] image upload error:", err);
      toast.error(t("chat.sendError"));
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (selectedFile) {
      await uploadAndSendImage();
      return;
    }
    if (!input.trim()) return;
    if (!otherUserId) {
      toast.error(t("chat.errorNoRecipient"));
      return;
    }
    const content = input.trim();
    setInput("");
    setShowNoResponseHint(false);
    try {
      await sendMessage.mutateAsync({
        senderId: myId,
        receiverId: otherUserId,
        content,
        messageType: "text",
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

  const handleBlock = async () => {
    if (!user?.id) return;
    try {
      await blockUser.mutateAsync({ blockerId: user.id, blockedId: otherUserId });
      toast.success(t("chat.userBlocked"));
      setBlockDialogOpen(false);
      onOpenChange(false);
    } catch {
      toast.error(t("chat.blockError"));
    }
  };

  const handleReport = async () => {
    if (!user?.id || !reportReason.trim()) return;
    setReporting(true);
    try {
      await reportUser.mutateAsync({
        reporterId: user.id,
        reportedId: otherUserId,
        reason: reportReason.trim(),
        description: reportDescription.trim() || undefined,
      });
      toast.success(t("chat.reportSubmitted"));
      setReportDialogOpen(false);
      setReportReason("");
      setReportDescription("");
    } catch {
      toast.error(t("chat.reportError"));
    } finally {
      setReporting(false);
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
        {!isAnon && user?.id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setBlockDialogOpen(true)}
                className="text-destructive gap-2"
              >
                <Ban className="h-4 w-4" />
                {isBlocked ? t("chat.unblock") : t("chat.block")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setReportDialogOpen(true)}
                className="gap-2"
              >
                <ShieldAlert className="h-4 w-4" />
                {t("chat.reportUser")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <div className="flex items-center justify-center my-3">
              <span className="text-[11px] text-muted-foreground bg-background px-3 py-1 rounded-full border">
                {group.date}
              </span>
            </div>

            {group.messages.map((msg, idx) => {
              const isMine = msg.sender_id === myId;
              const nextMsg = group.messages[idx + 1];
              const isLastInGroup =
                !nextMsg || nextMsg.sender_id !== msg.sender_id;
              const showTime =
                isLastInGroup ||
                (nextMsg &&
                  new Date(nextMsg.created_at).getTime() -
                    new Date(msg.created_at).getTime() >
                    5 * 60 * 1000);

              const isImage =
                (msg as Record<string, unknown>).message_type === "image" ||
                msg.content.match(/\.(jpg|jpeg|png|gif|webp)/i) ||
                msg.content.includes("/portfolio/");

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
                    {isImage ? (
                      <img
                        src={msg.content}
                        alt={t("chat.imageMessage")}
                        className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
                        onClick={() => window.open(msg.content, "_blank")}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
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
                        {isMine && !isAnon && (
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

        {/* No response hint */}
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

      {/* Image preview */}
      {imagePreview && (
        <div className="border-t bg-card px-3 py-2 shrink-0">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 rounded-lg object-cover"
            />
            <button
              onClick={() => {
                setImagePreview(null);
                setSelectedFile(null);
              }}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input — always visible */}
      <div className="border-t bg-card px-3 py-3 shrink-0">
        {isBlockedByThem && (
          <p className="text-xs text-destructive text-center mb-2">
            {t("chat.blockedByThem")}
          </p>
        )}
        {isAnon && !isBlockedByThem && (
          <p className="text-[10px] text-muted-foreground text-center mb-2">
            {t("chat.anonymousHint")}
          </p>
        )}
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isBlockedByThem}
            className="h-10 w-10 shrink-0"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isBlockedByThem ? t("chat.cannotSend") : t("chat.typeMessage")}
            className="flex-1"
            autoComplete="off"
            disabled={uploading || isBlockedByThem}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!input.trim() && !selectedFile) || sendMessage.isPending || uploading || isBlockedByThem}
            className="h-10 w-10 shrink-0"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.blockTitle")}</DialogTitle>
            <DialogDescription>{t("chat.blockDesc", { name: otherUserName })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlock}
              disabled={blockUser.isPending}
            >
              {blockUser.isPending ? t("common.saving") : t("chat.block")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.reportTitle")}</DialogTitle>
            <DialogDescription>{t("chat.reportDesc", { name: otherUserName })}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>{t("chat.reportReason")}</Label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="">{t("chat.selectReason")}</option>
                <option value="spam">{t("chat.reportReasons.spam")}</option>
                <option value="harassment">{t("chat.reportReasons.harassment")}</option>
                <option value="inappropriate">{t("chat.reportReasons.inappropriate")}</option>
                <option value="scam">{t("chat.reportReasons.scam")}</option>
                <option value="other">{t("chat.reportReasons.other")}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>{t("chat.reportDetails")}</Label>
              <Textarea
                placeholder={t("chat.reportDetailsPlaceholder")}
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleReport}
              disabled={!reportReason || reporting}
              className="gap-2"
            >
              <ShieldAlert className="h-4 w-4" />
              {reporting ? t("common.submitting") : t("chat.reportUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
