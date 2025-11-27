import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp, setDoc, getDocs, where 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  Search, Map, BookOpen, Plus, ShoppingCart, 
  ArrowRight, User, Star, MoreHorizontal, Move, 
  Package, LayoutGrid, Tag, LogOut, CheckCircle, XCircle,
  Inbox, Database, Trash2, Edit2, Save
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyB7eQzfz9leVWjs23VJ9uFMAIaB_YXQq68",
  authDomain: "graphic-d473d.firebaseapp.com",
  projectId: "graphic-d473d",
  storageBucket: "graphic-d473d.firebasestorage.app",
  messagingSenderId: "482443735322",
  appId: "1:482443735322:web:42d7434776c5a4ef797ca3",
  measurementId: "G-KVM210Y5HP"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

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
          <button onClick={() => setActiveTab('curation')} className={`${activeTab === 'curation' ? 'text-black font-bold' : 'text-gray-400'} whitespace-nowrap transition-colors`}>큐레이션</button>
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

// 2. Book Card (Customer View)
const BookCard = ({ book, onClick }) => (
  <div onClick={() => onClick(book)} className="group cursor-pointer flex flex-col gap-2">
    <div className="aspect-[2/3] w-full bg-gray-100 rounded-lg overflow-hidden relative shadow-sm transition-all group-hover:shadow-md border border-gray-100">
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
          <BookOpen size={32} />
        </div>
      )}
      {book.isNew && (
        <span className="absolute top-2 left-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
          NEW
        </span>
      )}
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md shadow-sm">
        {book.location ? `${book.location.section}-${book.location.row}-${book.location.col}` : '위치미정'}
      </div>
    </div>
    <div>
      <h3 className="font-bold text-gray-900 leading-tight line-clamp-1 text-sm">{book.title}</h3>
      <p className="text-xs text-gray-500 line-clamp-1">{book.author}</p>
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
               {book.coverUrl ? <img src={book.coverUrl} alt="" className="w-full h-full object-cover"/> : null}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <span className="text-xs font-bold text-blue-600 mb-1 block">{book.category || '일반'}</span>
                <h1 className="text-xl font-bold leading-tight mb-1">{book.title}</h1>
                <p className="text-sm text-gray-500">{book.author}</p>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <Map size={18} className="text-gray-400"/>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">서가 위치</p>
                  <p className="text-sm font-bold text-gray-900">
                    {book.location ? 
                      `Section ${book.location.section} / 행 ${book.location.row} / 열 ${book.location.col}` 
                      : '입고 대기중'}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                {book.description || '책 소개글이 없습니다.'}
              </p>
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

