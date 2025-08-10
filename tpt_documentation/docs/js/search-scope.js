(function () {
  const SCOPES = [
    { key: "all",    label: "All",                match: null,                                           resultLabel: "" },
    { key: "hub",    label: "TPT Hub",            match: "products_documentation/tpt_hub/",              resultLabel: "Takeprofit tech hub" },
    { key: "social", label: "TPT Social trading", match: "products_documentation/tpt_social_trading/",   resultLabel: "Takeprofit social trading" }
  ];

  const STORAGE_KEY = "tpt-search-scope";
  const getScope = () => localStorage.getItem(STORAGE_KEY) || "all";
  const setScope = (k) => localStorage.setItem(STORAGE_KEY, k);

  function ensureScopeUI() {
    const form = document.querySelector(".md-search__form");
    if (!form || form.querySelector("#tpt-scope")) return;

    form.style.position = "relative";

    const wrap = document.createElement("div");
    wrap.id = "tpt-scope";
    wrap.className = "tpt-scope";
    wrap.setAttribute("role", "combobox");
    wrap.setAttribute("aria-haspopup", "listbox");
    wrap.setAttribute("aria-expanded", "false");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tpt-scope__button";
    btn.setAttribute("aria-label", "Search scope");
    wrap.appendChild(btn);

    const list = document.createElement("ul");
    list.className = "tpt-scope__menu";
    list.setAttribute("role", "listbox");
    wrap.appendChild(list);

    SCOPES.forEach(s => {
      const li = document.createElement("li");
      li.className = "tpt-scope__item";
      li.setAttribute("role", "option");
      li.dataset.key = s.key;
      li.tabIndex = -1;
      li.textContent = s.label;
      list.appendChild(li);
    });

    const current = SCOPES.find(s => s.key === getScope()) || SCOPES[0];
    btn.textContent = current.label;
    markSelected(list, current.key);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(wrap, list, true);
    });

    list.addEventListener("click", (e) => {
      const li = e.target.closest(".tpt-scope__item");
      if (!li) return;
      const key = li.dataset.key;
      setScope(key);
      btn.textContent = SCOPES.find(s => s.key === key).label;
      markSelected(list, key);
      toggleMenu(wrap, list, false);
      filterResults(); // immediate filter on selection
    });

    btn.addEventListener("keydown", (e) => {
      if (["ArrowDown", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        toggleMenu(wrap, list, true);
        focusFirst(list);
      }
    });
    list.addEventListener("keydown", (e) => {
      const items = [...list.querySelectorAll(".tpt-scope__item")];
      const idx = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[Math.min(idx + 1, items.length - 1)]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[Math.max(idx - 1, 0)]?.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        document.activeElement.click();
      } else if (e.key === "Escape") {
        toggleMenu(wrap, list, false);
        btn.focus();
      }
    });

    document.addEventListener("click", () => toggleMenu(wrap, list, false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggleMenu(wrap, list, false);
    });

    form.appendChild(wrap);
  }

  function toggleMenu(wrap, list, open) {
    wrap.setAttribute("aria-expanded", open ? "true" : "false");
    list.classList.toggle("is-open", !!open);
  }

  function focusFirst(list) {
    list.querySelector(".tpt-scope__item")?.focus();
  }

  function markSelected(list, key) {
    list.querySelectorAll(".tpt-scope__item").forEach(li => {
      const selected = li.dataset.key === key;
      li.classList.toggle("is-selected", selected);
      li.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  function normalizePath(path) {
    try { return decodeURIComponent(path).toLowerCase(); }
    catch { return path.toLowerCase(); }
  }
  function normFrag(f) {
    return f.replace(/^\//, "").toLowerCase();
  }

  function filterResults() {
    const rule = SCOPES.find(s => s.key === getScope()) || SCOPES[0];
    const match = rule.match ? normFrag(rule.match) : null;

    document.querySelectorAll('.md-search-result__list > li').forEach(li => {
      const link = li.querySelector('a.md-search-result__link');
      if (!link) return;
      const href = normalizePath(link.getAttribute("href") || "");
      const ok = !match || href.includes(match);
      li.style.display = ok ? "" : "none";
    });

    annotateResults();
  }

  function annotateResults() {
    const currentScope = SCOPES.find(s => s.key === getScope()) || SCOPES[0];
    document.querySelectorAll(".md-search-result__list > li").forEach(li => {
      li.querySelector(".tpt-result-source")?.remove();
      const link = li.querySelector("a.md-search-result__link");
      if (!link) return;

      const href = normalizePath(link.getAttribute("href") || "");
      let label = "";

      if (currentScope.key !== "all") {
        // fixed label from SCOPES
        label = currentScope.resultLabel;
      } else {
        // infer label from matching SCOPES
        const matchScope = SCOPES.find(s => s.match && href.includes(normFrag(s.match)));
        label = matchScope?.resultLabel || "";
      }

      if (label) {
        const meta = document.createElement("div");
        meta.className = "tpt-result-source";
        meta.textContent = label;
        li.querySelector(".md-search-result__article")?.appendChild(meta);
      }
    });
  }

  function observeResults() {
    const container = document.querySelector('[data-md-component="search-results"]');
    if (!container) return;
    const obs = new MutationObserver(filterResults);
    obs.observe(container, { childList: true, subtree: true });
  }

  function init() {
    ensureScopeUI();
    observeResults();
    filterResults();
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("md-content-updated", init);

  // also filter whenever user types
  document.addEventListener("input", (e) => {
    if (e.target.matches(".md-search__input")) filterResults();
  });
})();