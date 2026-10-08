import React, { useState } from 'react';
import db from '@/api/client';
import { Plus } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ContentPageEditor from './ContentPageEditor';
import SortablePageRow from './SortablePageRow';
import { run } from './adminActions';

// Innhold-fanen: innholdssider med DnD-sortering og redigeringsdialog.
export default function ContentTab({ user, contentPages, setContentPages, reload }) {
  const [editingPage, setEditingPage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Vis faktisk feilmelding fra Supabase så vi kan se hva som er galt
  // (f.eks. manglende kolonne etter pending migration).
  const withMessage = (prefix) => (error) =>
    `${prefix}: ${error?.message || error?.error_description || String(error)}`;

  // Save content page
  const handleSavePage = async () => {
    setSaving(true);
    const row = { ...editingPage, last_edited_by: user.id };
    const ok = await run(
      { ok: 'Side lagret', fail: withMessage('Kunne ikke lagre side'), after: () => reload('pages') },
      () => (editingPage.id
        ? db.entities.ContentPage.update(editingPage.id, row)
        : db.entities.ContentPage.create(row)),
    );
    setSaving(false);
    if (ok) setEditingPage(null);
  };

  // Slett en innholdsside med bekreftelse. Fjerner først raden
  // optimistisk fra lokal state så UI'et oppdateres umiddelbart;
  // synker deretter med DB via reload — også ved feil, så UI'et
  // rulles tilbake (henter ferskt fra DB).
  const handleDeletePage = async (page) => {
    const label = page.title || page.slug || 'denne siden';
    if (!confirm(`Er du sikker på at du vil slette «${label}»? Dette kan IKKE angres.`)) return;
    await run({ ok: 'Side slettet', fail: withMessage('Kunne ikke slette side') }, async () => {
      await db.entities.ContentPage.delete(page.id);
      setContentPages(prev => prev.filter(p => p.id !== page.id));
    });
    await reload('pages');
  };

  // DnD-sortering: når en rad slippes, renummerer alle rader fra 1
  // og persisterer order_index per rad. Optimistisk UI-oppdatering
  // før DB-skriv slik at lista føles snappy.
  const handleReorderPages = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = contentPages.findIndex(p => p.id === active.id);
    const newIndex = contentPages.findIndex(p => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(contentPages, oldIndex, newIndex);
    setContentPages(reordered);
    const ok = await run({ fail: withMessage('Kunne ikke lagre rekkefølge') }, () => Promise.all(
      reordered.map((p, i) => {
        const newOrder = i + 1;
        if (p.order_index === newOrder) return null;
        return db.entities.ContentPage.update(p.id, { order_index: newOrder, last_edited_by: user.id });
      }).filter(Boolean),
    ));
    if (!ok) reload('pages'); // re-hent original rekkefølge fra DB
  };
  // DnD-sensorer — pointer for mus/touch, keyboard for tilgjengelighet
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <>
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
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleReorderPages}
          >
            <SortableContext
              items={contentPages.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {contentPages.map(page => (
                  <SortablePageRow
                    key={page.id}
                    page={page}
                    onEdit={setEditingPage}
                    onDelete={handleDeletePage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
    </>
  );
}
