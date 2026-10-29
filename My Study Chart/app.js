// State Management
let store = {
  folders: ["基本データ", "英単語", "歴史"],
  currentFolder: "基本データ",
  questions: [],
  bookmarkFilter: false,
  searchKeyword: "",
  searchHistory: [],
  trainCount: 3,
  trainBookmarkOnly: false,
  currentTrainIndex: 0,
  trainQuestions: [],
  pastTests: [],
  streakDays: 1,
  lastLoginDate: ""
};

let sortableInstance = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  loadStore();
  if (store.questions.length === 0) seedInitialData();
  
  checkStreakLogin();
  renderFolderSelects();
  renderQuestionList();
  
  if (window.lucide) {
    window.lucide.createIcons();
  }

  const imgInput = document.getElementById('modalImageInput');
  if (imgInput) {
    imgInput.addEventListener('change', handleImageUpload);
  }
  
  // Close search history dropdown on outside click
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('searchHistoryMenu');
    const searchInput = document.getElementById('searchInput');
    if (menu && !menu.contains(e.target) && e.target !== searchInput) {
      menu.classList.add('hidden');
    }
  });

  switchTab('home');
});

// Save/Load LocalStorage
function saveStore() {
  localStorage.setItem('study_col_data', JSON.stringify(store));
}

function loadStore() {
  const data = localStorage.getItem('study_col_data');
  if (data) store = JSON.parse(data);
}

// Initial Mock Data (サンプル問題なしのクリーンな状態)
function seedInitialData() {
  store.questions = [];
  saveStore();
}

// Daily Streak Login Check
function checkStreakLogin() {
  const today = new Date().toISOString().split('T')[0];
  let isFirstToday = false;

  if (store.lastLoginDate !== today) {
    isFirstToday = true;
    if (store.lastLoginDate) {
      const lastDate = new Date(store.lastLoginDate);
      const currDate = new Date(today);
      const diffTime = Math.abs(currDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        store.streakDays += 1;
      } else if (diffDays > 1) {
        store.streakDays = 1;
      }
    } else {
      store.streakDays = 1;
    }

    store.lastLoginDate = today;
    saveStore();
  }

  const streakEl = document.getElementById('homeStreakDays');
  if (streakEl) streakEl.textContent = store.streakDays;

  if (isFirstToday && window.confetti) {
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    }, 300);
  }
}

// Sidebar Toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('sidebar-collapsed')) {
    sidebar.classList.remove('sidebar-collapsed');
    sidebar.classList.add('sidebar-expanded');
  } else {
    sidebar.classList.remove('sidebar-expanded');
    sidebar.classList.add('sidebar-collapsed');
  }
  if (window.lucide) window.lucide.createIcons();
}

// Helper: Super Robust Copy Prompt & Open Gemini with Fallback
function copyAndOpenGemini(promptText) {
  let copySuccess = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(promptText).then(() => {
      copySuccess = true;
    }).catch(() => {
      copySuccess = fallbackCopyTextToClipboard(promptText);
    });
  } else {
    copySuccess = fallbackCopyTextToClipboard(promptText);
  }

  let win = null;
  try {
    win = window.open("https://gemini.google.com", "_blank");
  } catch (e) {
    win = null;
  }

  if (!win || win.closed || typeof win.closed === 'undefined') {
    showAIPromptModal(promptText);
  } else {
    alert("プロンプトをクリップボードにコピーしました！\nGeminiが開きますので、貼り付けて（Ctrl+V）実行してください。");
  }
}

function fallbackCopyTextToClipboard(text) {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    return false;
  }
}

function showAIPromptModal(text) {
  const modal = document.getElementById('aiPromptModal');
  const textarea = document.getElementById('aiPromptModalText');
  if (modal && textarea) {
    textarea.value = text;
    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }
}

function closeAIPromptModal() {
  const modal = document.getElementById('aiPromptModal');
  if (modal) modal.classList.add('hidden');
}

