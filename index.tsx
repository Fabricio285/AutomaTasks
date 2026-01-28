
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LayoutDashboard, CheckSquare, Users, Settings, LogOut, Plus, Clock, 
  FileText, TrendingUp, AlertCircle, Database, Download, Upload, 
  Cloud, RefreshCw, Github, ExternalLink, Info, BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

// --- 1. DEFINICIÓN DE TIPOS ---

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

interface BusinessDayConfig {
  active: boolean;
  start: string;
  end: string;
}

interface BusinessHours {
  [key: number]: BusinessDayConfig;
}

// --- 2. CONSTANTES ---

const INITIAL_BUSINESS_HOURS: BusinessHours = {
  0: { active: false, start: "09:00", end: "17:00" },
  1: { active: true, start: "09:00", end: "17:00" },
  2: { active: true, start: "09:00", end: "17:00" },
  3: { active: true, start: "09:00", end: "17:00" },
  4: { active: true, start: "09:00", end: "17:00" },
  5: { active: true, start: "09:00", end: "17:00" },
  6: { active: false, start: "09:00", end: "17:00" },
};

// --- 3. UTILIDADES ---

const convertDriveLink = (url: string): string => {
  if (!url) return '';
  const idMatch = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
  const id = idMatch ? idMatch[1] : null;
  return id ? `https://docs.google.com/uc?export=download&id=${id}` : url;
};

const calculateWorkingHoursElapsed = (start: number, end: number, config: BusinessHours): number => {
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

// --- 4. COMPONENTES DE INTERFAZ ---

const LoginPage = ({ onLogin, isSyncing }: any) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] p-6">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-12 text-center bg-gradient-to-b from-indigo-500/10 to-transparent">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3">
             <CheckSquare size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">TaskFlow <span className="text-indigo-500">PRO</span></h1>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Panel de Acceso</p>
        </div>
        <form className="p-12 space-y-6" onSubmit={e => { e.preventDefault(); onLogin(u, p); }}>
          <input type="text" placeholder="Usuario" className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" value={u} onChange={e => setU(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" value={p} onChange={e => setP(e.target.value)} required />
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95">
            {isSyncing ? 'SINCRONIZANDO...' : 'ENTRAR AL SISTEMA'}
          </button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(INITIAL_BUSINESS_HOURS);
  const [syncUrl, setSyncUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    const saved = localStorage.getItem('tf_data');
    if (saved) {
      const d = JSON.parse(saved);
      setUsers(d.users || []);
      setTasks(d.tasks || []);
      setBusinessHours(d.hours || INITIAL_BUSINESS_HOURS);
      setSyncUrl(d.url || '');
    } else {
      setUsers([{ id: 'admin-1', name: 'Automa_5', username: 'Automa_5', password: '14569', role: 'admin' }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tf_data', JSON.stringify({ users, tasks, hours: businessHours, url: syncUrl }));
  }, [users, tasks, businessHours, syncUrl]);

  const handleLogin = (u: string, p: string) => {
    const found = users.find(usr => usr.username === u && usr.password === p);
    if (found) setCurrentUser(found);
    else alert('Credenciales incorrectas');
  };

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
      const eff = totalActual > 0 ? Math.round((totalEst / totalActual) * 100) : 0;
      return { name: u.name, efficiency: eff };
    });
  }, [users, tasks, businessHours]);

  if (!currentUser) return <LoginPage onLogin={handleLogin} isSyncing={isSyncing} />;

  const userTasks = currentUser.role === 'admin' ? tasks : tasks.filter(t => t.assignedTo === currentUser.id);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shrink-0">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg rotate-3"><CheckSquare size={24} /></div>
          <span className="text-2xl font-black tracking-tighter uppercase">TaskFlow</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20}/>} label="Panel Central" />
          <NavItem active={view === 'tasks'} onClick={() => setView('tasks')} icon={<CheckSquare size={20}/>} label="Mis Tareas" />
          {currentUser.role === 'admin' && (
            <>
              <div className="pt-8 pb-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Gestión</div>
              <NavItem active={view === 'users'} onClick={() => setView('users')} icon={<Users size={20}/>} label="Equipo" />
              <NavItem active={view === 'settings'} onClick={() => setView('settings')} icon={<Settings size={20}/>} label="Configuración" />
            </>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5 space-y-6">
          <div className="flex items-center gap-4 px-4">
            <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center font-black text-indigo-400">{currentUser.name[0]}</div>
            <div>
              <p className="text-sm font-black truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center gap-3 px-6 py-4 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all font-bold">
            <LogOut size={18} /> <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 relative no-scrollbar">
        <header className="flex justify-between items-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter capitalize">{view === 'dashboard' ? 'Resumen de Operaciones' : view}</h2>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Red</p>
             <div className="flex items-center gap-2 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-700">Sistema en Línea</span>
             </div>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Pendientes" value={userTasks.filter(t => t.status === 'pending').length} color="bg-amber-500" icon={<Clock size={24}/>} />
              <StatCard label="En Proceso" value={userTasks.filter(t => t.status === 'accepted').length} color="bg-indigo-600" icon={<RefreshCw size={24}/>} />
              <StatCard label="Finalizadas" value={userTasks.filter(t => t.status === 'completed').length} color="bg-emerald-500" icon={<CheckSquare size={24}/>} />
            </div>

            {currentUser.role === 'admin' && (
              <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-12">
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl"><TrendingUp size={30} /></div>
                  <h3 className="text-2xl font-black tracking-tighter">Eficiencia del Equipo (%)</h3>
                </div>
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
          <TasksView 
            user={currentUser} tasks={userTasks} users={users} 
            onAdd={(t:any) => setTasks([...tasks, {...t, id: Date.now().toString(), status: 'pending', createdAt: Date.now(), notes: []}])}
            onUpdate={(id:string, u:any) => setTasks(tasks.map(t => t.id === id ? {...t, ...u} : t))}
            onDelete={(id:string) => setTasks(tasks.filter(t => t.id !== id))}
          />
        )}

        {view === 'users' && <UsersView users={users} onAdd={(u:any) => setUsers([...users, {...u, id: Date.now().toString()}])} />}
        
        {view === 'settings' && (
           <SettingsView 
              config={businessHours} setConfig={setBusinessHours} 
              syncUrl={syncUrl} setSyncUrl={setSyncUrl} 
           />
        )}
      </main>
    </div>
  );
};

