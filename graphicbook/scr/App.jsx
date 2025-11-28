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
  Search, Map, BookOpen, ShoppingCart, 
  ArrowRight, User, Star, MoreHorizontal, 
  Package, CheckCircle, XCircle,
  Inbox, Database, Trash2, Edit2, Save, Download, Upload, FileText,
  AlertCircle, Sparkles, Loader2, AlertTriangle
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

// 앱 ID 설정 (데이터 분리용)
const appId = 'graphicbook-v1';

// Firebase 초기화 (안전 장치 추가)
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase 초기화 실패:", e);
}

// --- Gemini API Helper (배포용 키 필요) ---
// 주의: Vercel에 배포할 때는 API 키를 코드에 직접 넣거나 환경 변수로 설정해야 작동합니다.
// 지금은 키가 없어도 앱이 죽지 않도록 예외처리했습니다.
const callGemini = async (prompt, systemInstruction = "") => {
  const apiKey = ""; // 여기에 Gemini API 키를 넣으면 AI 기능이 작동합니다.
  
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
  <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm h-16">
    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
      <div className="bg-black text-white p-1.5 rounded-md font-bold text-xl font-serif">P</div>
      <span className="font-serif text-xl font-bold tracking-tight hidden md:block">Paperr.lib</span>
    </div>
    
    <div className="flex gap-2 md:gap-6 text-sm font-medium overflow-x-auto no-scrollbar">
      {userMode === 'customer' ? (
        <>
          <button onClick={() => setActiveTab('home')} className={`${activeTab === 'home' ? 'text-black font-bold' : 'text-gray-400'} whitespace-nowrap transition-colors`}>홈</button>
          <button onClick={() => setActiveTab('search')} className={`${activeTab === 'search' ? 'text-black font-bold' : 'text-gray-400'} whitespace-nowrap transition-colors`}>검색</button>
          <button onClick={() => setActiveTab('curation')} className={`${activeTab === 'curation' ? 'text-black font-bold' : 'text-gray-400'} whitespace-nowrap transition-colors flex items-center gap-1`}>
            {activeTab === 'curation' && <Sparkles size={12} className="text-yellow-500 animate-pulse"/>} 큐레이션
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setActiveTab('admin-map')} className={`${activeTab === 'admin-map' ? 'text-blue-600 font-bold' : 'text-gray-400'} whitespace-nowrap transition-colors flex items-center gap-1`}><Map size={14}/>서가관리</button>
          <button onClick={() => setActiveTab('admin-inventory')} className={`${activeTab === 'admin-inventory' ? 'text-blue-600 font-bold' : 'text-gray-400'} whitespace-nowrap transition-colors flex items-center gap-1`}><Package size={14}/>입출고</button>
          <button onClick={() => setActiveTab('admin-database')} className={`${activeTab === 'admin-database' ? 'text-blue-600 font-bold' : 'text-gray-400'} whitespace-nowrap transition-colors flex items-center gap-1`}><Database size={14}/>도서대장</button>
        </>
      )}
    </div>

    <button 
      onClick={() => {
        const newMode = userMode === 'customer' ? 'admin' : 'customer';
        setUserMode(newMode);
        setActiveTab(newMode === 'customer' ? 'home' : 'admin-map');
      }}
      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${userMode === 'customer' ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-blue-600 text-white shadow-md'}`}
    >
      {userMode === 'customer' ? '직원용 전환' : '고객용 전환'}
    </button>
  </nav>
);

