import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Book, Dumbbell, Coffee, Briefcase, Smile, Hash, 
  CalendarDays, Plus, Trash2, Tag as TagIcon, X, Check, 
  Settings, ChevronLeft, ChevronRight, Cloud, CloudOff,
  BarChart2, Zap, ClockArrowUp, Layers, Target,
  BookOpen, AlignLeft, Sparkles, Search, Filter, Calendar,
  ShieldCheck, FileText, Pencil, AlertCircle, Download, LogOut,
  Wine, Beer, Monitor, Laptop, Home, ShoppingBag, 
  Utensils, Music, Heart, Moon, Car, Gamepad2,
  PieChart, Award, TrendingUp, Clock
} from 'lucide-react';

// --- Firebase 임포트 ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// --- [중요] 실제 본인의 파이어베이스 정보로 교체하세요 ---
const firebaseConfig = {
  apiKey: "AIzaSyCeGzssX8tPn2tsFyBw9kGSBWUDOskC-1I",
  authDomain: "my-slip-app.firebaseapp.com",
  projectId: "my-slip-app",
  storageBucket: "my-slip-app.firebasestorage.app",
  messagingSenderId: "171448664939",
  appId: "1:171448664939:web:42c1846f1caccfc403822e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : "daily-pieces-v1"; // 앱 데이터 그룹 식별자

const AVAILABLE_COLORS = [
  'bg-blue-100 text-blue-600 border-blue-200',
  'bg-emerald-100 text-emerald-600 border-emerald-200',
  'bg-amber-100 text-amber-600 border-amber-200',
  'bg-purple-100 text-purple-600 border-purple-200',
  'bg-rose-100 text-rose-600 border-rose-200',
  'bg-sky-100 text-sky-600 border-sky-200',
];

const AVAILABLE_ICONS = [
  { name: 'Dumbbell', component: Dumbbell }, { name: 'Book', component: Book },
  { name: 'Coffee', component: Coffee }, { name: 'Briefcase', component: Briefcase },
  { name: 'Smile', component: Smile }, { name: 'Hash', component: Hash },
  { name: 'Wine', component: Wine }, { name: 'Beer', component: Beer },
  { name: 'Utensils', component: Utensils }, { name: 'Laptop', component: Laptop },
  { name: 'Monitor', component: Monitor }, { name: 'Home', component: Home },
  { name: 'ShoppingBag', component: ShoppingBag }, { name: 'Music', component: Music },
  { name: 'Gamepad2', component: Gamepad2 }, { name: 'Car', component: Car },
  { name: 'Heart', component: Heart }, { name: 'Moon', component: Moon }
];

const defaultCategories = [
  { id: 'workout', label: '운동', iconName: 'Dumbbell', color: AVAILABLE_COLORS[0] },
  { id: 'reading', label: '독서', iconName: 'Book', color: AVAILABLE_COLORS[1] },
  { id: 'social', label: '만남', iconName: 'Coffee', color: AVAILABLE_COLORS[2] },
];

const getSolidColor = (colorStr) => {
  if (!colorStr) return 'bg-gray-500';
  if (colorStr.includes('blue')) return 'bg-blue-500';
  if (colorStr.includes('emerald')) return 'bg-emerald-500';
  if (colorStr.includes('amber')) return 'bg-amber-500';
  if (colorStr.includes('purple')) return 'bg-purple-500';
  if (colorStr.includes('rose')) return 'bg-rose-500';
  if (colorStr.includes('sky')) return 'bg-sky-500';
  return 'bg-gray-500';
};

const getTextColor = (colorStr) => {
  if (!colorStr) return 'text-gray-600';
  if (colorStr.includes('blue')) return 'text-blue-600';
  if (colorStr.includes('emerald')) return 'text-emerald-600';
  if (colorStr.includes('amber')) return 'text-amber-600';
  if (colorStr.includes('purple')) return 'text-purple-600';
  if (colorStr.includes('rose')) return 'text-rose-600';
  if (colorStr.includes('sky')) return 'text-sky-600';
  return 'text-gray-600';
};

// PWA 설정
const setupPWA = () => {
  if (typeof document === 'undefined') return;
  const appIconSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="112" fill="url(#p1)"/><path d="M160 170H352V210H160V170Z" fill="white"/><path d="M160 250H352V290H160V250Z" fill="white" fill-opacity="0.8"/><path d="M160 330H352V370H160V330Z" fill="white" fill-opacity="0.6"/><defs><linearGradient id="p1" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse"><stop stop-color="#6366F1"/><stop offset="1" stop-color="#4338CA"/></linearGradient></defs></svg>`;
  const iconDataUri = `data:image/svg+xml;base64,${btoa(appIconSvg)}`;
  const manifest = { "name": "도트 (DOT.)", "short_name": "DOT.", "start_url": ".", "display": "standalone", "background_color": "#F9FAFB", "theme_color": "#4F46E5", "icons": [{ "src": iconDataUri, "sizes": "512x512", "type": "image/svg+xml", "purpose": "any maskable" }] };
  
  let mLink = document.querySelector('link[rel="manifest"]');
  if (!mLink) { mLink = document.createElement('link'); mLink.rel = 'manifest'; document.head.appendChild(mLink); }
  mLink.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], {type: 'application/json'}));
  
  let aIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!aIcon) { aIcon = document.createElement('link'); aIcon.rel = 'apple-touch-icon'; document.head.appendChild(aIcon); }
  aIcon.href = iconDataUri;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isSyncing, setIsSyncing] = useState(true);
  const [categories, setCategories] = useState(defaultCategories);
  const [entries, setEntries] = useState([]);
  const [toast, setToast] = useState(null);

  // UI 상태
  const [viewMode, setViewMode] = useState('pieces'); 
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // 필터, 검색, 통계
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [calendarCategory, setCalendarCategory] = useState(defaultCategories[0].id);
  const [statsPeriod, setStatsPeriod] = useState('month'); // week, month, year, all

  // 작성/수정 폼
  const [editingId, setEditingId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [title, setTitle] = useState(''); 
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [timeMode, setTimeMode] = useState('range');
  const [entryDate, setEntryDate] = useState('');
  const [entryTime, setEntryTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // 설정 화면 폼
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Hash');
  const [newCatColor, setNewCatColor] = useState(AVAILABLE_COLORS[0]);

  const contentInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Auth & Sync
  useEffect(() => {
    setupPWA();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoadingAuth(false); });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, provider); showToast("반갑습니다!"); } catch (e) { showToast("로그인 실패", "error"); } };
  const handleGuestLogin = async () => { try { await signInAnonymously(auth); showToast("게스트 모드로 시작합니다!"); } catch (e) { showToast("게스트 로그인 실패", "error"); } };
  const handleLogout = async () => { if(!confirm("로그아웃 하시겠습니까?")) return; try { await signOut(auth); setIsManagingCategories(false); showToast("로그아웃 되었습니다."); } catch (e) {} };

  useEffect(() => {
    if (!user) return;
    setIsSyncing(true);
    const entriesRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'entries');
    const unsubEntries = onSnapshot(entriesRef, (snap) => {
      const data = []; snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setEntries(data); setIsSyncing(false);
    }, () => setIsSyncing(false));

    const settingsRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'userCategories');
    const unsubCats = onSnapshot(settingsRef, (snap) => {
      if (snap.exists() && snap.data().list) {
        setCategories(snap.data().list);
        if (!calendarCategory) setCalendarCategory(snap.data().list[0]?.id || '');
      }
    });
    return () => { unsubEntries(); unsubCats(); };
  }, [user, calendarCategory]);

  // --- [신규 기능] 모바일 뒤로가기(하드웨어 백버튼) 제어 로직 ---
  // 현재 열려있는 창의 상태를 실시간으로 참조하기 위해 useRef 사용
  const stateRef = useRef({ viewMode, isSheetOpen, isManagingCategories, legalModal });
  useEffect(() => {
    stateRef.current = { viewMode, isSheetOpen, isManagingCategories, legalModal };
  }, [viewMode, isSheetOpen, isManagingCategories, legalModal]);

  useEffect(() => {
    if (!user) return; // 로그인 전에는 제어하지 않음

    const handlePopState = (e) => {
      const { viewMode, isSheetOpen, isManagingCategories, legalModal } = stateRef.current;
      let intercepted = false;

      // 1. 법적 고지 모달이 열려있다면 닫기
      if (legalModal) {
        setLegalModal(null);
        intercepted = true;
      } 
      // 2. 작성/수정 시트가 열려있다면 닫기
      else if (isSheetOpen) {
        setIsSheetOpen(false);
        intercepted = true;
      } 
      // 3. 환경 설정창이 열려있다면 닫기
      else if (isManagingCategories) {
        setIsManagingCategories(false);
        intercepted = true;
      } 
      // 4. 메인 뷰(도트)가 아닌 다른 탭을 보고 있다면 메인으로 돌아가기
      else if (viewMode !== 'pieces') {
        setViewMode('pieces');
        intercepted = true;
      }

      if (intercepted) {
        // 무언가 열려있는 창을 닫았다면, 다음 뒤로가기에도 앱이 꺼지지 않도록 히스토리를 다시 채워넣음
        window.history.pushState(null, '', window.location.href);
      } else {
        // 모든 창이 닫혀있고 기본 홈 화면일 때는 자연스럽게 앱이 종료되도록 둠
      }
    };

    // 앱 마운트 시 초기 트랩(가짜 히스토리) 설치
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);
  // --------------------------------------------------------

  // Helpers
  const getLocalDateString = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const formatDate = (ts) => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(ts));
  const formatTime = (ts) => new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ts));
  
  const calculateDurationInMinutes = (timestamp, endTime, timeMode) => {
    if (timeMode === 'none' || !endTime) return 0;
    const start = new Date(timestamp);
    const [endH, endM] = endTime.split(':').map(Number);
    const end = new Date(start);
    end.setHours(endH, endM, 0, 0);
    if (end < start) end.setDate(end.getDate() + 1);
    return Math.max(0, Math.round((end - start) / 60000));
  };

  const formatDurationStr = (mins) => {
    if (mins === 0) return '0분';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}시간 ${m}분`;
    if (h > 0) return `${h}시간`;
    return `${m}분`;
  };

  const getCategory = (id) => {
    const cat = categories.find(c => c.id === id) || { label: '미정', color: 'bg-gray-100 text-gray-400', iconName: 'Hash' };
    const iconObj = AVAILABLE_ICONS.find(i => i.name === cat.iconName) || AVAILABLE_ICONS[5];
    return { ...cat, Icon: iconObj.component };
  };

  const triggerPicker = (e) => { const input = e.currentTarget.querySelector('input'); if (input && input.showPicker) { try { input.showPicker(); } catch (err) {} } };

  // Form Handlers
  const handleOpenSheet = () => {
    setEditingId(null); const now = new Date(); const pad = (n) => n.toString().padStart(2, '0');
    setEntryDate(getLocalDateString(selectedDate)); setEntryTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    const later = new Date(now.getTime() + 3600000); setEndTime(`${pad(later.getHours())}:${pad(later.getMinutes())}`);
    setSelectedCategoryId(null); setTitle(''); setContent(''); setTags([]); setTagInput(''); setIsSheetOpen(true);
  };

  const handleEditEntry = (entry) => {
    setEditingId(entry.id); const d = new Date(entry.timestamp); const pad = (n) => n.toString().padStart(2, '0');
    setEntryDate(getLocalDateString(d)); setEntryTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setEndTime(entry.endTime || ''); setTimeMode(entry.timeMode === 'start' ? 'range' : entry.timeMode || 'range');
    setSelectedCategoryId(entry.categoryId); setTitle(entry.title || ''); setContent(entry.content || ''); setTags(entry.tags || []); setTagInput(''); setIsSheetOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!selectedCategoryId || (!title.trim() && !content.trim()) || !user) return;
    const ts = new Date(`${entryDate}T${entryTime}:00`).toISOString();
    const finalTags = [...tags];
    if (tagInput.trim()) { const clean = tagInput.trim().replace(/^#/, ''); if (!finalTags.includes(clean)) finalTags.push(clean); }
    try {
      const docId = editingId || Date.now().toString();
      await setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'entries', docId), { timestamp: ts, timeMode, endTime: timeMode === 'range' ? endTime : null, categoryId: selectedCategoryId, title: title.trim(), content: content.trim(), tags: finalTags });
      setSelectedDate(new Date(ts)); setIsSheetOpen(false); showToast(editingId ? "도트가 수정되었습니다" : "오늘의 도트를 남겼습니다");
      setTagInput('');
    } catch (e) { showToast("저장 실패", "error"); }
  };

  const handleDeleteEntry = async (e, id) => {
    if (e) e.stopPropagation(); if (!user || !window.confirm('정말 이 기록을 지울까요?')) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'entries', id)); if (isSheetOpen) setIsSheetOpen(false); showToast("기록이 파기되었습니다"); } catch (e) { showToast("삭제 에러", "error"); }
  };

  const saveCategory = async (e) => {
    e.preventDefault(); if (!newCatLabel.trim() || !user) return;
    let newList = editingCategoryId ? categories.map(c => c.id === editingCategoryId ? { ...c, label: newCatLabel.trim(), iconName: newCatIcon, color: newCatColor } : c) : [...categories, { id: `cat_${Date.now()}`, label: newCatLabel.trim(), iconName: newCatIcon, color: newCatColor }];
    setCategories(newList);
    try { await setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'userCategories'), { list: newList }); setNewCatLabel(''); setEditingCategoryId(null); showToast(editingCategoryId ? "활동이 수정되었습니다" : "새 활동이 추가되었습니다"); } catch (err) { showToast("저장 실패", "error"); }
  };

  const deleteCategory = async (id) => {
    if(entries.some(e => e.categoryId === id)) return showToast("기록이 있는 항목은 삭제 불가", "error");
    if(!confirm('카테고리를 삭제하시겠습니까?')) return;
    const newList = categories.filter(c => c.id !== id); setCategories(newList);
    try { await setDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid, 'settings', 'userCategories'), { list: newList }); showToast("카테고리 삭제 완료"); } catch (err) { showToast("삭제 실패", "error"); }
  };

  const exportToCSV = () => {
    if (entries.length === 0) return showToast("기록이 없습니다", "error");
    const headers = ["날짜", "시작시간", "종료시간", "소요시간(분)", "카테고리", "제목", "내용", "태그"];
    const rows = entries.map(e => [ 
      formatDate(e.timestamp), 
      formatTime(e.timestamp), 
      e.endTime || "", 
      calculateDurationInMinutes(e.timestamp, e.endTime, e.timeMode),
      getCategory(e.categoryId).label, 
      e.title || "", 
      e.content?.replace(/\n/g, " ") || "", 
      e.tags?.join(", ") || "" 
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `DOT_archive_${getLocalDateString(new Date())}.csv`); document.body.appendChild(link); link.click(); showToast("CSV 백업 완료");
  };

  // --- Views Computations ---
  const dailyEntries = useMemo(() => entries.filter(e => getLocalDateString(new Date(e.timestamp)) === getLocalDateString(selectedDate)), [entries, selectedDate]);
  const diaryEntries = useMemo(() => [...dailyEntries].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)), [dailyEntries]);

  const searchResults = useMemo(() => {
    if (viewMode !== 'search') return {};
    const q = searchQuery.toLowerCase().trim();
    const filtered = entries.filter(e => {
      const matchCat = searchCategory === 'all' || e.categoryId === searchCategory;
      const matchText = !q || e.title?.toLowerCase().includes(q) || e.content?.toLowerCase().includes(q) || e.tags?.some(t => t.toLowerCase().includes(q));
      return matchCat && matchText;
    });
    const grouped = {};
    filtered.forEach(e => { const d = formatDate(e.timestamp); if (!grouped[d]) grouped[d] = []; grouped[d].push(e); });
    return grouped;
  }, [entries, searchQuery, searchCategory, viewMode]);

  const calendarDays = useMemo(() => {
    const y = calendarMonth.getFullYear(), m = calendarMonth.getMonth();
    const start = new Date(y, m, 1).getDay(); const total = new Date(y, m+1, 0).getDate();
    const days = Array(start).fill(null); for(let i=1; i<=total; i++) days.push(new Date(y, m, i));
    return days;
  }, [calendarMonth]);

  const getDayStatus = (date) => {
    if (!date) return null; const dStr = getLocalDateString(date);
    const hasMatch = entries.some(e => getLocalDateString(new Date(e.timestamp)) === dStr && e.categoryId === calendarCategory);
    if (!hasMatch) return null;
    const cat = getCategory(calendarCategory);
    return { badge: cat.color.split(' ')[1].replace('text-', 'bg-'), bg: cat.color.split(' ')[0], text: cat.color.split(' ')[1], color: cat.color };
  };

  // --- 누적 시간 통계(Stats) 연산 ---
  const statsData = useMemo(() => {
    if (viewMode !== 'stats') return null;
    const now = new Date();
    const filtered = entries.filter(e => {
      const d = new Date(e.timestamp);
      if (statsPeriod === 'week') { const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); return d >= weekAgo && d <= now; }
      if (statsPeriod === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (statsPeriod === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });

    const catDurations = {};
    const tagDurations = {};

    filtered.forEach(e => {
      const duration = calculateDurationInMinutes(e.timestamp, e.endTime, e.timeMode);
      catDurations[e.categoryId] = (catDurations[e.categoryId] || 0) + duration;
      (e.tags || []).forEach(t => { tagDurations[t] = (tagDurations[t] || 0) + duration; });
    });

    const sortedCats = Object.entries(catDurations).map(([id, duration]) => ({ id, duration, cat: getCategory(id) })).filter(item => item.duration > 0).sort((a, b) => b.duration - a.duration);
    const maxCatDuration = sortedCats.length > 0 ? sortedCats[0].duration : 1;
    const sortedTags = Object.entries(tagDurations).map(([tag, duration]) => ({ tag, duration })).filter(item => item.duration > 0).sort((a, b) => b.duration - a.duration).slice(0, 10);

    return { categories: sortedCats, tags: sortedTags, maxCatDuration };
  }, [entries, statsPeriod, viewMode, categories]);

  // --- 추천 태그 (전체 기간 횟수 기준 Top 5) ---
  const topTagsRecommendation = useMemo(() => {
    const tagCounts = {};
    entries.forEach(e => { (e.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }); });
    return Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);
  }, [entries]);

  // --- 렌더링 ---
  if (loadingAuth) return <div className="h-screen flex items-center justify-center bg-white"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) {
    return (
      <div className="h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-8 text-center">
        <style>{`
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
          @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap');
          * { font-family: 'Pretendard', sans-serif; }
          .font-cute { font-family: 'Jua', sans-serif; }
        `}</style>
        <div className="w-24 h-24 bg-indigo-600 text-white rounded-[32px] flex items-center justify-center shadow-2xl mb-8"><Layers size={48} strokeWidth={2.5}/></div>
        <h1 className="text-[44px] font-black tracking-tighter text-gray-900 mb-2">DOT.</h1>
        <p className="text-gray-400 font-medium mb-12 leading-relaxed">하루를 찍고, 일상을 잇다.<br/>나만의 타임라인을 완성해 보세요.</p>
        <button onClick={handleGoogleLogin} className="w-full max-w-xs flex items-center justify-center gap-4 bg-white border border-gray-200 py-4.5 rounded-2xl font-black text-gray-700 shadow-sm active:scale-95 transition-all hover:bg-gray-50"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google"/>구글 계정으로 시작하기</button>
        <button onClick={handleGuestLogin} className="w-full max-w-xs flex items-center justify-center gap-4 bg-transparent py-3 mt-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-200/50 active:scale-95 transition-all">먼저 둘러보기 (게스트)</button>
        {toast && <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in slide-in-from-top-6 duration-400"><div className={`px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white text-indigo-600 border-indigo-100' : 'bg-white text-rose-600 border-rose-100'}`}>{toast.type === 'success' ? <Check size={22} strokeWidth={4}/> : <AlertCircle size={22} strokeWidth={4}/>}<span className="text-[16px] font-black tracking-tight">{toast.message}</span></div></div>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center text-gray-900 p-0 sm:p-4 overflow-hidden selection:bg-indigo-100">
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap');
        .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } 
        html, body { overscroll-behavior-y: none; font-family: 'Pretendard', sans-serif; }
        .font-pretendard { font-family: 'Pretendard', sans-serif; } .font-cute { font-family: 'Jua', sans-serif; } .font-diary { font-family: 'Gowun Dodum', sans-serif; }
      `}</style>
      
      <div className="w-full max-w-md bg-[#F9FAFB] sm:rounded-[44px] shadow-2xl h-screen sm:h-[850px] overflow-hidden flex flex-col relative sm:border-[10px] border-gray-900 font-pretendard">
        
        <header className="bg-white px-6 py-5 border-b border-gray-100 shrink-0 z-30 flex justify-between items-center rounded-b-[32px] shadow-sm relative">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-100"><Layers size={20} strokeWidth={2.5}/></div>
            <div>
              <h1 className="text-[22px] font-black tracking-tight leading-none text-indigo-950 mt-1">DOT.</h1>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest mt-1">하루를 찍고, 일상을 잇다.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.photoURL && <img src={user.photoURL} alt="profile" className="w-9 h-9 rounded-full border border-gray-100 shadow-sm" />}
            <button onClick={() => { setIsManagingCategories(true); setEditingCategoryId(null); setNewCatLabel(''); }} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all active:scale-90"><Settings size={22} /></button>
          </div>
        </header>

        {isManagingCategories ? (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col hide-scrollbar bg-[#F9FAFB]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black">환경 설정</h2>
              <button onClick={() => setIsManagingCategories(false)} className="text-sm font-bold text-indigo-600 bg-indigo-50 px-5 py-2.5 rounded-full active:scale-95 transition-all">완료</button>
            </div>
            
            <section className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 mb-8 space-y-5">
              <h3 className="text-xs font-black text-indigo-500 tracking-wider flex items-center gap-1.5 uppercase"><Sparkles size={14}/> {editingCategoryId ? '활동 수정 (과거 기록 자동 반영)' : '새 활동 추가'}</h3>
              <form onSubmit={saveCategory} className="space-y-5">
                <input type="text" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="항목 이름 (예: 명상, 독서)" maxLength={10} className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-lg" />
                <div className="flex gap-2.5 flex-wrap">{AVAILABLE_ICONS.map(i => (<button key={i.name} type="button" onClick={() => setNewCatIcon(i.name)} className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${newCatIcon === i.name ? 'bg-indigo-100 text-indigo-600 shadow-inner ring-2 ring-indigo-200 scale-110' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}><i.component size={20}/></button>))}</div>
                <div className="flex gap-3 flex-wrap">{AVAILABLE_COLORS.map(c => (<button key={c} type="button" onClick={() => setNewCatColor(c)} className={`w-8 h-8 rounded-full border-2 transition-transform ${c.split(' ')[0]} ${newCatColor === c ? 'border-gray-800 scale-125 shadow-lg' : 'border-transparent'}`} />))}</div>
                <div className="flex gap-2">
                  <button type="submit" disabled={!newCatLabel.trim()} className="flex-1 bg-indigo-600 text-white py-4.5 rounded-2xl font-black active:scale-95 transition-all shadow-xl shadow-indigo-100">{editingCategoryId ? '수정하기' : '추가하기'}</button>
                  {editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(null); setNewCatLabel(''); }} className="px-6 bg-gray-100 text-gray-500 rounded-2xl font-black active:scale-95 transition-all">취소</button>}
                </div>
              </form>
            </section>

            <div className="flex-1 space-y-3 mb-8">
              <h3 className="text-xs font-bold text-gray-400 mb-2 ml-1 tracking-wider uppercase">My Categories</h3>
              {categories.map(cat => {
                const CatIcon = getCategory(cat.id).Icon;
                return (
                  <div key={cat.id} className="flex items-center justify-between p-4.5 bg-white border border-gray-100 rounded-[24px] shadow-sm transition-all active:bg-gray-50">
                    <div className="flex items-center gap-4"><div className={`w-10 h-10 flex items-center justify-center rounded-2xl ${cat.color}`}><CatIcon size={20} strokeWidth={2.5}/></div><span className="font-bold text-gray-800 text-lg">{cat.label}</span></div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingCategoryId(cat.id); setNewCatLabel(cat.label); setNewCatIcon(cat.iconName); setNewCatColor(cat.color); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-gray-300 hover:text-indigo-500 active:scale-90 transition-all"><Pencil size={20}/></button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-2 text-gray-300 hover:text-red-500 active:scale-90 transition-all"><Trash2 size={20}/></button>
                    </div>
                  </div>
                )
              })}
            </div>

            <section className="mb-10 space-y-4">
               {/* ☕️ 개발자 후원 버튼 (카카오페이 QR 링크 연동) */}
               <button onClick={() => window.open('https://qr.kakaopay.com/Ej80O3SQW', '_blank')} className="w-full flex items-center justify-center gap-2 py-4.5 bg-[#FEE500] text-[#191919] rounded-[24px] font-black active:scale-95 transition-all shadow-sm">
                 <Coffee size={20} /> 개발자에게 커피 한 잔 사주기
               </button>
               
               <button onClick={exportToCSV} className="w-full flex items-center justify-center gap-3 py-4.5 bg-gray-900 text-white rounded-[24px] font-black active:scale-95 transition-all shadow-xl"><Download size={20}/> 모든 기록 백업하기 (CSV)</button>
               <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 py-4.5 bg-white border border-gray-200 text-gray-400 rounded-[24px] font-bold active:scale-95 transition-all"><LogOut size={18}/> 로그아웃</button>
            </section>
            <footer className="mt-auto py-10 border-t border-gray-200 flex flex-col items-center gap-5 text-center">
              <div className="flex gap-8"><button onClick={() => setLegalModal('tos')} className="text-xs font-bold text-gray-400 active:text-indigo-600">이용약관</button><button onClick={() => setLegalModal('privacy')} className="text-xs font-bold text-gray-400 active:text-indigo-600">개인정보 처리방침</button></div>
              <p className="text-[10px] text-gray-300 font-mono tracking-tighter uppercase">© 2026 Park Geunhong. Cloud Synced.</p>
            </footer>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col hide-scrollbar pb-24 relative">
            
            <div className="px-3 sm:px-5 py-4 sticky top-0 z-20 bg-[#F9FAFB] border-b border-gray-100 shadow-sm">
              <div className="flex bg-gray-200/60 p-1 rounded-2xl mb-3">
                {[
                  { id: 'pieces', icon: AlignLeft, label: '도트' },
                  { id: 'diary', icon: BookOpen, label: '일기장' },
                  { id: 'calendar', icon: Calendar, label: '달력' },
                  { id: 'stats', icon: PieChart, label: '통계' },
                  { id: 'search', icon: Search, label: '검색' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setViewMode(tab.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] sm:text-[13px] font-black rounded-xl transition-all ${viewMode === tab.id ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500'}`}>
                    <tab.icon size={16} strokeWidth={2.5}/> <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {(viewMode === 'pieces' || viewMode === 'diary') && (
                <div className="flex items-center justify-between bg-white rounded-[20px] p-2 border border-gray-100 shadow-sm">
                  <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(d); }} className="w-10 h-10 flex items-center justify-center text-gray-400 active:text-indigo-600 transition-all"><ChevronLeft size={24}/></button>
                  <div className="relative flex flex-col items-center cursor-pointer px-6 group" onClick={triggerPicker}>
                    <input type="date" value={getLocalDateString(selectedDate)} onChange={(e) => e.target.value && setSelectedDate(new Date(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{getLocalDateString(selectedDate) === getLocalDateString(new Date()) ? 'Today' : 'Select Date'}</span>
                    <span className="text-lg font-black text-gray-800 tracking-tight">{formatDate(selectedDate)}</span>
                  </div>
                  <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(d); }} className="w-10 h-10 flex items-center justify-center text-gray-400 active:text-indigo-600 transition-all"><ChevronRight size={24}/></button>
                </div>
              )}
            </div>

            <div className="p-5 space-y-6">
              
              {/* 뷰: 조각 (타임라인) -> 도트 */}
              {viewMode === 'pieces' && (
                <>
                  <div className="bg-white rounded-[36px] shadow-sm border border-gray-100 divide-y divide-dashed divide-gray-100 overflow-hidden">
                    {dailyEntries.length === 0 ? (
                      <div className="py-28 text-center text-gray-400 space-y-5">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200 shadow-inner"><Plus size={40}/></div>
                        <p className="text-[15px] font-black tracking-tight leading-relaxed">오늘 남긴 도트가 없습니다.</p>
                      </div>
                    ) : (
                      dailyEntries.map(e => {
                        const cat = getCategory(e.categoryId);
                        return (
                          <div key={e.id} onClick={() => handleEditEntry(e)} className="p-6 active:bg-gray-50 transition-all cursor-pointer relative group">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center ${cat.color} shadow-sm border border-white/20`}><cat.Icon size={22} strokeWidth={2.5} /></div>
                                <div>
                                  <div className="text-[11px] font-black text-gray-400 uppercase tracking-tighter">{cat.label}</div>
                                  <div className="text-[14px] font-mono font-bold text-indigo-500 mt-0.5">
                                    {formatTime(e.timestamp)} {e.endTime && `~ ${e.endTime}`}
                                  </div>
                                </div>
                              </div>
                              <button onClick={(ev) => handleDeleteEntry(ev, e.id)} className="p-2.5 text-gray-300 hover:text-red-500 active:scale-90 transition-all"><Trash2 size={20}/></button>
                            </div>
                            <div className="pl-[64px]">
                              {e.title && <h4 className="text-[18px] font-black text-gray-900 mb-2 leading-tight tracking-tight">{e.title}</h4>}
                              <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-wrap">{e.content}</p>
                              {e.tags?.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{e.tags.map((t,i) => <span key={i} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100/50 shadow-sm">#{t}</span>)}</div>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {/* 뷰: 다이어리 */}
              {viewMode === 'diary' && (
                <div className="bg-[#FFFCF5] rounded-[40px] border border-amber-100 p-8 shadow-sm min-h-[550px] relative overflow-hidden">
                   <div className="absolute top-0 left-8 right-8 h-1.5 flex justify-around -mt-0.5 opacity-30"><div className="w-3 h-5 bg-gray-400 rounded-full shadow-sm"></div><div className="w-3 h-5 bg-gray-400 rounded-full shadow-sm"></div><div className="w-3 h-5 bg-gray-400 rounded-full shadow-sm"></div></div>
                   <h2 className="text-center text-2xl font-black mb-14 tracking-widest text-amber-900/40 uppercase font-mono">
                     {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(selectedDate).toUpperCase()}
                   </h2>
                   {diaryEntries.length === 0 ? <p className="text-center text-gray-300 py-32 font-black text-sm tracking-widest uppercase">Empty Day</p> : (
                     <div className="space-y-12 relative border-l-2 border-amber-200/40 ml-2 pl-8 pb-10">
                        {diaryEntries.map(e => (
                          <div key={e.id} onClick={() => handleEditEntry(e)} className="relative cursor-pointer group active:scale-[0.98] transition-transform">
                            <div className="absolute -left-[31px] top-2 w-4 h-4 rounded-full bg-amber-400 border-4 border-[#FFFCF5] shadow-md group-hover:scale-125 transition-transform" />
                            <div className="text-[13px] font-black text-amber-600/70 font-mono mb-2.5 uppercase tracking-widest font-pretendard">
                              {formatTime(e.timestamp)} {e.endTime && `— ${e.endTime}`} <span className="mx-1">•</span> {e.title || getCategory(e.categoryId).label}
                            </div>
                            <p className="text-[17px] text-gray-700 leading-loose font-diary font-bold">{e.content}</p>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              )}

              {/* 뷰: 달력 */}
              {viewMode === 'calendar' && (
                <div className="space-y-8">
                  <div className="flex flex-wrap gap-2 pt-2 pb-4 px-1">
                    {categories.map(c => {
                      const CatIcon = getCategory(c.id).Icon;
                      return (
                        <button key={c.id} onClick={() => setCalendarCategory(c.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-black border transition-all ${calendarCategory === c.id ? `${c.color} border-transparent ring-2 ring-indigo-200 shadow-md` : 'bg-white text-gray-500 border-gray-200 shadow-sm hover:bg-gray-50'}`}>
                          <CatIcon size={14} strokeWidth={2.5}/>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-xl shadow-indigo-50/20">
                    <div className="flex justify-between items-center mb-10 px-2">
                      <button onClick={() => { const d = new Date(calendarMonth); d.setMonth(d.getMonth()-1); setCalendarMonth(d); }} className="p-3 hover:bg-gray-50 rounded-full active:scale-90 transition-all text-gray-300"><ChevronLeft size={28}/></button>
                      <h3 className="font-black text-2xl tracking-tighter">{calendarMonth.getFullYear()}년 {calendarMonth.getMonth()+1}월</h3>
                      <button onClick={() => { const d = new Date(calendarMonth); d.setMonth(d.getMonth()+1); setCalendarMonth(d); }} className="p-3 hover:bg-gray-50 rounded-full active:scale-90 transition-all text-gray-300"><ChevronRight size={28}/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-6">{['일','월','화','수','목','금','토'].map(d => <div key={d} className={`text-[12px] font-black ${d==='일'?'text-rose-300':d==='토'?'text-sky-300':'text-gray-300 uppercase'}`}>{d}</div>)}</div>
                    <div className="grid grid-cols-7 gap-y-5">
                      {calendarDays.map((d,i) => {
                        if (!d) return <div key={i} className="h-12" />;
                        const catStatus = getDayStatus(d);
                        const isToday = getLocalDateString(d) === getLocalDateString(new Date());
                        const isSelected = getLocalDateString(d) === getLocalDateString(selectedDate);
                        return (
                          <button key={i} onClick={() => { setSelectedDate(d); setViewMode('pieces'); }} className={`h-12 relative flex items-center justify-center group rounded-2xl transition-all ${isSelected?'bg-indigo-50/70 shadow-inner':''}`}>
                            {catStatus && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className={`w-10 h-10 rounded-full ${catStatus.color.split(' ')[0]} shadow-sm group-hover:scale-110 transition-transform`} />
                                <div className={`absolute -top-1 -right-1 w-5.5 h-5.5 rounded-full ${getSolidColor(catStatus.color)} border-2 border-white flex items-center justify-center shadow-md`}><Check size={12} strokeWidth={4} className="text-white" /></div>
                              </div>
                            )}
                            <span className={`text-[16px] font-black z-10 transition-colors ${catStatus ? getTextColor(catStatus.color) : (isToday ? 'text-indigo-600 ring-2 ring-indigo-100 rounded-full w-9 h-9 flex items-center justify-center' : 'text-gray-700')}`}>{d.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 뷰: 통계 */}
              {viewMode === 'stats' && statsData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 mb-4">
                    {[{ id: 'week', label: '최근 7일' }, { id: 'month', label: '이번 달' }, { id: 'year', label: '올해' }, { id: 'all', label: '전체' }].map(p => (
                      <button key={p.id} onClick={() => setStatsPeriod(p.id)} className={`flex-1 py-2.5 text-[13px] font-black rounded-xl transition-all ${statsPeriod === p.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{p.label}</button>
                    ))}
                  </div>

                  <div className="bg-white rounded-[36px] p-7 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                      <TrendingUp size={20} className="text-indigo-500" strokeWidth={2.5}/>
                      <h3 className="text-[16px] font-black text-gray-800">카테고리별 누적 시간</h3>
                    </div>
                    {statsData.categories.length === 0 ? <div className="py-10 text-center text-gray-300 font-bold text-xs uppercase tracking-widest">기록이 없습니다</div> : (
                      <div className="space-y-6">
                        {statsData.categories.map((item) => {
                          const width = Math.max(10, (item.duration / (statsData.maxCatDuration || 1)) * 100);
                          const bgSolid = getSolidColor(item.cat.color);
                          const CatIcon = item.cat.Icon;
                          return (
                            <div key={item.id} className="relative">
                              <div className="flex justify-between items-end mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.cat.color} shadow-sm border border-white/20`}><CatIcon size={16} strokeWidth={2.5}/></div>
                                  <span className="text-[15px] font-black text-gray-800">{item.cat.label}</span>
                                </div>
                                <span className="text-[15px] font-bold text-gray-500">{formatDurationStr(item.duration)}</span>
                              </div>
                              <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full ${bgSolid} transition-all duration-1000 ease-out`} style={{ width: `${width}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-[36px] p-7 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <Clock size={20} className="text-amber-500" strokeWidth={2.5}/>
                      <h3 className="text-[16px] font-black text-gray-800">태그(세부)별 누적 시간</h3>
                    </div>
                    {statsData.tags.length === 0 ? <div className="py-10 text-center text-gray-300 font-bold text-xs uppercase tracking-widest">태그 기록이 없습니다</div> : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {statsData.tags.map(t => (
                          <div key={t.tag} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-[20px] px-5 py-4 shadow-sm hover:bg-white transition-colors">
                            <span className="text-[15px] font-black text-indigo-600 mr-2">#{t.tag}</span>
                            <span className="bg-white border border-gray-200 text-gray-500 text-[13px] font-bold px-3 py-1.5 rounded-lg shadow-sm">
                              {formatDurationStr(t.duration)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 뷰: 검색 */}
              {viewMode === 'search' && (
                <div className="space-y-8">
                  <div className="relative"><Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={22} strokeWidth={3}/><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="기록 제목, 태그, 본문 검색" className="w-full pl-14 pr-8 py-5 bg-white rounded-[28px] shadow-xl font-black border-none focus:ring-2 focus:ring-indigo-500 transition-all text-lg" /></div>
                  <div className="flex flex-wrap gap-2 pt-2 pb-4 px-1">
                    <button onClick={() => setSearchCategory('all')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-black transition-all ${searchCategory === 'all' ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 shadow-sm hover:bg-gray-50'}`}>전체보기</button>
                    {categories.map(c => {
                      const CatIcon = getCategory(c.id).Icon;
                      return (
                        <button key={c.id} onClick={() => setSearchCategory(c.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-black border transition-all ${searchCategory === c.id ? `${c.color} border-transparent shadow-md ring-2 ring-indigo-200` : 'bg-white text-gray-500 border-gray-200 shadow-sm hover:bg-gray-50'}`}>
                          <CatIcon size={14} strokeWidth={2.5}/>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  {Object.entries(searchResults).length === 0 ? <div className="py-32 text-center text-gray-300 font-bold tracking-widest uppercase text-xs">No Matches Found</div> : Object.entries(searchResults).map(([date, items]) => (
                    <div key={date}>
                      <h3 className="text-[12px] font-black text-gray-400 mb-4 ml-2 flex items-center gap-2 tracking-widest uppercase"><CalendarDays size={16}/> {date}</h3>
                      <div className="bg-white rounded-[32px] overflow-hidden divide-y divide-gray-50 border border-gray-100 shadow-sm">
                        {items.map(item => {
                          const cat = getCategory(item.categoryId);
                          return (
                            <div key={item.id} onClick={() => handleEditEntry(item)} className="p-6 flex gap-5 hover:bg-gray-50 active:bg-gray-50 transition-all cursor-pointer relative group">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cat.color} shadow-sm border border-white/20`}><cat.Icon size={22} strokeWidth={2.5}/></div>
                              <div className="flex-1 min-w-0"><div className="text-[17px] font-black text-gray-800 truncate leading-snug tracking-tight">{item.title || "무제"}</div><p className="text-[14px] text-gray-500 line-clamp-1 mt-1 font-medium">{item.content}</p></div>
                              <button onClick={(ev) => handleDeleteEntry(ev, item.id)} className="p-2 text-gray-300 hover:text-red-500 active:scale-90 transition-all"><Trash2 size={20}/></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!isManagingCategories && (
          <div className="absolute bottom-10 right-8 z-40">
            <button onClick={handleOpenSheet} className="w-18 h-18 bg-gray-900 text-white rounded-full shadow-[0_15px_50px_rgba(0,0,0,0.4)] flex items-center justify-center active:scale-90 transition-all hover:scale-110 active:rotate-90"><Plus size={40} strokeWidth={4} /></button>
          </div>
        )}

        {/* 작성/수정 시트 */}
        {isSheetOpen && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-400" onClick={() => setIsSheetOpen(false)} />
             <div className="bg-white rounded-t-[50px] w-full max-h-[95%] overflow-y-auto hide-scrollbar z-50 p-8 shadow-[0_-25px_80px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom duration-500 ease-out border-t border-gray-100">
                <div className="w-14 h-2 bg-gray-200 rounded-full mx-auto mb-8" />
                <div className="flex justify-between items-center mb-8 px-1">
                   <div>
                     <h2 className="text-3xl font-black tracking-tighter">{editingId ? '도트 수정' : '새로운 도트'}</h2>
                     {editingId && <p className="text-[12px] font-bold text-indigo-500 mt-1 uppercase tracking-widest">Editing Mode</p>}
                   </div>
                   <button onClick={() => { setEditingId(null); handleOpenSheet(); }} className="text-[12px] font-black bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-full active:scale-95 transition-all">지금 시간</button>
                </div>
                
                <div className="flex flex-wrap gap-2.5 pt-2 pb-8 px-1">
                   {categories.map(c => {
                     const CatIcon = getCategory(c.id).Icon;
                     return (
                       <button key={c.id} onClick={() => setSelectedCategoryId(c.id)} className={`flex items-center gap-2 px-5 py-3 rounded-full text-[15px] font-black border transition-all ${selectedCategoryId === c.id ? `${c.color} border-transparent ring-2 ring-indigo-500 shadow-lg scale-105` : 'bg-white text-gray-500 border-gray-200 shadow-sm hover:bg-gray-50'}`}>
                         <CatIcon size={16} strokeWidth={2.5}/>
                         {c.label}
                       </button>
                     );
                   })}
                   <button onClick={() => { setIsSheetOpen(false); setIsManagingCategories(true); setEditingCategoryId(null); setNewCatLabel(''); }} className="flex items-center justify-center px-5 py-3 rounded-full border border-dashed border-gray-300 text-gray-400 font-black text-[14px] bg-gray-50/50 hover:bg-gray-100 transition-all">+ 활동 관리</button>
                </div>

                {selectedCategoryId && (
                  <div className="space-y-7 px-1 pb-10">
                    <div className="flex bg-gray-100 p-2 rounded-[24px]">
                      {[{ id: 'range', label: '시간 설정', icon: ClockArrowUp }, { id: 'none', label: '시간 생략', icon: Zap }].map(m => (
                        <button key={m.id} onClick={() => setTimeMode(m.id)} className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[14px] font-black rounded-[20px] transition-all ${timeMode === m.id ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400'}`}>
                          <m.icon size={18} strokeWidth={2.5}/> {m.label}
                        </button>
                      ))}
                    </div>
                    
                    {timeMode !== 'none' && (
                      <div className="bg-gray-50 p-4 rounded-[28px] border border-gray-100 space-y-3">
                        <div className="relative flex items-center bg-white rounded-2xl shadow-sm border border-gray-100" onClick={triggerPicker}>
                          <div className="pl-5 text-indigo-400"><CalendarDays size={20} /></div>
                          <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full px-4 py-4 bg-transparent border-none font-black text-[16px] appearance-none focus:outline-none transition-colors" />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="relative flex-1 min-w-[130px] flex items-center bg-white rounded-2xl shadow-sm border border-gray-100" onClick={triggerPicker}>
                            <input type="time" value={entryTime} onChange={e => setEntryTime(e.target.value)} className="w-full px-3 py-4 bg-transparent border-none font-black text-[16px] appearance-none focus:outline-none text-center" />
                          </div>
                          <span className="text-gray-300 font-black text-lg text-center hidden sm:block">~</span>
                          <div className="relative flex-1 min-w-[130px] flex items-center bg-white rounded-2xl shadow-sm border border-gray-100" onClick={triggerPicker}>
                            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-4 bg-transparent border-none font-black text-[16px] appearance-none focus:outline-none text-center" />
                          </div>
                        </div>
                      </div>
                    )}

                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="활동 제목" className="w-full px-7 py-5 bg-gray-50 rounded-3xl border-none font-black text-xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300" />
                    <textarea ref={contentInputRef} value={content} onChange={e => setContent(e.target.value)} placeholder="어떤 활동을 하셨나요? 오늘의 도트를 남겨주세요." className="w-full px-7 py-5 bg-gray-50 rounded-3xl h-44 resize-none text-[17px] leading-relaxed focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300 font-medium" />
                    
                    <div className="bg-gray-50 px-6 py-5 rounded-[32px] space-y-4">
                       <span className="text-[11px] font-black text-gray-400 flex items-center gap-2 uppercase tracking-widest"><Target size={14}/> Tags & Labels</span>
                       
                       {topTagsRecommendation.length > 0 && (
                         <div className="flex flex-wrap gap-2 pt-1 pb-2">
                           {topTagsRecommendation.map(t => (
                             <button key={`rec-${t}`} onClick={() => { if(!tags.includes(t)) setTags([...tags, t]); }} className="text-[13px] font-bold text-gray-500 bg-white border border-gray-200 px-3.5 py-2 rounded-full shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95">
                               + {t}
                             </button>
                           ))}
                         </div>
                       )}

                       <div className="flex flex-wrap gap-2.5">
                         {tags.map((t,i) => <span key={i} className="bg-white border border-gray-200 px-4 py-2 rounded-[16px] text-xs font-black flex items-center gap-2 shadow-sm">{t}<button onClick={() => setTags(tags.filter(item => item !== t))} className="text-red-400 active:scale-75 transition-transform"><X size={16} strokeWidth={3}/></button></span>)}
                         <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
                              e.preventDefault(); const nt = tagInput.trim().replace(/^#/, '');
                              if (nt && !tags.includes(nt)) setTags([...tags, nt]);
                              setTagInput('');
                            }
                         }} placeholder="Enter, 공백, 쉼표로 태그 추가" className="flex-1 bg-transparent outline-none text-[15px] font-black min-w-[120px]" />
                       </div>
                    </div>
                    
                    <div className="flex flex-col gap-4 pb-10">
                      <button onClick={handleSaveEntry} disabled={!title.trim() && !content.trim()} className="w-full py-5.5 bg-indigo-600 text-white rounded-[28px] font-black shadow-2xl shadow-indigo-200 disabled:opacity-30 active:scale-[0.98] transition-all text-lg tracking-tight">
                         {editingId ? '수정 완료하기' : '새로운 도트 남기기'}
                      </button>
                      {editingId && (
                        <button onClick={(ev) => handleDeleteEntry(ev, editingId)} className="w-full py-5 bg-rose-50 text-rose-600 rounded-[28px] font-black text-[16px] flex items-center justify-center gap-2 active:bg-rose-100 transition-colors"><Trash2 size={20}/> 이 기록 파기하기</button>
                      )}
                    </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* 토스트 */}
        {toast && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[150] animate-in fade-in slide-in-from-top-6 duration-400">
            <div className={`px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white text-indigo-600 border-indigo-100' : 'bg-white text-rose-600 border-rose-100'}`}>
              {toast.type === 'success' ? <Check size={22} strokeWidth={4}/> : <AlertCircle size={22} strokeWidth={4}/>}
              <span className="text-[16px] font-black tracking-tight">{toast.message}</span>
            </div>
          </div>
        )}

        {/* 법적 모달 */}
        {legalModal && (
          <div className="absolute inset-0 z-[100] bg-white flex flex-col p-10 animate-in fade-in duration-400">
             <div className="flex justify-between items-center mb-12"><h3 className="text-3xl font-black tracking-tighter uppercase">{legalModal === 'tos' ? 'Terms' : 'Privacy'}</h3><button onClick={() => setLegalModal(null)} className="p-4 bg-gray-100 rounded-full active:scale-90 transition-all shadow-sm"><X size={24}/></button></div>
             <div className="flex-1 overflow-y-auto text-[16px] text-gray-500 leading-relaxed space-y-10 hide-scrollbar font-medium">
                {legalModal === 'tos' ? (
                  <div className="space-y-8">
                    <section><h4 className="font-black text-gray-900 mb-3 text-lg">제1조 (목적)</h4><p>본 약관은 'DOT.' 앱 서비스의 이용과 관련한 권리 및 의무를 규정합니다.</p></section>
                    <section><h4 className="font-black text-gray-900 mb-3 text-lg">제2조 (저작권)</h4><p>모든 디자인, 로직, 브랜드 자산에 대한 권리는 개발자 박근홍에게 있습니다.</p></section>
                    <section><h4 className="font-black text-gray-900 mb-3 text-lg">제3조 (면책)</h4><p>개인 프로젝트로서 최선을 다해 관리하나, 예기치 못한 데이터 손실에 대해서는 복구 책임을 지지 않습니다. 중요 데이터는 백업 기능을 이용해 주세요.</p></section>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <section><h4 className="font-black text-gray-900 mb-3 text-lg">1. 정보 수집</h4><p>서비스 제공을 위해 구글 로그인 연동 시 생성되는 고유 식별자(UID) 및 직접 입력하신 활동 내용을 수집합니다.</p></section>
                    <section><h4 className="font-black text-gray-900 mb-3 text-lg">2. 데이터 보관</h4><p>모든 데이터는 암호화되어 Firebase 클라우드 서버에 안전하게 보관됩니다.</p></section>
                    <section><h4 className="font-black text-gray-900 mb-3 text-lg">3. 권리 보장</h4><p>사용자가 회원 탈퇴 및 앱 사용을 중단할 시, 데이터베이스 내 모든 기록은 복구 불가능한 상태로 파기됩니다.</p></section>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}