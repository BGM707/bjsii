import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DTEData {
  folio: string;
  dte_type: string;
  emitter_rut: string;
  emitter_name: string;
  receiver_rut: string;
  receiver_name: string;
  issue_date: string;
  net_amount: number;
  iva_amount: number;
  total_amount: number;
  sii_status: string;
}

async function generateSeed(
  companyRut: string,
  environment: string
): Promise<{
  seed: string;
  timestamp: string;
}> {
  const siiUrl =
    environment === "production"
      ? "https://palena.sii.cl/DTEWS/CrSeed.jws"
      : "https://maullin.sii.cl/DTEWS/CrSeed.jws";

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CrSeed xmlns="http://www.sii.cl/SiiDte">
    </CrSeed>
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await fetch(siiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "",
      },
      body: soapBody,
    });

    const text = await response.text();
    const seedMatch = text.match(
      /<SeedResponse>(.*?)<\/SeedResponse>/s
    ) ||
      text.match(/<ns2:SeedResponse>(.*?)<\/ns2:SeedResponse>/s) ||
      text.match(/<seed>(.*?)<\/seed>/i);

    if (seedMatch) {
      return {
        seed: seedMatch[1].trim(),
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error("Invalid seed response");
  } catch (error) {
    throw new Error(`Failed to generate seed: ${error}`);
  }
}

async function getTokenFromSeed(
  seed: string,
  companyRut: string,
  siiPasswordHash: string,
  environment: string
): Promise<{
  token: string;
  expiration: string;
}> {
  const siiUrl =
    environment === "production"
      ? "https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws"
      : "https://maullin.sii.cl/DTEWS/GetTokenFromSeed.jws";

  const rutWithoutDV = companyRut.split("-")[0];

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetTokenFromSeed xmlns="http://www.sii.cl/SiiDte">
      <pRutCliente>${rutWithoutDV}</pRutCliente>
      <pDvCliente>6</pDvCliente>
      <pSeed>${seed}</pSeed>
      <pSign>${siiPasswordHash}</pSign>
    </GetTokenFromSeed>
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await fetch(siiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "",
      },
      body: soapBody,
    });

    const text = await response.text();
    const tokenMatch = text.match(
      /<TOKEN>(.*?)<\/TOKEN>/
    ) ||
      text.match(/<ns2:TOKEN>(.*?)<\/ns2:TOKEN>/);
    const expirationMatch = text.match(
      /<EXPIRATIONTIME>(.*?)<\/EXPIRATIONTIME>/
    ) ||
      text.match(/<ns2:EXPIRATIONTIME>(.*?)<\/ns2:EXPIRATIONTIME>/);

    if (tokenMatch && expirationMatch) {
      return {
        token: tokenMatch[1].trim(),
        expiration: expirationMatch[1].trim(),
      };
    }

    throw new Error("Invalid token response");
  } catch (error) {
    throw new Error(`Failed to get token: ${error}`);
  }
}

async function logSyncOperation(
  supabase: any,
  companyRut: string,
  operation: string,
  status: string,
  recordsProcessed: number,
  errorMessage?: string
) {
  await supabase.from("sii_sync_logs").insert({
    company_rut: companyRut,
    operation,
    status,
    records_processed: recordsProcessed,
    error_message: errorMessage,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { companyRut, siiPasswordHash, environment = "production" } =
      await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    await logSyncOperation(
      supabase,
      companyRut,
      "authenticate",
      "in_progress",
      0
    );

    const seedData = await generateSeed(companyRut, environment);
    const tokenData = await getTokenFromSeed(
      seedData.seed,
      companyRut,
      siiPasswordHash,
      environment
    );

    const expirationTime = parseInt(tokenData.expiration) * 1000;
    const expirationDate = new Date(expirationTime);

    await supabase.from("sii_sessions").upsert(
      {
        company_rut: companyRut,
        token: tokenData.token,
        seed: seedData.seed,
        seed_expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        token_expiration: expirationDate.toISOString(),
        is_valid: true,
      },
      { onConflict: "company_rut" }
    );

    await logSyncOperation(
      supabase,
      companyRut,
      "authenticate",
      "success",
      1
    );

    return new Response(
      JSON.stringify({
        success: true,
        token: tokenData.token,
        expiration: expirationDate.toISOString(),
        message: "Authentication successful",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
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
