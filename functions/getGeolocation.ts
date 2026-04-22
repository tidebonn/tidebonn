import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const abstractApiKey = Deno.env.get("ABSTRACT_API_KEY");
        if (!abstractApiKey) {
            return Response.json({ error: 'ABSTRACT_API_KEY is not set' }, { status: 500 });
        }

        // Get client IP from headers (works behind proxy/CDN)
        const ipHeader = req.headers.get("X-Forwarded-For") 
            || req.headers.get("X-Real-IP") 
            || req.headers.get("CF-Connecting-IP");

        if (!ipHeader) {
            return Response.json({ country: null, city: null });
        }

        const ipAddress = ipHeader.split(',')[0].trim();

        const apiUrl = `https://ip-geolocation.abstractapi.com/v1/?api_key=${abstractApiKey}&ip_address=${ipAddress}`;

        const geoResponse = await fetch(apiUrl);
        if (!geoResponse.ok) {
            const errorText = await geoResponse.text();
            console.error("Abstract API error:", errorText);
            return Response.json({ country: null, city: null });
        }

        const geoData = await geoResponse.json();

        return Response.json({
            country: geoData.country || null,
            country_code: geoData.country_code || null,
            city: geoData.city || null,
        });

    } catch (error) {
        console.error("Error in getGeolocation:", error);
        return Response.json({ country: null, city: null });
    }
});