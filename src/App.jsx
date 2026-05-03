import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Book, Dumbbell, Coffee, Briefcase, Smile, Hash, 
  Clock, Calendar, ListFilter, Plus, Trash2, 
  Tag as TagIcon, X, Check, Settings,
  ChevronLeft, ChevronRight, CalendarDays, Cloud, CloudOff, User
} from 'lucide-react';

// --- Firebase 실전 연동 (Vite 환경용) ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

// ==========================================
// 💡 [중요] 파이어베이스에서 복사한 firebaseConfig 내용을 아래에 덮어씌우세요!
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCeGzssX8tPn2tsFyBw9kGSBWUDOskC-1I",
  authDomain: "my-slip-app.firebaseapp.com",
  projectId: "my-slip-app",
  storageBucket: "my-slip-app.firebasestorage.app",
  messagingSenderId: "171448664939",
  appId: "1:171448664939:web:42c1846f1caccfc403822e"
};

// 파이어베이스 초기화 (Config가 비어있으면 에러가 날 수 있으니 꼭 채워주세요)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app) ;

// 아이콘 및 색상 설정
const AVAILABLE_ICONS = [
  { name: 'Dumbbell', component: Dumbbell }, { name: 'Book', component: Book },
  { name: 'Coffee', component: Coffee }, { name: 'Briefcase', component: Briefcase },
  { name: 'Smile', component: Smile }, { name: 'Hash', component: Hash },
];

const AVAILABLE_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200 ring-blue-400',
  'bg-green-100 text-green-700 border-green-200 ring-green-400',
  'bg-yellow-100 text-yellow-700 border-yellow-200 ring-yellow-400',
  'bg-purple-100 text-purple-700 border-purple-200 ring-purple-400',
  'bg-pink-100 text-pink-700 border-pink-200 ring-pink-400',
  'bg-indigo-100 text-indigo-700 border-indigo-200 ring-indigo-400',
];

