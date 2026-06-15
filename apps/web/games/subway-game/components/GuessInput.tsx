interface GuessInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error: boolean;
}

export function GuessInput({
  value,
  onChange,
  onSubmit,
  error,
}: GuessInputProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={`flex shrink-0 gap-2 border-t border-slate-800 bg-[#0a0e17] px-4 py-3 ${
        error ? 'shake' : ''
      }`}
    >
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter a station name"
        className={`flex-1 rounded-lg border bg-slate-900 px-4 py-3 text-base text-white placeholder-slate-500 outline-none ${
          error ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
        }`}
      />
      <button
        type="submit"
        className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-400"
      >
        Guess
      </button>
    </form>
  );
}
