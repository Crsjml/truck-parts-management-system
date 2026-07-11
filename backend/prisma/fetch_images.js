export async function fetchPartImage(query) {
  try {
    // 1. Get the VQD token
    const res1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await res1.text();
    const vqdMatch = html.match(/vqd=["']([^"']+)["']/);
    
    if (!vqdMatch) {
      console.warn('Could not find VQD token for query:', query);
      return null;
    }
    
    const vqd = vqdMatch[1];
    
    // 2. Fetch images
    const res2 = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    
    const data = await res2.json();
    if (data && data.results && data.results.length > 0) {
      return data.results[0].image;
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to fetch image for ${query}:`, error.message);
    return null;
  }
}
