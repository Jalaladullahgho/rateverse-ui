'use client';

import { useEffect, useMemo, useState } from 'react';
import { getContest, listWinners, listPublicContests } from '@/lib/api_contests';
import WinnersCard from '@/components/offers/WinnersCard';
import EnterNow from '@/components/offers/EnterNow';
import OfferGallery from '@/components/offers/OfferGallery';

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type ContestMedia = {
  id?: string;
  url: string;
  kind?: string | null;
  created_at?: string | null;
};

type ContestTask = {
  id: string;
  contest_id: string;
  round_id?: string | null;
  kind: string;
  title?: string | null;
  description?: string | null;
  points?: number | null;
  time_limit_sec?: number | null;
  metadata?: any;
};

type Prize = {
  id?: string;
  name?: string | null;
  type?: string | null;
  quantity?: number | null;
  amount?: number | null;
  currency?: string | null;
  description?: string | null;
};

type McqOption = {
  id?: string;
  label?: string | null;
  position?: number | null;
};

type Contest = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: string;
  selection: string;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  prizes?: Prize[] | null;
  mcq_options?: McqOption[] | null;
  entries_stats?: {
    total?: number;
    correct?: number;
    pending?: number;
    needs_review?: number;
  };
  max_winners?: number | null;
  prize_summary?: string | null;
  owner_service_id?: string | null;
  created_by_user_id?: string | null;
  media?: ContestMedia[] | null;
  rules_json?: {
    cover_url?: string | null;
    avatar_url?: string | null;
    icon_url?: string | null;
    gallery_urls?: string[];
    rules_markdown?: string | null;
    [key: string]: any;
  } | null;
};

type Winner = {
  id?: string;
  user_id?: string;
  entry_id?: string | null;
  published_at?: string | null;
  user?: { name?: string | null } | null;
};

type TimelineStage = 'upcoming' | 'active' | 'ended';

function formatLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function formatDateLabel(date?: Date | null) {
  if (!date) return 'Not set';
  const time = date.getTime();
  if (Number.isNaN(time)) return 'Not set';
  return dateTimeFormatter.format(date);
}

function formatRelativeToNow(date: Date, nowMs: number) {
  const diffMs = date.getTime() - nowMs;
  const future = diffMs > 0;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60000);

  if (minutes < 1) {
    return future ? 'in under a minute' : 'just now';
  }
  if (minutes < 60) {
    const label = `${minutes} min${minutes > 1 ? 's' : ''}`;
    return future ? `in ${label}` : `${label} ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    const label = `${hours} hr${hours > 1 ? 's' : ''}`;
    return future ? `in ${label}` : `${label} ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 14) {
    const label = `${days} day${days > 1 ? 's' : ''}`;
    return future ? `in ${label}` : `${label} ago`;
  }
  const weeks = Math.round(days / 7);
  const label = `${weeks} wk${weeks > 1 ? 's' : ''}`;
  return future ? `in ${label}` : `${label} ago`;
}

