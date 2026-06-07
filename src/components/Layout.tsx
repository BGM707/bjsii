import { FileText, ClipboardList, List, CreditCard, FolderOpen, Receipt, LogOut, FileCode, Activity, Database, Settings, Menu, X, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../lib/theme';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  username?: string;
  onLogout?: () => void;
}

const menuItems = [
  { id: 'projects', label: 'Proyectos', icon: FolderOpen, group: 'Principal' },
  { id: 'cobros', label: 'Notas de Cobros', icon: Receipt, group: 'Principal' },
  { id: 'receipts', label: 'Boletas', icon: FileText, group: 'Documentos' },
  { id: 'service-orders', label: 'Ordenes de Servicio', icon: ClipboardList, group: 'Documentos' },
  { id: 'quotations', label: 'Cotizaciones', icon: CreditCard, group: 'Documentos' },
  { id: 'list', label: 'Todos los Documentos', icon: List, group: 'Documentos' },
  { id: 'dte', label: 'DTE SII', icon: FileCode, group: 'SII' },
  { id: 'sii-monitor', label: 'Monitor SII', icon: Activity, group: 'SII' },
  { id: 'data', label: 'Base de Datos', icon: Database, group: 'Sistema' },
  { id: 'settings', label: 'Configuracion', icon: Settings, group: 'Sistema' },
];

export default function Layout({ children, currentView, onViewChange, username, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const groups = ['Principal', 'Documentos', 'SII', 'Sistema'];
  const currentLabel = menuItems.find((m) => m.id === currentView)?.label || '';

  return (
    <div className="min-h-screen bg-neutral-50 flex dark:bg-neutral-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 flex flex-col`}>
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">BJ Servicios</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">78.332.298-6</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => {
            const items = menuItems.filter((m) => m.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-5">
                <p className="px-3 mb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{group}</p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button key={item.id} onClick={() => { onViewChange(item.id); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-neutral-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-neutral-800 dark:hover:text-gray-200'
                        }`}>
                        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0">
          {username && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 dark:text-blue-300 text-xs font-bold">{username.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">{username}</span>
            </div>
          )}
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400">
            <LogOut className="w-[18px] h-[18px]" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 flex items-center px-4 sm:px-6 lg:px-8 flex-shrink-0 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 mr-2 hover:bg-neutral-100 rounded-lg text-gray-600 dark:text-gray-400 dark:hover:bg-neutral-800">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">{currentLabel}</h1>

          {/* Theme toggle */}
          <button onClick={toggleTheme}
            className="relative p-2 rounded-lg hover:bg-neutral-100 text-gray-600 dark:text-gray-400 dark:hover:bg-neutral-800 transition-colors"
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-600">&copy; 2025 BJ SERVICIOS INFORMATICOS SpA</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
