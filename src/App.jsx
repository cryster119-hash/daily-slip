import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Book, Dumbbell, Coffee, Briefcase, Smile, Hash, 
  CalendarDays, Plus, Trash2, Tag as TagIcon, X, Check, 
  Settings, ChevronLeft, ChevronRight, Cloud, CloudOff,
  BarChart2, Zap, ClockArrowUp, Layers, Target,
  BookOpen, AlignLeft, Sparkles, Search, Filter, Calendar,
  ShieldCheck, FileText, Pencil, AlertCircle, Download, LogOut
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
];

const defaultCategories = [
  { id: 'workout', label: '운동', iconName: 'Dumbbell', color: AVAILABLE_COLORS[0] },
  { id: 'reading', label: '독서', iconName: 'Book', color: AVAILABLE_COLORS[1] },
  { id: 'social', label: '만남', iconName: 'Coffee', color: AVAILABLE_COLORS[2] },
];

// Tailwind Purge 방지 함수
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

// PWA 아이콘 및 홈 화면 추가 설정
const setupPWA = () => {
  if (typeof document === 'undefined') return;
  const appIconSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="112" fill="url(#p1)"/><path d="M160 170H352V210H160V170Z" fill="white"/><path d="M160 250H352V290H160V250Z" fill="white" fill-opacity="0.8"/><path d="M160 330H352V370H160V330Z" fill="white" fill-opacity="0.6"/><defs><linearGradient id="p1" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse"><stop stop-color="#6366F1"/><stop offset="1" stop-color="#4338CA"/></linearGradient></defs></svg>`;
  const iconDataUri = `data:image/svg+xml;base64,${btoa(appIconSvg)}`;
  const manifest = { "name": "하루 조각", "short_name": "하루조각", "start_url": ".", "display": "standalone", "background_color": "#F9FAFB", "theme_color": "#4F46E5", "icons": [{ "src": iconDataUri, "sizes": "512x512", "type": "image/svg+xml", "purpose": "any maskable" }] };
  
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

  // 필터 및 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [calendarCategory, setCalendarCategory] = useState(defaultCategories[0].id);

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

  // 토스트 알림
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- 1. 구글 로그인 인증 로직 ---
  useEffect(() => {
    setupPWA();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      showToast("반갑습니다!");
    } catch (error) {
      showToast("로그인에 실패했습니다.", "error");
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInAnonymously(auth);
      showToast("게스트 모드로 시작합니다!");
    } catch (error) {
      showToast("게스트 로그인에 실패했습니다.", "error");
    }
  };

  const handleLogout = async () => {
    if(!confirm("로그아웃 하시겠습니까?")) return;
    try {
      await signOut(auth);
      setIsManagingCategories(false);
      showToast("로그아웃 되었습니다.");
    } catch (error) { showToast("로그아웃 실패", "error"); }
  };

  // --- 2. 데이터 바인딩 ---
  useEffect(() => {
    if (!user) return;
    setIsSyncing(true);
    
    // 기록 연동
    const entriesRef = collection(db, 'artifacts', APP_ID,응! 니 모바일에서 잘 돌아가면 개발 단계에선 충분해.

네가 배포하고 싶은 시점에, Firebase 보안 규칙만 한 번 더 확인하면 돼.

지금 상태로는만 알려주고 홈 화면 추가 방법만 안내하면 지인들도 네 앱을 바로 써볼 수 있어.