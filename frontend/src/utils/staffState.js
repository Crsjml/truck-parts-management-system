// frontend/src/utils/staffState.js

// A staff row is an allowlist entry, not a user account. `lastSeenAt` is
// stamped by POST /api/staff/check on each successful staff sign-in, so a
// null value means the person has been allowlisted but never signed in.
const DORMANT_AFTER_DAYS = 60;

export const staffState = (lastSeenAt) => {
  if (!lastSeenAt) return 'invited';

  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return 'invited';

  const days = (Date.now() - seen) / 86400000;
  return days > DORMANT_AFTER_DAYS ? 'dormant' : 'active';
};

// ponytail: Intl.RelativeTimeFormat is stdlib and already localised — no
// date library needed for three thresholds.
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export const relativeTime = (iso) => {
  if (!iso) return 'never signed in';

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'never signed in';

  const seconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(seconds / 86400), 'day');
  return rtf.format(Math.round(seconds / 2592000), 'month');
};
