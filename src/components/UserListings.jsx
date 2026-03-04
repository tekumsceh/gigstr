import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function UserListings({ userData = [], loading }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  // Mouse Drag-to-Scroll Logic for Desktop
  const handleMouseDown = (e) => {
    const slider = scrollRef.current;
    if (!slider) return;

    let isDown = true;
    let startX = e.pageX - slider.offsetLeft;
    let scrollLeft = slider.scrollLeft;

    const endDrag = () => {
      isDown = false;
      slider.classList.remove('active');
      window.removeEventListener('mousemove', moveSlider);
      window.removeEventListener('mouseup', endDrag);
    };

    const moveSlider = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      // Multiply by 2 for a faster, more responsive "whip" feel
      const walk = (x - startX) * 2; 
      slider.scrollLeft = scrollLeft - walk;
    };

    window.addEventListener('mousemove', moveSlider);
    window.addEventListener('mouseup', endDrag);
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden py-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="w-12 h-12 rounded-full bg-slate-800 animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        /* - py-2 provides space for the hover scale so it doesn't clip
           - hide-scrollbar removes the scrollbar visually (defined in index.css)
           - cursor-grab gives the "draggable" visual cue
        */
        className="flex gap-4 overflow-x-auto py-2 hide-scrollbar items-center cursor-grab active:cursor-grabbing select-none"
      >
        {userData.map((user, index) => {
          const userId = user.id || `user-${index}`;
          const isOnline = user.status === 'online' || user.status === true;

          return (
            <div 
              key={userId}
              onClick={() => navigate(`/users/${userId}`)}
              /* hover:z-10 ensures the scaled avatar stays above its neighbors */
              className="relative flex-shrink-0 transition-all duration-200 hover:scale-110 hover:z-10 active:scale-95 group"
            >
              {/* Avatar Circle */}
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border-2 border-transparent group-hover:border-slate-500 transition-colors shadow-xl">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.firstName || 'User'} 
                    className="w-full h-full object-cover pointer-events-none" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-[14px] font-black uppercase">
                    {(user.firstName || 'U').charAt(0)}
                  </div>
                )}
              </div>

              {/* Status Dot - Pinned to bottom right */}
              {isOnline && (
                <div 
                  className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#0f172a] shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UserListings;