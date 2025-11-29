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
  Inbox, Database, Trash2, Edit2, Save, AlertCircle, Loader2
} from 'lucide-react';

// --- Firebase Configuration (Vercel 배포용 자동 설정) ---
const firebaseConfig = {
  apiKey: "AIzaSyB7eQzfz9leVWjs23VJ9uFMAIaB_YXQq68",
  authDomain: "graphic-d473d.firebaseapp.com",
  projectId: "graphic-d473d",
  storageBucket: "graphic-d473d.firebasestorage.app",
  messagingSenderId: "482443735322",
  appId: "1:482443735322:web:42d7434776c5a4ef797ca3",
  measurementId: "G-KVM210Y5HP"
};

// 앱 ID
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

// --- Components ---

// 1. Navbar (디자인 개선)
const Navbar = ({ activeTab, setActiveTab, userMode, setUserMode }) => (
  <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm h-16 transition-all">
    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('home')}>
      <div className="bg-black text-white p-1.5 rounded-lg font-bold text-xl font-serif shadow-md">P</div>
      <span className="font-serif text-xl font-bold tracking-tight hidden md:block text-gray-900">Paperr.lib</span>
    </div>
    
    <div className="flex gap-1 md:gap-2 text-sm font-medium bg-gray-100 p-1 rounded-full overflow-hidden">
      {userMode === 'customer' ? (
        <>
          <button onClick={() => setActiveTab('home')} className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'home' ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}>홈</button>
          <button onClick={() => setActiveTab('search')} className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'search' ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}>검색</button>
          <button onClick={() => setActiveTab('curation')} className={`px-4 py-1.5 rounded-full transition-all ${activeTab === 'curation' ? 'bg-white text-black shadow-sm font-bold' : 'text-gray-500 hover:text-gray-900'}`}>큐레이션</button>
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
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${userMode === 'customer' ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50' : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-md'}`}
    >
      {userMode === 'customer' ? '관리자 모드' : '고객 모드'}
    </button>
  </nav>
);

// 2. Book Card (디자인 개선)
const BookCard = ({ book, onClick }) => (
  <div onClick={() => onClick(book)} className="group cursor-pointer flex flex-col gap-3 transition-transform hover:-translate-y-1 duration-300">
    <div className="aspect-[2/3] w-full bg-gray-100 rounded-xl overflow-hidden relative shadow-sm group-hover:shadow-xl transition-all border border-gray-100">
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
          <BookOpen size={32} />
        </div>
      )}
      {book.isNew && (
        <span className="absolute top-2 left-2 bg-black text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
          NEW
        </span>
      )}
      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-gray-900 text-[10px] px-2 py-1 rounded-md font-bold shadow-sm border border-gray-100">
        {book.location ? `${book.location.section}-${book.location.row}-${book.location.col}` : '위치미정'}
      </div>
    </div>
    <div>
      <h3 className="font-bold text-gray-900 leading-tight line-clamp-1 text-sm group-hover:text-blue-600 transition-colors">{book.title}</h3>
      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{book.author}</p>
    </div>
  </div>
);

// 3. Book Detail Modal (디자인 개선)
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
          {/* Book Info */}
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 shrink-0">
               <div className="aspect-[2/3] bg-gray-100 rounded-xl shadow-lg overflow-hidden border border-gray-200">
                 {book.coverUrl ? <img src={book.coverUrl} alt="" className="w-full h-full object-cover"/> : null}
               </div>
            </div>
            <div className="flex-1 space-y-5">
              <div>
                <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded mb-2">{book.category || '일반'}</span>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2 text-gray-900 font-serif">{book.title}</h1>
                <p className="text-sm text-gray-600 font-medium">{book.author}</p>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="bg-white p-2 rounded-full shadow-sm text-blue-600"><Map size={20}/></div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">서가 위치</p>
                  <p className="text-base font-bold text-gray-900">
                    {book.location ? 
                      `Section ${book.location.section} / 행 ${book.location.row} / 열 ${book.location.col}` 
                      : '입고 대기중'}
                  </p>
                </div>
              </div>

              <div className="prose prose-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl">
                {book.description || '책 소개글이 없습니다.'}
              </div>
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

// 4. Admin Map Component (Draggable - 디자인 개선)
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
            <Inbox size={20} className="text-blue-600"/> 진열 대기
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

// 5. Admin Inventory Component (디자인 개선)
const AdminInventory = ({ orders, onOrder, onReceive, onStockOut }) => {
  const [view, setView] = useState('order'); 
  const [form, setForm] = useState({ title: '', isbn: '', quantity: 1, price: 0, purpose: '일반구매', source: '교보문고' });

  const handleSubmitOrder = () => {
    if (!form.title || !form.isbn) return;
    onOrder({ ...form, date: new Date().toISOString().split('T')[0], status: 'pending' });
    setForm({ title: '', isbn: '', quantity: 1, price: 0, purpose: '일반구매', source: '교보문고' });
    alert('발주가 등록되었습니다.');
  };

  const handleStockOut = (isbn, qty) => {
    onStockOut(isbn, qty);
    alert('출고 처리 되었습니다.');
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 mb-8 border-b border-gray-200 pb-1 items-start md:items-center justify-between">
        <div className="flex gap-6">
            <button onClick={() => setView('order')} className={`pb-3 text-sm font-bold transition-all ${view === 'order' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}>도서 발주</button>
            <button onClick={() => setView('list')} className={`pb-3 text-sm font-bold transition-all ${view === 'list' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}>입고 대기 ({orders.filter(o => o.status === 'pending').length})</button>
            <button onClick={() => setView('out')} className={`pb-3 text-sm font-bold transition-all ${view === 'out' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}>출고 관리</button>
        </div>
      </div>

      {view === 'order' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm animate-fade-in">
          <h3 className="font-bold text-xl text-gray-900 mb-6">신규 도서 발주 등록</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input className="input-field" placeholder="도서명" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <input className="input-field" placeholder="ISBN" value={form.isbn} onChange={e => setForm({...form, isbn: e.target.value})} />
            <input 
              className="input-field" 
              type="number" 
              placeholder="수량" 
              value={form.quantity} 
              onChange={e => setForm({...form, quantity: e.target.value === '' ? '' : parseInt(e.target.value)})} 
            />
            <input 
              className="input-field" 
              type="number" 
              placeholder="금액 (원)" 
              value={form.price} 
              onChange={e => setForm({...form, price: e.target.value === '' ? '' : parseInt(e.target.value)})} 
            />
            <input className="input-field" placeholder="구매처" value={form.source} onChange={e => setForm({...form, source: e.target.value})} />
            <div className="relative">
                <select className="input-field appearance-none" value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})}>
                <option>일반구매</option>
                <option>고객요청</option>
                <option>파손교체</option>
                </select>
            </div>
          </div>
          <button onClick={handleSubmitOrder} className="mt-8 w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2">
            <Plus size={18}/> 발주 등록하기
          </button>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-3 animate-fade-in">
          {orders.filter(o => o.status === 'pending').map(order => (
            <div key={order.id} className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">발주중</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">{order.date}</span>
                </div>
                <h4 className="font-bold text-gray-900 text-lg">{order.title}</h4>
                <p className="text-xs text-gray-500 font-mono mt-1">
                    ISBN: {order.isbn} | {order.quantity}권 | {order.source}
                </p>
              </div>
              <button 
                onClick={() => onReceive(order)}
                className="w-full md:w-auto bg-blue-600 text-white text-xs px-4 py-2.5 rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <CheckCircle size={14}/> 입고확인 처리
              </button>
            </div>
          ))}
          {orders.filter(o => o.status === 'pending').length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Package size={40} className="mx-auto text-gray-300 mb-2"/>
                <p className="text-gray-400">대기중인 발주 내역이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {view === 'out' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm animate-fade-in">
          <h3 className="font-bold text-xl text-gray-900 mb-2 flex items-center gap-2"><LogOut className="text-red-500"/> 도서 출고(폐기/판매)</h3>
          <p className="text-sm text-gray-500 mb-6">출고 처리 시 전체 도서 리스트에서 즉시 삭제됩니다.</p>
          <div className="flex gap-2">
            <input id="out-isbn" className="input-field flex-1" placeholder="출고할 도서 ISBN 입력" />
            <button 
              onClick={() => handleStockOut(document.getElementById('out-isbn').value, 1)}
              className="bg-red-50 text-red-600 font-bold px-6 py-3 rounded-xl border border-red-100 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              출고처리
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 6. Admin Database (Table View - 디자인 개선)
const AdminDatabase = ({ books, onUpdateBook, onDeleteBook }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (book) => {
    setEditingId(book.id);
    setEditForm({ ...book });
  };

  const saveEdit = async () => {
    await onUpdateBook(editingId, editForm);
    setEditingId(null);
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-7xl mx-auto">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Database className="text-blue-600"/> 전체 도서 대장</h2>
          <p className="text-sm text-gray-500 mt-1">데이터베이스의 모든 도서를 엑셀처럼 관리하세요.</p>
        </div>
        <div className="text-xs text-gray-500 font-mono bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
          Total Records: {books.length}
        </div>
       </div>

       <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                <th className="px-6 py-4 font-bold">도서명</th>
                <th className="px-6 py-4 font-bold">ISBN</th>
                <th className="px-6 py-4 font-bold">저자</th>
                <th className="px-6 py-4 font-bold">카테고리</th>
                <th className="px-6 py-4 font-bold">위치</th>
                <th className="px-6 py-4 text-right font-bold">관리</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {books.map(book => (
                <tr key={book.id} className="hover:bg-gray-50 transition-colors group">
                    {editingId === book.id ? (
                    <>
                        <td className="px-6 py-3"><input className="border rounded px-2 py-1.5 w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /></td>
                        <td className="px-6 py-3"><input className="border rounded px-2 py-1.5 w-24 bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.isbn} onChange={e => setEditForm({...editForm, isbn: e.target.value})} /></td>
                        <td className="px-6 py-3"><input className="border rounded px-2 py-1.5 w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={editForm.author} onChange={e => setEditForm({...editForm, author: e.target.value})} /></td>
                        <td className="px-6 py-3"><input className="border rounded px-2 py-1.5 w-24 bg-white" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} /></td>
                        <td className="px-6 py-3 text-gray-400 italic text-xs">지도에서 수정</td>
                        <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={saveEdit} className="text-green-600 bg-green-50 p-2 rounded hover:bg-green-100 transition-colors"><Save size={16}/></button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 bg-gray-50 p-2 rounded hover:bg-gray-100 transition-colors"><XCircle size={16}/></button>
                        </div>
                        </td>
                    </>
                    ) : (
                    <>
                        <td className="px-6 py-4 font-medium text-gray-900 text-ellipsis overflow-hidden max-w-[200px]">
                            {book.title} {book.isNew && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full ml-1">NEW</span>}
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-500 text-xs">{book.isbn}</td>
                        <td className="px-6 py-4 text-gray-500 text-ellipsis overflow-hidden max-w-[100px] text-xs">{book.author}</td>
                        <td className="px-6 py-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">{book.category || '미분류'}</span></td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                            {book.location ? <span className="font-bold text-black">{book.location.section}-{book.location.row}-{book.location.col}</span> : <span className="text-red-400">미배치</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
         {books.length === 0 && <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <Database size={32} className="text-gray-300"/>
            데이터가 없습니다.
         </div>}
       </div>
    </div>
  )
}

// --- Main Application Component ---
export default function LibraryApp() {
  const [user, setUser] = useState(null);
  const [userMode, setUserMode] = useState('customer'); // 'customer' | 'admin'
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'search', 'curation', 'admin-map', 'admin-inventory', 'admin-database'
  
  // Data States
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

  // 2. Data Fetching
  useEffect(() => {
    if (!user || !db) return;
    
    // Books Listener
    const booksQ = collection(db, 'artifacts', appId, 'public', 'data', 'books');
    const unsubBooks = onSnapshot(booksQ, (snapshot) => {
      setBooks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Books error", err));

    // Orders Listener (Admin)
    const ordersQ = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubOrders = onSnapshot(ordersQ, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Orders error", err));

    // Comments Listener
    const commentsQ = query(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), orderBy('createdAt', 'desc'));
    const unsubComments = onSnapshot(commentsQ, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Comments error", err));

    return () => { unsubBooks(); unsubOrders(); unsubComments(); };
  }, [user]);

  // --- Actions ---

  const handleMoveBook = async (bookId, newLoc, targetBook) => {
    if (!user || !db) return;
    const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
    
    await updateDoc(doc(booksRef, bookId), { location: newLoc });
    
    if (targetBook) {
        const draggedBook = books.find(b => b.id === bookId);
        if (draggedBook && draggedBook.location) {
             await updateDoc(doc(booksRef, targetBook.id), { location: draggedBook.location });
        } else {
             await updateDoc(doc(booksRef, targetBook.id), { location: null });
        }
    }
  };

  const handleOrderBook = async (orderData) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderData);
  };

  const handleReceiveBook = async (order) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'books'), {
      title: order.title,
      isbn: order.isbn,
      author: 'Unknown', 
      description: '신규 입고된 도서입니다.',
      isNew: true,
      category: '미분류',
      coverUrl: `https://covers.openlibrary.org/b/isbn/${order.isbn}-M.jpg`, 
      location: null, 
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'received' });
  };

  const handleStockOut = async (isbn, qty) => {
    if (!user) return;
    const target = books.find(b => b.isbn === isbn);
    if (target) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', target.id));
    } else {
      alert('해당 ISBN의 도서를 찾을 수 없습니다.');
    }
  };

  const handleAddComment = async (bookId, text) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'comments'), {
      bookId, text, createdAt: serverTimestamp(), userId: user.uid
    });
  };

  const handleUpdateBook = async (bookId, newData) => {
    if(!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', bookId), newData);
  };

  const handleDeleteBook = async (bookId) => {
    if(!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'books', bookId));
  }

  // --- Views ---

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books;
    return books.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [books, searchTerm]);

  const newArrivals = useMemo(() => books.filter(b => b.isNew), [books]);
  const curatedBooks = useMemo(() => books.filter(b => ['소설', '과학', '에세이'].includes(b.category)), [books]);

  // Loading State
  if (!isFirebaseReady && !user) {
      return (
        <div className="h-screen flex flex-col items-center justify-center text-gray-400 gap-4">
            <Loader2 className="animate-spin text-black" size={32} />
            <p className="font-medium text-black">서재 문을 열고 있습니다...</p>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} userMode={userMode} setUserMode={setUserMode} />

      <main className="max-w-screen-xl mx-auto min-h-[calc(100vh-60px)]">
        
        {/* Customer: Home */}
        {activeTab === 'home' && (
          <div className="p-4 md:p-8 space-y-16 animate-fade-in">
            {/* Hero Section */}
            <section className="text-center py-20 bg-gradient-to-b from-gray-50 to-white rounded-[3rem]">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 font-serif tracking-tight">오늘의 발견, <br/><span className="text-blue-600">당신의 서재</span></h1>
              <p className="text-gray-500 mb-10 text-lg">취향에 맞는 책을 찾아보고 서가 위치를 확인하세요.</p>
              <button onClick={() => setActiveTab('search')} className="bg-black text-white px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform hover:shadow-lg text-lg">
                도서 검색하기
              </button>
            </section>

            {/* New Arrivals */}
            <section>
              <div className="flex items-end justify-between mb-8 px-2">
                <h2 className="text-2xl md:text-3xl font-bold font-serif">오늘의 신간</h2>
                <span className="text-sm text-gray-400 hover:text-black cursor-pointer underline underline-offset-4">전체보기</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-12">
                {newArrivals.slice(0, 12).map(book => (
                  <BookCard key={book.id} book={book} onClick={setSelectedBook} />
                ))}
                {newArrivals.length === 0 && <div className="col-span-full py-20 text-center text-gray-300">아직 등록된 신간이 없습니다.</div>}
              </div>
            </section>
          </div>
        )}

        {/* Customer: Search */}
        {activeTab === 'search' && (
          <div className="p-4 md:p-8 animate-fade-in">
            <div className="relative max-w-2xl mx-auto mb-16 mt-8">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={24}/>
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="도서명, 저자, ISBN 검색..."
                className="w-full pl-16 pr-6 py-5 rounded-full bg-gray-50 border-2 border-transparent focus:bg-white focus:border-black transition-all text-xl shadow-sm outline-none"
                autoFocus
              />
            </div>

            {searchTerm && <p className="mb-6 text-gray-500 font-bold px-2">'{searchTerm}' 검색 결과 ({filteredBooks.length})</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12">
              {filteredBooks.map(book => (
                <BookCard key={book.id} book={book} onClick={setSelectedBook} />
              ))}
            </div>
            {filteredBooks.length === 0 && searchTerm && (
                <div className="text-center py-20 text-gray-400">검색 결과가 없습니다.</div>
            )}
          </div>
        )}

        {/* Customer: Curation (Static Mock) */}
        {activeTab === 'curation' && (
          <div className="p-4 md:p-8 animate-fade-in max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold font-serif mb-2">사서의 추천</h2>
            <p className="text-gray-500 mb-12">이번 달, 놓치면 후회할 이야기들</p>
            
            <div className="space-y-12">
              <div className="bg-amber-50 p-8 rounded-3xl">
                <h3 className="font-bold text-amber-900 mb-6 flex items-center gap-2 text-xl"><Star size={24} fill="currentColor"/> 따뜻한 위로가 필요할 때</h3>
                <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                   {curatedBooks.length > 0 ? curatedBooks.map(book => (
                     <div key={book.id} className="w-40 shrink-0">
                       <BookCard book={book} onClick={setSelectedBook} />
                     </div>
                   )) : (
                     <div className="text-amber-800/50 text-sm py-10 w-full text-center">추천 도서를 준비중입니다.</div>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin: Map */}
        {activeTab === 'admin-map' && (
          <AdminMap books={books} onMoveBook={handleMoveBook} />
        )}

        {/* Admin: Inventory */}
        {activeTab === 'admin-inventory' && (
          <AdminInventory 
            orders={orders} 
            onOrder={handleOrderBook} 
            onReceive={handleReceiveBook}
            onStockOut={handleStockOut}
          />
        )}

        {/* Admin: Database (Table View) */}
        {activeTab === 'admin-database' && (
            <AdminDatabase 
                books={books} 
                onUpdateBook={handleUpdateBook} 
                onDeleteBook={handleDeleteBook}
            />
        )}
      </main>

      {/* Detail Modal */}
      {selectedBook && (
        <BookDetail 
          book={selectedBook} 
          comments={comments.filter(c => c.bookId === selectedBook.id)}
          onClose={() => setSelectedBook(null)}
          onAddComment={handleAddComment}
        />
      )}

      {/* Global Styles */}
      <style>{`
        .input-field {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          font-size: 14px;
          transition: all 0.2s;
          background: #f9fafb;
        }
        .input-field:focus {
          outline: none;
          border-color: black;
          background: white;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}