function computeTimelineState(
  startsAt: Date | null,
  endsAt: Date | null,
  nowMs: number,
): { stage: TimelineStage; chip: string; helper: string } {
  if (endsAt && nowMs > endsAt.getTime()) {
    return { stage: 'ended', chip: 'Closed', helper: `Closed ${formatRelativeToNow(endsAt, nowMs)}` };
  }
  if (startsAt && nowMs < startsAt.getTime()) {
    return { stage: 'upcoming', chip: 'Starts soon', helper: `Opens ${formatRelativeToNow(startsAt, nowMs)}` };
  }
  if (endsAt) {
    return { stage: 'active', chip: 'Open now', helper: `Closes ${formatRelativeToNow(endsAt, nowMs)}` };
  }
  return { stage: 'active', chip: 'Open now', helper: 'Accepting entries' };
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function formatInline(html: string) {
  return html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function markdownToHtml(md: string) {
  const lines = md.split(/\r?\n/);
  const parts: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push('</ul>');
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }

    if (line.startsWith('### ')) {
      closeList();
      parts.push(`<h3>${formatInline(escapeHtml(line.slice(4).trim()))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      parts.push(`<h2>${formatInline(escapeHtml(line.slice(3).trim()))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      closeList();
      parts.push(`<h1>${formatInline(escapeHtml(line.slice(2).trim()))}</h1>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const item = formatInline(escapeHtml(line.replace(/^[-*]\s+/, '')));
      if (!inList) {
        parts.push('<ul>');
        inList = true;
      }
      parts.push(`<li>${item}</li>`);
      continue;
    }

    closeList();
    parts.push(`<p>${formatInline(escapeHtml(line))}</p>`);
  }

  closeList();
  return parts.join('\n');
}

function OtherOffersSlider({ offers, currentSlug }: { offers: Contest[]; currentSlug: string }) {
  const items = (offers || []).filter((offer) => offer.slug !== currentSlug);
  if (items.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Discover more offers</h2>
        <a
          href="/offers"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
        >
          Browse all
        </a>
      </div>
      <div className="flex gap-4 overflow-x-auto px-6 py-5">
        {items.map((item) => (
          <a
            key={item.id}
            href={`/offers/${item.slug}`}
            className="group relative min-w-[240px] max-w-[280px] flex-shrink-0 rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {formatLabel(item.type)}
            </div>
            <div className="mt-2 text-base font-semibold text-slate-900 line-clamp-2">
              {item.title}
            </div>
            {item.description && (
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">{item.description}</p>
            )}
            <span className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600">
              Enter now
              <span className="ml-1 transition group-hover:translate-x-1">-&gt;</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

type EntryPreview = {
  id?: string;
  user_id?: string | null;
  entry_type?: string | null;
  task_id?: string | null;
  round_id?: string | null;
  answer_text?: string | null;
  mcq_option_id?: string | null;
  mcq_option_label?: string | null;
  code_submitted?: string | null;
  code_hash?: string | null;
  code_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  asset_url?: string | null;
  evidence_image_url?: string | null;
  score?: number | null;
  elapsed_ms?: number | null;
  user?: { name?: string | null } | null;
};

function formatEntryDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateTimeFormatter.format(date);
}

function MyEntries({
  slug,
  contestId,
  currentUserId,
  limit = 8,
}: {
  slug: string;
  contestId?: string;
  currentUserId?: string | null;
  limit?: number;
}) {
  const base = useMemo(() => process.env.NEXT_PUBLIC_BASE_URL || '', []);
  const [entries, setEntries] = useState<EntryPreview[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [fetchedOnce, setFetchedOnce] = useState(false);

  useEffect(() => {
    if (!currentUserId) {
      setEntries([]);
      setLoading(false);
      setFetchedOnce(true);
      return;
    }
    let cancelled = false;
    const safeJson = async (response: Response) => {
      try {
        return await response.json();
      } catch {
        return null;
      }
    };

    (async () => {
      setLoading(true);
      let collected: EntryPreview[] = [];
      const slugPath = `${base}/api/contests/by-slug/${encodeURIComponent(
        slug,
      )}/entries?mine=1&limit=${limit}&offset=0`;
      try {
        const response = await fetch(slugPath, { cache: 'no-store', credentials: 'include' });
        if (response.ok) {
          const json = await safeJson(response);
          const items = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
          if (items.length) collected = items;
        } else if (response.status === 401) {
          collected = [];
        }
      } catch {
        collected = [];
      }

      if (!cancelled) {
        setEntries(collected);
        setLoading(false);
        setFetchedOnce(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [base, slug, limit, currentUserId]);

  const displayEntries = useMemo(() => entries.slice(0, limit), [entries, limit]);

  if (!currentUserId) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Your submissions</h2>
          <p className="text-sm text-slate-600">
            Sign in to review the answers you have submitted for this offer.
          </p>
          <a
            href="/sign-in"
            className="inline-flex w-fit items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-indigo-600 hover:border-indigo-300 hover:text-indigo-500"
          >
            Sign in
          </a>
        </div>
      </section>
    );
  }

  if (!loading && fetchedOnce && displayEntries.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Your submissions</h2>
        <p className="mt-2 text-sm text-slate-600">
          You have not submitted an entry yet. Once you participate, your answers will appear here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Your submissions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Only you can see this history. Entries update after each submission.
          </p>
        </div>
      </div>

      {loading && displayEntries.length === 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="h-3 w-32 rounded-full bg-slate-200" />
              <div className="mt-3 h-3 w-48 rounded-full bg-slate-200" />
              <div className="mt-3 h-3 w-24 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {displayEntries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm"
            >
              <div className="text-sm font-medium text-slate-900">
                {entry.answer_text?.trim() ||
                  entry.mcq_option_label?.trim() ||
                  entry.code_submitted?.trim() ||
                  (entry.asset_url || entry.evidence_image_url
                    ? 'Media entry attached'
                    : 'Entry submitted')}
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {entry.entry_type && (
                  <li>
                    Type:{' '}
                    <span className="font-medium">
                      {entry.entry_type.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </li>
                )}
                {entry.score != null && (
                  <li>
                    Score: <span className="font-medium">{entry.score}</span>
                    {entry.elapsed_ms != null && (
                      <span className="ml-1 text-slate-500">
                        ({Math.round(entry.elapsed_ms / 1000)}s)
                      </span>
                    )}
                  </li>
                )}
              </ul>
              {[entry.asset_url, entry.evidence_image_url]
                .filter((url): url is string => !!url)
                .map((url, idx) => (
                  <a
                    key={`${entry.id}-asset-${idx}`}
                    href={url}
                    className="mt-2 block text-xs font-medium text-indigo-600 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View attachment {idx + 1}
                  </a>
                ))}
              <div className="mt-3 text-xs text-slate-500">
                {formatEntryDate(entry.created_at) || 'Just submitted'} ·{' '}
                {(entry.status || 'submitted').replace(/_/g, ' ').toLowerCase()}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function OfferDetailPage({ params, searchParams }: any) {
  const { slug } = params as { slug: string };
  const debug = (searchParams?.debug ?? '').toString() === '1';

  const [contest, setContest] = useState<Contest | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [trace, setTrace] = useState<any>({});
  const [otherOffers, setOtherOffers] = useState<Contest[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());
  const [mediaItems, setMediaItems] = useState<ContestMedia[]>([]);
  const [tasks, setTasks] = useState<ContestTask[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        if (!response.ok) throw new Error('failed');
        const data = await response.json().catch(() => ({}));
        if (!cancelled) {
          setCurrentUserId(data?.user?.id ?? null);
        }
      } catch {
        if (!cancelled) setCurrentUserId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTrace({});
      setMediaItems([]);
      setTasks([]);
      try {
        const data = await getContest(slug);
        if (cancelled) return;
        const fetched: Contest | null = data?.contest ?? (data?.id ? data : null);
        if (!fetched?.id) {
          if (!cancelled) {
            setContest(null);
            setWinners([]);
            setOtherOffers([]);
            setMediaItems([]);
            setTasks([]);
            setTrace({ contestFetch: [{ ok: false, where: 'by-slug', data }] });
          }
          return;
        }

        if (!cancelled) {
          setContest(fetched);
        }

        const rulesMedia: ContestMedia[] = Array.isArray(fetched.rules_json?.gallery_urls)
          ? fetched.rules_json.gallery_urls
              .filter((url: any) => typeof url === 'string' && url.trim())
              .map((url: string) => ({ url, kind: 'image' as const }))
          : [];

        let winnersOk = false;
        try {
          const winnerResponse = await listWinners(fetched.id).catch(() => ({ items: [] }));
          if (!cancelled) {
            const items: Winner[] = Array.isArray((winnerResponse as any)?.items)
              ? (winnerResponse as any).items
              : Array.isArray(winnerResponse)
              ? (winnerResponse as Winner[])
              : [];
            setWinners(items);
            winnersOk = true;
          }
        } catch {
          if (!cancelled) setWinners([]);
        }

        let offersOk = false;
        try {
          const offersResponse = await listPublicContests().catch(() => ({ items: [] }));
          if (!cancelled) {
            const items: Contest[] = Array.isArray((offersResponse as any)?.items)
              ? (offersResponse as any).items
              : Array.isArray(offersResponse)
              ? (offersResponse as Contest[])
              : [];
            setOtherOffers(items);
            offersOk = true;
          }
        } catch {
          if (!cancelled) setOtherOffers([]);
        }

        let mediaOk = false;
        let combinedMedia: ContestMedia[] = [];
        try {
          const response = await fetch(
            `/api/public/contests/by-slug/${encodeURIComponent(slug)}/media`,
            { cache: 'no-store' },
          );
          if (response.ok) {
            const json = await response.json().catch(() => ({}));
            const items: ContestMedia[] = Array.isArray(json?.items) ? json.items : [];
            combinedMedia = items;
            mediaOk = true;
          }
        } catch {
          // ignore media fetch errors
        }

        combinedMedia = [...combinedMedia, ...rulesMedia];
        const seenMedia = new Set<string>();
        const normalizedMedia = combinedMedia.filter((item) => {
          const url = (item?.url || '').trim();
          if (!url || seenMedia.has(url)) return false;
          seenMedia.add(url);
          return true;
        });
        if (!cancelled) {
          setMediaItems(normalizedMedia);
        }

        let tasksOk = false;
        let parsedTasks: ContestTask[] = [];
        try {
          const response = await fetch(
            `/api/public/contests/by-slug/${encodeURIComponent(slug)}/tasks`,
            { cache: 'no-store' },
          );
          if (response.ok) {
            const json = await response.json().catch(() => ({}));
            const rawTasks = Array.isArray(json?.items) ? json.items : [];
            parsedTasks = rawTasks
              .filter((task: any) => task && task.id && task.kind)
              .map((task: any) => ({
                id: String(task.id),
                contest_id: String(task.contest_id ?? fetched.id),
                round_id: task.round_id ?? null,
                kind: String(task.kind || '').toUpperCase(),
                title: task.title ?? null,
                description: task.description ?? null,
                points:
                  typeof task.points === 'number'
                    ? task.points
                    : Number.isFinite(Number(task.points))
                    ? Number(task.points)
                    : null,
                time_limit_sec: task.time_limit_sec ?? null,
                metadata: task.metadata ?? null,
              }));
            tasksOk = true;
          }
        } catch {
          parsedTasks = [];
        }
        if (!cancelled) {
          setTasks(parsedTasks);
        }

        if (!cancelled) {
          setTrace({
            contestFetch: [{ ok: true, where: 'by-slug' }],
            winnersFetch: [{ ok: winnersOk, where: 'by-id' }],
            offersFetch: [{ ok: offersOk }],
            mediaFetch: [{ ok: mediaOk }],
            tasksFetch: [{ ok: tasksOk }],
          });
        }
      } catch (error: any) {
        if (!cancelled) {
          setContest(null);
          setWinners([]);
          setOtherOffers([]);
          setMediaItems([]);
          setTasks([]);
          setTrace({ error: error?.message || String(error) });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const rulesMarkdown = contest?.rules_json?.rules_markdown ?? '';
  const rulesHtml = useMemo(
    () => {
      const trimmed = rulesMarkdown.trim();
      return trimmed ? markdownToHtml(trimmed) : '';
    },
    [rulesMarkdown],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-sm">
          Loading...
        </div>
      </main>
    );
  }

  if (!contest) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Offer not found</div>
            <p className="mt-2 text-sm text-slate-600">
              We could not locate this offer. It may have been removed or is not yet published.
            </p>
            <a
              href="/offers"
              className="mt-4 inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-indigo-600 hover:border-indigo-300 hover:text-indigo-500"
            >
              Browse all offers
            </a>
          </div>
          {debug && (
            <pre className="overflow-auto rounded-3xl border border-slate-200 bg-white p-6 text-xs text-slate-600 shadow-sm">
              {JSON.stringify(trace, null, 2)}
            </pre>
          )}
        </div>
      </main>
    );
  }

  const startedAt = contest.starts_at ? new Date(contest.starts_at) : null;
  const endsAt = contest.ends_at ? new Date(contest.ends_at) : null;
  const timelineState = computeTimelineState(startedAt, endsAt, now);

  const isActiveStatus = contest.status === 'ACTIVE';
  const startedOK = !startedAt || startedAt.getTime() <= now;
  const notEnded = !endsAt || now <= endsAt.getTime();
  const canEnter = isActiveStatus && startedOK && notEnded;

  let disabledReason: string | null = null;
  if (!isActiveStatus) disabledReason = 'Offer is not active';
  else if (!startedOK) disabledReason = 'Offer has not started yet';
  else if (!notEnded) disabledReason = 'Offer has ended';

  const typeLabel = formatLabel(contest.type || 'Contest');
  const selectionLabel = formatLabel(contest.selection || '');
  const statusLabel = formatLabel(contest.status || '');
  const coverUrl = contest.rules_json?.cover_url || null;
  const avatarUrl =
    contest.rules_json?.avatar_url ||
    contest.rules_json?.icon_url ||
    '/img/placeholder-avatar.png';
  const organizerHref = contest.owner_service_id
    ? `/services/${contest.owner_service_id}`
    : contest.created_by_user_id
    ? `/profile/${contest.created_by_user_id}`
    : null;

  const entriesStats = contest.entries_stats || {};
  const prizes = Array.isArray(contest.prizes) ? contest.prizes : [];
  const mcqOptions = Array.isArray(contest.mcq_options) ? contest.mcq_options : [];

  const quickFacts: Array<{ label: string; value: string }> = [
    { label: 'Status', value: statusLabel || 'Not specified' },
    { label: 'Selection', value: selectionLabel || 'Not specified' },
  ];

  if (typeof contest.max_winners === 'number') {
    quickFacts.push({ label: 'Max winners', value: contest.max_winners.toLocaleString() });
  }
  if (contest.prize_summary) {
    quickFacts.push({ label: 'Prize summary', value: contest.prize_summary });
  }
  if (typeof entriesStats.total === 'number') {
    quickFacts.push({ label: 'Entries', value: entriesStats.total.toLocaleString() });
  }
  if (typeof entriesStats.correct === 'number') {
    quickFacts.push({ label: 'Correct answers', value: entriesStats.correct.toLocaleString() });
  }
  if (typeof entriesStats.pending === 'number') {
    quickFacts.push({ label: 'Pending review', value: entriesStats.pending.toLocaleString() });
  }
  if (typeof entriesStats.needs_review === 'number') {
    quickFacts.push({
      label: 'Needs review',
      value: entriesStats.needs_review.toLocaleString(),
    });
  }

  const timelineBadgeClass =
    timelineState.stage === 'active'
      ? 'bg-emerald-400 text-emerald-950'
      : timelineState.stage === 'upcoming'
      ? 'bg-amber-300 text-amber-900'
      : 'border border-white/40 bg-white/10 text-white';

  const entrySectionId = 'enter-offer';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
          {coverUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-slate-900/70" />
            </>
          )}
          <div className="relative z-10 flex flex-col gap-8 px-6 py-10 md:px-12 md:py-14">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium uppercase tracking-wide">
              <span className="rounded-full bg-white/10 px-3 py-1">{typeLabel}</span>
              <span className="rounded-full bg-white/10 px-3 py-1">{selectionLabel}</span>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${timelineBadgeClass}`}>
                {timelineState.chip}
              </span>
            </div>
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-4 md:max-w-2xl">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{contest.title}</h1>
                {contest.description && (
                  <p className="text-base text-slate-100/90 md:text-lg">{contest.description}</p>
                )}
                <div className="grid gap-4 text-sm sm:grid-cols-3">
                  <div className="rounded-2xl bg-black/30 px-4 py-3">
                    <div className="text-xs uppercase text-slate-200/70">Opens</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {formatDateLabel(startedAt)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-black/30 px-4 py-3">
                    <div className="text-xs uppercase text-slate-200/70">Closes</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {formatDateLabel(endsAt)}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-black/30 px-4 py-3">
                    <div className="text-xs uppercase text-slate-200/70">Timeline</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {timelineState.helper}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`#${entrySectionId}`}
                    className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Enter now
                  </a>
                  <div className="inline-flex items-center gap-3 text-sm text-slate-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    {canEnter ? 'Open for submissions' : disabledReason || 'Entries closed'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-4 rounded-2xl bg-black/30 px-4 py-4">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl || '/img/placeholder-avatar.png'}
                    alt="Organizer avatar"
                    className="h-14 w-14 rounded-full border border-white/40 object-cover"
                  />
                  <div>
                    <div className="text-xs uppercase text-slate-200/70">Hosted by</div>
                    {organizerHref ? (
                      <a
                        href={organizerHref}
                        className="text-sm font-medium text-white underline-offset-4 hover:underline"
                      >
                        View organizer profile
                      </a>
                    ) : (
                      <div className="text-sm font-medium text-white">Contest organizer</div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-200/80">
                  Share this link with friends to invite them to participate.
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Offer gallery</h2>
                  
                </div>
              </div>
              <OfferGallery
                media={mediaItems}
                emptyTitle="Gallery coming soon"
                emptySubtitle="Once the organizer shares visuals, they will appear here automatically."
              />
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">What to expect</h2>
              <p className="mt-3 text-sm text-slate-600">
                Participate in the challenge, follow the timeline, and keep an eye on your inbox for
                updates about judging and winners.
              </p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-slate-900">{statusLabel}</dd>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Selection method
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-slate-900">{selectionLabel}</dd>
                </div>
                {typeof contest.max_winners === 'number' && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Max winners
                    </dt>
                    <dd className="mt-2 text-sm font-medium text-slate-900">
                      {contest.max_winners.toLocaleString()}
                    </dd>
                  </div>
                )}                   
                 {contest.prize_summary && (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Prize summary
                    </dt>
                    <dd className="mt-2 text-sm text-slate-700">{contest.prize_summary}</dd>
                  </div>
                )}
              </dl>
            </section>

            {prizes.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Prize breakdown</h2>
                <ul className="mt-5 grid gap-4 md:grid-cols-2">
                  {prizes.map((prize, index) => (
                    <li
                      key={prize.id || `${prize.name || 'prize'}-${index}`}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="text-base font-semibold text-slate-900">
                        {prize.name || 'Prize'}
                      </div>
                      {prize.type && (
                        <div className="mt-1 text-sm text-slate-600">
                          Type: {formatLabel(prize.type)}
                        </div>
                      )}
                      {typeof prize.quantity === 'number' && (
                        <div className="text-sm text-slate-600">
                          Quantity: {prize.quantity.toLocaleString()}
                        </div>
                      )}
                      {typeof prize.amount === 'number' && prize.currency && (
                        <div className="text-sm text-slate-600">
                          Value: {prize.amount} {prize.currency}
                        </div>
                      )}
                      {prize.description && (
                        <p className="mt-2 text-sm text-slate-600">{prize.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            
            <MyEntries slug={slug} contestId={contest.id} currentUserId={currentUserId} />

     

            <section
              id={entrySectionId}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">Enter the offer</h2>
              <p className="mt-2 text-sm text-slate-600">
                Submit your entry while the offer is open. You can always review your submissions
                from the participant dashboard.
              </p>
              <div className="mt-5">
                {canEnter ? (
                  <EnterNow
                    contestId={contest.id}
                    contestType={contest.type}
                    mcqOptions={mcqOptions}
                    tasks={tasks}
                    disabled={false}
                    onSubmitted={() => {
                      // reserved for future enhancements such as refetching winners
                    }}
                  />
                ) : (
                  <EnterNow
                    contestId={contest.id}
                    contestType={contest.type}
                    mcqOptions={mcqOptions}
                    tasks={tasks}
                    disabled={true}
                    disabledReason={disabledReason || undefined}
                  />
                )}
              </div>
            </section>

            <OtherOffersSlider offers={otherOffers} currentSlug={slug} />
          </div>

          <aside className="space-y-6">
            <WinnersCard winners={winners} slug={slug} />
                   {rulesHtml ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Official rules</h2>
                <div
                  className="prose prose-slate mt-4 max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: rulesHtml }}
                />
              </section>
            ) : (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Official rules</h2>
                <p className="mt-3 text-sm text-slate-600">
                  The organizer has not provided detailed rules yet. Please check again soon or
                  contact the organizer for clarifications.
                </p>
              </section>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Quick facts</h3>
              <dl className="mt-4 space-y-3">
                {quickFacts.map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-3 text-sm">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div
              className={`rounded-3xl border px-6 py-4 text-sm shadow-sm ${
                canEnter
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {canEnter
                ? 'You can submit an entry right now. Make sure all details are accurate before sending.'
                : disabledReason || 'Entries are currently closed.'}
            </div>

            {debug && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Debug</h3>
                <pre className="mt-3 max-h-80 overflow-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                  {JSON.stringify(trace, null, 2)}
                </pre>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
