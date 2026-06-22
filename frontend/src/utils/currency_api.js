// frontend/src/utils/currency_api.js

const API_URL = 'https://api.exchangerate-api.com/v4/latest/PHP';
let cachedRates = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function fetchExchangeRates() {
  const now = Date.now();
  if (cachedRates && now - lastFetchTime < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    cachedRates = data.rates;
    lastFetchTime = now;
    return cachedRates;
  } catch (error) {
    console.error("Failed to fetch exchange rates:", error);
    // Fallback static rates if API fails
    return {
      PHP: 1,
      USD: 0.017,
      EUR: 0.016,
      JPY: 2.65,
      GBP: 0.014
    };
  }
}
