import Cookies from 'js-cookie';

export interface HistoryItem {
  id: string;
  surah: string;
  date: string;
  timestamp: number;
  duration: string;
  surahNumber: string;
  ayahNumber: string;
  confidence?: number;
}

const HISTORY_COOKIE_KEY = 'bayan_history';

export const getHistory = (): HistoryItem[] => {
  const history = Cookies.get(HISTORY_COOKIE_KEY);
  if (!history) return [];
  try {
    return JSON.parse(history);
  } catch (e) {
    console.error('Failed to parse history cookie', e);
    return [];
  }
};

export const addToHistory = (item: Omit<HistoryItem, 'id' | 'date' | 'timestamp'>) => {
  const history = getHistory();
  
  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    date: new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    timestamp: Date.now()
  };

  // Add to beginning of array
  const updatedHistory = [newItem, ...history];
  
  // Keep only last 50 items
  if (updatedHistory.length > 50) {
    updatedHistory.length = 50;
  }

  Cookies.set(HISTORY_COOKIE_KEY, JSON.stringify(updatedHistory), { expires: 365 }); // Expires in 1 year
  return newItem;
};

export const clearHistory = () => {
  Cookies.remove(HISTORY_COOKIE_KEY);
};
