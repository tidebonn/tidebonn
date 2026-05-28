import { useState, useEffect } from 'react';
import db from '@/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Innlogging: passord (rask, autofylles av Keychain/Android) ELLER
// magic-link (klikk-i-mail, ingen passord å huske). To likeverdige
// stier i samme form.
//
// Formet er korrekt merket for passord-administratorer:
//   - autoComplete="email" + autoComplete="current-password"
//   - <form> rundt alt så autofyll trigger
//   - method="post" gjør at Safari/iOS godtar autofyll selv om vi
//     håndterer submit i JS
export default function LoginDialog({ open, onOpenChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wantsNewsletter, setWantsNewsletter] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sending-pw | sending-link | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setEmail('');
    setPassword('');
    setWantsNewsletter(false);
    setStatus('idle');
    setErrorMsg('');
  };

  // Lagre nyhetsbrev-valget i localStorage så det kan anvendes på
  // profilen når innloggingen fullføres (også etter magic-link-
  // redirect). AuthContext plukker opp flagget ved SIGNED_IN.
  const rememberNewsletterChoice = () => {
    if (typeof window === 'undefined') return;
    if (wantsNewsletter) {
      window.localStorage.setItem('tidebonn.pendingNewsletter', 'true');
    } else {
      window.localStorage.removeItem('tidebonn.pendingNewsletter');
    }
  };

  // Reset state hver gang dialogen lukkes (uansett hvem som lukker
  // den — parent eller Radix). Hindrer at en stuck 'sending-pw'-state
  // henger igjen til neste åpning.
  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const handlePasswordLogin = async (e) => {
    e?.preventDefault?.();
    if (!email.trim() || !password) return;
    setStatus('sending-pw');
    setErrorMsg('');
    rememberNewsletterChoice();
    try {
      const { error } = await db.auth.loginWithPassword(email.trim(), password);
      if (error) {
        setStatus('error');
        setErrorMsg(
          error.message?.toLowerCase().includes('invalid')
            ? 'Feil e-post eller passord.'
            : error.message || 'Kunne ikke logge inn.'
        );
      } else {
        // onAuthStateChange i AuthContext plukker opp den nye sesjonen
        // og oppdaterer user-state automatisk — ingen reload trengs.
        onOpenChange(false);
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.message || 'Uventet feil.');
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) return;
    setStatus('sending-link');
    setErrorMsg('');
    rememberNewsletterChoice();
    try {
      const { error } = await db.auth.login(email.trim());
      if (error) {
        setStatus('error');
        setErrorMsg(error.message || 'Kunne ikke sende lenken.');
      } else {
        setStatus('sent');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.message || 'Uventet feil.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Logg inn</DialogTitle>
          <DialogDescription>
            Bruk passord eller få tilsendt en innloggings-lenke på e-post.
          </DialogDescription>
        </DialogHeader>

        {status === 'sent' ? (
          <div className="py-4 text-sm">
            <p>
              Vi har sendt en lenke til <strong>{email}</strong>. Sjekk
              innboksen (eller spam) og klikk på lenken for å logge inn.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handlePasswordLogin}
            method="post"
            action="#"
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="login-email">E-post</Label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="navn@eksempel.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'sending-pw' || status === 'sending-link'}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Passord</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Passord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status === 'sending-pw' || status === 'sending-link'}
              />
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="login-newsletter"
                checked={wantsNewsletter}
                onCheckedChange={(v) => setWantsNewsletter(!!v)}
                disabled={status === 'sending-pw' || status === 'sending-link'}
                className="mt-0.5"
              />
              <Label
                htmlFor="login-newsletter"
                className="text-sm font-normal leading-snug text-[#4A4A4A] dark:text-gray-300 cursor-pointer"
              >
                Jeg vil motta nyhetsbrev fra Areopagos
              </Label>
            </div>

            {status === 'error' && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="submit"
                disabled={
                  !email.trim() ||
                  !password ||
                  status === 'sending-pw' ||
                  status === 'sending-link'
                }
              >
                {status === 'sending-pw' ? 'Logger inn …' : 'Logg inn'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleMagicLink}
                disabled={
                  !email.trim() ||
                  status === 'sending-pw' ||
                  status === 'sending-link'
                }
              >
                {status === 'sending-link' ? 'Sender …' : 'Send lenke'}
              </Button>
            </div>

            <p className="text-xs text-[#B6B9B3] pt-1">
              Har du ikke passord ennå? Logg inn med lenke først – så kan du
              sette et passord under Oppsett.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
