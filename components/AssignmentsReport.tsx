import React, { useState, useMemo } from 'react';
import { Territory, User } from '../types';
import { formatDate, getDaysRemaining } from '../utils/helpers';

interface AssignmentsReportProps {
    territories: Territory[];
    users: User[];
}

const AssignmentsReport: React.FC<AssignmentsReportProps> = ({ territories, users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'worked' | 'not-worked' | 'overdue'>('all');

    const assignments = useMemo(() => {
        return territories
            .filter(t => t.assignedTo)
            .map(t => {
                const publisher = users.find(u => u.uid === t.assignedTo);
                return {
                    ...t,
                    publisherName: publisher?.displayName || t.assignedToName || 'Desconhecido',
                    daysRemaining: getDaysRemaining(t.dueDate) ?? 0,
                    isOverdue: (getDaysRemaining(t.dueDate) ?? 0) < 0
                };
            });
    }, [territories, users]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const matchesSearch = 
                a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.publisherName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = 
                statusFilter === 'all' ||
                (statusFilter === 'worked' && a.workedOn) ||
                (statusFilter === 'not-worked' && !a.workedOn) ||
                (statusFilter === 'overdue' && a.isOverdue);
                
            return matchesSearch && matchesStatus;
        });
    }, [assignments, searchTerm, statusFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Buscar por publicador ou mapa..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setStatusFilter('worked')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'worked' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Trabalhados
                    </button>
                    <button 
                        onClick={() => setStatusFilter('overdue')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'overdue' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Atrasados
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Mapa</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Publicador</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Atribuído em</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vencimento</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredAssignments.length > 0 ? (
                                filteredAssignments.map((a) => (
                                    <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black">
                                                    {a.number || '#'}
                                                </div>
                                                <span className="font-bold text-gray-900">{a.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-600">{a.publisherName}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-500">{formatDate(a.assignmentDate)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-bold ${a.isOverdue ? 'text-red-500' : 'text-gray-600'}`}>
                                                {formatDate(a.dueDate)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {a.workedOn ? (
                                                    <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Trabalhado</span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-500 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Pendente</span>
                                                )}
                                                {a.isOverdue && (
                                                    <span className="bg-red-100 text-red-700 text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Atrasado</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </div>
                                            <p className="text-gray-400 font-bold">Nenhuma designação encontrada</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Designado</p>
                    <p className="text-3xl font-black text-gray-900">{assignments.length}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Total Trabalhado</p>
                    <p className="text-3xl font-black text-emerald-600">{assignments.filter(a => a.workedOn).length}</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Total Atrasado</p>
                    <p className="text-3xl font-black text-red-600">{assignments.filter(a => a.isOverdue).length}</p>
                </div>
            </div>
        </div>
    );
};

export default AssignmentsReport;
