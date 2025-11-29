import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp, setDoc, getDocs, where, writeBatch 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  Search, Map, BookOpen, Plus, ShoppingCart, 
  ArrowRight, User, Star, MoreHorizontal, Move, 
  Package, LayoutGrid, Tag, LogOut, CheckCircle, XCircle,
  Inbox, Database, Trash2, Edit2, Save, Download, Upload, FileText,
  AlertCircle, Sparkles, Loader2
} from 'lucide-react';

// --- Firebase Configuration (회원님 설정값 적용됨) ---
const firebaseConfig = {
  apiKey: "AIzaSyB7eQzfz9leVWjs23VJ9uFMAIaB_YXQq68",
  authDomain: "graphic-d473d.firebaseapp.com",
  projectId: "graphic-d473d",
  storageBucket: "graphic-d473d.firebasestorage.app",
  messagingSenderId: "482443735322",
  appId: "1:482443735322:web:42d7434776c5a4ef797ca3",
  measurementId: "G-KVM210Y5HP"
};

// 앱 ID (데이터 분리용)
const appId = 'graphicbook-v1';

// Firebase 초기화 (안전 장치)
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase 초기화 실패:", e);
}

// --- Gemini API Helper ---
// Vercel 환경 변수나 직접 키를 입력해야 작동합니다.
const callGemini = async (prompt, systemInstruction = "") => {
  const apiKey = ""; // 여기에 Gemini API 키를 넣으세요 (선택사항)
  
  if (!apiKey) {
    alert("AI 기능을 사용하려면 코드에 Gemini API 키를 설정해야 합니다.");
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Gemini API Error: ${response.status}`);
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("Gemini API call failed:", error);
    alert("AI 호출 중 오류가 발생했습니다.");
    return null;
  }
};

// --- Helper Functions ---
const safeInt = (val) => {
  if (!val) return 0;
  const num = parseInt(val.toString().replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
};

const safeStr = (val) => {
  if (val === undefined || val === null) return '';
  return val.toString().trim().replace(/"/g, '');
};

// --- Components ---

// 1. Navbar
const Navbar = ({ activeTab, setActiveTab, userMode, setUserMode }) => (
  <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm h-16 transition-all">
    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('home')}>
      <div className="bg-black text-white p-1.5 rounded-lg font-bold text-xl font-serif shadow-md">P</div>
      <span className="font-serif text-xl font-bold tracking-tight hidden md:block text-gray-900">Paperr.lib</span>
    </div>
    
    <div className="flex gap-1 md:gap-2 text-sm font-medium bg-gray-100/50 p-1 rounded-full overflow-hidden">
      {userMode === 'customer' ? (
        <>
          <button onClick={() => setActiveTab('home')} className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'home' ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}>홈</button>
          <button onClick={() => setActiveTab('search')} className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'search' ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}>검색</button>
          <button onClick={() => setActiveTab('curation')} className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1 ${activeTab === 'curation' ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}>
            <Sparkles size={14} className={activeTab === 'curation' ? "text-yellow-500" : ""}/> 큐레이션
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setActiveTab('admin-map')} className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1 ${activeTab === 'admin-map' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}><Map size={14}/>서가</button>
          <button onClick={() => setActiveTab('admin-inventory')} className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1 ${activeTab === 'admin-inventory' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}><Package size={14}/>재고</button>
          <button onClick={() => setActiveTab('admin-database')} className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1 ${activeTab === 'admin-database' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}><Database size={14}/>DB</button>
        </>
      )}
    </div>

    <button 
      onClick={() => {
        const newMode = userMode === 'customer' ? 'admin' : 'customer';
        setUserMode(newMode);
        setActiveTab(newMode === 'customer' ? 'home' : 'admin-map');
      }}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${userMode === 'customer' ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-blue-50 border-blue-200 text-blue-600'}`}
    >
      {userMode === 'customer' ? '관리자 모드' : '고객 모드'}
    </button>
  </nav>
);

