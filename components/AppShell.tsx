'use client';

import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  IconAudience,
  IconCampaign,
  IconHome,
  IconMenu,
  IconMoon,
  IconPanel,
  IconPeople,
  IconPlus,
  IconSearch,
  IconSun,
  IconTemplate,
} from './Icons';

const links = [
  { href: '/', label: 'Overview', icon: IconHome },
  { href: '/contacts', label: 'Contacts', icon: IconPeople },
  { href: '/audiences', label: 'Audiences', icon: IconAudience },
  { href: '/campaigns', label: 'Email Campaigns', icon: IconCampaign },
  { href: '/templates', label: 'Email Templates', icon: IconTemplate },
];

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark">J</div>
      {collapsed ? null : (
        <div>
          <h1>Jasmin Growth Engine</h1>
          <p>jasminshukla.com</p>
        </div>
      )}
    </div>
  );
}

function NavList({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="nav">
      {links.map((link) => {
        const active =
          link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            className={active ? 'active' : ''}
            onClick={onNavigate}
          >
            <Icon />
            {collapsed ? null : link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    const base =
      pathname.startsWith('/campaigns') && !pathname.startsWith('/campaigns/new')
        ? '/campaigns'
        : pathname.startsWith('/audiences')
          ? '/audiences'
          : '/contacts';
    router.push(q ? `${base}?q=${encodeURIComponent(q)}` : base);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="app-shell">
      <aside className={collapsed ? 'sidebar collapsed' : 'sidebar'}>
        <Logo collapsed={collapsed} />
        <NavList pathname={pathname} collapsed={collapsed} />
        <button
          className="collapse-btn"
          type="button"
          onClick={() => setCollapsed((value) => !value)}
        >
          <IconPanel />
          {collapsed ? null : 'Collapse'}
        </button>
      </aside>

      {mobileOpen ? (
        <div className="drawer-backdrop" onClick={() => setMobileOpen(false)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <Logo />
            <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-btn menu-btn"
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <IconMenu />
          </button>
          <form className="search" onSubmit={submitSearch}>
            <IconSearch />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search contacts, campaigns, audiences"
              aria-label="Search"
            />
          </form>
          <div className="top-actions">
            <details className="menu">
              <summary className="btn">
                <IconPlus />
                <span className="hide-sm">Create</span>
              </summary>
              <div className="menu-pop">
                <Link href="/campaigns/new">New campaign</Link>
                <Link href="/contacts?new=1">New contact</Link>
                <Link href="/audiences?new=1">New audience</Link>
                <Link href="/templates?new=1">New template</Link>
              </div>
            </details>
            <button
              className="icon-btn"
              type="button"
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggleTheme}
            >
              {dark ? <IconSun /> : <IconMoon />}
            </button>
            <button className="btn secondary" type="button" onClick={logout}>
              Log out
            </button>
            <span className="avatar" title="Jasmin Shukla" aria-label="Jasmin Shukla">
              JS
            </span>
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
