import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function CompanyDetail() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVerticalName, setNewVerticalName] = useState('');
  const [form, setForm] = useState({ plate_number: '', make: '', model: '', year: '', color: '', chassis_number: '', vin: '', vertical_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function loadAll() {
    setLoading(true);
    const [{ data: companyData, error: companyErr }, { data: vehicleData, error: vehicleErr }, { data: verticalData }] = await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('vehicles').select('id, plate_number, make, model, year, vertical_id').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('verticals').select('id, name').eq('company_id', companyId).order('name')
    ]);
    if (companyErr) setError(companyErr.message);
    else setCompany(companyData);
    if (vehicleErr) setError(vehicleErr.message);
    else setVehicles(vehicleData);
    setVerticals(verticalData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleAddVertical(e) {
    e.preventDefault();
    if (!newVerticalName.trim()) return;
    const { error: insertError } = await supabase.from('verticals').insert({ company_id: companyId, name: newVerticalName.trim() });
    if (insertError) setError(insertError.message);
    setNewVerticalName('');
    loadAll();
  }

  async function handleAddVehicle(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('vehicles').insert({
      company_id: companyId,
      vertical_id: form.vertical_id || null,
      plate_number: form.plate_number,
      make: form.make,
      model: form.model,
      year: form.year ? Number(form.year) : null,
      color: form.color,
      chassis_number: form.chassis_number,
      vin: form.vin,
      created_by: userData.user.id
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm({ plate_number: '', make: '', model: '', year: '', color: '', chassis_number: '', vin: '', vertical_id: '' });
    setShowAddVehicle(false);
    loadAll();
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;
  if (!company) return <p className="text-red-600">Company not found.</p>;

  return (
    <div>
      <Link to="/" className="text-sm text-slate-500 hover:underline">&larr; Back to companies</Link>
      <h1 className="text-xl font-semibold mt-2">{company.name}</h1>
      {company.registration_number && <p className="text-sm text-slate-500">Reg. No: {company.registration_number}</p>}

      <div className="flex flex-wrap gap-2 mt-4 mb-2">
        <form onSubmit={handleAddVertical} className="flex gap-2">
          <input
            placeholder="New vertical name"
            value={newVerticalName}
            onChange={(e) => setNewVerticalName(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
          <button className="text-sm bg-slate-200 px-3 py-1.5 rounded">+ Add Vertical</button>
        </form>
        <button
          onClick={() => setShowAddVehicle((v) => !v)}
          className="ml-auto bg-slate-900 text-white text-sm px-4 py-2 rounded"
        >
          {showAddVehicle ? 'Cancel' : '+ Add Vehicle to Fleet'}
        </button>
      </div>

      {showAddVehicle && (
        <form onSubmit={handleAddVehicle} className="bg-white p-4 rounded-lg shadow-sm mb-6 grid gap-3 sm:grid-cols-2">
          <input required placeholder="Plate number" value={form.plate_number}
            onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <select value={form.vertical_id} onChange={(e) => setForm({ ...form, vertical_id: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2">
            <option value="">No vertical</option>
            {verticals.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <input placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <input placeholder="Year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <input placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <input placeholder="Chassis number" value={form.chassis_number} onChange={(e) => setForm({ ...form, chassis_number: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <input placeholder="VIN" value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <button disabled={saving} className="sm:col-span-2 bg-emerald-600 text-white rounded py-2 font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Vehicle'}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <h2 className="font-medium mb-2">Registered Vehicles</h2>
      {vehicles.length === 0 ? (
        <p className="text-slate-500">No vehicles registered yet.</p>
      ) : (
        <ul className="bg-white rounded-lg shadow-sm divide-y">
          {vehicles.map((v) => (
            <li key={v.id}>
              <Link to={`/vehicles/${v.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <p className="font-medium">{v.plate_number}</p>
                <p className="text-xs text-slate-500">{[v.make, v.model, v.year].filter(Boolean).join(' ')}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
