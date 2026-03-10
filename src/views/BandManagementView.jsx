import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PageWrapper from '../components/layouts/PageWrapper';
import TwoColumnLayout from '../components/layouts/TwoColumnLayout';
import FormInput from '../components/FormInput';
import UserSearch from '../components/UserSearch';

function BandManagementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getBandRole, isGlobalAdmin, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  
  const [band, setBand] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm();

  // 1. Authorization Logic (Strict RBAC)
  const userRole = getBandRole(id);
  const isMember = isGlobalAdmin() || !!userRole; 
  const isOwner = isGlobalAdmin() || userRole === 'owner';
  const isAdmin = isOwner || userRole === 'admin';

  // Helper function to determine if the current user can delete a specific target user
  const canRemoveMember = (targetRole) => {
    if (isOwner) return true; // Owner can kick anyone (except maybe themselves, handled later)
    if (isAdmin && targetRole === 'bandit') return true; // Admins can only kick bandits
    return false; // Bandits can't kick anyone, Admins can't kick Admins/Owners
  };

  const loadBandData = async () => {
    try {
      const [bandRes, membersRes] = await Promise.all([
        axios.get(`/api/bands/${id}`),
        axios.get(`/api/band/${id}/roster`) // <--- UPDATED TO HIT THE NEW ROUTE
      ]);
      setBand(bandRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      console.error("Failed to load band data", err);
      setError(t('bandManagement.failedLoad'));
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
    if (authLoading) return; // Wait for AuthContext to finish waking up

    if (isMember) {
      loadBandData(); // Fetch the data, then stop loading
    } else {
      setLoading(false); // Stop loading immediately so the Access Denied screen can render!
    }
  }, [id, authLoading, isMember]);

  const onSubmitInvite = async (data) => {
    try {
      await axios.post(`/api/bands/${id}/members`, data);
      reset(); 
      loadBandData(); 
    } catch (err) {
      alert(err.response?.data?.error || t('bandManagement.failedAddMember'));
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (window.confirm(t('bandManagement.confirmRemoveMember'))) {
      try {
        await axios.delete(`/api/bands/${id}/members/${targetUserId}`);
        loadBandData();
      } catch (err) {
        alert(t('bandManagement.failedRemoveMember'));
      }
    }
  };

  if (authLoading || loading) return <div className="p-20 text-center font-black uppercase text-slate-500">{t('bandManagement.loadingCommand')}</div>;
  
  if (!isMember) {
    return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
        <h2 className="text-red-500 font-black uppercase tracking-widest text-2xl">{t('bandManagement.accessDenied')}</h2>
        <p className="text-slate-400">{t('bandManagement.notMember')}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest mt-4 hover:bg-slate-700 transition-colors">{t('bandManagement.returnHome')}</button>
      </div>
    );
  }

  if (error) return <div className="p-20 text-center text-red-500 font-black uppercase">{error}</div>;

  const accentColor = band?.bandColor || '#ff5f00';

  return (
    <PageWrapper>
      <div className="mb-8 p-10 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between" style={{ borderLeft: `10px solid ${accentColor}` }}>
        <div>
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">
            {band?.bandName}
          </h1>
          <span className="text-[12px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 block">
            {t('bandManagement.rosterManagement')}
          </span>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate(`/band/${id}/admin`)}
            className="px-5 py-2 rounded-lg border border-orange-500/60 bg-orange-500/10 text-[10px] font-black uppercase tracking-[0.25em] text-orange-400 hover:bg-orange-500/20 hover:border-orange-400 transition-colors"
          >
            Admin / finances
          </button>
        )}
      </div>

      <TwoColumnLayout 
        mainContent={
          <div className="flex flex-col gap-4">
            <h3 className="text-[14px] font-black uppercase tracking-[0.2em] text-white border-b border-slate-800 pb-4 mb-4">{t('bandManagement.currentRoster')}</h3>
            
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
              {members.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-black uppercase text-[12px] tracking-widest">{t('bandManagement.noMembersFound')}</div>
              ) : (
                <ul className="divide-y divide-slate-800">
  {members.map((member) => (
    // Note: The new route returns member.id instead of member.userID, so we use member.id for the key and target
    <li key={member.id} className="flex justify-between items-center p-6 hover:bg-slate-800/30 transition-colors">
      <div className="flex flex-col">
        <span className="text-white font-bold text-lg">{member.username || member.displayName}</span>
        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">{member.email}</span>
      </div>
      <div className="flex items-center gap-6">
        
        {/* NEW: Status Badge (Pending vs Active) */}
        <span className={`px-2 py-1 border text-[9px] font-black uppercase tracking-widest rounded-sm ${
          member.status === 'active' 
            ? 'bg-green-500/10 border-green-500/30 text-green-500' 
            : 'bg-orange-500/10 border-orange-500/30 text-orange-500 animate-pulse'
        }`}>
          {member.status || t('bandManagement.active')}
        </span>

        <span className={`px-3 py-1 border text-[10px] font-black uppercase tracking-widest rounded-sm ${
          member.role === 'owner' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' :
          member.role === 'admin' ? 'bg-blue-500/10 border-blue-500/50 text-blue-500' :
          'bg-slate-950 border-slate-700 text-slate-300'
        }`}>
          {t('bandManagement.' + (member.role || 'bandit'))}
        </span>
        
        {canRemoveMember(member.role) && (
          <button 
            onClick={() => handleRemoveMember(member.id)}
            className="text-red-500/50 hover:text-red-500 transition-colors"
            title={member.status === 'pending' ? t('bandManagement.cancelInvite') : t('bandManagement.removeMember')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </li>
  ))}
</ul>
              )}
            </div>
          </div>
        }
        sideContent={
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-lg shadow-xl">
            {isAdmin ? (
              <>
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-orange-500 mb-6 border-b border-slate-800 pb-4">{t('bandManagement.addNewMember')}</h3>
                <form onSubmit={handleSubmit(onSubmitInvite)} className="space-y-6" autoComplete="off">
                  <div className="space-y-1">
                    <UserSearch 
                      error={errors.email}
                      onSelect={(val) => setValue('email', val, { shouldValidate: true })}
                    />
                    <input type="hidden" {...register('email', { required: t('bandManagement.emailRequired') })} />
                    
                    {errors.email && (
                      <span className="text-red-500 text-[10px] font-black uppercase mt-1 block">
                        {errors.email.message}
                      </span>
                    )}
                  </div>
                  {errors.email && <span className="text-red-500 text-[10px] font-black uppercase mt-1">{errors.email.message}</span>}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="role" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('bandManagement.assignRole')}</label>
                    <select 
                      id="role"
                      {...register('role', { required: t('bandManagement.roleRequired') })}
                      className="w-full bg-slate-950 border border-slate-800 p-4 text-white font-bold outline-none focus:border-orange-500 appearance-none rounded-sm uppercase tracking-widest text-[12px]"
                    >
                      <option value="bandit">{t('bandManagement.bandit')}</option>
                      <option value="admin">{t('bandManagement.admin')}</option>
                    </select>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full mt-4 py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white font-black uppercase tracking-[0.2em] text-[12px] transition-colors rounded-sm shadow-lg"
                  >
                    {isSubmitting ? t('bandManagement.adding') : t('bandManagement.addMember')}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-10">
                <span className="block text-4xl mb-4 text-slate-700">{t('bandManagement.lock')}</span>
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{t('bandManagement.restrictedAccess')}</h3>
                <p className="text-slate-500 text-sm">{t('bandManagement.onlyAdminsCan')}</p>
              </div>
            )}
          </div>
        }
      />
    </PageWrapper>
  );
}

export default BandManagementView;