"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/messages";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { timeAgo } from "@/lib/format";

export type ChatMessage = { id: number; sender_id: string; body: string; created_at: string };

type Props = {
  lang: Locale;
  conversationId: number;
  userId: string;
  initial: ChatMessage[];
  blocked: boolean;
  t: Dictionary["messages"];
};

/** Live chat: new messages arrive over Supabase Realtime (RLS limits it to the two people). */
export function Chat({ lang, conversationId, userId, initial, blocked, t }: Props) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((list) => (list.some((m) => m.id === msg.id) ? list : [...list, msg]));
          if (msg.sender_id !== userId) supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    startTransition(async () => {
      const result = await sendMessage(conversationId, body);
      if (result.ok) {
        setMessages((list) =>
          list.some((m) => m.id === result.id)
            ? list
            : [...list, { id: result.id, sender_id: userId, body, created_at: result.created_at }],
        );
      } else {
        setDraft(body);
      }
    });
  }

  return (
    <div className="card flex h-[65vh] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? "text-brand-100" : "text-slate-500"}`}>{timeAgo(m.created_at, lang)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {blocked ? (
        <p className="border-t border-slate-100 p-4 text-center text-sm text-slate-600">{t.blockedNotice}</p>
      ) : (
        <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send(e);
            }}
            rows={1}
            maxLength={2000}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            className="input flex-1 resize-none"
          />
          <button type="submit" disabled={pending || !draft.trim()} className="btn-primary">{t.send}</button>
        </form>
      )}
    </div>
  );
}
