import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QueryRequest {
  rutConsultante: string;
  dvConsultante: string;
  rutCompania: string;
  dvCompania: string;
  rutReceptor: string;
  dvReceptor: string;
  tipoDte: string;
  folioDte: string;
  fechaEmisionDte: string;
  montoDte: string;
  token: string;
  environment: 'production' | 'test';
}

interface SIIResponse {
  estado: string;
  glosa: string;
  errCode: string;
  glosErr: string;
  numAtencion: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = (await req.json()) as QueryRequest;

    // Validar parámetros
    if (!body.token) {
      throw new Error("Token is required");
    }

    if (!body.rutCompania || !body.rutReceptor || !body.folioDte || !body.montoDte) {
      throw new Error("Missing required parameters");
    }

    const siiUrl = body.environment === 'production'
      ? 'https://palena.sii.cl/DTEWS/QueryEstDte.jws'
      : 'https://maullin.sii.cl/DTEWS/QueryEstDte.jws';

    // Construir SOAP request para SII
    const soapRequest = buildSoapRequest(body);

    // Enviar request a SII
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
    const parsedResponse = parseSiiResponse(responseText);

    return new Response(
      JSON.stringify(parsedResponse),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Error querying SII:', error);
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

function buildSoapRequest(params: QueryRequest): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
<SOAP-ENV:Body>
  <m:getEstDte xmlns:m="https://maullin.sii.cl/DTEWS/QueryEstDte.jws">
    <RutConsultante xsi:type="xsd:string">${params.rutConsultante}</RutConsultante>
    <DvConsultante xsi:type="xsd:string">${params.dvConsultante}</DvConsultante>
    <RutCompania xsi:type="xsd:string">${params.rutCompania}</RutCompania>
    <DvCompania xsi:type="xsd:string">${params.dvCompania}</DvCompania>
    <RutReceptor xsi:type="xsd:string">${params.rutReceptor}</RutReceptor>
    <DvReceptor xsi:type="xsd:string">${params.dvReceptor}</DvReceptor>
    <TipoDte xsi:type="xsd:string">${params.tipoDte}</TipoDte>
    <FolioDte xsi:type="xsd:string">${params.folioDte}</FolioDte>
    <FechaEmisionDte xsi:type="xsd:string">${params.fechaEmisionDte}</FechaEmisionDte>
    <MontoDte xsi:type="xsd:string">${params.montoDte}</MontoDte>
    <Token xsi:type="xsd:string">${params.token}</Token>
  </m:getEstDte>
</SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function parseSiiResponse(xmlResponse: string): SIIResponse {
  // Extraer valores del XML
  const estadoMatch = xmlResponse.match(/<ESTADO>([^<]*)<\/ESTADO>/);
  const glosMatch = xmlResponse.match(/<GLOSA>([^<]*)<\/GLOSA>/);
  const errCodeMatch = xmlResponse.match(/<ERR_CODE>([^<]*)<\/ERR_CODE>/);
  const glosErrMatch = xmlResponse.match(/<GLOSA_ERR>([^<]*)<\/GLOSA_ERR>/);
  const numAtencionMatch = xmlResponse.match(/<NUM_ATENCION>([^<]*)<\/NUM_ATENCION>/);

  return {
    estado: estadoMatch ? estadoMatch[1] : 'UNKNOWN',
    glosa: glosMatch ? glosMatch[1] : '',
    errCode: errCodeMatch ? errCodeMatch[1] : '-1',
    glosErr: glosErrMatch ? glosErrMatch[1] : 'Error desconocido',
    numAtencion: numAtencionMatch ? numAtencionMatch[1] : '',
  };
}
