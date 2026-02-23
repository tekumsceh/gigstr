export function Alert({ title, children, variant = 'alert', className = '' }) {
  // variants: 'success', 'error', 'alert'
  return (
    <div className={`alert alert-${variant} ${className}`} role="alert">
      {title && <h4 className="alert-title">{title}</h4>}
      <div className="alert-content">{children}</div>
    </div>
  );
}