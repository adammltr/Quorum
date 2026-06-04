import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CornerDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SEED_QUESTIONS, pickSuggestions } from '@/lib/seed-questions'

interface QuestionComposerProps {
  onSubmit: (question: string) => void
  disabled?: boolean
  /** `hero` = grand champ centré (état initial) ; `bar` = compact (relance). */
  variant?: 'hero' | 'bar'
  autoFocus?: boolean
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const TYPE_MS = 40 // vitesse d'écriture lettre par lettre
const ERASE_MS = 22 // effacement plus rapide
const HOLD_MS = 2600 // pause une fois la question écrite

export function QuestionComposer({
  onSubmit,
  disabled = false,
  variant = 'hero',
  autoFocus = false,
}: QuestionComposerProps): ReactNode {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [typed, setTyped] = useState('')
  // 3 suggestions tirées au hasard à l'ouverture, stables pour la session.
  const [suggestionPool] = useState(() => pickSuggestions(3))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isHero = variant === 'hero'
  // Le typewriter ne tourne qu'à l'état héros, champ vide, non focus, mouvement autorisé.
  const showTypewriter = isHero && !reduced && value === '' && !focused

  // Effet machine à écrire : les questions d'exemple s'écrivent puis s'effacent en boucle.
  useEffect(() => {
    if (!showTypewriter) return
    let cancelled = false

    void (async () => {
      setTyped('')
      let qi = Math.floor(Math.random() * SEED_QUESTIONS.length)
      while (!cancelled) {
        const q = SEED_QUESTIONS[qi % SEED_QUESTIONS.length] ?? ''
        for (let i = 1; i <= q.length && !cancelled; i++) {
          setTyped(q.slice(0, i))
          await sleep(TYPE_MS)
        }
        if (cancelled) break
        await sleep(HOLD_MS)
        for (let i = q.length; i >= 0 && !cancelled; i--) {
          setTyped(q.slice(0, i))
          await sleep(ERASE_MS)
        }
        qi++
      }
    })()

    return () => {
      cancelled = true
    }
  }, [showTypewriter])

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

  const suggestions = isHero ? suggestionPool : []
  const fieldText = isHero ? 'text-base leading-normal lg:text-lg' : 'text-base leading-normal'

  return (
    <div className="flex w-full flex-col gap-3">
      <form
        onSubmit={handleSubmit}
        className={cn(
          'glass-card flex w-full items-end gap-3 p-2.5',
          isHero ? 'rounded-2xl' : 'rounded-xl',
        )}
      >
        <label htmlFor="council-question" className="sr-only">
          {t('composer.label')}
        </label>
        <div className="relative flex-1 overflow-hidden">
          {/* Surimpression typewriter — purement visuelle, alignée sur le textarea. */}
          {showTypewriter && (
            <div
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute inset-0 flex items-start px-3 py-2 text-text-subtle',
                fieldText,
              )}
            >
              <span className="line-clamp-2 whitespace-pre-wrap">{typed}</span>
              <span className="ml-px animate-pulse text-gold">|</span>
            </div>
          )}
          <textarea
            id="council-question"
            ref={textareaRef}
            autoFocus={autoFocus}
            value={value}
            disabled={disabled}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={isHero ? 2 : 1}
            placeholder={showTypewriter ? '' : t('composer.placeholder')}
            className={cn(
              'min-h-0 w-full resize-none bg-transparent px-3 py-2 text-text placeholder:text-text-subtle focus:outline-none',
              fieldText,
            )}
          />
        </div>
        <Button
          type="submit"
          size={isHero ? 'lg' : 'default'}
          disabled={disabled || value.trim().length === 0}
          className="shrink-0 self-stretch px-5"
        >
          <span className={isHero ? 'inline' : 'hidden sm:inline'}>{t('composer.convene')}</span>
          <CornerDownLeft aria-hidden="true" />
        </Button>
      </form>

      {/* Suggestions : montrent en un coup d'œil les dilemmes où les modèles divergent */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 lg:flex-nowrap">
          <span className="font-mono text-xs text-text-subtle whitespace-nowrap">{t('composer.orExplore')}</span>
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              disabled={disabled}
              onClick={() => {
                setValue(q)
                textareaRef.current?.focus()
              }}
              className="max-w-[17rem] truncate rounded-full border border-border px-4 py-1.5 text-left text-sm text-text-muted transition-colors hover:border-border-bright hover:text-text"
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
