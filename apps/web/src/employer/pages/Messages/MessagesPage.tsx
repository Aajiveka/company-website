import { useState } from 'react';
import { Paperclip, Search, Send } from 'lucide-react';
import {
  EmployerBadge,
  PageHeader,
  PrimaryButton,
} from '@/employer/components/Cards/ui';

const threads = [
  {
    id: 1,
    name: 'Rahul Sharma',
    preview: 'Thanks for shortlisting me…',
    time: '10:24 AM',
    unread: 2,
    messages: [
      { id: 1, from: 'them', text: 'Hi, thank you for considering my application.', time: '10:12 AM' },
      { id: 2, from: 'me', text: 'Happy to chat. Are you available for a screening call tomorrow?', time: '10:18 AM' },
      { id: 3, from: 'them', text: 'Thanks for shortlisting me — yes, anytime after 2 PM.', time: '10:24 AM' },
    ],
  },
  {
    id: 2,
    name: 'Priya Nair',
    preview: 'Portfolio link shared',
    time: 'Yesterday',
    unread: 0,
    messages: [
      { id: 1, from: 'them', text: 'Sharing my portfolio: https://priya.design', time: 'Yesterday' },
      { id: 2, from: 'me', text: 'Looks great — we will review and get back soon.', time: 'Yesterday' },
    ],
  },
  {
    id: 3,
    name: 'Amit Desai',
    preview: 'Confirming interview slot',
    time: 'Mon',
    unread: 1,
    messages: [
      { id: 1, from: 'me', text: 'Your technical round is scheduled for Wed 4 PM.', time: 'Mon' },
      { id: 2, from: 'them', text: 'Confirming interview slot — I will join on time.', time: 'Mon' },
    ],
  },
];

export function MessagesPage() {
  const [activeId, setActiveId] = useState(1);
  const [draft, setDraft] = useState('');
  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  return (
    <div>
      <PageHeader title="Messages" subtitle="Inbox conversations with candidates and hiring partners." />

      <div className="grid h-[calc(100vh-7rem)] min-h-[420px] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm lg:grid-cols-[18rem_1fr]">
        <aside className="flex flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search messages…"
                className="h-8 w-full rounded-lg border border-slate-200 py-0 pl-8 pr-2.5 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={`flex w-full items-start gap-2 border-b border-slate-50 px-3 py-2 text-left transition ${
                    activeId === t.id ? 'bg-[#EBF2FF]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A56DB] text-[10px] font-semibold text-white">
                    {t.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-slate-800">{t.name}</p>
                      <span className="shrink-0 text-[10px] text-slate-400">{t.time}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] text-slate-500">{t.preview}</p>
                      {t.unread > 0 && <EmployerBadge tone="primary">{t.unread}</EmployerBadge>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <div>
              <p className="text-xs font-semibold text-slate-800">{active.name}</p>
              <p className="text-[11px] text-slate-400">Candidate conversation</p>
            </div>
            <EmployerBadge tone="success">Active</EmployerBadge>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/40 p-3">
            {active.messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-xs shadow-sm ${
                    m.from === 'me'
                      ? 'rounded-br-md bg-[#1A56DB] text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <p>{m.text}</p>
                  <p className={`mt-0.5 text-[10px] ${m.from === 'me' ? 'text-white/70' : 'text-slate-400'}`}>
                    {m.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <footer className="border-t border-slate-100 p-2">
            <div className="flex items-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                title="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Write a message…"
                className="flex-1 resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
              />
              <PrimaryButton
                onClick={() => setDraft('')}
                disabled={!draft.trim()}
              >
                <Send className="h-4 w-4" />
                Send
              </PrimaryButton>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
