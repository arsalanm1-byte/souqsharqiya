"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, sendEmail, siteUrl } from "@/lib/email";
import { fmt, getDictionary } from "@/lib/i18n";

export type SendResult = { ok: true; id: number; created_at: string } | { ok: false };

export async function sendMessage(conversationId: number, body: string): Promise<SendResult> {
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text })
    .select("id, created_at")
    .single();
  if (error || !data) return { ok: false };

  after(() => notifyRecipient(conversationId, user.id, text));
  return { ok: true, id: data.id, created_at: data.created_at };
}

/**
 * Emails the other person at most once per unread stretch: only if they have
 * not read the chat for 10 minutes and were not already emailed since.
 */
async function notifyRecipient(conversationId: number, senderId: string, text: string) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data: c } = await admin
    .from("conversations")
    .select("*, ad:ads(id, title), buyer:profiles!conversations_buyer_id_fkey(display_name, preferred_locale), seller:profiles!conversations_seller_id_fkey(display_name, preferred_locale)")
    .eq("id", conversationId)
    .single();
  if (!c) return;

  const toBuyer = c.seller_id === senderId;
  const recipientId: string = toBuyer ? c.buyer_id : c.seller_id;
  const lastRead = new Date(toBuyer ? c.buyer_last_read_at : c.seller_last_read_at);
  const notified = toBuyer ? c.buyer_notified_at : c.seller_notified_at;
  if (Date.now() - lastRead.getTime() < 10 * 60_000) return;
  if (notified && new Date(notified) > lastRead) return;

  const { data: authUser } = await admin.auth.admin.getUserById(recipientId);
  const email = authUser.user?.email;
  if (!email) return;

  const recipient = toBuyer ? c.buyer : c.seller;
  const sender = toBuyer ? c.seller : c.buyer;
  const lang = recipient?.preferred_locale === "en" ? "en" : "ar";
  const t = getDictionary(lang);
  const link = `${siteUrl()}/${lang}/messages/${conversationId}`;
  await sendEmail(
    email,
    fmt(t.messages.newMessageSubject, { title: c.ad?.title ?? "" }),
    `<div dir="${lang === "ar" ? "rtl" : "ltr"}" style="font-family:sans-serif">
      <p>${escapeHtml(fmt(t.messages.newMessageBody, { name: sender?.display_name ?? "" }))}</p>
      <blockquote style="border-inline-start:3px solid #0b7765;padding:4px 12px;color:#333">${escapeHtml(text.slice(0, 300))}</blockquote>
      <p><a href="${link}">${escapeHtml(t.messages.open)}</a></p>
    </div>`,
  );
  await admin
    .from("conversations")
    .update(toBuyer ? { buyer_notified_at: new Date().toISOString() } : { seller_notified_at: new Date().toISOString() })
    .eq("id", conversationId);
}
