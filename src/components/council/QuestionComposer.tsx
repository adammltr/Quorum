import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { otherSuggestions, randomSeed } from '@/lib/seed-questions'

interface QuestionComposerProps {
  onSubmit: (question: string) => void
  disabled?: boolean
  /** `hero` = grand champ centré (état initial) ; `bar` = compact (relance). */
  variant?: 'hero' | 'bar'
  autoFocus?: boolean
}

export function QuestionComposer({
  onSubmit,
  disabled = false,
  variant = 'hero',
  autoFocus = false,
}: QuestionComposerProps): ReactNode {
  // Pré-rempli au chargement (zéro écran vide) ; rotation à chaque visite.
  const [value, setValue] = useState<string>(() => (variant === 'hero' ? randomSeed() : ''))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    const q = value.trim()
    if (!q || disabled) return
    onSubmit(q)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  // Entrée = envoyer ; Maj+Entrée = nouvelle ligne.
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const isHero = variant === 'hero'
  const suggestions = isHero ? otherSuggestions(value) : []

  return (
    <div className="flex w-full flex-col gap-3">
      <form
        onSubmit={handleSubmit}
        className={cn(
          'glass-card flex w-full items-end gap-3 p-3',
          isHero ? 'rounded-2xl' : 'rounded-xl',
        )}
      >
        <label htmlFor="council-question" className="sr-only">
          Votre question à l’assemblée
        </label>
        <textarea
          id="council-question"
          ref={textareaRef}
          autoFocus={autoFocus}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={isHero ? 2 : 1}
          placeholder="Posez une question à l’assemblée…"
          className={cn(
            'min-h-0 flex-1 resize-none bg-transparent px-3 py-2 text-text placeholder:text-text-subtle focus:outline-none',
            isHero ? 'text-xl leading-snug' : 'text-base leading-normal',
          )}
        />
        <Button
          type="submit"
          size={isHero ? 'lg' : 'default'}
          disabled={disabled || value.trim().length === 0}
          className="shrink-0 self-stretch px-4"
        >
          <span className={isHero ? 'inline' : 'hidden sm:inline'}>Convoquer</span>
          <CornerDownLeft aria-hidden="true" />
        </Button>
      </form>

      {/* Suggestions : montrent en un coup d'œil les dilemmes où les modèles divergent */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="font-mono text-xs text-text-subtle">Ou explorez :</span>
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              disabled={disabled}
              onClick={() => {
                setValue(q)
                textareaRef.current?.focus()
              }}
              className="max-w-[15rem] truncate rounded-full border border-border px-3 py-1 text-left text-xs text-text-muted transition-colors hover:border-border-bright hover:text-text"
              title={q}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
