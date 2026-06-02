export async function onRequestGet(context) {
  const { request } = context;
  
  // Define allowed origin for cross-domain data sharing
  const ALLOWED_ORIGIN = "https://nofreethinkers.com";

  // Standard CORS headers helper
  const corsHeaders = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json"
  };

  // 1. Extract the cookie from the browser request headers
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/discord_session=([^;]+)/);
  
  if (!match) {
    return new Response(JSON.stringify({ loggedIn: false }), { 
      status: 401, 
      headers: corsHeaders 
    });
  }

  const accessToken = match[1];

  try {
    // 2. Ask Discord who this access token belongs to
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ loggedIn: false }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const userData = await userResponse.json();

    // 3. Send their basic profile data back to your vanilla JavaScript frontend
    return new Response(JSON.stringify({
      loggedIn: true,
      username: userData.global_name || userData.username, 
      avatar: userData.avatar,
      id: userData.id
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

// Handle browser pre-flight checks seamlessly
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "https://nofreethinkers.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Cookie",
      "Access-Control-Allow-Credentials": "true"
    }
  });
}