function copyPromptFromModal() {
  const textarea = document.getElementById('aiPromptModalText');
  if (textarea) {
    textarea.select();
    try {
      document.execCommand('copy');
      alert("プロンプトをコピーしました！");
    } catch (e) {
      alert("コピーに失敗しました。手動で選択してコピーしてください。");
    }
  }
}

function openGeminiDirect() {
  window.open("https://gemini.google.com", "_blank");
}

// Navigation Tab Switcher
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`tab-${tabId}`) || document.getElementById(`view-${tabId}`);
  if (target) target.classList.remove('hidden');
  
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) activeNav.classList.add('active');

  if (tabId === 'mybook') renderQuestionList();
  if (tabId === 'aicoach') setupAICoachSelects();
  if (tabId === 'test') renderPastTests();
  
  if (window.lucide) window.lucide.createIcons();
}

// Search Feature
function handleSearchInput() {
  const val = document.getElementById('searchInput').value;
  store.searchKeyword = val.trim();
  document.getElementById('clearSearchBtn').classList.toggle('hidden', val.length === 0);
  renderQuestionList();

  if (val.trim().length > 0 && !store.searchHistory.includes(val.trim())) {
    store.searchHistory.unshift(val.trim());
    if (store.searchHistory.length > 5) store.searchHistory.pop();
    saveStore();
  }
}

function clearSearchInput() {
  document.getElementById('searchInput').value = "";
  store.searchKeyword = "";
  document.getElementById('clearSearchBtn').classList.add('hidden');
  renderQuestionList();
}

function showSearchHistory() {
  const menu = document.getElementById('searchHistoryMenu');
  const list = document.getElementById('searchHistoryList');
  list.innerHTML = '';

  if (store.searchHistory.length === 0) {
    list.innerHTML = `<div class="text-xs text-slate-400 py-1 font-bold">履歴はありません</div>`;
  } else {
    store.searchHistory.forEach((kw, idx) => {
      const item = document.createElement('div');
      item.className = "flex justify-between items-center text-xs font-bold text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg cursor-pointer";
      item.innerHTML = `
        <span onclick="applySearchKeyword('${escapeHtml(kw)}')">${escapeHtml(kw)}</span>
        <button onclick="deleteSearchHistory(${idx}, event)" class="text-slate-400 hover:text-red-500 p-0.5"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
      `;
      list.appendChild(item);
    });
    if (window.lucide) window.lucide.createIcons();
  }
  menu.classList.remove('hidden');
}

function applySearchKeyword(kw) {
  document.getElementById('searchInput').value = kw;
  store.searchKeyword = kw;
  document.getElementById('clearSearchBtn').classList.remove('hidden');
  document.getElementById('searchHistoryMenu').classList.add('hidden');
  renderQuestionList();
}

function deleteSearchHistory(idx, e) {
  e.stopPropagation();
  store.searchHistory.splice(idx, 1);
  saveStore();
  showSearchHistory();
}

function clearAllSearchHistory() {
  store.searchHistory = [];
  saveStore();
  showSearchHistory();
}

// Folders Management
function renderFolderSelects() {
  const selects = ['folderSelect', 'modalFolderSelect', 'trainingFolderSelect', 'coachFolderSelect'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const currentVal = el.value;
    el.innerHTML = '';
    if (id === 'trainingFolderSelect' || id === 'coachFolderSelect') {
      el.innerHTML = `<option value="ALL">すべてのフォルダ</option>`;
    }
    store.folders.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      el.appendChild(opt);
    });
    if (currentVal && Array.from(el.options).some(o => o.value === currentVal)) {
      el.value = currentVal;
    } else if (id === 'folderSelect') {
      el.value = store.currentFolder;
    }
  });
}

function onFolderChange() {
  store.currentFolder = document.getElementById('folderSelect').value;
  renderQuestionList();
}

