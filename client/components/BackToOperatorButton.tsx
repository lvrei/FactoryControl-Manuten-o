import React from 'react';
import { ChevronLeft, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBackToOperator } from '@/hooks/useBackToOperator';

interface BackToOperatorButtonProps {
  onClick?: () => void;
  className?: string;
  variant?: 'button' | 'header' | 'link';
  useRouter?: boolean;
}

export function BackToOperatorButton({
  onClick,
  className,
  variant = 'button',
  useRouter = false
}: BackToOperatorButtonProps) {
  const { goBackToOperator } = useBackToOperator();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (useRouter) {
      goBackToOperator();
    }
  };
  
  if (variant === 'header') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 text-primary hover:text-primary/80",
          "transition-colors duration-200 font-medium text-sm",
          className
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        <Users className="h-4 w-4" />
        Portal do Operador
      </button>
    );
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 text-blue-600 hover:text-blue-800",
          "text-sm underline underline-offset-2",
          className
        )}
      >
        <ChevronLeft className="h-3 w-3" />
        Voltar ao Portal do Operador
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "transition-colors duration-200 font-medium",
        className
      )}
    >
      <ChevronLeft className="h-4 w-4" />
      <Users className="h-4 w-4" />
      Portal do Operador
    </button>
  );
}
