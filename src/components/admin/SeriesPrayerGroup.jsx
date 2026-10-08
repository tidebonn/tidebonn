import React from 'react';
import { ChevronDown, ChevronRight, Trash2, FileEdit, Eye, EyeOff, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { getBonnedognTimeOrder } from '../prayer/PrayerSeriesCycleUtils';

const TIME_SHORT = { matutin: 'Mat', laudes: 'Lau', prim: 'Pri', ters: 'Ter', sekst: 'Mid', non: 'Non', vesper: 'Ves', kompletorium: 'Kpl' };
const TIME_LONG = { sekst: 'Middagsbønn' };

// Én bønneserie i Bønner-fanen: sammenleggbart kort med bønnene gruppert
// per uke og døgn. `hidden` brukes for skjulte serier: egen nøkkel i
// collapsedSeries/accordion, «Skjult»-merke i headeren, og ingen
// aktiver/skjul-knapp eller «Skjult»-merke per bønn.
export default function SeriesPrayerGroup({
  series, prayers, hidden = false, user,
  collapsedSeries, setCollapsedSeries,
  selectedIds, setSelectedIds,
  onPreview, onEdit, onToggleActive, onSoftDelete,
}) {
  const prefix = hidden ? 'hidden-' : '';
  const collapseKey = `${prefix}${series.id}`;
  const collapsed = !!collapsedSeries[collapseKey];

  // Bønnedøgn-syklisk rekkefølge: start_time først, så
  // syklisk videre. For start_time=vesper blir det
  // [vesper, komp, matutin, laudes, prim, ters, sekst, non].
  const bonnedognOrder = getBonnedognTimeOrder(series.start_time);
  const seriesPrayers = prayers
    .filter(p => p.series_id === series.id && !p.deleted_at)
    .sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return bonnedognOrder.indexOf(a.time_of_day) - bonnedognOrder.indexOf(b.time_of_day);
    });

  // Grupper på bønnedøgn-uke: enkelt ceil(day/7) siden dataene
  // nå er bønnedøgn-tagget (migrering 010). Hver day = ett
  // bønnedøgn; 7 bønnedøgn = én uke.
  const weeks = {};
  seriesPrayers.forEach(p => {
    const weekNum = Math.ceil(p.day / 7);
    if (!weeks[weekNum]) weeks[weekNum] = {};
    if (!weeks[weekNum][p.day]) weeks[weekNum][p.day] = [];
    weeks[weekNum][p.day].push(p);
  });

  return (
    <Card className={`border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]${hidden ? ' opacity-80' : ''}`}>
      <CardHeader
        className="cursor-pointer hover:bg-[#F5F0EB] dark:hover:bg-[#2A2A2A] transition-colors"
        onClick={() => setCollapsedSeries({...collapsedSeries, [collapseKey]: !collapsedSeries[collapseKey]})}
      >
        <div className="flex items-center justify-between">
          {hidden ? (
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg text-[#2C2C2A] dark:text-[#F4F0E9]">{series.title}</CardTitle>
              <Badge variant="outline" className="text-[#6A6A6A]">Skjult</Badge>
            </div>
          ) : (
            <CardTitle className="text-lg text-[#2C2C2A] dark:text-[#F4F0E9]">
              {series.title}
            </CardTitle>
          )}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{seriesPrayers.length} bønner</Badge>
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          {!hidden && Object.keys(weeks).length === 0 && (
            <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Ingen bønner lagt til ennå.</p>
          )}
          <Accordion type="multiple" className="space-y-2">
            {Object.entries(weeks).map(([week, days]) => {
              const weekPrayers = Object.values(days).flat();
              const weekPrayerIds = weekPrayers.map(p => p.id);
              const allWeekSelected = weekPrayerIds.length > 0 && weekPrayerIds.every(id => selectedIds.includes(id));

              return (
              <AccordionItem key={week} value={`${prefix}week-${week}`} className="border rounded-lg px-3">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={allWeekSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedIds([...new Set([...selectedIds, ...weekPrayerIds])]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => !weekPrayerIds.includes(id)));
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
                      <AccordionItem key={day} value={`${prefix}day-${day}`} className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2 text-sm">
                          <span>Døgn {day}</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-0.5 pl-2">
                            {dayPrayers.map(prayer => (
                              <div key={prayer.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-[#F5F0EB] dark:hover:bg-[#2A2A2A] rounded">
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.includes(prayer.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedIds([...selectedIds, prayer.id]);
                                      } else {
                                        setSelectedIds(selectedIds.filter(id => id !== prayer.id));
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium uppercase text-[#4A6B65] dark:text-[#BD7B59] shrink-0">
                                        <span className="sm:hidden">{TIME_SHORT[prayer.time_of_day] || prayer.time_of_day}</span>
                                        <span className="hidden sm:inline capitalize">{TIME_LONG[prayer.time_of_day] || prayer.time_of_day}</span>
                                      </span>
                                      <span className="text-sm text-[#2C2C2A] dark:text-[#F4F0E9]">{prayer.title}</span>
                                      {!hidden && prayer.is_active === false && (
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
                                    onClick={() => onPreview(prayer)}
                                    title="Forhåndsvisning"
                                  >
                                    <Search className="w-4 h-4" />
                                  </Button>
                                  {!hidden && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => onToggleActive(prayer)}
                                      title={prayer.is_active === false ? 'Aktiver bønn' : 'Skjul bønn'}
                                    >
                                      {prayer.is_active === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onEdit(prayer)}
                                  >
                                    <FileEdit className="w-4 h-4" />
                                  </Button>
                                  {user.is_superadmin && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-[#C8602A] hover:text-[#A04820]"
                                      onClick={() => onSoftDelete(prayer)}
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
}
