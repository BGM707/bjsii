import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';
import ReceiptForm from './components/ReceiptForm';
import ServiceOrderForm from './components/ServiceOrderForm';
import QuotationForm from './components/QuotationForm';
import DocumentsList from './components/DocumentsList';
import ProjectsCarousel from './components/ProjectsCarousel';
import CobrosNotes from './components/CobrosNotes';
import DTEManagement from './components/DTEManagement';
import SIIMonitoringDashboard from './components/SIIMonitoringDashboard';
import DatabaseImportExport from './components/DatabaseImportExport';
import UserSettings from './components/UserSettings';
import CashFlow from './components/CashFlow';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './lib/theme';
import { CobroPrefill } from './types/cobro';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'receipts' | 'service-orders' | 'quotations' | 'list' | 'projects' | 'cobros' | 'dte' | 'sii-monitor' | 'data' | 'settings' | 'cashflow'>('projects');
  const [username, setUsername] = useState('');
  const [cobroPrefill, setCobroPrefill] = useState<CobroPrefill | null>(null);

  useEffect(() => {
    // Check for existing local auth first (works offline)
    const storedAuth = localStorage.getItem('bjauth');
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        if (parsed.username) {
          setIsAuthenticated(true);
          setUsername(parsed.username);
        }
      } catch { /* ignore */ }
    }

    // Then try Supabase auth
    let subscription: any;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
          const stored = localStorage.getItem('bjauth');
          if (stored) { try { setUsername(JSON.parse(stored).username); } catch { setUsername('Fuko197160551'); } }
          else { setUsername('Fuko197160551'); }
        } else if (!localStorage.getItem('bjauth')) {
          setIsAuthenticated(false); setUsername('');
        }
      });
      subscription = data.subscription;

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsAuthenticated(true);
          const stored = localStorage.getItem('bjauth');
          if (stored) { try { setUsername(JSON.parse(stored).username); } catch { setUsername('Fuko197160551'); } }
          else { setUsername('Fuko197160551'); }
        }
      }).catch(() => {});
    } catch { /* Supabase not available */ }

    return () => { subscription?.unsubscribe(); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('bjauth');
    setIsAuthenticated(false); setUsername('');
  };

  const handleGenerateCobro = (prefill: CobroPrefill) => {
    setCobroPrefill(prefill);
    setCurrentView('cobros');
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <Login onLoginSuccess={(user) => { setUsername(user); setIsAuthenticated(true); }} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Layout currentView={currentView} onViewChange={(view) => { setCurrentView(view as any); setCobroPrefill(null); }} username={username} onLogout={handleLogout}>
        {currentView === 'receipts' && <ReceiptForm onGenerateCobro={handleGenerateCobro} />}
        {currentView === 'service-orders' && <ServiceOrderForm onGenerateCobro={handleGenerateCobro} />}
        {currentView === 'quotations' && <QuotationForm />}
        {currentView === 'list' && <DocumentsList />}
        {currentView === 'projects' && <ProjectsCarousel />}
        {currentView === 'cobros' && <CobrosNotes prefill={cobroPrefill} onPrefillConsumed={() => setCobroPrefill(null)} />}
        {currentView === 'cashflow' && <CashFlow />}
        {currentView === 'dte' && <DTEManagement />}
        {currentView === 'sii-monitor' && <SIIMonitoringDashboard />}
        {currentView === 'data' && <DatabaseImportExport />}
        {currentView === 'settings' && <UserSettings />}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
