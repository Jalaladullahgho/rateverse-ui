
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getContest,
  updateContest,
  upsertMcqOptions,
  listContestMedia,
  addMedia as addMediaApi,
  getOrganizerByContestId,
} from '@/lib/api_contests';
import Restrictions from '@/components/contests/admin/Restrictions';
import PrizesAwards from '@/components/contests/admin/PrizesAwards';
import Transparency from '@/components/contests/admin/Transparency';
import CodesManager from '@/components/contests/admin/CodesManager';

/* ================== Types ================== */
type Contest = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: 'RIDDLE' | 'QR_CODE' | 'LEADERBOARD' | 'TREASURE_HUNT' | 'UGC' | 'REFERRAL' | 'PREDICTION' | 'SURVEY' | string;
  selection: string;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  max_winners?: number | null;
  per_user_limit?: number | null;
  prize_summary?: string | null;
  visibility?: 'public' | 'private' | string;
  require_receipt?: boolean;
  branding_theme?: any;
  rules_json?: any;
  created_by_user_id?: string | null;
  owner_service_id?: string | null;
};

type MediaItem = { id?: string; url: string; kind?: string; created_at?: string };
type Organizer = {
  kind: 'SERVICE' | 'USER';
  id: string;
  name?: string | null;
  avatar?: string | null;
  website?: string | null;
  href?: string | null;
};

type JudgeRow = {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string;
  created_at?: string;
};

type Notice = { kind: 'success' | 'error'; text: string };

/* ================== Helpers ================== */
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


