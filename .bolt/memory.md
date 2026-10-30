# Project memory

## Product intent & audience

- Carbon Coach AI Agent: conversational AI agent (Google ADK) for measuring, understanding, and reducing personal carbon footprint.
- Users log daily activities via natural language and receive carbon calculations plus actionable reduction tips.
- Vite + React frontend; AI agent backed by tool-based emission calculations via Gemini.

## Brand personality & voice

- Coach-like, encouraging, clear; translates abstract emissions into concrete, relatable numbers.
- Empowerment and actionable guidance over guilt or alarm.
- Concise replies; never fabricates numbers — all emissions come from calculation tools.

## Visual design & UX direction

- Built with JSX + Tailwind CSS, React hooks, Lucide React icons (per `.bolt/prompt`).
- Module imports use `@/` path alias → `src/`.
- Conversational chat-centric interface with structured result cards for emission breakdowns.
- Side panel: total footprint, category-by-category breakdown, weekly bar chart, recent activity log — all live-updating.
- Six quick-prompt buttons for common queries.
- Production-quality, non-generic aesthetics expected (per `.bolt/prompt`).

## Decisions, constraints & rationale

- **Database integrated and locked**: Supabase is already set up; do not provision, create, or reconnect. Persist activities via existing integration only.
- **LLM backend**: Gemini (2.5 Flash) chosen over Grok for tool-calling reliability in multi-step chains (calculate → log → summarize). Gemini is wired and deployed via edge function.
- **GOOGLE_API_KEY configured**: Agent is now fully functional with real Gemini calls.
- **Supabase edge function upgraded**: Richer conversation support, multiple ADK tools, activity logging. Deployed as the agent endpoint.
- **Supported activity categories** (expanded): Transport (bus, car, train, bike, plane, motorcycle, EV — by distance); Electricity/appliances (ceiling fan, AC, heater, fridge, washing machine, 20+ more — by hours); Food (beef, chicken, vegetarian, vegan, coffee, etc. — by weight/serving); Waste (by kg or item count); Shopping (clothing, electronics, books, etc. — per-item).
- **Multi-activity parsing**: Natural-language input (e.g., "bus 12 km + fan 5 hours") split into separate activities; each gets its own calculator tool call and DB log entry.
- **Appliance power factor differentiation**: ceiling fans use lower power factor than AC; fan hours must parse to a distinct ceiling-fan entry, never treated as AC.
- **Conversation memory**: Agent retains context for follow-up questions (summary, reduction suggestions) using real logged data.
- Reference emission rates observed: bus ≈ 0.1 kg CO₂e/km, ceiling fan ≈ 0.78 kg CO₂e/kWh.

## Open questions & assumptions

- Exact emission factor source/registry not yet documented; values may need calibration or citation.
- User accounts/auth state assumed handled by existing setup; no explicit auth flow work noted.
- Whether reduction tips are rule-based or LLM-generated is not yet established (likely LLM-generated given conversation memory).