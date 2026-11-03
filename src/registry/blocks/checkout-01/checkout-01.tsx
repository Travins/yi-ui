"use client"
import * as React from "react"
import { Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { SegmentedControl } from "@/registry/ui/segmented-control/segmented-control"
import {
  IdNumberInput,
  isValidUscc,
} from "@/registry/ui/id-number-input/id-number-input"
import { toRmbUppercase } from "@/registry/lib/chinese-number"
import { CheckoutCompletion, CheckoutProgress } from "./completion"
import { cn } from "@/lib/utils"
import { DEFAULT_LABELS, money } from "./config"
import {
  CheckoutAddressForm,
  CheckoutAddressCard,
  CheckoutPaymentOptions,
  CheckoutTextField,
} from "./form-parts"
import type { Checkout01Props, CheckoutResult, Invoice } from "./types"

function Checkout01({
  addresses,
  defaultAddressId,
  regions,
  shippingOptions,
  items,
  discount = 0,
  paymentMethods,
  invoice: initialInvoice = { type: "none" },
  onAddressCreate,
  onSubmit,
  onViewOrder,
  onContinue,
  labels,
  className,
  ...props
}: Checkout01Props) {
  const t = { ...DEFAULT_LABELS, ...labels }
  const root = React.useRef<HTMLDivElement>(null)
  const [local, setLocal] = React.useState(addresses)
  const all = [
    ...addresses,
    ...local.filter((a) => !addresses.some((b) => b.id === a.id)),
  ]
  const [addressId, setAddressId] = React.useState(
    defaultAddressId ?? addresses[0]?.id ?? "",
  )
  const [shippingId, setShippingId] = React.useState(
    shippingOptions[0]?.id ?? "",
  )
  const [paymentId, setPaymentId] = React.useState(
    paymentMethods.find((m) => !m.disabled)?.id ?? "",
  )
  const [invoice, setInvoice] = React.useState<Invoice>(initialInvoice)
  const [narrow, setNarrow] = React.useState(false)
  React.useEffect(() => {
    const element = root.current
    if (!element) return
    const observer = new ResizeObserver(
      ([entry]) => entry && setNarrow(entry.contentRect.width < 768),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const [open, setOpen] = React.useState(false)
  const [adding, setAdding] = React.useState(false)
  const [attempt, setAttempt] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")
  const [resultTime, setResultTime] = React.useState("")
  const [result, setResult] = React.useState<CheckoutResult | null>(null)
  const address = all.find((a) => a.id === addressId)
  const shipping = shippingOptions.find((s) => s.id === shippingId)
  const subtotal =
    items.reduce(
      (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
      0,
    ) / 100
  const total = Math.max(
    0,
    Math.round((subtotal + (shipping?.fee ?? 0) - discount) * 100) / 100,
  )
  const invoiceInvalid =
    invoice.type === "company" &&
    (!invoice.title?.trim() || !isValidUscc(invoice.taxId ?? ""))
  async function submit() {
    if (pending) return
    setAttempt(true)
    setError("")
    const invalid =
      !shipping?.pickup && !address
        ? "address"
        : !shipping
          ? "shipping"
          : invoiceInvalid
            ? "invoice"
            : !paymentMethods.some((m) => m.id === paymentId && !m.disabled)
              ? "payment"
              : null
    if (invalid) {
      const node = root.current?.querySelector<HTMLElement>(
        '[data-module="' + invalid + '"]',
      )
      node?.scrollIntoView({ block: "center" })
      if (invalid === "invoice") {
        const field = node?.querySelector<HTMLElement>(
          invoice.title?.trim()
            ? "[data-invoice-tax] input"
            : "[data-invoice-title] input",
        )
        field?.focus()
      } else node?.querySelector<HTMLElement>("button, input")?.focus()
      return
    }
    setPending(true)
    try {
      setResultTime(
        new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()),
      )
      setResult(
        await onSubmit({
          address: shipping?.pickup ? undefined : address,
          shippingId,
          paymentId,
          invoice,
          items,
          total,
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed)
    } finally {
      setPending(false)
    }
  }
  const submitButton = (size: "default" | "lg", className?: string) => (
    <Button
      size={size}
      className={className}
      disabled={pending}
      onClick={submit}
    >
      {pending ? t.pending : t.submit}
    </Button>
  )
  if (result)
    return (
      <div
        data-slot="checkout-01"
        className={cn(
          "grid min-h-[42rem] place-items-center bg-muted/30 px-4 py-10",
          className,
        )}
        {...props}
      >
        <CheckoutCompletion
          orderId={result.orderId}
          total={total}
          payment={paymentMethods.find((m) => m.id === paymentId)?.label}
          labels={labels}
          items={
            result.timeline ?? [
              { title: t.created, time: resultTime, status: "done" },
              { title: t.processing, status: "upcoming" },
            ]
          }
          onViewOrder={() => onViewOrder?.(result.orderId)}
          onContinue={onContinue}
        />
      </div>
    )
  const section =
    "grid scroll-m-8 gap-4 border-b border-edge p-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div
      ref={root}
      data-slot="checkout-01"
      className={cn(
        "@container/checkout bg-background text-foreground",
        className,
      )}
      {...props}
    >
      <div className="grid pb-[calc(6rem+env(safe-area-inset-bottom))] @3xl/checkout:grid-cols-[1fr_22rem] @3xl/checkout:pb-0">
        <div className="min-w-0">
          <section data-module="address" tabIndex={-1} className={section}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {shipping?.pickup ? t.pickup : t.address}
              </h2>
              {!shipping?.pickup && (
                <Button
                  size="default"
                  variant="outline"
                  onClick={() => setOpen(true)}
                >
                  {t.change}
                </Button>
              )}
            </div>
            {shipping?.pickup ? (
              <p>{shipping.description}</p>
            ) : address ? (
              <CheckoutAddressCard address={address} />
            ) : (
              <p>{t.empty}</p>
            )}
            {attempt && !shipping?.pickup && !address && (
              <p role="alert" className="text-destructive">
                {t.invalid}
              </p>
            )}
          </section>
          <section data-module="shipping" tabIndex={-1} className={section}>
            <h2 className="font-semibold">{t.shipping}</h2>
            <RadioGroup
              aria-label={t.shipping}
              value={shippingId}
              onValueChange={(v) => setShippingId(String(v))}
            >
              {shippingOptions.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-edge p-4 has-checked:border-primary"
                >
                  <RadioGroupItem value={s.id} />
                  <span className="flex-1">
                    {s.label}
                    <small className="block text-muted-foreground">
                      {s.eta}
                    </small>
                  </span>
                  <span className="font-mono text-sm">
                    {s.fee ? money(s.fee) : t.free}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </section>
          <section data-module="invoice" tabIndex={-1} className={section}>
            <h2 className="flex justify-between font-semibold">
              {t.invoice}
              <small className="font-normal text-muted-foreground">
                {t.electronic}
              </small>
            </h2>
            <SegmentedControl
              aria-label={t.invoice}
              value={invoice.type}
              onValueChange={(type) =>
                setInvoice({
                  type: type as Invoice["type"],
                  title: type === "personal" ? t.personal : "",
                  taxId: "",
                })
              }
              options={[
                { value: "none", label: t.none },
                { value: "personal", label: t.personal },
                { value: "company", label: t.company },
              ]}
            />
            {invoice.type !== "none" && (
              <div data-invoice-title>
                <CheckoutTextField
                  label={t.title}
                  value={invoice.title ?? ""}
                  error={
                    attempt && !invoice.title?.trim()
                      ? t.titleRequired
                      : undefined
                  }
                  onChange={(e) =>
                    setInvoice({ ...invoice, title: e.target.value })
                  }
                />
              </div>
            )}
            {invoice.type === "company" && (
              <>
                <div data-invoice-tax>
                  <IdNumberInput
                    error={
                      attempt && !isValidUscc(invoice.taxId ?? "")
                        ? t.taxIdInvalid
                        : undefined
                    }
                    kind="uscc"
                    label={t.taxId}
                    value={invoice.taxId ?? ""}
                    onValueChange={(taxId) => setInvoice({ ...invoice, taxId })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t.taxHint}</p>
              </>
            )}
          </section>
          <section data-module="payment" tabIndex={-1} className={section}>
            <h2 className="font-semibold">{t.payment}</h2>
            <CheckoutPaymentOptions
              label={t.payment}
              methods={paymentMethods}
              value={paymentId}
              onValueChange={setPaymentId}
            />
          </section>
        </div>
        <aside className="min-w-0 border-edge @3xl/checkout:border-l">
          <div className="grid gap-5 p-6 @3xl/checkout:sticky @3xl/checkout:top-6">
            <h2 className="font-semibold">{t.summary}</h2>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-edge bg-muted">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- 图片地址由使用方提供，可能是任意外部域名，不走 next/image
                    <img
                      src={item.image}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Package className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p>{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.variant} × {item.quantity}
                  </p>
                </div>
                <span className="font-mono text-sm">
                  {money(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <Separator />
            {[
              [t.subtotal, subtotal],
              [t.freight, shipping?.fee ?? 0],
              [t.discount, -discount],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono">{money(Number(value))}</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-baseline justify-between">
              <span>{t.total}</span>
              <strong className="font-mono text-3xl">{money(total)}</strong>
            </div>
            <p className="text-xs text-muted-foreground">
              {toRmbUppercase(total)}
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="hidden @3xl/checkout:grid">
              {submitButton("lg")}
            </div>
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-edge bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] @3xl/checkout:hidden">
        <span>
          {t.total} <strong className="font-mono">{money(total)}</strong>
        </span>
        {submitButton("lg", "w-1/2")}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-narrow={narrow || undefined}
          className="flex max-h-[85dvh] min-w-0 flex-col overflow-hidden data-[narrow]:top-auto data-[narrow]:bottom-0 data-[narrow]:translate-y-0 data-[narrow]:rounded-b-none max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-b-none pointer-coarse:top-auto pointer-coarse:bottom-0 pointer-coarse:translate-y-0"
        >
          <DialogTitle className="shrink-0">{t.address}</DialogTitle>
          {all.length === 0 ? (
            <DialogDescription>{t.empty}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              {t.address}
            </DialogDescription>
          )}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
            {all.length > 0 && (
              <RadioGroup
                aria-label={t.address}
                value={addressId}
                onValueChange={(id) => {
                  setAddressId(String(id))
                  setOpen(false)
                }}
              >
                {all.map((address) => (
                  <label
                    key={address.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-edge p-4 has-checked:border-primary has-checked:bg-primary/5"
                  >
                    <RadioGroupItem
                      value={address.id}
                      className="mt-0.5"
                      onClick={() => {
                        setAddressId(address.id)
                        setOpen(false)
                      }}
                    />
                    <CheckoutAddressCard address={address} />
                  </label>
                ))}
              </RadioGroup>
            )}
            <Button
              size="default"
              variant="outline"
              className="my-4 w-full"
              aria-expanded={adding}
              onClick={() => setAdding(!adding)}
            >
              {t.add}
            </Button>
            {adding && (
              <CheckoutAddressForm
                regions={regions}
                labels={labels}
                onSave={async (addr) => {
                  const saved = (await onAddressCreate?.(addr)) ?? addr
                  setLocal([...all, saved])
                  setAddressId(saved.id)
                  setOpen(false)
                  setAdding(false)
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export { Checkout01, CheckoutProgress }
export type { Checkout01Props } from "./types"
