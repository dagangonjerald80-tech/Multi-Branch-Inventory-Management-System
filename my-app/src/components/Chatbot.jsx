import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api';

function RichText({ text }) {
  const lines = text.split('\n');
  return lines.map((line, li) => (
    <p key={li} className="mb-0.5 last:mb-0 text-sm leading-relaxed">
      {line.split(/(\*\*[^*]+\*\*)/g).map((segment, si) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          return (
            <strong key={si} className="font-semibold text-slate-900 dark:text-slate-100">
              {segment.slice(2, -2)}
            </strong>
          );
        }
        return <span key={si}>{segment}</span>;
      })}
    </p>
  ));
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Kamusta! Ako ang **Inventory Assistant**. Itanong ang tungkol sa stock, branches, o transfers. I-type ang **tulong** para sa mga halimbawa.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const scrollDown = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollDown();
  }, [messages, open, scrollDown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function send(textStr) {
    const trimmed = (textStr || input).trim();
    if (!trimmed || loading) return;
    if (!textStr) setInput('');
    setMessages((m) => [...m, { role: 'user', text: trimmed }]);
    setLoading(true);
    try {
      const { reply } = await api.chat.send(trimmed);
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: `May error: **${e.message || 'hindi makakonekta sa API'}**. Siguraduhing naka-sign in ka at tumatakbo ang backend.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-50 p-6 md:p-8">
      <div className="pointer-events-auto flex flex-col items-end gap-4">
        {open && (
          <div
            className="flex max-h-[min(600px,80vh)] w-[min(100vw-2.5rem,420px)] flex-col overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
            role="dialog"
            aria-label="Inventory chat assistant"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl shadow-lg shadow-blue-500/30">🤖</div>
                <div>
                  <h3 className="font-bold text-sm leading-none">Inventory AI</h3>
                  <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Online Assistant</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Chat Area */}
            <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="text-sm font-medium whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <RichText text={msg.text} />
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions Chips */}
            <div className="flex gap-2 overflow-x-auto p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 scrollbar-hide">
              {['dashboard', 'low stock', 'suppliers', 'transfers', 'history'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={loading}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <form
              className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-5 py-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all pr-24"
                  disabled={loading}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-30 transition-all shadow-lg shadow-blue-500/20"
                >
                  SEND
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Floating Bubble */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-3xl text-white shadow-2xl transition-all hover:scale-110 active:scale-95 group relative ${open ? 'rotate-90' : ''}`}
          aria-expanded={open}
          aria-label={open ? 'Close chat' : 'Open inventory chat'}
        >
          <div className="absolute inset-0 rounded-2xl bg-blue-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
          {open ? '✕' : '💬'}
        </button>
      </div>
    </div>
  );
}
