import { useSettings } from '../../context/SettingsContext';
import { sellsAtText } from '../../utils/markup';

// Live selling-price preview shown under a cost input. Point the input's
// aria-describedby at `id` so screen readers announce it with the field.
export default function SellsAtHint({ id, cost, markupOverride, className = 'text-2xs font-semibold text-muted-foreground' }) {
  const { formatCurrency } = useSettings();
  return (
    <p id={id} className={className} aria-live="polite">
      {sellsAtText(formatCurrency, cost, markupOverride)}
    </p>
  );
}
