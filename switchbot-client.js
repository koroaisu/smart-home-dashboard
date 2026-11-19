export function createSwitchBotClient({ onChange, notify, fetcher = fetch, documentRef = document, disabled = false }) {
  const model = { phase: disabled ? 'demo' : 'loading', group: null, configured: false, busy: false };
  let disposed = false;
  let generation = 0;
  let refreshing = false;
  let timer;
  let sendTimer;
  let confirmTimer;
  const pending = new Map();
  const emit = () => { if (!disposed) onChange(model); };
  async function api(path, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetcher('/api/switchbot/' + path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
        signal: controller.signal, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'SwitchBotに接続できませんでした。');
      return data;
    } finally { clearTimeout(timeout); }
  }
  async function refresh() {
    if (disabled || disposed || documentRef.hidden || model.busy || refreshing) return;
    refreshing = true;
    const revision = generation;
    try {
      if (!model.configured) {
        const status = await api('status');
        model.configured = status.configured && status.bindings?.ceiling?.count > 0;
        if (!model.configured) { model.phase = 'unconfigured'; emit(); return; }
      }
      const data = await api('state');
      if (disposed || revision !== generation) return;
      model.group = data.devices?.ceiling || null;
      model.phase = model.group?.available === model.group?.count && model.group?.available > 0 ? 'ready' : 'error';
    } catch { if (revision === generation) model.phase = 'error'; }
    finally { refreshing = false; emit(); }
  }
  async function flush() {
    if (disposed || model.busy || !pending.size) return;
    model.busy = true; model.phase = 'sending'; emit();
    try {
      while (pending.size && !disposed) {
        const [action, value] = pending.entries().next().value;
        pending.delete(action);
        await api('commands', { device: 'ceiling', action, value });
      }
      model.phase = 'sent';
    } catch (error) {
      pending.clear(); model.phase = 'error'; notify(error.message);
    } finally {
      model.busy = false; emit();
      // API acceptance is not proof of physical completion. Read back after propagation.
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => { void refresh(); }, 2000);
    }
  }
  const resume = () => { if (!documentRef.hidden) void refresh(); };
  return {
    model,
    start() {
      if (disabled) return;
      documentRef.addEventListener('visibilitychange', resume);
      void refresh(); timer = setInterval(() => { void refresh(); }, 5 * 60 * 1000);
    },
    refresh,
    preview() { ++generation; },
    send(action, value) {
      if (disabled || disposed || !model.configured || !model.group?.available) { notify('天井照明の接続状態を確認してください。'); return; }
      ++generation;
      pending.set(action, value);
      clearTimeout(confirmTimer); clearTimeout(sendTimer);
      sendTimer = setTimeout(() => { void flush(); }, action === 'brightness' ? 400 : 0);
    },
    dispose() { disposed = true; ++generation; clearInterval(timer); clearTimeout(sendTimer); clearTimeout(confirmTimer); documentRef.removeEventListener('visibilitychange', resume); },
  };
}

export function switchBotStatus(model) {
  if (model.phase === 'loading') return '接続確認中';
  if (model.phase === 'unconfigured') return '未接続';
  if (model.phase === 'sending') return '送信中';
  if (model.phase === 'sent') return '送信済み・確認待ち';
  if (model.phase === 'error') return '状態未確認';
  if (model.group?.mixed) return '4灯の設定が混在';
  return 'SwitchBot';
}
