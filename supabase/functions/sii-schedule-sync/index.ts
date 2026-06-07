import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function generateSeed(environment: string): Promise<string> {
  const siiUrl =
    environment === "production"
      ? "https://palena.sii.cl/DTEWS/CrSeed.jws"
      : "https://maullin.sii.cl/DTEWS/CrSeed.jws";

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CrSeed xmlns="http://www.sii.cl/SiiDte"></CrSeed>
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
    const seedMatch = text.match(/<SeedResponse>(.*?)<\/SeedResponse>/s) ||
      text.match(/<ns2:SeedResponse>(.*?)<\/ns2:SeedResponse>/s) ||
      text.match(/<seed>(.*?)<\/seed>/i);

    if (seedMatch) {
      return seedMatch[1].trim();
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
): Promise<{ token: string; expirationTime: number }> {
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
    const tokenMatch = text.match(/<TOKEN>(.*?)<\/TOKEN>/) ||
      text.match(/<ns2:TOKEN>(.*?)<\/ns2:TOKEN>/);
    const expirationMatch = text.match(
      /<EXPIRATIONTIME>(.*?)<\/EXPIRATIONTIME>/
    ) ||
      text.match(/<ns2:EXPIRATIONTIME>(.*?)<\/ns2:EXPIRATIONTIME>/);

    if (tokenMatch && expirationMatch) {
      return {
        token: tokenMatch[1].trim(),
        expirationTime: parseInt(expirationMatch[1].trim()),
      };
    }
    throw new Error("Invalid token response");
  } catch (error) {
    throw new Error(`Failed to get token: ${error}`);
  }
}

