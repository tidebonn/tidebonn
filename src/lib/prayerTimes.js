export const TIME_LABELS = {
  matutin: 'Matutin',
  laudes: 'Laudes',
  prim: 'Prim',
  ters: 'Ters',
  sekst: 'Middagsbønn',
  non: 'Non',
  vesper: 'Vesper',
  kompletorium: 'Kompletorium',
};

export const TIME_SHORT = {
  matutin: 'M',
  laudes: 'L',
  prim: 'P',
  ters: 'T',
  sekst: 'S',
  non: 'N',
  vesper: 'V',
  kompletorium: 'K',
};

export const timeLabel = (timeOfDay) => TIME_LABELS[timeOfDay] || timeOfDay || '';
