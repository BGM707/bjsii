import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CreditCard as Edit2, Loader, AlertCircle, FolderOpen } from 'lucide-react';
import { supabase, Project, getAuthUserId } from '../lib/supabase';

export default function ProjectsCarousel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({ name: '', description: '', client: '', status: 'activo' });

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (err) { console.error('Error loading projects:', err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!formData.name.trim()) { setError('El nombre del proyecto es requerido'); return; }
    setLoading(true);
    try {
      const payload = { name: formData.name, description: formData.description, client: formData.client, status: formData.status };
      if (editingId) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editingId);
        if (error) throw error; setSuccess('Proyecto actualizado correctamente'); setEditingId(null);
      } else {
        const userId = await getAuthUserId();
        const { error } = await supabase.from('projects').insert([{ ...payload, user_id: userId }]);
        if (error) throw error; setSuccess('Proyecto creado correctamente');
      }
      setFormData({ name: '', description: '', client: '', status: 'activo' });
      setTimeout(() => { setShowForm(false); loadProjects(); }, 600);
    } catch (err: any) { setError(err.message || 'Error al guardar el proyecto'); }
    finally { setLoading(false); }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id!);
    setFormData({ name: project.name, description: project.description || '', client: project.client || '', status: project.status });
    setError(''); setSuccess(''); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este proyecto?')) return;
    try { const { error } = await supabase.from('projects').delete().eq('id', id); if (error) throw error; loadProjects(); }
    catch (err) { console.error('Error deleting project:', err); }
  };

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    activo: { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-400', label: 'Activo' },
    pausado: { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-400', label: 'Pausado' },
    completado: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-400', label: 'Completado' },
  };

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h1 className="section-title">Proyectos</h1>
          <p className="section-subtitle">Gestiona y organiza todos tus proyectos</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({ name: '', description: '', client: '', status: 'activo' }); setError(''); setSuccess(''); setShowForm(!showForm); }}
          className="btn-primary"><Plus className="w-4 h-4" />Nuevo Proyecto</button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingId ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h3>
          {error && <div className="error-banner mb-4"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          {success && <div className="success-banner mb-4">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Nombre del Proyecto *</label>
              <input type="text" placeholder="Ej: Sistema de Facturacion" value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" required />
            </div>
            <div>
              <label className="form-label">Descripcion</label>
              <textarea placeholder="Describe el proyecto" value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="form-input resize-none" rows={3} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Cliente</label>
                <input type="text" placeholder="Nombre del cliente" value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="form-label">Estado</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="form-input">
                  <option value="activo">Activo</option><option value="pausado">Pausado</option><option value="completado">Completado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
                {loading ? <><Loader className="w-4 h-4 animate-spin" />Guardando...</> : editingId ? 'Actualizar' : 'Crear Proyecto'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FolderOpen className="w-6 h-6 text-gray-400 dark:text-gray-500" /></div>
          <p className="empty-state-title">No hay proyectos</p>
          <p className="empty-state-desc">Crea tu primer proyecto para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const s = statusConfig[project.status] || statusConfig['activo'];
            return (
              <div key={project.id} className="card-hover overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">{project.name}</h3>
                    <span className={`badge ${s.bg} ${s.text} flex-shrink-0`}>{s.label}</span>
                  </div>
                  {project.client && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cliente: <span className="font-medium text-gray-800 dark:text-gray-200">{project.client}</span></p>
                  )}
                  {project.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{project.description}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                    {new Date(project.created_at || '').toLocaleDateString('es-CL')}
                  </p>
                  <div className="flex gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <button onClick={() => handleEdit(project)} className="btn-ghost flex-1 text-xs py-1.5">
                      <Edit2 className="w-3.5 h-3.5" />Editar
                    </button>
                    <button onClick={() => handleDelete(project.id!)}
                      className="btn text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 flex-1 text-xs py-1.5">
                      <Trash2 className="w-3.5 h-3.5" />Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
