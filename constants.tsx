
import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Clock, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  Database, 
  Download, 
  Upload,
  Cloud,
  RefreshCw
} from 'lucide-react';
import { BusinessHours } from './types';

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Tasks: <CheckSquare size={20} />,
  Users: <Users size={20} />,
  Settings: <Settings size={20} />,
  Logout: <LogOut size={20} />,
  Plus: <Plus size={20} />,
  Clock: <Clock size={16} />,
  Notes: <FileText size={16} />,
  Efficiency: <TrendingUp size={20} />,
  Alert: <AlertCircle size={20} />,
  Database: <Database size={20} />,
  Download: <Download size={16} />,
  Upload: <Upload size={16} />,
  Cloud: <Cloud size={20} />,
  Refresh: <RefreshCw size={16} />
};

export const INITIAL_BUSINESS_HOURS: BusinessHours = {
  0: { active: false, start: "09:00", end: "17:00" }, // Sun
  1: { active: true, start: "09:00", end: "17:00" },  // Mon
  2: { active: true, start: "09:00", end: "17:00" },  // Tue
  3: { active: true, start: "09:00", end: "17:00" },  // Wed
  4: { active: true, start: "09:00", end: "17:00" },  // Thu
  5: { active: true, start: "09:00", end: "17:00" },  // Fri
  6: { active: false, start: "09:00", end: "17:00" }, // Sat
};
