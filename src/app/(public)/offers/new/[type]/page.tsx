'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createContest } from '@/lib/api_contests';

type ContestType =
  | 'RIDDLE'
  | 'QR_CODE'
  | 'LEADERBOARD'
  | 'TREASURE_HUNT'
  | 'UGC'
  | 'REFERRAL'
  | 'PREDICTION'
  | 'SURVEY'
  | 'RAFFLE';

type Selection =
  | 'RANDOM_FROM_CORRECT'
  | 'EVERY_CODE'
  | 'TOP_SCORE'
  | 'FASTEST_TIME'
  | 'MOST_CODES';

const DEFAULT_SELECTION: Record<ContestType, Selection> = {
  RIDDLE: 'RANDOM_FROM_CORRECT',
  QR_CODE: 'EVERY_CODE',
  LEADERBOARD: 'TOP_SCORE',
  TREASURE_HUNT: 'FASTEST_TIME',
  UGC: 'RANDOM_FROM_CORRECT',
  REFERRAL: 'MOST_CODES',
  PREDICTION: 'RANDOM_FROM_CORRECT',
  SURVEY: 'RANDOM_FROM_CORRECT',
  RAFFLE: 'EVERY_CODE',
};

const SELECTION_LIBRARY: { value: Selection; label: string }[] = [
  { value: 'RANDOM_FROM_CORRECT', label: 'Random from correct answers' },
  { value: 'EVERY_CODE', label: 'Every valid code wins' },
  { value: 'TOP_SCORE', label: 'Top score / leaderboard' },
  { value: 'FASTEST_TIME', label: 'Fastest completion time' },
  { value: 'MOST_CODES', label: 'Most codes collected' },
];

const SELECTION_OPTIONS_BY_TYPE: Record<ContestType | 'DEFAULT', Selection[]> = {
  RIDDLE: ['RANDOM_FROM_CORRECT', 'FASTEST_TIME'],
  QR_CODE: ['EVERY_CODE', 'FASTEST_TIME', 'MOST_CODES'],
  LEADERBOARD: ['TOP_SCORE', 'FASTEST_TIME'],
  TREASURE_HUNT: ['FASTEST_TIME', 'RANDOM_FROM_CORRECT'],
  UGC: ['RANDOM_FROM_CORRECT', 'TOP_SCORE'],
  REFERRAL: ['MOST_CODES', 'RANDOM_FROM_CORRECT'],
  PREDICTION: ['RANDOM_FROM_CORRECT', 'TOP_SCORE'],
  SURVEY: ['RANDOM_FROM_CORRECT'],
  RAFFLE: ['EVERY_CODE', 'RANDOM_FROM_CORRECT', 'MOST_CODES'],
  DEFAULT: ['RANDOM_FROM_CORRECT'],
};

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function fallbackSlug(base?: string) {
  const suffix = Math.random().toString(36).slice(2, 6);
  return [base && base.length ? base : 'offer', suffix].join('-');
}

