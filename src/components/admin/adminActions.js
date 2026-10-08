import { toast as sonnerToast } from 'sonner';

// Felles mønster for admin-mutasjoner:
//   try { await fn(); toast.success(ok); after(); } catch { toast.error(fail); }
// `ok` kan utelates (ingen suksess-toast). `fail` kan være en funksjon av
// feilen for å ta med serverens melding. Returnerer true ved suksess så
// kalleren kan rydde egen state (lukke dialog o.l.).
export async function run({ ok, fail, after }, fn) {
  try {
    await fn();
    if (ok) sonnerToast.success(ok);
    if (after) after();
    return true;
  } catch (error) {
    const message = typeof fail === 'function' ? fail(error) : fail;
    console.error(`${message}:`, error);
    sonnerToast.error(message);
    return false;
  }
}

// db.users.* returnerer { error } i stedet for å kaste — gjør om til kast
// så run() kan håndtere det likt.
export function unwrap({ error } = {}) {
  if (error) throw error;
}
