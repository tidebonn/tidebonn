const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useRef, useEffect } from 'react';

import { Upload, Loader2, FileText, Send, Copy, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PdfUploadTest() {
  const [prayerSeries, setPrayerSeries] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState('');
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('idle'); // idle | uploading | extracting | done | sending
  const [extractedText, setExtractedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const fileRef = useRef();

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const series = await db.entities.PrayerSeries.filter({ is_active: true });
    setPrayerSeries(series);
    if (series.length > 0) setSelectedSeries(series[0].id);
  };

  const readTxtFile = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setExtractedText(e.target.result);
      setStep('done');
    };
    reader.readAsText(f, 'UTF-8');
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type === 'application/pdf') {
      setFile(f);
      setStep('idle');
      setExtractedText('');
    } else if (f.name.endsWith('.txt') || f.type === 'text/plain') {
      setFile(f);
      setExtractedText('');
      readTxtFile(f);
    } else {
      toast.error('Vennligst velg en PDF- eller TXT-fil');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (f.type === 'application/pdf') {
      setFile(f);
      setStep('idle');
      setExtractedText('');
    } else if (f.name.endsWith('.txt') || f.type === 'text/plain') {
      setFile(f);
      setExtractedText('');
      readTxtFile(f);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    try {
      setStep('uploading');
      const { file_url } = await db.integrations.Core.UploadFile({ file });

      setStep('extracting');
      const res = await db.functions.invoke('processPdfWithVision', { file_url });

      if (res.data?.success) {
        setExtractedText(res.data.extracted_text);
        setStep('done');
      } else {
        toast.error(res.data?.error || 'Noe gikk galt');
        setStep('idle');
      }
    } catch (err) {
      toast.error(err.message);
      setStep('idle');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToBonneskriver = async () => {
    if (!extractedText || !selectedSeries) return;
    setStep('sending');

    try {
      const seriesData = prayerSeries.find(s => s.id === selectedSeries);
      const conversation = await db.agents.createConversation({
        agent_name: 'Bønneskriver',
        metadata: { name: `Vision-test: ${file?.name || 'ukjent'}` }
      });

      await db.agents.addMessage(conversation, {
        role: 'user',
        content: `Jeg har brukt visuell PDF-ekstraksjon på et dokument. Her er den transkriberte teksten fra dokumentet (med <u>tagger for understrekinger). Vennligst prosesser dette og opprett bønnene i serien "${seriesData?.title}" (ID: ${selectedSeries}).\n\n---\n\n${extractedText}`
      });

      setConversationId(conversation.id);
      setStep('done');
      toast.success('Tekst sendt til Bønneskriveren!');
    } catch (err) {
      toast.error(err.message);
      setStep('done');
    }
  };

  const isProcessing = ['uploading', 'extracting', 'sending'].includes(step);

  const stepLabel = {
    uploading: 'Laster opp PDF...',
    extracting: 'Tolker dokumentet visuelt (kan ta 20–40 sek)...',
    sending: 'Sender til Bønneskriveren...',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '2rem' }} className="text-[#2C2C2A] dark:text-[#F4F0E9] mb-2">
        Test: Visuell PDF-ekstraksjon
      </h1>
      <p style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, color: '#B6B9B3' }} className="mb-8">
        Laster PDF visuelt med Gemini og sender råtekst til Bønneskriveren.
      </p>

      <div className="space-y-6">
        {/* Serie-velger */}
        <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              1. Velg bønneserie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSeries} onValueChange={setSelectedSeries}>
              <SelectTrigger className="border-[#E8E0D8] dark:border-gray-700">
                <SelectValue placeholder="Velg serie" />
              </SelectTrigger>
              <SelectContent>
                {prayerSeries.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Filopplasting */}
        <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <CardHeader>
            <CardTitle style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              2. Last opp PDF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#DECCB4] dark:border-[rgba(244,240,233,0.2)] rounded-lg p-8 text-center cursor-pointer hover:bg-[#F5F0EB] dark:hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              <input ref={fileRef} type="file" accept=".pdf,.txt" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-[#6B9EA0]" />
                  <span style={{ fontFamily: "'Spectral', Georgia, serif" }} className="text-[#2C2C2A] dark:text-[#F4F0E9]">{file.name}</span>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-[#B6B9B3] mx-auto mb-2" />
                  <p style={{ fontFamily: "'Spectral', Georgia, serif", color: '#B6B9B3' }}>Dra og slipp PDF eller TXT her, eller klikk for å velge</p>
                </div>
              )}
            </div>

            {file && !isProcessing && step === 'idle' && (
              <Button
                onClick={handleProcess}
                className="mt-4 bg-[#C8602A] hover:bg-[#A04820] text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Start visuell ekstraksjon
              </Button>
            )}

            {isProcessing && (
              <div className="mt-4 flex items-center gap-3 text-[#6B9EA0]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span style={{ fontFamily: "'Spectral', Georgia, serif", fontStyle: 'italic' }}>{stepLabel[step]}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultat */}
        {extractedText && (
          <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                3. Ekstrahert tekst
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              <pre
                className="text-sm text-[#2C2C2A] dark:text-[#F4F0E9] whitespace-pre-wrap max-h-96 overflow-y-auto bg-[#F5F0EB] dark:bg-[rgba(255,255,255,0.04)] p-4 rounded"
                style={{ fontFamily: "'Spectral', Georgia, serif", lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: extractedText }}
              />
            </CardContent>
          </Card>
        )}

        {/* Send til Bønneskriver */}
        {extractedText && step === 'done' && !conversationId && (
          <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
            <CardHeader>
              <CardTitle style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                4. Send til Bønneskriveren
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, color: '#B6B9B3' }} className="mb-4 text-sm">
                Teksten over sendes til Bønneskriver-agenten, som bruker sine formateringsregler for å opprette bønnene med korrekt HTML-struktur.
              </p>
              <Button
                onClick={handleSendToBonneskriver}
                disabled={!selectedSeries || step === 'sending'}
                className="bg-[#6B9EA0] hover:bg-[#4D8082] text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Send til Bønneskriveren
              </Button>
            </CardContent>
          </Card>
        )}

        {conversationId && (
          <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
            <CardContent className="pt-6">
              <p style={{ fontFamily: "'Spectral', Georgia, serif", color: '#4A6B65' }}>
                ✓ Sendt! Bønneskriveren behandler nå teksten. Følg opp i Bønneskriver-agentens dashbord.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}