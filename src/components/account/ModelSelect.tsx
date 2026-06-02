import { type ReactNode } from 'react'
import { Select } from 'radix-ui'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { FREE_MODELS, PREMIUM_MODELS, modelLabel } from '@/lib/models-catalog'
import { cn } from '@/lib/utils'

interface ModelSelectProps {
  value: string
  onChange: (modelId: string) => void
  isPro: boolean
  label: string
}

const itemClass =
  'relative flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-8 pl-2.5 text-sm text-text outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40'

/** Sélecteur de modèle pour un slot d'assemblée. Premium verrouillé hors PRO. */
export function ModelSelect({ value, onChange, isPro, label }: ModelSelectProps): ReactNode {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        aria-label={label}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-text outline-none focus-visible:border-border-bright focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <Select.Value placeholder="Choisir un modèle…">{modelLabel(value)}</Select.Value>
        <Select.Icon>
          <ChevronDown aria-hidden="true" className="size-4 text-text-subtle" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface-raised p-1.5 shadow-2xl"
        >
          <Select.Viewport className="flex flex-col gap-0.5">
            <Select.Group>
              <Select.Label className="px-2.5 py-1 font-mono text-[0.64rem] tracking-wide text-text-subtle uppercase">
                Gratuits
              </Select.Label>
              {FREE_MODELS.map((m) => (
                <Select.Item key={m.id} value={m.id} className={itemClass}>
                  <Select.ItemText>{m.label}</Select.ItemText>
                  <span className="ml-auto font-mono text-[0.64rem] text-text-subtle">{m.vendor}</span>
                  <Select.ItemIndicator className="absolute right-2.5">
                    <Check aria-hidden="true" className="size-3.5 text-gold" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>

            <Select.Separator className="my-1 h-px bg-border" />

            <Select.Group>
              <Select.Label className="flex items-center gap-1.5 px-2.5 py-1 font-mono text-[0.64rem] tracking-wide text-text-subtle uppercase">
                Premium {!isPro && <Lock aria-hidden="true" className="size-3" />}
              </Select.Label>
              {PREMIUM_MODELS.map((m) => (
                <Select.Item
                  key={m.id}
                  value={m.id}
                  disabled={!isPro}
                  className={cn(itemClass)}
                >
                  <Select.ItemText>{m.label}</Select.ItemText>
                  <span className="ml-auto font-mono text-[0.64rem] text-text-subtle">{m.vendor}</span>
                  <Select.ItemIndicator className="absolute right-2.5">
                    <Check aria-hidden="true" className="size-3.5 text-gold" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