function promptNewFolder() {
  const name = prompt("新しいフォルダ名を入力:");
  if (name && !store.folders.includes(name)) {
    store.folders.push(name);
    store.currentFolder = name;
    saveStore();
    renderFolderSelects();
    renderQuestionList();
  }
}

function promptEditFolder() {
  const oldName = store.currentFolder;
  const newName = prompt("フォルダ名を変更:", oldName);
  if (newName && newName !== oldName) {
    const idx = store.folders.indexOf(oldName);
    if (idx !== -1) store.folders[idx] = newName;
    store.questions.forEach(q => { if (q.folder === oldName) q.folder = newName; });
    store.currentFolder = newName;
    saveStore();
    renderFolderSelects();
    renderQuestionList();
  }
}

function deleteCurrentFolder() {
  if (store.folders.length <= 1) {
    alert("フォルダは最低1つ必要です。");
    return;
  }
  const folderToDelete = store.currentFolder;
  if (confirm(`フォルダ「${folderToDelete}」と含まれる問題をすべて削除しますか？`)) {
    store.folders = store.folders.filter(f => f !== folderToDelete);
    store.questions = store.questions.filter(q => q.folder !== folderToDelete);
    store.currentFolder = store.folders[0];
    saveStore();
    renderFolderSelects();
    renderQuestionList();
  }
}

