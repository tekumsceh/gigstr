export function Badge({ children, variant = 'default', className = '' }) {
  // variants: 'default', 'success', 'error', 'alert'
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {children}
    </span>
  );
}