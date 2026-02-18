export const formatDate = (date: Date | undefined | null): string => {
  if (!date) return 'N/A';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const getDaysRemaining = (dueDate: Date | undefined | null): number | null => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Retorna true se o território foi trabalhado nos últimos 60 dias.
 */
export const isRecentWork = (history: any[] | undefined): boolean => {
    if (!history || history.length === 0) return false;
    
    // O histórico já vem ordenado pela API (mais recente primeiro)
    const lastEntry = history[0];
    const completedDate = lastEntry.completedDate instanceof Date 
        ? lastEntry.completedDate 
        : lastEntry.completedDate?.toDate?.() || new Date(lastEntry.completedDate);

    const today = new Date();
    const diffTime = today.getTime() - completedDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays < 60; 
};

export const getDeadlineColorInfo = (dueDate: Date | undefined | null): { textColor: string, bgColor: string, label: string } => {
  const daysRemaining = getDaysRemaining(dueDate);

  if (daysRemaining === null || daysRemaining < 0) {
    return { textColor: 'text-white', bgColor: 'bg-red-600', label: 'Atrasado' };
  }
  if (daysRemaining <= 5) {
    return { textColor: 'text-white', bgColor: 'bg-orange-500', label: `Vence em ${daysRemaining} dias` };
  }
  if (daysRemaining <= 15) {
    return { textColor: 'text-gray-800', bgColor: 'bg-yellow-400', label: `Vence em ${daysRemaining} dias` };
  }
  return { textColor: 'text-gray-800', bgColor: 'bg-green-400', label: `Vence em ${daysRemaining} dias` };
};

export const generateServiceYearOptions = () => {
    const options: { label: string; value: string; startDate: Date; endDate: Date }[] = [];
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-indexed (0=Jan, 8=Sep)

    // O ano de serviço corre de 1 de Setembro a 31 de Agosto.
    // Se estamos em Setembro ou depois (mês >= 8), o ano de serviço é o próximo ano do calendário.
    let currentServiceYear = today.getFullYear();
    if (currentMonth >= 8) {
        currentServiceYear += 1;
    }

    // Gerar opções para os últimos 3 anos, o ano atual, e os próximos 2.
    for (let i = 3; i > 0; i--) {
        const year = currentServiceYear - i;
        options.push({
            label: `Ano de Serviço ${year}`,
            value: `sy-${year}`,
            startDate: new Date(year - 1, 8, 1), // 1 de Setembro do ano anterior
            endDate: new Date(year, 7, 31, 23, 59, 59), // 31 de Agosto do ano de serviço
        });
    }

    for (let i = 0; i < 3; i++) { // Current + 2 future years
        const year = currentServiceYear + i;
        options.push({
            label: `Ano de Serviço ${year}`,
            value: `sy-${year}`,
            startDate: new Date(year - 1, 8, 1),
            endDate: new Date(year, 7, 31, 23, 59, 59),
        });
    }

    return options.reverse(); // Mostra os anos mais recentes primeiro
};