// 2. Book Card
const BookCard = ({ book, onClick, reason }) => (
  <div onClick={() => onClick(book)} className="group cursor-pointer flex flex-col gap-3 transition-transform hover:-translate-y-1 duration-300">
    <div className="aspect-[2/3] w-full bg-gray-100 rounded-xl overflow-hidden relative shadow-sm group-hover:shadow-xl transition-all border border-gray-100">
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => e.target.style.display = 'none'} />
      ) : null}
      <div className={`absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-300 ${book.coverUrl ? 'hidden' : ''}`}>
          <BookOpen size={32} />
      </div>
      
      {book.isNew && (
        <span className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
          NEW
        </span>
      )}
      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-gray-900 text-[10px] px-2 py-1 rounded-md font-bold shadow-sm border border-gray-100">
        {book.locationStr || (book.location ? `${book.location.section}-${book.location.row}-${book.location.col}` : '위치미정')}
      </div>
    </div>
    <div>
      <h3 className="font-bold text-gray-900 leading-tight line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">{book.title}</h3>
      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{book.author}</p>
      {reason && (
        <div className="mt-2 bg-blue-50 p-2 rounded-lg text-[11px] text-blue-700 leading-snug flex gap-1.5 items-start">
            <Sparkles size={12} className="shrink-0 mt-0.5 text-blue-500 fill-blue-500"/>
            {reason}
        </div>
      )}
    </div>
  </div>
);

// 3. Book Detail Modal
const BookDetail = ({ book, onClose, onAddComment, comments }) => {
  const [commentText, setCommentText] = useState('');
  
  if (!book) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 px-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="font-bold text-lg truncate pr-4 text-gray-900">도서 상세 정보</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><XCircle size={24} className="text-gray-400 hover:text-gray-900"/></button>
        </div>

        <div className="overflow-y-auto p-0 pb-8 flex-1">
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
            {/* Image Side */}
            <div className="w-full md:w-1/3 shrink-0">
               <div className="aspect-[2/3] bg-gray-100 rounded-xl shadow-lg overflow-hidden border border-gray-200">
                 {book.coverUrl ? <img src={book.coverUrl} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="text-gray-300" size={48}/></div>}
               </div>
            </div>

            {/* Info Side */}
            <div className="flex-1 space-y-5">
              <div>
                <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded mb-2">{book.category || '미분류'}</span>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2 text-gray-900 font-serif">{book.title}</h1>
                <p className="text-sm text-gray-600 font-medium">{book.author} <span className="text-gray-300 mx-2">|</span> {book.publisher}</p>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="bg-white p-2 rounded-full shadow-sm text-blue-600"><Map size={20}/></div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">서가 위치</p>
                  <p className="text-base font-bold text-gray-900">
                    {book.locationStr || (book.location ? 
                      `Section ${book.location.section} / 행 ${book.location.row} / 열 ${book.location.col}` 
                      : '입고 대기중')}
                  </p>
                </div>
              </div>

              <div className="prose prose-sm text-gray-600 leading-relaxed">
                <p>{book.oneLineReview || book.description || '이 책에 대한 소개글이 아직 없습니다.'}</p>
              </div>

              {book.tags && (
                  <div className="flex flex-wrap gap-2 pt-2">
                      {book.tags.split(',').map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-gray-600 hover:bg-gray-200 transition-colors cursor-default">#{tag.trim()}</span>
                      ))}
                  </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 my-4 mx-6 md:mx-8"></div>

          {/* Comments Section */}
          <div className="px-6 md:px-8">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
              독자 한마디 <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{comments?.length || 0}</span>
            </h3>
            
            <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
              {comments && comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-900 flex items-center gap-1"><User size={12}/> 익명의 독자</span>
                      <span className="text-[10px] text-gray-400">{c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</span>
                    </div>
                    <p className="text-gray-600 pl-4 border-l-2 border-gray-200">{c.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8 text-sm flex flex-col items-center gap-2">
                    <div className="bg-gray-200 p-2 rounded-full"><AlertCircle size={16} className="text-white"/></div>
                    첫 번째 코멘트를 남겨보세요!
                </div>
              )}
            </div>

            <div className="flex gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-black transition-all">
              <input 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="이 책은 어땠나요? 감상을 남겨주세요."
                className="flex-1 bg-transparent border-none rounded-lg px-4 py-3 text-sm focus:ring-0 outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    onAddComment(book.id, commentText);
                    setCommentText('');
                  }
                }}
              />
              <button 
                onClick={() => {
                  if (commentText.trim()) {
                    onAddComment(book.id, commentText);
                    setCommentText('');
                  }
                }}
                className="bg-black text-white px-5 py-2 rounded-lg text-sm font-bold shrink-0 hover:bg-gray-800 transition-colors"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. Admin Map
