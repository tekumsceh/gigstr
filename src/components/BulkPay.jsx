import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { simulateWaterfall } from '../services/accountingService';
import { useLanguage } from '../context/LanguageContext';
import FormInput from '../components/FormInput';

function BulkPay({ unpaidGigs = [], currentRate, onConfirm }) {
  const { t } = useLanguage();
  const [currency, setCurrency] = useState('EUR');
  const [showModal, setShowModal] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null); // Stores locked-in values for the modal

  const exchangeRate = currentRate?.exrateEurToRsd || 117.3;

  // 1. Initialize React Hook Form
    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
      mode: "onChange", // <--- THIS is the magic line
      defaultValues: { amount: '' }
    });

  const watchAmount = watch("amount");
  const isAmountValid = parseFloat(watchAmount) > 0;

  // 2. The new Review Logic (Only runs if validation passes)
  const onSubmitReview = (data) => {
    const finalNum = parseFloat(data.amount);
    const baseAmountEur = currency === 'EUR' ? finalNum : finalNum / exchangeRate;

    // The 10,000 EUR "Are You Sure?" Guard
    if (baseAmountEur > 10000) {
      const doubleCheck = window.confirm(
        t('bulkPay.confirmWarning', { amount: baseAmountEur.toLocaleString() })
      );
      if (!doubleCheck) {
        reset();
        return;
      }
    }

    // Lock in the math for the modal
    setPendingPayment({
      originalAmount: data.amount,
      baseAmountEur: baseAmountEur,
      simulation: simulateWaterfall(unpaidGigs, baseAmountEur)
    });
    
    setShowModal(true);
  };

  const handleExecute = () => {
    onConfirm({
      totalAmountEur: pendingPayment.baseAmountEur,
      originalAmountRec: parseFloat(pendingPayment.originalAmount),
      currency: currency,
      rate: exchangeRate
    });
    setShowModal(false);
    reset(); // Clear the cashier input automatically
  };

  return (
    <div className="bg-slate-900 border border-slate-700 p-4 rounded-md mb-4 shadow-xl">
      <h2 className="text-slate-300 text-[11px] font-black uppercase tracking-widest mb-3">
        {t('bulkPay.bulkPaymentCashier')}
      </h2>

      {/* We turn this into a form to handle validation smoothly */}
      <form onSubmit={handleSubmit(onSubmitReview)} className="flex items-start gap-4">
        
        {/* The new FormInput */}
        <div className="w-32">
          <FormInput
            id="amount"
            placeholder={t('bulkPay.pricePlaceholder')}
            error={errors.amount}
            {...register("amount", {
              required: t('bulkPay.amountRequired'),
              pattern: {
                value: /^\d+(\.\d{1,2})?$/,
                message: t('bulkPay.invalidFormat')
              },
              validate: value => parseFloat(value) > 0 || t('bulkPay.mustBePositive')
            })}
          />
        </div>

        <div className="flex bg-slate-800 rounded border border-slate-600 overflow-hidden h-[42px]">
          <button
            type="button" // Prevents form submission
            onClick={() => setCurrency('EUR')}
            className={`px-4 text-[10px] font-black tracking-widest uppercase transition-colors ${
              currency === 'EUR' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            EUR
          </button>
          <button
            type="button" // Prevents form submission
            onClick={() => setCurrency('RSD')}
            className={`px-4 text-[10px] font-black tracking-widest uppercase transition-colors ${
              currency === 'RSD' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-700'
            }`}
          >
            RSD
          </button>
        </div>

        <div className="flex-grow" />

        <button
          type="submit"
          disabled={!isAmountValid}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded text-[11px] font-black uppercase tracking-widest transition-colors shadow-lg h-[42px]"
        >
          {t('bulkPay.reviewPayment')}
        </button>
      </form>

      {/* MODAL SECTION */}
      {showModal && pendingPayment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-slate-600 rounded-lg p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">{t('bulkPay.confirmDistribution')}</h3>
            
            <div className="bg-slate-800 p-3 rounded border border-slate-700 mb-4 text-center">
              <p className="text-slate-300 text-xs uppercase font-bold tracking-widest">{t('bulkPay.processingPayment')}</p>
              <p className="text-3xl font-black text-emerald-400 mt-1">
                {pendingPayment.originalAmount} {currency}
              </p>
              {currency === 'RSD' && (
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">
                  (Converted to approx {(pendingPayment.baseAmountEur).toFixed(2)} EUR at rate {exchangeRate})
                </p>
              )}
            </div>

            <div className="mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2">
                Waterfall Preview:
              </h4>
              {pendingPayment.simulation?.updates.map((gig, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-800 py-2">
                  <span className="text-slate-300 truncate pr-4 uppercase text-[11px] font-bold">
                    {gig.city} - {gig.venue}
                  </span>
                  <span className={`font-mono font-bold ${gig.isFullyPaid ? 'text-emerald-500' : 'text-orange-400'}`}>
                    +{gig.applied.toFixed(2)} EUR
                  </span>
                </div>
              ))}
              {pendingPayment.simulation?.leftover > 0.01 && (
                <div className="flex justify-between items-center text-sm border-b border-slate-800 py-2 bg-slate-800/50 px-1 mt-1">
                  <span className="text-slate-500 italic text-[11px]">{t('bulkPay.unappliedLeftover')}</span>
                  <span className="font-mono font-bold text-slate-500">{pendingPayment.simulation.leftover.toFixed(2)} EUR</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 hover:text-white text-[11px] font-black uppercase transition-colors">{t('common.cancel')}</button>
              <button type="button" onClick={handleExecute} className="px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest shadow-lg">{t('bulkPay.execute')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BulkPay;