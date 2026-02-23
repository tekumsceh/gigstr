export function Table({ children, className = '' }) {
  return (
    <div className="table-wrapper">
      <table className={`data-table ${className}`}>
        {children}
      </table>
    </div>
  );
}