
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Task, BusinessHours, AppState, Role, TaskStatus, TaskNote } from './types';
import { INITIAL_BUSINESS_HOURS, ICONS } from './constants';
import { calculateWorkingHoursElapsed, calculateEfficiency, formatDuration, convertDriveLink } from './utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { CheckSquare, LogOut, TrendingUp, Database, Download, Upload, Cloud, RefreshCw, AlertCircle, Clock, Plus, Github, ExternalLink, Info } from 'lucide-react';

// --- Sub-components ---

const LoginPage: React.FC<{ onLogin: (u: string, p: string) => void; isSyncing: boolean }> = ({ onLogin, isSyncing }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
      
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-[40px] shadow-2xl overflow-hidden border border-white/10 relative z-10">
        <div className="p-12 text-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3">
            <CheckSquare size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">TaskFlow <span className="text-indigo-500">PRO</span></h1>
          <p className="text-slate-400 font-medium">Gestión de Tareas y Eficiencia</p>
        </div>
        <form className="p-12 space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(username, password); }}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Identificación</label>
            <input 
              type="text" 
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition placeholder:text-slate-600 font-bold"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Clave de Acceso</label>
            <input 
              type="password" 
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition placeholder:text-slate-600 font-bold"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98]">
            {isSyncing ? 'CONECTANDO...' : 'ENTRAR AL PANEL'}
          </button>
          
          <div className="flex items-center justify-center gap-2 pt-4">
            <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">
              {isSyncing ? 'Sincronizando con Drive...' : 'Infraestructura lista'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(INITIAL_BUSINESS_HOURS);
  const [syncUrl, setSyncUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'dashboard' | 'tasks' | 'users' | 'settings'>('dashboard');

  const fetchCloudData = async (url: string) => {
    if (!url) return false;
    setIsSyncing(true);
    try {
      const fetchUrl = convertDriveLink(url);
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Error de red');
      const data = await response.json();
      
      if (data.users) setUsers(data.users);
      if (data.tasks) setTasks(data.tasks);
      if (data.businessHours) setBusinessHours(data.businessHours);
      setLastSync(new Date().toLocaleTimeString());
      return true;
    } catch (error) {
      console.error("Cloud sync failed:", error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const savedSyncUrl = localStorage.getItem('tf_syncurl') || '';
      setSyncUrl(savedSyncUrl);

      const success = await fetchCloudData(savedSyncUrl);
      
      if (!success) {
        const savedUsers = localStorage.getItem('tf_users');
        const savedTasks = localStorage.getItem('tf_tasks');
        const savedHours = localStorage.getItem('tf_hours');

        if (savedUsers) setUsers(JSON.parse(savedUsers));
        else setUsers([{ id: 'admin-1', name: 'Automa_5', username: 'Automa_5', password: '14569', role: 'admin' }]);
        
        if (savedTasks) setTasks(JSON.parse(savedTasks));
        if (savedHours) setBusinessHours(JSON.parse(savedHours));
      }
    };
    init();
  }, []);

  useEffect(() => {
    localStorage.setItem('tf_users', JSON.stringify(users));
    localStorage.setItem('tf_tasks', JSON.stringify(tasks));
    localStorage.setItem('tf_hours', JSON.stringify(businessHours));
    localStorage.setItem('tf_syncurl', syncUrl);
  }, [users, tasks, businessHours, syncUrl]);

  const handleLogin = (u: string, p: string) => {
    const found = users.find(usr => usr.username === u && usr.password === p);
    if (found) setCurrentUser(found);
    else alert('Credenciales incorrectas');
  };

  const handleLogout = () => { setCurrentUser(null); setView('dashboard'); };

  const exportDatabase = () => {
    const data = { users, tasks, businessHours, syncUrl, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'database.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importDatabase = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.users && data.tasks) {
          setUsers(data.users);
          setTasks(data.tasks);
          if (data.businessHours) setBusinessHours(data.businessHours);
          alert('Datos importados con éxito');
        }
      } catch (err) { alert('Archivo inválido'); }
    };
    reader.readAsText(file);
  };

  const userTasks = useMemo(() => (currentUser?.role === 'admin' ? tasks : tasks.filter(t => t.assignedTo === currentUser?.id)), [tasks, currentUser]);
  const efficiencyData = useMemo(() => {
    return users.filter(u => u.role === 'user').map(u => {
      const completed = tasks.filter(t => t.assignedTo === u.id && t.status === 'completed');
      let totalEst = 0, totalActual = 0;
      completed.forEach(t => {
        if (t.acceptedAt && t.completedAt) {
          totalEst += t.estimatedHours;
          totalActual += calculateWorkingHoursElapsed(t.acceptedAt, t.completedAt, businessHours);
        }
      });
      return { name: u.name, efficiency: totalActual > 0 ? calculateEfficiency(totalEst, totalActual) : 0 };
    });
  }, [users, tasks, businessHours]);

  if (!currentUser) return <LoginPage onLogin={handleLogin} isSyncing={isSyncing} />;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <aside className="w-72 bg-slate-950 text-white flex flex-col shadow-2xl z-30">
        <div className="p-10 border-b border-white/5 flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-[14px] shadow-lg shadow-indigo-600/30 rotate-3">
            <CheckSquare size={22} className="text-white" />
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase">TaskFlow</span>
        </div>
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          <SidebarItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={ICONS.Dashboard} label="Panel Central" />
          <SidebarItem active={view === 'tasks'} onClick={() => setView('tasks')} icon={ICONS.Tasks} label="Tareas" />
          {currentUser.role === 'admin' && (
            <>
              <div className="pt-6 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Administración</div>
              <SidebarItem active={view === 'users'} onClick={() => setView('users')} icon={ICONS.Users} label="Equipo" />
              <SidebarItem active={view === 'settings'} onClick={() => setView('settings')} icon={ICONS.Settings} label="Configuración" />
            </>
          )}
        </nav>
        <div className="p-8 border-t border-white/5 bg-slate-950/50">
           <div className="flex items-center gap-4 mb-8 px-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-black text-indigo-400 shadow-xl">
                {currentUser.name[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-black truncate text-white">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{currentUser.role}</p>
              </div>
           </div>
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-5 py-4 text-slate-500 hover:text-white hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-all duration-300 font-bold">
             <LogOut size={18} /> <span>Cerrar Sesión</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-12 py-7 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-slate-900 capitalize tracking-tighter">{view === 'dashboard' ? 'Resumen Operativo' : view}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${syncUrl ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{syncUrl ? `Sincronizado: ${lastSync}` : 'Modo Offline'}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
             {syncUrl && (
               <button 
                 onClick={() => fetchCloudData(syncUrl)}
                 disabled={isSyncing}
                 className="flex items-center gap-3 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-2xl text-xs font-black transition-all border border-slate-200 shadow-sm disabled:opacity-50"
               >
                 <RefreshCw size={14} className={isSyncing ? 'animate-spin text-indigo-500' : ''} /> 
                 {isSyncing ? 'ACTUALIZANDO...' : 'REFRESCAR'}
               </button>
             )}
             <div className="h-10 w-[1px] bg-slate-200"></div>
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Hoy</p>
                <p className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}</p>
             </div>
          </div>
        </header>

        <div className="p-12 max-w-7xl mx-auto w-full">
          {view === 'dashboard' && <DashboardView user={currentUser} tasks={userTasks} efficiencyData={efficiencyData} />}
          {view === 'tasks' && <TasksView currentUser={currentUser} tasks={userTasks} users={users} onCreate={(t: any) => setTasks([...tasks, { ...t, id: Date.now().toString(), status: 'pending', createdAt: Date.now(), notes: [] }])} onUpdate={(id:string,u:any)=>setTasks(tasks.map(t=>t.id===id?{...t,...u}:t))} onDelete={(id:string)=>setTasks(tasks.filter(t=>t.id!==id))} onAddNote={(id:string,text:string)=>setTasks(tasks.map(t=>t.id===id?{...t,notes:[...t.notes,{id:Date.now().toString(),text,timestamp:Date.now()}]}:t))} businessHours={businessHours} />}
          {view === 'users' && <UsersView users={users} onAdd={(u: any) => setUsers([...users, { ...u, id: Date.now().toString() }])} />}
          {view === 'settings' && (
            <SettingsView 
              config={businessHours} setConfig={setBusinessHours} 
              syncUrl={syncUrl} setSyncUrl={setSyncUrl}
              onExport={exportDatabase} onImport={importDatabase}
              isSyncing={isSyncing}
            />
          )}
        </div>
      </main>
    </div>
  );
};

