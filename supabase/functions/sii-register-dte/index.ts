import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RegisterRequest {
  xmlContent: string;
  token: string;
  environment: 'production' | 'test';
  dteId: string;
}

interface RegisterResponse {
  status: string;
  siiResponse: string;
  trackingNumber?: string;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = (await req.json()) as RegisterRequest;

    if (!body.token || !body.xmlContent) {
      throw new Error("Token and XML content are required");
    }

    const siiUrl = body.environment === 'production'
      ? 'https://palena.sii.cl/DTEWS/RecebeBoletaDepositoWS.jws'
      : 'https://maullin.sii.cl/DTEWS/RecebeBoletaDepositoWS.jws';

    // Construir SOAP request para envío de DTE
    const soapRequest = buildRegistrationSoapRequest(body.xmlContent, body.token);

    // Enviar a SII
    const siiResponse = await fetch(siiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        'SOAPAction': '',
      },
      body: soapRequest,
    });

    if (!siiResponse.ok) {
      throw new Error(`SII returned status ${siiResponse.status}`);
    }

    const responseText = await siiResponse.text();
    const trackingNumber = extractTrackingNumber(responseText);

    const response: RegisterResponse = {
      status: 'registered',
      siiResponse: responseText,
      trackingNumber,
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Error registering DTE with SII:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        status: "error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function buildRegistrationSoapRequest(xmlContent: string, token: string): string {
  const encodedXml = xmlContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
<SOAP-ENV:Body>
  <m:ingresarBoletaDepositoWS xmlns:m="https://maullin.sii.cl/DTEWS/RecebeBoletaDepositoWS.jws">
    <DTExml xsi:type="xsd:string">${encodedXml}</DTExml>
    <Token xsi:type="xsd:string">${token}</Token>
  </m:ingresarBoletaDepositoWS>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function extractTrackingNumber(responseText: string): string | undefined {
  const trackingMatch = responseText.match(/<TRACKING>([^<]*)<\/TRACKING>/);
  if (trackingMatch) {
    return trackingMatch[1];
  }

  // Alternativa: buscar número de atención
  const atencionMatch = responseText.match(/<NUM_ATENCION>([^<]*)<\/NUM_ATENCION>/);
  return atencionMatch ? atencionMatch[1] : undefined;
}