// My Question List Render & Drag-and-Drop Sort (全文表示対応)
function renderQuestionList() {
  const listEl = document.getElementById('questionList');
  if (!listEl) return;
  listEl.innerHTML = '';

  let filtered = store.questions.filter(q => q.folder === store.currentFolder);
  
  if (store.bookmarkFilter) {
    filtered = filtered.filter(q => q.bookmarked);
  }

  if (store.searchKeyword) {
    const kw = store.searchKeyword.toLowerCase();
    filtered = filtered.filter(q => 
      q.question.toLowerCase().includes(kw) || 
      q.answer.toLowerCase().includes(kw) || 
      (q.note && q.note.toLowerCase().includes(kw))
    );
  }

  filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="text-center py-12 text-slate-400 font-bold">該当する問題が見つかりません</div>`;
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }
    return;
  }

  filtered.forEach(q => {
    const card = document.createElement('div');
    card.dataset.id = q.id;
    card.className = "bg-white p-4 rounded-2xl border-b-4 border-slate-200 shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:border-blue-300 transition transform hover:-translate-y-0.5";
    
    card.innerHTML = `
      <div class="flex items-center gap-3 flex-1 min-w-0" onclick="openDetailView('${q.id}')">
        <i data-lucide="grip-vertical" class="drag-handle text-slate-400 cursor-grab hover:text-slate-600 flex-shrink-0 p-1"></i>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-slate-800 text-lg whitespace-pre-wrap">${escapeHtml(q.question)}</p>
          <span class="text-xs font-semibold text-slate-400">${q.image ? '📷 画像あり | ' : ''}タップして詳細</span>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <button onclick="toggleBookmark('${q.id}', event)" class="${q.bookmarked ? 'text-amber-400' : 'text-slate-300'} hover:text-amber-400">
          <i data-lucide="bookmark" class="w-6 h-6 fill-current"></i>
        </button>
        <button onclick="editQuestion('${q.id}', event)" class="text-slate-400 hover:text-blue-500">
          <i data-lucide="edit" class="w-5 h-5"></i>
        </button>
        <button onclick="deleteQuestion('${q.id}', event)" class="text-slate-400 hover:text-red-500">
          <i data-lucide="trash-2" class="w-5 h-5"></i>
        </button>
      </div>
    `;
    listEl.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();

  if (sortableInstance) {
    sortableInstance.destroy();
  }
  sortableInstance = Sortable.create(listEl, {
    handle: '.drag-handle',
    animation: 150,
    onEnd: () => {
      const cards = listEl.querySelectorAll('[data-id]');
      const newOrderIds = Array.from(cards).map(card => card.dataset.id);
      
      newOrderIds.forEach((id, newIdx) => {
        const targetQ = store.questions.find(item => item.id === id);
        if (targetQ) {
          targetQ.order = newIdx;
        }
      });
      saveStore();
    }
  });
}

function toggleBookmarkFilter() {
  store.bookmarkFilter = !store.bookmarkFilter;
  const btn = document.getElementById('bookmarkFilterBtn');
  btn.innerHTML = `<i data-lucide="bookmark" class="w-4 h-4"></i> ブックマークのみ: ${store.bookmarkFilter ? 'ON' : 'OFF'}`;
  btn.className = `duo-btn ${store.bookmarkFilter ? 'duo-btn-amber' : 'duo-btn-gray'} text-xs md:text-sm px-3 py-2 rounded-xl flex items-center gap-2`;
  renderQuestionList();
}

function toggleBookmark(id, e) {
  if (e) e.stopPropagation();
  const q = store.questions.find(item => item.id === id);
  if (q) {
    q.bookmarked = !q.bookmarked;
    saveStore();
    renderQuestionList();
  }
}

// Question Modal Functions
function openQuestionModal(editId = null) {
  renderFolderSelects();
  const modal = document.getElementById('questionModal');
  const form = document.getElementById('questionForm');
  form.reset();
  const preview = document.getElementById('modalImagePreview');
  preview.src = "";
  preview.classList.add('hidden');
  
  if (editId) {
    const q = store.questions.find(item => item.id === editId);
    document.getElementById('modalTitle').textContent = "問題を編集";
    document.getElementById('editQuestionId').value = q.id;
    document.getElementById('modalFolderSelect').value = q.folder;
    document.getElementById('modalQText').value = q.question;
    document.getElementById('modalAText').value = q.answer;
    document.getElementById('modalNoteText').value = q.note || '';
    if (q.image) {
      preview.src = q.image;
      preview.classList.remove('hidden');
    }
  } else {
    document.getElementById('modalTitle').textContent = "問題を新規追加";
    document.getElementById('editQuestionId').value = "";
    document.getElementById('modalFolderSelect').value = store.currentFolder;
  }
  modal.classList.remove('hidden');
}

function closeQuestionModal() {
  document.getElementById('questionModal').classList.add('hidden');
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const preview = document.getElementById('modalImagePreview');
      preview.src = evt.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

function saveQuestion(e) {
  e.preventDefault();
  const id = document.getElementById('editQuestionId').value;
  const folder = document.getElementById('modalFolderSelect').value;
  const question = document.getElementById('modalQText').value;
  const answer = document.getElementById('modalAText').value;
  const note = document.getElementById('modalNoteText').value;
  const imagePreview = document.getElementById('modalImagePreview');
  const image = imagePreview.classList.contains('hidden') ? '' : imagePreview.src;

  if (id) {
    const q = store.questions.find(item => item.id === id);
    if (q) {
      Object.assign(q, { folder, question, answer, note, image });
    }
  } else {
    const newQ = {
      id: "q_" + Date.now(),
      folder,
      question,
      answer,
      note,
      image,
      bookmarked: false,
      order: store.questions.length
    };
    store.questions.push(newQ);
  }

  saveStore();
  closeQuestionModal();
  renderQuestionList();
}

function editQuestion(id, e) {
  e.stopPropagation();
  openQuestionModal(id);
}

function deleteQuestion(id, e) {
  e.stopPropagation();
  if (confirm("この問題を削除しますか？")) {
    store.questions = store.questions.filter(q => q.id !== id);
    saveStore();
    renderQuestionList();
  }
}

// Question Detail View
let currentDetailId = null;
function openDetailView(id) {
  currentDetailId = id;
  const q = store.questions.find(item => item.id === id);
  if (!q) return;

  document.getElementById('detailFolderBadge').textContent = q.folder;
  document.getElementById('detailQuestionText').textContent = q.question;
  document.getElementById('detailAnswerText').textContent = q.answer;
  document.getElementById('detailNoteText').textContent = q.note || "なし";
  
  const imgBox = document.getElementById('detailImageContainer');
  const imgEl = document.getElementById('detailImage');
  if (q.image && q.image.trim() !== '') {
    imgEl.src = q.image;
    imgBox.classList.remove('hidden');
  } else {
    imgEl.src = '';
    imgBox.classList.add('hidden');
  }

  document.getElementById('stickyCover').classList.remove('hidden');
  document.getElementById('stickyContent').classList.add('hidden');

  const bmBtn = document.getElementById('detailBookmarkBtn');
  bmBtn.className = q.bookmarked ? 'text-amber-400' : 'text-slate-300';

  switchTab('detail');
}

function revealAnswer() {
  document.getElementById('stickyCover').classList.add('hidden');
  document.getElementById('stickyContent').classList.remove('hidden');
  if (window.confetti) confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } });
}

function toggleDetailBookmark() {
  if (!currentDetailId) return;
  toggleBookmark(currentDetailId, null);
  const q = store.questions.find(item => item.id === currentDetailId);
  const bmBtn = document.getElementById('detailBookmarkBtn');
  bmBtn.className = q.bookmarked ? 'text-amber-400' : 'text-slate-300';
}

function askAIForDetail() {
  const q = store.questions.find(item => item.id === currentDetailId);
  if (!q) return;

  let prompt = `以下の問題と解答を基に、解答に至るプロセスと重要項目を丁寧に解説してください。\n\n【問題】: ${q.question}\n`;
  if (q.image && q.image.trim() !== '') {
    prompt += `※この問題には添付画像（Base64形式）があります： ${q.image}\n`;
  }
  prompt += `【解答】: ${q.answer}\n【補足】: ${q.note || 'なし'}`;

  copyAndOpenGemini(prompt);
}

// TRAINING FEATURE
function setTrainCount(num) {
  store.trainCount = num;
  document.querySelectorAll('.train-count-btn').forEach((btn, idx) => {
    btn.className = `train-count-btn duo-btn flex-1 py-3 rounded-xl font-black text-lg ${idx + 1 === num ? 'duo-btn-green' : 'duo-btn-gray'}`;
  });
}

function toggleTrainBookmarkOnly() {
  store.trainBookmarkOnly = !store.trainBookmarkOnly;
  const btn = document.getElementById('trainBookmarkOnlyBtn');
  btn.textContent = store.trainBookmarkOnly ? 'ON' : 'OFF';
  btn.className = `duo-btn text-xs px-4 py-2 rounded-xl ${store.trainBookmarkOnly ? 'duo-btn-amber' : 'duo-btn-gray'}`;
}

function startTraining() {
  const selectedFolder = document.getElementById('trainingFolderSelect').value;
  let pool = selectedFolder === 'ALL' ? [...store.questions] : store.questions.filter(q => q.folder === selectedFolder);

  if (store.trainBookmarkOnly) {
    pool = pool.filter(q => q.bookmarked);
  }

  if (pool.length === 0) {
    alert("条件に一致する問題が存在しません。");
    return;
  }

  pool.sort(() => Math.random() - 0.5);
  store.trainQuestions = pool.slice(0, Math.min(store.trainCount, pool.length));
  store.currentTrainIndex = 0;

  document.getElementById('training-setup').classList.add('hidden');
  document.getElementById('training-result').classList.add('hidden');
  document.getElementById('training-play').classList.remove('hidden');

  renderTrainQuestion();
}

function renderTrainQuestion() {
  const q = store.trainQuestions[store.currentTrainIndex];
  document.getElementById('trainProgress').textContent = `第 ${store.currentTrainIndex + 1} / ${store.trainQuestions.length} 問`;
  document.getElementById('trainQuestionText').textContent = q.question;
  document.getElementById('trainAnswerText').textContent = q.answer;
  document.getElementById('trainNoteText').textContent = q.note || "なし";

  const imgBox = document.getElementById('trainImageContainer');
  const imgEl = document.getElementById('trainImage');
  if (q.image && q.image.trim() !== '') {
    imgEl.src = q.image;
    imgBox.classList.remove('hidden');
  } else {
    imgEl.src = '';
    imgBox.classList.add('hidden');
  }

  const bmBtn = document.getElementById('trainBookmarkBtn');
  bmBtn.className = q.bookmarked ? 'text-amber-400' : 'text-slate-300';

  document.getElementById('trainAnswerArea').classList.add('hidden');
  document.getElementById('trainCheckBtn').classList.remove('hidden');
  document.getElementById('trainNextBtn').classList.add('hidden');
}

function checkTrainAnswer() {
  document.getElementById('trainAnswerArea').classList.remove('hidden');
  document.getElementById('trainCheckBtn').classList.add('hidden');
  document.getElementById('trainNextBtn').classList.remove('hidden');
}

function nextTrainQuestion() {
  store.currentTrainIndex++;
  if (store.currentTrainIndex >= store.trainQuestions.length) {
    finishTraining();
  } else {
    renderTrainQuestion();
  }
}

function toggleTrainBookmark() {
  const q = store.trainQuestions[store.currentTrainIndex];
  if (q) {
    q.bookmarked = !q.bookmarked;
    saveStore();
    const bmBtn = document.getElementById('trainBookmarkBtn');
    bmBtn.className = q.bookmarked ? 'text-amber-400' : 'text-slate-300';
  }
}

function finishTraining() {
  document.getElementById('training-play').classList.add('hidden');
  document.getElementById('training-result').classList.remove('hidden');

  if (window.confetti) confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });

  const resList = document.getElementById('trainResultList');
  resList.innerHTML = '';

  store.trainQuestions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = "bg-white p-6 rounded-3xl border-b-4 border-slate-200 space-y-3";
    card.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="font-bold text-slate-500 text-sm">問題 ${idx + 1}</div>
        <button onclick="toggleTrainResultBookmark('${q.id}')" id="trainResultBm_${q.id}" class="${q.bookmarked ? 'text-amber-400' : 'text-slate-300'} hover:text-amber-400 p-1">
          <i data-lucide="bookmark" class="w-6 h-6 fill-current"></i>
        </button>
      </div>
      <p class="font-bold text-slate-800 text-lg whitespace-pre-wrap">${escapeHtml(q.question)}</p>
      ${q.image && q.image.trim() !== '' ? `<div><img src="${q.image}" class="max-h-32 rounded border border-slate-200 object-contain"></div>` : ''}
      <div class="bg-emerald-50 p-3 rounded-xl text-emerald-900 font-bold">正解: ${escapeHtml(q.answer)}</div>
      ${q.note ? `<p class="text-sm text-slate-600 whitespace-pre-wrap">補足: ${escapeHtml(q.note)}</p>` : ''}
      <button onclick="askAIGeneric('${escapeHtml(q.question)}', '${escapeHtml(q.answer)}')" class="duo-btn duo-btn-purple text-sm px-4 py-2 rounded-xl flex items-center gap-1">
        <i data-lucide="sparkles" class="w-4 h-4"></i> Ask AI (コピーしてGeminiへ)
      </button>
    `;
    resList.appendChild(card);
  });
  if (window.lucide) window.lucide.createIcons();
}

