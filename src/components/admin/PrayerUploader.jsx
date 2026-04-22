const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useRef } from 'react';

import { Upload, Loader2, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import MessageBubble from './MessageBubble';

export default function PrayerUploader({ prayerSeries, onPrayerCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (prayerSeries && prayerSeries.length > 0 && !selectedSeriesId) {
      setSelectedSeriesId(prayerSeries[0].id);
    }
  }, [prayerSeries, selectedSeriesId]);

  useEffect(() => {
    if (conversationId) {
      // Sett opp subscription for real-time oppdateringer
      const unsubscribe = db.agents.subscribeToConversation(conversationId, (data) => {
        setMessages(data.messages || []);
        // Sjekk om siste melding er fra agenten
        if (data.messages && data.messages.length > 0) {
          const lastMessage = data.messages[data.messages.length - 1];
          if (lastMessage.role === 'assistant') {
            setIsProcessing(false);
            if (lastMessage.content && (
              lastMessage.content.toLowerCase().includes('fullført') ||
              lastMessage.content.toLowerCase().includes('ferdig') ||
              lastMessage.content.toLowerCase().includes('lagret') ||
              lastMessage.content.includes('✅')
            )) {
              setIsFinished(true);
            }
          }
        }
      });

      // Poll conversation hvert 3. sekund som backup
      const pollInterval = setInterval(async () => {
        try {
          const conv = await db.agents.getConversation(conversationId);
          setMessages(conv.messages || []);
          
          if (conv.messages && conv.messages.length > 0) {
            const lastMessage = conv.messages[conv.messages.length - 1];
            if (lastMessage.role === 'assistant') {
              setIsProcessing(false);
              // Check if agent signals completion
              if (lastMessage.content && (
                lastMessage.content.toLowerCase().includes('fullført') ||
                lastMessage.content.toLowerCase().includes('ferdig') ||
                lastMessage.content.toLowerCase().includes('lagret') ||
                lastMessage.content.includes('✅')
              )) {
                setIsFinished(true);
              }
            }
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 3000);

      // Timeout på 5 minutter
      const timeoutId = setTimeout(() => {
        setIsProcessing(false);
      }, 300000);

      return () => {
        unsubscribe();
        clearInterval(pollInterval);
        clearTimeout(timeoutId);
      };
    }
  }, [conversationId]);

  // Auto-scroll only when a new visible message appears in the chat log
  const visibleMessageCount = (messages || []).filter(msg => {
    if (!msg) return false;
    if (msg.role === 'user') return true;
    if (msg.role === 'assistant' && msg.content) {
      return (
        msg.content.includes('?') ||
        msg.content.includes('⚠️') ||
        msg.content.toLowerCase().includes('stemmer dette') ||
        msg.content.toLowerCase().includes('ønsker du') ||
        msg.content.toLowerCase().includes('vil du') ||
        msg.content.toLowerCase().includes('bekreft') ||
        msg.content.toLowerCase().includes('fullbyrdet') ||
        msg.content.toLowerCase().includes("bønneskriverens arbeid er fullført")
      );
    }
    return false;
  }).length;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessageCount]);

  const processFile = async (file) => {
    if (!file) return;

    if (!file.type.includes('pdf')) {
      toast.error('Bare PDF-filer er tillatt');
      return;
    }

    if (!selectedSeriesId) {
      toast.error('Velg en bønneserie først.');
      return;
    }

    setIsLoading(true);
    try {
      // Last opp fil til Base44
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      
      // Prosesser PDF via backend-funksjon
      const extractResponse = await db.functions.invoke('processPdfUpload', {
        file_url,
        series_id: selectedSeriesId
      });
      
      const { raw_text, series_id } = extractResponse.data;

      setUploadedFile(file);

      // Opprett samtale med Bønneskriver
      const newConversation = await db.agents.createConversation({
        agent_name: 'Bønneskriver',
        metadata: {
          name: `PDF-opplastning: ${file.name}`,
          description: 'Prosessering av bønner fra PDF'
        }
      });
      setConversationId(newConversation.id);
      setConversation(newConversation);

      // Send teksten til agenten
      const userMessageContent = `Jeg har ekstrahert tekst fra en PDF med bønner. Vennligst analyser og overfør bønnene til arkivet.\n\nSerie ID: ${series_id}\n\nTekst fra PDF:\n\n${raw_text.substring(0, 100000)}`;
      
      // Vis brukerens melding optimistisk
      setMessages([{
        role: 'user',
        content: 'PDF lastet opp, starter prosessering med Bønneskriver...',
        created_at: new Date().toISOString()
      }]);
      setIsProcessing(true);
      
      // Send melding til agenten
      await db.agents.addMessage(newConversation, {
        role: 'user',
        content: userMessageContent
      });

      toast.success('PDF ekstrahert, Bønneskriver arbeider...');
    } catch (error) {
      toast.error('Kunne ikke laste opp eller analysere PDF');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
      event.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    await processFile(file);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setConversationId(null);
    setConversation(null);
    setMessages([]);
    setUploadedFile(null);
    setIsProcessing(false);
    setIsFinished(false);
  };

  const handleFinish = async () => {
    await onPrayerCreated();
    setIsOpen(false);
    setConversationId(null);
    setConversation(null);
    setMessages([]);
    setUploadedFile(null);
    setIsProcessing(false);
    setIsFinished(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation) return;

    const messageContent = newMessage;
    setNewMessage('');
    
    // Optimistic update
    const tempUserMessage = {
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);
    setIsProcessing(true);

    try {
      await db.agents.addMessage(conversation, {
        role: 'user',
        content: messageContent
      });
      
      setTimeout(() => {
        setIsProcessing(false);
      }, 120000);
    } catch (error) {
      toast.error('Kunne ikke sende melding');
      console.error(error);
      setIsProcessing(false);
      setMessages(prev => prev.filter(m => m !== tempUserMessage));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#C8602A] hover:bg-[#A04820]">
          <Upload className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Last opp PDF med bønner</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Last opp PDF med bønner</DialogTitle>
        </DialogHeader>

        {!conversationId ? (
          <div className="space-y-4 py-4">
            <div className="mb-6 p-4 bg-[#F5F0EB] dark:bg-[#2A2A2A] rounded-lg border border-[#E8E0D8] dark:border-gray-700">
              <p className="text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed mb-3">
                Her kan du laste opp en PDF med bønner. Bønneskriveren, en erfaren liturgiekspert og munk, vil nøyaktig overføre bønnene til det digitale arkivet.
              </p>
              <p className="text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed mb-3">
                Du vil bli guidet gjennom prosessen og kan bekrefte eller justere underveis.
              </p>
              <p className="text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed">
                Alle data forblir trygt lagret og vil ikke bli delt med andre.
              </p>
            </div>

            <div>
              <Label htmlFor="existing-series">Velg bønneserie</Label>
              <Select
                value={selectedSeriesId}
                onValueChange={setSelectedSeriesId}
                disabled={isLoading || prayerSeries.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Velg en serie" />
                </SelectTrigger>
                <SelectContent>
                  {prayerSeries.map((series) => (
                    <SelectItem key={series.id} value={series.id}>
                      {series.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {prayerSeries.length === 0 && (
                <p className="text-sm text-red-500 mt-2">Ingen bønneserier funnet.</p>
              )}
            </div>

            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? 'border-[#C8602A] bg-[#C8602A]/5' 
                  : 'border-[#C8602A]/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-[#C8602A]/50 mx-auto mb-4" />
              <p className="text-sm text-[#6A6A6A] dark:text-gray-400 mb-4">
                {isDragging 
                  ? 'Slipp filen her...' 
                  : 'Dra og slipp en PDF-fil her, eller klikk for å velge'}
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload">
                <Button 
                  asChild 
                  disabled={isLoading || !selectedSeriesId}
                  className="bg-[#C8602A] hover:bg-[#A04820]"
                >
                  <span>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyserer...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Velg PDF
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4 h-[600px] flex flex-col">
            {/* Status Line - Always visible */}
            <style>{`
              @keyframes pulse-ring {
                0% { transform: scale(0.8); opacity: 1; }
                100% { transform: scale(1.8); opacity: 0; }
              }
              .processing-indicator {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                flex-shrink: 0;
              }
              .processing-indicator .ring {
                position: absolute;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #C8602A;
                opacity: 0;
                animation: pulse-ring 1.4s ease-out infinite;
              }
              .processing-indicator .ring:nth-child(2) {
                animation-delay: 0.7s;
              }
              .processing-indicator .dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #C8602A;
                position: relative;
                z-index: 1;
              }
            `}</style>
            {/* Status bar - last status message */}
            <div className="flex items-center gap-3 text-sm text-[#6A6A6A] dark:text-gray-400 py-3 px-4 bg-[#F5F0EB] dark:bg-[#2A2A2A] rounded-lg border border-[#E8E0D8] dark:border-gray-700">
              {isProcessing ? (
                <div className="processing-indicator flex-shrink-0">
                  <div className="ring" />
                  <div className="ring" />
                  <div className="dot" />
                </div>
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
              <span className="italic truncate flex-1">
                {(() => {
                  const assistantMessages = (messages || []).filter(m => m && m.role === 'assistant' && m.content);
                  if (assistantMessages.length > 0) {
                    const latest = assistantMessages[assistantMessages.length - 1].content;
                    const firstLine = latest.split('\n').find(l => l.trim());
                    return firstLine ? firstLine.trim() : 'Bønneskriver arbeider...';
                  }
                  return isProcessing ? 'Bønneskriver arbeider...' : 'Klar';
                })()}
              </span>
              {/* Tool call status - e.g. create_prayer running */}
              {(() => {
                const toolCalls = (messages || []).flatMap(m => m?.tool_calls || []);
                const last = toolCalls[toolCalls.length - 1];
                if (!last) return null;
                const isRunning = last.status === 'running' || last.status === 'in_progress';
                const isDone = last.status === 'completed' || last.status === 'success';
                const name = last.name || 'tool';
                return (
                  <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${isRunning ? 'text-[#C8602A]' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                    {isRunning && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isDone && <CheckCircle2 className="w-3 h-3" />}
                    {name}
                  </span>
                );
              })()}
            </div>

            {/* Chat Log - Only messages requiring user interaction */}
            <div className="flex-1 overflow-y-auto space-y-4 px-2">
              {(messages || [])
                .filter(msg => {
                  if (!msg) return false;
                  if (msg.role === 'user') return true;
                  if (msg.role === 'assistant' && msg.content) {
                    // Show only messages that ask questions or need confirmation
                    return (
                      msg.content.includes('?') ||
                      msg.content.includes('⚠️') ||
                      msg.content.toLowerCase().includes('stemmer dette') ||
                      msg.content.toLowerCase().includes('ønsker du') ||
                      msg.content.toLowerCase().includes('vil du') ||
                      msg.content.toLowerCase().includes('bekreft') ||
                      msg.content.toLowerCase().includes('fullbyrdet') ||
                      msg.content.toLowerCase().includes("bønneskriverens arbeid er fullført")
                    );
                  }
                  return false;
                })
                .map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} />
                ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t pt-4 flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Svar til Bønneskriver..."
                className="resize-none"
                rows={2}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-[#C8602A] hover:bg-[#A04820]"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="border-t pt-3">
              {isFinished ? (
                <Button
                  onClick={handleFinish}
                  className="w-full bg-[#6B9EA0] hover:bg-[#4D8082]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Fullfør og lukk
                </Button>
              ) : (
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="w-full"
                >
                  Avbryt
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}