// --- Sub-views ---

const SidebarItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 font-black' : 'text-slate-500 hover:text-white hover:bg-white/5 font-bold'}`}>
    {icon} <span className="tracking-tight">{label}</span>
  </button>
);

const DashboardView = ({ user, tasks, efficiencyData }: any) => (
  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
      <StatCard label="Por Iniciar" value={tasks.filter((t:any) => t.status === 'pending').length} color="bg-amber-500" icon={<Clock size={28} />} />
      <StatCard label="Ejecución" value={tasks.filter((t:any) => t.status === 'accepted').length} color="bg-indigo-600" icon={<RefreshCw size={28} />} />
      <StatCard label="Histórico" value={tasks.filter((t:any) => t.status === 'completed').length} color="bg-emerald-500" icon={<CheckSquare size={28} />} />
    </div>
    
    {user.role === 'admin' && (
      <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-12">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl"><TrendingUp size={30} /></div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Eficiencia del Equipo</h3>
            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">Estimado vs Real por Colaborador</p>
          </div>
        </div>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={efficiencyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px'}}
              />
              <Bar dataKey="efficiency" radius={[12, 12, 0, 0]} barSize={60}>
                 {efficiencyData.map((entry:any, index:number) => (
                   <Cell key={`cell-${index}`} fill={entry.efficiency > 100 ? '#10b981' : entry.efficiency > 70 ? '#6366f1' : '#f59e0b'} />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )}
  </div>
);

const StatCard = ({ label, value, color, icon }: any) => (
  <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex items-center gap-8 group hover:border-indigo-200 transition-all duration-500 cursor-default">
    <div className={`p-6 rounded-[28px] ${color} text-white shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>{icon}</div>
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{label}</p>
      <p className="text-5xl font-black text-slate-900 tracking-tighter">{value}</p>
    </div>
  </div>
);

const TasksView = ({ currentUser, tasks, users, onCreate, onUpdate, onDelete, onAddNote, businessHours }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [note, setNote] = useState('');
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', estimatedHours: 1 });

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-center bg-slate-100/50 p-6 rounded-[32px] border border-slate-200/50">
        <div>
           <h3 className="text-xl font-black text-slate-900 tracking-tight">Agenda de Trabajo</h3>
           <p className="text-xs text-slate-400 font-medium">Gestiona y monitorea las labores activas</p>
        </div>
        {currentUser.role === 'admin' && (
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-indigo-600/30 transition-all flex items-center gap-3 active:scale-95">
            <Plus size={20} /> NUEVA TAREA
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {tasks.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
               <Info size={40} />
            </div>
            <p className="text-slate-400 font-bold">No hay tareas asignadas para mostrar.</p>
          </div>
        ) : tasks.map((t: any) => (
          <div key={t.id} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group">
             <div className="flex justify-between items-start gap-10">
               <div className="flex-1">
                 <div className="flex items-center gap-4 mb-5">
                    <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : t.status === 'accepted' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {t.status === 'completed' ? 'CONCLUIDA' : t.status === 'accepted' ? 'PROGRESO' : 'PENDIENTE'}
                    </span>
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-200"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TIEMPO EST: {t.estimatedHours} HORAS</span>
                 </div>
                 <h4 className="text-2xl font-black text-slate-900 mb-4 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{t.title}</h4>
                 <p className="text-slate-500 text-base leading-relaxed font-medium">{t.description}</p>
               </div>
               {currentUser.role === 'admin' && (
                 <button onClick={() => onDelete(t.id)} className="text-slate-200 hover:text-red-500 transition-all p-3 hover:bg-red-50 rounded-2xl"><LogOut size={22} className="rotate-180" /></button>
               )}
             </div>

             {currentUser.role === 'user' && t.status !== 'completed' && (
               <div className="mt-10 pt-10 border-t border-slate-100 flex flex-wrap gap-5">
                 {t.status === 'pending' && (
                   <button onClick={() => onUpdate(t.id, { status: 'accepted', acceptedAt: Date.now() })} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">ACEPTAR TAREA</button>
                 )}
                 {t.status === 'accepted' && (
                   <div className="flex-1 flex gap-4 min-w-[350px]">
                     <input type="text" className="flex-1 px-6 py-4 border border-slate-100 rounded-2xl text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Reporta un avance..." value={note} onChange={e => setNote(e.target.value)} />
                     <button onClick={() => { if(note){ onAddNote(t.id, note); setNote(''); } }} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-xs font-black tracking-widest uppercase">REGISTRAR</button>
                     <button onClick={() => t.notes.length > 0 ? onUpdate(t.id, { status: 'completed', completedAt: Date.now() }) : alert('Es obligatorio registrar al menos un avance (nota) para finalizar.')} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl text-xs font-black tracking-widest uppercase shadow-xl shadow-emerald-600/20">FINALIZAR</button>
                   </div>
                 )}
               </div>
             )}

             {t.notes.length > 0 && (
               <div className="mt-10 space-y-4">
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Bitácora de Trabajo</p>
                    <div className="h-[1px] flex-1 bg-slate-50"></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {t.notes.map((n:any) => (
                      <div key={n.id} className="bg-slate-50/50 p-5 rounded-3xl flex justify-between items-center border border-slate-100/50">
                        <span className="text-sm text-slate-700 font-bold">{n.text}</span>
                        <span className="text-[10px] text-slate-400 font-black uppercase">{new Date(n.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    ))}
                  </div>
               </div>
             )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-8 z-[100] animate-in fade-in duration-300">
          <div className="bg-white p-12 rounded-[56px] w-full max-w-2xl space-y-8 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-3xl text-slate-900 tracking-tighter">Nueva Tarea</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-500">✕</button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre de la Tarea</label>
                <input type="text" placeholder="Ej: Auditoría de Sistemas" className="w-full px-8 py-5 border border-slate-100 rounded-3xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción de Objetivos</label>
                <textarea placeholder="Detalla los pasos a seguir..." className="w-full px-8 py-5 border border-slate-100 rounded-3xl bg-slate-50 h-32 focus:ring-2 focus:ring-indigo-500 outline-none font-medium resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tiempo Estimado (Hrs)</label>
                   <input type="number" className="w-full px-8 py-5 border border-slate-100 rounded-3xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={form.estimatedHours} onChange={e => setForm({...form, estimatedHours: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Colaborador Asignado</label>
                   <select className="w-full px-8 py-5 border border-slate-100 rounded-3xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none" value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}>
                     <option value="">Seleccionar miembro...</option>
                     {users.filter((u:any)=>u.role==='user').map((u:any)=><option key={u.id} value={u.id}>{u.name}</option>)}
                   </select>
                 </div>
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600">CANCELAR</button>
              <button onClick={() => { onCreate(form); setIsModalOpen(false); }} className="flex-[3] bg-indigo-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30">PUBLICAR TAREA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UsersView = ({ users, onAdd }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'user' });
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Equipo Operativo</h3>
          <p className="text-sm text-slate-400 font-medium">Gestiona los accesos y roles del sistema</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl active:scale-95 transition-all">AÑADIR MIEMBRO</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {users.map((u:any) => (
          <div key={u.id} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-indigo-200 transition-all duration-500">
            <div className={`w-24 h-24 rounded-[36px] flex items-center justify-center font-black text-3xl mb-8 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${u.role === 'admin' ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-slate-100 text-slate-400 shadow-slate-200'}`}>
              {u.name[0]}
            </div>
            <p className="font-black text-xl text-slate-900 mb-1 tracking-tight">{u.name}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mb-6">@{u.username}</p>
            <div className={`text-[9px] font-black uppercase px-6 py-2 rounded-full tracking-widest ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
              ROL: {u.role}
            </div>
          </div>
        ))}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-8 z-[100] animate-in fade-in duration-300">
          <div className="bg-white p-12 rounded-[56px] w-full max-w-md space-y-8 shadow-2xl">
            <h3 className="font-black text-3xl text-slate-900 tracking-tighter">Nuevo Acceso</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre completo" className="w-full px-8 py-5 border border-slate-100 rounded-3xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input type="text" placeholder="ID de Usuario (Login)" className="w-full px-8 py-5 border border-slate-100 rounded-3xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
              <input type="password" placeholder="Contraseña temporal" className="w-full px-8 py-5 border border-slate-100 rounded-3xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              <select className="w-full px-8 py-5 border border-slate-100 rounded-3xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold appearance-none" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="user">Colaborador (User)</option>
                <option value="admin">Administrador (Admin)</option>
              </select>
            </div>
            <button onClick={() => { onAdd(form); setIsModalOpen(false); }} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-sm tracking-widest uppercase shadow-2xl shadow-indigo-600/30">CREAR CUENTA</button>
            <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest pt-2">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ config, setConfig, syncUrl, setSyncUrl, onExport, onImport, isSyncing }: any) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div className="max-w-5xl space-y-12 pb-32 animate-in fade-in duration-700">
      {/* Horario Section */}
      <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl"><Clock size={28} /></div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Horas Hábiles</h3>
            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Parámetros para cálculo de eficiencia</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {days.map((d, i) => (
            <div key={i} className={`flex items-center justify-between p-6 rounded-[32px] border transition-all duration-500 ${config[i].active ? 'bg-slate-50 border-slate-100 shadow-sm' : 'bg-white border-slate-50 opacity-30 grayscale'}`}>
              <div className="flex items-center gap-6">
                <input type="checkbox" checked={config[i].active} onChange={e => setConfig({...config, [i]: {...config[i], active: e.target.checked}})} className="w-6 h-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                <span className={`font-black uppercase text-xs tracking-[0.2em] w-32 ${config[i].active ? 'text-slate-800' : 'text-slate-300'}`}>{d}</span>
              </div>
              <div className={`flex items-center gap-4 ${!config[i].active ? 'pointer-events-none' : ''}`}>
                <input type="time" value={config[i].start} onChange={e => setConfig({...config, [i]: {...config[i], start: e.target.value}})} className="px-6 py-3 border border-slate-200 rounded-2xl text-xs font-black bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                <span className="text-slate-300 font-black">→</span>
                <input type="time" value={config[i].end} onChange={e => setConfig({...config, [i]: {...config[i], end: e.target.value}})} className="px-6 py-3 border border-slate-200 rounded-2xl text-xs font-black bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cloud & Github Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Drive Config */}
        <div className="bg-slate-900 p-12 rounded-[48px] shadow-2xl text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[100px] rounded-full"></div>
          <div className="relative z-10">
            <h3 className="text-3xl font-black mb-4 flex items-center gap-4 tracking-tighter"><Cloud size={40} className="text-indigo-400" /> Cloud Sync</h3>
            <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">
              Sincroniza el archivo <b>database.json</b> desde Drive para habilitar el multiusuario.
            </p>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Enlace de Compartir Drive</label>
                <div className="bg-white/5 p-1.5 rounded-3xl border border-white/10 backdrop-blur-xl">
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 bg-transparent border-none focus:ring-0 outline-none text-xs font-bold text-white placeholder:text-white/20 font-mono"
                    placeholder="https://drive.google.com/..."
                    value={syncUrl}
                    onChange={e => setSyncUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                 <button onClick={onExport} className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                    <Download size={18} /> EXPORTAR JSON
                 </button>
                 <div className="flex items-start gap-4 p-5 bg-white/5 rounded-3xl border border-white/5">
                    <AlertCircle size={20} className="text-amber-400 shrink-0" />
                    <p className="text-[11px] font-bold text-slate-400 leading-tight uppercase">Sube el JSON a Drive y actívalo como "Cualquier persona con el enlace"</p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* GitHub Guide */}
        <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-3xl font-black mb-4 flex items-center gap-4 tracking-tighter text-slate-900"><Github size={40} className="text-slate-400" /> GitHub Pages</h3>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">
              Publica esta aplicación en una URL real para que todo el equipo acceda.
            </p>
            
            <div className="space-y-5">
              <GuideStep num="1" text="Crea un repo público llamado 'taskflow' en GitHub." />
              <GuideStep num="2" text="Sube todos los archivos del proyecto (.html, .tsx, etc)." />
              <GuideStep num="3" text="Ve a Settings > Pages y activa el despliegue." />
            </div>
          </div>
          
          <div className="pt-10">
            <a 
              href="https://pages.github.com/" 
              target="_blank" 
              className="flex items-center justify-center gap-3 w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
            >
              IR A GITHUB PAGES <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>

      {/* Backup Footer */}
      <div className="bg-slate-50 p-12 rounded-[48px] border border-slate-100 flex items-center justify-between group">
         <div className="flex items-center gap-6">
           <div className="p-5 bg-white rounded-[24px] shadow-sm text-slate-400 group-hover:text-indigo-500 transition-colors duration-500"><Database size={32} /></div>
           <div>
             <p className="font-black text-slate-900 text-lg tracking-tight">Carga Manual de Seguridad</p>
             <p className="text-xs text-slate-400 font-medium">Si no usas Drive, puedes importar un respaldo JSON local.</p>
           </div>
         </div>
         <input type="file" ref={fileRef} className="hidden" accept=".json" onChange={e => e.target.files?.[0] && onImport(e.target.files[0])} />
         <button onClick={() => fileRef.current?.click()} className="bg-white hover:bg-slate-900 hover:text-white text-slate-900 border border-slate-200 px-10 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-sm transition-all active:scale-95">
            IMPORTAR ARCHIVO
         </button>
      </div>
    </div>
  );
};

const GuideStep = ({ num, text }: any) => (
  <div className="flex items-start gap-5">
    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">{num}</div>
    <p className="text-xs text-slate-500 font-bold leading-relaxed">{text}</p>
  </div>
);

export default App;
