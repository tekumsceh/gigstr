import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SingleColumnLayout from '../components/layouts/SingleColumnLayout';

const FinanceTodoView = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTodo = async () => {
      try {
        const res = await fetch('/api/finance-todo', {
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error(`Failed to load TODOs (${res.status})`);
        }
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load TODOs');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTodo();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleItem = async (itemId, currentDone) => {
    setUpdatingId(itemId);
    setError('');
    try {
      const res = await fetch(`/api/finance-todo/item/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ done: !currentDone })
      });
      if (!res.ok) {
        throw new Error(`Failed to update item (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || 'Failed to update TODO item');
    } finally {
      setUpdatingId(null);
    }
  };

  const isGod = user?.role === 'GOD';

  return (
    <SingleColumnLayout title="Band Finance – Build TODO">
      {!isGod && (
        <div className="p-4 text-sm text-[var(--text-muted)]">
          You need GOD access to view the finance build checklist.
        </div>
      )}

      {isGod && (
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
          {loading && <div className="text-sm text-[var(--text-muted)]">Loading checklist...</div>}
          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-700/60 rounded px-3 py-2">
              {error}
            </div>
          )}

          {data && (
            <>
              <div className="text-xs text-[var(--text-muted)]">
                Last updated: {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '–'}
              </div>

              <div className="space-y-6">
                {data.phases?.map((phase) => (
                  <section
                    key={phase.id}
                    className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg shadow-sm"
                  >
                    <header className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                      <h2 className="font-semibold text-sm">{phase.title}</h2>
                      <span className="text-xs text-[var(--text-muted)]">
                        {phase.items?.filter((i) => i.done).length || 0}/
                        {phase.items?.length || 0} done
                      </span>
                    </header>
                    <ul className="px-4 py-3 space-y-2 text-sm">
                      {phase.items?.map((item) => (
                        <li key={item.id} className="flex items-start gap-2">
                          <label className="flex items-start gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="mt-[2px] h-4 w-4 accent-[var(--accent-primary)]"
                              checked={!!item.done}
                              disabled={updatingId === item.id}
                              onChange={() => toggleItem(item.id, !!item.done)}
                            />
                            <span className={item.done ? 'line-through text-[var(--text-muted)]' : ''}>
                              {item.label}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </SingleColumnLayout>
  );
};

export default FinanceTodoView;

