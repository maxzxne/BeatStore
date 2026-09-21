import React, { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { Loader2 } from 'lucide-react';

const HtmlCodeEditor = ({ value, onChange, minHeight = 'min(62vh, 640px)' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-white/10 bg-black/50 text-sm text-white/40"
        style={{ minHeight }}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Загрузка редактора…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1e1e1e] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/5 transition focus-within:ring-[#22c55e]/45">
      <CodeMirror
        value={value}
        height={minHeight}
        theme={vscodeDark}
        extensions={[html()]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          autocompletion: true,
          bracketMatching: true,
          indentOnInput: true,
        }}
        onChange={onChange}
        className="text-[13px] leading-relaxed [&_.cm-editor]:outline-none [&_.cm-scroller]:font-mono"
      />
    </div>
  );
};

export default HtmlCodeEditor;
