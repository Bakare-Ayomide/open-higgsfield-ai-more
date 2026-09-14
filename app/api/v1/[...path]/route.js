export const dynamic = 'force-dynamic';

const UPSTREAM_BASE_URL = 'https://api.muapi.ai/api/v1';

async function getTargetUrl(req, params) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams?.path;
  const path = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments || '';
  const { search } = new URL(req.url);
  return `${UPSTREAM_BASE_URL}/${path}${search}`;
}

function getApiKey(req) {
  return req.headers.get('x-api-key') || process.env.MUAPI_KEY || '';
}

export async function GET(req, { params }) {
  try {
    const targetUrl = await getTargetUrl(req, params);
    const apiKey = getApiKey(req);

    const headers = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    const bodyText = await response.text();
    return new Response(bodyText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Internal proxy error' },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  try {
    const targetUrl = await getTargetUrl(req, params);
    const apiKey = getApiKey(req);
    const contentType = req.headers.get('content-type') || '';

    const headers = {};
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    let outgoingBody;

    if (contentType.includes('multipart/form-data')) {
      const incomingFormData = await req.formData();
      const outgoingFormData = new FormData();
      for (const [key, value] of incomingFormData.entries()) {
        outgoingFormData.append(key, value);
      }
      outgoingBody = outgoingFormData;
      // Do NOT set Content-Type header when body is FormData; fetch will set boundary automatically
    } else {
      headers['Content-Type'] = contentType || 'application/json';
      outgoingBody = await req.text();
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: outgoingBody,
    });

    const bodyText = await response.text();
    return new Response(bodyText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    return Response.json(
      { error: err.message || 'Internal proxy error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
