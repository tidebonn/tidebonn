const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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
    const { file_url } = body;

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // PASS 1: Full transkripsjon
    const pass1 = await db.integrations.Core.InvokeLLM({
      prompt: `Du er en nøyaktig transkripsjonist for liturgiske tekster.
Transkriber teksten fra dette dokumentet nøyaktig.

UNDERSTREKINGER: En understreking er en synlig horisontal strek UNDER en bokstav (ikke aksent over). Merk understrekede bokstaver med <u>...</u>.
Eksempel: «<u>I</u>sraels», «h<u>o</u>rn», «<u>é</u>» (bokstav med både aksent og understreking).

Bevar alle linjeskift, innrykk og store bokstaver nøyaktig. Returner kun transkripsjonen.`,
      file_urls: [file_url],
      model: 'gemini_3_1_pro',
    });

    const text1 = typeof pass1 === 'string' ? pass1 : JSON.stringify(pass1);

    // PASS 2: Korriger understrekinger basert på pass 1 + originalbilde
    const pass2 = await db.integrations.Core.InvokeLLM({
      prompt: `Du er en kvalitetskontrollør for liturgiske tekster.

Her er en transkripsjon av dokumentet:
---
${text1}
---

Se nøye på det originale dokumentbildet og finn alle understrekinger som mangler eller er feil i transkripsjonen over.
En understreking = horisontal strek direkte UNDER en bokstav (rytmisk markering). Kan stå under vanlige bokstaver OG bokstaver med aksent (é, ó, ú osv.).

Returner den korrigerte og komplette transkripsjonen med korrekte <u>-tagger. Bevar alle linjeskift og innrykk. Skriv KUN teksten.`,
      file_urls: [file_url],
      model: 'gemini_3_1_pro',
    });

    const finalText = typeof pass2 === 'string' ? pass2 : JSON.stringify(pass2);

    return Response.json({
      success: true,
      extracted_text: finalText,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});