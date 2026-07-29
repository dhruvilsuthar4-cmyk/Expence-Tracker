

(function(){
  let transactions = [];
  let currentType = 'expense';
  let idCounter = 1;

  const form = document.getElementById('entryForm');
  const descInput = document.getElementById('desc');
  const categoryInput = document.getElementById('category');
  const amountInput = document.getElementById('amount');
  const errorMsg = document.getElementById('errorMsg');
  const toggleButtons = document.querySelectorAll('.toggle-type button');
  const ledgerBody = document.getElementById('ledgerBody');
  const filterSelect = document.getElementById('filterSelect');

  const inr = (num) => '₹' + Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = descInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if(!desc){
      errorMsg.textContent = 'Please enter a description.';
      return;
    }
    if(isNaN(amount) || amount <= 0){
      errorMsg.textContent = 'Please enter an amount greater than ₹0.';
      return;
    }
    errorMsg.textContent = '';

    transactions.push({
      id: idCounter++,
      desc,
      category: categoryInput.value,
      amount,
      type: currentType,
      date: new Date()
    });

    form.reset();
    currentType = 'expense';
    toggleButtons.forEach(b => b.classList.toggle('active', b.dataset.type === 'expense'));
    render();
  });

  filterSelect.addEventListener('change', render);

  function deleteTransaction(id){
    transactions = transactions.filter(t => t.id !== id);
    render();
  }

  function formatDate(d){
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  }

  function render(){
    const income = transactions.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
    const balance = income - expense;

    document.getElementById('incomeValue').textContent = inr(income);
    document.getElementById('expenseValue').textContent = inr(expense);
    const balEl = document.getElementById('balanceValue');
    balEl.textContent = (balance < 0 ? '-' : '') + inr(balance);
    balEl.style.color = balance < 0 ? 'var(--debit)' : 'var(--ink)';

    const filter = filterSelect.value;
    const visible = transactions.filter(t => filter === 'all' || t.type === filter);

    ledgerBody.innerHTML = '';
    document.getElementById('emptyState').style.display = transactions.length === 0 ? 'block' : 'none';

    // running balance computed over full chronological list, but only rendered rows shown per filter
    
    let running = 0;
    const rows = transactions.map(t => {
      running += (t.type === 'income' ? t.amount : -t.amount);
      return { t, runningAtThisPoint: running };
    });

    rows
      .filter(r => filter === 'all' || r.t.type === filter)
      .forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="desc-cell">${escapeHtml(r.t.desc)}<span class="cat">${escapeHtml(r.t.category)}</span></td>
          <td>${formatDate(r.t.date)}</td>
          <td class="num amt ${r.t.type === 'income' ? 'credit' : 'debit'}">${r.t.type === 'income' ? '+' : '−'} ${inr(r.t.amount)}</td>
          <td class="num running">${r.runningAtThisPoint < 0 ? '-' : ''}${inr(r.runningAtThisPoint)}</td>
          <td><button class="del-btn" data-id="${r.t.id}" aria-label="Delete entry">✕</button></td>
        `;
        ledgerBody.appendChild(tr);
      });

    ledgerBody.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteTransaction(parseInt(btn.dataset.id, 10)));
    });
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  render();
})();
