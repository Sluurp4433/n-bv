// Neutral sköld-symbol (trygghet). Innehåller ingen identifierande text.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="N-BV">
      <path
        d="M20 3l13 4v10c0 8.5-5.4 15.3-13 17.8C12.4 32.3 7 25.5 7 17V7l13-4z"
        fill="#1f7a4d"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 20.5l4 4 8-8.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
