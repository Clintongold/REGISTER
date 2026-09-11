import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, callEdgeFunction } from '../supabaseClient';

export default function VehicleDetail() {
  const { vehicleId } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [initialStartDate, setInitialStartDate] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [{ data: vehicleData, error: vehicleErr }, { data: periodData, error: periodErr }] = await Promise.all([
      supabase.from('vehicles').select('*, companies(name)').eq('id', vehicleId).single(),
      supabase.from('license_periods').select('*').eq('vehicle_id', vehicleId).order('period_end', { ascending: false })
    ]);
    if (vehicleErr) setError(vehicleErr.message);
    else setVehicle(vehicleData);
    if (periodErr) setError(periodErr.message);
    else setPeriods(periodData);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const hasHistory = periods.length > 0;

  async function handlePreview() {
    setError(null);
    setBusy(true);
    const body = { vehicle_id: vehicleId, action: 'preview' };
    if (!hasHistory && initialStartDate) body.start_date = initialStartDate;
    const res = await callEdgeFunction('license-renewal', body);
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || 'Failed to generate preview');
      return;
    }
    setPreview(json.preview);
  }

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    const body = { vehicle_id: vehicleId, action: 'confirm', period_start: preview.period_start };
    if (!hasHistory && initialStartDate) body.start_date = initialStartDate;
    const res = await callEdgeFunction('license-renewal', body);
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || 'Failed to confirm renewal');
      return;
    }
    setPreview(null);
    loadAll();
  }

  async function handleDownloadReceipt(licensePeriodId) {
    setError(null);
    const res = await callEdgeFunction('generate-receipt', { license_period_id: licensePeriodId });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || 'Failed to generate receipt');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (!vehicle) return <p className="text-red-600">Vehicle not found.</p>;

  return (
    <div>
      <Link to={`/companies/${vehicle.company_id}`} className="text-sm text-slate-500 hover:underline">&larr; Back to {vehicle.companies?.name || 'company'}</Link>
      <h1 className="text-xl font-semibold mt-2">Plate: {vehicle.plate_number}</h1>
      <p className="text-sm text-slate-500 mb-4">{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')}</p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {hasHistory ? (
        <>
          <h2 className="font-medium mb-2">Current License Details</h2>
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <p><span className="text-slate-500">Period:</span> {periods[0].period_start} &rarr; {periods[0].period_end}</p>
            <p><span className="text-slate-500">Receipt Ref:</span> {periods[0].receipt_reference}</p>
            <button onClick={() => handleDownloadReceipt(periods[0].id)} className="mt-2 text-sm bg-slate-200 px-3 py-1.5 rounded">
              Download Receipt
            </button>
          </div>
        </>
      ) : (
        <p className="text-slate-500 mb-4">No license history yet — this vehicle needs its initial plate issuance.</p>
      )}

      <h2 className="font-medium mb-2">{hasHistory ? 'Renew License' : 'Issue Initial License'}</h2>

      {!hasHistory && !preview && (
        <div className="mb-3">
          <label className="block text-sm text-slate-500 mb-1">Start date (optional, defaults to today)</label>
          <input type="date" value={initialStartDate} onChange={(e) => setInitialStartDate(e.target.value)}
            className="border border-slate-300 rounded px-3 py-2" />
        </div>
      )}

      {!preview ? (
        <button onClick={handlePreview} disabled={busy} className="bg-slate-900 text-white text-sm px-4 py-2 rounded disabled:opacity-50">
          {busy ? 'Working...' : hasHistory ? 'Preview Renewal' : 'Preview Initial Issuance'}
        </button>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="font-medium mb-2">Preview</p>
          <p><span className="text-slate-500">New period:</span> {preview.period_start} &rarr; {preview.period_end}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleConfirm} disabled={busy} className="bg-emerald-600 text-white text-sm px-4 py-2 rounded disabled:opacity-50">
              {busy ? 'Saving...' : 'Confirm & Save'}
            </button>
            <button onClick={() => setPreview(null)} className="bg-slate-200 text-sm px-4 py-2 rounded">
              Cancel
            </button>
          </div>
        </div>
      )}

      {periods.length > 0 && (
        <>
          <h2 className="font-medium mt-8 mb-2">License History</h2>
          <ul className="bg-white rounded-lg shadow-sm divide-y">
            {periods.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm">{p.period_start} &rarr; {p.period_end}</p>
                  <p className="text-xs text-slate-500">{p.is_initial_issuance ? 'Initial Issuance' : 'Renewal'} &middot; {p.receipt_reference}</p>
                </div>
                <button onClick={() => handleDownloadReceipt(p.id)} className="text-xs bg-slate-200 px-3 py-1.5 rounded">
                  Receipt
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
