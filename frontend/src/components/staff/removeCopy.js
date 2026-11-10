// What the inline remove confirmation says: the person's role, every page
// they lose, and for a superadmin how many superadmins remain.
import { staffRoleLabel, rolePageNames, formatList } from '../../utils/staffAccess';

function superadminSentence(count) {
  if (count <= 1) return 'They are the only superadmin, so the server will refuse this.';
  const left = count - 1;
  return `They are one of ${count} superadmins, so this leaves ${left}.`;
}

export function removeCopy(person, superadminCount) {
  const pages = rolePageNames(person.role);
  const loses = pages.length ? `They lose access to ${formatList(pages)} immediately.` : 'They lose access immediately.';
  return {
    question: `Remove ${person.email} (${staffRoleLabel(person.role)})? ${loses}`,
    superadmins: person.role === 'SUPERADMIN' ? superadminSentence(superadminCount) : null
  };
}

// What an Undo could not bring back. Re-adding creates a fresh entry, so the
// last sign-in clears and "added by" becomes whoever pressed Undo.
export function restoreCaveats(notice, currentEmail) {
  const notes = [];
  if (notice.lastSeenAt) notes.push('They show as “Not signed in yet” until they next sign in.');
  if ((notice.addedBy || '').toLowerCase() !== (currentEmail || '').toLowerCase()) {
    notes.push('“Added by” now shows you.');
  }
  return notes.join(' ');
}
