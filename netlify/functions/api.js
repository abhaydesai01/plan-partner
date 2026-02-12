/**
 * Netlify serverless function: proxies API requests to your HTTP backend.
 * Fixes Mixed Content (HTTPS page calling HTTP API) by making the call server-side.
 *
 * Frontend should use VITE_API_URL=/.netlify/functions/api on Netlify.
 * Set BACKEND_URL in Netlify env (e.g. http://13.233.110.45:3001).
 */

const FUNCTION_PATH = "/.netlify/functions/api";

exports.handler = async (event) => {
  const backendUrl = process.env.BACKEND_URL || "http://13.233.110.45:3001";
  const base = backendUrl.replace(/\/$/, "");

  // event.path is e.g. "/.netlify/functions/api/user_roles" or "/.netlify/functions/api/patients/123"
  const path = event.path.startsWith(FUNCTION_PATH)
    ? event.path.slice(FUNCTION_PATH.length) || "/"
    : event.path;
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  const query = event.queryStringParameters
    ? "?" + new URLSearchParams(event.queryStringParameters).toString()
    : "";
  const url = `${base}/api${apiPath}${query}`;

  const headers = { "Content-Type": "application/json" };
  if (event.headers.authorization) headers["Authorization"] = event.headers.authorization;
  if (event.headers["content-type"]) headers["Content-Type"] = event.headers["content-type"];

  const options = {
    method: event.httpMethod,
    headers,
    body: event.body && (event.httpMethod === "POST" || event.httpMethod === "PATCH" || event.httpMethod === "PUT")
      ? event.body
      : undefined,
  };

  try {
    const res = await fetch(url, options);
    const text = await res.text();
    const contentType = res.headers.get("content-type") || "application/json";

    return {
      statusCode: res.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
      body: text,
    };
  } catch (err) {
    console.error("Proxy error:", err.message);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Bad Gateway", message: err.message }),
    };
  }
};
