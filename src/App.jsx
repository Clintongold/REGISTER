import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CompanyDetail from './pages/CompanyDetail.jsx';
import VehicleDetail from './pages/VehicleDetail.jsx';
import NavBar from './components/NavBar.jsx';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="p-8 text-slate-500">Loading...</div>;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="max-w-5xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/companies/:companyId" element={<CompanyDetail />} />
          <Route path="/vehicles/:vehicleId" element={<VehicleDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
