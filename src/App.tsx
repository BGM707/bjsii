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
import { supabase } from './lib/supabase';
import { ThemeProvider } from './lib/theme';
import { CobroPrefill } from './types/cobro';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'receipts' | 'service-orders' | 'quotations' | 'list' | 'projects' | 'cobros' | 'dte' | 'sii-monitor' | 'data' | 'settings'>('projects');
  const [username, setUsername] = useState('');
  const [cobroPrefill, setCobroPrefill] = useState<CobroPrefill | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        const storedAuth = localStorage.getItem('bjauth');
        if (storedAuth) {
          try { setUsername(JSON.parse(storedAuth).username); }
          catch { setUsername('Fuko197160551'); }
        } else {
          setUsername('Fuko197160551');
          localStorage.setItem('bjauth', JSON.stringify({ username: 'Fuko197160551', userId: session.user.id, timestamp: Date.now() }));
        }
      } else {
        setIsAuthenticated(false); setUsername(''); localStorage.removeItem('bjauth');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        const storedAuth = localStorage.getItem('bjauth');
        if (storedAuth) { try { setUsername(JSON.parse(storedAuth).username); } catch { setUsername('Fuko197160551'); } }
        else { setUsername('Fuko197160551'); }
      }
    });

    return () => subscription.unsubscribe();
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
        {currentView === 'dte' && <DTEManagement />}
        {currentView === 'sii-monitor' && <SIIMonitoringDashboard />}
        {currentView === 'data' && <DatabaseImportExport />}
        {currentView === 'settings' && <UserSettings />}
      </Layout>
    </ThemeProvider>
  );
}

export default App;
