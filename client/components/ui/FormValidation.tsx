import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos para validação
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationProps {
  errors: ValidationError[];
  className?: string;
}

// Componente para mostrar erros de validação
export function FormValidation({ errors, className }: FormValidationProps) {
  if (errors.length === 0) return null;

  return (
    <div className={cn(
      "rounded-lg border border-destructive/20 bg-destructive/10 p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-destructive mb-2">
            Corrija os seguintes erros:
          </h4>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-destructive">
                <strong>{error.field}:</strong> {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Componente para mensagem de sucesso
export interface SuccessMessageProps {
  message: string;
  onClose?: () => void;
  className?: string;
  autoHide?: boolean;
  duration?: number;
}

export function SuccessMessage({ 
  message, 
  onClose, 
  className,
  autoHide = false,
  duration = 3000
}: SuccessMessageProps) {
  React.useEffect(() => {
    if (autoHide && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoHide, onClose, duration]);

  return (
    <div className={cn(
      "rounded-lg border border-green-200 bg-green-50 p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-green-800">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Hook para gerenciar validação de formulários
export function useFormValidation() {
  const [errors, setErrors] = React.useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const addError = (field: string, message: string) => {
    setErrors(prev => {
      // Remove erro anterior do mesmo campo
      const filtered = prev.filter(err => err.field !== field);
      return [...filtered, { field, message }];
    });
  };

  const removeError = (field: string) => {
    setErrors(prev => prev.filter(err => err.field !== field));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const validateField = (field: string, value: any, rules: ValidationRule[]) => {
    for (const rule of rules) {
      const error = rule.validate(value);
      if (error) {
        addError(field, error);
        return false;
      }
    }
    removeError(field);
    return true;
  };

  const hasErrors = errors.length > 0;

  return {
    errors,
    isSubmitting,
    setIsSubmitting,
    addError,
    removeError,
    clearErrors,
    validateField,
    hasErrors
  };
}

// Regras de validação comuns
export interface ValidationRule {
  validate: (value: any) => string | null;
}

export const validationRules = {
  required: (fieldName: string): ValidationRule => ({
    validate: (value) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return `${fieldName} é obrigatório`;
      }
      return null;
    }
  }),

  minLength: (min: number, fieldName: string): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string' && value.length < min) {
        return `${fieldName} deve ter pelo menos ${min} caracteres`;
      }
      return null;
    }
  }),

  maxLength: (max: number, fieldName: string): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string' && value.length > max) {
        return `${fieldName} deve ter no máximo ${max} caracteres`;
      }
      return null;
    }
  }),

  email: (fieldName: string): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string' && value.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return `${fieldName} deve ser um email válido`;
        }
      }
      return null;
    }
  }),

  numeric: (fieldName: string): ValidationRule => ({
    validate: (value) => {
      if (value !== '' && value !== null && value !== undefined) {
        if (isNaN(Number(value))) {
          return `${fieldName} deve ser um número`;
        }
      }
      return null;
    }
  }),

  positive: (fieldName: string): ValidationRule => ({
    validate: (value) => {
      const num = Number(value);
      if (!isNaN(num) && num <= 0) {
        return `${fieldName} deve ser maior que zero`;
      }
      return null;
    }
  }),

  custom: (validationFn: (value: any) => string | null): ValidationRule => ({
    validate: validationFn
  })
};

// Componente de campo com validação integrada
export interface ValidatedFieldProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  validationRules?: ValidationRule[];
  type?: 'text' | 'email' | 'number' | 'password' | 'textarea';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export function ValidatedField({
  label,
  value,
  onChange,
  onBlur,
  validationRules = [],
  type = 'text',
  placeholder,
  className,
  disabled = false,
  error
}: ValidatedFieldProps) {
  const [localError, setLocalError] = React.useState<string>('');

  const handleBlur = () => {
    if (validationRules.length > 0) {
      for (const rule of validationRules) {
        const validationError = rule.validate(value);
        if (validationError) {
          setLocalError(validationError);
          break;
        }
      }
    }
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = type === 'number' ? Number(e.target.value) : e.target.value;
    onChange(newValue);
    
    // Limpar erro local quando usuário digita
    if (localError) {
      setLocalError('');
    }
  };

  const displayError = error || localError;

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2">
        {label}
        {validationRules.some(rule => rule === validationRules.find(r => r.validate('') !== null)) && (
          <span className="text-destructive ml-1">*</span>
        )}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 border rounded-lg bg-background text-foreground",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            displayError && "border-destructive",
            disabled && "opacity-50 cursor-not-allowed",
            "min-h-[80px] resize-vertical"
          )}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full px-3 py-2 border rounded-lg bg-background text-foreground",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            displayError && "border-destructive",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      )}
      
      {displayError && (
        <p className="text-sm text-destructive mt-1">{displayError}</p>
      )}
    </div>
  );
}

// Modal de confirmação para substituir confirm()
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg border shadow-lg max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{message}</p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-muted"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "px-4 py-2 rounded-lg font-medium",
              variant === 'destructive'
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
