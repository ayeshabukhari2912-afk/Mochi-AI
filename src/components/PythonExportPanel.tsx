import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import type { PetProfile, PythonBundleFile } from '../types.ts';

interface PythonExportPanelProps {
  profile: PetProfile;
  onClose: () => void;
}

export const PythonExportPanel: React.FC<PythonExportPanelProps> = ({
  profile,
  onClose,
}) => {
  const [files, setFiles] = useState<PythonBundleFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const isNight = profile.studioTheme === 'night';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/export/python-bundle')
      .then((res) => res.json())
      .then((data: { files: PythonBundleFile[] }) => {
        if (cancelled) return;
        setFiles(data.files ?? []);
        if (data.files?.length > 0) {
          setSelectedPath(data.files[0].path);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const activeFile = files.find((f) => f.path === selectedPath) ?? files[0];

  const handleCopy = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleDownloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.path.split('/').pop() || 'mochi_file.py';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      className={`fixed top-16 right-4 bottom-24 z-20 w-[440px] max-w-[94vw] rounded-2xl border shadow-xl flex flex-col overflow-hidden ${
        isNight
          ? 'bg-[#161A24]/95 border-slate-800 text-slate-100'
          : 'bg-white/95 border-stone-200 text-stone-900'
      }`}
    >
      <div
        className={`flex items-center justify-between px-5 py-4 border-b ${
          isNight ? 'border-slate-800' : 'border-stone-200'
        }`}
      >
        <div>
          <h2 className="font-display text-base font-semibold">Windows Python Desktop Code</h2>
          <p className={`text-xs ${isNight ? 'text-slate-400' : 'text-stone-500'}`}>
            PySide6 + SQLite + GenAI starter seeded for {profile.name}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Python export"
          className={`p-1.5 rounded-lg transition-colors ${
            isNight ? 'text-slate-400 hover:bg-slate-800' : 'text-stone-500 hover:bg-stone-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
        {loading ? (
          <div className="text-xs py-8 text-center text-stone-500">Generating Python modules...</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {files.map((file) => {
                const label = file.path.replace('mochi_pet/', '');
                const active = file.path === activeFile?.path;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedPath(file.path)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                      active
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : isNight
                          ? 'bg-[#0F1219] border-slate-700 text-slate-300 hover:border-slate-500'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {activeFile && (
              <div
                className={`flex-1 flex flex-col rounded-xl border overflow-hidden ${
                  isNight ? 'bg-[#0D1017] border-slate-800' : 'bg-stone-950 border-stone-800 text-stone-100'
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-300">
                  <span className="truncate">{activeFile.path}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadFile}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
                <pre className="flex-1 overflow-auto studio-scroll p-3.5 text-xs font-mono leading-relaxed text-slate-200">
                  <code>{activeFile.content}</code>
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
