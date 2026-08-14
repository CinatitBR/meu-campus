export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight handling
    if (request.method === "OPTIONS") {
      return handleCors();
    }

    // Route: POST /api/images/upload
    if (request.method === "POST" && url.pathname === "/api/images/upload") {
      return handleImageUpload(request, env);
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function handleCors() {
  return new Response(null, { headers: corsHeaders });
}

async function handleImageUpload(request, env) {
  const url = new URL(request.url);
  const baseUrl = url.origin;
  try {
    const formData = await request.formData();
    const file = formData.get("image");
    const lonStr = formData.get("lon");
    const latStr = formData.get("lat");
    const folder = formData.get("folder");

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "No image file provided." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // 1. Parse optional GPS coordinates. Round to 6 decimal digits (the recommended precision)
    const lon =
      lonStr !== null && lonStr !== ""
        ? Math.round(parseFloat(lonStr) * 1e6) / 1e6
        : null;
    const lat =
      latStr !== null && latStr !== ""
        ? Math.round(parseFloat(latStr) * 1e6) / 1e6
        : null;

    // 2. Generate unique identifiers and the R2 storage key
    const id = `img_${crypto.randomUUID()}`;
    const extension = file.type.split("/").pop();
    const storageKey = `${folder}/${id}.${extension}`;

    // 3. Upload binary buffer to Cloudflare R2
    const fileArrayBuffer = await file.arrayBuffer();
    await env.BUCKET.put(storageKey, fileArrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // 4. Save metadata to Cloudflare D1
    const query = `
      INSERT INTO image_metadata (id, storage_key, lon, lat, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `;
    await env.DB.prepare(query).bind(id, storageKey, lon, lat).run();

    // 5. Construct public CDN URL
    const cdnBase = baseUrl;
    const publicUrl = `${cdnBase}/${storageKey}`;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id,
          storage_key: storageKey,
          url: publicUrl,
          lon,
          lat,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: "Upload failed", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
}
