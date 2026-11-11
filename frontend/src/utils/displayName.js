export const FALLBACK_DISPLAY_NAME = 'Staff member';

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * The name to show for a signed-in user: their real full name, else their
 * email, else a neutral label. Never invents a person.
 */
export function displayNameFor(user) {
  return clean(user?.fullName)
    || clean(user?.user_metadata?.full_name)
    || clean(user?.email)
    || FALLBACK_DISPLAY_NAME;
}
