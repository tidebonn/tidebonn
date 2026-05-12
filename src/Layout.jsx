import db from '@/api/client';

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';

import { Menu, X, Home, BookOpen, Info, Settings, Heart, Users, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import LoginDialog from '@/components/LoginDialog';

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userProgress?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (userProgress?.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
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

  const navItems = [
  { name: 'Bønner', page: 'Prayers', icon: BookOpen },
  { name: 'Om tidebønn', page: 'AboutPrayer', icon: Info },
  { name: 'Oppsett', page: 'Settings', icon: Settings },
  { name: 'Om appen', page: 'About', icon: Heart }];

  const adminItems = [
  { name: 'Admin', page: 'Admin', icon: Users }];

  const isAdmin = user?.role === 'admin';

  const NavLink = ({ item, mobile }) => {
    const isActive = location.pathname === createPageUrl(item.page);
    return (
      <Link
        to={createPageUrl(item.page)}
        onClick={() => mobile && setIsOpen(false)}
        className={isActive ? 'text-[#2C2C2A] dark:text-[#F4F0E9]' : 'text-[rgba(44,44,42,0.5)] dark:text-[rgba(244,240,233,0.55)]'}
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 500,
          fontSize: '0.65rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '0.625rem 1rem',
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
    <div className="min-h-screen bg-[#F4F0E9] dark:bg-[#2C2C2A] transition-colors duration-300">
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

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F4F0E9] dark:bg-[#2C2C2A]" style={{borderBottom: '0.5px solid #DECCB4'}}>
        <div className="max-w-4xl mx-auto px-4" style={{height: '3.25rem', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center'}}>
          {/* Logo */}
          <Link to={createPageUrl('Home')} className="text-[#2C2C2A] dark:text-[#F4F0E9]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.18em', textTransform: 'uppercase', textDecoration: 'none'}}>
            TIDEBØNN
          </Link>

          {/* Desktop Navigation - center */}
          <nav className="hidden md:flex items-center">
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
            {isAdmin && <>
              <div style={{width: '0.5px', height: '1rem', backgroundColor: 'rgba(244,240,233,0.25)', margin: '0 0.25rem'}} />
              {adminItems.map((item) =>
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
            </>}
          </nav>

          {/* Right: user icon + mobile menu */}
          <div className="flex items-center justify-end gap-1">
            {user ? (
              <button onClick={handleLogout} className="hidden md:flex items-center text-[rgba(44,44,42,0.45)] dark:text-[rgba(244,240,233,0.5)]" style={{background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem'}} title="Logg ut">
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="hidden md:flex text-[rgba(44,44,42,0.45)] dark:text-[rgba(244,240,233,0.55)]" style={{background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase'}}>
                Logg inn
              </button>
            )}

            {/* Mobile Menu — alltid synlig på mobil (også innlogget),
                logg-ut ligger inne i menyen så hamburgeren ikke
                forsvinner. Tidligere bug: color: #F4F0E9 gjorde
                ikonet usynlig på cream-bakgrunn i light mode. */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-[#2C2C2A] dark:text-[#F4F0E9]"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-[#F4F0E9] dark:bg-[#2C2C2A]" style={{border: 'none'}}>
                <div className="flex flex-col h-full pt-8">
                  <nav className="flex flex-col">
                    {navItems.map((item) => <NavLink key={item.page} item={item} mobile />)}
                    {isAdmin && <>
                      <div style={{height: '0.5px', backgroundColor: 'rgba(244,240,233,0.2)', margin: '0.75rem 0'}} />
                      {adminItems.map((item) => <NavLink key={item.page} item={item} mobile />)}
                    </>}
                  </nav>
                  <div className="mt-auto pb-8">
                    <div style={{height: '0.5px', backgroundColor: 'rgba(244,240,233,0.2)', marginBottom: '1rem'}} />
                    {user ?
                      <div>
                        <p style={{padding: '0 1rem 0.5rem', fontSize: '0.7rem', color: 'rgba(244,240,233,0.4)', fontFamily: "'Montserrat', sans-serif"}}>{user.display_name || user.full_name || user.email}</p>
                        <button onClick={handleLogout} style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(244,240,233,0.55)', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                          <LogOut className="w-4 h-4" /> Logg ut
                        </button>
                      </div> :
                      <button onClick={() => setLoginOpen(true)} style={{width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(244,240,233,0.55)', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
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

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#F4F0E9] dark:bg-[#2C2C2A] py-6" style={{borderTop: '0.5px solid #DECCB4'}}>
        <div className="max-w-4xl mx-auto px-4" style={{textAlign: 'center'}}>
          <p style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B6B9B3'}}>
            Tidebønn &nbsp;·&nbsp; © 2026 &nbsp;·&nbsp; Areopagos / Løys
          </p>
        </div>
      </footer>
      <Toaster />
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>);

}