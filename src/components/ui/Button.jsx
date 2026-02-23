export function Button({ children, variant = 'primary', className = '', ...props }) {
  // variants: 'primary', 'secondary', 'outline', 'destructive'
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}