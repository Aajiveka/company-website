import { useState, useRef, useEffect } from 'react';
import { Send, Search, UserCircle2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Input, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

interface Conversation {
  conversationId: number;
  participantName: string;
  participantRole: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  messageId: number;
  senderId: number;
  senderName: string;
  content: string;
  sentAt: string;
  isOwn: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MessagingPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ['messaging', 'conversations'],
    queryFn: () => api.get<Conversation[]>('/messaging/conversations').then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: messages } = useQuery({
    queryKey: ['messaging', 'messages', activeConvo],
    queryFn: () => api.get<Message[]>(`/messaging/conversations/${activeConvo}/messages`).then((r) => r.data),
    enabled: !!activeConvo,
    refetchInterval: 5_000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      api.post(`/messaging/conversations/${activeConvo}/messages`, { content }).then((r) => r.data),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['messaging', 'messages', activeConvo] });
      qc.invalidateQueries({ queryKey: ['messaging', 'conversations'] });
    },
    onError: () => notify(t('messaging.sendFailed'), 'error'),
  });

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.trim()) sendMessage.mutate(draft.trim());
  };

  const filtered = (conversations ?? []).filter((c) =>
    c.participantName.toLowerCase().includes(search.toLowerCase()),
  );

  const activeParticipant = conversations?.find((c) => c.conversationId === activeConvo);

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard') }, { label: t('messaging.heading') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('messaging.heading')}</h1>

      <div className="grid h-[70vh] grid-cols-1 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 md:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <div className="flex flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input className="pl-9" placeholder={t('messaging.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">{t('messaging.noConversations')}</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.conversationId}
                  onClick={() => setActiveConvo(c.conversationId)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    activeConvo === c.conversationId && 'bg-primary/5 dark:bg-primary/10',
                  )}
                >
                  <UserCircle2 className="h-10 w-10 shrink-0 text-gray-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-navy">{c.participantName}</p>
                      <span className="shrink-0 text-[10px] text-gray-400">{formatTime(c.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-xs text-gray-500">{c.lastMessage}</p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex flex-col bg-gray-50 dark:bg-gray-900">
          {!activeConvo ? (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              {t('messaging.selectConversation')}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <UserCircle2 className="h-8 w-8 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-navy">{activeParticipant?.participantName}</p>
                  <p className="text-xs text-gray-500">{activeParticipant?.participantRole}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="space-y-3">
                  {(messages ?? []).map((m) => (
                    <div
                      key={m.messageId}
                      className={cn('flex', m.isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                          m.isOwn
                            ? 'rounded-br-md bg-primary text-white'
                            : 'rounded-bl-md bg-white text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200',
                        )}
                      >
                        <p>{m.content}</p>
                        <p className={cn('mt-1 text-[10px]', m.isOwn ? 'text-white/60' : 'text-gray-400')}>
                          {formatTime(m.sentAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <form onSubmit={onSend} className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <Input
                  className="flex-1"
                  placeholder={t('messaging.typePlaceholder')}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sendMessage.isPending}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
