import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { fmt, getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { adPath } from "@/lib/ads";
import { Chat, type ChatMessage } from "@/components/chat";

export const metadata = { robots: { index: false } };

export default async function ConversationPage({ params }: PageProps<"/[lang]/messages/[id]">) {
  const { lang, id } = await params;
  const conversationId = Number(id);
  if (!isLocale(lang) || !Number.isSafeInteger(conversationId)) notFound();
  const { supabase, user } = await requireUser(lang, `/${lang}/messages/${conversationId}`);
  const t = getDictionary(lang);

  const { data: c } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id, ad:ads(id, title), buyer:profiles!conversations_buyer_id_fkey(display_name), seller:profiles!conversations_seller_id_fkey(display_name)")
    .eq("id", conversationId)
    .maybeSingle();
  if (!c) notFound();

  const [{ data: messages }, { data: blocked }] = await Promise.all([
    supabase.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", conversationId).order("created_at").limit(500),
    supabase.rpc("is_blocked_between", { a: c.buyer_id, b: c.seller_id }),
    supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId }),
  ]);
  const ad = c.ad as unknown as { id: number; title: string } | null;
  const other = (c.buyer_id === user.id ? c.seller : c.buyer) as unknown as { display_name: string } | null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <div className="card flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold">{other?.display_name}</h1>
          {ad ? (
            <Link href={adPath(lang, ad)} className="block truncate text-sm text-brand-700 hover:underline">
              {fmt(t.messages.about, { title: ad.title })}
            </Link>
          ) : null}
        </div>
        <Link href={`/${lang}/messages`} className="btn-ghost shrink-0">{t.messages.title}</Link>
      </div>
      <Chat
        lang={lang}
        conversationId={conversationId}
        userId={user.id}
        initial={(messages ?? []) as ChatMessage[]}
        blocked={Boolean(blocked)}
        t={t.messages}
      />
    </div>
  );
}
