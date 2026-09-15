import { Activity, Aperture, Cable, CircleHelp, Command, Eye, History, Menu, Search, Settings2, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Activity },
  { href: '/camera', label: 'Live camera', icon: Aperture },
  { href: '/events', label: 'Event history', icon: History },
  { href: '/search', label: 'Structured search', icon: Search },
];

const adminItems = [
  { href: '/connect', label: 'Connect MCP', icon: Cable },
  { href: '/settings', label: 'Settings', icon: Settings2 },
];

export function RealityShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => location === href;

  return (
    <div className="noise min-h-[100dvh] bg-background text-foreground">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" data-testid="link-mobile-brand" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Eye size={17} strokeWidth={2.5} /></span>
          <span className="font-mono text-sm font-medium tracking-tight">REALITY</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} data-testid="button-open-menu" className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted">
          <Menu size={19} />
        </button>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[246px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/dashboard" onClick={() => setOpen(false)} data-testid="link-brand" className="flex items-center gap-3">
            <span className="relative grid size-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Eye size={19} strokeWidth={2.5} />
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-accent" />
            </span>
            <span>
              <span className="block font-mono text-[13px] font-medium tracking-[.18em]">REALITY</span>
              <span className="mt-0.5 block text-[10px] uppercase tracking-[.22em] text-sidebar-foreground/50">physical state layer</span>
            </span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} data-testid="button-close-menu" className="grid size-8 place-items-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent md:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-3 py-6">
          <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-sidebar-foreground/40">Monitor</p>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition ${isActive(href) ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
                <Icon size={17} className={isActive(href) ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-primary'} />
                <span>{label}</span>
                {isActive(href) && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />}
              </Link>
            ))}
          </nav>

          <p className="mb-3 mt-9 px-3 font-mono text-[10px] uppercase tracking-[.2em] text-sidebar-foreground/40">Workspace</p>
          <nav className="space-y-1">
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition ${isActive(href) ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
                <Icon size={17} className={isActive(href) ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-primary'} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="size-1.5 animate-pulse-dot rounded-full bg-sidebar-primary" />
              <span>Site is observing</span>
            </div>
            <p className="mt-2 pl-3.5 font-mono text-[10px] leading-relaxed text-sidebar-foreground/45">Oakland / north bay<br />one camera · mock analysis</p>
          </div>
          <button type="button" onClick={() => window.alert('Support is available through your Reality operator workspace.')} data-testid="button-help" className="mt-4 flex items-center gap-2 px-2 text-[11px] text-sidebar-foreground/45 transition hover:text-sidebar-foreground">
            <CircleHelp size={14} /> Help &amp; documentation
          </button>
        </div>
      </aside>

      <main className="min-h-[100dvh] md:pl-[246px]">
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[.22em] text-primary" data-testid="text-page-eyebrow">{eyebrow}</p>
        <h1 className="text-2xl font-extrabold tracking-[-.04em] text-foreground sm:text-[30px]" data-testid="text-page-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-card-border bg-card shadow-sm ${className}`}>{children}</section>;
}

export function LoadingBlocks({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" data-testid="loading-state">{Array.from({ length: count }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>;
}

export function ErrorState({ onRetry, label = 'Reality could not be reached.' }: { onRetry?: () => void; label?: string }) {
  return <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-6" data-testid="error-state"><p className="font-semibold text-destructive">{label}</p><p className="mt-1 text-sm text-muted-foreground">Check the connection, then try again.</p>{onRetry && <button type="button" onClick={onRetry} data-testid="button-retry" className="mt-4 rounded-lg bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground">Retry</button>}</div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center" data-testid="empty-state"><Command className="mx-auto text-muted-foreground/40" size={26} /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{detail}</p></div>;
}