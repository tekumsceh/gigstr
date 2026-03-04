import React from 'react';

// This component wraps the standard input with your specific design system
const FormInput = React.forwardRef(({ 
  label, 
  id, 
  type = "text", 
  error, 
  className = "", 
  ...rest 
}, ref) => {
  return (
    <div className={`space-y-2 w-full ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 block"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        ref={ref}
        {...rest}
        className={`input-field w-full transition-colors duration-200 ${
          error 
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20 bg-red-500/5' 
            : 'border-slate-800 focus:border-slate-500 focus:ring-slate-500/20'
        }`}
      />
      {/* Automatic Error Display */}
      {error && (
        <p className="text-[9px] font-black uppercase tracking-widest text-red-500 ml-1 animate-in fade-in slide-in-from-top-1">
          {error.message}
        </p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;