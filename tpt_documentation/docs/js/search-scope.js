(function () {
  // Define search scopes
  const SCOPES = [
    { key: "all",    label: "All",               match: null },
    { key: "hub",    label: "TPT Hub",           match: "products_documentation/tpt_hub/" },
    { key: "social", label: "TPT Social Trading",match: "products_documentation/tpt_social_trading/" }
  ];

  const STORAGE_KEY = "tpt-search-scope";
  const getScope = () => localStorage.getItem(STORAGE_KEY) || "all";
  const setScope = (k) => localStorage.setItem(STORAGE_KEY, k);

  // Normalize paths for matching
  function normalizePath(href) {
    const url = new URL(href, window.location.href);
    return url.pathname.replace(/^\/+/, "");
  }
  function normFrag(frag) {
    return (frag || "").replace(/^\/+/, "");
  }

  function ensureScopeUI() {
    const form = document.querySelector(".md-search__form");
    if (!form || form.querySelector("#tpt-scope")) return;

    form.style.position = "relative";

    // container
    const wrap = document.createElement("div");
    wrap.id = "tpt-scope";
    wrap.className = "tpt-scope";
    wrap.setAttribute("role", "combobox");
    wrap.setAttribute("aria-haspopup", "listbox");
    wrap.setAttribute("aria-expanded", "false");

    // button
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tpt-scope__button";
    btn.setAttribute("aria-label", "Search scope");
    wrap.appendChild(btn);

    // menu
    const list = document.createElement("ul");
    list.className = "tpt-scope__menu";
    list.setAttribute("role", "listbox");
    wrap.appendChild(list);

    // populate
    SCOPES.forEach((s) => {
      const li = document.createElement("li");
      li.className = "tpt-scope__item";
      li.setAttribute("role", "option");
      li.dataset.key = s.key;
      li.tabIndex = -1;
      li.textContent = s.label;
      list.appendChild(li);
    });

    // set current
    const current = SCOPES.find(s => s.key === getScope()) || SCOPES[0];
    btn.textContent = current.label;
    markSelected(list, current.key);

    // events
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
      filterResults();
    });

    // keyboard nav
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
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
        const next = items[Math.min(idx + 1, items.length - 1)];
        next && next.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = items[Math.max(idx - 1, 0)];
        prev && prev.focus();
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
    if (open) setTimeout(() => list.scrollTop = 0, 0);
  }
  function focusFirst(list) {
    const first = list.querySelector(".tpt-scope__item");
    first && first.focus();
  }
  function markSelected(list, key) {
    list.querySelectorAll(".tpt-scope__item").forEach(li => {
      li.classList.toggle("is-selected", li.dataset.key === key);
      li.setAttribute("aria-selected", li.dataset.key === key ? "true" : "false");
    });
  }

  // Annotate results with scope and section
  function annotateResults() {
    const results = document.querySelectorAll(".md-search-result__list > li");
    results.forEach((li) => {
      const link = li.querySelector("a.md-search-result__link");
      if (!link) return;

      if (li.querySelector(".tpt-result-meta")) return;

      const path = normalizePath(link.getAttribute("href") || "");
      let scope = "";
      if (path.includes("products_documentation/tpt_hub/")) scope = "Takeprofit Tech Hub";
      else if (path.includes("products_documentation/tpt_social_trading/")) scope = "Takeprofit Social Trading";

      const hash = (link.getAttribute("href") || "").split("#")[1] || "";
      const section = hash
        ? hash.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "";

      if (!scope && !section) return;

      const meta = document.createElement("div");
      meta.className = "tpt-result-meta";

      if (scope) {
        const badge = document.createElement("span");
        badge.className = `tpt-badge tpt-badge--${scope.toLowerCase()}`;
        badge.textContent = scope;
        meta.appendChild(badge);
      }
      if (section) {
        const sep = document.createElement("span");
        sep.className = "tpt-meta-sep";
        sep.textContent = "›";
        const sec = document.createElement("span");
        sec.className = "tpt-section";
        sec.textContent = section;
        meta.appendChild(sep);
        meta.appendChild(sec);
      }

      const article = li.querySelector(".md-search-result__article");
      (article || li).appendChild(meta);
    });
  }

  // Filter by selected scope
  function filterResults() {
    const rule = SCOPES.find((s) => s.key === getScope()) || SCOPES[0];
    const frag = normFrag(rule.match);

    const results = document.querySelectorAll(".md-search-result__list > li");
    results.forEach((li) => {
      const link = li.querySelector("a.md-search-result__link");
      if (!link) return;
      const path = normalizePath(link.getAttribute("href") || "");
      const show = !frag || path.includes(frag);
      li.style.display = show ? "" : "none";
    });

    annotateResults();
  }

  // Observe results for changes
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

    // 🔹 Re-filter after typing in search
    const searchInput = document.querySelector('.md-search__input');
    if (searchInput) {
      let timer;
      searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          filterResults();
        }, 100);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("md-content-updated", init);
})();