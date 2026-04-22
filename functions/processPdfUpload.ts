const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await db.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { file_url, series_id } = body;

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    if (!series_id) {
      return Response.json({ error: 'series_id is required' }, { status: 400 });
    }

    // Ekstraher ren tekst fra PDF
    const extractResponse = await db.integrations.Core.ExtractDataFromUploadedFile({
      file_url: file_url,
      json_schema: {
        type: 'object',
        properties: {
          full_text: { 
            type: 'string', 
            description: 'Hele tekstinnholdet fra PDF-en som HTML. BEVAR alle linjeskift (\\n) nøyaktig slik de er i originalen. Ikke slå sammen linjer. Ikke normaliser whitespace. Bevar innrykk og tomme linjer. VIKTIG: Hvis tekst er understreket i PDF-en, wrap den i <u>tekst</u>. Returner ellers ren tekst uten HTML-tagger.' 
          }
        }
      }
    });

    if (extractResponse.status === 'error') {
      return Response.json({ 
        error: 'Failed to extract text from PDF', 
        details: extractResponse.details 
      }, { status: 400 });
    }

    const extracted_text = extractResponse.output?.full_text || '';
    
    if (!extracted_text) {
      return Response.json({ error: 'No text extracted from PDF' }, { status: 400 });
    }

    // Returner den rå teksten - frontend vil initiere samtalen med agenten
    return Response.json({ 
      success: true,
      raw_text: extracted_text,
      text_length: extracted_text.length,
      series_id: series_id
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});