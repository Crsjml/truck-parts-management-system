const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

let _cachedToken = null;
let _tokenExpiry = 0;

export const getToken = async (supabase) => {
  const now = Date.now();
  if (!_cachedToken || now > _tokenExpiry) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      _cachedToken = session.access_token;
      _tokenExpiry = now + 60_000;
    } else {
      _cachedToken = null;
      _tokenExpiry = 0;
    }
  }
  return _cachedToken;
};

export const invalidateToken = () => {
  _cachedToken = null;
  _tokenExpiry = 0;
};

async function getAuthHeaders(supabase) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const token = await getToken(supabase);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {
    console.warn('Supabase token error', e);
  }
  return headers;
}

async function request(method, path, { body, timeoutMs = 8000, supabase } = {}) {
  const headers = await getAuthHeaders(supabase);
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
    cache: method === 'GET' ? 'no-cache' : 'default',
  });
  const contentType = res.headers.get('content-type');
  const data = contentType?.includes('application/json')
    ? await res.json()
    : { msg: (await res.text()) || `HTTP error ${res.status}` };
  return { ok: res.ok, status: res.status, data };
}

export const apiGet = (path, opts) => request('GET', path, opts);
export const apiPost = (path, body, opts) => request('POST', path, { ...opts, body });
export const apiPut = (path, body, opts) => request('PUT', path, { ...opts, body });
export const apiDelete = (path, opts) => request('DELETE', path, opts);
