
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LayoutDashboard, CheckSquare, Users, Settings, LogOut, Plus, Clock, 
  TrendingUp, RefreshCw, Trash2, X, Edit2, Database, Download, Cloud, Info, ExternalLink, ChevronRight
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
  name: 'Administrador', 
  username: 'Automa_5', 
  password: '14569', 
  role: 'admin' 
};

// --- UTILIDADES ---

const convertDriveLink = (url: string): string => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const id = url.split('/d/')[1].split('/')[0];
    return `https://docs.google.com/uc?export=download&id=${id}`;
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

const LoginPage = ({ users, onLogin }: { users: User[], onLogin: (u: string, p: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] p-6 animate-in fade-in duration-700">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-12 text-center bg-gradient-to-b from-indigo-500/10 to-transparent">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3">
             <CheckSquare size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">TaskFlow <span className="text-indigo-500">PRO</span></h1>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Acceso al Sistema</p>
        </div>
        <form className="p-12 space-y-6" onSubmit={e => { e.preventDefault(); onLogin(username, password); }}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Perfil de Usuario</label>
            <select 
              className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none cursor-pointer"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            >
              <option value="" disabled className="bg-[#0a0f1d]">Seleccionar perfil...</option>
              {users.map(u => (
                <option key={u.id} value={u.username} className="bg-[#0a0f1d]">{u.name} (@{u.username})</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95 shadow-indigo-600/20">ENTRAR AL PANEL</button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(INITIAL_HOURS);
  const [syncUrl, setSyncUrl] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('taskflow_v5_data');
    if (saved) {
      const d = JSON.parse(saved);
      let userList = d.users || [];
      if (!userList.some((u: User) => u.username === 'Automa_5')) {
        userList = [DEFAULT_ADMIN, ...userList];
      }
      setUsers(userList);
      setTasks(d.tasks || []);
      setBusinessHours(d.hours || INITIAL_HOURS);
      setSyncUrl(d.syncUrl || '');
    } else {
      setUsers([DEFAULT_ADMIN]);
    }
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('taskflow_v5_data', JSON.stringify({ 
        users, 
        tasks, 
        hours: businessHours,
        syncUrl 
      }));
    }
  }, [users, tasks, businessHours, syncUrl]);

  const fetchCloudData = async () => {
    if (!syncUrl) return alert('Ingresa un enlace de Drive primero.');
    setIsSyncing(true);
    try {
      const fetchUrl = convertDriveLink(syncUrl);
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Error al conectar con Drive');
      const data = await response.json();
      if (data.users && data.tasks) {
        setUsers(data.users);
        setTasks(data.tasks);
        if (data.businessHours) setBusinessHours(data.businessHours);
        alert('Sincronización exitosa.');
      }
    } catch (error) {
      console.error(error);
      alert('Error al sincronizar datos.');
    } finally {
      setIsSyncing(false);
    }
  };

  const exportData = () => {
    const data = { users, tasks, businessHours, syncUrl, date: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const efficiencyData = useMemo(() => {
    return users.filter(u => u.role === 'user').map(u => {
      const completed = tasks.filter(t => t.assignedTo === u.id && t.status === 'completed');
      let totalEst = 0, totalActual = 0;
      completed.forEach(t => {
        if (t.acceptedAt && t.completedAt) {
          totalEst += t.estimatedHours;
          totalActual += calculateWorkHours(t.acceptedAt, t.completedAt, businessHours);
        }
      });
      return { 
        name: u.name, 
        efficiency: totalActual > 0 ? Math.round((totalEst / totalActual) * 100) : 0 
      };
    });
  }, [users, tasks, businessHours]);

  if (!currentUser) {
    return <LoginPage users={users} onLogin={(u, p) => {
      const found = users.find(usr => usr.username === u && usr.password === p);
      if (found) setCurrentUser(found);
      else alert('Credenciales incorrectas');
    }} />;
  }

  const filteredTasks = currentUser.role === 'admin' ? tasks : tasks.filter(t => t.assignedTo === currentUser.id);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shrink-0 border-r border-white/5 shadow-2xl z-40">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg rotate-3"><CheckSquare size={24} /></div>
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
            <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center font-black text-indigo-400">{currentUser.name[0]}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-black truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center gap-3 px-6 py-4 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all font-bold">
            <LogOut size={18} /> <span>Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 no-scrollbar bg-slate-50 z-30">
        <header className="flex justify-between items-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter capitalize">{view}</h2>
          <div className="flex items-center gap-4">
             {syncUrl && (
               <button onClick={fetchCloudData} className="bg-white border px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 flex items-center gap-2">
                  <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> Sincronizar Drive
               </button>
             )}
             <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> {currentUser.role.toUpperCase()} ACTIVO
             </div>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Pendientes" value={filteredTasks.filter(t => t.status === 'pending').length} color="bg-amber-500" icon={<Clock size={24}/>} />
              <StatCard label="En Proceso" value={filteredTasks.filter(t => t.status === 'accepted').length} color="bg-indigo-600" icon={<RefreshCw size={24}/>} />
              <StatCard label="Concluidas" value={filteredTasks.filter(t => t.status === 'completed').length} color="bg-emerald-500" icon={<CheckSquare size={24}/>} />
            </div>

            {currentUser.role === 'admin' && efficiencyData.length > 0 && (
              <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100">
                <h3 className="text-xl font-black mb-12 flex items-center gap-3 text-slate-800"><TrendingUp size={24} className="text-indigo-600"/> Rendimiento del Equipo (%)</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={efficiencyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="efficiency" radius={[12, 12, 0, 0]} barSize={60}>
                        {efficiencyData.map((e, i) => <Cell key={i} fill={e.efficiency > 80 ? '#10b981' : e.efficiency > 50 ? '#6366f1' : '#f59e0b'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'tasks' && (
          <TasksList 
            user={currentUser} tasks={filteredTasks} users={users} 
            onUpdate={(id, update) => setTasks(prev => prev.map(t => t.id === id ? {...t, ...update} : t))}
            onDelete={id => setTasks(prev => prev.filter(t => t.id !== id))}
            onAdd={task => setTasks(prev => [...prev, { ...task, id: Date.now().toString(), status: 'pending', createdAt: Date.now(), notes: [] }])}
          />
        )}

        {view === 'users' && (
           <UsersView 
             users={users} 
             onAdd={(u:any) => setUsers([...users, {...u, id: Date.now().toString()}])}
             onUpdate={(id:string, update:any) => {
               setUsers(prev => prev.map(u => u.id === id ? { ...u, ...update } : u));
             }}
             onDelete={(id:string) => {
               if(id === currentUser.id) return alert('No puedes eliminarte a ti mismo.');
               if(confirm('¿Seguro? Se eliminarán también sus tareas.')) {
                 setUsers(users.filter(u => u.id !== id));
                 setTasks(tasks.filter(t => t.assignedTo !== id));
               }
             }}
           />
        )}

        {view === 'settings' && (
          <div className="max-w-4xl space-y-12 animate-in fade-in duration-500">
             <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100 space-y-6">
                <h3 className="text-2xl font-black mb-8 text-slate-800">Horario de Operación</h3>
                {Object.entries(businessHours).map(([day, config]) => (
                  <div key={day} className={`flex items-center justify-between p-6 rounded-[32px] border transition-all duration-300 ${config.active ? 'bg-slate-50' : 'opacity-30 grayscale'}`}>
                    <div className="flex items-center gap-6">
                      <input type="checkbox" checked={config.active} onChange={e => setBusinessHours({...businessHours, [day]: {...config, active: e.target.checked}})} className="w-6 h-6 rounded-lg accent-indigo-600" />
                      <span className="font-black uppercase text-xs tracking-widest w-24">Día {day}</span>
                    </div>
                    <div className="flex gap-4">
                      <input type="time" value={config.start} onChange={e => setBusinessHours({...businessHours, [day]: {...config, start: e.target.value}})} className="px-4 py-2 border rounded-xl font-bold bg-white" />
                      <input type="time" value={config.end} onChange={e => setBusinessHours({...businessHours, [day]: {...config, end: e.target.value}})} className="px-4 py-2 border rounded-xl font-bold bg-white" />
                    </div>
                  </div>
                ))}
             </div>

             <div className="bg-slate-900 p-12 rounded-[48px] shadow-2xl text-white space-y-8">
                <h3 className="text-2xl font-black flex items-center gap-4"><Cloud className="text-indigo-400" /> Sincronización Drive</h3>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Enlace del Archivo Compartido (JSON)</label>
                   <div className="flex gap-4">
                      <input 
                        type="text" 
                        placeholder="https://drive.google.com/..." 
                        className="flex-1 px-8 py-5 bg-white/5 border border-white/10 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                        value={syncUrl}
                        onChange={e => setSyncUrl(e.target.value)}
                      />
                      <button onClick={fetchCloudData} className="bg-indigo-600 text-white px-8 py-5 rounded-3xl font-black uppercase text-xs tracking-widest">PROBAR</button>
                   </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                   <button onClick={exportData} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                      <Download size={18} /> Exportar Backup
                   </button>
                   <div className="flex-1 bg-white/5 p-6 rounded-3xl border border-white/5 flex items-start gap-4">
                      <Info size={20} className="text-indigo-400 shrink-0" />
                      <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase">Sube tu archivo .json a Drive, actívalo como "Cualquier persona con el enlace" y pega el link arriba.</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const SidebarBtn = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
    {icon} <span className="font-bold">{label}</span>
  </button>
);

const StatCard = ({ label, value, color, icon }: any) => (
  <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex items-center gap-8 group hover:border-indigo-100 transition-all duration-300">
    <div className={`p-6 rounded-[24px] ${color} text-white shadow-xl group-hover:scale-110 transition-transform`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
    </div>
  </div>
);

const UsersView = ({ users, onAdd, onUpdate, onDelete }: any) => {
  const [modal, setModal] = useState({ open: false, editing: null as string | null });
  const [f, setF] = useState({ name: '', username: '', password: '', role: 'user' as Role });

  const handleOpen = (user?: User) => {
    if (user) {
      setModal({ open: true, editing: user.id });
      setF({ name: user.name, username: user.username, password: user.password || '', role: user.role });
    } else {
      setModal({ open: true, editing: null });
      setF({ name: '', username: '', password: '', role: 'user' });
    }
  };

  const handleSave = () => {
    if (!f.name || !f.username || !f.password) return alert('Campos incompletos');
    if (modal.editing) onUpdate(modal.editing, f);
    else onAdd(f);
    setModal({ open: false, editing: null });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase tracking-widest">Equipo de Trabajo</h3>
        <button onClick={() => handleOpen()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
          <Plus size={20}/> NUEVO MIEMBRO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {users.map((u:User) => (
          <div key={u.id} className="bg-white p-10 rounded-[48px] border border-slate-100 text-center flex flex-col items-center shadow-sm relative group overflow-hidden">
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpen(u)} className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl hover:bg-indigo-500 hover:text-white transition-colors"><Edit2 size={16}/></button>
              <button onClick={() => onDelete(u.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16}/></button>
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
             <h3 className="text-3xl font-black mb-8 tracking-tighter">{modal.editing ? 'Editar' : 'Nuevo'} Usuario</h3>
             <div className="space-y-6">
                <input placeholder="Nombre Completo" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={f.name} onChange={e => setF({...f, name: e.target.value})} />
                <input placeholder="Usuario (Login)" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={f.username} onChange={e => setF({...f, username: e.target.value})} />
                <input type="password" placeholder="Contraseña" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={f.password} onChange={e => setF({...f, password: e.target.value})} />
                <select className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none" value={f.role} onChange={e => setF({...f, role: e.target.value as Role})}>
                    <option value="user">USER (Colaborador)</option>
                    <option value="admin">ADMIN (Administrador)</option>
                </select>
             </div>
             <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black mt-10 shadow-xl shadow-indigo-600/30 uppercase text-xs tracking-widest">GUARDAR</button>
          </div>
        </div>
      )}
    </div>
  );
};

const TasksList = ({ user, tasks, users, onUpdate, onDelete, onAdd }: any) => {
  const [modal, setModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [f, setF] = useState({ title: '', description: '', assignedTo: '', estimatedHours: 1 });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {user.role === 'admin' && (
        <button onClick={() => setModal(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
          <Plus size={20}/> NUEVA TAREA
        </button>
      )}

      <div className="grid grid-cols-1 gap-6">
        {tasks.map((t: Task) => (
          <div key={t.id} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col relative group overflow-hidden">
             <div className="flex justify-between items-start mb-6">
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : t.status === 'accepted' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {t.status}
                    </span>
                    <span className="text-[9px] font-black text-slate-300 uppercase">EST: {t.estimatedHours}H</span>
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">→ {users.find((u:any)=>u.id === t.assignedTo)?.name || 'Sin asignar'}</span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{t.title}</h4>
                  <p className="text-slate-500 mt-4 leading-relaxed font-medium">{t.description}</p>
               </div>
               {user.role === 'admin' && (
                 <button onClick={() => confirm('¿Borrar tarea?') && onDelete(t.id)} className="text-slate-200 hover:text-red-500 p-2 transition-colors"><Trash2 size={22}/></button>
               )}
             </div>
             
             {user.role === 'user' && t.status !== 'completed' && (
               <div className="mt-8 pt-8 border-t border-slate-50 flex flex-wrap gap-4">
                 {t.status === 'pending' ? (
                   <button onClick={() => onUpdate(t.id, {status: 'accepted', acceptedAt: Date.now()})} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl uppercase text-xs tracking-widest">ACEPTAR TAREA</button>
                 ) : (
                   <div className="flex-1 flex gap-4 min-w-[300px]">
                      <input className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Registrar avance..." value={noteContent} onChange={e => setNoteContent(e.target.value)} />
                      <button onClick={() => { if(noteContent) { onUpdate(t.id, {notes: [...t.notes, {id: Date.now().toString(), text: noteContent, timestamp: Date.now()}]}); setNoteContent(''); } }} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">NOTAR</button>
                      <button onClick={() => t.notes.length > 0 ? onUpdate(t.id, {status: 'completed', completedAt: Date.now()}) : alert('Registra al menos un avance antes de terminar.')} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/20">FINALIZAR</button>
                   </div>
                 )}
               </div>
             )}

             {t.notes.length > 0 && (
               <div className="mt-10 space-y-3">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Bitácora</p>
                 {t.notes.map((n:any) => (
                   <div key={n.id} className="bg-slate-50/50 p-5 rounded-3xl text-sm font-bold text-slate-700 flex justify-between items-center border border-slate-100/50">
                     <span>{n.text}</span> 
                     <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                 ))}
               </div>
             )}
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-widest">No hay labores asignadas.</div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8 z-[60]">
          <div className="bg-white p-12 rounded-[56px] w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200">
             <button onClick={() => setModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500"><X size={24}/></button>
             <h3 className="text-3xl font-black mb-8 text-slate-900 tracking-tighter">Asignar Labor</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre de Tarea</label>
                    <input placeholder="Ej: Auditoría" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={f.title} onChange={e => setF({...f, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción</label>
                    <textarea placeholder="Detalles operativos..." className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-medium h-32 resize-none outline-none focus:ring-2 focus:ring-indigo-500" value={f.description} onChange={e => setF({...f, description: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Tiempo Estimado (Hrs)</label>
                    <input type="number" className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={f.estimatedHours} onChange={e => setF({...f, estimatedHours: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Responsable</label>
                    <select className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none" value={f.assignedTo} onChange={e => setF({...f, assignedTo: e.target.value})}>
                        <option value="" disabled>Seleccionar miembro...</option>
                        {users.map((u:any) => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                    </select>
                  </div>
                </div>
             </div>
             <button 
                onClick={() => { 
                  if(f.title && f.assignedTo) {
                    onAdd(f); 
                    setModal(false); 
                    setF({title:'',description:'',assignedTo:'',estimatedHours:1});
                  } else alert('Título y Responsable obligatorios.');
                }} 
                className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl mt-10 uppercase tracking-widest text-sm hover:bg-indigo-700 active:scale-95 transition-all"
              >
                PUBLICAR ASIGNACIÓN
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
