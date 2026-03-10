import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layouts/PageWrapper';
import TwoColumnLayout from '../components/layouts/TwoColumnLayout';

const MENU_ITEMS = [
  { id: 'finances', label: 'Finances' },
  { id: 'band-options', label: 'Band options' }
];

function BandAdminView() {
  const { id: bandID } = useParams();
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = React.useState('finances');

  const sideContent = (
    <nav className="flex flex-col gap-1">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
        Admin
      </div>
      {MENU_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setActiveMenu(item.id)}
          className={`text-left px-4 py-3 rounded-lg border text-sm font-semibold transition-colors ${
            activeMenu === item.id
              ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          {item.label}
        </button>
      ))}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={() => navigate(`/band/${bandID}/manage`)}
          className="text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-300"
        >
          ← Back to roster
        </button>
      </div>
    </nav>
  );

  const financesWorkspace = (
    <div className="flex flex-col gap-4">
      <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-white border-b border-slate-800 pb-4">
        Finances workspace
      </h2>
      <p className="text-slate-400 text-sm">
        This is a placeholder for the band finance overview (events, payouts, expenses). We&apos;ll wire
        up the real data and actions here later.
      </p>
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 text-sm text-slate-400">
        <p className="font-semibold text-slate-200 mb-2">Coming soon</p>
        <p>
          You&apos;ll be able to see all gigs for this band, how much was agreed, what was paid in, and
          how much each member is owed.
        </p>
      </div>
    </div>
  );

  const bandOptionsWorkspace = (
    <div className="flex flex-col gap-4">
      <h2 className="text-[14px] font-black uppercase tracking-[0.2em] text-white border-b border-slate-800 pb-4">
        Band options
      </h2>
      <p className="text-slate-400 text-sm">
        This area is reserved for additional band settings (branding, defaults, etc.). For now it&apos;s
        only visual.
      </p>
    </div>
  );

  const workspaceContent = activeMenu === 'finances' ? financesWorkspace : bandOptionsWorkspace;

  return (
    <PageWrapper>
      <TwoColumnLayout
        reverse={true}
        sideContent={sideContent}
        mainContent={
          <div className="flex flex-col gap-4">
            <h1 className="text-[14px] font-black uppercase tracking-[0.2em] text-white border-b border-slate-800 pb-2">
              Band admin
            </h1>
            {workspaceContent}
          </div>
        }
      />
    </PageWrapper>
  );
}

export default BandAdminView;