export default function NewOfferForm({ params }: { params: { type: ContestType } }) {
  const router = useRouter();
  const type = params.type as ContestType;

  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION[type] ?? 'RANDOM_FROM_CORRECT');
  const selectionOptions = useMemo(() => {
    const key = (type || 'DEFAULT') as ContestType | 'DEFAULT';
    return SELECTION_OPTIONS_BY_TYPE[key] || SELECTION_OPTIONS_BY_TYPE.DEFAULT;
  }, [type]);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now.toISOString().slice(0, 16);
  });
  const [endsAt, setEndsAt] = useState(() => {
    const d = addDays(new Date(), 7);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [maxWinners, setMaxWinners] = useState<number | ''>('');
  const [perUserLimit, setPerUserLimit] = useState<number | ''>(1);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const friendly = useMemo(() => {
    switch (type) {
      case 'RIDDLE':
        return 'Riddle';
      case 'QR_CODE':
        return 'QR Code';
      case 'LEADERBOARD':
        return 'Leaderboard';
      case 'TREASURE_HUNT':
        return 'Treasure Hunt';
      case 'UGC':
        return 'UGC';
      case 'REFERRAL':
        return 'Referral';
    case 'PREDICTION':
      return 'Prediction';
    case 'SURVEY':
      return 'Survey';
    case 'RAFFLE':
      return 'Raffle';
    default:
      return type;
  }
  }, [type]);

  useEffect(() => {
    if (!title.trim()) {
      setSlug('');
      return;
    }
    const base = slugify(title);
    if (base) {
      setSlug((prev) => {
        if (!prev) return base;
        if (prev === base) return prev;
        if (prev.startsWith(`${base}-`)) return prev;
        return base;
      });
      return;
    }
    setSlug((prev) => (prev && prev.startsWith('offer-') ? prev : fallbackSlug()));
  }, [title]);

  useEffect(() => {
    setSelection(DEFAULT_SELECTION[type] ?? 'RANDOM_FROM_CORRECT');
  }, [type]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (submitting) return;

    setMessage(null);

    if (!title.trim()) return setMessage('Title is required.');
    if (!slug.trim()) return setMessage('Unable to create slug. Please adjust the title.');

    const starts_at = startsAt ? new Date(startsAt).toISOString() : null;
    const ends_at = endsAt ? new Date(endsAt).toISOString() : null;

    let attemptSlug = slug;
    const payloadBase: any = {
      title,
      description: description || null,
      type,
      selection,
      starts_at,
      ends_at,
      max_winners: maxWinners === '' ? null : Number(maxWinners),
      per_user_limit: perUserLimit === '' ? null : Number(perUserLimit),
      visibility,
      status: 'ACTIVE',
      branding_theme: { primary: '#4f46e5' },
      rules_json: {},
      eligibility_json: {},
      geo_restrictions: {},
    };

    try {
      setSubmitting(true);
      let res: any = null;
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        res = await createContest({ ...payloadBase, slug: attemptSlug });
        if (!res?.error) break;

        const errMsg = String(res.error || '').toLowerCase();
        if (!errMsg.includes('slug') && !errMsg.includes('duplicate')) {
          throw new Error(res.error);
        }

        attempt++;
        const base = slugify(title) || 'offer';
        attemptSlug = fallbackSlug(base);
        setSlug(attemptSlug);
      }

      if (res?.error) throw new Error(res.error);

      const finalSlug = res?.contest?.slug || res?.slug || slug;
      router.push(`/offers/${finalSlug}/manage?first=1`);
    } catch (err: any) {
      setMessage(err?.message || 'Failed to create offer');
    } finally {
      setSubmitting(false);
    }
  }

  const cardClass =
    'rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur';
  const labelClass = 'text-sm font-semibold text-slate-600 mb-2';
  const inputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-inner focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition';
  const textAreaClass = `${inputClass} min-h-[120px]`;

  return (
    <main className="space-y-10 pb-16">
      <header className="rounded-3xl bg-gradient-to-r from-indigo-500 via-violet-500 to-slate-900 p-8 text-white shadow-[0_30px_65px_rgba(79,70,229,0.4)]">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">Launch a new offer</p>
            <h1 className="text-3xl font-bold md:text-4xl">Create your {friendly} experience</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Capture the essentials now. Artwork, rewards, and advanced rules stay in the manager workspace for later.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <input type="hidden" value={slug} readOnly />
        <section className="space-y-6 lg:col-span-2">
          <div className={cardClass}>
            <div className="flex items-start gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Basics</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Give your offer a clear name and tell participants what to expect.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <div className={labelClass}>Title*</div>
                <input
                  className={inputClass}
                  placeholder="e.g., Friday Riddle"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <div className="hidden" aria-hidden="true">
                <span className="sr-only">Slug preview: {slug || 'generated once title is added'}</span>
              </div>
            </div>
            <label className="block">
              <div className={labelClass}>Description</div>
              <textarea
                className={textAreaClass}
                placeholder="Short description of the offer..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <div className="mt-6 rounded-2xl border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">Winner selection mode</div>
              <p className="text-xs text-slate-500">
                Choose how Fizna should pick winners for this experience.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {selectionOptions.map((option) => {
                  const meta = SELECTION_LIBRARY.find((x) => x.value === option);
                  const active = selection === option;
                  return (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setSelection(option)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <div className="font-semibold">{meta?.label || option}</div>
                      <div className="text-xs text-slate-500">
                        {option === 'EVERY_CODE' && 'Reward every valid code or purchase instantly.'}
                        {option === 'RANDOM_FROM_CORRECT' && 'Run a random draw among all valid entries.'}
                        {option === 'FASTEST_TIME' && 'Celebrate whoever finishes the flow first.'}
                        {option === 'TOP_SCORE' && 'Crown the highest score on the leaderboard.'}
                        {option === 'MOST_CODES' && 'Reward the participant who collects the most codes.'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Schedule &amp; participation</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure when the offer runs and how many people can win or join.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <div className={labelClass}>Starts at</div>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </label>
              <label className="block">
                <div className={labelClass}>Ends at</div>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <div className={labelClass}>Max winners</div>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={maxWinners}
                  onChange={(event) => {
                    const value = event.target.value;
                    setMaxWinners(value === '' ? '' : Number(value));
                  }}
                />
              </label>
              <label className="block">
                <div className={labelClass}>Per-user limit</div>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={perUserLimit}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPerUserLimit(value === '' ? '' : Number(value));
                  }}
                />
              </label>
              <label className="hidden">
                <div className={labelClass}>Visibility</div>
                <select
                  className={inputClass}
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rv-btn-primary px-6 py-3 text-base shadow-lg shadow-indigo-200 transition hover:shadow-indigo-300/70 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create offer'}
            </button>
            <button
              type="button"
              className="rv-btn px-6 py-3 text-base shadow-sm transition hover:shadow-md disabled:opacity-60"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </button>
            {message && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-600 shadow-sm">
                {message}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className={cardClass}>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Overview</div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{friendly}</div>
            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-700 shadow-inner">
              Selection mode: <span className="font-semibold">{selection}</span>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="text-base font-semibold text-slate-900">Tips</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>Keep the title concise so slug previews remain short.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>Use the description for a quick hook; details can live in the manager.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span>Double-check dates and limits before creating the offer.</span>
              </li>
            </ul>
          </div>
        </aside>
      </form>
    </main>
  );
}

