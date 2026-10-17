type Props = {
  title: string
  meta?: React.ReactNode
  /** Optional row under the title — e.g. the summary strip on the event page */
  children?: React.ReactNode
  width?: 'md' | 'lg' | 'xl'
}

const WIDTH = { md: 'max-w-3xl', lg: 'max-w-5xl', xl: 'max-w-6xl' }

/** Page header band (docs/design.md §4): white band under the navy bar, title + one-line meta. */
export default function PageHeader({ title, meta, children, width = 'xl' }: Props) {
  return (
    <div className="border-b border-line bg-band">
      <div className={`mx-auto ${WIDTH[width]} px-4 py-6 sm:py-8`}>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {meta && <div className="mt-1 text-sm text-muted sm:text-base">{meta}</div>}
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  )
}

/** Content container matching the band width */
export function PageBody({ width = 'xl', children }: { width?: 'md' | 'lg' | 'xl'; children: React.ReactNode }) {
  return <main className={`mx-auto ${WIDTH[width]} px-4 py-6 sm:py-8`}>{children}</main>
}