const defaultCategories = [
  { id: 'workout', label: '운동', iconName: 'Dumbbell', color: AVAILABLE_COLORS[0] },
  { id: 'reading', label: '독서', iconName: 'Book', color: AVAILABLE_COLORS[1] },
  { id: 'social', label: '만남', iconName: 'Coffee', color: AVAILABLE_COLORS[2] },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(true);
  const [categories, setCategories] = useState(defaultCategories);
  const [entries, setEntries] = useState([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  
  const [entryDate, setEntryDate] = useState('');
  const [entryTime, setEntryTime] = useState('');
  
  const [viewMode, setViewMode] = useState('timeline');
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState('all');

  const contentInputRef = useRef(null);

  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Hash');
  const [newCatColor, setNewCatColor] = useState(AVAILABLE_COLORS[5]);

  // 1. 로그인 (익명 로그인 자동 처리)
  useEffect(() => {
    // Config가 유효할 때만 로그인 시도
    if (firebaseConfig.apiKey !== "여기에_복사한_값_넣기") {
      signInAnonymously(auth).catch(error => console.error("로그인 에러:", error));
    }
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. 시간 초기화
  const resetToCurrentTime = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    setEntryDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    setEntryTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  };

  useEffect(() => {
    resetToCurrentTime();
  }, []);

  // 3. 파이어베이스 데이터 실시간 동기화 (전표 & 카테고리)
  useEffect(() => {
    if (!user) return;
    setIsSyncing(true);

    // 전표 불러오기 (실시간)
    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const unsubEntries = onSnapshot(entriesRef, (snapshot) => {
      const fetchedEntries = [];
      snapshot.forEach((doc) => fetchedEntries.push({ id: doc.id, ...doc.data() }));
      fetchedEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setEntries(fetchedEntries);
      setIsSyncing(false);
    }, (error) => {
      console.error("데이터 동기화 에러:", error);
      setIsSyncing(false);
    });

    // 커스텀 카테고리 불러오기 (실시간)
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'userCategories');
    const unsubCategories = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().list) {
        setCategories(docSnap.data().list);
      }
    });

    return () => {
      unsubEntries();
      unsubCategories();
    };
  }, [user]);

  useEffect(() => {
    if (selectedCategoryId && contentInputRef.current) contentInputRef.current.focus();
  }, [selectedCategoryId]);

  const getCategory = (id) => {
    const cat = categories.find(c => c.id === id) || defaultCategories[0];
    const IconComponent = AVAILABLE_ICONS.find(i => i.name === (cat?.iconName || 'Hash'))?.component || Hash;
    return { ...cat, icon: IconComponent };
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, '');
      if (newTag && !tags.includes(newTag)) setTags([...tags, newTag]);
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => setTags(tags.filter(tag => tag !== tagToRemove));

  // 전표 DB에 저장
  const handleAddEntry = async () => {
    if (!selectedCategoryId || !content.trim() || !user) return;

    const combinedDateTimeString = `${entryDate}T${entryTime}:00`;
    let entryTimestamp;
    try {
      entryTimestamp = new Date(combinedDateTimeString).toISOString();
    } catch (e) {
      entryTimestamp = new Date().toISOString();
    }

    const finalTags = [...tags];
    if (tagInput.trim()) {
      const remainingTag = tagInput.trim().replace(/^#/, '');
      if (!finalTags.includes(remainingTag)) finalTags.push(remainingTag);
    }

    const entryId = Date.now().toString();
    const newEntry = {
      timestamp: entryTimestamp,
      categoryId: selectedCategoryId,
      content: content.trim(),
      tags: finalTags
    };

    try {
      // Firebase에 저장
      const entryRef = doc(collection(db, 'users', user.uid, 'entries'), entryId);
      await setDoc(entryRef, newEntry);
      
      setSelectedDate(new Date(combinedDateTimeString));
      setSelectedCategoryId(null);
      setContent('');
      setTags([]);
      setTagInput('');
      resetToCurrentTime();
    } catch (error) {
      console.error("저장 실패:", error);
      alert("데이터베이스 저장에 실패했습니다.");
    }
  };

  // 전표 DB에서 삭제
  const handleDeleteEntry = async (id) => {
    if (!user || !window.confirm('이 기록을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'entries'), id);
    } catch (error) {
      console.error("삭제 실패:", error);
    }
  };

  // 카테고리 DB 업데이트
  const updateCategoriesInDB = async (newCategories) => {
    if (!user) return;
    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'userCategories');
      await setDoc(settingsRef, { list: newCategories }, { merge: true });
    } catch (error) {
      console.error("카테고리 업데이트 실패:", error);
    }
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    const newCategory = { id: `cat_${Date.now()}`, label: newCatLabel.trim(), iconName: newCatIcon, color: newCatColor };
    const updatedCategories = [...categories, newCategory];
    updateCategoriesInDB(updatedCategories); // 로컬 대신 DB로 동기화
    setNewCatLabel('');
  };

  const handleDeleteCategory = (id) => {
    if (entries.some(e => e.categoryId === id)) return alert("이 카테고리를 사용하는 기록이 있어 삭제할 수 없습니다.");
    if(window.confirm('카테고리를 삭제하시겠습니까?')) {
      const updatedCategories = categories.filter(c => c.id !== id);
      updateCategoriesInDB(updatedCategories);
      if (selectedCategoryId === id) setSelectedCategoryId(null);
    }
  };

  const formatDate = (dateString) => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(dateString));
  const formatTime = (dateString) => new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(dateString));
  const getLocalDateString = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const filteredTimelineEntries = useMemo(() => {
    return entries.filter(entry => getLocalDateString(entry.timestamp) === getLocalDateString(selectedDate));
  }, [entries, selectedDate]);

  const filteredCategoryEntriesByDate = useMemo(() => {
    const filtered = entries.filter(entry => filterCategory === 'all' || entry.categoryId === filterCategory);
    const groups = {};
    filtered.forEach(entry => {
      const dateKey = formatDate(entry.timestamp);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    });
    return groups;
  }, [entries, filterCategory]);

  const changeDate = (offset) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">안전하게 접속 중입니다...</p>
          <p className="text-xs text-gray-400 mt-2">Firebase Config를 올바르게 입력했는지 확인해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center text-gray-800 font-sans sm:p-4">
      <div className="w-full max-w-md bg-white sm:rounded-3xl sm:shadow-2xl overflow-hidden flex flex-col relative h-screen sm:h-[850px] max-h-screen">
        
        <header className="bg-white px-6 py-4 border-b border-gray-100 shrink-0 z-20 shadow-sm relative">
          <div className="flex justify-between items-center mb-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ListFilter size={24} className="text-indigo-600" />
              하루 전표
            </h1>
            <div className="flex items-center gap-3">
              {isSyncing ? (
                 <span className="flex items-center gap-1 text-[10px] text-gray-400"><CloudOff size={12} className="animate-pulse" /> 동기화 중</span>
              ) : (
                 <span className="flex items-center gap-1 text-[10px] text-indigo-500"><Cloud size={12} /> DB 연결됨</span>
              )}
              <button onClick={() => setIsManagingCategories(!isManagingCategories)} className={`p-1.5 rounded-full transition-colors ${isManagingCategories ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                <Settings size={18} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={12} />
            <span>익명 로그인 (ID: {user.uid.slice(0, 6)}...)</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50/50 flex flex-col">
          {!isManagingCategories && (
            <section className="bg-white border-b border-gray-200 shrink-0 shadow-sm z-10 relative">
              <div className="p-5">
                <div className="mb-2">
                  <p className="text-xs font-bold text-gray-500 mb-3 ml-1">1. 활동 선택</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => {
                      const Icon = getCategory(cat.id).icon;
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button key={cat.id} onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${isSelected ? `${cat.color.split(' ')[0]} ${cat.color.split(' ')[1]} ring-2 ring-offset-2 ${cat.color.split(' ')[3]} border-transparent` : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}>
                          <Icon size={16} />{cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${selectedCategoryId ? 'max-h-[600px] opacity-100 mt-5' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2 ml-1">
                         <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><CalendarDays size={12} /> 언제 하셨나요?</p>
                        <button onClick={resetToCurrentTime} className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">현재 시간</button>
                      </div>
                      <div className="flex gap-2">
                        <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="flex-1 px-3 py-2.5 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                        <input type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className="w-28 px-3 py-2.5 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 mb-2 ml-1">2. 상세 내용 기록 <span className="text-red-400">*</span></p>
                      <textarea ref={contentInputRef} value={content} onChange={(e) => setContent(e.target.value)} placeholder="무엇을 하셨나요?" className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20 text-sm" />
                    </div>
                    <div>
                       <p className="text-xs font-bold text-gray-500 mb-2 ml-1 flex items-center gap-1"><TagIcon size={12} /> 관리 태그 (선택)</p>
                      <div className="flex flex-wrap items-center gap-2 bg-white px-3 py-2.5 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 transition-all min-h-[46px]">
                        {tags.map((tag, index) => (
                          <span key={index} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-medium">#{tag} <button onClick={() => removeTag(tag)} className="hover:text-indigo-900"><X size={12} /></button></span>
                        ))}
                        <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder={tags.length === 0 ? "태그 입력 후 Enter..." : ""} className="flex-1 bg-transparent focus:outline-none text-sm min-w-[120px] py-1" />
                      </div>
                    </div>
                    <button onClick={handleAddEntry} disabled={!content.trim()} className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-colors mt-2 shadow-md">
                      <Check size={18} /> 클라우드에 전표 저장
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {isManagingCategories && (
            <section className="bg-white p-5 border-b border-gray-200 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">활동 카테고리 관리</h2>
                <button onClick={() => setIsManagingCategories(false)} className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">완료</button>
              </div>
              <form onSubmit={handleAddCategory} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8 space-y-4">
                <h3 className="text-sm font-bold text-gray-700">새 카테고리 추가</h3>
                <div>
                  <input type="text" value={newCatLabel} onChange={(e) => setNewCatLabel(e.target.value)} placeholder="예: 게임, 쇼핑" maxLength={10} className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">아이콘</label>
                  <div className="flex gap-2 flex-wrap">
                    {AVAILABLE_ICONS.map(icon => {
                      const IconComp = icon.component;
                      return <button key={icon.name} type="button" onClick={() => setNewCatIcon(icon.name)} className={`p-2 rounded-lg border ${newCatIcon === icon.name ? 'bg-white border-indigo-500 text-indigo-600 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-200'}`}><IconComp size={20} /></button>
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">색상</label>
                  <div className="flex gap-2 flex-wrap">
                    {AVAILABLE_COLORS.map(colorClass => <button key={colorClass} type="button" onClick={() => setNewCatColor(colorClass)} className={`w-8 h-8 rounded-full border-2 ${colorClass.split(' ')[0]} ${newCatColor === colorClass ? 'border-gray-800 scale-110' : 'border-transparent'}`} />)}
                  </div>
                </div>
                <button type="submit" disabled={!newCatLabel.trim()} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 text-sm">카테고리 추가</button>
              </form>
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">현재 카테고리</h3>
                <ul className="space-y-2">
                  {categories.map(cat => {
                    const Icon = getCategory(cat.id).icon;
                    return (
                      <li key={cat.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${cat.color}`}><Icon size={18} /></div><span className="font-medium text-gray-800 text-sm">{cat.label}</span></div>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md"><Trash2 size={16} /></button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          )}

          {!isManagingCategories && (
            <div className="flex-1 flex flex-col">
              <div className="flex px-4 pt-4 pb-2 gap-2 bg-gray-50/50 sticky top-0 z-10">
                <button onClick={() => setViewMode('timeline')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}><div className="flex items-center justify-center gap-2"><Calendar size={16} /> 타임라인</div></button>
                <button onClick={() => setViewMode('category')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-colors ${viewMode === 'category' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}><div className="flex items-center justify-center gap-2"><ListFilter size={16} /> 활동별 보기</div></button>
              </div>

              <section className="p-4 flex-1">
                {viewMode === 'timeline' && (
                  <div className="flex flex-col h-full pb-8">
                    {/* 달력 오버레이 적용된 헤더 */}
                    <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm border border-gray-100 mb-6 shrink-0 sticky top-0 z-10">
                      <button onClick={() => changeDate(-1)} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft size={20} className="text-gray-600" /></button>
                      <div className="relative flex flex-col items-center cursor-pointer px-4 group">
                        <input type="date" value={getLocalDateString(selectedDate)} onChange={(e) => {if(e.target.value) setSelectedDate(new Date(e.target.value));}} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <span className="text-xs font-semibold text-indigo-600 mb-0.5">{getLocalDateString(selectedDate) === getLocalDateString(new Date()) ? '오늘' : ' '}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] font-extrabold text-gray-900 group-hover:text-indigo-600">{formatDate(selectedDate)}</span>
                          <CalendarDays size={14} className="text-gray-400 group-hover:text-indigo-500" />
                        </div>
                      </div>
                      <button onClick={() => changeDate(1)} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight size={20} className="text-gray-600" /></button>
                    </div>

                    {filteredTimelineEntries.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400">
                        <div className="bg-white border border-gray-100 shadow-sm p-5 rounded-full mb-4"><Calendar size={36} className="text-gray-300" /></div>
                        <p className="text-center font-medium text-gray-500">이 날짜에 기록된 전표가 없습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 ml-2 border-l-2 border-gray-100 pl-5">
                        {filteredTimelineEntries.map(entry => {
                          const cat = getCategory(entry.categoryId);
                          const Icon = cat.icon;
                          return (
                            <div key={entry.id} className="relative group">
                              <div className={`absolute -left-[29px] top-1 w-4 h-4 rounded-full border-4 border-white ${cat.color.split(' ')[0]} z-10`}></div>
                              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center justify-center p-1.5 rounded-lg ${cat.color} bg-opacity-20`}><Icon size={14} className={cat.color.split(' ')[1]} /></span>
                                    <span className="text-xs font-bold text-gray-800">{cat.label}</span>
                                    <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">{formatTime(entry.timestamp)}</span>
                                  </div>
                                  <button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                                {entry.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {entry.tags.map((tag, idx) => <span key={idx} className="text-[11px] font-medium text-indigo-600 bg-indigo-50/50 border border-indigo-100 px-2 py-0.5 rounded-md">#{tag}</span>)}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {viewMode === 'category' && (
                  <div className="flex flex-col h-full pb-8">
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide shrink-0 mb-2 sticky top-0 z-10 bg-gray-50/90 backdrop-blur pt-1">
                      <button onClick={() => setFilterCategory('all')} className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${filterCategory === 'all' ? 'bg-gray-900 text-white border-transparent shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>전체 보기</button>
                      {categories.map(cat => {
                        const Icon = getCategory(cat.id).icon;
                        const isSelected = filterCategory === cat.id;
                        return (
                          <button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${isSelected ? `${cat.color.split(' ')[0]} ${cat.color.split(' ')[1]} border-transparent shadow-md ring-2 ring-offset-1 ${cat.color.split(' ')[3]}` : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                            <Icon size={16} />{cat.label}
                          </button>
                        )
                      })}
                    </div>

                    {Object.keys(filteredCategoryEntriesByDate).length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400">
                        <div className="bg-white border border-gray-100 shadow-sm p-5 rounded-full mb-4"><ListFilter size={36} className="text-gray-300" /></div>
                        <p className="text-center font-medium text-gray-500">조건에 맞는 활동 기록이 없습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(filteredCategoryEntriesByDate).map(([date, dayEntries]) => (
                          <div key={date} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-100"><h3 className="text-xs font-bold text-gray-700">{date}</h3></div>
                            <ul className="divide-y divide-gray-50">
                              {dayEntries.map(entry => {
                                const cat = getCategory(entry.categoryId);
                                const Icon = cat.icon;
                                return (
                                  <li key={entry.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex gap-3 items-start">
                                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${cat.color.split(' ')[0]} ${cat.color.split(' ')[1]}`}><Icon size={16} /></div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-xs font-bold text-gray-800">{cat.label}</span>
                                          <span className="text-[11px] font-semibold text-gray-400 bg-white border border-gray-100 px-1.5 py-0.5 rounded shadow-sm">{formatTime(entry.timestamp)}</span>
                                        </div>
                                        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                                        {entry.tags?.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {entry.tags.map((tag, idx) => <span key={idx} className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">#{tag}</span>)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}