import React, { useState } from 'react';
import db from '@/api/client';
import { Plus, Trash2, Save, Loader2, EyeOff, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast as sonnerToast } from 'sonner';
import PrayerEditor from './PrayerEditor';
import { injectTitleH1 } from './prayerBlockUtils';
import PrayerContent from '../prayer/PrayerContent';
import SeriesPrayerGroup from './SeriesPrayerGroup';

// Bønner-fanen: redigeringsdialog, bønner gruppert per serie/uke/døgn,
// skjulte serier, forhåndsvisning og slettede bønner.
export default function PrayersTab({ user, prayers, prayerSeries, loadData }) {
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [collapsedSeries, setCollapsedSeries] = useState({});
  const [previewingPrayer, setPreviewingPrayer] = useState(null);
  const [selectedDeletedPrayers, setSelectedDeletedPrayers] = useState([]);
  const [selectedActivePrayers, setSelectedActivePrayers] = useState([]);
  const [editorFullscreen, setEditorFullscreen] = useState(false);

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

  // Felles props for serie-kortene (aktive og skjulte serier)
  const groupProps = {
    prayers, user, collapsedSeries, setCollapsedSeries,
    selectedIds: selectedActivePrayers, setSelectedIds: setSelectedActivePrayers,
    onPreview: setPreviewingPrayer, onEdit: setEditingPrayer,
    onToggleActive: handleTogglePrayerActive, onSoftDelete: handleSoftDeletePrayer,
  };

  return (
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
                        <Label>Døgn i uken (1-7)</Label>
                        <Input type="number" min={1} max={7} value={currentDow}
                          onChange={(e) => { const d = parseInt(e.target.value) || 1; setEditingPrayer({...editingPrayer, day: (currentWeek - 1) * 7 + d}); }} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label>Døgn (1-{totalDays})</Label>
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
            .map(series => (
              <SeriesPrayerGroup key={series.id} series={series} {...groupProps} />
            ))}
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
                .map(series => (
                  <SeriesPrayerGroup key={series.id} series={series} hidden {...groupProps} />
                ))}
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
                            {prayerSeries.find(s => s.id === prayer.series_id)?.title} • Døgn {prayer.day} • {prayer.time_of_day}
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
  );
}