async function smartUploadToR2(file: File): Promise<{ url: string }> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload', { method: 'POST', body: fd });
    const j = await r.json().catch(() => null);
    if (r.ok && j) {
      if (j.ok && j.url) return { url: j.url };
      if (j.signedUrl && j.publicUrl) {
        const put = await fetch(j.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!put.ok) throw new Error('PUT failed');
        return { url: j.publicUrl };
      }
    }
  } catch (err) {
    console.error('Upload via /api/upload failed', err);
  }

  try {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/upload/multi', { method: 'POST', body: fd });
    const j = await r.json().catch(() => null);
    if (r.ok && j) {
      if (j.ok && j.url) return { url: j.url };
      if (j.ok && Array.isArray(j.urls) && j.urls[0]) return { url: j.urls[0] };
    }
  } catch (err) {
    console.error('Upload via /api/upload/multi failed', err);
  }

  throw new Error('Upload API not available');
}
function OrganizerCard({ organizer }: { organizer: Organizer | null }) {
  if (!organizer) return null;
  return (
    <div className="rv-section">
      <div className="flex items-center gap-3">
        <img
          src={organizer.avatar || '/img/placeholder-avatar.png'}
          alt="avatar"
          className="h-12 w-12 rounded-full object-cover border"
        />
        <div>
          <div className="text-sm text-slate-500 uppercase tracking-wide">Organizer</div>
          <div className="font-semibold">{organizer.name || (organizer.kind === 'SERVICE' ? 'Service' : 'User')}</div>
          <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
            {organizer.href && <a className="rv-link" href={organizer.href}>View profile</a>}
            {organizer.website && (
              <a className="rv-link" href={organizer.website} target="_blank" rel="noopener noreferrer">Website</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
/* ================== Page ================== */
export default function ManageOfferPage({ params }: any) {
  const { slug } = params as { slug: string };

  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [maxWinners, setMaxWinners] = useState<number | ''>('');
  const [perUserLimit, setPerUserLimit] = useState<number | ''>(1);
  const [prizeSummary, setPrizeSummary] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [requireReceipt, setRequireReceipt] = useState(false);
  const [rulesText, setRulesText] = useState('');
  const [showRulesPreview, setShowRulesPreview] = useState(false);

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'cover' | 'avatar' | 'gallery' | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [correct, setCorrect] = useState<0 | 1 | 2>(1);

  const [judges, setJudges] = useState<JudgeRow[]>([]);
  const [judgesLoading, setJudgesLoading] = useState(false);
  const [newJudgeId, setNewJudgeId] = useState('');

  const [organizer, setOrganizer] = useState<Organizer | null>(null);

  const isRiddle = useMemo(() => contest?.type === 'RIDDLE', [contest]);
  const isQR = useMemo(() => contest?.type === 'QR_CODE', [contest]);

  const [activeTab, setActiveTab] = useState<string>('overview');

  const pushNotice = (kind: Notice['kind'], text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getContest(slug);
        const c: Contest = data?.contest ?? data;
        if (!c?.id) throw new Error('Offer not found');
        setContest(c);

        setTitle(c.title || '');
        setDescription(c.description || '');
        if (c.starts_at) setStartsAt(new Date(c.starts_at).toISOString().slice(0, 16));
        if (c.ends_at) setEndsAt(new Date(c.ends_at).toISOString().slice(0, 16));
        setMaxWinners(typeof c.max_winners === 'number' ? c.max_winners : '');
        setPerUserLimit(typeof c.per_user_limit === 'number' ? c.per_user_limit : 1);
        setPrizeSummary(c.prize_summary || '');
        setVisibility((c.visibility as any) || 'public');
        setRequireReceipt(!!c.require_receipt);

        const rj = c.rules_json || {};
        setRulesText(rj.rules_markdown || '');

        if (c.type === 'RIDDLE') {
          const rr = rj.riddle || {};
          const arr: string[] = Array.isArray(rr.options) ? rr.options : [];
          setOptA(arr[0] || '');
          setOptB(arr[1] || '');
          setOptC(arr[2] || '');
          if (typeof rr.correct_index === 'number') setCorrect(Math.max(0, Math.min(2, rr.correct_index)));
        }

        const org = await getOrganizerByContestId(c.id).catch(() => null);
        setOrganizer(org?.organizer || null);
      } catch (err: any) {
        setContest(null);
        pushNotice('error', err?.message || 'Failed to load contest.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  useEffect(() => {
    if (!contest?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const data = await res.json();
        const uid: string | null = data?.user?.id ?? null;
        if (!cancelled) {
          setCurrentUserId(uid);
          const allowed = !!uid && !!contest.created_by_user_id && uid === contest.created_by_user_id;
          setIsOwner(allowed);
        }
      } catch {
        if (!cancelled) setIsOwner(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contest?.id, contest?.created_by_user_id]);

  useEffect(() => {
    if (!contest?.id) return;
    (async () => {
      const r = await listContestMedia(contest.id).catch(() => ({ items: [] }));
      setMediaItems(Array.isArray(r?.items) ? r.items : []);
    })();
  }, [contest?.id]);

  useEffect(() => {
    if (activeTab !== 'judges' || !contest?.id || !isOwner) return;
    void loadJudges();
  }, [activeTab, contest?.id, isOwner]);

  const tabs = useMemo(() => {
    const items: { key: string; label: string }[] = [
      { key: 'overview', label: 'Overview' },
      { key: 'basics', label: 'Basics' },
      { key: 'media', label: 'Media' },
    ];
    if (isRiddle) items.push({ key: 'riddle', label: 'RIDDLE' });
    if (isQR) items.push({ key: 'codes', label: 'Codes' });
    items.push({ key: 'judges', label: 'Judges' });
    items.push({ key: 'restrictions', label: 'Restrictions' });
    items.push({ key: 'prizes', label: 'Prizes' });
    items.push({ key: 'transparency', label: 'Transparency' });
    items.push({ key: 'rules', label: 'Rules' });
    items.push({ key: 'analytics', label: 'Analytics' });
    return items;
  }, [isRiddle, isQR]);

  async function loadJudges() {
    if (!contest?.id) return;
    setJudgesLoading(true);
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/referees`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load judges');
      const json = await res.json();
      setJudges(Array.isArray(json?.items) ? json.items : []);
    } catch (err: any) {
      pushNotice('error', err?.message || 'Failed to load judges.');
      setJudges([]);
    } finally {
      setJudgesLoading(false);
    }
  }

  function openUpload(target: 'cover' | 'avatar' | 'gallery') {
    if (!isOwner) return;
    setUploadTarget(target);
    setSelectedFile(null);
    setShowModal(true);
  }

  async function doUpload() {
    if (!selectedFile || !contest || !uploadTarget || !isOwner) return;
    setUploadBusy(true);
    try {
      const { url } = await smartUploadToR2(selectedFile);
      if (uploadTarget === 'cover') {
        const rj = { ...(contest.rules_json || {}), cover_url: url };
        const updated = await updateContest(contest.id, { rules_json: rj });
        setContest(updated?.contest || { ...contest, rules_json: rj });
        pushNotice('success', 'Cover updated.');
      } else if (uploadTarget === 'avatar') {
        const rj = { ...(contest.rules_json || {}), avatar_url: url };
        const updated = await updateContest(contest.id, { rules_json: rj });
        setContest(updated?.contest || { ...contest, rules_json: rj });
        pushNotice('success', 'Avatar updated.');
      } else {
        await addMediaApi(contest.id, [{ url, kind: 'image' }]);
        const r = await listContestMedia(contest.id).catch(() => ({ items: [] }));
        setMediaItems(Array.isArray(r?.items) ? r.items : []);
        pushNotice('success', 'Image uploaded.');
      }
    } catch (err: any) {
      pushNotice('error', err?.message || 'Upload failed.');
    } finally {
      setUploadBusy(false);
      setSelectedFile(null);
      setShowModal(false);
      setUploadTarget(null);
    }
  }

  async function saveBasics() {
    if (!contest?.id || !isOwner) return;
    const payload: any = {
      title,
      description,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      max_winners: maxWinners === '' ? null : Number(maxWinners),
      per_user_limit: perUserLimit === '' ? null : Number(perUserLimit),
      prize_summary: prizeSummary || null,
      visibility,
      require_receipt: !!requireReceipt,
    };
    const r = await updateContest(contest.id, payload);
    if (r?.error) {
      pushNotice('error', r.error);
      return;
    }
    setContest(r.contest || { ...contest, ...payload });
    pushNotice('success', 'Basics saved.');
  }

  async function saveRiddleOptions() {
    if (!contest?.id || !isOwner) return;
    const options = [optA, optB, optC].map((s) => String(s || '').trim());
    const r = await upsertMcqOptions(contest.id, options, correct);
    if (r?.error) {
      pushNotice('error', r.error);
    } else {
      pushNotice('success', 'RIDDLE options saved.');
    }
  }

  async function addJudge() {
    if (!contest?.id || !isOwner) return;
    if (!newJudgeId.trim()) {
      pushNotice('error', 'Enter a user ID to add a judge.');
      return;
    }
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/referees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: newJudgeId.trim(), role: 'JUDGE' }),
      });
      if (!res.ok) throw new Error('Failed to add judge');
      setNewJudgeId('');
      await loadJudges();
      pushNotice('success', 'Judge added.');
    } catch (err: any) {
      pushNotice('error', err?.message || 'Failed to add judge.');
    }
  }

  async function removeJudge(uid: string) {
    if (!contest?.id || !isOwner) return;
    try {
      const res = await fetch(`/api/owner/contests/${contest.id}/referees/${uid}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to remove judge');
      await loadJudges();
      pushNotice('success', 'Judge removed.');
    } catch (err: any) {
      pushNotice('error', err?.message || 'Failed to remove judge.');
    }
  }

  async function saveRules() {
    if (!contest?.id || !isOwner) return;
    const rj = { ...(contest.rules_json || {}), rules_markdown: rulesText || null };
    const resp = await updateContest(contest.id, { rules_json: rj });
    if (resp?.error) {
      pushNotice('error', resp.error);
      return;
    }
    setContest(resp.contest || { ...contest, rules_json: rj });
    pushNotice('success', 'Rules updated.');
  }

  const coverUrl = contest?.rules_json?.cover_url || '';
  const avatarUrl = contest?.rules_json?.avatar_url || contest?.rules_json?.icon_url || '/img/placeholder-avatar.png';

  if (loading) return <main className="p-6">Loading...</main>;
  if (!contest) return <main className="p-6">Offer not found.</main>;
  if (isOwner === null) return <main className="p-6">Checking access…</main>;
  if (!isOwner) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Access restricted</h1>
        <p className="text-slate-600">This manage page is only available to the contest owner.</p>
      </main>
    );
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'Not set';
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? value : dt.toLocaleString();
  };

  const statusLabel = (contest.status || 'Unknown').replace(/_/g, ' ');
  const visibilityLabel = contest.visibility === 'private' ? 'Private' : 'Public';
  const typeLabel = (contest.type || '—').replace(/_/g, ' ');
  const maxWinnersLabel =
    typeof contest.max_winners === 'number' ? contest.max_winners.toLocaleString() : 'Not set';
  const perUserLabel =
    typeof contest.per_user_limit === 'number' ? contest.per_user_limit.toLocaleString() : 'Unlimited';
  const startsAtLabel = formatDateTime(contest.starts_at);
  const endsAtLabel = formatDateTime(contest.ends_at);
  const descriptionPreview = contest.description?.trim() || '';
  return (
    <main className="space-y-8">
      <header className="space-y-4">
        <div
          className="relative h-40 md:h-56 w-full rounded-2xl overflow-hidden border bg-slate-100 cursor-pointer"
          onClick={() => openUpload('cover')}
        >
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="grid place-items-center h-full text-slate-400 text-sm">Click to add cover</div>
          )}
          <div className="absolute right-3 top-3 bg-black/60 text-white text-xs px-2 py-1 rounded">Change cover</div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => openUpload('avatar')}
              className="h-16 w-16 rounded-full overflow-hidden border bg-white"
              aria-label="Change avatar"
            >
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{contest.title}</h1>
              <p className="text-slate-600">Manage this contest’s content, media, judges, and more.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rv-btn" onClick={() => setActiveTab('basics')}>Go to basics</button>
            <a className="rv-btn" href={`/offers/${contest.slug}`}>View public page</a>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full border transition ${
                activeTab === tab.key
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {notice && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            notice.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <OrganizerCard organizer={organizer} />

          <section className="rv-section space-y-4">
            <h2 className="text-lg font-semibold">At a glance</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{statusLabel}</div>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Visibility</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{visibilityLabel}</div>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Contest type</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{typeLabel}</div>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Max winners</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{maxWinnersLabel}</div>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Per-user limit</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{perUserLabel}</div>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Starts</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{startsAtLabel}</div>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Ends</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{endsAtLabel}</div>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Slug</div>
                <div className="mt-2 text-lg font-semibold text-slate-900 break-all">{contest.slug}</div>
              </div>
            </div>
          </section>

          {descriptionPreview && (
            <section className="rv-section space-y-2">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="text-sm leading-relaxed text-slate-600">{descriptionPreview}</p>
            </section>
          )}
        </div>
      )}

      {activeTab === 'basics'} && (
        <section id="basics" className="rv-section space-y-4">
          <h2 className="text-lg font-semibold">Basics</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Title</div>
              <input className="w-full border rounded px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Visibility</div>
              <select className="w-full border rounded px-3 py-2" value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
          </div>

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Description</div>
            <textarea className="w-full border rounded px-3 py-2" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Starts at</div>
              <input type="datetime-local" className="w-full border rounded px-3 py-2" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </label>
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Ends at</div>
              <input type="datetime-local" className="w-full border rounded px-3 py-2" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Max winners</div>
              <input
                type="number"
                min={1}
                className="w-full border rounded px-3 py-2"
                value={maxWinners}
                onChange={(e) => setMaxWinners(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Per-user limit</div>
              <input
                type="number"
                min={1}
                className="w-full border rounded px-3 py-2"
                value={perUserLimit}
                onChange={(e) => setPerUserLimit(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </label>
            <label className="block">
              <div className="text-sm text-slate-600 mb-1">Require receipt</div>
              <div className="h-[42px] flex items-center">
                <input type="checkbox" checked={requireReceipt} onChange={(e) => setRequireReceipt(e.target.checked)} />
              </div>
            </label>
          </div>

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Prize summary</div>
            <input className="w-full border rounded px-3 py-2" value={prizeSummary} onChange={(e) => setPrizeSummary(e.target.value)} />
          </label>

          <div className="flex gap-3">
            <button onClick={saveBasics} className="rv-btn-primary">Save basics</button>
            <a href={`/offers/${contest.slug}`} className="rv-link">View offer</a>
          </div>
        </section>
      )}

      {activeTab === 'media' && (
        <section className="rv-section space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Gallery</h2>
            <button onClick={() => openUpload('gallery')} className="rv-btn">Add photo</button>
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2">
            <button onClick={() => openUpload('gallery')} className="min-w-[160px] grid place-items-center rounded-xl border border-dashed bg-white/40 text-slate-500">
              + Add
            </button>
            {mediaItems.map((it) => (
              <button key={it.id || it.url} onClick={() => openUpload('gallery')} className="min-w-[240px] snap-start rounded-xl overflow-hidden border bg-white/50 text-left">
                <img src={it.url} alt="Gallery image" loading="lazy" decoding="async" className="h-40 w-full object-cover" />
                <div className="p-2 text-xs text-slate-500">
                  {it.kind || 'image'}{it.created_at ? ` at ${new Date(it.created_at).toLocaleString()}` : ''}
                </div>
              </button>
            ))}
          </div>
          {mediaItems.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-white/60 p-4 text-sm text-slate-500">
              No gallery images yet. Upload media to create a richer showcase.
            </div>
          )}
        </section>
      )}

      {isRiddle && activeTab === 'riddle' && (
        <section className="rv-section space-y-4">
          <h2 className="text-lg font-semibold">RIDDLE options</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <input className="w-full border rounded px-3 py-2" placeholder="Option A" value={optA} onChange={(e) => setOptA(e.target.value)} />
            <input className="w-full border rounded px-3 py-2" placeholder="Option B" value={optB} onChange={(e) => setOptB(e.target.value)} />
            <input className="w-full border rounded px-3 py-2" placeholder="Option C" value={optC} onChange={(e) => setOptC(e.target.value)} />
          </div>
          <div className="flex gap-5 items-center mt-3 text-sm">
            <label className="inline-flex items-center gap-2"><input type="radio" checked={correct === 0} onChange={() => setCorrect(0)} /> Correct: A</label>
            <label className="inline-flex items-center gap-2"><input type="radio" checked={correct === 1} onChange={() => setCorrect(1)} /> Correct: B</label>
            <label className="inline-flex items-center gap-2"><input type="radio" checked={correct === 2} onChange={() => setCorrect(2)} /> Correct: C</label>
          </div>
          <button onClick={saveRiddleOptions} className="rv-btn-primary">Save RIDDLE options</button>
        </section>
      )}

      {isQR && activeTab === 'codes' && contest?.id && (
        <CodesManager contestId={contest.id} contestTitle={contest.title} />
      )}
      {activeTab === 'judges' && (
        <section className="rv-section space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-semibold">Judges</h2>
            <div className="flex gap-2">
              <input
                className="w-60 border rounded px-3 py-2"
                placeholder="Judge user ID (UUID)"
                value={newJudgeId}
                onChange={(e) => setNewJudgeId(e.target.value)}
              />
              <button className="rv-btn" onClick={addJudge}>Add judge</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Judges can review entries and help moderate winners.</p>
          {judgesLoading ? (
            <div className="text-sm text-slate-500">Loading judges…</div>
          ) : judges.length === 0 ? (
            <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500">No judges assigned yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {judges.map((j) => (
                <li key={j.user_id} className="flex items-center justify-between rounded-xl border bg-white p-3">
                  <div>
                    <div className="font-semibold">{j.full_name || j.email || j.user_id}</div>
                    <div className="text-xs text-slate-500">{j.email || j.user_id}</div>
                  </div>
                  <button className="rv-link" onClick={() => removeJudge(j.user_id)}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'restrictions' && (
        <Restrictions contestId={contest.id} />
      )}

      {activeTab === 'prizes' && (
        <PrizesAwards contestId={contest.id} />
      )}

      {activeTab === 'transparency' && (
        <Transparency contestId={contest.id} />
      )}

      {activeTab === 'rules' && (
        <section className="rv-section space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Rules & terms</h2>
            <button className="rv-link" onClick={() => setShowRulesPreview((prev) => !prev)}>
              {showRulesPreview ? 'Hide preview' : 'Show preview'}
            </button>
          </div>
          <p className="text-sm text-slate-600">
            Share the official rules, eligibility, and legal terms for this contest. Markdown is supported.
          </p>
          <textarea
            className="w-full border rounded px-3 py-2 min-h-[220px]"
            value={rulesText}
            onChange={(e) => setRulesText(e.target.value)}
            placeholder="## Contest rules\n- Requirement 1\n- Requirement 2"
          />
          {showRulesPreview && (
            <div className="prose max-w-none rounded-2xl border bg-white p-4" dangerouslySetInnerHTML={{ __html: markdownToHtml(rulesText) }} />
          )}
          <div className="flex gap-3">
            <button className="rv-btn-primary" onClick={saveRules}>Save rules</button>
            <button className="rv-btn" onClick={() => setRulesText(contest?.rules_json?.rules_markdown || '')}>Reset</button>
          </div>
        </section>
      )}

      {activeTab === 'analytics' && (
        <section className="rv-section space-y-4">
          <h2 className="text-lg font-semibold">Analytics</h2>
          <AnalyticsView contestId={contest.id} />
        </section>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 space-y-3">
            <div className="text-lg font-semibold">
              {uploadTarget === 'cover' ? 'Change cover' : uploadTarget === 'avatar' ? 'Change avatar' : 'Add photo'}
            </div>
            <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            <div className="flex gap-2 justify-end">
              <button className="rv-btn" onClick={() => { setShowModal(false); setSelectedFile(null); setUploadTarget(null); }} disabled={uploadBusy}>Cancel</button>
              <button className="rv-btn-primary" onClick={doUpload} disabled={!selectedFile || uploadBusy}>{uploadBusy ? 'Uploading…' : 'Upload'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}










