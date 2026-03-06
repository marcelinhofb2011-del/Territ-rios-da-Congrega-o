import React, { useState, useEffect, useMemo } from 'react';
import { Territory, TerritoryStatus } from '../types';
import { formatDate, generateServiceYearOptions } from '../utils/helpers';

interface ReportEntry {
  territoryName: string;
  userName: string;
  assignmentDate: Date;
  completedDate: Date | null;
  id: string;
  status: TerritoryStatus;
}

const AssignmentsReport: React.FC<{ territories: Territory[] }> = ({ territories }) => {
  const serviceYearOptions = useMemo(() => generateServiceYearOptions(), []);
  const [filterPeriod, setFilterPeriod] = useState<string>('last-6-months');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [filteredData, setFilteredData] = useState<ReportEntry[]>([]);

  const filterOptions = [
    { label: 'Hoje', value: 'today' },
    { label: 'Últimos 6 meses', value: 'last-6-months' },
    { label: 'Últimos 12 meses', value: 'last-12-months' },
    ...serviceYearOptions,
  ];

  useEffect(() => {
    const allEntries: ReportEntry[] = [];

    territories.forEach(t => {
      // Add history entries
      (t.history || []).forEach((h, index) => {
        allEntries.push({
          territoryName: t.name,
          userName: h.userName,
          assignmentDate: h.assignmentDate,
          completedDate: h.completedDate,
          id: `${t.id}-h-${index}`,
          status: TerritoryStatus.AVAILABLE // It was completed, so it's available now in history context
        });
      });

      // Add current assignment if in use
      if (t.status === TerritoryStatus.IN_USE && t.assignedToName && t.assignmentDate) {
        allEntries.push({
          territoryName: t.name,
          userName: t.assignedToName,
          assignmentDate: t.assignmentDate,
          completedDate: null,
          id: `${t.id}-current`,
          status: TerritoryStatus.IN_USE
        });
      }
    });

    let startDate: Date | null = null;
    let endDate: Date = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (filterPeriod === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    } else if (filterPeriod === 'last-6-months') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
    } else if (filterPeriod === 'last-12-months') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);
    } else if (filterPeriod.startsWith('sy-')) {
        const selectedYear = serviceYearOptions.find(opt => opt.value === filterPeriod);
        if (selectedYear) {
            startDate = selectedYear.startDate;
            endDate = selectedYear.endDate;
        }
    }

    if (startDate) {
        let data = allEntries.filter(entry => {
            // For active assignments, we use assignmentDate for filtering
            // For completed ones, we use completedDate
            const dateToFilter = entry.completedDate || entry.assignmentDate;
            const matchesPeriod = dateToFilter >= startDate! && dateToFilter <= endDate;
            
            const matchesSearch = entry.territoryName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 entry.userName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || 
                                 (statusFilter === 'in-progress' && !entry.completedDate) ||
                                 (statusFilter === 'completed' && entry.completedDate);

            return matchesPeriod && matchesSearch && matchesStatus;
        });
        // Sort by assignment date descending (most recent first)
        data.sort((a, b) => b.assignmentDate.getTime() - a.assignmentDate.getTime());
        setFilteredData(data);
    }
  }, [territories, filterPeriod, serviceYearOptions, searchTerm, statusFilter]);

  const handleExportCsv = async () => {
    const headers = "Publicador,Território,Data de Designação,Data de Devolução\n";
    const csvContent = filteredData.map(row => 
        `"${row.userName}","${row.territoryName}","${formatDate(row.assignmentDate)}","${row.completedDate ? formatDate(row.completedDate) : 'Em andamento'}"`
    ).join("\n");

    const fullCsv = headers + csvContent;
    const blob = new Blob([`\uFEFF${fullCsv}`], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], "relatorio_designacoes.csv", { type: "text/csv" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'Relatório de Designações',
                text: 'Segue o relatório de designações de território.'
            });
        } catch (err) { console.error("Erro ao compartilhar:", err); }
    } else {
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = "relatorio_designacoes.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
  };
  
  const handleExportPdf = () => {
      const selectedOption = filterOptions.find(opt => opt.value === filterPeriod);
      const periodLabel = selectedOption ? selectedOption.label : 'Período selecionado';

      const tableContent = filteredData.map(row => `
          <tr>
              <td>${row.userName}</td>
              <td>${row.territoryName}</td>
              <td>${formatDate(row.assignmentDate)}</td>
              <td>${row.completedDate ? formatDate(row.completedDate) : '<span style="color: #2563eb; font-weight: bold;">Em andamento</span>'}</td>
          </tr>
      `).join('');

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
          alert('Por favor, permita popups para gerar o PDF.');
          return;
      }

      printWindow.document.write(`
          <html>
              <head>
                  <title>Relatório de Designações</title>
                  <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #334155; }
                      table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                      th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; }
                      th { background-color: #f8fafc; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
                      h1 { color: #0f172a; margin-bottom: 5px; font-size: 24px; }
                      h2 { color: #64748b; font-size: 14px; margin-top: 0; font-weight: normal; }
                      .status-tag { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
                      .status-progress { color: #2563eb; background: #eff6ff; }
                      @media print {
                          body { padding: 0; }
                          @page { margin: 2cm; }
                      }
                  </style>
              </head>
              <body>
                  <h1>Relatório de Designações</h1>
                  <h2>Período: ${periodLabel} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}</h2>
                  <table>
                      <thead>
                          <tr>
                              <th>Publicador</th>
                              <th>Território</th>
                              <th>Designado Em</th>
                              <th>Devolvido Em</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${tableContent}
                      </tbody>
                  </table>
                  <script>
                      window.onload = function() {
                          setTimeout(() => {
                              window.print();
                              // Não fechar automaticamente para evitar o erro relatado pelo usuário
                              // window.close(); 
                          }, 500);
                      };
                  </script>
              </body>
          </html>
      `);
      printWindow.document.close();
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Relatório de Designações</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredData.length} registros encontrados</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex-1">
                     <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Buscar por Nome/Número</label>
                     <input 
                        type="text"
                        placeholder="Ex: 01 ou João..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                     />
                </div>
                <div>
                     <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                     <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none shadow-sm"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="in-progress">Em Andamento</option>
                        <option value="completed">Concluídos</option>
                     </select>
                </div>
                <div>
                     <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Período / Ano</label>
                     <select 
                        value={filterPeriod} 
                        onChange={e => setFilterPeriod(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none shadow-sm"
                    >
                        <option value="today">Hoje</option>
                        <option value="last-6-months">Últimos 6 meses</option>
                        <option value="last-12-months">Últimos 12 meses</option>
                        <optgroup label="Ano de Serviço">
                            {serviceYearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </optgroup>
                     </select>
                </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm hover:bg-emerald-700 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM7 6a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 10a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z" /></svg>
                    EXCEL
                </button>
                <button onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm hover:bg-red-700 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm4 10.5a.5.5 0 00.5.5h3a.5.5 0 000-1h-3a.5.5 0 00-.5.5zM8 11.5a.5.5 0 00.5.5h3a.5.5 0 000-1h-3a.5.5 0 00-.5.5zM8 9.5a.5.5 0 00.5.5h3a.5.5 0 000-1h-3a.5.5 0 00-.5.5z" clipRule="evenodd" /></svg>
                    PDF
                </button>
            </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Publicador</th>
                            <th className="px-5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Território</th>
                            <th className="px-5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Designado em</th>
                            <th className="px-5 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider">Devolvido em</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.length > 0 ? filteredData.map(entry => (
                            <tr key={entry.id}>
                                <td className="px-5 py-4 font-bold text-slate-800 whitespace-nowrap">{entry.userName}</td>
                                <td className="px-5 py-4 font-bold text-slate-600 whitespace-nowrap">{entry.territoryName}</td>
                                <td className="px-5 py-4 font-bold text-slate-500 whitespace-nowrap">{formatDate(entry.assignmentDate)}</td>
                                <td className="px-5 py-4 font-bold text-slate-500 whitespace-nowrap">
                                    {entry.completedDate ? formatDate(entry.completedDate) : (
                                        <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider">Em andamento</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-16 text-slate-400 font-bold italic">Nenhum registro encontrado para este período.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default AssignmentsReport;
