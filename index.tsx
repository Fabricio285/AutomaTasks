
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LayoutDashboard, CheckSquare, Users, Settings, LogOut, Plus, Clock, 
  TrendingUp, RefreshCw, Trash2, X, Edit2, Database, Download, Cloud, Info, 
  Upload, ChevronRight, AlertCircle, FileJson, Github, ExternalLink, ShieldCheck,
  AlertTriangle, Save
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
const convertCloudLink = (url: string): string => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const id = url.split('/d/')[1].split('/')[0];
    return `https://docs.google.com/uc?export=download&id=${id}`;
  }
  if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  return url;
};

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

// --- COMPONENTES ---

const App = () => {
  const [users, setUsers] = useState<User[]>([DEFAULT_ADMIN]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(INITIAL_HOURS);
  const [syncUrl, setSyncUrl] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('Local');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carga inicial (Solo Local para evitar sobrescritura accidental)
  useEffect(() => {
    const saved = localStorage.getItem('taskflow_v8_data');
    if (saved) {
      try {
        const d = JSON.parse(saved);
        // Validar que siempre tengamos al menos al admin
        let userList = d.users || [DEFAULT_ADMIN];
        if (!userList.some((u: User) => u.username === 'Automa_5')) {
          userList = [DEFAULT_ADMIN, ...userList];
        }
        setUsers(userList);
        setTasks(d.tasks || []);
        setBusinessHours(d.hours || INITIAL_HOURS);
        setSyncUrl(d.syncUrl || '');
        setLastSync(d.lastSync || 'Local');
      } catch (e) { 
        console.error("Error al cargar local", e); 
        setUsers([DEFAULT_ADMIN]);
      }
    }
  }, []);

  // Persistencia local automática cada vez que algo cambie
  useEffect(() => {
    localStorage.setItem('taskflow_v8_data', JSON.stringify({ 
      users, 
      tasks, 
      hours: businessHours, 
      syncUrl,
      lastSync 
    }));
  }, [users, tasks, businessHours, syncUrl, lastSync]);

  const syncWithCloud = async (urlOverride?: string, force = false) => {
    const url = urlOverride || syncUrl;
    if (!url) return;

    if (!force) {
      const confirmSync = confirm("ADVERTENCIA: Esta acción descargará la base de datos de la nube y SOBRESCRIBIRÁ todos tus cambios locales actuales. ¿Estás seguro?");
      if (!confirmSync) return;
    }

    setIsSyncing(true);
    try {
      const directUrl = convertCloudLink(url);
      let data;

      try {
        const response = await fetch(directUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error();
        data = await response.json();
      } catch (e) {
        // Fallback a proxy si falla CORS
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}&timestamp=${Date.now()}`;
        const proxyRes = await fetch(proxyUrl);
        const proxyData = await proxyRes.json();
        data = JSON.parse(proxyData.contents);
      }

      if (data && data.users && Array.isArray(data.users)) {
        // Asegurar que Automa_5 siempre esté
        let newUserList = data.users;
        if (!newUserList.some((u: User) => u.username === 'Automa_5')) {
          newUserList = [DEFAULT_ADMIN, ...newUserList];
        }
        setUsers(newUserList);
        setTasks(data.tasks || []);
        if (data.businessHours) setBusinessHours(data.businessHours);
        setLastSync(new Date().toLocaleTimeString());
        alert('Sincronización exitosa. Datos actualizados desde la nube.');
      } else {
        alert('El archivo en la nube no tiene un formato válido.');
      }
    } catch (error) {
      console.error("Cloud Sync Error:", error);
      alert('Error al conectar con la nube. Verifica el enlace y que el archivo sea público.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (u: string, p: string) => {
    const found = users.find(usr => usr.username === u && usr.password === p);
    if (found) setCurrentUser(found);
    else alert('Credenciales incorrectas. (Admin: Automa_5 / 14569)');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] p-6">
        <div className="max-w-md w-full bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 shadow-2xl overflow-hidden p-12 text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-indigo-500/40 rotate-3">
             <CheckSquare size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-8">TaskFlow <span className="text-indigo-500">PRO</span></h1>
          
          <LoginForm users={users} onLogin={handleLogin} />
          
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${syncUrl ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
              {syncUrl ? `Sincronización habilitada (${lastSync})` : 'Modo local activo'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shrink-0 border-r border-white/5 shadow-2xl z-40">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-xl rotate-3"><CheckSquare size={24} /></div>
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
          <div className="flex items-center gap-4">
            {syncUrl && (
              <button onClick={() => syncWithCloud()} className="bg-white border px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all active:scale-95">
                <RefreshCw size={14} className={isSyncing ? 'animate-spin text-indigo-500' : ''} /> {isSyncing ? 'Sincronizando...' : `Refrescar Nube`}
              </button>
            )}
            <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-2">
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
          <SettingsView 
            syncUrl={syncUrl} 
            setSyncUrl={setSyncUrl} 
            hours={businessHours} 
            setHours={setBusinessHours}
            onSync={() => syncWithCloud()}
            onExport={() => {
              const data = { users, tasks, businessHours, syncUrl, date: new Date().toISOString() };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'database.json'; a.click();
            }}
            onImport={(e:any) => {
              const reader = new FileReader();
              reader.onload = (ev) => {
                try {
                  const data = JSON.parse(ev.target?.result as string);
                  if (data.users) {
                    setUsers(data.users); 
                    setTasks(data.tasks || []); 
                    setBusinessHours(data.businessHours || INITIAL_HOURS);
                    alert('Base de datos local actualizada.');
                  }
                } catch(err) { alert('Archivo inválido.'); }
              };
              reader.readAsText(e.target.files[0]);
            }}
          />
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
      <select className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none cursor-pointer" value={u} onChange={e => setU(e.target.value)} required>
        <option value="" disabled className="bg-[#0a0f1d]">Selecciona Perfil</option>
        {users.map((usr: any) => <option key={usr.id} value={usr.username} className="bg-[#0a0f1d]">{usr.name} (@{usr.username})</option>)}
      </select>
      <input type="password" placeholder="Contraseña" className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none" value={p} onChange={e => setP(e.target.value)} required />
      <button className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-500 transition-all">ACCEDER</button>
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
             <div className={`p-6 rounded-[24px] ${s.color} text-white`}><Clock size={24}/></div>
             <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p><p className="text-4xl font-black">{s.val}</p></div>
          </div>
        ))}
      </div>
      {role === 'admin' && efficiency.length > 0 && (
        <div className="bg-white p-12 rounded-[48px] border border-slate-100 shadow-sm h-[500px]">
          <h3 className="text-xl font-black mb-12 flex items-center gap-3"><TrendingUp className="text-indigo-600"/> Eficiencia del Equipo (%)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={efficiency}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="val" radius={[10, 10, 0, 0]} barSize={60}>
                {efficiency.map((e:any, i:number) => <Cell key={i} fill={e.val > 80 ? '#10b981' : e.val > 50 ? '#6366f1' : '#f59e0b'} />)}
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
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
          <Plus size={20}/> NUEVA TAREA
        </button>
      )}
      <div className="grid grid-cols-1 gap-6">
        {tasks.map((t: Task) => (
          <div key={t.id} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col group">
             <div className="flex justify-between items-start mb-6">
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{t.status}</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase">Est: {t.estimatedHours}h</span>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">→ {users.find((u:any)=>u.id === t.assignedTo)?.name}</span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{t.title}</h4>
                  <p className="text-slate-500 mt-4 leading-relaxed font-medium">{t.description}</p>
               </div>
               {role === 'admin' && <button onClick={() => confirm('¿Borrar?') && onDelete(t.id)} className="text-slate-200 hover:text-red-500 p-2 transition-all"><Trash2/></button>}
             </div>
             {role === 'user' && t.status !== 'completed' && (
               <div className="mt-8 pt-8 border-t flex flex-wrap gap-4">
                 {t.status === 'pending' ? (
                   <button onClick={() => onUpdate(t.id, {status: 'accepted', acceptedAt: Date.now()})} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl">COMENZAR</button>
                 ) : (
                   <div className="flex-1 flex gap-4">
                      <input className="flex-1 bg-slate-50 border rounded-2xl px-6 py-4 font-bold outline-none" placeholder="Avance..." value={note} onChange={e => setNote(e.target.value)} />
                      <button onClick={() => { if(note) { onUpdate(t.id, {notes: [...t.notes, {id: Date.now().toString(), text: note, timestamp: Date.now()}]}); setNote(''); } }} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black">NOTAR</button>
                      <button onClick={() => t.notes.length > 0 ? onUpdate(t.id, {status: 'completed', completedAt: Date.now()}) : alert('Debes agregar un reporte.')} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black">TERMINAR</button>
                   </div>
                 )}
               </div>
             )}
             {t.notes.length > 0 && (
               <div className="mt-8 space-y-2">
                 {t.notes.map((n:any)=><div key={n.id} className="bg-slate-50 p-4 rounded-2xl text-xs font-bold flex justify-between"><span>{n.text}</span><span className="text-slate-400">{new Date(n.timestamp).toLocaleTimeString()}</span></div>)}
               </div>
             )}
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8 z-[60]">
          <div className="bg-white p-12 rounded-[56px] w-full max-w-md shadow-2xl relative">
             <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500"><X size={24}/></button>
             <h3 className="text-3xl font-black mb-8 tracking-tighter text-slate-900">Asignar Labor</h3>
             <div className="space-y-4">
                <input placeholder="Título" className="w-full px-8 py-5 bg-slate-50 border rounded-3xl font-bold outline-none" value={f.title} onChange={e => setF({...f, title: e.target.value})} />
                <textarea placeholder="Descripción..." className="w-full px-8 py-5 bg-slate-50 border rounded-3xl font-medium h-32 outline-none resize-none" value={f.description} onChange={e => setF({...f, description: e.target.value})} />
                <input type="number" placeholder="Horas" className="w-full px-8 py-5 bg-slate-50 border rounded-3xl font-bold outline-none" value={f.estimatedHours} onChange={e => setF({...f, estimatedHours: Number(e.target.value)})} />
                {/* Fixed line 452 (in original source line numbers might differ slightly, but this addresses the value=\"\" error): Changed escaped quotes to standard JSX string literal. */}
                <select className="w-full px-8 py-5 bg-slate-50 border rounded-3xl font-bold outline-none cursor-pointer" value={f.assignedTo} onChange={e => setF({...f, assignedTo: e.target.value})}>
                    <option value="" disabled>Seleccionar Colaborador</option>
                    {users.filter((u:any)=>u.role==='user').map((u:any)=><option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
             </div>
             <button onClick={() => { if(f.title && f.assignedTo) { onAdd(f); setShowModal(false); } }} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl mt-8">PUBLICAR</button>
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
    if (!f.name || !f.username || !f.password) return alert('Completa todo');
    if (modal.editing) onUpdate(modal.editing, f);
    else onAdd(f);
    setModal({ open: false, editing: null });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between">
        <h3 className="text-2xl font-black uppercase tracking-widest">Colaboradores</h3>
        <button onClick={() => setModal({open:true, editing:null})} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 flex items-center gap-2">
          <Plus size={20}/> NUEVO PERFIL
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {users.map((u:User) => (
          <div key={u.id} className="bg-white p-10 rounded-[48px] border border-slate-100 text-center flex flex-col items-center relative group shadow-sm transition-all hover:border-indigo-200">
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setModal({open:true, editing:u.id}); setF({name:u.name,username:u.username,password:u.password||'',role:u.role}); }} className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all"><Edit2 size={16}/></button>
              <button onClick={() => onDelete(u.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
            </div>
            <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center font-black text-2xl mb-6 shadow-xl ${u.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{u.name[0]}</div>
            <p className="font-black text-xl mb-1 text-slate-900">{u.name}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">@{u.username}</p>
            <div className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>{u.role}</div>
          </div>
        ))}
      </div>
      {modal.open && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8 z-[60]">
          <div className="bg-white p-12 rounded-[56px] w-full max-w-md shadow-2xl relative">
             <button onClick={() => setModal({open: false, editing: null})} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500"><X size={24}/></button>
             <h3 className="text-3xl font-black mb-8 tracking-tighter text-slate-900">{modal.editing ? 'Editar' : 'Crear'} Acceso</h3>
             <div className="space-y-4">
                <input placeholder="Nombre Real" className="w-full px-8 py-5 bg-slate-50 border rounded-3xl font-bold outline-none" value={f.name} onChange={e => setF({...f, name: e.target.value})} />
                <input placeholder="Usuario (Login)" className="w-full px-8 py-5 bg-slate-50 border rounded-3xl font-bold outline-none" value={f.username} onChange={e => setF({...f, username: e.target.value})} />
                <input type="password" placeholder="Clave" className="w-full px-8 py-5 bg-slate-50 border rounded-3xl font-bold outline-none" value={f.password} onChange={e => setF({...f, password: e.target.value})} />
                <select className="w-full px-8 py-5 bg-slate-50 border rounded-3xl font-bold outline-none cursor-pointer" value={f.role} onChange={e => setF({...f, role: e.target.value as Role})}>
                    <option value="user">USER (Colaborador)</option>
                    <option value="admin">ADMIN (Administrador)</option>
                </select>
             </div>
             <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black mt-10 shadow-xl shadow-indigo-600/30 uppercase text-xs tracking-widest transition-all active:scale-95">GUARDAR</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ syncUrl, setSyncUrl, hours, setHours, onSync, onExport, onImport }: any) => {
  return (
    <div className="max-w-4xl space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100">
        <h3 className="text-2xl font-black mb-8 flex items-center gap-4"><Clock className="text-indigo-600"/> Horarios Operativos</h3>
        <div className="space-y-3">
          {Object.entries(hours).map(([day, config]: any) => (
            <div key={day} className={`flex items-center justify-between p-6 rounded-[32px] border transition-all ${config.active ? 'bg-slate-50' : 'opacity-30 grayscale'}`}>
              <div className="flex items-center gap-6">
                <input type="checkbox" checked={config.active} onChange={e => setHours({...hours, [day]: {...config, active: e.target.checked}})} className="w-6 h-6 rounded-lg accent-indigo-600 cursor-pointer" />
                <span className="font-black uppercase text-xs tracking-widest w-24">Día {day}</span>
              </div>
              <div className="flex gap-4">
                <input type="time" value={config.start} onChange={e => setHours({...hours, [day]: {...config, start: e.target.value}})} className="px-4 py-2 border rounded-xl font-bold bg-white outline-none" />
                <input type="time" value={config.end} onChange={e => setHours({...hours, [day]: {...config, end: e.target.value}})} className="px-4 py-2 border rounded-xl font-bold bg-white outline-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#0f172a] p-12 rounded-[48px] shadow-2xl text-white space-y-8 border border-white/5">
        <h3 className="text-2xl font-black flex items-center gap-4"><Cloud className="text-indigo-400" /> Sincronización en la Nube</h3>
        
        <div className="bg-amber-500/10 p-6 rounded-3xl border border-amber-500/20 flex gap-4 items-center">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <p className="text-[11px] font-bold text-amber-200 uppercase leading-relaxed">
            Importante: Si haces cambios locales (nuevas tareas/usuarios), debes **Exportar** y subir el archivo a GitHub manualmente antes de **Sincronizar**. Sincronizar descargará lo que está en la nube y borrará tus cambios locales no guardados en el archivo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Enlace de la Base de Datos</p>
            <input type="text" placeholder="GitHub Raw o Google Drive link..." className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" value={syncUrl} onChange={e => setSyncUrl(e.target.value)} />
            <button onClick={onSync} className="w-full bg-indigo-600 text-white py-4 rounded-3xl font-black uppercase text-xs flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
              <RefreshCw size={18} /> Importar desde Nube
            </button>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Flujo de Trabajo Manual</p>
            <div className="flex flex-col gap-3">
              <button onClick={onExport} className="bg-white text-slate-900 py-4 rounded-3xl font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95 shadow-xl">
                <Download size={18}/> 1. Exportar database.json
              </button>
              <label className="bg-white/10 text-white py-4 rounded-3xl font-black uppercase text-xs flex items-center justify-center gap-3 cursor-pointer hover:bg-white/20 transition-all active:scale-95 border border-white/10">
                <Upload size={18}/> Cargar Backup Local <input type="file" className="hidden" accept=".json" onChange={onImport} />
              </label>
            </div>
          </div>
        </div>
        
        <div className="bg-white/5 p-8 rounded-[40px] border border-white/5 space-y-4">
           <p className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
             <Info size={16}/> Instrucciones para Multiusuario:
           </p>
           <ul className="text-[10px] text-slate-400 space-y-3 font-bold uppercase">
             <li className="flex items-center gap-3"><span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-[10px] text-white">1</span> Haz tus cambios (usuarios, tareas).</li>
             <li className="flex items-center gap-3"><span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-[10px] text-white">2</span> Clic en "1. Exportar database.json" (Descarga a tu PC).</li>
             <li className="flex items-center gap-3"><span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-[10px] text-white">3</span> Sube ese archivo a GitHub reemplazando el viejo.</li>
             <li className="flex items-center gap-3 text-emerald-400"><span className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center text-[10px] text-emerald-400">4</span> Clic en "Importar desde Nube" para confirmar la sincronización.</li>
           </ul>
        </div>
      </div>
    </div>
  );
};

const SidebarBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 font-black' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300 font-bold'}`}>
    {icon} <span>{label}</span>
  </button>
);

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
