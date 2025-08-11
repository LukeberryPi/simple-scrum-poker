import { cn } from '../lib/utils';
import { FIBONACCI_DECK, type FibonacciValue } from '../types/index';
import { Button } from './ui/button';

interface FibonacciDeckProps {
  selectedValue?: FibonacciValue | null;
  onValueSelect?: (value: FibonacciValue) => void;
  disabled?: boolean;
  isRevealed?: boolean;
  className?: string;
}

export function FibonacciDeck({
  selectedValue,
  onValueSelect,
  disabled = false,
  isRevealed = false,
  className,
}: FibonacciDeckProps) {
  return (
    <div className={cn('grid grid-cols-6 gap-2 sm:grid-cols-11', className)}>
      {FIBONACCI_DECK.map((value) => (
        <Button
          className={cn(
            'aspect-[3/4] h-16 font-semibold text-lg',
            'transition-all duration-200',
            selectedValue === value && 'ring-2 ring-primary ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          disabled={disabled}
          key={value}
          onClick={() => onValueSelect?.(value)}
          variant={selectedValue === value ? 'default' : 'outline'}
        >
          {value}
        </Button>
      ))}
    </div>
  );
}
