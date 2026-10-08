import React, { useState } from 'react';
import db from '@/api/client';
import {
  Plus, Trash2, Save, Loader2, FileEdit, Eye, EyeOff, RotateCcw,
  CalendarDays, Clock, UserCog
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast as sonnerToast } from 'sonner';
import SeriesStartDatePicker from './SeriesStartDatePicker';

// Bønneserier-fanen: liste, redigeringsdialog og slettede serier.
export default function SeriesTab({ user, prayerSeries, reload }) {
  const [editingSeries, setEditingSeries] = useState(null);
  const [saving, setSaving] = useState(false);

  // Toggle series active status
  const handleToggleSeriesActive = async (series) => {
    try {
      await db.entities.PrayerSeries.update(series.id, {
        is_active: !series.is_active
      });
      sonnerToast.success(series.is_active ? 'Serie skjult' : 'Serie aktivert');
      reload('series');
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
      reload('series');
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
      reload('series');
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
      reload('series');
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
      reload('series');
    } catch (error) {
      sonnerToast.error('Kunne ikke lagre serie');
    } finally {
      setSaving(false);
    }
  };

  return (
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
  );
}