function toggleTrainResultBookmark(id) {
  const q = store.questions.find(item => item.id === id);
  if (q) {
    q.bookmarked = !q.bookmarked;
    saveStore();
    const trainQ = store.trainQuestions.find(item => item.id === id);
    if (trainQ) trainQ.bookmarked = q.bookmarked;

    const btn = document.getElementById(`trainResultBm_${id}`);
    if (btn) {
      btn.className = q.bookmarked ? 'text-amber-400 hover:text-amber-400 p-1' : 'text-slate-300 hover:text-amber-400 p-1';
    }
  }
}

function resetTrainingTop() {
  document.getElementById('training-play').classList.add('hidden');
  document.getElementById('training-result').classList.add('hidden');
  document.getElementById('training-setup').classList.remove('hidden');
}

// AI COACH FEATURE WITH FOLDER, KEYWORD FILTER & IMAGE INCLUSION
function setupAICoachSelects() {
  renderFolderSelects();
  const searchInput = document.getElementById('coachSearchInput');
  if (searchInput) searchInput.value = "";
  onCoachFilterChange();
}

function onCoachFilterChange() {
  const folderVal = document.getElementById('coachFolderSelect').value;
  const searchInput = document.getElementById('coachSearchInput');
  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const sel = document.getElementById('coachQuestionSelect');
  if (!sel) return;
  sel.innerHTML = '';

  let pool = folderVal === 'ALL' ? store.questions : store.questions.filter(q => q.folder === folderVal);

  if (keyword) {
    pool = pool.filter(q => 
      q.question.toLowerCase().includes(keyword) || 
      q.answer.toLowerCase().includes(keyword) || 
      (q.note && q.note.toLowerCase().includes(keyword))
    );
  }

  if (pool.length === 0) {
    sel.innerHTML = `<option value="">該当する問題がありません</option>`;
    return;
  }

  pool.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.id;
    opt.textContent = `[${q.folder}] ${q.question} ${q.image ? '📷' : ''}`;
    sel.appendChild(opt);
  });
}

