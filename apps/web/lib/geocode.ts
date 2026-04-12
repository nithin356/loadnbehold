/**
 * Reverse geocode coordinates to an address using the free Nominatim API (OpenStreetMap).
 * Rate limit: 1 request/second. No API key needed.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  line1: string;
  city: string;
  state: string;
  zip: string;
  coordinates: [number, number]; // [lng, lat]
} | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'User-Agent': 'LoadNBehold/1.0' } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address;
    if (!addr) return null;

    // Build street address
    const houseNumber = addr.house_number || '';
    const road = addr.road || addr.street || '';
    const line1 = houseNumber && road ? `${houseNumber} ${road}` : road || data.display_name?.split(',')[0] || '';

    return {
      line1,
      city: addr.city || addr.town || addr.village || addr.hamlet || addr.county || '',
      state: addr.state || '',
      zip: addr.postcode || '',
      coordinates: [lng, lat],
    };
  } catch {
    return null;
  }
}

/**
 * Get the US state abbreviation from full name
 */
export function stateAbbreviation(fullName: string): string {
  const states: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  };
  // If already abbreviated
  if (fullName.length === 2) return fullName.toUpperCase();
  return states[fullName] || fullName.slice(0, 2).toUpperCase();
}
