import { CATEGORY_GROUP_ICONS, DEFAULT_GROUP_ICON } from '@/lib/category-group-visuals';
import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  sm: 'size-5 [&_svg]:size-3',
  default: 'size-6 [&_svg]:size-3.5',
};

export function GroupChip({
  color,
  icon,
  size = 'default',
  className,
}: {
  color: string;
  icon: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const Icon = CATEGORY_GROUP_ICONS[icon] ?? CATEGORY_GROUP_ICONS[DEFAULT_GROUP_ICON];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        SIZE_CLASSES[size],
        className,
      )}
      style={{ backgroundColor: `${color}26`, color }}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}
