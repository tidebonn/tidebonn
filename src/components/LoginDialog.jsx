import { useState } from 'react';
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

// Magic-link login. Bruker skriver inn e-post, vi ber Supabase
// sende en innloggings-lenke. Klikk på lenken i mailen logger
// brukeren inn og redirecter tilbake til appen.
export default function LoginDialog({ open, onOpenChange }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('');

  const reset = () => {
    setEmail('');
    setStatus('idle');
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setErrorMsg('');
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
            Skriv inn e-postadressen din. Du får tilsendt en lenke som
            logger deg inn med ett klikk – ingen passord.
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
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">E-post</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="navn@eksempel.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'sending'}
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
            <Button
              type="submit"
              disabled={status === 'sending' || !email.trim()}
              className="w-full"
            >
              {status === 'sending' ? 'Sender …' : 'Send lenke'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
