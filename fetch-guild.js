// 1. Listen for standard HTTP requests from your index.html website
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// 2. Listen for your 15-minute automated Cron Trigger schedule
addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event));
});

async function handleRequest(request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://nofreethinkers.com", // Matches your domain
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Content-Type": "application/json"
  };

  // Handle preflight OPTIONS requests for CORS safety
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);

  // Endpoint: https://your-worker.workers.dev/api/guild
  if (url.pathname === "/api/guild") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/guild_stats?id=eq.CURRENT_STATS&select=*`, {
      headers: { "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY }
    });
    const data = await res.json();
    return new Response(JSON.stringify(data[0] || {}), { headers: corsHeaders });
  }

  // Endpoint: https://your-worker.workers.dev/api/top-kills
  if (url.pathname === "/api/top-kills") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/top-kills?id=eq.1&select=*`, {
      headers: { "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY }
    });
    const data = await res.json();
    return new Response(JSON.stringify(data[0]?.payload || []), { headers: corsHeaders });
  }

  return new Response("Endpoint Not Found", { status: 404, headers: corsHeaders });
}

async function handleScheduled(event) {
  const ALBION_GUILD_ID = "AIbIw4erSVyHg9Ab6LVtdA"; // Swap with your real ID string
  
  const guildApiUrl = `https://gameinfo.albiononline.com/api/gameinfo/guilds/${ALBION_GUILD_ID}`;
  const killsApiUrl = `https://gameinfo.albiononline.com/api/gameinfo/guilds/${ALBION_GUILD_ID}/top?range=week`;

  try {
    // Sync Guild Core Records
    const guildRes = await fetch(guildApiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (guildRes.ok) {
      const data = await guildRes.json();
      
      const updatePayload = {
        name: data.Name,
        alliance_tag: data.AllianceTag || null,
        alliance_name: data.AllianceName || null,
        member_count: data.MemberCount,
        kill_fame: data.killFame,
        updated_at: new Date().toISOString()
      };

      await fetch(`${SUPABASE_URL}/rest/v1/guild_stats?id=eq.CURRENT_STATS`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatePayload)
      });
    }

    // Sync Weekly Leaderboards
    const killsRes = await fetch(killsApiUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (killsRes.ok) {
      const killsData = await killsRes.json();

      await fetch(`${SUPABASE_URL}/rest/v1/top-kills?id=eq.1`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          payload: killsData,
          updated_at: new Date().toISOString()
        })
      });
    }
    
    console.log("Supabase database successfully synchronized.");
  } catch (err) {
    console.error("Background sync failed:", err);
  }
}