async function queryCompanyDTEs(
  token: string,
  companyRut: string,
  environment: string
): Promise<any[]> {
  const siiUrl =
    environment === "production"
      ? "https://palena.sii.cl/DTEWS/QueryEstDte.jws"
      : "https://maullin.sii.cl/DTEWS/QueryEstDte.jws";

  const rutWithoutDV = companyRut.split("-")[0];
  const dv = companyRut.split("-")[1];

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <getEstDte xmlns="https://maullin.sii.cl/DTEWS/QueryEstDte.jws">
      <rutConsultante>${rutWithoutDV}</rutConsultante>
      <dvConsultante>${dv}</dvConsultante>
      <rutCompania>${rutWithoutDV}</rutCompania>
      <dvCompania>${dv}</dvCompania>
      <rutReceptor>${rutWithoutDV}</rutReceptor>
      <dvReceptor>${dv}</dvReceptor>
      <numeroDocumento>0</numeroDocumento>
      <tipoDocumento>39</tipoDocumento>
      <fechaDesde>2024-01-01</fechaDesde>
      <fechaHasta>2099-12-31</fechaHasta>
      <token>${token}</token>
    </getEstDte>
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await fetch(siiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "getEstDte",
      },
      body: soapBody,
    });

    const xmlText = await response.text();
    const dtes: any[] = [];

    const matches = xmlText.match(
      /<MOVIMIENTO>[\s\S]*?<\/MOVIMIENTO>|<ns2:MOVIMIENTO>[\s\S]*?<\/ns2:MOVIMIENTO>/gi
    ) || [];

    for (const match of matches) {
      const folio = match.match(/<FOLIO>(.*?)<\/FOLIO>|<ns2:FOLIO>(.*?)<\/ns2:FOLIO>/i)?.[1] || match.match(/<FOLIO>(.*?)<\/FOLIO>|<ns2:FOLIO>(.*?)<\/ns2:FOLIO>/i)?.[2] || null;
      if (folio) {
        dtes.push({
          folio,
          dte_type: match.match(/<TIPO>(.*?)<\/TIPO>|<ns2:TIPO>(.*?)<\/ns2:TIPO>/i)?.[1] || match.match(/<TIPO>(.*?)<\/TIPO>|<ns2:TIPO>(.*?)<\/ns2:TIPO>/i)?.[2] || "39",
          net_amount: parseFloat(match.match(/<MONTO_NETO>(.*?)<\/MONTO_NETO>|<ns2:MONTO_NETO>(.*?)<\/ns2:MONTO_NETO>/i)?.[1] || match.match(/<MONTO_NETO>(.*?)<\/MONTO_NETO>|<ns2:MONTO_NETO>(.*?)<\/ns2:MONTO_NETO>/i)?.[2] || "0") || 0,
          iva_amount: parseFloat(match.match(/<MONTO_IVA>(.*?)<\/MONTO_IVA>|<ns2:MONTO_IVA>(.*?)<\/ns2:MONTO_IVA>/i)?.[1] || match.match(/<MONTO_IVA>(.*?)<\/MONTO_IVA>|<ns2:MONTO_IVA>(.*?)<\/ns2:MONTO_IVA>/i)?.[2] || "0") || 0,
          sii_status: match.match(/<ESTADO>(.*?)<\/ESTADO>|<ns2:ESTADO>(.*?)<\/ns2:ESTADO>/i)?.[1] || match.match(/<ESTADO>(.*?)<\/ESTADO>|<ns2:ESTADO>(.*?)<\/ns2:ESTADO>/i)?.[2] || "DNK",
        });
      }
    }

    return dtes;
  } catch (error) {
    throw new Error(`Failed to query DTEs: ${error}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: configs } = await supabase
      .from("sii_configurations")
      .select("*")
      .eq("active", true);

    if (!configs || configs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No active SII configurations found",
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

    const results = [];

    for (const config of configs) {
      try {
        const seed = await generateSeed(config.sii_environment || "production");
        const { token } = await getTokenFromSeed(
          seed,
          config.company_rut,
          config.sii_password_hash,
          config.sii_environment || "production"
        );

        await supabase.from("sii_sessions").upsert(
          {
            company_rut: config.company_rut,
            token,
            seed,
            is_valid: true,
          },
          { onConflict: "company_rut" }
        );

        const dtes = await queryCompanyDTEs(
          token,
          config.company_rut,
          config.sii_environment || "production"
        );

        let insertedCount = 0;
        for (const dte of dtes) {
          const { error } = await supabase.from("sii_dtes_sync").upsert(
            {
              company_rut: config.company_rut,
              folio: dte.folio,
              dte_type: dte.dte_type,
              document_type: "Boleta",
              emitter_rut: config.company_rut,
              emitter_name: config.company_name,
              receiver_rut: config.company_rut,
              receiver_name: config.company_name,
              issue_date: new Date().toISOString().split("T")[0],
              issue_datetime: new Date().toISOString(),
              net_amount: dte.net_amount,
              iva_amount: dte.iva_amount,
              total_amount: dte.net_amount + dte.iva_amount,
              sii_status: dte.sii_status,
              sii_response: { status: dte.sii_status },
            },
            { onConflict: "company_rut,folio" }
          );
          if (!error) insertedCount++;
        }

        await supabase.from("sii_company_data").upsert(
          {
            company_rut: config.company_rut,
            company_name: config.company_name,
            last_sync: new Date().toISOString(),
            sync_status: "success",
            total_emitted_documents: dtes.length,
          },
          { onConflict: "company_rut" }
        );

        await supabase.from("sii_sync_logs").insert({
          company_rut: config.company_rut,
          operation: "scheduled_sync",
          status: "success",
          records_processed: insertedCount,
        });

        results.push({
          company_rut: config.company_rut,
          dtes_synced: insertedCount,
          success: true,
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);

        await supabase.from("sii_sync_logs").insert({
          company_rut: config.company_rut,
          operation: "scheduled_sync",
          status: "failed",
          error_message: errorMsg,
        });

        results.push({
          company_rut: config.company_rut,
          success: false,
          error: errorMsg,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
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
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
