import React, { useState, useEffect, useMemo } from 'react';
import { Territory } from '../types';
import { formatDate, generateServiceYearOptions } from '../utils/helpers';

interface ReportEntry {
  territoryName: string;
  userName: string;
  assignmentDate: Date;
  completedDate: Date;
  id: string;
}

const AssignmentsReport: React.FC<{ territories: Territory[] }> = ({ territories }) => {
  const serviceYearOptions = useMemo(() => generateServiceYearOptions(), []);
  const [filterPeriod, setFilterPeriod] = useState<string>('last-6-months');
  const [filteredData, setFilteredData] = useState<ReportEntry[]>([]);

  const filterOptions = [
    { label: 'Últimos 6 meses', value: 'last-6-months' },
    { label: 'Últimos 12 meses', value: 'last-12-months' },
    ...serviceYearOptions,
  ];

  useEffect(() => {
    const allHistoryEntries: ReportEntry[] = territories.flatMap(t =>
      (t.history || []).map((h, index) => ({
        territoryName: t.name,
        userName: h.userName,
        assignmentDate: h.assignmentDate,
        completedDate: h.completedDate,
        id: `${t.id}-${index}`
      }))
    );

    let startDate: Date | null = null;
    let endDate: Date = new Date();

    if (filterPeriod === 'last-6-months') {
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
        const data = allHistoryEntries.filter(entry => {
            const completed = entry.completedDate;
            return completed >= startDate! && completed <= endDate;
        });
        data.sort((a, b) => b.completedDate.getTime() - a.completedDate.getTime());
        setFilteredData(data);
    }
  }, [territories, filterPeriod, serviceYearOptions]);

  const handleExportCsv = async () => {
    const headers = "Publicador,Território,Data de Designação,Data de Devolução\n";
    const csvContent = filteredData.map(row => 
        `"${row.userName}","${row.territoryName}","${formatDate(row.assignmentDate)}","${formatDate(row.completedDate)}"`
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
              <td>${formatDate(row.completedDate)}</td>
          </tr>
      `).join('');

      const printWindow = window.open('', '_blank');
      printWindow?.document.write(`
          <html>
              <head>
                  <title>Relatório de Designações</title>
                  <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; }
                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                      th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                      th { background-color: #f2f2f2; font-weight: bold; }
                      h1, h2 { color: #333; }
                      @media print {
                          body { -webkit-print-color-adjust: exact; }
                          button { display: none; }
                      }
                  </style>
              </head>
              <body>
                  <h1>Relatório de Designações</h1>
                  <h2>Período: ${periodLabel}</h2>
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
                  <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
              </body>
          </html>
      `);
      printWindow?.document.close();
  };

  return (
    <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
                 <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Filtrar por Período</label>
                 <select 
                    value={filterPeriod} 
                    onChange={e => setFilterPeriod(e.target.value)}
                    className="w-full md:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none shadow-sm"
                >
                    <option value="last-6-months">Últimos 6 meses</option>
                    <option value="last-12-months">Últimos 12 meses</option>
                    <optgroup label="Ano de Serviço">
                        {serviceYearOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </optgroup>
                 </select>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm hover:bg-emerald-700 transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM7 6a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 10a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z" /></svg>
                    EXCEL
                </button>
                <button onClick={handleExportPdf} className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm hover:bg-red-700 transition-colors">
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
                                <td className="px-5 py-4 font-bold text-slate-500 whitespace-nowrap">{formatDate(entry.completedDate)}</td>
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