// --- SUB-VIEWS ---

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 font-black' : 'text-slate-500 hover:bg-white/5 font-bold'}`}>
    {icon} <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, color, icon }: any) => (
  <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex items-center gap-8">
    <div className={`p-6 rounded-[24px] ${color} text-white shadow-xl`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black tracking-tighter">{value}</p>
    </div>
  </div>
);

const TasksView = ({ user, tasks, users, onAdd, onUpdate, onDelete }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', estimatedHours: 1 });
  const [noteText, setNoteText] = useState('');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gestión de Flujo</p>
           <h3 className="text-xl font-black text-slate-900">Listado de Actividades</h3>
        </div>
        {user.role === 'admin' && (
          <button onClick={() => setIsOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-3">
             <Plus size={20}/> NUEVA TAREA
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tasks.map((t:any) => (
          <div key={t.id} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500">
             <div className="flex justify-between items-start mb-8">
                <div>
                   <div className="flex items-center gap-3 mb-4">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : t.status === 'accepted' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                        {t.status}
                      </span>
                      <span className="text-[9px] font-black text-slate-300 uppercase">EST: {t.estimatedHours}H</span>
                   </div>
                   <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">{t.title}</h4>
                   <p className="text-slate-500 font-medium leading-relaxed max-w-2xl">{t.description}</p>
                </div>
                {user.role === 'admin' && (
                  <button onClick={() => onDelete(t.id)} className="text-slate-200 hover:text-red-500 p-2"><LogOut size={20} className="rotate-180"/></button>
                )}
             </div>

             {user.role === 'user' && t.status !== 'completed' && (
               <div className="mt-8 pt-8 border-t border-slate-50 flex gap-4">
                  {t.status === 'pending' ? (
                    <button onClick={() => onUpdate(t.id, {status: 'accepted', acceptedAt: Date.now()})} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">ACEPTAR TAREA</button>
                  ) : (
                    <div className="flex-1 flex gap-4">
                       <input type="text" placeholder="Agregar nota de avance..." className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={noteText} onChange={e => setNoteText(e.target.value)} />
                       <button onClick={() => { if(noteText) { onUpdate(t.id, {notes: [...t.notes, {id: Date.now().toString(), text: noteText, timestamp: Date.now()}]}); setNoteText(''); } }} className="bg-slate-900 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">GUARDAR NOTA</button>
                       <button onClick={() => t.notes.length > 0 ? onUpdate(t.id, {status: 'completed', completedAt: Date.now()}) : alert('Debes agregar al menos una nota.')} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20">FINALIZAR</button>
                    </div>
                  )}
               </div>
             )}

             {t.notes.length > 0 && (
               <div className="mt-8 space-y-3">
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2">Bitácora de Avance</p>
                  {t.notes.map((n:any) => (
                    <div key={n.id} className="bg-slate-50/50 p-4 rounded-2xl flex justify-between items-center border border-slate-100/50">
                       <p className="text-sm font-bold text-slate-700">{n.text}</p>
                       <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(n.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
               </div>
             )}
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8 z-50 animate-in fade-in duration-300">
          <div className="bg-white p-12 rounded-[56px] w-full max-w-2xl shadow-2xl space-y-8">
             <h3 className="text-3xl font-black tracking-tighter">Nueva Asignación</h3>
             <div className="space-y-6">
                <input type="text" placeholder="Título" className="w-full px-8 py-5 bg-slate-50 border-slate-100 rounded-3xl font-bold" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                <textarea placeholder="Descripción detallada" className="w-full px-8 py-5 bg-slate-50 border-slate-100 rounded-3xl font-medium h-32" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" placeholder="Horas Est." className="px-8 py-5 bg-slate-50 border-slate-100 rounded-3xl font-bold" value={form.estimatedHours} onChange={e => setForm({...form, estimatedHours: Number(e.target.value)})} />
                   <select className="px-8 py-5 bg-slate-50 border-slate-100 rounded-3xl font-bold" value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}>
                      <option value="">Asignar a...</option>
                      {users.filter((u:any)=>u.role==='user').map((u:any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                   </select>
                </div>
             </div>
             <div className="flex gap-4">
                <button onClick={() => setIsOpen(false)} className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest">CANCELAR</button>
                <button onClick={() => { onAdd(form); setIsOpen(false); }} className="flex-[3] bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-indigo-600/30">PUBLICAR TAREA</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UsersView = ({ users, onAdd }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [f, setF] = useState({ name: '', username: '', password: '', role: 'user' });
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-12">
         <h3 className="text-2xl font-black tracking-tighter text-slate-900">Equipo de Trabajo</h3>
         <button onClick={() => setIsOpen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">AÑADIR MIEMBRO</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {users.map((u:any) => (
          <div key={u.id} className="bg-white p-10 rounded-[48px] border border-slate-100 text-center flex flex-col items-center hover:scale-[1.02] transition-all duration-500">
             <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center font-black text-3xl mb-6 shadow-2xl ${u.role === 'admin' ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-slate-100 text-slate-400'}`}>{u.name[0]}</div>
             <p className="font-black text-xl mb-1">{u.name}</p>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">@{u.username}</p>
             <div className="px-6 py-2 bg-slate-50 rounded-full text-[9px] font-black uppercase text-slate-500 tracking-widest">{u.role}</div>
          </div>
        ))}
      </div>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8 z-50">
          <div className="bg-white p-12 rounded-[56px] w-full max-w-md shadow-2xl space-y-6">
             <h3 className="text-3xl font-black tracking-tighter">Nueva Cuenta</h3>
             <input type="text" placeholder="Nombre real" className="w-full px-8 py-5 bg-slate-50 rounded-3xl font-bold" value={f.name} onChange={e => setF({...f, name: e.target.value})} />
             <input type="text" placeholder="Usuario" className="w-full px-8 py-5 bg-slate-50 rounded-3xl font-bold" value={f.username} onChange={e => setF({...f, username: e.target.value})} />
             <input type="password" placeholder="Clave" className="w-full px-8 py-5 bg-slate-50 rounded-3xl font-bold" value={f.password} onChange={e => setF({...f, password: e.target.value})} />
             <select className="w-full px-8 py-5 bg-slate-50 rounded-3xl font-bold" value={f.role} onChange={e => setF({...f, role: e.target.value as any})}>
                <option value="user">Colaborador</option>
                <option value="admin">Administrador</option>
             </select>
             <button onClick={() => { onAdd(f); setIsOpen(false); }} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-indigo-600/30">CREAR ACCESO</button>
             <button onClick={() => setIsOpen(false)} className="w-full text-slate-400 font-black uppercase text-[10px] pt-2">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ config, setConfig, syncUrl, setSyncUrl }: any) => {
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  return (
    <div className="max-w-4xl space-y-12 pb-20 animate-in fade-in duration-500">
      <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100">
         <div className="flex items-center gap-4 mb-10 text-indigo-600"><Clock size={32}/><h3 className="text-2xl font-black tracking-tighter text-slate-900">Horas Laborales</h3></div>
         <div className="space-y-3">
            {days.map((d, i) => (
              <div key={i} className={`flex items-center justify-between p-6 rounded-[32px] border transition-all ${config[i].active ? 'bg-slate-50 border-slate-100 shadow-sm' : 'bg-white border-slate-50 opacity-30 grayscale'}`}>
                 <div className="flex items-center gap-6">
                    <input type="checkbox" checked={config[i].active} onChange={e => setConfig({...config, [i]: {...config[i], active: e.target.checked}})} className="w-6 h-6 rounded-lg text-indigo-600" />
                    <span className="font-black uppercase text-xs tracking-widest w-24 text-slate-800">{d}</span>
                 </div>
                 <div className="flex items-center gap-4">
                    <input type="time" value={config[i].start} onChange={e => setConfig({...config, [i]: {...config[i], start: e.target.value}})} className="px-6 py-3 border border-slate-200 rounded-2xl text-xs font-black" />
                    <span className="text-slate-300 font-black">→</span>
                    <input type="time" value={config[i].end} onChange={e => setConfig({...config, [i]: {...config[i], end: e.target.value}})} className="px-6 py-3 border border-slate-200 rounded-2xl text-xs font-black" />
                 </div>
              </div>
            ))}
         </div>
      </div>
      
      <div className="bg-slate-900 p-12 rounded-[48px] shadow-2xl text-white">
         <div className="flex items-center gap-4 mb-8 text-indigo-400"><Cloud size={32}/><h3 className="text-2xl font-black tracking-tighter">Cloud Backup (Google Drive)</h3></div>
         <p className="text-slate-400 text-sm mb-8 leading-relaxed">Pega el enlace de compartir de tu archivo <b>database.json</b> subido a Drive para sincronizar con todo el equipo.</p>
         <div className="bg-white/5 p-2 rounded-3xl border border-white/10">
            <input type="text" placeholder="https://drive.google.com/..." className="w-full px-6 py-4 bg-transparent outline-none text-xs font-bold text-white font-mono" value={syncUrl} onChange={e => setSyncUrl(e.target.value)} />
         </div>
         <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/5 text-[11px] font-bold text-slate-400 flex items-start gap-4">
            <AlertCircle size={20} className="text-amber-400 shrink-0" />
            <p className="uppercase leading-tight">IMPORTANTE: El archivo en Drive debe estar configurado como "Cualquier persona con el enlace puede ver".</p>
         </div>
      </div>
    </div>
  );
};

// --- RENDERIZADO INICIAL ---

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