function startAICoach() {
  const qid = document.getElementById('coachQuestionSelect').value;
  const q = store.questions.find(item => item.id === qid);
  if (!q) {
    alert("問題を選択してください。");
    return;
  }

  let prompt = `あなたは熱心で教え上手なAI家庭教師です。以下の問題について学習集中講座を実施してください。\n\n【問題】: ${q.question}\n`;
  if (q.image && q.image.trim() !== '') {
    prompt += `※この問題には添付画像（Base64形式）があります： ${q.image}\n`;
  }
  prompt += `【解答】: ${q.answer}\n【補足】: ${q.note || 'なし'}\n\n以下の手順・構成でわかりやすく講座を行ってください。\n①自力で解くためのヒントの提示\n②解答までの解答プロセスやポイントの説明\n③重要項目のまとめ（表や箇条書きを活用）\n④理解度を確かめるサクッと答えられる確認問題（1〜2問）と解答`;

  copyAndOpenGemini(prompt);
}

// TEST FEATURE
let currentTestQuestions = [];

function generateNewTest() {
  if (store.questions.length < 1) {
    alert("テストを作成するには問題を1問以上登録してください。");
    return;
  }

  const shuffled = [...store.questions].sort(() => Math.random() - 0.5);
  currentTestQuestions = shuffled.slice(0, Math.min(5, shuffled.length));

  const testNumber = store.pastTests.length + 1;
  renderTestLayout(currentTestQuestions, testNumber);
  
  const testRecord = {
    id: "test_" + Date.now(),
    number: testNumber,
    date: new Date().toLocaleString('ja-JP'),
    questions: currentTestQuestions
  };
  store.pastTests.unshift(testRecord);
  saveStore();
  renderPastTests();

  document.getElementById('testArea').classList.remove('hidden');
}

