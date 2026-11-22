
(function () {

    // ---------- STORAGE KEYS ----------
    const TRANSACTION_KEY = "personalLedgerTransactions";
    const PROFILE_KEY = "personalLedgerUser";

    // ---------- LOAD SAVED DATA ----------
    function loadData(key, fallback) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (error) {
            console.error("Storage loading error:", error);
            return fallback;
        }
    }

    let transactions = loadData(TRANSACTION_KEY, []);
    let userName = loadData(PROFILE_KEY, "");
    let currentType = "expense";

    // ---------- ELEMENTS ----------
    const form = document.getElementById("entryForm");
    const descInput = document.getElementById("desc");
    const categoryInput = document.getElementById("category");
    const amountInput = document.getElementById("amount");
    const errorMsg = document.getElementById("errorMsg");

    const toggleButtons = document.querySelectorAll(".toggle-type button");
    const ledgerBody = document.getElementById("ledgerBody");
    const filterSelect = document.getElementById("filterSelect");

    const profileModal = document.getElementById("profileModal");
    const profileForm = document.getElementById("profileForm");
    const profileNameInput = document.getElementById("profileName");
    const editProfileBtn = document.getElementById("editProfile");
    const userNameElement = document.getElementById("userName");

    // ---------- SAVE FUNCTIONS ----------
    function saveTransactions() {
        try {
            localStorage.setItem(
                TRANSACTION_KEY,
                JSON.stringify(transactions)
            );
            return true;
        } catch (error) {
            console.error("Unable to save transactions:", error);
            errorMsg.textContent = "Unable to save data. Check browser storage.";
            return false;
        }
    }

    function saveProfile() {
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(userName));
            return true;
        } catch (error) {
            console.error("Unable to save profile:", error);
            return false;
        }
    }

    // ---------- USER PROFILE ----------
    function updateProfileDisplay() {
        userNameElement.textContent = userName;
    }

    function openProfileModal() {
        profileNameInput.value = userName;
        profileModal.classList.remove("hidden");
        profileNameInput.focus();
    }

    function closeProfileModal() {
        profileModal.classList.add("hidden");
    }

    profileForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const name = profileNameInput.value.trim();

        if (!name) {
            profileNameInput.focus();
            return;
        }

        const oldName = userName;
        userName = name;

        if (!saveProfile()) {
            userName = oldName;
            alert("Profile could not be saved. Please try again.");
            return;
        }

        updateProfileDisplay();
        closeProfileModal();
    });

    editProfileBtn.addEventListener("click", openProfileModal);

    // First-time profile setup
    if (!userName || typeof userName !== "string") {
        userName = "";
        openProfileModal();
    } else {
        updateProfileDisplay();
        closeProfileModal();
    }

    // ---------- CURRENCY FORMAT ----------
    const inr = (num) => {
        return "₹" + Math.abs(num).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // ---------- TYPE TOGGLE ----------
    toggleButtons.forEach(btn => {

        btn.addEventListener("click", function () {

            toggleButtons.forEach(b => b.classList.remove("active"));

            btn.classList.add("active");

            currentType = btn.dataset.type;

        });

    });

    // ---------- ADD TRANSACTION ----------
    form.addEventListener("submit", function (e) {

        e.preventDefault();

        const desc = descInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (!desc) {
            errorMsg.textContent = "Please enter a description.";
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            errorMsg.textContent = "Please enter a valid amount.";
            return;
        }

        errorMsg.textContent = "";

        const transaction = {
            id: Date.now(),
            desc: desc,
            category: categoryInput.value,
            amount: amount,
            type: currentType,
            date: new Date().toISOString()
        };

        transactions.push(transaction);

        if (!saveTransactions()) {
            transactions.pop();
            return;
        }

        form.reset();

        currentType = "expense";

        toggleButtons.forEach(btn => {
            btn.classList.toggle(
                "active",
                btn.dataset.type === "expense"
            );
        });

        render();

    });

    // ---------- FILTER ----------
    filterSelect.addEventListener("change", render);

    // ---------- DELETE TRANSACTION ----------
    function deleteTransaction(id) {

        const previousTransactions = transactions;

        transactions = transactions.filter(t => t.id !== id);

        if (!saveTransactions()) {
            transactions = previousTransactions;
            return;
        }

        render();
    }

    // ---------- DATE FORMAT ----------
    function formatDate(date) {

        const parsedDate = new Date(date);

        if (isNaN(parsedDate.getTime())) {
            return "Invalid date";
        }

        return parsedDate.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    }

    // ---------- SAFE HTML ----------
    function escapeHtml(str) {

        const div = document.createElement("div");
        div.textContent = String(str);

        return div.innerHTML;

    }

    // ---------- RENDER DASHBOARD ----------
    function render() {

        const income = transactions
            .filter(t => t.type === "income")
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expense = transactions
            .filter(t => t.type === "expense")
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const balance = income - expense;

        // Summary
        document.getElementById("incomeValue").textContent = inr(income);

        document.getElementById("expenseValue").textContent = inr(expense);

        const balanceElement = document.getElementById("balanceValue");

        balanceElement.textContent =
            (balance < 0 ? "-" : "") + inr(balance);

        balanceElement.style.color =
            balance < 0 ? "var(--debit)" : "var(--ink)";

        // Filter
        const filter = filterSelect.value;

        const visibleTransactions = transactions.filter(t =>
            filter === "all" || t.type === filter
        );

        ledgerBody.innerHTML = "";

        // Empty State
        document.getElementById("emptyState").style.display =
            visibleTransactions.length === 0 ? "block" : "none";

        // Running Balance
        let running = 0;

        const rows = transactions.map(t => {

            running += t.type === "income"
                ? Number(t.amount)
                : -Number(t.amount);

            return {
                transaction: t,
                runningBalance: running
            };

        });

        rows
            .filter(r =>
                filter === "all" || r.transaction.type === filter
            )
            .forEach(r => {

                const t = r.transaction;

                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td class="desc-cell">
                        ${escapeHtml(t.desc)}
                        <span class="cat">
                            ${escapeHtml(t.category)}
                        </span>
                    </td>

                    <td>${formatDate(t.date)}</td>

                    <td class="num amt ${t.type === "income" ? "credit" : "debit"}">
                        ${t.type === "income" ? "+" : "−"}
                        ${inr(Number(t.amount))}
                    </td>

                    <td class="num running">
                        ${r.runningBalance < 0 ? "-" : ""}
                        ${inr(r.runningBalance)}
                    </td>

                    <td>
                        <button
                            class="del-btn"
                            data-id="${Number(t.id)}"
                            aria-label="Delete entry">
                            ✕
                        </button>
                    </td>
                `;

                ledgerBody.appendChild(tr);

            });

    }

    // ---------- DELETE BUTTON EVENTS ----------
    ledgerBody.addEventListener("click", function (e) {

        const button = e.target.closest(".del-btn");

        if (!button) return;

        const id = Number(button.dataset.id);

        if (confirm("Are you sure you want to delete this entry?")) {
            deleteTransaction(id);
        }

    });

    // ---------- INITIAL LOAD ----------
    render();

})();
