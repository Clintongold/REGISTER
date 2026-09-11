import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', registration_number: '', address: '', contact_email: '', contact_phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function loadCompanies() {
    setLoading(true);
    let req = supabase.from('companies').select('id, name, registration_number').order('name');
    if (query.trim()) {
      req = req.ilike('name', `%${query.trim()}%`);
    }
    const { data, error: fetchError } = await req;
    if (fetchError) setError(fetchError.message);
    else setCompanies(data);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = setTimeout(loadCompanies, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function handleCreateCompany(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('companies').insert({
      ...form,
      created_by: userData.user.id
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm({ name: '', registration_number: '', address: '', contact_email: '', contact_phone: '' });
    setShowCreate(false);
    loadCompanies();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Companies</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="bg-slate-900 text-white text-sm px-4 py-2 rounded"
        >
          {showCreate ? 'Cancel' : '+ Create Company Profile'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateCompany} className="bg-white p-4 rounded-lg shadow-sm mb-6 grid gap-3 sm:grid-cols-2">
          <input required placeholder="Company name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2 sm:col-span-2" />
          <input placeholder="Registration number" value={form.registration_number}
            onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <input placeholder="Contact phone" value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <input placeholder="Contact email" value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <input placeholder="Address" value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="border border-slate-300 rounded px-3 py-2" />
          <button disabled={saving} className="sm:col-span-2 bg-emerald-600 text-white rounded py-2 font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Company'}
          </button>
        </form>
      )}

      <input
        placeholder="Search company by name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-slate-300 rounded px-3 py-2 mb-4"
      />

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : companies.length === 0 ? (
        <p className="text-slate-500">No companies found.</p>
      ) : (
        <ul className="bg-white rounded-lg shadow-sm divide-y">
          {companies.map((c) => (
            <li key={c.id}>
              <Link to={`/companies/${c.id}`} className="block px-4 py-3 hover:bg-slate-50">
                <p className="font-medium">{c.name}</p>
                {c.registration_number && (
                  <p className="text-xs text-slate-500">Reg. No: {c.registration_number}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
