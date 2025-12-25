'use client';

import { useEffect, useMemo, useState } from 'react';
import { WheelChart, type AssessmentSnapshot } from '@/components/WheelChart';

type Category = {
  id: string;
  label: string;
  description: string;
};

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'health',
    label: 'Health & Energy',
    description: 'Physical health, sleep, energy, and overall wellbeing.',
  },
  {
    id: 'career',
    label: 'Career & Work',
    description: 'Progress, fulfillment, and alignment at work or in studies.',
  },
  {
    id: 'relationships',
    label: 'Relationships',
    description: 'Family, friends, partner, and social support.',
  },
  {
    id: 'finance',
    label: 'Finances',
    description: 'Income, savings, security, and money habits.',
  },
  {
    id: 'growth',
    label: 'Personal Growth',
    description: 'Learning, mindset, and self-development.',
  },
  {
    id: 'fun',
    label: 'Fun & Recreation',
    description: 'Play, hobbies, and activities that recharge you.',
  },
  {
    id: 'environment',
    label: 'Environment',
    description: 'Home, workspace, and surroundings.',
  },
  {
    id: 'spirituality',
    label: 'Meaning & Spirituality',
    description: 'Purpose, values, and connection to something bigger.',
  },
];

type StoredAssessment = {
  id: string;
  name: string;
  createdAt: string;
  scores: Record<string, number>;
  categories: Category[];
};

const STORAGE_KEY = 'wheel-of-life-assessments:v1';

function loadAssessments(): StoredAssessment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveAssessments(assessments: StoredAssessment[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
  } catch {
    // ignore
  }
}

function suggestForCategory(id: string, label: string): string {
  const suggestions: Record<string, string> = {
    health:
      'Pick one tiny habit this week (a 10‑minute walk, stretching, or lights‑out time) that would noticeably improve your energy.',
    career:
      'Clarify your next small career move: a conversation, a course, or a project that moves you one step forward.',
    relationships:
      'Schedule one meaningful check‑in or shared activity with someone important to you.',
    finance:
      'Decide on one simple money habit: a weekly budget review, an automatic transfer, or tracking expenses.',
    growth:
      'Choose one skill or topic to focus on this month and block out two learning sessions in your calendar.',
    fun:
      'Plan a small, guilt‑free activity this week that’s just for enjoyment and recharge.',
    environment:
      'Identify one small improvement to your space (decluttering, lighting, or setup) and schedule it.',
    spirituality:
      'Set aside a short daily or weekly ritual (reflection, journaling, or quiet time) to reconnect with your values.',
  };

  return (
    suggestions[id] ??
    `Choose one small, realistic action this week that would move your "${label}" score up by just one point.`
  );
}

function generateInsights(
  categories: Category[],
  scores: Record<string, number>,
) {
  const active = categories.filter((c) => typeof scores[c.label] === 'number');
  if (!active.length) {
    return {
      summary:
        'Rate each area from 0–10 to see how balanced your current Wheel of Life feels.',
      highlights: [] as string[],
      actions: [] as string[],
    };
  }

  const values = active.map((c) => scores[c.label] ?? 0);
  const avg =
    values.reduce((acc, v) => acc + v, 0) / (values.length || 1);
  const lowestSorted = [...active].sort(
    (a, b) => (scores[a.label] ?? 0) - (scores[b.label] ?? 0),
  );
  const lowest = lowestSorted.slice(0, 3);

  const summary = `Your average score is ${avg.toFixed(
    1,
  )}/10 across ${active.length} areas. A balanced wheel is less about perfection and more about feeling steady overall.`;

  const highlights: string[] = [];
  const actions: string[] = [];

  lowest.forEach((cat) => {
    const value = scores[cat.label] ?? 0;
    highlights.push(
      `${cat.label}: ${value}/10 — a small improvement here could have an outsized impact on your overall balance.`,
    );
    actions.push(suggestForCategory(cat.id, cat.label));
  });

  return { summary, highlights, actions };
}

