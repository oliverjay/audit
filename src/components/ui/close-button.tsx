interface CloseButtonProps {
  onClick: () => void;
  size?: number;
  className?: string;
}

export function CloseButton({ onClick, size = 20, className }: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={className ?? "cursor-pointer rounded-full p-1.5 text-white/20 transition-colors hover:text-white/60 hover:bg-white/5"}
    >
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 6l8 8M14 6l-8 8" />
      </svg>
    </button>
  );
}
