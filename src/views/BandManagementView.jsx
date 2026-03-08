import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

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
      setShowAddMemberModal(false);
      loadBandData();
    } catch (err) {
      alert(err.response?.data?.error || t('bandManagement.failedAddMember'));
    }
  };

  const getInitials = (member) => {
    const name = member.username || member.displayName || member.email || '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
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

  return (
    <PageWrapper>
      <TwoColumnLayout
        reverse={true}
        sideContent={
          <div className="flex flex-col gap-4">
            {isAdmin && (
              <Link
                to={`/band/${id}/admin`}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border border-slate-600 hover:border-orange-500/50 text-slate-400 hover:text-orange-500 transition-colors text-[11px] font-black uppercase tracking-wider"
              >
                Admin
              </Link>
            )}
            <div className="flex flex-col items-center gap-4">
              {members.map((member) => {
                const isOnline = member.status === 'active';
                return (
                  <div
                    key={member.id}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm bg-slate-700 shrink-0 ${isOnline ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-slate-900' : ''}`}
                    title={member.username || member.displayName}
                  >
                    {getInitials(member)}
                  </div>
                );
              })}
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg border-2 border-dashed border-slate-600 hover:border-orange-500/50 text-slate-400 hover:text-orange-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="text-[11px] font-black uppercase tracking-wider">{t('bandManagement.addMember')}</span>
              </button>
            )}
          </div>
        }
        mainContent={
          <div className="flex flex-col gap-4">
            <h3 className="text-[14px] font-black uppercase tracking-[0.2em] text-white border-b border-slate-800 pb-4 mb-4">{t('bandManagement.currentRoster')}</h3>
            <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden">
              {members.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-black uppercase text-[12px] tracking-widest">{t('bandManagement.noMembersFound')}</div>
              ) : (
                <ul className="divide-y divide-slate-800">
                  {members.map((member) => (
                    <li key={member.id} className="flex justify-between items-center p-6 hover:bg-slate-800/30 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-lg">{member.username || member.displayName}</span>
                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={`px-2 py-1 border text-[9px] font-black uppercase tracking-widest rounded-sm ${member.status === 'active' ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-orange-500/10 border-orange-500/30 text-orange-500 animate-pulse'}`}>
                          {member.status || t('bandManagement.active')}
                        </span>
                        <span className={`px-3 py-1 border text-[10px] font-black uppercase tracking-widest rounded-sm ${member.role === 'owner' ? 'bg-orange-500/10 border-orange-500/50 text-orange-500' : member.role === 'admin' ? 'bg-blue-500/10 border-blue-500/50 text-blue-500' : 'bg-slate-950 border-slate-700 text-slate-300'}`}>
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
      />

      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowAddMemberModal(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl max-w-md w-full p-8 relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowAddMemberModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1" aria-label={t('bandManagement.cancel')}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-orange-500 mb-6 border-b border-slate-800 pb-4 pr-8">{t('bandManagement.addNewMember')}</h3>
            <form onSubmit={handleSubmit(onSubmitInvite)} className="space-y-6" autoComplete="off">
              <div className="space-y-1">
                <UserSearch
                  error={errors.email}
                  onSelect={(val) => setValue('email', val, { shouldValidate: true })}
                />
                <input type="hidden" {...register('email', { required: t('bandManagement.emailRequired') })} />
                {errors.email && (
                  <span className="text-red-500 text-[10px] font-black uppercase mt-1 block">{errors.email.message}</span>
                )}
              </div>
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
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 py-3 border border-slate-600 text-slate-300 font-black uppercase text-[11px] tracking-wider rounded hover:bg-slate-800 transition-colors"
                >
                  {t('bandManagement.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white font-black uppercase tracking-[0.2em] text-[12px] rounded transition-colors"
                >
                  {isSubmitting ? t('bandManagement.adding') : t('bandManagement.addMember')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

export default BandManagementView;