export async function onRequestPost(context) {
  const origin = new URL(context.request.url).origin;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
  };

  try {
    const body = await context.request.json();

    if (body._hp) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    const name = (body.name || "").replace(/[\r\n]/g, " ").trim().slice(0, 200);
    const email = (body.email || "").trim().slice(0, 200);
    const message = (body.message || "").trim().slice(0, 2000);

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "All fields are required." }),
        { status: 400, headers }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address." }),
        { status: 400, headers }
      );
    }

    const ntfyToken = context.env.NTFY_TOKEN;
    if (!ntfyToken) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured." }),
        { status: 500, headers }
      );
    }

    const ntfyBody = `From: ${name}\nEmail: ${email}\n\n${message}`;

    await fetch("https://ntfy.canonspike.com/canonspike-contact", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ntfyToken}`,
        "Title": `Advisory inquiry from ${name}`,
        "Priority": "4",
        "Tags": "briefcase",
        "Click": `mailto:${email}`,
      },
      body: ntfyBody,
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch {
    return new Response(
      JSON.stringify({ error: "Something went wrong. Try again." }),
      { status: 500, headers }
    );
  }
}

export async function onRequestOptions(context) {
  const origin = new URL(context.request.url).origin;
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
