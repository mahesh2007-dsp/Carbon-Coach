import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  BarChart3,
  Bot,
  Bus,
  Check,
  ChevronDown,
  CircleHelp,
  Lightbulb,
  Leaf,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingDown,
  UserRound,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Category = 'travel' | 'electricity' | 'food' | 'waste' | 'shopping';

type Activity = {
  id: string;
  category: Category;
  label: string;
  quantity: number;
  unit: string;
  emissions_kg: number;
  created_at: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  activities?: Activity[];
  timestamp: string;
};

const CATEGORY_META: Record<Category, { icon: typeof Bus; color: string; bg: string; label: string }> = {
  travel: { icon: Bus, color: '#3f8665', bg: '#e0f1e4', label: 'Travel' },
  electricity: { icon: Zap, color: '#bc8e3e', bg: '#fff1d4', label: 'Electricity' },
  food: { icon: Utensils, color: '#7b9870', bg: '#edf4dc', label: 'Food' },
  waste: { icon: Trash2, color: '#8a7b6a', bg: '#f0ebe5', label: 'Waste' },
  shopping: { icon: ShoppingBag, color: '#6b7fa3', bg: '#e6ecf4', label: 'Shopping' },
};

const QUICK_PROMPTS = [
  'I travelled 12 km by bus today',
  'I used my AC for 5 hours',
  'I had a vegetarian lunch',
  'I bought a new t-shirt',
  'Give me a summary of my footprint',
  'Suggest ways to reduce my emissions',
];

