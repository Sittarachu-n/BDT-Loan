export default { async fetch(request, env) { return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Site assets unavailable', { status: 503 }); } };
