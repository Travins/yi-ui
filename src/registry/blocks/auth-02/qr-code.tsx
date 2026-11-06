import { encode } from "uqr"

/** 保留四模块静区，SVG 只使用主题色。 */
function Auth02QrCode({ value, label }: { value: string; label: string }) {
  const qr = encode(value, { border: 4, ecc: "M" })
  return (
    <svg
      data-slot="auth-02-qr-code"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      className="size-60 max-w-full"
      shapeRendering="crispEdges"
    >
      <rect width={qr.size} height={qr.size} className="fill-background dark:fill-foreground" />
      <path
        className="fill-foreground dark:fill-background"
        d={qr.data
          .flatMap((row, y) =>
            row.flatMap((cell, x) => (cell ? [`M${x},${y}h1v1h-1z`] : [])),
          )
          .join("")}
      />
    </svg>
  )
}
export { Auth02QrCode }
