export const applyFilters = (data, filters) => {
  let filtered = [...data];
  const now = new Date();

  // Filter by Year
  if (filters.year !== 'all') {
    filtered = filtered.filter(item => new Date(item.dateDate).getFullYear().toString() === filters.year);
  }

  // Filter by Timeline (Held vs Upcoming)
  if (filters.timeline === 'upcoming') {
    filtered = filtered.filter(item => new Date(item.dateDate) >= now);
  } else if (filters.timeline === 'held') {
    filtered = filtered.filter(item => new Date(item.dateDate) < now);
  }

  // Filter by Paid (Assuming dateStatus 1 is paid, customize as needed)
      const statusFilter = filters.paymentStatus?.value || filters.paid;

      if (statusFilter === 'paid') {
        filtered = filtered.filter(item => 
          parseFloat(item.datePaidAmount || 0) >= parseFloat(item.datePrice || 0)
        );
      } else if (statusFilter === 'unpaid') {
        filtered = filtered.filter(item => 
          parseFloat(item.datePaidAmount || 0) < parseFloat(item.datePrice || 0)
        );
      }

  // Sorting
  filtered.sort((a, b) => {
    const dateA = new Date(a.dateDate);
    const dateB = new Date(b.dateDate);
    return filters.sort === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return filtered;
};

