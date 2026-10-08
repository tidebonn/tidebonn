import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileEdit, Trash2, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Sorterbar rad i Innholdsliste — gir drag-håndtak, klikkbart felt
// for redigering og slett-knapp. useSortable bindes til page.id.
export default function SortablePageRow({ page, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 'auto',
    position: 'relative',
  };
  const visibilityLabel = (page.nav_visibility || 'menu') === 'menu' ? 'Meny' : 'Kun info';
  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-3 border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-[#B6B9B3] hover:text-[#4A6B65] dark:hover:text-[#BD7B59] transition-colors flex-shrink-0"
            aria-label="Dra for å endre rekkefølge"
            title="Dra for å endre rekkefølge"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#2C2C2A] dark:text-[#F4F0E9] truncate">
              {page.title || <span className="italic text-[#B6B9B3]">(uten tittel)</span>}
            </h3>
            <p className="text-xs text-[#6A6A6A] dark:text-gray-400 flex items-center gap-2 flex-wrap">
              <span>/Side/{page.slug}</span>
              <span className="text-[#B6B9B3]">·</span>
              <span>{visibilityLabel}</span>
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onEdit(page)} title="Rediger">
            <FileEdit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(page)}
            title="Slett"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