const AdminMap = ({ books, onMoveBook }) => {
  const [activeSection, setActiveSection] = useState('A');
  const sections = ['A', 'B', 'C'];
  const rows = 5;
  const cols = 8;
  const [draggedBook, setDraggedBook] = useState(null);

  const getCellBook = (r, c) => books.find(b => b.location?.section === activeSection && b.location?.row === r && b.location?.col === c);
  const getUnplacedBooks = () => books.filter(b => !b.location);

  const handleDrop = (r, c, e) => {
    e.preventDefault();
    if (!draggedBook) return;
    const targetBook = getCellBook(r, c);
    onMoveBook(draggedBook.id, { section: activeSection, row: r, col: c }, targetBook);
    setDraggedBook(null);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-gray-50/50">
      <div className="w-full lg:w-72 bg-white border-r border-gray-200 flex flex-col h-1/3 lg:h-full overflow-hidden shadow-xl z-10">
        <div className="p-4 border-b border-gray-100 bg-white sticky top-0">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
            <Inbox size={20} className="text-blue-600"/> 미배치 도서
            <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{getUnplacedBooks().length}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">드래그하여 지도에 배치하세요.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {getUnplacedBooks().map(book => (
            <div 
              key={book.id}
              draggable
              onDragStart={() => setDraggedBook(book)}
              className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm cursor-move hover:border-blue-500 hover:shadow-md hover:bg-blue-50/50 transition-all flex gap-3 items-center group active:scale-95"
            >
              <div className="w-10 h-14 bg-gray-100 rounded shrink-0 overflow-hidden shadow-inner">
                {book.coverUrl ? <img src={book.coverUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gray-200"/>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate group-hover:text-blue-700 text-gray-800">{book.title}</p>
                <p className="text-xs text-gray-500 truncate">{book.author}</p>
              </div>
              <div className="text-gray-300 group-hover:text-blue-400"><Move size={14}/></div>
            </div>
          ))}
          {getUnplacedBooks().length === 0 && (
            <div className="text-center py-10 text-gray-300 text-sm flex flex-col items-center gap-2">
                <CheckCircle size={24} className="text-green-100"/>
                모든 도서가 배치되었습니다.
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-auto bg-gray-50">
        <div className="max-w-5xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">서가 배치도</h2>
                <p className="text-sm text-gray-500">각 섹션(Section)을 선택하고 도서를 배치하세요.</p>
            </div>
            <div className="flex bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                {sections.map(s => (
                <button
                    key={s}
                    onClick={() => setActiveSection(s)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeSection === s ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Section {s}
                </button>
                ))}
            </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto">
            <div className="inline-grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(90px, 1fr))` }}>
                {Array.from({ length: rows }).map((_, rIndex) => (
                <React.Fragment key={rIndex}>
                    {Array.from({ length: cols }).map((_, cIndex) => {
                    const book = getCellBook(rIndex + 1, cIndex + 1);
                    return (
                        <div
                        key={`${rIndex}-${cIndex}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(rIndex + 1, cIndex + 1, e)}
                        className={`
                            aspect-[3/4] rounded-xl border-2 transition-all relative group
                            ${book ? 'border-transparent bg-white shadow-md hover:shadow-lg hover:-translate-y-1' : 'border-dashed border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200'}
                        `}
                        >
                        {book ? (
                            <div
                            draggable
                            onDragStart={() => setDraggedBook(book)}
                            className="w-full h-full cursor-grab active:cursor-grabbing p-1 relative"
                            >
                            {book.coverUrl ? <img 
                                src={book.coverUrl} 
                                className="w-full h-full object-cover rounded-lg pointer-events-none" 
                                alt="book"
                            /> : <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">No Img</div>}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white p-2 text-center pointer-events-none">
                                <div>
                                    <p className="text-[10px] font-bold line-clamp-2">{book.title}</p>
                                </div>
                            </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                            <span className="text-xs font-mono font-bold">{rIndex+1}-{cIndex+1}</span>
                            </div>
                        )}
                        </div>
                    );
                    })}
                </React.Fragment>
                ))}
            </div>
            <div className="mt-6 text-center pt-4 border-t border-gray-100">
                <span className="text-gray-300 font-bold uppercase tracking-[0.3em] text-xs">Section {activeSection} Floor Plan</span>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// 5. Admin Inventory (Bulk Excel Paste)
const AdminInventory = ({ orders, onBulkOrder, onReceive }) => {
  const [view, setView] = useState('bulk');
  const [pasteData, setPasteData] = useState('');

  const handleBulkPaste = () => {
    try {
      const rows = pasteData.trim().split('\n');
      const newOrders = [];
      
      rows.forEach(row => {
        if(!row.trim()) return;
        let cols = row.split('\t');
        if (cols.length < 2) cols = row.split(',');

        const type = safeStr(cols[0]) || '구입';
        const date = safeStr(cols[1]) || new Date().toISOString().split('T')[0];
        const isbn = safeStr(cols[2]);
        const title = safeStr(cols[3]);
        const quantity = safeInt(cols[4]) || 1;
        const source = safeStr(cols[5]);
        const purpose = safeStr(cols[6]);
        const price = safeInt(cols[7]);

        if (title && isbn) {
          newOrders.push({
            type, date, isbn, title, quantity, source, purpose, price,
            status: 'pending',
            createdAt: new Date()
          });
        }
      });

      if (newOrders.length > 0) {
        onBulkOrder(newOrders);
        setPasteData('');
        alert(`${newOrders.length}건이 등록되었습니다. '입출고 현황' 탭에서 확인하세요.`);
      } else {
        alert('데이터를 인식하지 못했습니다. 형식을 확인해주세요.\n(구분, 일자, ISBN, 상품명...)');
      }
    } catch (e) {
      console.error(e);
      alert('오류가 발생했습니다: ' + e.message);
    }
  };

  const downloadCSV = () => {
    try {
        const headers = ['처리', '구분', '일자', 'ISBN', '상품명', '수량', '구매처', '발주용도', '가격', '비고'];
        const csvRows = [headers.join(',')];
        
        orders.forEach(o => {
            const row = [
                o.status === 'received' ? '입고' : '발주',
                safeStr(o.type || '구입'),
                safeStr(o.date),
                `"${safeStr(o.isbn)}"`,
                `"${safeStr(o.title).replace(/"/g, '""')}"`,
                o.quantity,
                safeStr(o.source),
                safeStr(o.purpose),
                o.price,
                ''
            ];
            csvRows.push(row.join(','));
        });
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', '도서현황_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        alert("다운로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 mb-8 border-b border-gray-200 pb-1 items-start md:items-center justify-between">
        <div className="flex gap-6">
            <button onClick={() => setView('bulk')} className={`pb-3 text-sm font-bold transition-all ${view === 'bulk' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}>대량 입력 (엑셀)</button>
            <button onClick={() => setView('list')} className={`pb-3 text-sm font-bold transition-all ${view === 'list' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}>입출고 현황 ({orders.length})</button>
        </div>
        <button onClick={downloadCSV} className="text-xs flex items-center gap-1.5 text-green-600 hover:text-green-800 font-bold mb-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 transition-colors">
            <Download size={14}/> 엑셀로 내보내기
        </button>
      </div>

      {view === 'bulk' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm animate-fade-in">
          <div className="flex items-start gap-4 mb-6">
             <div className="bg-green-100 p-3 rounded-full text-green-600 shadow-sm"><FileText size={24}/></div>
             <div>
                 <h3 className="font-bold text-xl text-gray-900">엑셀 데이터 붙여넣기</h3>
                 <p className="text-sm text-gray-500 mt-1">'판매/구입 입력' 시트의 데이터를 복사(Ctrl+C)해서 아래에 붙여넣기(Ctrl+V)하세요.</p>
                 <div className="mt-2 text-xs bg-gray-100 text-gray-600 p-2 rounded inline-block font-mono">
                    순서: 구분 | 일자 | ISBN | 상품명 | 수량 | 구매처 | 발주용도 | 가격
                 </div>
             </div>
          </div>
          
          <textarea 
            className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all resize-none shadow-inner"
            placeholder={`예시 데이터:\n구입	2024-11-21	9788954685306	연옥당 2	1	북센	도서 추가	14700\n구입	2024-11-21	9791196155711	연의 편지	1	손봄북스	도서 추가	10500`}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
          />
          <button onClick={handleBulkPaste} className="mt-6 w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg">
            <Upload size={18}/> 데이터 처리 및 저장
          </button>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-3 animate-fade-in">
          {[...orders].reverse().map(order => (
            <div key={order.id} className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${order.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.status === 'received' ? '입고완료' : '발주중'}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1"><AlertCircle size={10}/> {order.date}</span>
                </div>
                <h4 className="font-bold text-gray-900 text-lg">{order.title}</h4>
                <p className="text-xs text-gray-500 font-mono mt-1 flex items-center gap-2">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{order.isbn}</span>
                    <span>{order.quantity}권</span>
                    <span>{order.price ? order.price.toLocaleString() + '원' : '-'}</span>
                    <span className="text-gray-400">{order.source}</span>
                </p>
              </div>
              {order.status === 'pending' && (
                <button 
                    onClick={() => onReceive(order)}
                    className="w-full md:w-auto bg-blue-600 text-white text-xs px-4 py-2.5 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-md transition-colors"
                >
                    <CheckCircle size={14}/> 입고확인 처리
                </button>
              )}
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Package size={40} className="mx-auto text-gray-300 mb-2"/>
                <p className="text-gray-400">등록된 내역이 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 6. Admin Database (Bulk Import + AI Fill)
const AdminDatabase = ({ books, onUpdateBook, onDeleteBook, onBulkImport }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const startEdit = (book) => {
    setEditingId(book.id);
    setEditForm({ ...book });
  };

  const saveEdit = async () => {
    await onUpdateBook(editingId, editForm);
    setEditingId(null);
  };

  const handleAiFill = async (book) => {
    if(!window.confirm(`'${book.title}'의 정보를 AI로 생성하시겠습니까? (카테고리, 태그, 한줄평)`)) return;
    
    setIsGenerating(true);
    const prompt = `
      책 제목: ${book.title}
      저자: ${book.author}
      
      이 책에 대한 정보를 채워줘.
      JSON 형식으로만 답해줘.
      형식:
      {
        "category": "한 단어 카테고리 (예: 소설, 에세이, 경제)",
        "tags": "관련 태그 3개 (콤마로 구분)",
        "oneLineReview": "따뜻하고 공감가는 어조의 100자 이내 한줄 소개"
      }
    `;

    const result = await callGemini(prompt, "You are a helpful librarian AI. Respond ONLY in JSON.");
    
    if (result) {
      await onUpdateBook(book.id, {
        ...book,
        category: result.category || book.category,
        tags: result.tags || book.tags,
        oneLineReview: result.oneLineReview || book.oneLineReview
      });
      alert("✨ AI가 도서 정보를 채웠습니다!");
    } else {
      alert("AI 생성에 실패했습니다. (API 키 확인 필요)");
    }
    setIsGenerating(false);
  };

  const handleImport = () => {
    try {
      const lines = importText.trim().split('\n');
      const newBooks = [];
      
      lines.forEach(line => {
          if(!line.trim()) return;
          let cols = line.split('\t');
          if (cols.length < 2) cols = line.split(',');
          
          const isbn = safeStr(cols[0]);
          const title = safeStr(cols[1]);
          
          if (isbn && title && !title.includes('품목명')) { 
              newBooks.push({
                  isbn, title,
                  publisher: safeStr(cols[2]),
                  author: safeStr(cols[3]),
                  newStock: safeInt(cols[4]),
                  dpStock: safeInt(cols[5]),
                  locationStr: safeStr(cols[7]),
                  price: safeInt(cols[9]),
                  category: '미분류',
                  isNew: false,
                  createdAt: new Date(),
                  coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
              });
          }
      });

      if(newBooks.length > 0) {
          if(window.confirm(`${newBooks.length}권의 도서를 추가하시겠습니까?`)) {
              onBulkImport(newBooks);
              setImportText('');
              setShowImport(false);
          }
      } else {
          alert('인식된 도서가 없습니다. 엑셀에서 데이터를 복사해오세요.');
      }
    } catch(e) {
        alert("오류 발생: " + e.message);
    }
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-7xl mx-auto">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Database className="text-blue-600"/> 전체 도서 대장</h2>
          <p className="text-sm text-gray-500 mt-1">서점 보유 도서 전체 목록 및 ITW_GPR_BOOK 데이터 관리</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowImport(!showImport)} className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-md">
                <Upload size={16}/> 'ITW_GPR_BOOK' 가져오기
            </button>
        </div>
       </div>

       {showImport && (
           <div className="mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-inner animate-fade-in">
               <h3 className="font-bold text-base mb-3 flex items-center gap-2"><FileText size={18}/> 엑셀 데이터 붙여넣기</h3>
               <textarea 
                className="w-full h-40 p-4 text-xs border border-gray-300 rounded-xl mb-4 font-mono focus:ring-2 focus:ring-black outline-none"
                placeholder="ISBN	품목명	출판사	작가	새재고	DP재고	총 재고	매장/지하위치	절판유무	직전 입고 가격..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
               />
               <button onClick={handleImport} className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">데이터 분석 및 저장</button>
           </div>
       )}

       <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                <th className="px-6 py-4 font-bold">ISBN</th>
                <th className="px-6 py-4 font-bold">도서명</th>
                <th className="px-6 py-4 font-bold">저자</th>
                <th className="px-6 py-4 font-bold">정보(카테고리/태그)</th>
                <th className="px-6 py-4 font-bold">위치(엑셀)</th>
                <th className="px-6 py-4 font-bold">재고(DP/새)</th>
                <th className="px-6 py-4 text-right font-bold">관리</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {books.map(book => (
                <tr key={book.id} className="hover:bg-gray-50 transition-colors group">
                    {editingId === book.id ? (
                    <>
                        <td className="px-6 py-3"><input className="border rounded px-2 py-1.5 w-24 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.isbn} onChange={e => setEditForm({...editForm, isbn: e.target.value})} /></td>
                        <td className="px-6 py-3"><input className="border rounded px-2 py-1.5 w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /></td>
                        <td className="px-6 py-3"><input className="border rounded px-2 py-1.5 w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.author} onChange={e => setEditForm({...editForm, author: e.target.value})} /></td>
                        <td className="px-6 py-3 text-xs space-y-1">
                            <input className="border rounded px-2 py-1.5 w-full bg-white" placeholder="카테고리" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} />
                            <input className="border rounded px-2 py-1.5 w-full bg-white" placeholder="태그" value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} />
                        </td>
                        <td className="px-6 py-3"><input className="border rounded px-2 py-1.5 w-24 bg-white" value={editForm.locationStr} onChange={e => setEditForm({...editForm, locationStr: e.target.value})} /></td>
                        <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                                <input className="border rounded px-1 py-1 w-10 text-center" value={editForm.dpStock} onChange={e => setEditForm({...editForm, dpStock: e.target.value})} />
                                <span className="text-gray-400">/</span>
                                <input className="border rounded px-1 py-1 w-10 text-center" value={editForm.newStock} onChange={e => setEditForm({...editForm, newStock: e.target.value})} />
                            </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={saveEdit} className="text-green-600 bg-green-50 p-2 rounded hover:bg-green-100 transition-colors"><Save size={16}/></button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 bg-gray-50 p-2 rounded hover:bg-gray-100 transition-colors"><XCircle size={16}/></button>
                        </div>
                        </td>
                    </>
                    ) : (
                    <>
                        <td className="px-6 py-4 font-mono text-gray-500 text-xs">{book.isbn}</td>
                        <td className="px-6 py-4 font-medium text-gray-900 text-ellipsis overflow-hidden max-w-[200px]">{book.title}</td>
                        <td className="px-6 py-4 text-gray-500 text-ellipsis overflow-hidden max-w-[100px] text-xs">{book.author}</td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5 max-w-[200px]">
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 w-fit px-2 py-0.5 rounded-full">{book.category}</span>
                                <span className="text-[10px] text-gray-400 truncate">{book.tags}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-bold text-xs">{book.locationStr || '-'}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                            <span className="font-bold text-black">{book.dpStock || 0}</span> / {book.newStock || 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleAiFill(book)} 
                                disabled={isGenerating}
                                className="text-purple-600 hover:text-purple-800 bg-purple-50 p-2 rounded-lg hover:bg-purple-100 transition-colors"
                                title="AI 정보 생성 (태그, 소개)"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                            </button>
                            <button onClick={() => startEdit(book)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg hover:bg-blue-100 transition-colors"><Edit2 size={16}/></button>
                            <button onClick={() => { if(window.confirm('정말 삭제하시겠습니까?')) onDeleteBook(book.id); }} className="text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={16}/></button>
                        </div>
                        </td>
                    </>
                    )}
                </tr>
                ))}
            </tbody>
            </table>
         </div>
         {books.length === 0 && <div className="p-12 text-center text-gray-400">데이터가 없습니다.</div>}
       </div>
    </div>
  )
}

// 7. NEW: AI Curation Component
const AiCuration = ({ books, onClickBook }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const handleRecommend = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setRecommendations([]);

    const bookListContext = books.slice(0, 100).map(b => `${b.id}: ${b.title} (${b.author})`).join('\n');
    
    const prompt = `
      사용자 질문: "${query}"
      
      아래는 도서관이 보유한 책 목록이야:
      ${bookListContext}
      
      이 목록 중에서 사용자의 질문이나 기분에 가장 잘 어울리는 책 3권을 골라줘.
      JSON 형식으로만 답해줘.
      형식:
      [
        { "id": "책ID", "reason": "추천 이유(친절하게)" },
        ...
      ]
    `;

    const result = await callGemini(prompt, "You are a warm and knowledgeable librarian.");
    
    if (result && Array.isArray(result)) {
      const recs = result.map(r => {
        const book = books.find(b => b.id === r.id);
        return book ? { ...book, reason: r.reason } : null;
      }).filter(Boolean);
      setRecommendations(recs);
    } else {
      alert("적절한 추천을 찾지 못했어요. API 키를 확인해주세요!");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-6xl mx-auto">
        <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4 flex items-center justify-center gap-3">
                <Sparkles className="text-yellow-400 fill-yellow-400" size={32} /> AI 사서의 맞춤 추천
            </h2>
            <p className="text-gray-500 text-lg">당신의 기분이나 상황을 말씀해주시면, 서가에 있는 책 중에서 골라드릴게요.</p>
        </div>

        <div className="max-w-2xl mx-auto mb-16 relative">
            <div className="flex gap-2 relative group">
                <input 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRecommend()}
                    placeholder="예: 우울할 때 읽기 좋은 따뜻한 소설 추천해줘, 혹은 여행 가고 싶어"
                    className="w-full pl-8 pr-16 py-5 rounded-full bg-white border-2 border-gray-100 focus:border-black focus:shadow-lg transition-all text-lg outline-none placeholder:text-gray-400"
                />
                <button 
                    onClick={handleRecommend}
                    disabled={loading}
                    className="absolute right-2 top-2 bottom-2 bg-black text-white px-6 rounded-full font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center justify-center aspect-square"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <ArrowRight size={24}/>}
                </button>
            </div>
            
            {/* Quick Chips */}
            <div className="flex gap-3 mt-6 justify-center flex-wrap">
                {['마음이 복잡할 때', '여름 휴가에 가져갈 책', '추리 소설 추천해줘', '성공하고 싶어'].map(q => (
                    <button key={q} onClick={() => { setQuery(q); }} className="text-sm bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-full border border-gray-200 transition-colors text-gray-600 hover:text-black hover:border-gray-300">
                        {q}
                    </button>
                ))}
            </div>
        </div>

        {recommendations.length > 0 && (
            <div className="animate-fade-in">
                <h3 className="font-bold text-xl mb-8 text-center flex items-center justify-center gap-2">
                    <span className="w-8 h-[1px] bg-gray-300"></span>
                    사서의 추천 리스트
                    <span className="w-8 h-[1px] bg-gray-300"></span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {recommendations.map(book => (
                        <div key={book.id} className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                            <BookCard book={book} onClick={onClickBook} reason={book.reason} />
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};


// --- Main Application ---
export default function LibraryApp() {
  const [user, setUser] = useState(null);
  const [userMode, setUserMode] = useState('customer');
  const [activeTab, setActiveTab] = useState('home');
  const [books, setBooks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [comments, setComments] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Safe Mode Initialization
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    if (!auth) {
        console.error("Auth not initialized");
        return;
    }
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
        setIsFirebaseReady(true);
      } catch (e) {
        console.error("Auth failed:", e);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const booksQ = collection(db, 'artifacts', appId, 'public', 'data', 'books');
    const ordersQ = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const commentsQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), orderBy('createdAt', 'desc'));
    
    const unsubBooks = onSnapshot(booksQ, (snapshot) => setBooks(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error("Books Error:", e));
    const unsubOrders = onSnapshot(ordersQ, (snapshot) => setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error("Orders Error:", e));
    const unsubComments = onSnapshot(commentsQ, (snapshot) => setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error("Comments Error:", e));

    return () => { unsubBooks(); unsubOrders(); unsubComments(); };
  }, [user]);

  const handleMoveBook = async (bookId, newLoc, targetBook) => {
    if (!user || !db) return;
    const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
    await updateDoc(doc(booksRef, bookId), { location: newLoc });
    if (targetBook) {
        const draggedBook = books.find(b => b.id === bookId);
        await updateDoc(doc(booksRef, targetBook.id), { location: draggedBook?.location || null });
    }
  };

  const handleBulkOrder = async (newOrders) => {
      if (!user || !db) return;
      const batch = writeBatch(db);
      const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
      newOrders.forEach(order => batch.set(doc(ordersRef), { ...order, userId: user.uid }));
      await batch.commit();
  };

  const handleReceiveBook = async (order) => {
    if (!user || !db) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'books'), {
      title: order.title,
      isbn: order.isbn,
      author: order.author || 'Unknown', 
      isNew: true,
      category: '미분류',
      coverUrl: `https://covers.openlibrary.org/b/isbn/${order.isbn}-M.jpg`, 
      location: null,
      locationStr: '',
      createdAt: serverTimestamp(),
      newStock: order.quantity,
      dpStock: 0
    });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'received' });
  };

  const handleBulkImportBooks = async (newBooks) => {
      if(!user || !db) return;
      const batch = writeBatch(db);
      const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
      newBooks.slice(0, 450).forEach(book => batch.set(doc(booksRef), book));
      await batch.commit();
      if(newBooks.length > 450) alert('한 번에 450권까지만 저장됩니다.');
  };

  const handleAddComment = async (bookId, text) => {
    if (!user || !db) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), {
      bookId, text, createdAt: serverTimestamp(), userId: user.uid
    });
  };

  const handleUpdateBook = async (bookId, newData) => {
    if(!user || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', bookId), newData);
  };

  const handleDeleteBook = async (bookId) => {
    if(!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', bookId));
  }

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books;
    return books.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [books, searchTerm]);

  // Loading State
  if (!isFirebaseReady && !user) {
      return <div className="h-screen flex items-center justify-center text-gray-400 flex-col gap-4">
        <Loader2 className="animate-spin text-black" size={32}/>
        <p className="text-sm">도서관 문을 열고 있습니다...</p>
      </div>
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} userMode={userMode} setUserMode={setUserMode} />
      <main className="max-w-screen-xl mx-auto min-h-[calc(100vh-60px)]">
        {activeTab === 'home' && (
          <div className="p-4 md:p-8 space-y-16 animate-fade-in">
            <section className="text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-[3rem]">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 font-serif tracking-tight">오늘의 발견, <br/><span className="text-blue-600">당신의 서재</span></h1>
              <p className="text-gray-500 mb-10 text-lg">취향에 맞는 책을 찾아보고 서가 위치를 확인하세요.</p>
              <button onClick={() => setActiveTab('search')} className="bg-black text-white px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform hover:shadow-lg text-lg">
                도서 검색하기
              </button>
            </section>
            <section>
              <div className="flex items-end justify-between mb-8 px-2">
                <h2 className="text-2xl md:text-3xl font-bold font-serif">오늘의 신간</h2>
                <span className="text-sm text-gray-400 hover:text-black cursor-pointer underline underline-offset-4">전체보기</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-12">
                {books.filter(b => b.isNew).slice(0, 12).map(book => <BookCard key={book.id} book={book} onClick={setSelectedBook} />)}
                {books.length === 0 && <div className="col-span-full py-20 text-center text-gray-300">등록된 도서가 없습니다.</div>}
              </div>
            </section>
          </div>
        )}
        {activeTab === 'search' && (
          <div className="p-4 md:p-8 animate-fade-in">
            <div className="relative max-w-2xl mx-auto mb-16 mt-8">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24}/>
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="검색어를 입력하세요 (제목, 저자)" className="w-full pl-16 pr-6 py-5 rounded-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black transition-all text-xl shadow-sm outline-none" autoFocus/>
            </div>
            {searchTerm && <p className="mb-6 text-gray-500 font-bold px-2">'{searchTerm}' 검색 결과 ({filteredBooks.length})</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12">
              {filteredBooks.map(book => <BookCard key={book.id} book={book} onClick={setSelectedBook} />)}
            </div>
            {filteredBooks.length === 0 && searchTerm && (
                <div className="text-center py-20 text-gray-400">검색 결과가 없습니다.</div>
            )}
          </div>
        )}
        {activeTab === 'curation' && (
            <AiCuration books={books} onClickBook={setSelectedBook} />
        )}
        {activeTab === 'admin-map' && <AdminMap books={books} onMoveBook={handleMoveBook} />}
        {activeTab === 'admin-inventory' && <AdminInventory orders={orders} onBulkOrder={handleBulkOrder} onReceive={handleReceiveBook} />}
        {activeTab === 'admin-database' && <AdminDatabase books={books} onUpdateBook={handleUpdateBook} onDeleteBook={handleDeleteBook} onBulkImport={handleBulkImportBooks} />}
      </main>
      {selectedBook && <BookDetail book={selectedBook} comments={comments.filter(c => c.bookId === selectedBook.id)} onClose={() => setSelectedBook(null)} onAddComment={handleAddComment} />}
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}
