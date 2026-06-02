import db, { sb } from '@/api/client';

import React, { useState, useEffect } from 'react';

import {
  BarChart3, Users, BookOpen, FileEdit, Plus, Trash2, Save,
  Loader2, ChevronDown, ChevronRight, Shield, UserCog,
  Eye, EyeOff, RotateCcw, Search, CalendarDays, Clock, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PrayerEditor from '../components/admin/PrayerEditor';
import ClientErrorsCard from '../components/admin/ClientErrorsCard';
import { injectTitleH1 } from '../components/admin/prayerBlockUtils';
import ContentPageEditor from '../components/admin/ContentPageEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast as sonnerToast } from 'sonner';
import { motion } from 'framer-motion';

import { getAdminSeriesWeek } from '../components/prayer/PrayerSeriesCycleUtils';
import Statistics from '../components/admin/Statistics';
import PrayerContent from '../components/prayer/PrayerContent';
import SeriesStartDatePicker from '../components/admin/SeriesStartDatePicker';

const COLORS = ['#4A6B65', '#7A9690', '#3a5550', '#BD7B59', '#B6B9B3'];

export default function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('statistics');
  // Dark-mode for inline-styled aksent (tab-underline). Holdes synket
  // med .dark-klassen på <html>.
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark')),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  const tabAccent = isDark ? '#BD7B59' : '#4A6B65';

  // Data states
  const [prayerLogs, setPrayerLogs] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [prayerSeries, setPrayerSeries] = useState([]);
  const [contentPages, setContentPages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allUserProgress, setAllUserProgress] = useState([]);
  
  // Edit states
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [editingPage, setEditingPage] = useState(null);
  const [editingSeries, setEditingSeries] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState('all');
  const [collapsedSeries, setCollapsedSeries] = useState({});
  const [previewingPrayer, setPreviewingPrayer] = useState(null);
  const [selectedDeletedPrayers, setSelectedDeletedPrayers] = useState([]);
  const [selectedActivePrayers, setSelectedActivePrayers] = useState([]);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  // Ventende nyhetsbrev-eksport som må bekreftes som «behandlet»
  const [pendingNewsletterExport, setPendingNewsletterExport] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await db.auth.isAuthenticated();
      if (!isAuth) {
        db.auth.redirectToLogin();
        return;
      }

      const currentUser = await db.auth.me();
      setUser(currentUser);

      if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
        return;
      }

      // Load all data
      const [logs, prayerData, series, pages, users, userProgress, allProgress] = await Promise.all([
        db.entities.PrayerLog.list('-created_at', 5000),
        db.entities.Prayer.list(),
        db.entities.PrayerSeries.list(),
        db.entities.ContentPage.list(),
        db.entities.User.list(),
        db.entities.UserProgress.filter({ user_id: currentUser.id }),
        db.entities.UserProgress.list()
      ]);

      setPrayerLogs(logs);
      setPrayers(prayerData);
      setPrayerSeries(series);
      setContentPages(pages);
      setAllUsers(users);
      setAllUserProgress(allProgress);
      
      // Set series filter to user's selected series if available
      if (userProgress.length > 0 && userProgress[0].current_series_id) {
        setSelectedSeriesFilter(userProgress[0].current_series_id);
      }
    } catch (error) {
      console.error('Admin loadData feilet:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle prayer active status
  const handleTogglePrayerActive = async (prayer) => {
    try {
      await db.entities.Prayer.update(prayer.id, {
        is_active: !prayer.is_active
      });
      sonnerToast.success(prayer.is_active ? 'Bønn skjult' : 'Bønn aktivert');
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke oppdatere bønn');
    }
  };

  // Soft delete prayer
  const handleSoftDeletePrayer = async (prayer) => {
    if (!confirm(`Er du sikker på at du vil slette bønnen "${prayer.title}"? Den kan gjenopprettes innen 10 dager.`)) return;
    try {
      await db.entities.Prayer.update(prayer.id, {
        deleted_at: new Date().toISOString()
      });
      sonnerToast.success('Bønn slettet (kan gjenopprettes i 10 dager)');
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke slette bønn');
    }
  };

  // Restore prayer
  const handleRestorePrayer = async (prayerId) => {
    try {
      await db.entities.Prayer.update(prayerId, {
        deleted_at: null
      });
      sonnerToast.success('Bønn gjenopprettet');
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke gjenopprette bønn');
    }
  };

  // Permanent delete prayer
  const handlePermanentDeletePrayer = async (prayer) => {
    if (!confirm(`Er du helt sikker på at du vil slette "${prayer.title}" permanent? Dette kan IKKE angres!`)) return;
    try {
      await db.entities.Prayer.delete(prayer.id);
      sonnerToast.success('Bønn permanent slettet');
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke slette bønn');
    }
  };

  // Bulk delete selected prayers
  const handleBulkDeletePrayers = async () => {
    if (selectedDeletedPrayers.length === 0) return;
    if (!confirm(`Er du helt sikker på at du vil slette ${selectedDeletedPrayers.length} bønner permanent? Dette kan IKKE angres!`)) return;
    
    try {
      await Promise.all(
        selectedDeletedPrayers.map(id => db.entities.Prayer.delete(id))
      );
      sonnerToast.success(`${selectedDeletedPrayers.length} bønner permanent slettet`);
      setSelectedDeletedPrayers([]);
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke slette bønner');
    }
  };

  // Bulk restore selected prayers
  const handleBulkRestorePrayers = async () => {
    if (selectedDeletedPrayers.length === 0) return;
    try {
      await Promise.all(
        selectedDeletedPrayers.map(id => db.entities.Prayer.update(id, { deleted_at: null }))
      );
      sonnerToast.success(`${selectedDeletedPrayers.length} bønner gjenopprettet`);
      setSelectedDeletedPrayers([]);
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke gjenopprette bønner');
    }
  };

  // Bulk hide selected active prayers
  const handleBulkHidePrayers = async () => {
    if (selectedActivePrayers.length === 0) return;
    try {
      await Promise.all(
        selectedActivePrayers.map(id => db.entities.Prayer.update(id, { is_active: false }))
      );
      sonnerToast.success(`${selectedActivePrayers.length} bønner skjult`);
      setSelectedActivePrayers([]);
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke skjule bønner');
    }
  };

  // Bulk soft delete selected active prayers
  const handleBulkSoftDeletePrayers = async () => {
    if (selectedActivePrayers.length === 0) return;
    if (!confirm(`Er du sikker på at du vil slette ${selectedActivePrayers.length} bønner? De kan gjenopprettes innen 10 dager.`)) return;
    try {
      await Promise.all(
        selectedActivePrayers.map(id => db.entities.Prayer.update(id, { deleted_at: new Date().toISOString() }))
      );
      sonnerToast.success(`${selectedActivePrayers.length} bønner slettet`);
      setSelectedActivePrayers([]);
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke slette bønner');
    }
  };

  // Save prayer without closing the editor
  const handleSavePrayerSilent = async (prayerData) => {
    const target = prayerData || editingPrayer;
    if (!target?.id) return; // Only silent-save existing prayers
    try {
      const composed = {
        ...target,
        free_text_content: injectTitleH1(target.free_text_content, target.title),
      };
      await db.entities.Prayer.update(target.id, composed);
      sonnerToast.success('Bønn lagret');
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke lagre bønn');
    }
  };

  // Save prayer and close the editor
  const handleSavePrayer = async () => {
    setSaving(true);
    try {
      // Check for duplicate — only warn when creating a new prayer (no id yet)
      const existingPrayers = editingPrayer.id ? [] : prayers.filter(p => 
        p.series_id === editingPrayer.series_id &&
        p.day === editingPrayer.day &&
        p.time_of_day === editingPrayer.time_of_day &&
        !p.deleted_at
      );

      if (existingPrayers.length > 0) {
        const proceed = confirm(
          `Det finnes allerede en bønn for dag ${editingPrayer.day} ${editingPrayer.time_of_day} i denne serien.\n\nVil du fortsette og opprette en duplikat?`
        );
        if (!proceed) {
          setSaving(false);
          return;
        }
      }

      const composed = {
        ...editingPrayer,
        free_text_content: injectTitleH1(editingPrayer.free_text_content, editingPrayer.title),
      };
      if (editingPrayer.id) {
        await db.entities.Prayer.update(editingPrayer.id, composed);
      } else {
        await db.entities.Prayer.create(composed);
      }
      sonnerToast.success('Bønn lagret');
      setEditingPrayer(null);
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke lagre bønn');
    } finally {
      setSaving(false);
    }
  };

  // Toggle series active status
  const handleToggleSeriesActive = async (series) => {
    try {
      await db.entities.PrayerSeries.update(series.id, {
        is_active: !series.is_active
      });
      sonnerToast.success(series.is_active ? 'Serie skjult' : 'Serie aktivert');
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke oppdatere serie');
    }
  };

  // Soft delete series (superadmin only)
  const handleSoftDeleteSeries = async (series) => {
    if (!confirm(`Er du sikker på at du vil slette serien "${series.title}"? Den kan gjenopprettes innen 10 dager.`)) return;
    try {
      await db.entities.PrayerSeries.update(series.id, {
        deleted_at: new Date().toISOString()
      });
      sonnerToast.success('Serie slettet (kan gjenopprettes i 10 dager)');
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke slette serie');
    }
  };

  // Restore series (superadmin only)
  const handleRestoreSeries = async (seriesId) => {
    try {
      await db.entities.PrayerSeries.update(seriesId, {
        deleted_at: null
      });
      sonnerToast.success('Serie gjenopprettet');
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke gjenopprette serie');
    }
  };

  // Permanent delete series (superadmin only)
  const handlePermanentDeleteSeries = async (series) => {
    if (!confirm(`Er du helt sikker på at du vil slette "${series.title}" permanent? Dette kan IKKE angres!`)) return;
    try {
      await db.entities.PrayerSeries.delete(series.id);
      sonnerToast.success('Serie permanent slettet');
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke slette serie');
    }
  };

  // Save prayer series
  const handleSaveSeries = async () => {
    setSaving(true);
    try {
      if (editingSeries.id) {
        await db.entities.PrayerSeries.update(editingSeries.id, editingSeries);
      } else {
        await db.entities.PrayerSeries.create(editingSeries);
      }
      sonnerToast.success('Serie lagret');
      setEditingSeries(null);
      loadData();
    } catch (error) {
      sonnerToast.error('Kunne ikke lagre serie');
    } finally {
      setSaving(false);
    }
  };

  // Last ned nyhetsbrev-lista som CSV med to seksjoner:
  //   LEGG TIL  — påmeldte som ennå ikke er i maillista
  //   MELD AV   — som har meldt seg av, men fortsatt står i maillista
  // Etter nedlasting oppdateres «i maillista»-status, så samme person
  // ikke dukker opp igjen neste gang. Eksterne avmeldinger (via lenke i
  // mailene) håndteres av mailsystemet selv; app-avmeldinger fanges her.
  const handleExportNewsletter = async () => {
    try {
      const fmtDate = (d) => (d ? new Date(d).toLocaleString('nb-NO') : '');
      const map = (u) => ({
        id: u.id,
        email: u.email || '',
        name: u.display_name || u.full_name || '',
        optedIn: u.newsletter_opted_in_at || u.created_at || null,
        optedOut: u.newsletter_opted_out_at || null,
      });

      const addList = allUsers
        .filter((u) => u.wants_newsletter && !u.newsletter_in_mailing_list)
        .map(map)
        .sort((a, b) => new Date(a.optedIn || 0) - new Date(b.optedIn || 0));

      const removeList = allUsers
        .filter((u) => !u.wants_newsletter && u.newsletter_in_mailing_list)
        .map(map)
        .sort((a, b) => new Date(a.optedOut || 0) - new Date(b.optedOut || 0));

      // Allerede i maillista (informativt — ingen handling nødvendig)
      const alreadyList = allUsers
        .filter((u) => u.wants_newsletter && u.newsletter_in_mailing_list)
        .map(map)
        .sort((a, b) => new Date(a.optedIn || 0) - new Date(b.optedIn || 0));

      if (addList.length === 0 && removeList.length === 0 && alreadyList.length === 0) {
        sonnerToast.info('Ingen påmeldte ennå');
        return;
      }

      const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
      const lines = [];

      lines.push(`"═════ LEGG TIL i maillista (${addList.length}) ═════",,`);
      lines.push('E-post,Navn,Påmeldt');
      if (addList.length === 0) lines.push('"(ingen nye)",,');
      for (const s of addList) lines.push([esc(s.email), esc(s.name), esc(fmtDate(s.optedIn))].join(','));

      lines.push(',,');
      lines.push(`"═════ MELD AV fra maillista (${removeList.length}) ═════",,`);
      lines.push('E-post,Navn,Meldt av');
      if (removeList.length === 0) lines.push('"(ingen)",,');
      for (const s of removeList) lines.push([esc(s.email), esc(s.name), esc(fmtDate(s.optedOut))].join(','));

      lines.push(',,');
      lines.push(`"═════ TIDLIGERE LAGT TIL — allerede i maillista (${alreadyList.length}) ═════",,`);
      lines.push('E-post,Navn,Påmeldt');
      if (alreadyList.length === 0) lines.push('"(ingen)",,');
      for (const s of alreadyList) lines.push([esc(s.email), esc(s.name), esc(fmtDate(s.optedIn))].join(','));

      // BOM så Excel leser æøå riktig
      const csv = '﻿' + lines.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nyhetsbrev-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // VIKTIG: vi oppdaterer IKKE status her. Hvis fila lastes ned men
      // adressene aldri legges inn i mailsystemet, ville de ellers blitt
      // markert som «i lista» og forsvunnet fra senere eksporter. I
      // stedet ber vi om eksplisitt bekreftelse (se dialog) — først da
      // markeres de som behandlet.
      setPendingNewsletterExport({
        addIds: addList.map((s) => s.id),
        removeIds: removeList.map((s) => s.id),
        addCount: addList.length,
        removeCount: removeList.length,
      });
    } catch (error) {
      console.error('Nyhetsbrev-eksport feilet:', error);
      db.logError('newsletter_export', error);
      sonnerToast.error('Kunne ikke laste ned lista');
    }
  };

  // Bekreft at adressene faktisk er behandlet i mailsystemet — først da
  // oppdaterer vi «i maillista»-status så de ikke dukker opp igjen.
  const confirmNewsletterProcessed = async () => {
    const p = pendingNewsletterExport;
    if (!p) return;
    try {
      if (p.addIds.length > 0) {
        await sb.from('profiles').update({ newsletter_in_mailing_list: true }).in('id', p.addIds);
      }
      if (p.removeIds.length > 0) {
        await sb.from('profiles').update({ newsletter_in_mailing_list: false }).in('id', p.removeIds);
      }
      loadData();
      sonnerToast.success('Markert som behandlet');
    } catch (error) {
      console.error('Bekreft nyhetsbrev feilet:', error);
      db.logError('newsletter_confirm', error);
      sonnerToast.error('Kunne ikke oppdatere status');
    } finally {
      setPendingNewsletterExport(null);
    }
  };

  // Save content page
  const handleSavePage = async () => {
    setSaving(true);
    try {
      if (editingPage.id) {
        await db.entities.ContentPage.update(editingPage.id, {
          ...editingPage,
          last_edited_by: user.id
        });
      } else {
        await db.entities.ContentPage.create({
          ...editingPage,
          last_edited_by: user.id
        });
      }
      sonnerToast.success('Side lagret');
      setEditingPage(null);
      loadData();
    } catch (error) {
      // Vis faktisk feilmelding fra Supabase så vi kan se hva som
      // er galt (f.eks. manglende kolonne etter pending migration).
      const msg = error?.message || error?.error_description || String(error);
      // eslint-disable-next-line no-console
      console.error('handleSavePage error:', error);
      sonnerToast.error(`Kunne ikke lagre side: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // Eier-eksklusivt: oppdaterer rolle via Edge Function manage-user
  // som validerer caller-rolle og bruker service_role server-side.
  const handleUpdateUserRole = async (userId, newRole) => {
    const { error } = await db.users.setRole(userId, newRole);
    if (error) {
      sonnerToast.error(error.message || 'Kunne ikke oppdatere bruker');
      return;
    }
    sonnerToast.success('Brukerrolle oppdatert');
    loadData();
  };

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`Slette brukeren ${email ?? userId}? Alle bønne-logger og oppsett blir borte. Kan ikke angres.`)) return;
    const { error } = await db.users.deleteUser(userId);
    if (error) {
      sonnerToast.error(error.message || 'Kunne ikke slette bruker');
      return;
    }
    sonnerToast.success('Bruker slettet');
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#4A6B65] animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Shield className="w-16 h-16 text-[#4A6B65] mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-[#2C2C2A] dark:text-[#F4F0E9] mb-4">
          Ingen tilgang
        </h2>
        <p className="text-[#6A6A6A] dark:text-gray-400">
          Du har ikke tilgang til administrasjonspanelet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '2rem', marginBottom: '0.75rem'}}
              className="text-[#2C2C2A] dark:text-[#F4F0E9]"
            >
              Administrasjon
            </h1>
            <Badge style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase'}} className="border-0">
              {user.role === 'owner' ? 'Eier' : 'Administrator'}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-transparent p-0 h-auto" style={{borderBottom: '1px solid #DECCB4'}}>
            <TabsTrigger value="statistics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3] data-[state=active]:font-semibold" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'statistics' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
              <BarChart3 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Statistikk</span>
            </TabsTrigger>
            <TabsTrigger value="series" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'series' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
              <BookOpen className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Bønneserier</span>
            </TabsTrigger>
            <TabsTrigger value="prayers" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'prayers' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
              <FileEdit className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Bønner</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'content' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
              <FileEdit className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Innhold</span>
            </TabsTrigger>
            {user.role === 'owner' && (
              <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'users' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
                <Users className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Brukere</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <Statistics
              prayerLogs={prayerLogs}
              prayerSeries={prayerSeries}
              userProgressList={allUserProgress}
              totalUsers={allUsers.length}
            />
            <ClientErrorsCard />
          </TabsContent>

          {/* Prayer Series Tab */}
          <TabsContent value="series">
            <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9]">Bønneserier</CardTitle>
                <Button 
                  onClick={() => setEditingSeries({ 
                    title: '', 
                    description: '', 
                    sort_by: 'days',
                    total_days: 30,
                    total_weeks: 4,
                    series_start_date: '',
                    available_prayer_times: ['laudes', 'sekst', 'vesper', 'kompletorium'],
                    start_day: 'saturday',
                    start_time: 'laudes',
                    is_active: true
                  })}
                  className="bg-[#4A6B65] hover:bg-[#3a5550] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-[#F4F0E9]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ny serie
                </Button>
              </CardHeader>
              <CardContent>
                <Dialog open={!!editingSeries} onOpenChange={(open) => !open && setEditingSeries(null)}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingSeries?.id ? 'Rediger bønneserie' : 'Ny bønneserie'}
                      </DialogTitle>
                    </DialogHeader>
                    {editingSeries && (
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Tittel</Label>
                          <Input
                            value={editingSeries.title || ''}
                            onChange={(e) => setEditingSeries({...editingSeries, title: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Beskrivelse</Label>
                          <Textarea
                            rows={2}
                            value={editingSeries.description || ''}
                            onChange={(e) => setEditingSeries({...editingSeries, description: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Forfatter/utgiver</Label>
                            <Input
                              value={editingSeries.author || ''}
                              onChange={(e) => setEditingSeries({...editingSeries, author: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Utgivelsesår</Label>
                            <Input
                              type="number"
                              value={editingSeries.year || ''}
                              onChange={(e) => setEditingSeries({...editingSeries, year: parseInt(e.target.value)})}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Sorter etter</Label>
                            <Select 
                              value={editingSeries.sort_by || 'days'}
                              onValueChange={(v) => setEditingSeries({...editingSeries, sort_by: v})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="days">Dager</SelectItem>
                                <SelectItem value="weeks">Uker</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Aktiv serie</Label>
                            <Select 
                              value={editingSeries.is_active ? 'true' : 'false'}
                              onValueChange={(v) => setEditingSeries({...editingSeries, is_active: v === 'true'})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Ja</SelectItem>
                                <SelectItem value="false">Nei</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {editingSeries.sort_by === 'weeks' ? (
                            <div>
                              <Label>Antall uker i syklus</Label>
                              <Input
                                type="number"
                                min={1}
                                value={editingSeries.total_weeks || 4}
                                onChange={(e) => setEditingSeries({...editingSeries, total_weeks: parseInt(e.target.value)})}
                              />
                            </div>
                          ) : (
                            <div>
                              <Label>Antall dager i syklus</Label>
                              <Input
                                type="number"
                                min={1}
                                value={editingSeries.total_days || 30}
                                onChange={(e) => setEditingSeries({...editingSeries, total_days: parseInt(e.target.value)})}
                              />
                            </div>
                          )}
                          <div>
                            <Label>Startdato (dag/uke 1)</Label>
                            <SeriesStartDatePicker
                              value={editingSeries.series_start_date || ''}
                              startDay={editingSeries.start_day || 'saturday'}
                              onChange={(date) => setEditingSeries({...editingSeries, series_start_date: date})}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="mb-2 block">Bønnetider i denne serien</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: 'matutin', label: 'Matutin (Natt/tidlig morgen)' },
                              { value: 'laudes', label: 'Laudes (Morgenbønn)' },
                              { value: 'prim', label: 'Prim (Første time)' },
                              { value: 'ters', label: 'Ters (Tredje time)' },
                              { value: 'sekst', label: 'Middagsbønn' },
                              { value: 'non', label: 'Non (Niende time)' },
                              { value: 'vesper', label: 'Vesper (Aftensang)' },
                              { value: 'kompletorium', label: 'Kompletorium (Nattbønn)' }
                            ].map(time => (
                              <label key={time.value} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-[#F5F0EB] dark:hover:bg-[#3A3A3A]">
                                <input
                                  type="checkbox"
                                  checked={(editingSeries.available_prayer_times || []).includes(time.value)}
                                  onChange={(e) => {
                                    const times = editingSeries.available_prayer_times || [];
                                    if (e.target.checked) {
                                      setEditingSeries({...editingSeries, available_prayer_times: [...times, time.value]});
                                    } else {
                                      setEditingSeries({...editingSeries, available_prayer_times: times.filter(t => t !== time.value)});
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm">{time.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Uke 1 starter på ukedag</Label>
                            <Select 
                              value={editingSeries.start_day || 'saturday'}
                              onValueChange={(v) => setEditingSeries({...editingSeries, start_day: v})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monday">Mandag</SelectItem>
                                <SelectItem value="tuesday">Tirsdag</SelectItem>
                                <SelectItem value="wednesday">Onsdag</SelectItem>
                                <SelectItem value="thursday">Torsdag</SelectItem>
                                <SelectItem value="friday">Fredag</SelectItem>
                                <SelectItem value="saturday">Lørdag</SelectItem>
                                <SelectItem value="sunday">Søndag</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Uke 1 starter med</Label>
                            <Select 
                              value={editingSeries.start_time || 'laudes'}
                              onValueChange={(v) => setEditingSeries({...editingSeries, start_time: v})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="matutin">Matutin</SelectItem>
                                <SelectItem value="laudes">Laudes</SelectItem>
                                <SelectItem value="prim">Prim</SelectItem>
                                <SelectItem value="ters">Ters</SelectItem>
                                <SelectItem value="sekst">Middagsbønn</SelectItem>
                                <SelectItem value="non">Non</SelectItem>
                                <SelectItem value="vesper">Vesper</SelectItem>
                                <SelectItem value="kompletorium">Kompletorium</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditingSeries(null)}>
                            Avbryt
                          </Button>
                          <Button 
                            onClick={handleSaveSeries}
                            disabled={saving}
                            className="bg-[#4A6B65] hover:bg-[#3a5550] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-[#F4F0E9]"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Lagre
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <div className="space-y-4">
                  {prayerSeries
                    .filter(s => !s.deleted_at)
                    .map(series => (
                    <Card key={series.id} className="p-4 border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-[#2C2C2A] dark:text-[#F4F0E9]">{series.title}</h3>
                            {series.is_active ? (
                              <Badge className="border-0" style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase'}}>Aktiv</Badge>
                            ) : (
                              <Badge className="border-0" style={{backgroundColor: '#B6B9B3', color: '#2C2C2A', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase'}}>Skjult</Badge>
                            )}
                          </div>
                          <p className="text-sm text-[#6A6A6A] dark:text-gray-400 mb-2">{series.description}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6A6A6A] dark:text-gray-400">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {series.sort_by === 'weeks' ? `${series.total_weeks || 4} uker` : `${series.total_days} dager`}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {(series.available_prayer_times || []).length} bønnetider
                            </span>
                            {series.author && (
                              <span className="inline-flex items-center gap-1.5">
                                <UserCog className="w-3.5 h-3.5" />
                                {series.author}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleSeriesActive(series)}
                            title={series.is_active ? 'Skjul serie' : 'Aktiver serie'}
                          >
                            {series.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingSeries(series)}>
                            <FileEdit className="w-4 h-4" />
                          </Button>
                          {user.is_superadmin && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleSoftDeleteSeries(series)}
                              className="text-[#C8602A] hover:text-[#A04820]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {user.is_superadmin && prayerSeries.filter(s => s.deleted_at).length > 0 && (
                    <>
                      <div className="pt-4">
                        <h3 className="text-sm font-semibold text-[#6A6A6A] dark:text-gray-400 mb-3">
                          Slettede serier (vil bli permanent slettet)
                        </h3>
                      </div>
                      {prayerSeries
                        .filter(s => s.deleted_at)
                        .map(series => {
                          const deletedDate = new Date(series.deleted_at);
                          const permanentDeleteDate = new Date(deletedDate.getTime() + 10 * 24 * 60 * 60 * 1000);
                          const daysLeft = Math.ceil((permanentDeleteDate - new Date()) / (1000 * 60 * 60 * 24));
                          const shouldDelete = daysLeft <= 0;

                          if (shouldDelete) {
                            return null;
                          }

                          return (
                            <Card key={series.id} className="p-4 border-red-200 dark:border-red-900/30 bg-gray-50 dark:bg-gray-900/20">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 opacity-60">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-[#2C2C2A] dark:text-[#F4F0E9]">{series.title}</h3>
                                    <Badge variant="outline" className="text-red-600 border-red-300">
                                      Slettes om {daysLeft} {daysLeft === 1 ? 'dag' : 'dager'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-[#6A6A6A] dark:text-gray-400 mb-2">{series.description}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRestoreSeries(series.id)}
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Gjenopprett
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handlePermanentDeleteSeries(series)}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Slett nå
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prayers Tab */}
          <TabsContent value="prayers">
            <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9]">Bønner</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditingPrayer({
                      day: 1, 
                      time_of_day: 'laudes', 
                      lords_prayer: false, 
                      series_id: prayerSeries[0]?.id || '',
                      content_type: 'freetext',
                      free_text_content: ''
                    })}
                    className="bg-[#4A6B65] hover:bg-[#3a5550] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-[#F4F0E9]"
                    >
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Ny bønn</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Dialog open={!!editingPrayer} onOpenChange={(open) => { if (!open) { setEditingPrayer(null); setEditorFullscreen(false); } }}>
                  <DialogContent className={editorFullscreen ? "max-w-none w-screen h-screen m-0 rounded-none flex flex-col overflow-hidden" : "max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto"}>
                    <DialogHeader>
                      <DialogTitle>
                        {editingPrayer?.id ? 'Rediger bønn' : 'Ny bønn'}
                      </DialogTitle>
                    </DialogHeader>
                    {editingPrayer && (
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Bønneserie</Label>
                          <Select 
                            value={editingPrayer.series_id || ''}
                            onValueChange={(v) => setEditingPrayer({...editingPrayer, series_id: v})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Velg serie" />
                            </SelectTrigger>
                            <SelectContent>
                              {prayerSeries.map(series => (
                                <SelectItem key={series.id} value={series.id}>{series.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {(() => {
                          const sel = prayerSeries.find(s => s.id === editingPrayer.series_id);
                          const isWeek = sel?.sort_by === 'weeks';
                          const totalWeeks = sel?.total_weeks || 4;
                          const totalDays = sel?.total_days || 30;
                          const currentDay = editingPrayer.day || 1;
                          const currentWeek = Math.ceil(currentDay / 7);
                          const currentDow = ((currentDay - 1) % 7) + 1;
                          return isWeek ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Uke (1-{totalWeeks})</Label>
                                <Input type="number" min={1} max={totalWeeks} value={currentWeek}
                                  onChange={(e) => { const w = parseInt(e.target.value) || 1; setEditingPrayer({...editingPrayer, day: (w - 1) * 7 + currentDow}); }} />
                              </div>
                              <div>
                                <Label>Dag i uken (1-7)</Label>
                                <Input type="number" min={1} max={7} value={currentDow}
                                  onChange={(e) => { const d = parseInt(e.target.value) || 1; setEditingPrayer({...editingPrayer, day: (currentWeek - 1) * 7 + d}); }} />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Label>Dag (1-{totalDays})</Label>
                              <Input type="number" min={1} max={totalDays} value={currentDay}
                                onChange={(e) => setEditingPrayer({...editingPrayer, day: parseInt(e.target.value)})} />
                            </div>
                          );
                        })()}
                        <div className="grid grid-cols-2 gap-4">
                          <div style={{display:'none'}} />
                          <div>
                            <Label>Tidebønn</Label>
                            <Select 
                              value={editingPrayer.time_of_day}
                              onValueChange={(v) => setEditingPrayer({...editingPrayer, time_of_day: v})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="matutin">Matutin</SelectItem>
                                <SelectItem value="laudes">Laudes</SelectItem>
                                <SelectItem value="prim">Prim</SelectItem>
                                <SelectItem value="ters">Ters</SelectItem>
                                <SelectItem value="sekst">Middagsbønn</SelectItem>
                                <SelectItem value="non">Non</SelectItem>
                                <SelectItem value="vesper">Vesper</SelectItem>
                                <SelectItem value="kompletorium">Kompletorium</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Tittel</Label>
                          <Input
                            value={editingPrayer.title || ''}
                            onChange={(e) => setEditingPrayer({...editingPrayer, title: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label>Innholdstype</Label>
                          <p className="text-sm text-[#6A6A6A] dark:text-gray-400 mt-1">Fritekst (rikteksteditor)</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Bønneinnhold (rikteksteditor)</Label>
                          </div>
                          <PrayerEditor
                            value={editingPrayer.free_text_content || ''}
                            onChange={(content) => setEditingPrayer({...editingPrayer, free_text_content: content})}
                            onFullscreenChange={setEditorFullscreen}
                            onSave={handleSavePrayer}
                            onSaveQuiet={handleSavePrayerSilent}
                            onCancel={() => { setEditingPrayer(null); setEditorFullscreen(false); }}
                            prayer={editingPrayer}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditingPrayer(null)}>
                            Avbryt
                          </Button>
                          <Button 
                            onClick={handleSavePrayer}
                            disabled={saving}
                            className="bg-[#4A6B65] hover:bg-[#3a5550] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-[#F4F0E9]"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Lagre
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                
                {/* Bulk Actions for Active Prayers */}
                {selectedActivePrayers.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {selectedActivePrayers.length} valgt
                    </span>
                    <div className="flex gap-2 ml-auto">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleBulkHidePrayers}
                        className="text-gray-700 border-gray-300 hover:bg-gray-100"
                      >
                        <EyeOff className="w-3 h-3 mr-1" />
                        Skjul
                      </Button>
                      {user.is_superadmin && (
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={handleBulkSoftDeletePrayers}
                          className="text-[#C8602A] border-[#C8602A]/30 hover:bg-[#C8602A]/5"
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Slett
                        </Button>
                      )}
                      <Button 
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedActivePrayers([])}
                      >
                        Avbryt
                      </Button>
                    </div>
                  </div>
                )}

                {/* Active Prayers */}
                <div className="space-y-4">
                  {prayerSeries
                    .filter(s => !s.deleted_at && s.is_active)
                    .map(series => {
                      const seriesPrayers = prayers
                        .filter(p => p.series_id === series.id && !p.deleted_at)
                        .sort((a, b) => {
                          if (a.day !== b.day) return a.day - b.day;
                          const timeOrder = ['matutin', 'laudes', 'prim', 'ters', 'sekst', 'non', 'vesper', 'kompletorium'];
                          return timeOrder.indexOf(a.time_of_day) - timeOrder.indexOf(b.time_of_day);
                        });
                      
                      // Group by series-week (using series start_day/start_time for week-mode)
                      const weeks = {};
                      seriesPrayers.forEach(p => {
                        const weekNum = series.sort_by === 'weeks'
                          ? getAdminSeriesWeek(p, series).seriesWeek
                          : Math.ceil(p.day / 7);
                        if (!weeks[weekNum]) weeks[weekNum] = {};
                        if (!weeks[weekNum][p.day]) weeks[weekNum][p.day] = [];
                        weeks[weekNum][p.day].push(p);
                      });

                      return (
                        <Card key={series.id} className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
                          <CardHeader 
                            className="cursor-pointer hover:bg-[#F5F0EB] dark:hover:bg-[#2A2A2A] transition-colors"
                            onClick={() => setCollapsedSeries({...collapsedSeries, [series.id]: !collapsedSeries[series.id]})}
                          >
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg text-[#2C2C2A] dark:text-[#F4F0E9]">
                                {series.title}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{seriesPrayers.length} bønner</Badge>
                                {collapsedSeries[series.id] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </div>
                            </div>
                          </CardHeader>
                          {!collapsedSeries[series.id] && (
                            <CardContent>
                              {Object.keys(weeks).length === 0 && (
                                <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Ingen bønner lagt til ennå.</p>
                              )}
                              <Accordion type="multiple" className="space-y-2">
                                {Object.entries(weeks).map(([week, days]) => {
                                  const weekPrayers = Object.values(days).flat();
                                  const weekPrayerIds = weekPrayers.map(p => p.id);
                                  const allWeekSelected = weekPrayerIds.length > 0 && weekPrayerIds.every(id => selectedActivePrayers.includes(id));
                                  
                                  return (
                                  <AccordionItem key={week} value={`week-${week}`} className="border rounded-lg px-3">
                                    <AccordionTrigger className="hover:no-underline">
                                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={allWeekSelected}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            if (e.target.checked) {
                                              setSelectedActivePrayers([...new Set([...selectedActivePrayers, ...weekPrayerIds])]);
                                            } else {
                                              setSelectedActivePrayers(selectedActivePrayers.filter(id => !weekPrayerIds.includes(id)));
                                            }
                                          }}
                                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                                        />
                                        <span className="font-semibold">Uke {week}</span>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <Accordion type="multiple" className="space-y-1">
                                        {Object.entries(days).map(([day, dayPrayers]) => (
                                          <AccordionItem key={day} value={`day-${day}`} className="border-none">
                                            <AccordionTrigger className="hover:no-underline py-2 text-sm">
                                              <span>Dag {day}</span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="space-y-0.5 pl-2">
                                                {dayPrayers.map(prayer => (
                                                  <div key={prayer.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-[#F5F0EB] dark:hover:bg-[#2A2A2A] rounded">
                                                      <div className="flex items-center gap-2 flex-1">
                                                      <input
                                                        type="checkbox"
                                                        checked={selectedActivePrayers.includes(prayer.id)}
                                                        onChange={(e) => {
                                                          if (e.target.checked) {
                                                            setSelectedActivePrayers([...selectedActivePrayers, prayer.id]);
                                                          } else {
                                                            setSelectedActivePrayers(selectedActivePrayers.filter(id => id !== prayer.id));
                                                          }
                                                        }}
                                                        className="w-4 h-4 rounded border-gray-300"
                                                      />
                                                      <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-xs font-medium uppercase text-[#4A6B65] dark:text-[#BD7B59] shrink-0">
                                                            <span className="sm:hidden">{({'matutin':'Mat','laudes':'Lau','prim':'Pri','ters':'Ter','sekst':'Mid','non':'Non','vesper':'Ves','kompletorium':'Kpl'})[prayer.time_of_day] || prayer.time_of_day}</span>
                                                            <span className="hidden sm:inline capitalize">{({sekst:'Middagsbønn'})[prayer.time_of_day] || prayer.time_of_day}</span>
                                                          </span>
                                                          <span className="text-sm text-[#2C2C2A] dark:text-[#F4F0E9]">{prayer.title}</span>
                                                          {prayer.is_active === false && (
                                                            <Badge className="border-0 text-xs" style={{backgroundColor: '#B6B9B3', color: '#2C2C2A', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.55rem', letterSpacing: '0.06em', textTransform: 'uppercase'}}>Skjult</Badge>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                      <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setPreviewingPrayer(prayer)}
                                                        title="Forhåndsvisning"
                                                      >
                                                        <Search className="w-4 h-4" />
                                                      </Button>
                                                      <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleTogglePrayerActive(prayer)}
                                                        title={prayer.is_active === false ? 'Aktiver bønn' : 'Skjul bønn'}
                                                      >
                                                        {prayer.is_active === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                      </Button>
                                                      <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setEditingPrayer(prayer)}
                                                      >
                                                        <FileEdit className="w-4 h-4" />
                                                      </Button>
                                                      {user.is_superadmin && (
                                                        <Button 
                                                          variant="ghost" 
                                                          size="icon"
                                                          className="h-8 w-8 text-[#C8602A] hover:text-[#A04820]"
                                                                                           onClick={() => handleSoftDeletePrayer(prayer)}
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        ))}
                                      </Accordion>
                                    </AccordionContent>
                                  </AccordionItem>
                                  );
                                })}
                              </Accordion>
                            </CardContent>
                          )}
                        </Card>
                      );
                    })}
                </div>

                {/* Hidden Series Prayers */}
                {prayerSeries.filter(s => !s.deleted_at && !s.is_active).length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-[#6A6A6A] dark:text-gray-400 mb-3 flex items-center gap-2">
                      <EyeOff className="w-4 h-4" />
                      Skjulte bønneserier
                    </h3>
                    <div className="space-y-4">
                      {prayerSeries
                        .filter(s => !s.deleted_at && !s.is_active)
                        .map(series => {
                          const seriesPrayers = prayers
                            .filter(p => p.series_id === series.id && !p.deleted_at)
                            .sort((a, b) => {
                              if (a.day !== b.day) return a.day - b.day;
                              const timeOrder = ['matutin', 'laudes', 'prim', 'ters', 'sekst', 'non', 'vesper', 'kompletorium'];
                              return timeOrder.indexOf(a.time_of_day) - timeOrder.indexOf(b.time_of_day);
                            });

                          const weeks = {};
                          seriesPrayers.forEach(p => {
                            const weekNum = series.sort_by === 'weeks'
                              ? getAdminSeriesWeek(p, series).seriesWeek
                              : Math.ceil(p.day / 7);
                            if (!weeks[weekNum]) weeks[weekNum] = {};
                            if (!weeks[weekNum][p.day]) weeks[weekNum][p.day] = [];
                            weeks[weekNum][p.day].push(p);
                          });

                          return (
                            <Card key={series.id} className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] opacity-80">
                              <CardHeader
                                className="cursor-pointer hover:bg-[#F5F0EB] dark:hover:bg-[#2A2A2A] transition-colors"
                                onClick={() => setCollapsedSeries({...collapsedSeries, [`hidden-${series.id}`]: !collapsedSeries[`hidden-${series.id}`]})}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <CardTitle className="text-lg text-[#2C2C2A] dark:text-[#F4F0E9]">{series.title}</CardTitle>
                                    <Badge variant="outline" className="text-[#6A6A6A]">Skjult</Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{seriesPrayers.length} bønner</Badge>
                                    {collapsedSeries[`hidden-${series.id}`] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                  </div>
                                </div>
                              </CardHeader>
                              {!collapsedSeries[`hidden-${series.id}`] && (
                                <CardContent>
                                  <Accordion type="multiple" className="space-y-2">
                                    {Object.entries(weeks).map(([week, days]) => {
                                      const weekPrayers = Object.values(days).flat();
                                      const weekPrayerIds = weekPrayers.map(p => p.id);
                                      const allWeekSelected = weekPrayerIds.length > 0 && weekPrayerIds.every(id => selectedActivePrayers.includes(id));
                                      return (
                                        <AccordionItem key={week} value={`hidden-week-${week}`} className="border rounded-lg px-3">
                                          <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                              <input
                                                type="checkbox"
                                                checked={allWeekSelected}
                                                onChange={(e) => {
                                                  e.stopPropagation();
                                                  if (e.target.checked) {
                                                    setSelectedActivePrayers([...new Set([...selectedActivePrayers, ...weekPrayerIds])]);
                                                  } else {
                                                    setSelectedActivePrayers(selectedActivePrayers.filter(id => !weekPrayerIds.includes(id)));
                                                  }
                                                }}
                                                className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                                              />
                                              <span className="font-semibold">Uke {week}</span>
                                            </div>
                                          </AccordionTrigger>
                                          <AccordionContent>
                                            <Accordion type="multiple" className="space-y-1">
                                              {Object.entries(days).map(([day, dayPrayers]) => (
                                                <AccordionItem key={day} value={`hidden-day-${day}`} className="border-none">
                                                  <AccordionTrigger className="hover:no-underline py-2 text-sm">
                                                    <span>Dag {day}</span>
                                                  </AccordionTrigger>
                                                  <AccordionContent>
                                                    <div className="space-y-0.5 pl-2">
                                                      {dayPrayers.map(prayer => (
                                                        <div key={prayer.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-[#F5F0EB] dark:hover:bg-[#2A2A2A] rounded">
                                                          <div className="flex items-center gap-2 flex-1">
                                                            <input
                                                              type="checkbox"
                                                              checked={selectedActivePrayers.includes(prayer.id)}
                                                              onChange={(e) => {
                                                                if (e.target.checked) {
                                                                  setSelectedActivePrayers([...selectedActivePrayers, prayer.id]);
                                                                } else {
                                                                  setSelectedActivePrayers(selectedActivePrayers.filter(id => id !== prayer.id));
                                                                }
                                                              }}
                                                              className="w-4 h-4 rounded border-gray-300"
                                                            />
                                                            <span className="text-xs font-medium uppercase text-[#4A6B65] dark:text-[#BD7B59] shrink-0">
                                                              <span className="sm:hidden">{({'matutin':'Mat','laudes':'Lau','prim':'Pri','ters':'Ter','sekst':'Mid','non':'Non','vesper':'Ves','kompletorium':'Kpl'})[prayer.time_of_day] || prayer.time_of_day}</span>
                                                              <span className="hidden sm:inline capitalize">{({sekst:'Middagsbønn'})[prayer.time_of_day] || prayer.time_of_day}</span>
                                                            </span>
                                                            <span className="text-sm text-[#2C2C2A] dark:text-[#F4F0E9]">{prayer.title}</span>
                                                          </div>
                                                          <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewingPrayer(prayer)} title="Forhåndsvisning">
                                                              <Search className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPrayer(prayer)}>
                                                              <FileEdit className="w-4 h-4" />
                                                            </Button>
                                                            {user.is_superadmin && (
                                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#C8602A] hover:text-[#A04820]" onClick={() => handleSoftDeletePrayer(prayer)}>
                                                                <Trash2 className="w-4 h-4" />
                                                              </Button>
                                                            )}
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </AccordionContent>
                                                </AccordionItem>
                                              ))}
                                            </Accordion>
                                          </AccordionContent>
                                        </AccordionItem>
                                      );
                                    })}
                                  </Accordion>
                                </CardContent>
                              )}
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Prayer Preview Dialog */}
                <Dialog open={!!previewingPrayer} onOpenChange={(open) => !open && setPreviewingPrayer(null)}>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[#1A1917]">
                    <DialogHeader>
                      <DialogTitle>Forhåndsvisning: {previewingPrayer?.title}</DialogTitle>
                    </DialogHeader>
                    {previewingPrayer && (
                      <div className="flex-1 overflow-y-auto px-1">
                        <PrayerContent 
                          prayer={previewingPrayer}
                          readingMode="alone"
                          onScrollComplete={() => {}}
                        />
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Deleted Prayers */}
                {user.is_superadmin && prayers.filter(p => p.deleted_at).length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={prayers.filter(p => p.deleted_at).every(p => selectedDeletedPrayers.includes(p.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDeletedPrayers(prayers.filter(p => p.deleted_at).map(p => p.id));
                            } else {
                              setSelectedDeletedPrayers([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <h3 className="text-sm font-semibold text-[#6A6A6A] dark:text-gray-400">
                          Slettede bønner (vil bli permanent slettet)
                        </h3>
                      </div>
                      {selectedDeletedPrayers.length > 0 && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={handleBulkRestorePrayers}
                            className="text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Gjenopprett valgte ({selectedDeletedPrayers.length})
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={handleBulkDeletePrayers}
                            className="text-[#C8602A] border-[#C8602A]/30 hover:bg-[#C8602A]/5"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Slett valgte ({selectedDeletedPrayers.length})
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {prayers
                        .filter(p => p.deleted_at)
                        .map(prayer => {
                          const deletedDate = new Date(prayer.deleted_at);
                          const permanentDeleteDate = new Date(deletedDate.getTime() + 10 * 24 * 60 * 60 * 1000);
                          const daysLeft = Math.ceil((permanentDeleteDate - new Date()) / (1000 * 60 * 60 * 24));
                          
                          if (daysLeft <= 0) {
                            return null;
                          }

                          return (
                            <Card key={prayer.id} className="p-3 border-red-200 dark:border-red-900/30 bg-gray-50 dark:bg-gray-900/20">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedDeletedPrayers.includes(prayer.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDeletedPrayers([...selectedDeletedPrayers, prayer.id]);
                                    } else {
                                      setSelectedDeletedPrayers(selectedDeletedPrayers.filter(id => id !== prayer.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-300"
                                />
                                <div className="flex-1 opacity-60">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{prayer.title}</span>
                                    <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                                      Slettes om {daysLeft} {daysLeft === 1 ? 'dag' : 'dager'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-[#6A6A6A] dark:text-gray-400">
                                    {prayerSeries.find(s => s.id === prayer.series_id)?.title} • Dag {prayer.day} • {prayer.time_of_day}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRestorePrayer(prayer.id)}
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Gjenopprett
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handlePermanentDeletePrayer(prayer)}
                                     className="text-[#C8602A] border-[#C8602A]/30 hover:bg-[#C8602A]/5"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Slett nå
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
              <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
                <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9]">Innholdssider</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPage({ slug: '', title: '', subtitle: '', menu_label: '', content: '' })}
                  className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.2)] gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ny side
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contentPages.map(page => (
                    <Card key={page.id} className="p-4 border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-[#2C2C2A] dark:text-[#F4F0E9]">{page.title || <span className="italic text-[#B6B9B3]">(uten tittel)</span>}</h3>
                          <p className="text-sm text-[#6A6A6A] dark:text-gray-400">/{page.slug}</p>
                        </div>
                        <Button variant="ghost" onClick={() => setEditingPage(page)}>
                          <FileEdit className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Edit Page Dialog */}
            <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
              <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] flex flex-col overflow-hidden">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>
                    {editingPage?.id ? 'Rediger side' : 'Ny side'}
                  </DialogTitle>
                </DialogHeader>
                {editingPage && (
                  <ContentPageEditor
                    page={editingPage}
                    onChange={setEditingPage}
                    onSave={handleSavePage}
                    onCancel={() => setEditingPage(null)}
                    saving={saving}
                  />
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Users Tab — kun for eiere */}
          {user.role === 'owner' && (
            <TabsContent value="users">
              <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
                <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-[#4A6B65] dark:text-[#BD7B59]" />
                      Brukerstyring
                    </CardTitle>
                    <p className="text-xs text-[#6A6A6A] dark:text-gray-400 pt-1">
                      Eiere kan gi admin-tilgang til andre brukere. Eier-rollen kan kun settes direkte i Supabase.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportNewsletter}
                    className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.2)] gap-2"
                    title="Last ned nyhetsbrev-liste (CSV)"
                  >
                    <Download className="w-4 h-4" />
                    Nyhetsbrev-liste ({allUsers.filter(u => u.wants_newsletter).length})
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Navn</TableHead>
                        <TableHead>E-post</TableHead>
                        <TableHead>Rolle</TableHead>
                        <TableHead>Nyhetsbrev</TableHead>
                        <TableHead>Registrert</TableHead>
                        <TableHead className="text-right">Handlinger</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map(u => {
                        const isSelf = u.id === user.id;
                        const isOwner = u.role === 'owner';
                        const created = u.created_at ? new Date(u.created_at).toLocaleDateString('no-NO') : '–';
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="text-sm">
                              {u.display_name || u.full_name || '–'}
                              {isSelf && <span className="ml-2 text-xs text-[#B6B9B3]">(deg)</span>}
                            </TableCell>
                            <TableCell className="text-sm text-[#6A6A6A]">{u.email}</TableCell>
                            <TableCell>
                              {isOwner ? (
                                <Badge className="border-0 dark:!bg-[#BD7B59]" style={{backgroundColor: '#4A6B65', color: '#F4F0E9', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase'}}>Eier</Badge>
                              ) : isSelf ? (
                                <Badge className="border-0" style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase'}}>{u.role === 'admin' ? 'Admin' : 'Bruker'}</Badge>
                              ) : (
                                <Select
                                  value={u.role || 'user'}
                                  onValueChange={(v) => handleUpdateUserRole(u.id, v)}
                                >
                                  <SelectTrigger className="w-36 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">Bruker</SelectItem>
                                    <SelectItem value="admin">Administrator</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              {u.wants_newsletter ? (
                                <span className="text-xs font-medium uppercase tracking-wide text-[#4A6B65] dark:text-[#BD7B59]">Ja</span>
                              ) : (
                                <span className="text-xs text-[#B6B9B3]">–</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-[#6A6A6A]">{created}</TableCell>
                            <TableCell className="text-right">
                              {!isSelf && !isOwner && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#BD7B59] hover:text-[#A04820] hover:bg-[#BD7B59]/10"
                                  onClick={() => handleDeleteUser(u.id, u.email)}
                                  title="Slett bruker"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </motion.div>

      {/* Bekreftelse etter nyhetsbrev-nedlasting — hindrer at adresser
          markeres som behandlet hvis de aldri faktisk legges inn. */}
      <Dialog open={!!pendingNewsletterExport} onOpenChange={(open) => { if (!open) setPendingNewsletterExport(null); }}>
        <DialogContent className="max-w-md bg-white dark:bg-[#1A1917]">
          <DialogHeader>
            <DialogTitle className="text-[#2C2C2A] dark:text-[#F4F0E9]">Bekreft behandling</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-[#4A4A4A] dark:text-gray-300">
            <p>Fila er lastet ned med:</p>
            <ul className="list-disc list-outside pl-5 space-y-1">
              <li><strong>{pendingNewsletterExport?.addCount ?? 0}</strong> å legge til i maillista</li>
              <li><strong>{pendingNewsletterExport?.removeCount ?? 0}</strong> å melde av</li>
            </ul>
            <p>
              Når du har lagt adressene inn (og fjernet de avmeldte) i mailsystemet,
              trykk <strong>Marker som behandlet</strong>. Da dukker de ikke opp igjen
              neste gang.
            </p>
            <p className="text-[#6A6A6A] dark:text-gray-400">
              Trykk <strong>Ikke ennå</strong> hvis du ikke rakk det — da beholdes de
              som ventende og kommer med i neste nedlasting.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPendingNewsletterExport(null)}>
              Ikke ennå
            </Button>
            <Button
              onClick={confirmNewsletterProcessed}
              className="bg-[#4A6B65] hover:bg-[#3a5550] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-[#F4F0E9]"
            >
              Marker som behandlet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}