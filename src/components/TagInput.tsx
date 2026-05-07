import React from 'react';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  /** Suggestions sourced from the user's existing tags across all clients. */
  suggestions?: string[];
  placeholder?: string;
}

/** Chip-style tag input with autocomplete. Backspace on empty input removes the last chip.
 *  Enter or comma adds the current draft as a new tag (deduped, trimmed). Click a suggestion
 *  to add it. Suggestions hide tags already present on this profile. */
export default function TagInput({ value, onChange, suggestions = [], placeholder }: Props) {
  const [draft, setDraft] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some(t => t.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
    setDraft('');
  };

  const remove = (idx: number) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value.length - 1);
    }
  };

  const filteredSuggestions = React.useMemo(() => {
    const lower = draft.trim().toLowerCase();
    const present = new Set(value.map(t => t.toLowerCase()));
    return suggestions
      .filter(s => !present.has(s.toLowerCase()))
      .filter(s => lower === '' || s.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [draft, suggestions, value]);

  const showSuggestions = focused && filteredSuggestions.length > 0;

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          minHeight: 36, padding: '6px 8px',
          background: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          borderRadius: 8, cursor: 'text',
        }}
      >
        {value.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 700,
              padding: '3px 8px', borderRadius: 12,
              background: 'rgba(99,102,241,0.12)',
              color: '#a5b4fc',
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(idx); }}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#a5b4fc', padding: '0 2px', fontSize: 12, lineHeight: 1,
              }}
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => { setTimeout(() => setFocused(false), 120); /* allow suggestion click */ }}
          placeholder={value.length === 0 ? (placeholder ?? 'Add tag…') : ''}
          style={{
            flex: 1, minWidth: 80,
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--text-1)', padding: '2px 0',
          }}
        />
      </div>

      {showSuggestions && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          padding: 4, maxHeight: 200, overflowY: 'auto',
        }}>
          {filteredSuggestions.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(s); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '6px 10px', borderRadius: 5,
                fontSize: 13, color: 'var(--text-1)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--inset)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
