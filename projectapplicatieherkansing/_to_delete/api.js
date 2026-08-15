const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Kleine fetch-wrapper zodat de API-url op één plek staat.
 * Gebruik: const data = await api('/api/health');
 */
export async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export { BASE_URL };
