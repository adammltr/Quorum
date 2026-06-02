import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-16 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-base text-text shadow-xs transition-[color,box-shadow] outline-none',
        'placeholder:text-text-subtle',
        'focus-visible:border-border-bright focus-visible:ring-3 focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