function renderTestLayout(questions, testNum = 1) {
  document.getElementById('testPrintTitle').textContent = `第 ${testNum} 回 テスト`;
  document.getElementById('testPrintDate').textContent = "実施日: " + new Date().toLocaleDateString('ja-JP');
  
  const container = document.getElementById('testPrintRowsContainer');
  container.innerHTML = '';

  questions.forEach((q, idx) => {
    const row = document.createElement('div');
    row.className = "grid grid-cols-12 gap-3 pb-6 border-b border-slate-300 items-start";
    
    row.innerHTML = `
      <div class="col-span-8 flex items-start gap-3">
        <span class="font-bold text-slate-900 flex-shrink-0 pt-0.5">問${idx + 1}</span>
        <div class="flex-1 space-y-2">
          <p class="font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">${escapeHtml(q.question)}</p>
          ${q.image && q.image.trim() !== '' ? `<div><img src="${q.image}" class="max-h-24 rounded border border-slate-300 object-contain"></div>` : ''}
        </div>
      </div>
      <div class="col-span-4 h-16 border-b-2 border-dotted border-slate-400 flex items-end justify-center pb-1">
      </div>
    `;
    container.appendChild(row);
  });
}

function downloadTestPDF() {
  const element = document.getElementById('pdfPrintTarget');
  const opt = {
    margin:       [0.2, 0.2, 0.2, 0.2],
    filename:     `スタディコレクション_テスト_${Date.now()}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

function renderPastTests() {
  const list = document.getElementById('pastTestList');
  if (!list) return;
  list.innerHTML = '';

  if (store.pastTests.length === 0) {
    list.innerHTML = `<div class="text-slate-400 text-center font-bold py-4">過去問履歴はありません</div>`;
    return;
  }

  store.pastTests.forEach((t) => {
    const card = document.createElement('div');
    card.className = "bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-2";
    card.innerHTML = `
      <div>
        <h4 class="font-bold text-slate-800">第 ${t.number || 1} 回 テスト</h4>
        <p class="text-xs text-slate-500">${t.date} (${t.questions.length}問)</p>
      </div>
      <div class="flex gap-2">
        <button onclick="viewPastTestDetail('${t.id}')" class="duo-btn duo-btn-purple text-xs px-3 py-2 rounded-xl">内容閲覧</button>
        <button onclick="reprintTest('${t.id}')" class="duo-btn duo-btn-blue text-xs px-3 py-2 rounded-xl">再表示/印刷</button>
        <button onclick="deletePastTest('${t.id}')" class="duo-btn duo-btn-red text-xs px-2 py-2 rounded-xl"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    `;
    list.appendChild(card);
  });
  if (window.lucide) window.lucide.createIcons();
}

function viewPastTestDetail(testId) {
  const t = store.pastTests.find(item => item.id === testId);
  if (!t) return;

  const modalContent = document.getElementById('pastTestModalContent');
  modalContent.innerHTML = '';

  t.questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = "bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2";
    item.innerHTML = `
      <div class="font-bold text-slate-700">問 ${idx + 1}: ${escapeHtml(q.question)}</div>
      ${q.image && q.image.trim() !== '' ? `<div><img src="${q.image}" class="max-h-24 rounded border border-slate-200 object-contain"></div>` : ''}
      <div class="text-sm font-bold text-emerald-600">正解: ${escapeHtml(q.answer)}</div>
      ${q.note ? `<div class="text-xs text-slate-500">補足: ${escapeHtml(q.note)}</div>` : ''}
      <button onclick="askAIGeneric('${escapeHtml(q.question)}', '${escapeHtml(q.answer)}')" class="duo-btn duo-btn-purple text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 mt-2">
        <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Ask AI (コピーしてGeminiへ)
      </button>
    `;
    modalContent.appendChild(item);
  });

  document.getElementById('pastTestModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closePastTestModal() {
  document.getElementById('pastTestModal').classList.add('hidden');
}

function deletePastTest(testId) {
  if (confirm("この過去問履歴を削除しますか？")) {
    store.pastTests = store.pastTests.filter(t => t.id !== testId);
    saveStore();
    renderPastTests();
  }
}

function reprintTest(testId) {
  const t = store.pastTests.find(item => item.id === testId);
  if (t) {
    currentTestQuestions = t.questions;
    renderTestLayout(currentTestQuestions, t.number || 1);
    document.getElementById('testArea').classList.remove('hidden');
    window.scrollTo({ top: document.getElementById('testArea').offsetTop, behavior: 'smooth' });
  }
}

function askAIGeneric(question, answer) {
  const prompt = `問題「${question}」（解答：「${answer}」）の重要項目と解説を丁寧にまとめてください。`;
  copyAndOpenGemini(prompt);
}

// Utility
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}