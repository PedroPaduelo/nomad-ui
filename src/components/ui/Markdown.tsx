import ReactMarkdown from 'react-markdown'

/**
 * Markdown renderer wrapped to use our design tokens.
 * `prose` ships its own gray palette; we override the heading/strong colors
 * inline so they pull from `--color-text-primary`. Body copy stays at the
 * default `prose` color which we also remap via `style` to the token.
 */
export function Markdown({ source, className }: { source: string; className?: string }) {
  return (
    <div className={'prose prose-sm max-w-none text-text-primary ' + (className ?? '')}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-text-primary">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-text-primary">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold text-text-primary">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-semibold text-text-primary">{children}</h6>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-text-accent underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ children, className: codeClassName }) => {
            const isBlock = (codeClassName ?? '').includes('language-')
            return isBlock ? (
              <code className={codeClassName}>{children}</code>
            ) : (
              <code className="rounded bg-surface-overlay px-1 py-0.5 text-sm text-text-primary">
                {children}
              </code>
            )
          },
          strong: ({ children }) => <strong className="text-text-primary">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-border-accent pl-3 italic text-text-secondary">
              {children}
            </blockquote>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