export default function Home() {
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    DEFAULT_CATEGORIES.forEach((c) => {
      initial[c.label] = 5;
    });
    return initial;
  });
  const [customLabel, setCustomLabel] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [assessments, setAssessments] = useState<StoredAssessment[]>([]);
  const [selectedComparisonId, setSelectedComparisonId] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const stored = loadAssessments();
    setAssessments(stored);
  }, []);

  useEffect(() => {
    if (!assessments.length) return;
    saveAssessments(assessments);
  }, [assessments]);

  const currentCategoriesLabels = useMemo(
    () => categories.map((c) => c.label),
    [categories],
  );

  const comparisonSnapshot: AssessmentSnapshot | null = useMemo(() => {
    if (!selectedComparisonId) return null;
    const found = assessments.find((a) => a.id === selectedComparisonId);
    if (!found) return null;
    const scoresByLabel: Record<string, number> = {};
    found.categories.forEach((c) => {
      scoresByLabel[c.label] = found.scores[c.label] ?? 0;
    });
    return {
      id: found.id,
      name: found.name,
      createdAt: found.createdAt,
      scores: scoresByLabel,
    };
  }, [assessments, selectedComparisonId]);

  const insights = useMemo(
    () => generateInsights(categories, scores),
    [categories, scores],
  );

  const handleScoreChange = (label: string, value: number) => {
    setScores((prev) => ({ ...prev, [label]: value }));
  };

  const handleAddCategory = () => {
    const trimmed = customLabel.trim();
    if (!trimmed) return;
    const exists = categories.some(
      (c) => c.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) return;

    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newCat: Category = {
      id: id || `custom-${Date.now()}`,
      label: trimmed,
      description:
        customDescription.trim() ||
        'A custom area of life that matters to you.',
    };

    setCategories((prev) => [...prev, newCat]);
    setScores((prev) => ({ ...prev, [newCat.label]: 5 }));
    setCustomLabel('');
    setCustomDescription('');
  };

  const handleRemoveCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setScores((prev) => {
      const copy = { ...prev };
      const cat = categories.find((c) => c.id === id);
      if (cat) {
        delete copy[cat.label];
      }
      return copy;
    });
  };

  const handleSaveAssessment = () => {
    setIsSaving(true);
    try {
      const id = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
      const now = new Date();
      const name = `Assessment ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
      const snapshot: StoredAssessment = {
        id,
        name,
        createdAt: now.toISOString(),
        scores: { ...scores },
        categories: [...categories],
      };
      setAssessments((prev) => [snapshot, ...prev]);
      setSelectedComparisonId(id);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = (dataUrl: string) => {
    setExportUrl(dataUrl);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'wheel-of-life.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 px-4 py-8 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row">
        <section className="w-full space-y-6 lg:w-1/2">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
              Wheel of Life
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              See your life at a glance.
            </h1>
            <p className="max-w-xl text-sm text-slate-300">
              Rate each area from 0–10 to create your personal Wheel of Life.
              The chart highlights balance, gaps, and where a small change
              could have the biggest impact.
            </p>
          </header>

          <div className="space-y-4 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800/80 shadow-lg shadow-slate-950/40">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Life areas
              </h2>
              <span className="text-xs text-slate-400">
                0 = needs attention · 10 = thriving
              </span>
            </div>

            <div className="grid gap-3">
              {categories.map((category) => {
                const value = scores[category.label] ?? 0;
                return (
                  <div
                    key={category.id}
                    className="group rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-800/80 hover:ring-emerald-500/60 transition"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-100">
                            {category.label}
                          </p>
                          {value <= 3 && (
                            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                              Priority
                            </span>
                          )}
                          {value >= 8 && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                              Strength
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {category.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-right text-xs tabular-nums text-slate-200">
                          {value}
                        </span>
                        {categories.length > 4 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(category.id)}
                            className="rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                            aria-label={`Remove ${category.label}`}
                          >
                            <span className="text-xs">×</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={value}
                      onChange={(e) =>
                        handleScoreChange(
                          category.label,
                          Number(e.target.value),
                        )
                      }
                      className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-emerald-400"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-3 space-y-3 rounded-xl border border-dashed border-slate-700/80 bg-slate-900/60 p-3">
              <p className="text-xs font-medium text-slate-200">
                Add your own area
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g. Creativity, Parenting, Community"
                    className="w-full rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-xs font-medium text-emerald-950 shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  disabled={!customLabel.trim()}
                >
                  Add
                </button>
              </div>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={2}
                placeholder="Optional: a short description of what this area means to you."
                className="w-full rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
              />
            </div>
          </div>
        </section>

        <section className="w-full space-y-4 lg:w-1/2">
          <div className="space-y-3 rounded-2xl bg-slate-900/80 p-4 ring-1 ring-slate-800/80 shadow-xl shadow-slate-950/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Your Wheel of Life
                </h2>
                <p className="text-[11px] text-slate-400">
                  A radar chart of your current scores. Aim for a shape that
                  feels steady and balanced.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveAssessment}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-950 shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isSaving}
              >
                <span>{isSaving ? 'Saving...' : 'Save snapshot'}</span>
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="text-[11px] text-slate-400 sm:w-40">
                Your name (for downloads)
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Optional"
                className="flex-1 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
              />
            </div>

            <WheelChart
              categories={currentCategoriesLabels}
              currentScores={scores}
              comparison={comparisonSnapshot}
              onExport={handleExport}
              userName={userName || undefined}
            />

            {exportUrl && (
              <p className="mt-1 text-[10px] text-slate-500">
                Chart downloaded as <span className="font-mono">PNG</span>.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-2xl bg-slate-900/80 p-4 ring-1 ring-slate-800/80">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Insights
              </h3>
              <p className="text-xs text-slate-200">{insights.summary}</p>
              <ul className="mt-2 space-y-1.5 text-[11px] text-slate-300">
                {insights.highlights.map((item, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="mt-0.5 h-[3px] w-[10px] rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 rounded-2xl bg-slate-900/80 p-4 ring-1 ring-slate-800/80">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Suggested next steps
              </h3>
              <ul className="mt-1 space-y-1.5 text-[11px] text-slate-300">
                {insights.actions.map((item, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="mt-[3px] h-1.5 w-1.5 flex-none rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
                {!insights.actions.length && (
                  <li className="text-[11px] text-slate-400">
                    As you rate more areas, we’ll highlight 2–3 high‑leverage
                    next steps.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl bg-slate-900/80 p-4 ring-1 ring-slate-800/80">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Past assessments
              </h3>
              {assessments.length > 0 && (
                <button
                  type="button"
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                  onClick={() => setSelectedComparisonId(null)}
                >
                  Clear comparison
                </button>
              )}
            </div>
            {assessments.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                Save a snapshot to track how your wheel changes over time.
              </p>
            ) : (
              <ul className="mt-1 grid max-h-40 gap-1.5 overflow-y-auto text-[11px]">
                {assessments.map((a) => {
                  const date = new Date(a.createdAt);
                  const label = `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`;
                  const isActive = selectedComparisonId === a.id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedComparisonId(
                            isActive ? null : a.id,
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition ${isActive
                            ? 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/60'
                            : 'bg-slate-900/60 text-slate-200 ring-1 ring-slate-800/80 hover:bg-slate-800/80'
                          }`}
                      >
                        <span className="truncate text-[11px] font-medium">
                          {a.name}
                        </span>
                        <span className="ml-2 flex-none text-[10px] text-slate-400">
                          {label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