// 2. Book Card
const BookCard = ({ book, onClick, reason }) => (
  <div onClick={() => onClick(book)} className="group cursor-pointer flex flex-col gap-2">
    <div className="aspect-[2/3] w-full bg-gray-100 rounded-lg overflow-hidden relative shadow-sm transition-all group-hover:shadow-md border border-gray-100 bg-gray-50">
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
      ) : null}
      <div className={`absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-300 ${book.coverUrl ? 'hidden' : ''}`}>
          <BookOpen size={32} />
      </div>
      
      {book.isNew && (
        <span className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          NEW
        </span>
      )}
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md shadow-sm">
        {book.locationStr || (book.location ? `${book.location.section}-${book.location.row}-${book.location.col}` : '위치미정')}
      </div>
    </div>
    <div>
      <h3 className="font-bold text-gray-900 leading-tight line-clamp-1 text-sm">{book.title}</h3>
      <p className="text-xs text-gray-500 line-clamp-1">{book.author}</p>
      {reason && (
        <div className="mt-2 bg-blue-50 p-2 rounded text-[11px] text-blue-800 leading-snug flex gap-1 items-start">
            <Sparkles size={10} className="shrink-0 mt-0.5 text-blue-500"/>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
          <h2 className="font-bold text-lg truncate pr-4">도서 상세 정보</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><XCircle size={20} className="text-gray-400"/></button>
        </div>

        <div className="overflow-y-auto p-0 pb-6 flex-1">
          {/* Book Info */}
          <div className="p-6 flex gap-6">
            <div className="w-1/3 aspect-[2/3] bg-gray-100 rounded-lg shadow-md overflow-hidden shrink-0">
               {book.coverUrl ? <img src={book.coverUrl} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="text-gray-300"/></div>}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <span className="text-xs font-bold text-blue-600 mb-1 block">{book.category || '일반'}</span>
                <h1 className="text-xl font-bold leading-tight mb-1">{book.title}</h1>
                <p className="text-sm text-gray-500">{book.author}</p>
                <p className="text-xs text-gray-400">{book.publisher} | {book.isbn}</p>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <Map size={18} className="text-gray-400"/>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">서가 위치</p>
                  <p className="text-sm font-bold text-gray-900">
                    {book.locationStr || (book.location ? 
                      `Section ${book.location.section} / 행 ${book.location.row} / 열 ${book.location.col}` 
                      : '입고 대기중')}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-6">
                    {book.oneLineReview || book.description || '책 소개글이 없습니다.'}
                </p>
                {book.tags && (
                    <div className="mt-3 flex flex-wrap gap-1">
                        {book.tags.split(',').map((tag, i) => (
                            <span key={i} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">#{tag.trim()}</span>
                        ))}
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="px-6 mt-4">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              독자 한마디 <span className="text-gray-400 text-sm font-normal">{comments?.length || 0}</span>
            </h3>
            
            <div className="space-y-4 mb-6">
              {comments && comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-700">익명의 독자</span>
                      <span className="text-xs text-gray-400">{c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : '방금 전'}</span>
                    </div>
                    <p className="text-gray-600">{c.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4 text-sm">첫 번째 코멘트를 남겨보세요!</p>
              )}
            </div>

            <div className="flex gap-2">
              <input 
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="이 책은 어땠나요?"
                className="flex-1 bg-gray-50 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-black"
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
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold shrink-0"
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      <div className="w-full lg:w-64 bg-white border-r border-gray-200 p-4 flex flex-col h-1/3 lg:h-full overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Inbox size={18}/> 미배치 도서 ({getUnplacedBooks().length})
        </h3>
        <p className="text-xs text-gray-500 mb-4">엑셀로 등록된 도서를 지도에 배치하세요.</p>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {getUnplacedBooks().map(book => (
            <div 
              key={book.id}
              draggable
              onDragStart={() => setDraggedBook(book)}
              className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm cursor-move hover:border-blue-500 hover:shadow-md transition-all flex gap-3 items-center group"
            >
              <div className="w-10 h-14 bg-gray-100 rounded shrink-0 overflow-hidden">
                {book.coverUrl ? <img src={book.coverUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-gray-200"/>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate group-hover:text-blue-600">{book.title}</p>
                <p className="text-xs text-gray-500 truncate">{book.locationStr ? `현위치: ${book.locationStr}` : '위치없음'}</p>
              </div>
            </div>
          ))}
          {getUnplacedBooks().length === 0 && (
            <div className="text-center py-10 text-gray-300 text-sm">대기 중인 도서가 없습니다.</div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">도서 위치 관리 시스템</h2>
            <p className="text-sm text-gray-500 hidden md:block">책을 드래그하여 서가(Grid)에 배치하세요.</p>
          </div>
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            {sections.map(s => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeSection === s ? 'bg-black text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Section {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <div className="inline-grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(80px, 1fr))` }}>
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
                        aspect-[3/4] rounded-lg border-2 border-dashed transition-all relative group
                        ${book ? 'border-transparent bg-white shadow-sm hover:shadow-md' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}
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
                            className="w-full h-full object-cover rounded shadow-sm pointer-events-none" 
                            alt="book"
                          /> : <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">No Image</div>}
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded"/>
                          <div className="absolute bottom-1 left-1 right-1 bg-white/90 text-[8px] p-1 rounded text-center truncate font-bold shadow-sm">
                            {book.title}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                          <span className="text-[10px] font-mono">{rIndex+1}-{cIndex+1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-4 text-center border-t-2 border-gray-200 pt-2">
            <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Section {activeSection} Floor</span>
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex gap-4 mb-8 border-b border-gray-200 pb-1 items-center justify-between">
        <div className="flex gap-4">
            <button onClick={() => setView('bulk')} className={`pb-3 text-sm font-bold ${view === 'bulk' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>대량 입력 (엑셀)</button>
            <button onClick={() => setView('list')} className={`pb-3 text-sm font-bold ${view === 'list' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>입출고 현황 ({orders.length})</button>
        </div>
        <button onClick={downloadCSV} className="text-xs flex items-center gap-1 text-green-600 hover:text-green-800 font-bold mb-2">
            <Download size={14}/> 회계팀 전달용 다운로드
        </button>
      </div>

      {view === 'bulk' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in">
          <div className="flex items-start gap-4 mb-4">
             <div className="bg-green-100 p-2 rounded-full text-green-600"><FileText size={24}/></div>
             <div>
                 <h3 className="font-bold text-lg">엑셀 데이터 붙여넣기</h3>
                 <p className="text-sm text-gray-500">'판매/구입 입력' 시트의 데이터를 복사(Ctrl+C)해서 아래에 붙여넣기(Ctrl+V)하세요.</p>
                 <p className="text-xs text-gray-400 mt-1">순서: 구분 | 일자 | ISBN | 상품명 | 수량 | 구매처 | 발주용도 | 가격</p>
             </div>
          </div>
          
          <textarea 
            className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-black focus:outline-none"
            placeholder={`예시:\n구입	2024-11-21	9788954685306	연옥당 2	1	북센	도서 추가	14700\n구입	2024-11-21	9791196155711	연의 편지	1	손봄북스	도서 추가	10500`}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
          />
          <button onClick={handleBulkPaste} className="mt-4 w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
            <Upload size={18}/> 데이터 처리 및 저장
          </button>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-3 animate-fade-in">
          {[...orders].reverse().map(order => (
            <div key={order.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${order.status === 'received' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {order.status === 'received' ? '입고완료' : '발주중'}
                    </span>
                    <span className="text-xs text-gray-400">{order.date}</span>
                </div>
                <h4 className="font-bold text-gray-900">{order.title}</h4>
                <p className="text-xs text-gray-500 font-mono mt-1">
                    {order.isbn} | {order.quantity}권 | {order.price ? order.price.toLocaleString() : 0}원 | {order.source}
                </p>
              </div>
              {order.status === 'pending' && (
                <button 
                    onClick={() => onReceive(order)}
                    className="bg-blue-600 text-white text-xs px-3 py-2 rounded-md font-bold hover:bg-blue-700 flex items-center gap-1"
                >
                    <CheckCircle size={14}/> 입고확인
                </button>
              )}
            </div>
          ))}
          {orders.length === 0 && (
            <p className="text-center text-gray-400 py-10">내역이 없습니다.</p>
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
      alert("AI 생성에 실패했습니다. 다시 시도해주세요.");
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
    <div className="p-4 md:p-8 animate-fade-in">
       <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">전체 도서 대장 (DB 관리)</h2>
          <p className="text-sm text-gray-500">서점 보유 도서 전체 목록 및 ITW_GPR_BOOK 가져오기</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowImport(!showImport)} className="bg-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                <Upload size={14}/> 'ITW_GPR_BOOK' 시트 가져오기
            </button>
        </div>
       </div>

       {showImport && (
           <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
               <h3 className="font-bold text-sm mb-2">데이터 붙여넣기</h3>
               <textarea 
                className="w-full h-40 p-2 text-xs border rounded mb-2 font-mono"
                placeholder="ISBN	품목명	출판사	작가	새재고	DP재고	총 재고	매장/지하위치	절판유무	직전 입고 가격..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
               />
               <button onClick={handleImport} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">가져오기 실행</button>
           </div>
       )}

       <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
         <table className="w-full text-sm text-left whitespace-nowrap">
           <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
             <tr>
               <th className="px-6 py-3">ISBN</th>
               <th className="px-6 py-3">도서명</th>
               <th className="px-6 py-3">저자</th>
               <th className="px-6 py-3">카테고리/태그/설명</th>
               <th className="px-6 py-3">위치(엑셀)</th>
               <th className="px-6 py-3">재고(DP/새)</th>
               <th className="px-6 py-3 text-right">관리</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {books.map(book => (
               <tr key={book.id} className="hover:bg-gray-50">
                 {editingId === book.id ? (
                   <>
                     <td className="px-6 py-3"><input className="border rounded px-2 py-1 w-24" value={editForm.isbn} onChange={e => setEditForm({...editForm, isbn: e.target.value})} /></td>
                     <td className="px-6 py-3"><input className="border rounded px-2 py-1 w-full" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /></td>
                     <td className="px-6 py-3"><input className="border rounded px-2 py-1 w-full" value={editForm.author} onChange={e => setEditForm({...editForm, author: e.target.value})} /></td>
                     <td className="px-6 py-3 text-xs">
                        <input className="border rounded px-2 py-1 w-full mb-1" placeholder="카테고리" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} />
                        <input className="border rounded px-2 py-1 w-full" placeholder="태그" value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} />
                     </td>
                     <td className="px-6 py-3"><input className="border rounded px-2 py-1 w-24" value={editForm.locationStr} onChange={e => setEditForm({...editForm, locationStr: e.target.value})} /></td>
                     <td className="px-6 py-3">
                         <input className="border rounded px-1 py-1 w-10" value={editForm.dpStock} onChange={e => setEditForm({...editForm, dpStock: e.target.value})} /> / 
                         <input className="border rounded px-1 py-1 w-10" value={editForm.newStock} onChange={e => setEditForm({...editForm, newStock: e.target.value})} />
                     </td>
                     <td className="px-6 py-3 text-right">
                       <button onClick={saveEdit} className="text-green-600 hover:text-green-800 mr-2"><Save size={16}/></button>
                       <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={16}/></button>
                     </td>
                   </>
                 ) : (
                   <>
                     <td className="px-6 py-3 font-mono text-gray-500">{book.isbn}</td>
                     <td className="px-6 py-3 font-medium text-gray-900 text-ellipsis overflow-hidden max-w-[150px]">{book.title}</td>
                     <td className="px-6 py-3 text-gray-500 text-ellipsis overflow-hidden max-w-[80px]">{book.author}</td>
                     <td className="px-6 py-3">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                            <span className="text-xs bg-gray-100 w-fit px-1 rounded">{book.category}</span>
                            <span className="text-[10px] text-gray-400 truncate">{book.tags}</span>
                            <span className="text-[10px] text-gray-400 truncate">{book.oneLineReview}</span>
                        </div>
                     </td>
                     <td className="px-6 py-3 text-blue-600 font-bold">{book.locationStr || '-'}</td>
                     <td className="px-6 py-3 text-gray-500">{book.dpStock || 0} / {book.newStock || 0}</td>
                     <td className="px-6 py-3 text-right flex justify-end gap-2 items-center">
                       <button 
                        onClick={() => handleAiFill(book)} 
                        disabled={isGenerating}
                        className="text-purple-600 hover:text-purple-800 bg-purple-50 p-1.5 rounded-full hover:bg-purple-100 transition-colors"
                        title="AI 정보 생성 (태그, 소개)"
                       >
                         {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                       </button>
                       <button onClick={() => startEdit(book)} className="text-blue-600 hover:text-blue-800 p-1.5"><Edit2 size={16}/></button>
                       <button onClick={() => { if(window.confirm('정말 삭제하시겠습니까?')) onDeleteBook(book.id); }} className="text-red-400 hover:text-red-600 p-1.5"><Trash2 size={16}/></button>
                     </td>
                   </>
                 )}
               </tr>
             ))}
           </tbody>
         </table>
         {books.length === 0 && <div className="p-8 text-center text-gray-400">데이터가 없습니다.</div>}
       </div>
    </div>
  )
}

// 7. AI Curation Component
const AiCuration = ({ books, onClickBook }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const handleRecommend = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setRecommendations([]);

    // Context Optimization
    const bookListContext = books.slice(0, 100).map(b => `${b.id}: ${b.title} (${b.author})`).join('\n');
    
    const prompt = `
      사용자 질문: "${query}"
      
      아래는 도서관이 보유한 책 목록이야 (일부):
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
      alert("적절한 추천을 찾지 못했어요. 질문을 조금 더 구체적으로 해주세요!");
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in">
        <h2 className="text-3xl font-bold font-serif mb-2 flex items-center gap-2">
            <Sparkles className="text-yellow-500" /> AI 사서의 맞춤 추천
        </h2>
        <p className="text-gray-500 mb-8">기분이나 상황을 말씀해주시면, 서가에 있는 책 중에서 골라드릴게요.</p>

        <div className="max-w-2xl mx-auto mb-12">
            <div className="flex gap-2 relative">
                <input 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRecommend()}
                    placeholder="예: 우울할 때 읽기 좋은 따뜻한 소설 추천해줘"
                    className="w-full pl-6 pr-14 py-4 rounded-full bg-gray-100 border-2 border-transparent focus:border-black focus:bg-white transition-all text-lg shadow-sm"
                />
                <button 
                    onClick={handleRecommend}
                    disabled={loading}
                    className="absolute right-2 top-2 bottom-2 bg-black text-white px-6 rounded-full font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <ArrowRight />}
                </button>
            </div>
            
            <div className="flex gap-2 mt-4 justify-center flex-wrap">
                {['마음이 복잡할 때', '여름 휴가에 가져갈 책', '추리 소설 추천해줘', '성공하고 싶어'].map(q => (
                    <button key={q} onClick={() => { setQuery(q); }} className="text-xs bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 transition-colors">
                        {q}
                    </button>
                ))}
            </div>
        </div>

        {recommendations.length > 0 && (
            <div className="animate-fade-in">
                <h3 className="font-bold text-lg mb-6 text-center">사서의 추천 리스트</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recommendations.map(book => (
                        <div key={book.id} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
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
      return <div className="h-screen flex items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} userMode={userMode} setUserMode={setUserMode} />
      <main className="max-w-screen-xl mx-auto min-h-[calc(100vh-60px)]">
        {activeTab === 'home' && (
          <div className="p-4 md:p-8 space-y-12 animate-fade-in">
            <section className="text-center py-12 bg-gray-50 rounded-3xl">
              <h1 className="text-3xl md:text-5xl font-bold mb-4 font-serif">오늘의 발견, <br/>당신의 서재</h1>
              <p className="text-gray-500 mb-8">취향에 맞는 책을 찾아보고 서가 위치를 확인하세요.</p>
              <button onClick={() => setActiveTab('search')} className="bg-black text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform">
                도서 검색하기
              </button>
            </section>
            <section>
              <h2 className="text-2xl font-bold font-serif mb-6">오늘의 신간</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
                {books.filter(b => b.isNew).slice(0, 12).map(book => <BookCard key={book.id} book={book} onClick={setSelectedBook} />)}
              </div>
            </section>
          </div>
        )}
        {activeTab === 'search' && (
          <div className="p-4 md:p-8 animate-fade-in">
            <div className="relative max-w-2xl mx-auto mb-10">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="검색어를 입력하세요..." className="w-full pl-12 pr-4 py-4 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-black text-lg" autoFocus/>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
              {filteredBooks.map(book => <BookCard key={book.id} book={book} onClick={setSelectedBook} />)}
            </div>
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
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
