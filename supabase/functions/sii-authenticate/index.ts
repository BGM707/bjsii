import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AuthRequest {
  siiUsername: string;
  siiPasswordHash: string;
  environment: 'production' | 'test';
}

interface AuthResponse {
  token: string;
  expiresAt: string;
  sessionId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { siiUsername, siiPasswordHash, environment } = (await req.json()) as AuthRequest;

    if (!siiUsername || !siiPasswordHash) {
      throw new Error("Username and password are required");
    }

    const siiUrl = environment === 'production'
      ? 'https://palena.sii.cl/DTEWS/QueryEstDte.jws'
      : 'https://maullin.sii.cl/DTEWS/QueryEstDte.jws';

    // Simular autenticación automática con SII
    // En producción, esto requeriría certificado digital
    const token = generateToken(siiUsername);
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const response: AuthResponse = {
      token,
      expiresAt,
      sessionId,
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

function generateToken(username: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${username}_${timestamp}_${random}`;
}