// 4. Admin Map Component (Draggable)
const AdminMap = ({ books, onMoveBook }) => {
  const [activeSection, setActiveSection] = useState('A');
  const sections = ['A', 'B', 'C'];
  const rows = 5;
  const cols = 8;

  // Drag state
  const [draggedBook, setDraggedBook] = useState(null);

  const getCellBook = (r, c) => {
    return books.find(b => b.location?.section === activeSection && b.location?.row === r && b.location?.col === c);
  };
  
  const getUnplacedBooks = () => {
    return books.filter(b => !b.location);
  };

  const handleDrop = (r, c, e) => {
    e.preventDefault();
    if (!draggedBook) return;
    const targetBook = getCellBook(r, c);
    onMoveBook(draggedBook.id, { section: activeSection, row: r, col: c }, targetBook);
    setDraggedBook(null);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      {/* Sidebar: Unplaced Books */}
      <div className="w-full lg:w-64 bg-white border-r border-gray-200 p-4 flex flex-col h-1/3 lg:h-full overflow-hidden">
        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Inbox size={18}/> 진열 대기 중 ({getUnplacedBooks().length})
        </h3>
        <p className="text-xs text-gray-500 mb-4">입고되었으나 위치가 없는 도서입니다. 드래그하여 배치하세요.</p>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {getUnplacedBooks().map(book => (
            <div 
              key={book.id}
              draggable
              onDragStart={() => setDraggedBook(book)}
              className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm cursor-move hover:border-blue-500 hover:shadow-md transition-all flex gap-3 items-center group"
            >
              <div className="w-10 h-14 bg-gray-100 rounded shrink-0 overflow-hidden">
                {book.coverUrl && <img src={book.coverUrl} className="w-full h-full object-cover"/>}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate group-hover:text-blue-600">{book.title}</p>
                <p className="text-xs text-gray-500">{book.author}</p>
              </div>
            </div>
          ))}
          {getUnplacedBooks().length === 0 && (
            <div className="text-center py-10 text-gray-300 text-sm">대기 중인 도서가 없습니다.</div>
          )}
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">도서 위치 관리 시스템</h2>
            <p className="text-sm text-gray-500 hidden md:block">책을 드래그하여 위치를 이동하세요.</p>
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
                           <img 
                            src={book.coverUrl || "/api/placeholder/100/150"} 
                            className="w-full h-full object-cover rounded shadow-sm pointer-events-none" 
                            alt="book"
                          />
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
          
          {/* Floor Label */}
          <div className="mt-4 text-center border-t-2 border-gray-200 pt-2">
            <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Section {activeSection} Floor</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. Admin Inventory Component
const AdminInventory = ({ orders, onOrder, onReceive, onStockOut }) => {
  const [view, setView] = useState('order'); // 'order', 'list', 'out'
  const [form, setForm] = useState({ title: '', isbn: '', quantity: 1, price: 0, purpose: '일반구매', source: '교보문고' });

  const handleSubmitOrder = () => {
    if (!form.title || !form.isbn) return;
    onOrder({ ...form, date: new Date().toISOString(), status: 'pending' });
    setForm({ title: '', isbn: '', quantity: 1, price: 0, purpose: '일반구매', source: '교보문고' });
    alert('발주가 등록되었습니다.');
  };

  const handleStockOut = (isbn, qty) => {
    onStockOut(isbn, qty);
    alert('출고 처리 되었습니다.');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex gap-4 mb-8 border-b border-gray-200 pb-1">
        <button onClick={() => setView('order')} className={`pb-3 text-sm font-bold ${view === 'order' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>도서 발주</button>
        <button onClick={() => setView('list')} className={`pb-3 text-sm font-bold ${view === 'list' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>입고 대기 ({orders.filter(o => o.status === 'pending').length})</button>
        <button onClick={() => setView('out')} className={`pb-3 text-sm font-bold ${view === 'out' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}>출고 관리</button>
      </div>

      {view === 'order' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in">
          <h3 className="font-bold text-lg mb-4">신규 도서 발주 등록</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <select className="input-field" value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})}>
              <option>일반구매</option>
              <option>고객요청</option>
              <option>파손교체</option>
            </select>
          </div>
          <button onClick={handleSubmitOrder} className="mt-6 w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors">
            발주 등록하기
          </button>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-3 animate-fade-in">
          {orders.filter(o => o.status === 'pending').map(order => (
            <div key={order.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
              <div>
                <h4 className="font-bold">{order.title}</h4>
                <p className="text-xs text-gray-500">ISBN: {order.isbn} | 수량: {order.quantity}권 | {order.source}</p>
              </div>
              <button 
                onClick={() => onReceive(order)}
                className="bg-blue-600 text-white text-xs px-3 py-2 rounded-md font-bold hover:bg-blue-700 flex items-center gap-1"
              >
                <CheckCircle size={14}/> 입고확인
              </button>
            </div>
          ))}
          {orders.filter(o => o.status === 'pending').length === 0 && (
            <p className="text-center text-gray-400 py-10">대기중인 발주 내역이 없습니다.</p>
          )}
        </div>
      )}

      {view === 'out' && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in">
          <h3 className="font-bold text-lg mb-4 text-red-600">도서 출고(폐기/판매) 처리</h3>
          <p className="text-sm text-gray-500 mb-4">출고 처리 시 전체 도서 리스트에서 즉시 수량이 차감되거나 삭제됩니다.</p>
          <div className="flex gap-2">
            <input id="out-isbn" className="input-field flex-1" placeholder="출고할 도서 ISBN 입력" />
            <button 
              onClick={() => handleStockOut(document.getElementById('out-isbn').value, 1)}
              className="bg-red-50 text-red-600 font-bold px-4 rounded-lg border border-red-100 hover:bg-red-100"
            >
              출고처리
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 6. NEW: Admin Database (Table View)
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
    <div className="p-4 md:p-8 animate-fade-in">
       <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">전체 도서 대장 (DB 관리)</h2>
          <p className="text-sm text-gray-500">데이터베이스의 모든 도서를 엑셀처럼 관리하세요.</p>
        </div>
        <div className="text-xs text-gray-400 font-mono bg-gray-100 px-3 py-1 rounded">
          Total Records: {books.length}
        </div>
       </div>

       <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
         <table className="w-full text-sm text-left">
           <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
             <tr>
               <th className="px-6 py-3">도서명</th>
               <th className="px-6 py-3">ISBN</th>
               <th className="px-6 py-3">저자</th>
               <th className="px-6 py-3">카테고리</th>
               <th className="px-6 py-3">위치</th>
               <th className="px-6 py-3 text-right">관리</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
             {books.map(book => (
               <tr key={book.id} className="hover:bg-gray-50">
                 {editingId === book.id ? (
                   <>
                     <td className="px-6 py-3"><input className="border rounded px-2 py-1 w-full" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} /></td>
                     <td className="px-6 py-3"><input className="border rounded px-2 py-1 w-24" value={editForm.isbn} onChange={e => setEditForm({...editForm, isbn: e.target.value})} /></td>
                     <td className="px-6 py-3"><input className="border rounded px-2 py-1 w-full" value={editForm.author} onChange={e => setEditForm({...editForm, author: e.target.value})} /></td>
                     <td className="px-6 py-3"><input className="border rounded px-2 py-1 w-24" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} /></td>
                     <td className="px-6 py-3 text-gray-400 italic">위치는 지도에서 수정</td>
                     <td className="px-6 py-3 text-right">
                       <button onClick={saveEdit} className="text-green-600 hover:text-green-800 mr-2"><Save size={16}/></button>
                       <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><XCircle size={16}/></button>
                     </td>
                   </>
                 ) : (
                   <>
                     <td className="px-6 py-3 font-medium text-gray-900">{book.title} {book.isNew && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded ml-1">NEW</span>}</td>
                     <td className="px-6 py-3 font-mono text-gray-500">{book.isbn}</td>
                     <td className="px-6 py-3 text-gray-500">{book.author}</td>
                     <td className="px-6 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{book.category || '미분류'}</span></td>
                     <td className="px-6 py-3 text-gray-500">{book.location ? `${book.location.section}-${book.location.row}-${book.location.col}` : <span className="text-red-400 text-xs">미배치</span>}</td>
                     <td className="px-6 py-3 text-right flex justify-end gap-2">
                       <button onClick={() => startEdit(book)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16}/></button>
                       <button onClick={() => { if(window.confirm('정말 삭제하시겠습니까?')) onDeleteBook(book.id); }} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
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

  // 1. Auth & Initial Load
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // 2. Data Fetching
  useEffect(() => {
    if (!user) return;
    const userId = user.uid; // In a real app, public data might be in a shared collection. 
                             // Following rules: using artifacts/public/data for shared data.
    
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
    if (!user) return;
    const booksRef = collection(db, 'artifacts', appId, 'public', 'data', 'books');
    
    // Update moved book
    await updateDoc(doc(booksRef, bookId), { location: newLoc });
    
    // If targetBook exists, swap location (optional feature)
    if (targetBook) {
        // Swap logic: find the dragged book's old location first? 
        // For simplicity in this demo, we'll just alert if occupied or simple swap
        // Let's implement simple swap
        const draggedBook = books.find(b => b.id === bookId);
        if (draggedBook && draggedBook.location) {
             await updateDoc(doc(booksRef, targetBook.id), { location: draggedBook.location });
        } else {
             // If dragged book had no location (new), just clear target book's location or move it to storage?
             // Let's just make the target book location null (moved to storage)
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
    // 1. Add to Books
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'books'), {
      title: order.title,
      isbn: order.isbn,
      author: 'Unknown', // In real app, fetch from API
      description: '신규 입고된 도서입니다.',
      isNew: true,
      category: '미분류',
      coverUrl: `https://covers.openlibrary.org/b/isbn/${order.isbn}-M.jpg`, // Auto fetch cover
      location: null, // Needs to be placed on map
      createdAt: serverTimestamp()
    });
    // 2. Update Order Status
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: 'received' });
  };

  const handleStockOut = async (isbn, qty) => {
    if (!user) return;
    // Find book by ISBN
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
      bookId,
      text,
      createdAt: serverTimestamp(),
      userId: user.uid
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
  const curatedBooks = useMemo(() => books.filter(b => ['소설', '과학'].includes(b.category)), [books]);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} userMode={userMode} setUserMode={setUserMode} />

      <main className="max-w-screen-xl mx-auto min-h-[calc(100vh-60px)]">
        
        {/* Customer: Home */}
        {activeTab === 'home' && (
          <div className="p-4 md:p-8 space-y-12 animate-fade-in">
            {/* Hero Section */}
            <section className="text-center py-12 bg-gray-50 rounded-3xl">
              <h1 className="text-3xl md:text-5xl font-bold mb-4 font-serif">오늘의 발견, <br/>당신의 서재</h1>
              <p className="text-gray-500 mb-8">취향에 맞는 책을 찾아보고 서가 위치를 확인하세요.</p>
              <button onClick={() => setActiveTab('search')} className="bg-black text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform">
                도서 검색하기
              </button>
            </section>

            {/* New Arrivals */}
            <section>
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold font-serif">오늘의 신간</h2>
                <span className="text-xs text-gray-400 cursor-pointer hover:text-black">더보기</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
                {newArrivals.slice(0, 6).map(book => (
                  <BookCard key={book.id} book={book} onClick={setSelectedBook} />
                ))}
                {newArrivals.length === 0 && <p className="col-span-full text-center text-gray-400 py-10">신간이 없습니다.</p>}
              </div>
            </section>
          </div>
        )}

        {/* Customer: Search */}
        {activeTab === 'search' && (
          <div className="p-4 md:p-8 animate-fade-in">
            <div className="relative max-w-2xl mx-auto mb-10">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="도서명, 저자, ISBN 검색..."
                className="w-full pl-12 pr-4 py-4 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-black transition-all text-lg"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
              {filteredBooks.map(book => (
                <BookCard key={book.id} book={book} onClick={setSelectedBook} />
              ))}
            </div>
            {filteredBooks.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-400">검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* Customer: Curation */}
        {activeTab === 'curation' && (
          <div className="p-4 md:p-8 animate-fade-in">
            <h2 className="text-3xl font-bold font-serif mb-2">사서의 추천</h2>
            <p className="text-gray-500 mb-8">이번 달, 놓치면 후회할 이야기들</p>
            
            <div className="space-y-12">
              <div className="bg-amber-50 p-6 rounded-2xl">
                <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2"><Star size={18} fill="currentColor"/> 따뜻한 위로가 필요할 때</h3>
                <div className="flex gap-4 overflow-x-auto pb-4">
                   {/* Mock Curation Items if empty */}
                   {curatedBooks.length > 0 ? curatedBooks.map(book => (
                     <div key={book.id} className="w-32 shrink-0">
                       <BookCard book={book} onClick={setSelectedBook} />
                     </div>
                   )) : (
                     <div className="text-amber-800/50 text-sm">추천 도서 준비중입니다.</div>
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

      {/* Global Styles for input fields */}
      <style>{`
        .input-field {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 14px;
        }
        .input-field:focus {
          outline: none;
          border-color: black;
          ring: 1px solid black;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
