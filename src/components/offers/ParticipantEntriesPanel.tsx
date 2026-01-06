'use client';

import { useEffect, useMemo, useState } from 'react';

type EntryPreview = {
  id: string;
  entry_type?: string | null;
  task_id?: string | null;
  round_id?: string | null;
  answer_text?: string | null;
  mcq_option_label?: string | null;
  code_submitted?: string | null;
  asset_url?: string | null;
  evidence_image_url?: string | null;
  score?: number | null;
  elapsed_ms?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type ContestTask = {
  id: string;
  title?: string | null;
  description?: string | null;
  kind?: string | null;
  points?: number | null;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value?: string | null) {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

type ParticipantEntriesPanelProps = {
  slug: string;
  heading?: string;
  description?: string;
  className?: string;
};

export default function ParticipantEntriesPanel({
  slug,
  heading = 'My submissions',
  description = 'Entries update immediately after each submission. Click any card to view attachments.',
  className,
}: ParticipantEntriesPanelProps) {
  const [entries, setEntries] = useState<EntryPreview[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ContestTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchEntries = async () => {
      setEntriesLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/contests/by-slug/${encodeURIComponent(slug)}/entries?mine=1&limit=100`,
          {
            cache: 'no-store',
            credentials: 'include',
          },
        );
        if (!response.ok) {
          const json = await response.json().catch(() => ({}));
          throw new Error(json?.error || 'Unable to load entries.');
        }
        const json = await response.json();
        if (!cancelled) {
          const rows: EntryPreview[] = Array.isArray(json?.items) ? json.items : [];
          setEntries(rows);
        }
      } catch (err: any) {
        if (!cancelled) {
          setEntries([]);
          setError(err?.message || 'Unable to load entries.');
        }
      } finally {
        if (!cancelled) setEntriesLoading(false);
      }
    };

    void fetchEntries();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    const fetchTasks = async () => {
      setTasksLoading(true);
      try {
        const response = await fetch(
          `/api/public/contests/by-slug/${encodeURIComponent(slug)}/tasks`,
          {
            cache: 'no-store',
          },
        );
        if (!response.ok) {
          throw new Error('Unable to load tasks.');
        }
        const json = await response.json().catch(() => ({}));
        if (!cancelled) {
          const rows: ContestTask[] = Array.isArray(json?.items)
            ? json.items
                .filter((task: any) => task && task.id)
                .map((task: any) => ({
                  id: String(task.id),
                  title: task.title ?? null,
                  description: task.description ?? null,
                  kind: typeof task.kind === 'string' ? task.kind : null,
                  points:
                    typeof task.points === 'number'
                      ? task.points
                      : Number.isFinite(Number(task.points))
                      ? Number(task.points)
                      : null,
                }))
            : [];
          setTasks(rows);
        }
      } catch {
        if (!cancelled) {
          setTasks([]);
        }
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    };

    void fetchTasks();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const hasEntries = entries.length > 0;
  const hasTasks = tasks.length > 0;
  const showTasksSection = tasksLoading || hasTasks;
  const NO_TASK_KEY = '__no_task__';

  const entriesByTaskId = useMemo(() => {
    const map: Record<string, EntryPreview[]> = {};
    entries.forEach((entry) => {
      const key = entry.task_id ? String(entry.task_id) : NO_TASK_KEY;
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    });
    return map;
  }, [entries]);

  const unassignedEntries = entriesByTaskId[NO_TASK_KEY] ?? [];

  const renderEntryCards = (items: EntryPreview[], marginClass = 'mt-5') => (
    <div className={`${marginClass} grid gap-4`}>
      {items.map((entry) => (
        <article
          key={entry.id}
          className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900">
                {entry.answer_text?.trim() ||
                  entry.mcq_option_label?.trim() ||
                  entry.code_submitted?.trim() ||
                  (entry.asset_url || entry.evidence_image_url
                    ? 'Media entry attached'
                    : 'Entry submitted')}
              </div>
              <div className="text-xs text-slate-500">{formatDate(entry.created_at)}</div>
            </div>
            {entry.entry_type && (
              <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                {entry.entry_type.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {(entry.score != null || entry.elapsed_ms != null) && (
            <div className="mt-3 text-xs text-slate-600">
              {entry.score != null && (
                <span className="mr-3">
                  Score: <span className="font-medium">{entry.score}</span>
                </span>
              )}
              {entry.elapsed_ms != null && (
                <span>
                  Time: <span className="font-medium">{Math.round(entry.elapsed_ms / 1000)}s</span>
                </span>
              )}
            </div>
          )}

          {[entry.asset_url, entry.evidence_image_url]
            .filter((url): url is string => !!url)
            .map((url, idx) => (
              <a
                key={`${entry.id}-asset-${idx}`}
                href={url}
                className="mt-3 inline-flex items-center text-xs font-medium text-indigo-600 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                View attachment {idx + 1}
              </a>
            ))}
        </article>
      ))}
    </div>
  );

  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className ?? ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <div className="text-xs text-slate-500">
          {entriesLoading ? 'Loading...' : `Showing ${entries.length} record${entries.length === 1 ? '' : 's'}`}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {entriesLoading ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`loading-${idx}`}
              className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="h-3 w-36 rounded-full bg-slate-200" />
              <div className="mt-3 h-3 w-48 rounded-full bg-slate-200" />
              <div className="mt-3 h-3 w-32 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      ) : showTasksSection ? (
        <div className="mt-6 space-y-6">
          {tasksLoading && tasks.length === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={`task-placeholder-${idx}`}
                  className="animate-pulse rounded-3xl border border-slate-100 bg-slate-50/70 p-5"
                >
                  <div className="h-4 w-32 rounded-full bg-slate-200" />
                  <div className="mt-3 h-3 w-48 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          )}

          {tasks.map((task, index) => {
            const taskEntries = entriesByTaskId[String(task.id)] ?? [];
            return (
              <div
                key={task.id || `task-${index}`}
                className="rounded-3xl border border-slate-100 bg-slate-50/80 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {task.title || `Task ${index + 1}`}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      {(task.kind || 'Task').replace(/_/g, ' ')}
                      {typeof task.points === 'number' && (
                        <span className="ml-2 text-slate-500">{task.points} pts</span>
                      )}
                    </div>
                  </div>
                  {!entriesLoading && (
                    <span className="text-xs text-slate-500">
                      {taskEntries.length} submission{taskEntries.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="mt-3 text-sm text-slate-600">{task.description}</p>
                )}
                {taskEntries.length > 0 ? (
                  renderEntryCards(taskEntries, 'mt-4')
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
                    No submissions yet for this task.
                  </p>
                )}
              </div>
            );
          })}

          {unassignedEntries.length > 0 && (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Other submissions</div>
              <p className="text-xs text-slate-500">Entries not tied to a specific task.</p>
              {renderEntryCards(unassignedEntries, 'mt-4')}
            </div>
          )}

          {!hasEntries && !entriesLoading && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-600">
              You haven't submitted any entries yet. Head back to the offer page and send your first answer.
            </div>
          )}
        </div>
      ) : !hasEntries ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-600">
          You haven't submitted any entries yet. Head back to the offer page and send your first answer.
        </div>
      ) : (
        renderEntryCards(entries)
      )}

      {showTasksSection && (
        <div className="mt-8 space-y-4">
          {tasksLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={`task-loading-${idx}`}
                  className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="h-3 w-32 rounded-full bg-slate-200" />
                  <div className="mt-3 h-3 w-48 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {tasks.map((task, index) => (
                <li
                  key={task.id || `task-${index}`}
                  className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm"
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {task.title || `Task ${index + 1}`}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                    {(task.kind || 'Task').replace(/_/g, ' ')}
                    {typeof task.points === 'number' && (
                      <span className="ml-2 text-slate-500">{task.points} pts</span>
                    )}
                  </div>
                  {task.description && (
                    <p className="mt-2 text-sm text-slate-600">{task.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