function formatKg(value: number) {
  return `${value.toFixed(2)} kg`;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function categoryIcon(category: Category, size = 18) {
  const meta = CATEGORY_META[category] ?? CATEGORY_META.travel;
  const Icon = meta.icon;
  return <Icon size={size} strokeWidth={1.8} style={{ color: meta.color }} />;
}

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi, I'm your Carbon Coach! Tell me about your day in plain words — what you travelled, what you ate, how you used energy — and I'll calculate your carbon footprint and log it. Try the example below or type your own.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadActivities() {
      const { data, error } = await supabase
        .from('carbon_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (active && !error && data) setActivities(data as Activity[]);
    }
    void loadActivities();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  const total = useMemo(() => activities.reduce((sum, a) => sum + a.emissions_kg, 0), [activities]);
  const todayTotal = useMemo(
    () => activities.filter((a) => new Date(a.created_at).toDateString() === new Date().toDateString()).reduce((sum, a) => sum + a.emissions_kg, 0),
    [activities]
  );
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of activities) {
      map[a.category] = (map[a.category] ?? 0) + a.emissions_kg;
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [activities]);

  // Build lightweight history for the agent (last 10 turns)
  const history = useMemo(() => {
    const recent = messages.slice(-10);
    return recent
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  async function sendMessage(text?: string) {
    const textToSend = (text ?? message).trim();
    if (!textToSend || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke<{ message: string; activities?: Activity[]; error?: string }>(
        'carbon-coach',
        { body: { message: textToSend, history } }
      );

      if (error || !data || data.error) {
        const errorMsg = data?.error ?? error?.message ?? 'The coach is unavailable right now. Please try again.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, I couldn't process that. ${errorMsg}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        const assistantActivities: Activity[] = (data.activities ?? []).map((a, i) => ({
          ...a,
          id: `agent-${Date.now()}-${i}`,
          created_at: new Date().toISOString(),
        }));
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            role: 'assistant',
            content: data.message,
            activities: assistantActivities.length > 0 ? assistantActivities : undefined,
            timestamp: new Date().toISOString(),
          },
        ]);
        // Refresh activities from DB to reflect new logs
        if (assistantActivities.length > 0) {
          const { data: freshData } = await supabase
            .from('carbon_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
          if (freshData) setActivities(freshData as Activity[]);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again in a moment.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  const visibleActivities = showAll ? activities : activities.slice(0, 6);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="Carbon Coach" />
          <span>Carbon Coach</span>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className="active">Footprint</button>
          <button>Reduction tips</button>
          <button>Community</button>
          <button>Profile</button>
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Help"><CircleHelp size={19} /></button>
          <button className="avatar" aria-label="Profile"><UserRound size={18} /></button>
          <button className="mobile-menu" onClick={() => setMobilePanel(true)} aria-label="Open menu"><Menu size={21} /></button>
        </div>
      </header>

      <section className="page-heading">
        <div>
          <p className="eyebrow"><span className="status-dot" />Personal sustainability space</p>
          <h1>Your daily footprint</h1>
          <p className="subtitle">Small choices add up. Let's make yours count.</p>
        </div>
        <button className="date-picker">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          <ChevronDown size={17} />
        </button>
      </section>

      <main className="workspace">
        {/* ─── Chat section ─── */}
        <section className="chat-section">
          <div className="chat-header">
            <div>
              <p className="section-kicker">Your coach</p>
              <h2>Tell me what you've been up to</h2>
            </div>
            <button
              className="soft-icon"
              aria-label="New conversation"
              onClick={() => setMessages([{ id: 'welcome', role: 'assistant', content: "Hi, I'm your Carbon Coach! Tell me about your day — what you travelled, ate, or how you used energy — and I'll calculate your footprint.", timestamp: new Date().toISOString() }])}
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="conversation" ref={conversationRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`message-row ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? <UserRound size={17} /> : <Bot size={17} />}
                </div>
                <div className="message-body">
                  <div className="message-meta">
                    <span>{msg.role === 'user' ? 'You' : 'Carbon Coach'}</span>
                    <time>{formatTime(msg.timestamp)}</time>
                  </div>
                  {msg.role === 'user' ? (
                    <div className="user-bubble">{msg.content}</div>
                  ) : (
                    <div className="coach-response">
                      <p className="coach-text">{msg.content}</p>
                      {msg.activities && msg.activities.length > 0 && (
                        <div className="breakdown-card">
                          <div className="breakdown-title">
                            <span><Sparkles size={15} /> Activity breakdown</span>
                            <em>{msg.activities.reduce((s, a) => s + a.emissions_kg, 0).toFixed(2)} kg total</em>
                          </div>
                          {msg.activities.map((act, i) => {
                            const meta = CATEGORY_META[act.category as Category] ?? CATEGORY_META.travel;
                            return (
                              <div className="breakdown-row" key={i}>
                                <span>{categoryIcon(act.category as Category, 16)} {act.label}</span>
                                <b>
                                  {act.quantity} {act.unit}
                                  <em>{formatKg(act.emissions_kg)} CO₂e</em>
                                </b>
                              </div>
                            );
                          })}
                          <div className="breakdown-total">
                            <span><Leaf size={16} /> Total emissions</span>
                            <strong>{formatKg(msg.activities.reduce((s, a) => s + a.emissions_kg, 0))} CO₂e</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="message-row assistant">
                <div className="message-avatar"><Bot size={17} /></div>
                <div className="message-body">
                  <div className="message-meta">
                    <span>Carbon Coach</span>
                    <time>now</time>
                  </div>
                  <div className="typing-indicator">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompt chips */}
          <div className="quick-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} onClick={() => sendMessage(prompt)} disabled={isSending}>
                {prompt.length > 30 ? prompt.slice(0, 30) + '...' : prompt}
              </button>
            ))}
          </div>

          <div className="composer-wrap">
            <div className="composer">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tell me about a trip, meal, energy use, or ask for tips..."
                rows={1}
              />
              <button className="send-button" onClick={() => void sendMessage()} disabled={isSending || !message.trim()} aria-label="Send message">
                {isSending ? <RefreshCw size={18} className="spin" /> : <Send size={19} />}
              </button>
            </div>
            <div className="composer-note">
              <span>Calculations use documented emission factors</span>
              <span>Press Enter to send</span>
            </div>
          </div>
        </section>

        {/* ─── Insights panel ─── */}
        <aside className={`insights-panel ${mobilePanel ? 'open' : ''}`}>
          <button className="close-panel" onClick={() => setMobilePanel(false)}><X size={19} /></button>
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Your overview</p>
              <h2>This week</h2>
            </div>
            <button className="soft-icon"><BarChart3 size={18} /></button>
          </div>

          <div className="total-card">
            <div className="total-top">
              <span>Total footprint</span>
              {total > 0 && (
                <span className="trend"><TrendingDown size={13} /> {activities.length} activities</span>
              )}
            </div>
            <strong>{formatKg(total)} <small>CO₂e</small></strong>
            <p>{formatKg(todayTotal)} logged today</p>
            <div className="mini-chart" aria-label="Recent emissions chart">
              {(() => {
                const last7 = [...activities].reverse().slice(-7);
                const maxVal = Math.max(...last7.map((a) => a.emissions_kg), 1);
                return last7.map((a, i) => (
                  <div className="bar-column" key={i}>
                    <span
                      className={i === last7.length - 1 ? 'bar current' : 'bar'}
                      style={{ height: `${Math.max((a.emissions_kg / maxVal) * 100, 10)}%` }}
                    />
                    <small>{new Date(a.created_at).toLocaleDateString('en-US', { weekday: 'short' })[0]}</small>
                  </div>
                )) as unknown as React.ReactNode;
              })()}
            </div>
          </div>

          {/* Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="category-card">
              <div className="recent-heading">
                <h3>By category</h3>
              </div>
              {categoryBreakdown.map(([cat, val]) => {
                const meta = CATEGORY_META[cat as Category] ?? CATEGORY_META.travel;
                const pct = total > 0 ? (val / total) * 100 : 0;
                return (
                  <div className="category-bar-row" key={cat}>
                    <div className="category-bar-label">
                      <span style={{ background: meta.bg, color: meta.color }}>{categoryIcon(cat as Category, 14)} {meta.label}</span>
                      <b>{formatKg(val)}</b>
                    </div>
                    <div className="category-bar-track">
                      <div className="category-bar-fill" style={{ width: `${pct}%`, background: meta.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tip card */}
          <div className="tip-card">
            <div className="tip-icon"><Lightbulb size={21} /></div>
            <div>
              <p className="section-kicker">Today's smart tip</p>
              <h3>Set AC to 26°C</h3>
              <p>Save up to <strong>1.1 kg/day</strong> with one small change.</p>
              <button onClick={() => sendMessage('Suggest ways to reduce my emissions')}>See more tips <ArrowUp size={14} /></button>
            </div>
            <Leaf className="tip-leaf" size={40} />
          </div>

          {/* Recent activity */}
          <div className="recent-card">
            <div className="recent-heading">
              <div>
                <p className="section-kicker">Activity log</p>
                <h3>Recent activity</h3>
              </div>
              <button onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : 'View all'}</button>
            </div>
            {visibleActivities.length === 0 ? (
              <p className="empty-state">No activities logged yet. Start a conversation to begin tracking.</p>
            ) : (
              visibleActivities.map((activity) => (
                <div className="recent-row" key={`recent-${activity.id}`}>
                  <div className="category-icon" style={{ background: CATEGORY_META[activity.category].bg }}>
                    {categoryIcon(activity.category, 16)}
                  </div>
                  <div>
                    <strong>{activity.label}</strong>
                    <span>{activity.quantity} {activity.unit}</span>
                  </div>
                  <b>{formatKg(activity.emissions_kg)}</b>
                </div>
              ))
            )}
          </div>

          <div className="source-note">
            <Leaf size={15} />
            <span>Factors are based on commonly used household averages. <u>How we calculate</u></span>
          </div>
        </aside>
      </main>

      <footer className="bottom-note">
        <span><span className="tiny-leaf">✦</span> Every log is a step forward</span>
        <span>Carbon Coach <b>•</b> 2026</span>
      </footer>

      {mobilePanel && <button className="panel-scrim" aria-label="Close overview" onClick={() => setMobilePanel(false)} />}
    </div>
  );
}

export default App;
