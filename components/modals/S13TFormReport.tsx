import React from 'react';
import { Printer, Calendar, FileText, Info } from 'lucide-react';

export interface S13Row {
  id: string;
  number: string;
  name: string;
  lastCompletedDate: Date | null;
  assignments: {
    assigned: Date;
    completed: Date | null;
    publisherName: string;
  }[];
}

export interface S13Sheet {
  id: string;
  title: string;
  sheetNumber: number;
  totalPages: number;
  rows: S13Row[];
}

interface S13TFormReportProps {
  sheets: S13Sheet[];
  congregation: string;
  setCongregation: (val: string) => void;
  serviceYear: string;
  handleServiceYearChange: (val: string) => void;
  handlePrint: () => void;
  formatDateS13: (date: Date | string | null | undefined) => string;
  startDateStr: string;
  endDateStr: string;
  setStartDateStr: (val: string) => void;
  setEndDateStr: (val: string) => void;
}

export const S13TFormReport: React.FC<S13TFormReportProps> = ({
  sheets,
  congregation,
  setCongregation,
  serviceYear,
  handleServiceYearChange,
  handlePrint,
  formatDateS13,
  startDateStr,
  endDateStr,
  setStartDateStr,
  setEndDateStr
}) => {
  return (
    <div className="space-y-6">
      {/* Description / Instructions */}
      <div className="no-print bg-blue-50 border border-blue-200 text-blue-950 p-5 rounded-2xl text-xs space-y-2">
        <p className="font-bold flex items-center gap-2 text-sm text-blue-900">
          <FileText className="w-4 h-4" />
          Ficha Oficial S-13-T — Registro de Designação de Território (Multi-folhas Inteligente)
        </p>
        <p className="leading-relaxed text-blue-800">
          Este gerador divide e pagina os territórios de <strong>24 em 24 linhas</strong> para manter a conformidade exata com o formulário impresso impresso da organização (<strong>S-13-T 01/22</strong>).
        </p>
        <p className="leading-relaxed text-blue-800 font-medium">
          🔄 <strong>Histórico Completo Consecutivo:</strong> Independentemente de qualquer data selecionada, todos os registros de designação permanecem preenchidos sequencialmente partindo da esquerda para a direita (sem deixar colunas em branco), preservando a legibilidade perfeita das designações e das conclusões.
        </p>
        <p className="leading-relaxed text-blue-800">
          📆 Se o histórico de designações de um território ultrapassar as 4 colunas padrão, o sistema <strong>automaticamente criará segundas folhas para este território</strong>, transferindo o último encerramento como "Última data concluída*" inicial da folha consecutiva.
        </p>
      </div>

      {/* Print Options Toolbar */}
      <div className="no-print bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Congregação</label>
            <input 
              type="text" 
              value={congregation}
              onChange={(e) => setCongregation(e.target.value)}
              placeholder="Ex: Congregação Local"
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-slate-300 transition-all font-sans"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Ano de Serviço</label>
            <select
              value={serviceYear}
              onChange={(e) => handleServiceYearChange(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-slate-300 transition-all cursor-pointer font-sans"
            >
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="all">Todo o Histórico (Sem filtro de ano)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Apenas Últimas Até a Data</label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400 no-print" />
                <input 
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-slate-300 transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 p-3 rounded-xl text-[11px] text-amber-900 max-w-xl">
            <Info className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-700" />
            <div className="space-y-1">
              <p className="leading-tight">
                <strong>PDF & Compartilhamento:</strong> Para enviar no WhatsApp ou e-mail, clique em <strong>Imprimir S-13-T</strong> e, na tela que se abre, altere o "Destino" de sua impressora para <strong>"Salvar como PDF"</strong>.
              </p>
              <p className="leading-tight text-neutral-600 font-medium">
                🛑 <strong>Atenção para o ambiente de testes:</strong> Se estiver vendo o app dentro do visualizador do AI Studio e o botão não parecer responder, clique no botão azul <strong>"Abrir em nova aba"</strong> (no canto superior direito do seu navegador/estúdio) para permitir as permissões nativas de impressão do navegador livremente.
              </p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 font-sans"
          >
            <Printer className="w-4 h-4" />
            Imprimir S-13-T ({sheets.length} {sheets.length === 1 ? 'Folha' : 'Folhas'})
          </button>
        </div>
      </div>

      {/* Printable Sheet(s) Layout */}
      <div className="space-y-12 s13-printable-container">
        {sheets.map((sheet, sIdx) => (
          <div 
            key={sheet.id} 
            className="bg-white p-6 md:p-12 border border-slate-200 rounded-3xl shadow-sm text-black relative max-w-4xl mx-auto s13-document-box font-sans s13-page print:m-0 print:p-0 print:border-none print:shadow-none"
          >
            {/* Page break and Page Number helpers for print */}
            <div className="no-print absolute top-3 right-6 text-[10px] font-mono text-slate-400">
              Página {sheet.sheetNumber} de {sheet.totalPages} • {sheet.title}
            </div>

            {/* Document Header */}
            <div className="text-center pb-4 mb-2">
              <h1 className="text-xl md:text-2xl font-black tracking-wider text-black m-0 p-0 text-center uppercase" style={{ fontFamily: 'sans-serif' }}>
                REGISTRO DE DESIGNAÇÃO DE TERRITÓRIO
              </h1>
              
              <div className="flex justify-between items-end mt-6 border-b-2 border-black pb-2">
                <div className="text-left font-bold text-xs text-black flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="shrink-0">Ano de Serviço:</span>
                  <span className="font-mono text-sm font-black tracking-wide uppercase bg-neutral-100 px-1.5 py-0.5 rounded print:bg-none print:p-0">
                    {serviceYear === 'all' ? 'Completo' : serviceYear}
                  </span>
                  {endDateStr && (
                    <span className="text-[10px] font-mono font-medium text-neutral-600 italic">
                      (Até {endDateStr.split('-').reverse().join('/')})
                    </span>
                  )}
                </div>
                
                <div className="text-right font-bold text-xs text-black flex items-center gap-2">
                  <span>Congregação:</span>
                  <span className="font-mono uppercase font-black tracking-wide">
                    {congregation}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-header Sheet Indicator inside Printable View */}
            <div className="flex justify-between items-center text-[10px] font-bold text-neutral-700 bg-neutral-100/60 p-2 rounded-lg mb-3 print:bg-none print:p-0 print:mb-2 border border-neutral-200/50 print:border-none">
              <span className="uppercase text-[9px] tracking-wider text-neutral-900">
                Linhagem: {sheet.title}
              </span>
              <span className="font-mono">
                Folha {sheet.sheetNumber} de {sheet.totalPages}
              </span>
            </div>

            {/* Double-header Custom GRID formatted exactly as S-13-T */}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-center border-collapse border-[2.5px] border-black text-xs table-fixed min-w-[720px]">
                <thead>
                  {/* Main Super headers */}
                  <tr className="border-b-2 border-black bg-slate-100/50">
                    <th rowSpan={2} className="border-r border-black font-black p-1 text-[9px] w-[8%] text-center uppercase">
                      Terr.<br/>n.º
                    </th>
                    <th rowSpan={2} className="border-r-[3px] border-r-black font-black p-1 text-[9px] w-[14%] text-center uppercase">
                      Última data<br/>concluída*
                    </th>
                    <th colSpan={2} className="border-r border-black font-black p-1 text-[9px] w-[19.5%] text-center uppercase">
                      Designado para
                    </th>
                    <th colSpan={2} className="border-r border-black font-black p-1 text-[9px] w-[19.5%] text-center uppercase">
                      Designado para
                    </th>
                    <th colSpan={2} className="border-r border-black font-black p-1 text-[9px] w-[19.5%] text-center uppercase">
                      Designado para
                    </th>
                    <th colSpan={2} className="font-black p-1 text-[9px] w-[19.5%] text-center uppercase">
                      Designado para
                    </th>
                  </tr>
                  {/* Sub headers */}
                  <tr className="border-b-[2.5px] border-black bg-slate-50/50 text-[8px] text-neutral-800">
                    <th className="border-r border-black py-1.5 px-0.5 font-extrabold text-center uppercase">Data da<br/>designação</th>
                    <th className="border-r-[3px] border-r-black py-1.5 px-0.5 font-extrabold text-center uppercase bg-emerald-50/20">Data da<br/>conclusão</th>
                    
                    <th className="border-r border-black py-1.5 px-0.5 font-extrabold text-center uppercase">Data da<br/>designação</th>
                    <th className="border-r-[3px] border-r-black py-1.5 px-0.5 font-extrabold text-center uppercase bg-emerald-50/20">Data da<br/>conclusão</th>
                    
                    <th className="border-r border-black py-1.5 px-0.5 font-extrabold text-center uppercase">Data da<br/>designação</th>
                    <th className="border-r-[3px] border-r-black py-1.5 px-0.5 font-extrabold text-center uppercase bg-emerald-50/20">Data da<br/>conclusão</th>
                    
                    <th className="border-r border-black py-1.5 px-0.5 font-extrabold text-center uppercase">Data da<br/>designação</th>
                    <th className="py-1.5 px-0.5 font-extrabold text-center uppercase bg-emerald-50/20">Data da<br/>conclusão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-mono">
                  {sheet.rows.map((row, rIdx) => (
                    <tr key={row.id || `${sheet.id}-row-${rIdx}`} className="border-b border-black h-[2.65rem] text-[9.5px] text-black">
                      {/* Territory Number */}
                      <td className="border-r border-black font-black text-center text-[10px] p-0.5 bg-neutral-50/50 align-middle">
                        {row.number || <span className="opacity-0">-</span>}
                      </td>

                      {/* Last Completed Date (Última data concluída*) */}
                      <td className="border-r-[3px] border-r-black text-center p-0.5 font-bold align-middle text-[9.5px]">
                        {formatDateS13(row.lastCompletedDate)}
                      </td>

                      {/* Block 1 */}
                      <td className="border-r border-black text-center p-0.5 align-middle leading-tight">
                        {row.assignments[0] ? (
                          <div className="flex flex-col justify-center items-center">
                            <span className="text-[8.5px] font-sans font-black text-black truncate max-w-[68px] uppercase block tracking-tight" title={row.assignments[0].publisherName}>
                              {row.assignments[0].publisherName}
                            </span>
                            <span className="text-[8px] text-black font-bold block mt-0.5 font-mono">
                              {formatDateS13(row.assignments[0].assigned)}
                            </span>
                          </div>
                        ) : ''}
                      </td>
                      <td className="border-r-[3px] border-r-black text-center p-0.5 font-bold text-black bg-slate-50/10 align-middle text-[9.5px]">
                        {row.assignments[0] ? formatDateS13(row.assignments[0].completed) : ''}
                      </td>

                      {/* Block 2 */}
                      <td className="border-r border-black text-center p-0.5 align-middle leading-tight">
                        {row.assignments[1] ? (
                          <div className="flex flex-col justify-center items-center">
                            <span className="text-[8.5px] font-sans font-black text-black truncate max-w-[68px] uppercase block tracking-tight" title={row.assignments[1].publisherName}>
                              {row.assignments[1].publisherName}
                            </span>
                            <span className="text-[8px] text-black font-bold block mt-0.5 font-mono">
                              {formatDateS13(row.assignments[1].assigned)}
                            </span>
                          </div>
                        ) : ''}
                      </td>
                      <td className="border-r-[3px] border-r-black text-center p-0.5 font-bold text-black bg-slate-50/10 align-middle text-[9.5px]">
                        {row.assignments[1] ? formatDateS13(row.assignments[1].completed) : ''}
                      </td>

                      {/* Block 3 */}
                      <td className="border-r border-black text-center p-0.5 align-middle leading-tight">
                        {row.assignments[2] ? (
                          <div className="flex flex-col justify-center items-center">
                            <span className="text-[8.5px] font-sans font-black text-black truncate max-w-[68px] uppercase block tracking-tight" title={row.assignments[2].publisherName}>
                              {row.assignments[2].publisherName}
                            </span>
                            <span className="text-[8px] text-black font-bold block mt-0.5 font-mono">
                              {formatDateS13(row.assignments[2].assigned)}
                            </span>
                          </div>
                        ) : ''}
                      </td>
                      <td className="border-r-[3px] border-r-black text-center p-0.5 font-bold text-black bg-slate-50/10 align-middle text-[9.5px]">
                        {row.assignments[2] ? formatDateS13(row.assignments[2].completed) : ''}
                      </td>

                      {/* Block 4 */}
                      <td className="border-r border-black text-center p-0.5 align-middle leading-tight">
                        {row.assignments[3] ? (
                          <div className="flex flex-col justify-center items-center">
                            <span className="text-[8.5px] font-sans font-black text-black truncate max-w-[68px] uppercase block tracking-tight" title={row.assignments[3].publisherName}>
                              {row.assignments[3].publisherName}
                            </span>
                            <span className="text-[8px] text-black font-bold block mt-0.5 font-mono">
                              {formatDateS13(row.assignments[3].assigned)}
                            </span>
                          </div>
                        ) : ''}
                      </td>
                      <td className="text-center p-0.5 font-bold text-black bg-slate-50/10 align-middle text-[9.5px]">
                        {row.assignments[3] ? formatDateS13(row.assignments[3].completed) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footnote matching original image exactly */}
            <div className="mt-5 pt-3 flex flex-col sm:flex-row justify-between items-start text-[8.5px] text-neutral-700 italic leading-relaxed gap-2 border-t border-slate-200">
              <p className="max-w-[85%] font-medium m-0 p-0">
                *Ao iniciar uma nova folha, use esta coluna para registrar a data em que cada território foi concluído pela última vez.
              </p>
              <span className="font-extrabold text-neutral-900 uppercase tracking-widest shrink-0 select-none font-sans">
                S-13-T &nbsp; 01/22
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
