import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRANSACTION_TYPE_META } from '@/lib/transaction-type';

type TransactionTypeValue = keyof typeof TRANSACTION_TYPE_META;

export function TransactionTypeSelect({
  value,
  onValueChange,
  triggerClassName = 'w-36',
  allowAll = false,
  allLabel = 'Todos',
}: {
  value: TransactionTypeValue | 'all';
  onValueChange: (value: TransactionTypeValue | 'all') => void;
  triggerClassName?: string;
  /** Agrega una opción "Todos" al inicio, para usar como filtro. */
  allowAll?: boolean;
  allLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange((v as TransactionTypeValue | 'all') ?? value)}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue>
          {(v: TransactionTypeValue | 'all') => {
            if (v === 'all') return allLabel;
            const meta = TRANSACTION_TYPE_META[v];
            const Icon = meta.icon;
            return (
              <span className="flex items-center gap-1.5">
                <Icon className={meta.variant === 'success' ? 'text-success' : 'text-destructive'} />
                {meta.label}
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">{allLabel}</SelectItem>}
        {(Object.keys(TRANSACTION_TYPE_META) as TransactionTypeValue[]).map((key) => {
          const meta = TRANSACTION_TYPE_META[key];
          const Icon = meta.icon;
          return (
            <SelectItem key={key} value={key}>
              <Icon className={meta.variant === 'success' ? 'text-success' : 'text-destructive'} />
              {meta.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
