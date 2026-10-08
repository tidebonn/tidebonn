import React, { useState } from 'react';
import db, { sb } from '@/api/client';
import { Trash2, UserCog, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast as sonnerToast } from 'sonner';
import NewsletterCsvDialog from './NewsletterCsvDialog';
import { run, unwrap } from './adminActions';

// Brukere-fanen (kun eier): roller, sletting og nyhetsbrev-eksport.
export default function UsersTab({ user, allUsers, reload }) {
  // Ventende nyhetsbrev-eksport som må bekreftes som «behandlet»
  const [pendingNewsletterExport, setPendingNewsletterExport] = useState(null);

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
      reload('users');
      sonnerToast.success('Markert som behandlet');
    } catch (error) {
      console.error('Bekreft nyhetsbrev feilet:', error);
      db.logError('newsletter_confirm', error);
      sonnerToast.error('Kunne ikke oppdatere status');
    } finally {
      setPendingNewsletterExport(null);
    }
  };

  // Eier-eksklusivt: oppdaterer rolle via Edge Function manage-user
  // som validerer caller-rolle og bruker service_role server-side.
  const handleUpdateUserRole = (userId, newRole) => run(
    { ok: 'Brukerrolle oppdatert', fail: (e) => e?.message || 'Kunne ikke oppdatere bruker', after: () => reload('users') },
    async () => unwrap(await db.users.setRole(userId, newRole)),
  );

  const handleDeleteUser = (userId, email) => {
    if (!confirm(`Slette brukeren ${email ?? userId}? Alle bønne-logger og oppsett blir borte. Kan ikke angres.`)) return;
    return run(
      // Sletting kaskaderer til user_progress og prayer_logs (auth.users-FK)
      { ok: 'Bruker slettet', fail: (e) => e?.message || 'Kunne ikke slette bruker', after: () => reload('users', 'progress', 'logs') },
      async () => unwrap(await db.users.deleteUser(userId)),
    );
  };
  return (
    <>
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

      <NewsletterCsvDialog
        pending={pendingNewsletterExport}
        onClose={() => setPendingNewsletterExport(null)}
        onConfirm={confirmNewsletterProcessed}
      />
    </>
  );
}
