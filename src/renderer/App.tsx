import { useEffect, useState } from 'react';

export default function App() {
  const [runtime, setRuntime] = useState<{
    electron?: string;
    chrome?: string;
    node?: string;
    isPortable?: boolean;
    dataPath?: string;
  } | null>(null);
  const [config, setConfig] = useState<{ version?: number } | null>(null);

  useEffect(() => {
    window.liteboxApi.getRuntimeInfo().then(setRuntime);
    window.liteboxApi.getConfig().then(setConfig);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans text-sm">
      <h1 className="text-2xl font-bold mb-6">LiteBox</h1>
      <div className="max-w-md space-y-3">
        <div>Electron: {runtime?.electron ?? 'loading…'}</div>
        <div>Chromium: {runtime?.chrome ?? 'loading…'}</div>
        <div>Node: {runtime?.node ?? 'loading…'}</div>
        <div>Portable: {String(runtime?.isPortable ?? false)}</div>
        <div>Data Path: {runtime?.dataPath ?? 'loading…'}</div>
        <div className="mt-6 text-xs text-gray-400">
          Config version: {config?.version ?? 'loading…'}
        </div>
      </div>
    </div>
  );
}