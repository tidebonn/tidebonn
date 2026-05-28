import React from 'react';
import { Input } from '@/components/ui/input';
import { GripVertical, Trash2, Plus } from 'lucide-react';

export default function PrayerHeadingBlock({ block, onChange, onDelete, onAddLine, onAddHeading, dragHandleProps }) {
  return (
    <div className="group rounded-lg border border-[#C8602A]/30 bg-[#FDF8F5] dark:bg-[#26231d] hover:border-[#C8602A]/50 transition-colors">
      {/* Main row: drag | level buttons | divider | heading text | divider | reference | delete */}
      <div className="flex items-center gap-2 p-2">
        {/* Drag handle */}
        <div {...dragHandleProps} className="cursor-grab text-[#C8C0B8] hover:text-[#C8602A] flex-shrink-0">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Heading level selector - same width as marker select */}
        <div className="flex-shrink-0 w-20 flex items-center gap-0.5">
          {['h2', 'h3'].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onChange({ ...block, level })}
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors font-semibold ${
                block.level === level
                  ? 'bg-[#C8602A] text-white border-[#C8602A]'
                  : 'bg-white dark:bg-[#2a2826] text-[#4A4A4A] dark:text-gray-200 border-[#E8E0D8] dark:border-gray-700 hover:border-[#C8602A]'
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="w-px bg-[#E8E0D8] dark:bg-gray-700 self-stretch flex-shrink-0" />

        {/* Heading text - grows */}
        <div className="flex-1 min-w-0">
          <Input
            value={block.text || ''}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Overskrift..."
            className="font-semibold uppercase tracking-wider text-sm border-[#E8E0D8] dark:border-gray-700"
          />
        </div>

        <div className="w-px bg-[#E8E0D8] dark:bg-gray-700 self-stretch flex-shrink-0" />

        {/* Reference - same fixed width as line block */}
        <div className="flex-shrink-0 w-36">
          <Input
            value={block.reference || ''}
            onChange={(e) => onChange({ ...block, reference: e.target.value })}
            placeholder="Henvisning (valgfri)"
            className="text-xs h-7 border-[#E8E0D8] dark:border-gray-700 text-[#6A6A6A] dark:text-gray-300"
          />
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="text-[#C8C0B8] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Add after row */}
      <div className="flex gap-1 px-2 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onAddLine} className="flex items-center gap-1 text-xs text-[#9A9A9A] hover:text-[#6B9EA0] transition-colors">
          <Plus className="w-3 h-3" /> Linje her
        </button>
        <span className="text-[#D0C8C0]">|</span>
        <button type="button" onClick={onAddHeading} className="flex items-center gap-1 text-xs text-[#9A9A9A] hover:text-[#C8602A] transition-colors">
          <Plus className="w-3 h-3" /> Overskrift her
        </button>
      </div>
    </div>
  );
}