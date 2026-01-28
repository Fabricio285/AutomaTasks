
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LayoutDashboard, CheckSquare, Users, Settings, LogOut, Plus, Clock, 
  TrendingUp, RefreshCw, Trash2, X, Edit2, Database, Download, Cloud, Info, 
  Upload, ChevronRight, AlertCircle, FileJson, Github, ExternalLink, ShieldCheck,
  AlertTriangle, Save, Wifi, WifiOff, Link2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

// --- TIPOS ---
type Role = 'admin' | 'user';
type TaskStatus = 'pending' | 'accepted' | 'completed';

interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: Role;
}

interface TaskNote {
  id: string;
  text: string;
  timestamp: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  status: TaskStatus;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  estimatedHours: number;
  notes: TaskNote[];
}

interface BusinessHours {
  [key: number]: { active: boolean; start: string; end: string; };
}

// --- CONSTANTES ---
const INITIAL_HOURS: BusinessHours = {
  0: { active: false, start: "09:00", end: "17:00" },
  1: { active: true, start: "09:00", end: "17:00" },
  2: { active: true, start: "09:00", end: "17:00" },
  3: { active: true, start: "09:00", end: "17:00" },
  4: { active: true, start: "09:00", end: "17:00" },
  5: { active: true, start: "09:00", end: "17:00" },
  6: { active: false, start: "09:00", end: "17:00" },
};

const DEFAULT_ADMIN: User = { 
  id: 'admin-1', 
  name: 'Administrador Principal', 
  username: 'Automa_5', 
  password: '14569', 
  role: 'admin' 
};

// --- UTILIDADES ---
const calculateWorkHours = (start: number, end: number, config: BusinessHours): number => {
  if (end <= start) return 0;
  let totalMs = 0;
  let current = new Date(start);
  const finish = new Date(end);
  while (current < finish) {
    const day = current.getDay();
    const dayConfig = config[day];
    if (dayConfig?.active) {
      const [sh, sm] = dayConfig.start.split(':').map(Number);
      const [eh, em] = dayConfig.end.split(':').map(Number);
      const workStart = new Date(current).setHours(sh, sm, 0, 0);
      const workEnd = new Date(current).setHours(eh, em, 0, 0);
      const effectiveStart = Math.max(current.getTime(), workStart);
      const effectiveEnd = Math.min(finish.getTime(), workEnd);
      if (effectiveEnd > effectiveStart) totalMs += (effectiveEnd - effectiveStart);
    }
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }
  return totalMs / (1000 * 60 * 60);
};

// --- COMPONENTE PRINCIPAL ---

