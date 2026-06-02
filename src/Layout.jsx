import db, { sb } from '@/api/client';

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';

import { Menu, X, Home, BookOpen, Info, Settings, Heart, Users, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import LoginDialog from '@/components/LoginDialog';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [contentPages, setContentPages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const location = useLocation();

  // Hent content_pages én gang så menynavn kan overstyres av admin.
  // Fall tilbake til hardkodede labels hvis menu_label/title mangler.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pages = await db.entities.ContentPage.list();
        if (mounted) setContentPages(pages || []);
      } catch (e) {
        // Tom liste er trygt — menyen bruker fallback-labels.
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    loadUser();

    // Lytt på auth-endringer så header (Logg inn/Logg ut + meny)
    // oppdateres umiddelbart etter passord-/magic-link-innlogging,
    // uten at brukeren må refreshe.
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        loadUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProgress(null);
      }
    });
    return () => data?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    // Standardvisning: light. Dark krever eksplisitt valg via
    // UserProgress.theme='dark'. Uinnloggede/nye brukere får alltid
    // light, uavhengig av OS-preferanse.
    if (userProgress?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userProgress?.theme]);

  const loadUser = async () => {
    try {
      const isAuth = await db.auth.isAuthenticated();
      if (isAuth) {
        const currentUser = await db.auth.me();
        setUser(currentUser);

        // Load user progress
        const progressList = await db.entities.UserProgress.filter({ user_id: currentUser.id });
        if (progressList.length > 0) {
          setUserProgress(progressList[0]);
        }
      }
    } catch (e) {
      console.log('Not logged in');
    }
  };

  const handleLogout = () => {
    db.auth.logout();
  };

  // Info-undermeny bygges dynamisk fra content_pages: tar med kun
  // sider med nav_visibility = 'menu', sorterer på order_index,
  // og lenker til den generiske /Side/<slug>-ruten.
  const infoChildren = contentPages
    .filter(p => (p.nav_visibility || 'menu') === 'menu')
    .slice()
    .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))
    .map(p => ({
      name: (p.menu_label?.trim()) || (p.title?.trim()) || p.slug,
      href: `/Side/${p.slug}`,
    }));

  // Hovedmeny. «Info» har sub-elementer (vises som innrykkede
  // underpunkter i mobilmenyen, og som ett menypunkt → /Info-
  // landingsside i desktop-headeren).
  const navItems = [
  { name: 'Bønner', page: 'Prayers', icon: BookOpen },
  { name: 'Info', page: 'Info', icon: Info, children: infoChildren },
  { name: 'Oppsett', page: 'Settings', icon: Settings }];

  const adminItems = [
  { name: 'Admin', page: 'Admin', icon: Users }];

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const NavLink = ({ item, mobile, indent = false }) => {
    // item.href = ferdig URL (brukt av dynamiske Info-children).
    // Ellers utledes URL fra item.page via createPageUrl.
    const target = item.href || createPageUrl(item.page);
    const isActive = location.pathname === target;
    return (
      <Link
        to={target}
        onClick={() => mobile && setIsOpen(false)}
        className={isActive ? 'text-[#2C2C2A] dark:text-[#F4F0E9]' : 'text-[rgba(44,44,42,0.5)] dark:text-[rgba(244,240,233,0.55)]'}
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 500,
          fontSize: indent ? '0.6rem' : '0.65rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: indent ? '0.45rem 1rem 0.45rem 2rem' : '0.625rem 1rem',
          textDecoration: 'none',
          display: 'block',
          transition: 'color 0.2s',
        }}
      >
        {item.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F0E9] dark:bg-[#2C2C2A] transition-colors duration-300">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Spectral:ital,wght@0,300;0,400;1,300;1,400&display=swap');
        body {
          font-family: 'Spectral', Georgia, serif;
          background-color: #F4F0E9;
          color: #2C2C2A;
        }
        .dark body {
          background-color: #2C2C2A;
          color: #F4F0E9;
        }
      `}</style>

      {/* Header — w-full + box-sizing eksplisitt så vi vet at den
          alltid dekker viewport-bredden. Tidligere oppførsel: hele
          header-elementet var smalere enn skjermen på mobil, så hit-
          areas så ut til å være kuttet til en tredjedel. */}
      <header className="sticky top-0 z-50 w-full bg-[#F4F0E9] dark:bg-[#2C2C2A]" style={{borderBottom: '0.5px solid #DECCB4', boxSizing: 'border-box'}}>
        <div className="relative max-w-4xl mx-auto px-4 flex items-center justify-between w-full" style={{height: '3.25rem', boxSizing: 'border-box'}}>
          {/* Logo — display:flex + height:100% gjør at hele
              headerhøyden (52px) er klikkbar, ikke bare bokstavenes
              ~14px. paddingRight gir også slingringsmonn til høyre
              for den ytre justify-between. */}
          <Link
            to={createPageUrl('Home')}
            className="text-[#2C2C2A] dark:text-[#F4F0E9]"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: '0.8rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              paddingRight: '1rem',
            }}
          >
            TIDEBØNN
          </Link>

          {/* Desktop Navigation — absolute-sentrert mellom logo og
              høyre-kolonne, så de tre hovedmenypunktene står midt i
              header uavhengig av sidekolonne-bredden. Admin-lenken
              ligger nå i høyre-gruppen sammen med logg-ut-ikonet. */}
          <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) =>
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={location.pathname === createPageUrl(item.page) ? 'text-[#2C2C2A] dark:text-[#F4F0E9]' : 'text-[rgba(44,44,42,0.45)] dark:text-[rgba(244,240,233,0.55)]'}
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                  fontSize: '0.58rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '0.375rem 0.6rem',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
              >
                {item.name}
              </Link>
            )}
          </nav>

          {/* Right side: Admin (hvis admin) + desktop login/logout
              + mobile hamburger. Med flex justify-between på parent
              kommer denne diven automatisk til høyre kant. */}
          <div className="flex items-center gap-1">
            {isAdmin && adminItems.map((item) =>
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`hidden md:flex ${location.pathname === createPageUrl(item.page) ? 'text-[#2C2C2A] dark:text-[#F4F0E9]' : 'text-[rgba(44,44,42,0.45)] dark:text-[rgba(244,240,233,0.55)]'}`}
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                  fontSize: '0.58rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '0.375rem 0.6rem',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
              >
                {item.name}
              </Link>
            )}
            {user ? (
              <button onClick={handleLogout} className="hidden md:flex items-center text-[rgba(44,44,42,0.45)] dark:text-[rgba(244,240,233,0.5)]" style={{background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem'}} title="Logg ut">
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="hidden md:flex text-[rgba(44,44,42,0.45)] dark:text-[rgba(244,240,233,0.55)]" style={{background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase'}}>
                Logg inn
              </button>
            )}

            {/* Mobile Menu — shadcn Button (ghost-variant) med
                korrekt tekstfarge så ikonet er synlig på cream-bg. */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-[#2C2C2A] dark:text-[#F4F0E9]"
                  aria-label="Åpne meny"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-[#F4F0E9] dark:bg-[#2C2C2A]" style={{border: 'none'}}>
                {/* Radix krever DialogTitle/Description for skjerm-
                    lesere — visuelt skjult med sr-only. */}
                <SheetTitle className="sr-only">Meny</SheetTitle>
                <SheetDescription className="sr-only">
                  Navigasjonsmeny med lenker til sidene i appen.
                </SheetDescription>
                <div className="flex flex-col h-full pt-8">
                  <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                    {navItems.map((item) => (
                      <React.Fragment key={item.page}>
                        <NavLink item={item} mobile />
                        {item.children && item.children.map((child) => (
                          <NavLink key={child.href || child.page} item={child} mobile indent />
                        ))}
                      </React.Fragment>
                    ))}
                    {isAdmin && <>
                      <div className="h-px my-3 bg-[#DECCB4] dark:bg-[rgba(244,240,233,0.2)]" />
                      {adminItems.map((item) => <NavLink key={item.page} item={item} mobile />)}
                    </>}
                  </nav>
                  <div className="flex-shrink-0" style={{paddingBottom: 'max(2rem, env(safe-area-inset-bottom))'}}>
                    <div className="h-px mb-4 bg-[#DECCB4] dark:bg-[rgba(244,240,233,0.2)]" />
                    {user ?
                      <div>
                        <p className="text-[#6A6A6A] dark:text-[rgba(244,240,233,0.4)]" style={{padding: '0 1rem 0.5rem', fontSize: '0.7rem', fontFamily: "'Montserrat', sans-serif"}}>{user.display_name || user.full_name || user.email}</p>
                        <button onClick={handleLogout} className="text-[#4A4A4A] dark:text-[rgba(244,240,233,0.55)]" style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                          <LogOut className="w-4 h-4" /> Logg ut
                        </button>
                      </div> :
                      <button onClick={() => { setLoginOpen(true); setIsOpen(false); }} className="text-[#4A4A4A] dark:text-[rgba(244,240,233,0.55)]" style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <User className="w-4 h-4" /> Logg inn
                      </button>
                    }
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content — flex-1 så footer alltid sitter nederst i
          viewporten. IKKE flex-container selv: da ville sider med
          max-w + mx-auto krympe til innholdsbredde (auto-margin på
          tvers-aksen) i stedet for å strekke til max-bredden. */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer — sticky bottom-0 så den alltid er synlig nederst i
          viewporten, også når innholdet er høyere enn skjermen.
          .app-footer-klassen lar oss skjule den i liggende mobil-
          modus via @media i index.css. */}
      <footer className="app-footer sticky bottom-0 z-40 bg-[#F4F0E9] dark:bg-[#2C2C2A] py-6" style={{borderTop: '0.5px solid #DECCB4'}}>
        <div className="max-w-4xl mx-auto px-4" style={{textAlign: 'center'}}>
          <p style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B6B9B3'}}>
            Tidebønn &nbsp;·&nbsp; © 2026 &nbsp;·&nbsp;{' '}
            <a href="https://areopagos.no" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-[#8a8d87] dark:hover:text-[#d8d4cc] transition-colors">Areopagos</a>
            {' / '}
            <a href="https://løys.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }} className="hover:text-[#8a8d87] dark:hover:text-[#d8d4cc] transition-colors">Løys</a>
          </p>
        </div>
      </footer>
      <Toaster />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>);

}