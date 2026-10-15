type OverallDigitsProps = {
  value: number
  className?: string
}

/** Generated streetball-style digit sprites for the home overall callout. */
export function OverallDigits({ value, className = '' }: OverallDigitsProps) {
  const safeValue = Math.max(0, Math.min(99, Math.round(value)))
  const digits = String(safeValue).padStart(2, '0').split('')

  return (
    <span className={`overall-digits ${className}`.trim()} aria-label={`总评 ${safeValue}`}>
      {digits.map((digit, index) => (
        <img
          key={`${digit}-${index}`}
          src={`/assets/home-v6/digits-v3-generated/digit-${digit}.png`}
          alt=""
          aria-hidden="true"
        />
      ))}
    </span>
  )
}