const App = () => {
  const [users, setUsers] = useState<User[]>([DEFAULT_ADMIN]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(INITIAL_HOURS);
  const [cloudId, setCloudId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | 'none'>('none');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const autoSaveTimer = useRef<any>(null);

  // --- LÓGICA DE NUBE (npoint.io) ---

  const pushToCloud = async (id: string, dataToPush: any) => {
    if (!id) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`https://api.npoint.io/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToPush)
      });
      if (response.ok) {
        setLastSyncStatus('success');
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        setLastSyncStatus('error');
      }
    } catch (e) {
      setLastSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchFromCloud = useCallback(async (id: string) => {
    if (!id || isSyncing) return;
    try {
      const response = await fetch(`https://api.npoint.io/${id}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      
      if (data && data.users) {
        // Solo actualizamos si hay cambios reales para evitar re-renders infinitos
        setUsers(prev => JSON.stringify(prev) !== JSON.stringify(data.users) ? data.users : prev);
        setTasks(prev => JSON.stringify(prev) !== JSON.stringify(data.tasks) ? data.tasks : prev);
        setBusinessHours(prev => JSON.stringify(prev) !== JSON.stringify(data.businessHours) ? data.businessHours : prev);
        setLastSyncStatus('success');
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (e) {
      setLastSyncStatus('error');
    }
  }, [isSyncing]);

  const createNewCloudId = async () => {
    setIsSyncing(true);
    try {
      const data = { users, tasks, businessHours };
      const response = await fetch('https://api.npoint.io', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.binId) {
        setCloudId(result.binId);
        alert(`¡Base de Datos creada! ID: ${result.binId}\nComparte este ID con tu equipo.`);
      }
    } catch (e) {
      alert('Error al crear la base de datos en la nube.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Carga inicial Local
  useEffect(() => {
    const saved = localStorage.getItem('taskflow_v9_autosync');
    if (saved) {
      const d = JSON.parse(saved);
      setUsers(d.users || [DEFAULT_ADMIN]);
      setTasks(d.tasks || []);
      setBusinessHours(d.hours || INITIAL_HOURS);
      setCloudId(d.cloudId || '');
    }
  }, []);

  // Polling: Consultar la nube cada 20 segundos
  useEffect(() => {
    if (cloudId) {
      fetchFromCloud(cloudId);
      const interval = setInterval(() => fetchFromCloud(cloudId), 20000);
      return () => clearInterval(interval);
    }
  }, [cloudId, fetchFromCloud]);

  // Guardar localmente y disparar Auto-Save a la nube
  useEffect(() => {
    localStorage.setItem('taskflow_v9_autosync', JSON.stringify({ users, tasks, hours: businessHours, cloudId }));
    
    // Debounce de guardado en nube para no saturar la API
    if (cloudId && currentUser) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        pushToCloud(cloudId, { users, tasks, businessHours });
      }, 3000);
    }
  }, [users, tasks, businessHours, cloudId]);

  const handleLogin = (u: string, p: string) => {
    const found = users.find(usr => usr.username === u && usr.password === p);
    if (found) setCurrentUser(found);
    else alert('Acceso denegado.');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/5 blur-[120px] rounded-full translate-x-1/2"></div>
        <div className="max-w-md w-full bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 shadow-2xl overflow-hidden p-12 text-center relative z-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-indigo-500/40 rotate-3">
             <CheckSquare size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-4">TaskFlow <span className="text-indigo-500">PRO</span></h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mb-12">Sincronización Automática</p>
          
          <LoginForm users={users} onLogin={handleLogin} />
          
          <div className="mt-12 pt-8 border-t border-white/5 space-y-4">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ID de Sincronización (Opcional)</p>
            <input 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Pega el ID aquí si tu equipo ya tiene uno..."
              value={cloudId}
              onChange={e => setCloudId(e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shrink-0 border-r border-white/5 shadow-2xl z-40">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-xl rotate-3 shadow-lg shadow-indigo-600/20"><CheckSquare size={24} /></div>
          <span className="text-2xl font-black tracking-tighter uppercase">TaskFlow</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <SidebarBtn active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          <SidebarBtn active={view === 'tasks'} onClick={() => setView('tasks')} icon={<CheckSquare size={20}/>} label="Tareas" />
          {currentUser.role === 'admin' && (
            <>
              <SidebarBtn active={view === 'users'} onClick={() => setView('users')} icon={<Users size={20}/>} label="Equipo" />
              <SidebarBtn active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings size={20}/>} label="Configuración" />
            </>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center font-black text-indigo-400">{currentUser.name[0]}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-black truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center gap-3 px-6 py-4 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all font-bold">
            <LogOut size={18} /> <span>Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 no-scrollbar bg-slate-50">
        <header className="flex justify-between items-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter capitalize">{view}</h2>
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all ${lastSyncStatus === 'error' ? 'border-red-200 bg-red-50' : ''}`}>
               {lastSyncStatus === 'success' ? <Wifi size={16} className="text-emerald-500 animate-pulse" /> : <WifiOff size={16} className="text-slate-300" />}
               <div className="text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Sincronización</p>
                  <p className="text-[10px] font-black text-slate-900">{cloudId ? `ID: ${cloudId}` : 'Sin Nube'}</p>
               </div>
            </div>
            <div className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-2 shadow-xl shadow-indigo-600/20">
              <ShieldCheck size={16} /> {currentUser.role}
            </div>
          </div>
        </header>

        {view === 'dashboard' && <DashboardView tasks={tasks} users={users} hours={businessHours} role={currentUser.role} />}
        {view === 'tasks' && (
          <TasksView 
            tasks={currentUser.role === 'admin' ? tasks : tasks.filter(t => t.assignedTo === currentUser.id)} 
            users={users} 
            role={currentUser.role}
            onAdd={(t:any) => setTasks([...tasks, {...t, id: Date.now().toString(), status: 'pending', createdAt: Date.now(), notes: []}])}
            onUpdate={(id:string, update:any) => setTasks(tasks.map(t => t.id === id ? {...t, ...update} : t))}
            onDelete={(id:string) => setTasks(tasks.filter(t => t.id !== id))}
          />
        )}
        {view === 'users' && (
          <UsersView 
            users={users} 
            onAdd={(u:any) => setUsers([...users, {...u, id: Date.now().toString()}])}
            onUpdate={(id:string, update:any) => setUsers(users.map(u => u.id === id ? {...u, ...update} : u))}
            onDelete={(id:string) => setUsers(users.filter(u => u.id !== id))}
          />
        )}
        {view === 'settings' && (
          <div className="max-w-4xl space-y-12">
            {/* Gestión Automática Nube */}
            <div className="bg-[#0f172a] p-12 rounded-[56px] shadow-2xl text-white relative overflow-hidden">
               <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full"></div>
               <h3 className="text-3xl font-black mb-4 flex items-center gap-4"><Cloud size={40} className="text-indigo-400"/> Sincronización Automática</h3>
               <p className="text-slate-400 font-medium mb-12 max-w-xl">
                 No más archivos manuales. Al crear o conectar un ID, los cambios se guardan automáticamente y tus compañeros los verán al instante.
               </p>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Conectar con ID existente</p>
                    <div className="flex gap-4">
                      <input 
                        className="flex-1 bg-white/5 border border-white/10 rounded-3xl px-8 py-5 text-white font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="ID de 6+ caracteres..."
                        value={cloudId}
                        onChange={e => setCloudId(e.target.value)}
                      />
                      <button onClick={() => fetchFromCloud(cloudId)} className="bg-indigo-600 text-white px-8 rounded-3xl font-black hover:bg-indigo-500 transition-all"><RefreshCw size={20}/></button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Crear Nueva Base en Nube</p>
                    <button onClick={createNewCloudId} className="w-full bg-white text-slate-900 py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all">
                      <Plus size={18}/> GENERAR NUEVO SYNC ID
                    </button>
                  </div>
               </div>

               {cloudId && (
                 <div className="mt-12 p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <Link2 size={24} className="text-indigo-400" />
                       <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase">Tu ID de Equipo:</p>
                          <p className="text-xl font-black tracking-widest text-white">{cloudId}</p>
                       </div>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(cloudId); alert('¡Copiado!'); }} className="text-[10px] font-black uppercase text-indigo-400 hover:text-white transition-colors">Copiar ID</button>
                 </div>
               )}
            </div>

            {/* Horarios Operativos */}
            <div className="bg-white p-12 rounded-[56px] shadow-sm border border-slate-100">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-4"><Clock className="text-indigo-600"/> Horarios Operativos</h3>
              <div className="space-y-3">
                {Object.entries(businessHours).map(([day, config]: any) => (
                  <div key={day} className={`flex items-center justify-between p-6 rounded-[32px] border transition-all ${config.active ? 'bg-slate-50' : 'opacity-30 grayscale'}`}>
                    <div className="flex items-center gap-6">
                      <input type="checkbox" checked={config.active} onChange={e => setBusinessHours({...businessHours, [day]: {...config, active: e.target.checked}})} className="w-6 h-6 rounded-lg accent-indigo-600" />
                      <span className="font-black uppercase text-xs tracking-widest w-24">Día {day}</span>
                    </div>
                    <div className="flex gap-4">
                      <input type="time" value={config.start} onChange={e => setBusinessHours({...businessHours, [day]: {...config, start: e.target.value}})} className="px-4 py-2 border rounded-xl font-bold bg-white outline-none" />
                      <input type="time" value={config.end} onChange={e => setBusinessHours({...businessHours, [day]: {...config, end: e.target.value}})} className="px-4 py-2 border rounded-xl font-bold bg-white outline-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 pb-20">
               <button onClick={() => {
                  const data = { users, tasks, businessHours, cloudId };
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'backup_taskflow.json'; a.click();
               }} className="flex-1 bg-white p-8 rounded-[40px] border border-slate-100 text-left hover:border-indigo-500 transition-all group shadow-sm">
                  <Download className="text-slate-300 mb-4 group-hover:text-indigo-500 transition-colors" size={32} />
                  <p className="font-black text-slate-900">Backup Local</p>
                  <p className="text-xs text-slate-400 font-medium">Exportar todo el sistema a un archivo JSON.</p>
               </button>
               <label className="flex-1 bg-white p-8 rounded-[40px] border border-slate-100 text-left hover:border-indigo-500 transition-all group shadow-sm cursor-pointer">
                  <Upload className="text-slate-300 mb-4 group-hover:text-indigo-500 transition-colors" size={32} />
                  <p className="font-black text-slate-900">Restaurar Sistema</p>
                  <p className="text-xs text-slate-400 font-medium">Cargar una base de datos desde un archivo.</p>
                  <input type="file" className="hidden" accept=".json" onChange={(e:any) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const data = JSON.parse(ev.target?.result as string);
                      if (data.users) { setUsers(data.users); setTasks(data.tasks || []); setCloudId(data.cloudId || ''); alert('Restaurado.'); }
                    };
                    reader.readAsText(e.target.files[0]);
                  }} />
               </label>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- SUB-VIEWS ---

const LoginForm = ({ users, onLogin }: any) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <form className="space-y-6" onSubmit={e => { e.preventDefault(); onLogin(u, p); }}>
      <select className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none cursor-pointer appearance-none" value={u} onChange={e => setU(e.target.value)} required>
        <option value="" disabled className="bg-[#0a0f1d]">Selecciona Perfil</option>
        {users.map((usr: any) => <option key={usr.id} value={usr.username} className="bg-[#0a0f1d]">{usr.name} (@{usr.username})</option>)}
      </select>
      <input type="password" placeholder="Contraseña" className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-1 focus:ring-indigo-500" value={p} onChange={e => setP(e.target.value)} required />
      <button className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-500 transition-all active:scale-95 shadow-indigo-600/20">ACCEDER AL PANEL</button>
    </form>
  );
};

const DashboardView = ({ tasks, users, hours, role }: any) => {
  const stats = [
    { label: 'Pendientes', val: tasks.filter((t:any)=>t.status==='pending').length, color: 'bg-amber-500' },
    { label: 'En Proceso', val: tasks.filter((t:any)=>t.status==='accepted').length, color: 'bg-indigo-600' },
    { label: 'Completas', val: tasks.filter((t:any)=>t.status==='completed').length, color: 'bg-emerald-500' },
  ];

  const efficiency = users.filter((u:any)=>u.role==='user').map((u:any) => {
    const done = tasks.filter((t:any)=>t.assignedTo===u.id && t.status==='completed');
    let totalEst = 0, totalAct = 0;
    done.forEach((t:any) => {
      totalEst += t.estimatedHours;
      totalAct += calculateWorkHours(t.acceptedAt, t.completedAt, hours);
    });
    return { name: u.name, val: totalAct > 0 ? Math.round((totalEst / totalAct) * 100) : 0 };
  });

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white p-10 rounded-[40px] border border-slate-100 flex items-center gap-8 shadow-sm">
             <div className={`p-6 rounded-[24px] ${s.color} text-white shadow-xl`}><Clock size={24}/></div>
             <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p><p className="text-4xl font-black">{s.val}</p></div>
          </div>
        ))}
      </div>
      {role === 'admin' && efficiency.length > 0 && (
        <div className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm h-[500px]">
          <h3 className="text-xl font-black mb-12 flex items-center gap-3"><TrendingUp className="text-indigo-600"/> Rendimiento del Equipo (%)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={efficiency}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)'}} />
              <Bar dataKey="val" radius={[12, 12, 0, 0]} barSize={60}>
                {efficiency.map((e:any, i:number) => <Cell key={i} fill={e.val > 100 ? '#10b981' : e.val > 70 ? '#6366f1' : '#f59e0b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const TasksView = ({ tasks, users, role, onAdd, onUpdate, onDelete }: any) => {
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState('');
  const [f, setF] = useState({ title: '', description: '', assignedTo: '', estimatedHours: 1 });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {role === 'admin' && (
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95 shadow-indigo-600/20">
          <Plus size={20}/> NUEVA ASIGNACIÓN
        </button>
      )}
      <div className="grid grid-cols-1 gap-6">
        {tasks.map((t: Task) => (
          <div key={t.id} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col group hover:shadow-xl transition-all duration-500">
             <div className="flex justify-between items-start mb-6">
               <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : t.status === 'accepted' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {t.status === 'completed' ? 'Finalizada' : t.status === 'accepted' ? 'Ejecutando' : 'Pendiente'}
                    </span>
                    <span className="text-[9px] font-black text-slate-300 uppercase">Estimado: {t.estimatedHours}h</span>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">→ {users.find((u:any)=>u.id === t.assignedTo)?.name}</span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{t.title}</h4>
                  <p className="text-slate-500 mt-4 leading-relaxed font-medium">{t.description}</p>
               </div>
               {role === 'admin' && <button onClick={() => confirm('¿Borrar?') && onDelete(t.id)} className="text-slate-200 hover:text-red-500 p-2 transition-all hover:bg-red-50 rounded-2xl"><Trash2/></button>}
             </div>
             
             {role === 'user' && t.status !== 'completed' && (
               <div className="mt-8 pt-8 border-t flex flex-wrap gap-4">
                 {t.status === 'pending' ? (
                   <button onClick={() => onUpdate(t.id, {status: 'accepted', acceptedAt: Date.now()})} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">COMENZAR TAREA</button>
                 ) : (
                   <div className="flex-1 flex gap-4 min-w-[350px]">
                      <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Escribe tu avance..." value={note} onChange={e => setNote(e.target.value)} />
                      <button onClick={() => { if(note) { onUpdate(t.id, {notes: [...t.notes, {id: Date.now().toString(), text: note, timestamp: Date.now()}]}); setNote(''); } }} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">REGISTRAR</button>
                      <button onClick={() => t.notes.length > 0 ? onUpdate(t.id, {status: 'completed', completedAt: Date.now()}) : alert('Debes agregar un reporte.')} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all shadow-emerald-600/20">TERMINAR</button>
                   </div>
                 )}
               </div>
             )}
             
             {t.notes.length > 0 && (
               <div className="mt-8 space-y-2">
                 <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-2">Historial de Reportes</p>
                 {t.notes.map((n:any)=>(
                   <div key={n.id} className="bg-slate-50/50 p-4 rounded-3xl text-[13px] font-bold text-slate-600 flex justify-between border border-slate-100/50">
                     <span>{n.text}</span>
                     <span className="text-slate-400 text-[10px] font-black">{new Date(n.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
                 ))}
               </div>
             )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8 z-[60] animate-in fade-in duration-300">
          <div className="bg-white p-12 rounded-[56px] w-full max-w-md shadow-2xl relative">
             <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500"><X size={24}/></button>
             <h3 className="text-3xl font-black mb-8 tracking-tighter text-slate-900">Asignar Labor</h3>
             <div className="space-y-4">
                <input placeholder="Título de la tarea" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={f.title} onChange={e => setF({...f, title: e.target.value})} />
                <textarea placeholder="Descripción del trabajo..." className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-medium h-32 outline-none resize-none focus:ring-2 focus:ring-indigo-500" value={f.description} onChange={e => setF({...f, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Horas" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none" value={f.estimatedHours} onChange={e => setF({...f, estimatedHours: Number(e.target.value)})} />
                  <select className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none cursor-pointer" value={f.assignedTo} onChange={e => setF({...f, assignedTo: e.target.value})}>
                      <option value="" disabled>Responsable</option>
                      {users.filter((u:any)=>u.role==='user').map((u:any)=><option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
             </div>
             <button onClick={() => { if(f.title && f.assignedTo) { onAdd(f); setShowModal(false); } else alert('Completa los campos.'); }} className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black shadow-xl mt-8 uppercase tracking-widest text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-indigo-600/30">PUBLICAR TAREA</button>
          </div>
        </div>
      )}
    </div>
  );
};

const UsersView = ({ users, onAdd, onUpdate, onDelete }: any) => {
  const [modal, setModal] = useState({ open: false, editing: null as string | null });
  const [f, setF] = useState({ name: '', username: '', password: '', role: 'user' as Role });

  const handleSave = () => {
    if (!f.name || !f.username || !f.password) return alert('Completa todos los campos');
    if (modal.editing) onUpdate(modal.editing, f);
    else onAdd(f);
    setModal({ open: false, editing: null });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black uppercase tracking-widest text-slate-400">Nuestro Equipo</h3>
        <button onClick={() => { setModal({open:true, editing:null}); setF({name:'',username:'',password:'',role:'user'}); }} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2 active:scale-95 transition-all">
          <Plus size={20}/> NUEVO PERFIL
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {users.map((u:User) => (
          <div key={u.id} className="bg-white p-10 rounded-[56px] border border-slate-100 text-center flex flex-col items-center relative group shadow-sm transition-all hover:border-indigo-200">
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setModal({open:true, editing:u.id}); setF({name:u.name,username:u.username,password:u.password||'',role:u.role}); }} className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all"><Edit2 size={16}/></button>
              <button onClick={() => onDelete(u.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
            </div>
            <div className={`w-24 h-24 rounded-[40px] flex items-center justify-center font-black text-3xl mb-8 shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${u.role === 'admin' ? 'bg-indigo-600 text-white shadow-indigo-600/30' : 'bg-slate-100 text-slate-400 shadow-slate-200'}`}>{u.name[0]}</div>
            <p className="font-black text-2xl mb-1 text-slate-900 tracking-tight">{u.name}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">@{u.username}</p>
            <div className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>{u.role}</div>
          </div>
        ))}
      </div>
      {modal.open && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8 z-[60] animate-in fade-in duration-300">
          <div className="bg-white p-12 rounded-[56px] w-full max-w-md shadow-2xl relative">
             <button onClick={() => setModal({open: false, editing: null})} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500"><X size={24}/></button>
             <h3 className="text-3xl font-black mb-8 tracking-tighter text-slate-900">{modal.editing ? 'Editar' : 'Crear'} Acceso</h3>
             <div className="space-y-4">
                <input placeholder="Nombre Real" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none" value={f.name} onChange={e => setF({...f, name: e.target.value})} />
                <input placeholder="Usuario (Login)" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none" value={f.username} onChange={e => setF({...f, username: e.target.value})} />
                <input type="password" placeholder="Clave de acceso" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none" value={f.password} onChange={e => setF({...f, password: e.target.value})} />
                <select className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none cursor-pointer appearance-none" value={f.role} onChange={e => setF({...f, role: e.target.value as Role})}>
                    <option value="user">USER (Colaborador)</option>
                    <option value="admin">ADMIN (Administrador)</option>
                </select>
             </div>
             <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black mt-10 shadow-xl shadow-indigo-600/30 uppercase text-sm tracking-widest transition-all active:scale-95">GUARDAR PERFIL</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-8 py-5 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 font-black' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300 font-bold'}`}>
    {icon} <span className="tracking-tight">{label}</span>
  </button>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
