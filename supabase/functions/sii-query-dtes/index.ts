import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DTERecord {
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

async function parseSOAPResponse(xmlText: string): Promise<DTERecord[]> {
  const dtes: DTERecord[] = [];

  const estatusPattern =
    /<ESTADO>(.*?)<\/ESTADO>|<ns2:ESTADO>(.*?)<\/ns2:ESTADO>/gi;
  const folioPattern = /<FOLIO>(.*?)<\/FOLIO>|<ns2:FOLIO>(.*?)<\/ns2:FOLIO>/gi;
  const typePattern = /<TIPO>(.*?)<\/TIPO>|<ns2:TIPO>(.*?)<\/ns2:TIPO>/gi;

  const matches = xmlText.match(
    /<MOVIMIENTO>[\s\S]*?<\/MOVIMIENTO>|<ns2:MOVIMIENTO>[\s\S]*?<\/ns2:MOVIMIENTO>/gi
  ) || [];

  for (const match of matches) {
    const folio =
      match.match(/<FOLIO>(.*?)<\/FOLIO>|<ns2:FOLIO>(.*?)<\/ns2:FOLIO>/i)?.[1] ||
      match.match(/<FOLIO>(.*?)<\/FOLIO>|<ns2:FOLIO>(.*?)<\/ns2:FOLIO>/i)?.[2] ||
      "N/A";
    const tipo =
      match.match(/<TIPO>(.*?)<\/TIPO>|<ns2:TIPO>(.*?)<\/ns2:TIPO>/i)?.[1] ||
      match.match(/<TIPO>(.*?)<\/TIPO>|<ns2:TIPO>(.*?)<\/ns2:TIPO>/i)?.[2] ||
      "39";
    const estado =
      match.match(/<ESTADO>(.*?)<\/ESTADO>|<ns2:ESTADO>(.*?)<\/ns2:ESTADO>/i)?.[1] ||
      match.match(/<ESTADO>(.*?)<\/ESTADO>|<ns2:ESTADO>(.*?)<\/ns2:ESTADO>/i)?.[2] ||
      "DNK";
    const montoNeto =
      parseFloat(
        match.match(
          /<MONTO_NETO>(.*?)<\/MONTO_NETO>|<ns2:MONTO_NETO>(.*?)<\/ns2:MONTO_NETO>/i
        )?.[1] ||
          match.match(
            /<MONTO_NETO>(.*?)<\/MONTO_NETO>|<ns2:MONTO_NETO>(.*?)<\/ns2:MONTO_NETO>/i
          )?.[2] ||
          "0"
      ) || 0;
    const montoIVA =
      parseFloat(
        match.match(
          /<MONTO_IVA>(.*?)<\/MONTO_IVA>|<ns2:MONTO_IVA>(.*?)<\/ns2:MONTO_IVA>/i
        )?.[1] ||
          match.match(
            /<MONTO_IVA>(.*?)<\/MONTO_IVA>|<ns2:MONTO_IVA>(.*?)<\/ns2:MONTO_IVA>/i
          )?.[2] ||
          "0"
      ) || 0;

    if (folio && folio !== "N/A") {
      dtes.push({
        folio,
        dte_type: tipo,
        emitter_rut: "78.332.298-6",
        emitter_name: "BJ SERVICIOS",
        receiver_rut: "N/A",
        receiver_name: "N/A",
        issue_date: new Date().toISOString().split("T")[0],
        net_amount: montoNeto,
        iva_amount: montoIVA,
        total_amount: montoNeto + montoIVA,
        sii_status: estado,
      });
    }
  }

  return dtes;
}

async function queryCompanyDTEs(
  token: string,
  companyRut: string,
  environment: string
): Promise<DTERecord[]> {
  const siiUrl =
    environment === "production"
      ? "https://palena.sii.cl/DTEWS/QueryEstDte.jws"
      : "https://maullin.sii.cl/DTEWS/QueryEstDte.jws";

  const rutWithoutDV = companyRut.split("-")[0];
  const dv = companyRut.split("-")[1];

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
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
    const dtes = await parseSOAPResponse(xmlText);
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
    const { companyRut, token, environment = "production" } = await req.json();

    if (!token) {
      throw new Error("Token is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const dtes = await queryCompanyDTEs(token, companyRut, environment);

    let successCount = 0;
    for (const dte of dtes) {
      try {
        await supabase.from("sii_dtes_sync").upsert(
          {
            company_rut: companyRut,
            folio: dte.folio,
            dte_type: dte.dte_type,
            document_type: "Boleta",
            emitter_rut: dte.emitter_rut,
            emitter_name: dte.emitter_name,
            receiver_rut: dte.receiver_rut,
            receiver_name: dte.receiver_name,
            issue_date: dte.issue_date,
            issue_datetime: new Date().toISOString(),
            net_amount: dte.net_amount,
            iva_amount: dte.iva_amount,
            total_amount: dte.total_amount,
            sii_status: dte.sii_status,
            sii_response: { status: dte.sii_status },
          },
          { onConflict: "company_rut,folio" }
        );
        successCount++;
      } catch (e) {
        console.error(`Failed to insert DTE ${dte.folio}:`, e);
      }
    }

    await supabase.from("sii_company_data").upsert(
      {
        company_rut: companyRut,
        last_sync: new Date().toISOString(),
        sync_status: "success",
        total_emitted_documents: dtes.length,
      },
      { onConflict: "company_rut" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        dtes_synced: successCount,
        total_dtes: dtes.length,
        data: dtes.slice(0, 50),
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
