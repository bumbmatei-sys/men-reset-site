const PLUNK_CONTACTS = 'https://next-api.useplunk.com/contacts';

/**
 * Adds the address to Plunk as a subscribed contact.
 * Does not send a message. Does not log the address or the key.
 * An existing contact counts as success.
 */
export async function subscribeContact(apiKey: string | undefined, email: string): Promise<boolean> {
  if (!apiKey) return false;
  try {
    const response = await fetch(PLUNK_CONTACTS, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, subscribed: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 409) return true;
    if (!response.ok) return false;
    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null) return false;
    if ('success' in data) return data.success === true;
    return 'id' in data || 'email' in data || 'contact' in data;
  } catch (error) {
    console.error('newsletter_contact_failed', error instanceof Error ? error.name : 'unknown');
    return false;
  }
}
