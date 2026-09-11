import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function NavBar() {
  return (
    <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
      <Link to="/" className="font-semibold">
        Vehicle License Registry
      </Link>
      <button
        onClick={() => supabase.auth.signOut()}
        className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded"
      >
        Sign out
      </button>
    </header>
  );
}
