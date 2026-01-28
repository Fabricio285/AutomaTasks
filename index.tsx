
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LayoutDashboard, CheckSquare, Users, Settings, LogOut, Plus, Clock, 
  FileText, TrendingUp, AlertCircle, Database, Download, Upload, 
  Cloud, RefreshCw, Info, BarChart2, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

// --- CONFIGURACIÓN Y TIPOS ---

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

const INITIAL_HOURS: BusinessHours = {
  0: { active: false, start: "09:00", end: "17:00" },
  1: { active: true, start: "09:00", end: "17:00" },
  2: { active: true, start: "09:00", end: "17:00" },
  3: { active: true, start: "09:00", end: "17:00" },
  4: { active: true, start: "09:00", end: "17:00" },
  5: { active: true, start: "09:00", end: "17:00" },
  6: { active: false, start: "09:00", end: "17:00" },
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

// --- COMPONENTES ---

const LoginPage = ({ onLogin }: { onLogin: (u: string, p: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] p-6">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-3xl rounded-[48px] border border-white/10 shadow-2xl">
        <div className="p-12 text-center bg-gradient-to-b from-indigo-500/10 to-transparent rounded-t-[48px]">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3">
             <CheckSquare size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">TaskFlow <span className="text-indigo-500">PRO</span></h1>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Acceso Seguro</p>
        </div>
        <form className="p-12 space-y-6" onSubmit={e => { e.preventDefault(); onLogin(username, password); }}>
          <input type="text" placeholder="Usuario" className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" value={username} onChange={e => setUsername(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl active:scale-95">ENTRAR AL SISTEMA</button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(INITIAL_HOURS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    const saved = localStorage.getItem('tf_pro_data');
    if (saved) {
      const d = JSON.parse(saved);
      setUsers(d.users || []);
      setTasks(d.tasks || []);
      setBusinessHours(d.hours || INITIAL_HOURS);
    } else {
      setUsers([{ id: 'admin-1', name: 'Automa_5', username: 'Automa_5', password: '14569', role: 'admin' }]);
    }
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('tf_pro_data', JSON.stringify({ users, tasks, hours: businessHours }));
    }
  }, [users, tasks, businessHours]);

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
      return { name: u.name, efficiency: totalActual > 0 ? Math.round((totalEst / totalActual) * 100) : 0 };
    });
  }, [users, tasks, businessHours]);

  if (!currentUser) return <LoginPage onLogin={(u, p) => {
    const found = users.find(usr => usr.username === u && usr.password === p);
    if (found) setCurrentUser(found);
    else alert('Credenciales incorrectas');
  }} />;

  const filteredTasks = currentUser.role === 'admin' ? tasks : tasks.filter(t => t.assignedTo === currentUser.id);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-[#0f172a] text-white flex flex-col p-8 shrink-0 border-r border-white/5 shadow-2xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg rotate-3"><CheckSquare size={24} /></div>
          <span className="text-2xl font-black tracking-tighter uppercase">TaskFlow</span>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}>
            <LayoutDashboard size={20} /> <span className="font-bold">Dashboard</span>
          </button>
          <button onClick={() => setView('tasks')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${view === 'tasks' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}>
            <CheckSquare size={20} /> <span className="font-bold">Tareas</span>
          </button>
          {currentUser.role === 'admin' && (
            <>
              <button onClick={() => setView('users')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${view === 'users' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}>
                <Users size={20} /> <span className="font-bold">Usuarios</span>
              </button>
              <button onClick={() => setView('settings')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${view === 'settings' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}>
                <Settings size={20} /> <span className="font-bold">Horarios</span>
              </button>
            </>
          )}
        </nav>
        <div className="mt-auto pt-8 border-t border-white/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center font-black text-indigo-400">{currentUser.name[0]}</div>
            <div>
              <p className="text-sm font-black truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black">{currentUser.role}</p>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center gap-3 px-6 py-4 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all font-bold">
            <LogOut size={18} /> <span>Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 no-scrollbar">
        <header className="flex justify-between items-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter capitalize">{view}</h2>
          <div className="bg-emerald-500/10 text-emerald-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sistema Activo
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="Pendientes" value={filteredTasks.filter(t => t.status === 'pending').length} color="bg-amber-500" icon={<Clock size={24}/>} />
              <StatCard label="Proceso" value={filteredTasks.filter(t => t.status === 'accepted').length} color="bg-indigo-600" icon={<RefreshCw size={24}/>} />
              <StatCard label="Finalizadas" value={filteredTasks.filter(t => t.status === 'completed').length} color="bg-emerald-500" icon={<CheckSquare size={24}/>} />
            </div>

            {currentUser.role === 'admin' && (
              <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100">
                <h3 className="text-xl font-black mb-12 flex items-center gap-3"><TrendingUp size={24} className="text-indigo-600"/> Eficiencia del Personal (%)</h3>
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
          <TasksComponent 
            user={currentUser} tasks={filteredTasks} users={users} 
            onUpdate={(id, update) => setTasks(prev => prev.map(t => t.id === id ? {...t, ...update} : t))}
            onDelete={id => setTasks(prev => prev.filter(t => t.id !== id))}
            onAdd={task => setTasks(prev => [...prev, { ...task, id: Date.now().toString(), status: 'pending', createdAt: Date.now(), notes: [] }])}
          />
        )}

        {view === 'users' && (
           <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {users.map(u => (
                 <div key={u.id} className="bg-white p-10 rounded-[48px] border border-slate-100 text-center flex flex-col items-center shadow-sm">
                   <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center font-black text-2xl mb-6 ${u.role === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{u.name[0]}</div>
                   <p className="font-black text-xl mb-1">{u.name}</p>
                   <div className="px-6 py-2 bg-slate-50 rounded-full text-[9px] font-black uppercase text-slate-500 tracking-widest">{u.role}</div>
                 </div>
               ))}
               <button onClick={() => {
                 const name = prompt("Nombre:");
                 const user = prompt("Username:");
                 const pass = prompt("Password:");
                 if(name && user && pass) setUsers([...users, {id: Date.now().toString(), name, username: user, password: pass, role: 'user'}]);
               }} className="bg-white border-2 border-dashed border-slate-200 rounded-[48px] p-10 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all">
                  <Plus size={40} className="mb-4" /> <span className="font-black uppercase text-xs tracking-widest">Añadir Usuario</span>
               </button>
             </div>
           </div>
        )}

        {view === 'settings' && (
          <div className="bg-white p-12 rounded-[48px] shadow-sm border border-slate-100 max-w-4xl space-y-6">
            <h3 className="text-2xl font-black mb-8">Configuración de Jornada</h3>
            {Object.entries(businessHours).map(([day, config]) => (
              <div key={day} className={`flex items-center justify-between p-6 rounded-[32px] border ${config.active ? 'bg-slate-50' : 'opacity-30 grayscale'}`}>
                <div className="flex items-center gap-6">
                  <input type="checkbox" checked={config.active} onChange={e => setBusinessHours({...businessHours, [day]: {...config, active: e.target.checked}})} className="w-6 h-6 rounded-lg accent-indigo-600" />
                  <span className="font-black uppercase text-xs tracking-widest w-24">Día {day}</span>
                </div>
                <div className="flex gap-4">
                  <input type="time" value={config.start} onChange={e => setBusinessHours({...businessHours, [day]: {...config, start: e.target.value}})} className="px-4 py-2 border rounded-xl" />
                  <input type="time" value={config.end} onChange={e => setBusinessHours({...businessHours, [day]: {...config, end: e.target.value}})} className="px-4 py-2 border rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ label, value, color, icon }: any) => (
  <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex items-center gap-8">
    <div className={`p-6 rounded-[24px] ${color} text-white shadow-xl`}>{icon}</div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black tracking-tighter">{value}</p>
    </div>
  </div>
);

const TasksComponent = ({ user, tasks, users, onUpdate, onDelete, onAdd }: any) => {
  const [note, setNote] = useState('');
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {user.role === 'admin' && (
        <button onClick={() => {
           const title = prompt("Título:");
           const desc = prompt("Descripción:");
           const hours = Number(prompt("Horas estimadas:"));
           const userId = prompt("ID del usuario asignado (ver lista equipo):");
           if(title && userId) onAdd({title, description: desc, assignedTo: userId, estimatedHours: hours});
        }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">NUEVA TAREA</button>
      )}
      <div className="grid grid-cols-1 gap-6">
        {tasks.map((t: any) => (
          <div key={t.id} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col">
             <div className="flex justify-between items-start mb-6">
               <div>
                  <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 inline-block ${t.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {t.status}
                  </span>
                  <h4 className="text-2xl font-black">{t.title}</h4>
                  <p className="text-slate-500 mt-2">{t.description}</p>
               </div>
               {user.role === 'admin' && <button onClick={() => onDelete(t.id)} className="text-red-400 p-2"><LogOut size={20}/></button>}
             </div>
             
             {user.role === 'user' && t.status !== 'completed' && (
               <div className="mt-8 pt-8 border-t border-slate-50 flex gap-4">
                 {t.status === 'pending' ? (
                   <button onClick={() => onUpdate(t.id, {status: 'accepted', acceptedAt: Date.now()})} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black">ACEPTAR</button>
                 ) : (
                   <div className="flex-1 flex gap-4">
                      <input className="flex-1 bg-slate-50 border rounded-2xl px-6" placeholder="Escribe un avance..." value={note} onChange={e => setNote(e.target.value)} />
                      <button onClick={() => { if(note) { onUpdate(t.id, {notes: [...t.notes, {id: Date.now().toString(), text: note, timestamp: Date.now()}]}); setNote(''); } }} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px]">NOTAR</button>
                      <button onClick={() => t.notes.length > 0 ? onUpdate(t.id, {status: 'completed', completedAt: Date.now()}) : alert('Mínimo una nota.')} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black">FINALIZAR</button>
                   </div>
                 )}
               </div>
             )}

             {t.notes.length > 0 && (
               <div className="mt-8 space-y-2">
                 {t.notes.map((n:any) => <div key={n.id} className="bg-slate-50 p-4 rounded-2xl text-xs font-bold text-slate-600 flex justify-between"><span>{n.text}</span> <span className="text-slate-400">{new Date(n.timestamp).toLocaleTimeString()}</span></div>)}
               </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

