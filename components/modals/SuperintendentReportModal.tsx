import React, { useState, useMemo } from 'react';
import { Territory, TerritoryStatus } from '../../types';
import { formatDate } from '../../utils/helpers';
import { S13TFormReport } from './S13TFormReport';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  Filter, 
  X, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Undo2, 
  RefreshCw,
  MapPin,
  TrendingUp,
  UserCheck
} from 'lucide-react';

interface SuperintendentReportModalProps {
  territories: Territory[];
  onClose: () => void;
  congregationName?: string;
}

interface ReportItem {
  id: string;
  territoryId: string;
  number: string;
  name: string;
  locality: string;
  userName: string;
  assignmentDate: Date | null;
  completedDate: Date | null;
  statusText: 'Concluído' | 'Em Trabalho' | 'Atrasado' | 'Extornado' | 'Retomado';
  notes: string;
  isReversal: boolean;
  isReset: boolean;
  durationDays: number;
}

export const SuperintendentReportModal: React.FC<SuperintendentReportModalProps> = ({ 
  territories, 
  onClose,
  congregationName = "Congregação Local"
}) => {
  // Pre-configured date filter options
  const dateShortcuts = useMemo(() => {
    const today = new Date();
    
    // Service Year: Sept 1st to August 31st
    let currentServiceYear = today.getFullYear();
    if (today.getMonth() >= 8) { // Sept or later
      currentServiceYear += 1;
    }

    const currentSYStart = new Date(currentServiceYear - 1, 8, 1);
    const currentSYEnd = new Date(currentServiceYear, 7, 31, 23, 59, 59);

    const prevSYStart = new Date(currentServiceYear - 2, 8, 1);
    const prevSYEnd = new Date(currentServiceYear - 1, 7, 31, 23, 59, 59);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    return [
      { id: 'all', label: 'Todo o Histórico', start: new Date(2020, 0, 1), end: new Date(2030, 11, 31) },
      { id: 'current_month', label: 'Este Mês', start: currentMonthStart, end: today },
      { id: 'last_30', label: 'Últimos 30 Dias', start: thirtyDaysAgo, end: today },
      { id: 'last_90', label: 'Últimos 90 Dias', start: ninetyDaysAgo, end: today },
      { id: 'last_6m', label: 'Últimos 6 Meses', start: sixMonthsAgo, end: today },
      { id: 'current_sy', label: `Ano de Serviço Atual (${currentServiceYear})`, start: currentSYStart, end: currentSYEnd },
      { id: 'prev_sy', label: `Ano de Serviço Anterior (${currentServiceYear - 1})`, start: prevSYStart, end: prevSYEnd },
    ];
  }, []);

  const [activeReportTab, setActiveReportTab] = useState<'s13' | 'analytical'>(() => {
    try {
      const saved = localStorage.getItem('sup_report_active_tab');
      return saved === 'analytical' ? 'analytical' : 's13';
    } catch {
      return 's13';
    }
  });

  const [congregation, setCongregation] = useState<string>(() => {
    try {
      return localStorage.getItem('sup_report_congregation') || congregationName || 'Congregação Local';
    } catch {
      return congregationName || 'Congregação Local';
    }
  });

  const [serviceYear, setServiceYear] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sup_report_service_year');
      if (saved) return saved;
    } catch {}
    const today = new Date();
    let currentServiceYear = today.getFullYear();
    if (today.getMonth() >= 8) { // Sept or later
      currentServiceYear += 1;
    }
    return String(currentServiceYear);
  });

  const [selectedShortcut, setSelectedShortcut] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sup_report_shortcut');
      return saved ? saved : 'current_sy';
    } catch {
      return 'current_sy';
    }
  });

  const [startDateStr, setStartDateStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sup_report_startDate');
      if (saved) return saved;
    } catch {}
    const defaultShortcut = dateShortcuts.find(s => s.id === 'current_sy');
    return defaultShortcut ? defaultShortcut.start.toISOString().split('T')[0] : '';
  });

  const [endDateStr, setEndDateStr] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sup_report_endDate');
      if (saved) return saved;
    } catch {}
    const defaultShortcut = dateShortcuts.find(s => s.id === 'current_sy');
    return defaultShortcut ? defaultShortcut.end.toISOString().split('T')[0] : '';
  });

  const [localityFilter, setLocalityFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sup_report_localityFilter');
      return saved || 'all';
    } catch {
      return 'all';
    }
  });

  const [searchQuery, setSearchQuery] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sup_report_searchQuery');
      return saved || '';
    } catch {
      return '';
    }
  });

  const [statusFilter, setStatusFilter] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('sup_report_statusFilter');
      return saved || 'all';
    } catch {
      return 'all';
    }
  });

  const [hideReversals, setHideReversals] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sup_report_hideReversals');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Save selected filters to localStorage whenever they change
  React.useEffect(() => {
    try {
      localStorage.setItem('sup_report_active_tab', activeReportTab);
      localStorage.setItem('sup_report_congregation', congregation);
      localStorage.setItem('sup_report_service_year', serviceYear);
      localStorage.setItem('sup_report_shortcut', selectedShortcut);
      localStorage.setItem('sup_report_startDate', startDateStr);
      localStorage.setItem('sup_report_endDate', endDateStr);
      localStorage.setItem('sup_report_localityFilter', localityFilter);
      localStorage.setItem('sup_report_statusFilter', statusFilter);
      localStorage.setItem('sup_report_searchQuery', searchQuery);
      localStorage.setItem('sup_report_hideReversals', String(hideReversals));
    } catch (e) {
      console.warn("Could not save report filters to local storage", e);
    }
  }, [activeReportTab, congregation, serviceYear, selectedShortcut, startDateStr, endDateStr, localityFilter, statusFilter, searchQuery, hideReversals]);

  // Adjust date based on Service Year changes
  const handleServiceYearChange = (year: string) => {
    setServiceYear(year);
    if (year === 'all') {
      setSelectedShortcut('all');
      const shortcut = dateShortcuts.find(s => s.id === 'all');
      if (shortcut) {
        setStartDateStr(shortcut.start.toISOString().split('T')[0]);
        setEndDateStr(shortcut.end.toISOString().split('T')[0]);
      }
      return;
    }
    const yr = parseInt(year, 10);
    if (!isNaN(yr)) {
      setSelectedShortcut('custom');
      setStartDateStr(`${yr - 1}-09-01`);
      setEndDateStr(`${yr}-08-31`);
    }
  };

  // Fast monthly step adjust helper
  const adjustDate = (type: 'start' | 'end', months: number) => {
    setSelectedShortcut('custom');
    const currentDateStr = type === 'start' ? startDateStr : endDateStr;
    if (!currentDateStr) return;
    const parts = currentDateStr.split('-');
    if (parts.length !== 3) return;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-based index
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    d.setMonth(d.getMonth() + months);
    
    // Format to yyyy-mm-dd safely without timezone shift
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const updatedStr = `${yStr}-${mStr}-${dStr}`;
    
    if (type === 'start') {
      setStartDateStr(updatedStr);
    } else {
      setEndDateStr(updatedStr);
    }
  };

  // Get list of unique localities for dropdown
  const uniqueLocalities = useMemo(() => {
    const set = new Set<string>();
    territories.forEach(t => {
      if (t.locality) set.add(t.locality);
    });
    return Array.from(set).sort();
  }, [territories]);

  // Handle preset shortcut clicks
  const selectPreset = (shortcutId: string) => {
    setSelectedShortcut(shortcutId);
    const shortcut = dateShortcuts.find(s => s.id === shortcutId);
    if (shortcut) {
      setStartDateStr(shortcut.start.toISOString().split('T')[0]);
      setEndDateStr(shortcut.end.toISOString().split('T')[0]);
    }
  };

  // Safe duration counter helper
  const getDaysBetween = (d1: Date | null, d2: Date | null): number => {
    if (!d1 || !d2) return 0;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Compile active list + history list into report items
  const allReportItems = useMemo(() => {
    const items: ReportItem[] = [];

    territories.forEach(t => {
      // 1. Compile active items (in_use)
      if (t.status === TerritoryStatus.IN_USE && t.assignmentDate) {
        // Parse assignmentDate
        const assignD = t.assignmentDate instanceof Date ? t.assignmentDate : new Date(t.assignmentDate);
        const isOverdue = t.dueDate ? new Date(t.dueDate).getTime() < Date.now() : false;

        items.push({
          id: `${t.id}-active`,
          territoryId: t.id,
          number: t.number,
          name: t.name,
          locality: t.locality || 'Sem Localidade',
          userName: t.assignedToName || 'Não Atribuído',
          assignmentDate: assignD,
          completedDate: null,
          statusText: isOverdue ? 'Atrasado' : 'Em Trabalho',
          notes: t.observation || '',
          isReversal: false,
          isReset: false,
          durationDays: getDaysBetween(assignD, new Date())
        });
      }

      // 2. Compile history logs
      if (t.history && Array.isArray(t.history)) {
        t.history.forEach((h, idx) => {
          const assignD = h.assignmentDate ? (h.assignmentDate instanceof Date ? h.assignmentDate : new Date(h.assignmentDate)) : null;
          const compD = h.completedDate ? (h.completedDate instanceof Date ? h.completedDate : new Date(h.completedDate)) : null;

          const isRev = h.isReversal === true || (h.notes && (
            h.notes.toLowerCase().includes('extorno') || 
            h.notes.toLowerCase().includes('estorno')
          )) || false;

          const isRes = h.isReset === true || (h.notes && (
            h.notes.toLowerCase().includes('retomado pelo administrador') || 
            h.notes.toLowerCase().includes('retomado por')
          )) || false;

          const statusVal = isRev ? 'Extornado' : (isRes ? 'Retomado' : 'Concluído');

          items.push({
            id: `${t.id}-hist-${idx}`,
            territoryId: t.id,
            number: t.number,
            name: t.name,
            locality: t.locality || 'Sem Localidade',
            userName: h.userName || 'Desconhecido',
            assignmentDate: assignD,
            completedDate: compD,
            statusText: statusVal as any,
            notes: h.notes || '',
            isReversal: isRev,
            isReset: isRes,
            durationDays: getDaysBetween(assignD, compD)
          });
        });
      }
    });

    // Sort by assignmentDate descending (most recent first)
    return items.sort((a, b) => {
      const timeA = a.assignmentDate ? a.assignmentDate.getTime() : 0;
      const timeB = b.assignmentDate ? b.assignmentDate.getTime() : 0;
      return timeB - timeA;
    });
  }, [territories]);

  // Apply filters to report items
  const filteredItems = useMemo(() => {
    const startFilter = startDateStr ? new Date(startDateStr + 'T00:00:00') : null;
    const endFilter = endDateStr ? new Date(endDateStr + 'T23:59:59') : null;

    return allReportItems.filter(item => {
      // 1. Date Range Filter
      // Filters entries whose core event (either assignment or completion/return) occurred within the filter range
      const itemDate = item.completedDate || item.assignmentDate;
      if (itemDate) {
        if (startFilter && itemDate < startFilter) return false;
        if (endFilter && itemDate > endFilter) return false;
      } else {
        // If no date, only allow if range is open
        if (startFilter || endFilter) return false;
      }

      // 2. Hide reversals and resets if checked
      if (hideReversals && (item.isReversal || item.isReset)) {
        return false;
      }

      // 3. Locality Filter
      if (localityFilter !== 'all' && item.locality !== localityFilter) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed' && item.statusText !== 'Concluído') return false;
        if (statusFilter === 'working' && item.statusText !== 'Em Trabalho' && item.statusText !== 'Atrasado') return false;
        if (statusFilter === 'overdue' && item.statusText !== 'Atrasado') return false;
        if (statusFilter === 'reversal' && item.statusText !== 'Extornado') return false;
      }

      // 5. Search Text Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.number.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.locality.toLowerCase().includes(query) ||
          item.userName.toLowerCase().includes(query) ||
          item.notes.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allReportItems, startDateStr, endDateStr, hideReversals, localityFilter, statusFilter, searchQuery]);

  // Calculate statistics for the filtered period
  const stats = useMemo(() => {
    const totalAssignments = filteredItems.length;
    const completedList = filteredItems.filter(item => item.statusText === 'Concluído');
    const totalCompleted = completedList.length;
    const totalInWork = filteredItems.filter(item => item.statusText === 'Em Trabalho' || item.statusText === 'Atrasado').length;
    const totalOverdue = filteredItems.filter(item => item.statusText === 'Atrasado').length;

    // Calculate average days to complete
    let avgDaysToComplete = 0;
    if (totalCompleted > 0) {
      const sum = completedList.reduce((acc, curr) => acc + curr.durationDays, 0);
      avgDaysToComplete = Math.round(sum / totalCompleted);
    }

    // Percentage of territories covered in this period
    // Distinct maps that had at least one completion
    const uniqueWorkedTerritoryIds = new Set<string>();
    completedList.forEach(item => uniqueWorkedTerritoryIds.add(item.territoryId));
    
    const uniqueTerritoriesVal = uniqueWorkedTerritoryIds.size;
    const totalTerritoriesVal = territories.length || 1;
    const coveragePercentage = Math.round((uniqueTerritoriesVal / totalTerritoriesVal) * 100);

    // Number of distinct publishers active in this period
    const uniquePublishers = new Set<string>();
    filteredItems.forEach(item => {
      if (item.userName) uniquePublishers.add(item.userName);
    });

    return {
      totalAssignments,
      totalCompleted,
      totalInWork,
      totalOverdue,
      avgDaysToComplete,
      coveragePercentage,
      uniquePublishersCount: uniquePublishers.size,
      totalTerritoriesVal,
      uniqueTerritoriesVal
    };
  }, [filteredItems, territories]);

  // S-13-T custom compact date formatter
  const formatDateS13 = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2); // Use 2-digit year to fit perfectly in narrow column
    return `${day}/${month}/${year}`;
  };

  // Compile S-13-T official grid dataset in paginated sheets (24 territories per sheet, and multiple sheets if designações > 4)
  const s13Sheets = useMemo(() => {
    // Sort all territories naturally by alphanumeric number (e.g. Map 1, Map 2)
    const sortedTerritories = [...territories].sort((a, b) => {
      const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.number.localeCompare(b.number);
    });

    if (sortedTerritories.length === 0) {
      // Return 1 blank sheet
      const blankRowList = Array.from({ length: 24 }, (_, idx) => ({
        id: `blank-row-empty-${idx}`,
        number: '',
        name: '',
        lastCompletedDate: null,
        assignments: []
      }));
      return [{
        id: 'empty-sheet-0',
        title: 'Modelo em Branco S-13-T',
        sheetNumber: 1,
        totalPages: 1,
        rows: blankRowList
      }];
    }

    // Parse all assignments for each territory up to the filtered end date
    const parsedTerritoryDataList = sortedTerritories.map(t => {
      const assignments: { assigned: Date; completed: Date | null; publisherName: string }[] = [];

      // Past logs
      if (t.history && Array.isArray(t.history)) {
        t.history.forEach(h => {
          if (h.assignmentDate) {
            assignments.push({
              assigned: h.assignmentDate instanceof Date ? h.assignmentDate : new Date(h.assignmentDate),
              completed: h.completedDate ? (h.completedDate instanceof Date ? h.completedDate : new Date(h.completedDate)) : null,
              publisherName: h.userName || 'Irmão'
            });
          }
        });
      }

      // Active assignment
      if (t.status === TerritoryStatus.IN_USE && t.assignmentDate) {
        assignments.push({
          assigned: t.assignmentDate instanceof Date ? t.assignmentDate : new Date(t.assignmentDate),
          completed: null,
          publisherName: t.assignedToName || 'Irmão'
        });
      }

      // Sort chronological
      assignments.sort((a, b) => a.assigned.getTime() - b.assigned.getTime());

      // Filter: ONLY exclude assignments after the filtered end date.
      // This preserves sequential columns ("mostrar o registro preenchido independente da data").
      let filteredAssignments = assignments;
      if (serviceYear !== 'all' && endDateStr) {
        const endFilter = new Date(endDateStr + 'T23:59:59');
        filteredAssignments = assignments.filter(asg => asg.assigned <= endFilter);
      }

      return {
        id: t.id,
        number: t.number,
        name: t.name,
        baseLastCompletedDate: t.lastCompletedDate ? (t.lastCompletedDate instanceof Date ? t.lastCompletedDate : new Date(t.lastCompletedDate)) : null,
        assignments: filteredAssignments
      };
    });

    // Group physical territories into batches of exactly 24
    const physicalBatches: typeof parsedTerritoryDataList[] = [];
    const batchSize = 24;
    for (let i = 0; i < parsedTerritoryDataList.length; i += batchSize) {
      physicalBatches.push(parsedTerritoryDataList.slice(i, i + batchSize));
    }

    // Now, for each physical batch, determine how many sheets are needed
    const allSheets: {
      id: string;
      title: string;
      sheetNumber: number;
      totalPages: number;
      rows: any[];
    }[] = [];

    physicalBatches.forEach((batch, batchIdx) => {
      // Find max assignments in this batch
      let maxAsgCount = 0;
      batch.forEach(item => {
        if (item.assignments.length > maxAsgCount) {
          maxAsgCount = item.assignments.length;
        }
      });

      // Divide by 4 to see how many sheets (Folhas) we need
      const sheetsCount = Math.max(1, Math.ceil(maxAsgCount / 4));

      // Get first and last territory number of this batch for labeling
      const startNum = batch[0]?.number || String(batchIdx * 24 + 1);
      const endNum = batch[batch.length - 1]?.number || String(batchIdx * 24 + batch.length);

      for (let s = 0; s < sheetsCount; s++) {
        const sheetRows = batch.map(item => {
          // slice the 4 assignments for this sheet index
          const slicedAsg = item.assignments.slice(s * 4, s * 4 + 4);

          // Calculate "Última data concluída" for this sheet
          let lastCompleted: Date | null = null;
          if (s === 0) {
            // First page: base completion date of map
            lastCompleted = item.baseLastCompletedDate;
            // Or fallback to the last completion date prior to first assignment if base is empty
            if (!lastCompleted && item.assignments.length > 0) {
              const firstShownDate = item.assignments[0].assigned;
              const completedBefore = item.assignments
                .filter(asg => asg.completed && asg.completed < firstShownDate)
                .map(asg => asg.completed as Date);
              if (completedBefore.length > 0) {
                completedBefore.sort((a, b) => b.getTime() - a.getTime());
                lastCompleted = completedBefore[0];
              }
            }
          } else {
            // Page 2+: it is the completion date of the last assignment in the prior page (at index s * 4 - 1）
            const prevAsg = item.assignments[s * 4 - 1];
            lastCompleted = prevAsg ? prevAsg.completed : null;
          }

          return {
            id: item.id,
            number: item.number,
            name: item.name,
            lastCompletedDate: lastCompleted,
            assignments: slicedAsg
          };
        });

        // Pad the sheet to exactly 24 rows to guarantee printed layout dimensions
        while (sheetRows.length < 24) {
          sheetRows.push({
            id: `blank-row-padded-${batchIdx}-${s}-${sheetRows.length}`,
            number: '',
            name: '',
            lastCompletedDate: null,
            assignments: []
          });
        }

        allSheets.push({
          id: `batch-${batchIdx}-sheet-${s}`,
          title: `Mapas ${startNum} a ${endNum} (Folha ${s + 1})`,
          sheetNumber: s + 1,
          totalPages: sheetsCount,
          rows: sheetRows
        });
      }
    });

    // Fix sheetNumber and totalPages globally so it looks professional (e.g. Page 1 of 4, Page 2 of 4...)
    const totalGlobalPages = allSheets.length;
    return allSheets.map((sheet, idx) => ({
      ...sheet,
      sheetNumber: idx + 1,
      totalPages: totalGlobalPages
    }));
  }, [territories, endDateStr, serviceYear]);

  // Handle Print Action (Safely formats layout to be perfect)
  const handlePrint = () => {
    window.print();
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Nº de Mapa', 
      'Território', 
      'Localidade/Bairro', 
      'Publicador Responsável', 
      'Data de Designação', 
      'Data de Devolução (Conclusão)', 
      'Dias Ativo/Trabalhado', 
      'Status Operacional', 
      'Observações e Notas'
    ];
    
    const rows = filteredItems.map(item => [
      `"${item.number}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.locality.replace(/"/g, '""')}"`,
      `"${item.userName.replace(/"/g, '""')}"`,
      `"${item.assignmentDate ? formatDate(item.assignmentDate) : '-'}"`,
      `"${item.completedDate ? formatDate(item.completedDate) : 'Em Trabalho'}"`,
      item.durationDays,
      `"${item.statusText}"`,
      `"${item.notes.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
    ]);

    // Use Windows style separator with BOM to prevent Microsoft Excel formatting issues in Portuguese
    const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Registro_Territorios_Superintendente_${startDateStr}_a_${endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-0 md:p-6 backdrop-blur-sm overflow-y-auto no-scrollbar">
      {/* Dynamic Native Print Inject Style */}
      <style>{`
        @media print {
          /* General print reset */
          html, body, #root {
            background-color: white !important;
            color: black !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide all page content by default to prevent other dashboard elements from cluttering */
          body * {
            visibility: hidden;
          }
          /* Allow the modal parent overlay and the report content to be visible */
          .fixed,
          #print-superintendent-report,
          #print-superintendent-report * {
            visibility: visible !important;
          }
          /* Reset overlay constraints to allow infinite scroll flow for printing pages */
          .fixed {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: transparent !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
            z-index: 9999999 !important;
          }
          /* Force report container to show, fill page, and look strictly editorial */
          #print-superintendent-report {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            max-height: none !important;
          }
          /* Explicitly hide the close buttons, toolbars, headers inside report during print */
          .no-print,
          .no-print *,
          button,
          .no-print-element {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          .s13-printable-container {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          .s13-document-box {
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 0 10mm 0 !important;
            max-width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .s13-page {
            page-break-after: always !important;
            break-after: page !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          .s13-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          @page {
            size: ${activeReportTab === 's13' ? 'portrait' : 'landscape'};
            margin: 8mm;
          }
          .print-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
          .print-card {
            border: 1px solid #e2e8f0 !important;
            padding: 8px !important;
            background: none !important;
          }
          table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Main Report Window Container */}
      <div 
        id="print-superintendent-report" 
        className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl animate-in fade-in zoom-in duration-200 outline-none flex flex-col h-full md:max-h-[90vh]"
      >
        
        {/* Modal Header */}
        <div className="no-print p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
              <FileText className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">Relatórios de Atividades de Território</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Registros de Designações para o Superintendente</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            title="Fechar Relatório"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Report Frame */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 no-scrollbar">
          
          {/* Tab Selector Buttons - No print */}
          <div className="no-print flex border-b border-slate-200 mb-6">
            <button 
              onClick={() => {
                setActiveReportTab('s13');
              }}
              className={`flex-1 py-3.5 text-xs font-black text-center border-b-2 uppercase tracking-wider transition-all ${activeReportTab === 's13' ? 'border-blue-600 text-blue-700 bg-blue-50/10' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/60'}`}
            >
              Ficha S-13-T Oficial
            </button>
            <button 
              onClick={() => {
                setActiveReportTab('analytical');
              }}
              className={`flex-1 py-3.5 text-xs font-black text-center border-b-2 uppercase tracking-wider transition-all ${activeReportTab === 'analytical' ? 'border-blue-600 text-blue-700 bg-blue-50/10' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/60'}`}
            >
              Histórico Analítico (Pesquisa & Excel)
            </button>
          </div>

          {activeReportTab === 's13' ? (
            <S13TFormReport
              sheets={s13Sheets}
              congregation={congregation}
              setCongregation={setCongregation}
              serviceYear={serviceYear}
              handleServiceYearChange={handleServiceYearChange}
              handlePrint={handlePrint}
              formatDateS13={formatDateS13}
              startDateStr={startDateStr}
              endDateStr={endDateStr}
              setStartDateStr={setStartDateStr}
              setEndDateStr={setEndDateStr}
            />
          ) : (
            <>
              {/* Print Only Header Banner */}
          <div className="hidden print:block border-b-2 border-double border-slate-800 pb-4 mb-4 text-center">
            <h1 className="text-xl font-black text-slate-950 tracking-tight uppercase">Registro Oficial de Designações e Devoluções de Território</h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-600 mt-1">
               {congregationName} • Superintendência do Grupo de Serviço / Territórios
            </p>
            <p className="text-xs font-bold text-slate-700 mt-2">
              Período de Relatório: {formatDate(startDateStr ? new Date(startDateStr + 'T00:00:00') : null)} até {formatDate(endDateStr ? new Date(endDateStr + 'T23:59:59') : null)}
            </p>
          </div>

          {/* Interactive Filters (Hidden during print) */}
          <div className="no-print bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-4">
            
            {/* Quick Presets Scroll Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mr-2">Filtros Rápidos:</span>
              {dateShortcuts.map(shortcut => (
                <button
                  key={shortcut.id}
                  onClick={() => selectPreset(shortcut.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border ${
                    selectedShortcut === shortcut.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-150'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>

            {/* Custom Inputs and Selectors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              
              {/* Date Inputs */}
              <div className="md:col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">De (Data Inicial)</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDateStr}
                      onChange={(e) => {
                        setStartDateStr(e.target.value);
                        setSelectedShortcut('custom');
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-550/10 focus:border-slate-300"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-between mt-1 px-1">
                    <button 
                      type="button" 
                      onClick={() => adjustDate('start', -1)}
                      className="text-[9px] font-black text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded transition-all"
                      title="Voltar 1 Mês"
                    >
                      -1 Mês
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedShortcut('custom');
                        const today = new Date();
                        setStartDateStr(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
                      }}
                      className="text-[9px] font-bold text-blue-500 hover:text-blue-700 hover:underline px-1 py-0.5"
                    >
                      1º do Mês
                    </button>
                    <button 
                      type="button" 
                      onClick={() => adjustDate('start', 1)}
                      className="text-[9px] font-black text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded transition-all"
                      title="Avançar 1 Mês"
                    >
                      +1 Mês
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Até (Data Final)</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDateStr}
                      onChange={(e) => {
                        setEndDateStr(e.target.value);
                        setSelectedShortcut('custom');
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-550/10 focus:border-slate-300"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <div className="flex items-center justify-between mt-1 px-1">
                    <button 
                      type="button" 
                      onClick={() => adjustDate('end', -1)}
                      className="text-[9px] font-black text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded transition-all"
                      title="Voltar 1 Mês"
                    >
                      -1 Mês
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedShortcut('custom');
                        setEndDateStr(new Date().toISOString().split('T')[0]);
                      }}
                      className="text-[9px] font-bold text-blue-500 hover:text-blue-700 hover:underline px-1 py-0.5"
                    >
                      Hoje
                    </button>
                    <button 
                      type="button" 
                      onClick={() => adjustDate('end', 1)}
                      className="text-[9px] font-black text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded transition-all"
                      title="Avançar 1 Mês"
                    >
                      +1 Mês
                    </button>
                  </div>
                </div>
              </div>

              {/* Locality Filter */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Bairro / Localidade</label>
                <select
                  value={localityFilter}
                  onChange={(e) => setLocalityFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-550/10 focus:border-slate-300"
                >
                  <option value="all">Todas as Localidades</option>
                  {uniqueLocalities.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Situação Operational</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-550/10 focus:border-slate-300"
                >
                  <option value="all">Todos os Status</option>
                  <option value="completed">Apenas Concluídos</option>
                  <option value="working">Atualmente sob Trabalho</option>
                  <option value="overdue">Em Atraso do Prazo</option>
                </select>
              </div>

            </div>

            {/* Advanced Search and Exclusion Settings */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Pesquisar por Publicador, Número ou Nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-550/10 focus:border-slate-300"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 w-4 h-4 top-1/2 -translate-y-1/2" />
              </div>
              
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideReversals}
                    onChange={(e) => setHideReversals(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-550 h-4 w-4 border-slate-200"
                  />
                  <span className="text-[11px] font-bold text-slate-600 hover:text-slate-900 leading-none">
                    Ocultar Estornos/Retomadas sem Trabalho
                  </span>
                </label>
              </div>
            </div>

          </div>

          {/* Core Performance Overview Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-grid">
            
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl print-card">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2 flex items-center gap-1.5 no-print">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Atribuições Totais
              </p>
              <p className="hidden print:block text-[8px] font-bold text-slate-500 uppercase mb-1">Designações Realizadas</p>
              <h3 className="text-2xl font-mono font-black text-slate-900 tracking-tight leading-none">
                {stats.totalAssignments}
              </h3>
              <p className="text-[9px] text-slate-400 font-bold mt-2">No intervalo de tempo</p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl print-card">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-2 flex items-center gap-1.5 no-print">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Mapas Concluídos
              </p>
              <p className="hidden print:block text-[8px] font-bold text-slate-500 uppercase mb-1">Mapas Devolvidos Concluídos</p>
              <h3 className="text-2xl font-mono font-black text-emerald-700 tracking-tight leading-none">
                {stats.totalCompleted}
              </h3>
              <p className="text-[9px] text-emerald-600/70 font-bold mt-2">Trabalhos concluídos</p>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl print-card">
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mb-2 flex items-center gap-1.5 no-print">
                <Clock className="w-3.5 h-3.5 text-blue-500" /> Média de Tempo
              </p>
              <p className="hidden print:block text-[8px] font-bold text-slate-500 uppercase mb-1">Média de Dias p/ Conclusão</p>
              <h3 className="text-2xl font-mono font-black text-blue-700 tracking-tight leading-none">
                {stats.avgDaysToComplete} <span className="text-xs font-black">Dias</span>
              </h3>
              <p className="text-[9px] text-blue-600/70 font-bold mt-2">Duração média de uso</p>
            </div>

            <div className="bg-purple-50/50 border border-purple-100 p-5 rounded-2xl print-card">
              <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest leading-none mb-2 flex items-center gap-1.5 no-print">
                <TrendingUp className="w-3.5 h-3.5 text-purple-500" /> Cobertura Real
              </p>
              <p className="hidden print:block text-[8px] font-bold text-slate-500 uppercase mb-1">Percentual de Cobertura</p>
              <h3 className="text-2xl font-mono font-black text-purple-700 tracking-tight leading-none">
                {stats.coveragePercentage}%
              </h3>
              <p className="text-[9px] text-purple-600/70 font-bold mt-2">
                {stats.uniqueTerritoriesVal} de {stats.totalTerritoriesVal} mapas
              </p>
            </div>

          </div>

          {/* Action Toolbar for Screen (Export & Print) */}
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <p className="text-[10px] font-mono uppercase text-slate-400 font-extrabold tracking-wide">
              Exibindo <span className="text-slate-800 font-black">{filteredItems.length} registros</span> filtrados de <span className="text-slate-800 font-black">{stats.uniquePublishersCount} publicadores</span> diferentes.
            </p>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-slate-105 border border-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-all flex items-center gap-2 shadow-sm"
                title="Exportar dados para Excel (.CSV)"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
              
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center gap-2 shadow-sm shadow-blue-200"
                title="Imprimir ou salvar como PDF"
              >
                <Printer className="w-4 h-4" />
                Imprimir Relatório
              </button>
            </div>
          </div>

          {/* Primary Records Grid / Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <th className="w-[60px] py-3.5 px-4 text-center text-[10px] font-black uppercase tracking-widest">Nº</th>
                    <th className="w-[200px] py-3.5 px-3 text-[10px] font-black uppercase tracking-widest">Território</th>
                    <th className="w-[150px] py-3.5 px-3 text-[10px] font-black uppercase tracking-widest">Localidade / Bairro</th>
                    <th className="w-[220px] py-3.5 px-3 text-[10px] font-black uppercase tracking-widest">Publicador Responsável</th>
                    <th className="w-[125px] py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-widest">Atribuído em</th>
                    <th className="w-[125px] py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-widest">Devolvido em</th>
                    <th className="w-[90px] py-3.5 px-3 text-center text-[10px] font-black uppercase tracking-widest">Ativo</th>
                    <th className="w-[110px] py-3.5 px-4 text-center text-[10px] font-black uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="group hover:bg-slate-50/20 transition-all">
                      
                      {/* Map Number */}
                      <td className="py-3 px-4 text-center">
                        <span className="text-[11px] font-mono font-black text-slate-900 bg-slate-100 px-2 py-1 rounded">
                          {item.number}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-3">
                        <span className="text-xs font-black text-slate-800 block truncate" title={item.name}>
                          {item.name}
                        </span>
                      </td>

                      {/* Locality */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-xs font-bold truncate" title={item.locality}>
                            {item.locality}
                          </span>
                        </div>
                      </td>

                      {/* Publisher */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5.5 h-5.5 rounded bg-slate-900 text-white flex items-center justify-center text-[8px] font-black">
                            {item.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[11px] font-black text-slate-700 truncate" title={item.userName}>
                            {item.userName}
                          </span>
                        </div>
                      </td>

                      {/* Date Assigned */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                          {item.assignmentDate ? formatDate(item.assignmentDate) : '-'}
                        </span>
                      </td>

                      {/* Date Returned */}
                      <td className="py-3 px-3 text-center">
                        {item.completedDate ? (
                          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {formatDate(item.completedDate)}
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100 animate-pulse no-print">
                            Trabalhando
                          </span>
                        )}
                        <span className="hidden print:inline text-[10px] font-mono font-bold text-slate-600">
                          {item.completedDate ? formatDate(item.completedDate) : 'Em Uso'}
                        </span>
                      </td>

                      {/* Duration (Days active) */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-[10px] text-slate-500">
                        {item.durationDays} {item.durationDays === 1 ? 'dia' : 'dias'}
                      </td>

                      {/* Status Icon Indicator */}
                      <td className="py-3 px-4 text-center">
                        {item.statusText === 'Concluído' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase tracking-wider">
                            <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                            {item.statusText}
                          </span>
                        )}
                        {(item.statusText === 'Em Trabalho' || item.statusText === 'Atrasado') && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            item.statusText === 'Atrasado'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${item.statusText === 'Atrasado' ? 'bg-red-500 animate-ping' : 'bg-blue-500'}`}></span>
                            {item.statusText}
                          </span>
                        )}
                        {item.statusText === 'Extornado' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black uppercase tracking-wider">
                            <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                            {item.statusText}
                          </span>
                        )}
                        {item.statusText === 'Retomado' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-black uppercase tracking-wider">
                            <span className="w-1 h-1 rounded-full bg-slate-550"></span>
                            {item.statusText}
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <div className="max-w-md mx-auto text-slate-300 font-black text-xs uppercase tracking-widest flex flex-col items-center gap-3">
                          <X className="w-8 h-8 text-slate-200" />
                          Nenhum registro encontrado no filtro atual
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Circuit Overseer Signature Blocks (Only shown during print) */}
          <div className="hidden print:grid grid-cols-2 gap-12 pt-16 mt-16 border-t border-slate-200">
            <div className="text-center">
              <div className="border-b border-slate-400 mx-auto w-4/5 pb-1"></div>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mt-2">Servo de Territórios / Supervisor</p>
              <p className="text-[8px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">Assinatura / Data</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 mx-auto w-4/5 pb-1"></div>
              <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mt-2">Superintendente de Circuito</p>
              <p className="text-[8px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">Visto de Inspeção</p>
            </div>
          </div>
          </>
          )}

        </div>

        {/* Modal Outer Footer (Hidden during print) */}
        <div className="no-print p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-slate-200 text-slate-700 hover:bg-slate-350 hover:text-slate-900 font-extrabold text-[10px] uppercase tracking-widest rounded-2xl transition-all"
          >
            Fechar Relatório
          </button>
        </div>

      </div>
    </div>
  );
};
