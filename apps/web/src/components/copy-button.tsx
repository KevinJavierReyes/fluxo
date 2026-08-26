'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Sin sistema de toasts en el proyecto — el feedback de "copiado" es el
 * propio ícono cambiando por 1.5s, no un mensaje aparte.
 */
export function CopyButton({
  value,
  label = 'Copiar',
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(className)}
      onClick={handleCopy}
      aria-label={label}
    >
      {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
      {copied ? 'Copiado' : label}
    </Button>
  );
}
