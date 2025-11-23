import React, { useState } from 'react';
import { Rfq, Quote, Language } from '../types';
import { t } from '../utils/i18n';

interface SupplierViewProps {
  rfq: Rfq | null;
  onSubmitQuote: (quote: Quote) => void;
  lang: Language;
  onExit: () => void;
}

export default function SupplierView({ rfq, onSubmitQuote, lang, onExit }: SupplierViewProps) {
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [formData, setFormData] = useState({
      supplierName: '',
      currency: 'USD',
      leadTime: '',
      payment: '',
      validity: '',
      notes: ''
  });

  // Standalone Page Layout Wrapper
  if (!rfq) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-4">
              <p>{t(lang, 'no_active_rfq')}</p>
              <button onClick={onExit} className="text-accent hover:underline text-sm">{t(lang, 'return_to_buyer')}</button>
          </div>
      );
  }

  const handlePriceChange = (line: number, val: string) => {
      setPrices(prev => ({ ...prev, [line]: parseFloat(val) || 0 }));
  };

  const calculateTotal = () => {
      let total = 0;
      rfq.line_items.forEach(item => {
          const price = prices[item.line] || 0;
          total += price * (item.quantity || 0);
      });
      return total;
  };

  const handleSubmit = () => {
      const quote: Quote = {
          id: `QT-${Date.now()}`,
          rfqId: rfq.id,
          supplierName: formData.supplierName || "Unnamed Supplier",
          currency: formData.currency,
          total: calculateTotal(),
          leadTime: formData.leadTime,
          payment: formData.payment,
          validity: formData.validity,
          notes: formData.notes,
          email: '',
          phone: '',
          timestamp: Date.now(),
          items: rfq.line_items.map(item => ({
              line: item.line,
              quantity: item.quantity,
              unitPrice: prices[item.line] || 0,
              lineTotal: (prices[item.line] || 0) * (item.quantity || 0)
          }))
      };
      onSubmitQuote(quote);
  };

  return (
    <div className="min-h-screen py-12 px-4">
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header for Separate Page feel */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent flex items-center justify-center">
                        <span className="text-accent font-bold text-xl">C</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Crontal</h1>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">{t(lang, 'supplier_portal')}</span>
                    </div>
                </div>
                <button 
                    onClick={onExit}
                    className="text-slate-500 hover:text-slate-800 text-xs border border-slate-200 bg-white px-3 py-1.5 rounded-full transition"
                >
                    {t(lang, 'return_to_buyer')}
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl shadow-slate-200/50">
                <div className="flex flex-col md:flex-row justify-between items-start mb-6 border-b border-slate-100 pb-4 gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-900">{t(lang, 'rfq_label')} {rfq.id}</h2>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium border border-blue-100">Open for Quote</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{t(lang, 'project_label')} {rfq.project_name}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p><span className="font-semibold">{t(lang, 'dest_label')}</span> {rfq.commercial.destination || t(lang, 'notSpecified')}</p>
                        <p><span className="font-semibold">{t(lang, 'incoterm_label')}</span> {rfq.commercial.incoterm || t(lang, 'notSpecified')}</p>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-4 py-3 border-r border-slate-100 w-12">{t(lang, 'line')}</th>
                                <th className="px-4 py-3">{t(lang, 'description')}</th>
                                <th className="px-4 py-3">{t(lang, 'specs')}</th>
                                <th className="px-4 py-3 w-32 bg-slate-100/50 text-center border-x border-slate-100">{t(lang, 'size')} (OD x WT x L)</th>
                                <th className="px-4 py-3 text-right">{t(lang, 'qty')}</th>
                                <th className="px-4 py-3 text-right w-32 bg-slate-50">{t(lang, 'unit_price')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rfq.line_items.map(item => (
                                <tr key={item.item_id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs border-r border-slate-100">{item.line}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{item.description}</td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                        {item.material_grade}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-xs text-center border-x border-slate-100 font-mono">
                                        {item.size.outer_diameter.value ? `${item.size.outer_diameter.value}${item.size.outer_diameter.unit}` : '-'} x 
                                        {item.size.wall_thickness.value ? ` ${item.size.wall_thickness.value}${item.size.wall_thickness.unit}` : ' -'} x 
                                        {item.size.length.value ? ` ${item.size.length.value}${item.size.length.unit}` : ' -'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-700 font-medium">{item.quantity} {item.uom}</td>
                                    <td className="px-4 py-3 text-right bg-slate-50/30">
                                        <input 
                                            type="number" 
                                            placeholder="0.00"
                                            className="w-full text-right bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none shadow-sm"
                                            onChange={(e) => handlePriceChange(item.line, e.target.value)}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="mt-6 flex justify-end items-center gap-4 pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-500">{t(lang, 'total_estimate')}</span>
                    <span className="text-2xl font-bold text-slate-900">
                        {formData.currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl shadow-slate-200/50">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">{t(lang, 'commercial_terms')}</h3>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <div>
                        <label className="block text-slate-500 mb-1.5 text-xs font-medium">{t(lang, 'supplier_name')}</label>
                        <input 
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none" 
                            value={formData.supplierName}
                            onChange={e => setFormData({...formData, supplierName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 mb-1.5 text-xs font-medium">{t(lang, 'currency')}</label>
                        <select 
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none"
                            value={formData.currency}
                            onChange={e => setFormData({...formData, currency: e.target.value})}
                        >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="CNY">CNY</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-500 mb-1.5 text-xs font-medium">{t(lang, 'lead_time')}</label>
                        <input 
                            type="number"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none" 
                            value={formData.leadTime}
                            onChange={e => setFormData({...formData, leadTime: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-slate-500 mb-1.5 text-xs font-medium">{t(lang, 'payment_terms')}</label>
                        <input 
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none" 
                            placeholder="e.g. Net 30"
                            value={formData.payment}
                            onChange={e => setFormData({...formData, payment: e.target.value})}
                        />
                    </div>
                </div>
                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleSubmit}
                        className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-3 rounded-xl font-medium transition shadow-lg shadow-slate-300 transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {t(lang, 'submit_quote')}
                    </button>
                </div>
            </div>
            
            <p className="text-center text-xs text-slate-400 pb-8">
                Powered by Crontal
            </p>
        </div>
    </div>
  );
}