import React, { useEffect, useState } from 'react';
import { sb } from '@/api/client';
import { AlertTriangle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Menneskelig forklaring for hver context-streng som logError-kalles med.
// Vises i parentes etter badge-tellene så admin ikke trenger å gjette
// hva tag-en betyr. Ukjente context'er får ingen forklaring.
const CONTEXT_DESCRIPTIONS = {
  prayer_log_insert_start:      'feil ved logging av at en bønn ble åpnet',
  prayer_log_insert_fast_start: 'feil ved rask gjenopptak av nylig påbegynt bønn',
  prayer_log_insert_complete:   'feil ved logging av at en bønn ble fullført',
  push_subscribe:               'feil ved registrering av enhet for push-varsler',
  push_pref_update:             'feil ved oppdatering av push-preferanser (bønnetider)',
  newsletter_export:            'feil ved nedlasting av nyhetsbrev-CSV',
  newsletter_confirm:           'feil ved markering som behandlet etter CSV-eksport',
};

// Viser klientfeil logget fra alle brukere. RLS gjør at kun admins
// får lese. Hjelpemiddel for å finne stille feil hos andre brukere.
export default function ClientErrorsCard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await sb
      .from('client_errors')
      .select('id, user_id, context, message, user_agent, url, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Last client_errors feilet:', error);
    }
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const clearAll = async () => {
    if (!confirm(`Slett alle ${rows.length} feil-logger? Kan ikke angres.`)) return;
    await sb.from('client_errors').delete().not('id', 'is', null);
    load();
  };

  // Grupper på context for sammendrag
  const byContext = rows.reduce((acc, r) => {
    acc[r.context] = (acc[r.context] || 0) + 1;
    return acc;
  }, {});

  const filtered = filter
    ? rows.filter(
        (r) =>
          r.context?.toLowerCase().includes(filter.toLowerCase()) ||
          r.message?.toLowerCase().includes(filter.toLowerCase()),
      )
    : rows;

  return (
    <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-[#2C2C2A] dark:text-[#F4F0E9]">
          <AlertTriangle className="w-4 h-4 text-[#BD7B59]" />
          Klientfeil
          <span className="text-xs font-normal text-[#9A9A9A]">({rows.length})</span>
        </CardTitle>
        <div className="flex gap-1">
          {rows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-[#9A9A9A]">
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Tøm
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="h-7"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-[#9A9A9A]">Laster …</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[#9A9A9A]">Ingen feil rapportert.</p>
        ) : (
          <>
            {/* Sammendrag per context — tag og antall, med forklaring i parentes */}
            <div className="flex flex-col gap-1.5 mb-3">
              {Object.entries(byContext).map(([ctx, n]) => {
                const desc = CONTEXT_DESCRIPTIONS[ctx];
                return (
                  <div
                    key={ctx}
                    className="text-xs px-2.5 py-1 rounded bg-[#F4F0E9] dark:bg-[#1A1917] text-[#6A6A6A] dark:text-gray-400 flex items-baseline gap-2 flex-wrap"
                  >
                    <span className="font-mono">{ctx}:</span>
                    <strong className="text-[#2C2C2A] dark:text-[#F4F0E9]">{n}</strong>
                    {desc && (
                      <span className="italic text-[#9A9A9A]">({desc})</span>
                    )}
                  </div>
                );
              })}
            </div>

            {expanded && (
              <>
                <input
                  type="text"
                  placeholder="Filtrer på context eller melding…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full mb-3 px-3 py-1.5 text-sm border border-[#E8E0D8] dark:border-gray-700 bg-transparent rounded"
                />
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filtered.slice(0, 100).map((r) => (
                    <div
                      key={r.id}
                      className="text-xs border-l-2 border-[#BD7B59]/50 pl-3 py-1"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-[#BD7B59]">
                          {r.context}
                        </span>
                        <span className="text-[#9A9A9A]">
                          {new Date(r.created_at).toLocaleString('nb-NO')}
                        </span>
                        {r.user_id ? (
                          <span className="text-[#9A9A9A]">user: {r.user_id.slice(0, 8)}</span>
                        ) : (
                          <span className="text-[#9A9A9A]">anonym</span>
                        )}
                      </div>
                      <div className="text-[#4A4A4A] dark:text-gray-300 font-mono break-words">
                        {r.message}
                      </div>
                      {r.url && (
                        <div className="text-[#9A9A9A] text-[10px] truncate" title={r.url}>
                          {r.url}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
