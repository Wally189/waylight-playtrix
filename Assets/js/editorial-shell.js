(() => {
  const root = document.documentElement;
  root.classList.add("js");

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const datetimeNodes = Array.from(document.querySelectorAll("[data-datetime]"));
  const getOrdinal = (day) => {
    const tens = day % 100;
    if (tens >= 11 && tens <= 13) {
      return "th";
    }
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const updateDateTime = () => {
    if (datetimeNodes.length === 0) {
      return;
    }
    const now = new Date();
    const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });
    const month = now.toLocaleDateString("en-GB", { month: "long" });
    const day = now.getDate();
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const formatted = `${weekday} ${day}${getOrdinal(day)} ${month} ${year} ${hours}:${minutes}`;
    datetimeNodes.forEach((node) => {
      node.textContent = formatted;
    });
  };

  updateDateTime();
  if (datetimeNodes.length > 0) {
    window.setInterval(updateDateTime, 60000);
  }

  const getLinkSignature = (value) => {
    try {
      const url = new URL(value, window.location.href);
      let path = (url.pathname || "/").toLowerCase();
      if (path.endsWith("/")) {
        path += "index.html";
      }
      return {
        path,
        file: path.split("/").pop() || "index.html",
      };
    } catch {
      return null;
    }
  };

  const currentLocation = getLinkSignature(window.location.href);
  document.querySelectorAll(".site-nav a, .footer-nav a, .home-quicklinks-nav a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
      return;
    }
    const targetLocation = getLinkSignature(href);
    if (!currentLocation || !targetLocation) {
      return;
    }
    if (targetLocation.path === currentLocation.path || targetLocation.file === currentLocation.file) {
      link.setAttribute("aria-current", "page");
    }
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileHeaderMedia = window.matchMedia("(max-width: 980px)");
  const siteHeader = document.querySelector(".site-header");

  const updateHeaderCondensed = () => {
    if (!siteHeader) {
      return;
    }
    if (!mobileHeaderMedia.matches) {
      siteHeader.classList.remove("is-condensed");
      return;
    }
    siteHeader.classList.toggle("is-condensed", window.scrollY > 40);
  };

  const progressBar = document.querySelector("[data-scroll-progress]");
  const updateProgress = () => {
    if (!progressBar) {
      return;
    }
    const doc = document.documentElement;
    const total = Math.max(1, doc.scrollHeight - window.innerHeight);
    const pct = Math.min(1, Math.max(0, window.scrollY / total));
    progressBar.style.transform = `scaleX(${pct})`;
  };

  let ticking = false;
  const scheduleFrame = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(() => {
      updateProgress();
      updateHeaderCondensed();
      if (!reduceMotion) {
        updateParallax();
      }
      ticking = false;
    });
  };

  const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
  if (revealItems.length > 0) {
    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        {
          threshold: 0.16,
          rootMargin: "0px 0px -8% 0px",
        }
      );

      revealItems.forEach((item) => observer.observe(item));
    }
  }

  const parallaxItems = Array.from(document.querySelectorAll("[data-parallax]"));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const updateParallax = () => {
    const viewportHalf = window.innerHeight / 2;
    parallaxItems.forEach((item) => {
      const layer = item.querySelector("[data-parallax-layer]") || item;
      const speed = Number(item.getAttribute("data-parallax")) || 0.08;
      const rect = item.getBoundingClientRect();

      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        return;
      }

      const offsetFromCenter = rect.top + rect.height / 2 - viewportHalf;
      const translateY = clamp(offsetFromCenter * speed * -0.18, -18, 18);
      layer.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;
    });
  };

  updateProgress();
  updateHeaderCondensed();
  if (!reduceMotion) {
    updateParallax();
  }

  const initMethodAccordions = () => {
    const accordions = Array.from(document.querySelectorAll(".method-accordion"));
    if (accordions.length === 0) {
      return;
    }

    const closeOthers = (active) => {
      accordions.forEach((accordion) => {
        if (accordion !== active) {
          accordion.open = false;
        }
      });
    };

    const shouldStartClosed = accordions.some((accordion) => accordion.hasAttribute("data-start-closed"));
    if (shouldStartClosed) {
      closeOthers(null);
    } else {
      const defaultAccordion = accordions.find((accordion) => accordion.hasAttribute("data-default-open")) || accordions[0];
      closeOthers(defaultAccordion);
      defaultAccordion.open = true;
    }

    accordions.forEach((accordion) => {
      const summary = accordion.querySelector("summary");
      if (!summary) {
        return;
      }

      summary.addEventListener("click", (event) => {
        event.preventDefault();
        const shouldOpen = !accordion.open;
        if (shouldOpen) {
          closeOthers(accordion);
          accordion.open = true;
          return;
        }
        accordion.open = false;
      });
    });

    const openFromHash = () => {
      const hashId = window.location.hash ? window.location.hash.slice(1) : "";
      if (!hashId) {
        return;
      }
      const target = accordions.find((accordion) => accordion.id === hashId);
      if (!target) {
        return;
      }
      closeOthers(target);
      target.open = true;
      target.scrollIntoView({
        block: "start",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
  };

  const initWorkbenchCaseStudies = () => {
    const toggles = Array.from(document.querySelectorAll(".workbench-case-toggle[data-case-toggle]"));
    if (toggles.length === 0) {
      return;
    }

    const getPanelRow = (toggle) => {
      const panelId = toggle.getAttribute("aria-controls");
      if (!panelId) {
        return null;
      }
      return document.getElementById(panelId);
    };

    const setState = (toggle, isOpen) => {
      const panelRow = getPanelRow(toggle);
      const label = toggle.querySelector(".workbench-case-toggle-label");
      const projectRow = toggle.closest(".workbench-project-row");
      toggle.setAttribute("aria-expanded", String(isOpen));
      if (label) {
        label.textContent = isOpen ? "Close" : "View";
      }
      if (panelRow) {
        panelRow.hidden = !isOpen;
      }
      if (projectRow) {
        projectRow.classList.toggle("is-open", isOpen);
      }
    };

    const closeOthers = (activeToggle) => {
      toggles.forEach((toggle) => {
        if (toggle !== activeToggle) {
          setState(toggle, false);
        }
      });
    };

    toggles.forEach((toggle) => {
      setState(toggle, false);
      toggle.addEventListener("click", () => {
        const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";
        if (shouldOpen) {
          closeOthers(toggle);
          setState(toggle, true);
          return;
        }
        setState(toggle, false);
      });
    });
  };

  const initPricingServiceDetails = () => {
    const toggles = Array.from(document.querySelectorAll(".pricing-detail-toggle[data-pricing-detail-toggle]"));
    if (toggles.length === 0) {
      return;
    }

    const getPanelRow = (toggle) => {
      const panelId = toggle.getAttribute("aria-controls");
      if (!panelId) {
        return null;
      }
      return document.getElementById(panelId);
    };

    const setState = (toggle, isOpen) => {
      const panelRow = getPanelRow(toggle);
      const label = toggle.querySelector(".pricing-detail-toggle-label");
      const serviceRow = toggle.closest(".pricing-service-row");
      toggle.setAttribute("aria-expanded", String(isOpen));
      if (label) {
        label.textContent = isOpen ? "Close" : "View";
      }
      if (panelRow) {
        panelRow.hidden = !isOpen;
      }
      if (serviceRow) {
        serviceRow.classList.toggle("is-open", isOpen);
      }
    };

    // Keep the interaction quiet by allowing only one expanded service at once.
    const closeOthers = (activeToggle) => {
      toggles.forEach((toggle) => {
        if (toggle !== activeToggle) {
          setState(toggle, false);
        }
      });
    };

    toggles.forEach((toggle) => {
      setState(toggle, false);
      toggle.addEventListener("click", () => {
        const shouldOpen = toggle.getAttribute("aria-expanded") !== "true";
        if (shouldOpen) {
          closeOthers(toggle);
          setState(toggle, true);
          return;
        }
        setState(toggle, false);
      });
    });
  };

  const initJournalAccordion = () => {
    const entries = Array.from(document.querySelectorAll(".journal-entry"));
    if (entries.length === 0) {
      return;
    }

    const parseEntryDate = (entryId) => {
      const match = (entryId || "").match(/^entry-(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) {
        return Number.NEGATIVE_INFINITY;
      }
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      return Date.UTC(year, month, day);
    };

    const getEntryDate = (entry) => {
      const article = entry.querySelector(".chapter-content");
      return parseEntryDate(article?.id || "");
    };

    const entriesHost = document.querySelector(".journal-entries-scroll") || entries[0].parentElement;
    const orderedEntries = entries
      .slice()
      .sort((a, b) => getEntryDate(b) - getEntryDate(a));

    if (entriesHost) {
      orderedEntries.forEach((entry) => {
        entriesHost.append(entry);
      });
    }

    const jumpList = document.querySelector(".journal-index .highlight-grid[role='list']");
    if (jumpList) {
      const jumpItems = Array.from(jumpList.children);
      jumpItems
        .sort((a, b) => {
          const aId = a.querySelector("a[href^='#entry-']")?.getAttribute("href")?.slice(1) || "";
          const bId = b.querySelector("a[href^='#entry-']")?.getAttribute("href")?.slice(1) || "";
          return parseEntryDate(bId) - parseEntryDate(aId);
        })
        .forEach((item) => {
          jumpList.append(item);
        });
    }

    const controls = [];
    orderedEntries.forEach((entry, index) => {
      const layout = entry.querySelector(".chapter-layout");
      const article = entry.querySelector(".chapter-content");
      const heading = entry.querySelector("h3");
      if (!layout || !article || !heading) {
        return;
      }

      const entryId = article.id || `journal-entry-${index + 1}`;
      if (!article.id) {
        article.id = entryId;
      }
      const layoutId = `${entryId}-body`;
      layout.id = layoutId;

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "journal-entry-toggle";
      toggle.setAttribute("aria-controls", layoutId);
      toggle.textContent = heading.textContent || `Entry ${index + 1}`;
      entry.insertBefore(toggle, layout);

      const setExpanded = (isExpanded) => {
        toggle.setAttribute("aria-expanded", String(isExpanded));
        layout.hidden = !isExpanded;
        entry.classList.toggle("is-open", isExpanded);
      };

      const closeOthers = () => {
        controls.forEach((control) => {
          if (control.entry !== entry) {
            control.setExpanded(false);
          }
        });
      };

      toggle.addEventListener("click", () => {
        const shouldExpand = toggle.getAttribute("aria-expanded") !== "true";
        if (shouldExpand) {
          closeOthers();
        }
        setExpanded(shouldExpand);
      });

      controls.push({ entry, article, setExpanded });
    });

    if (controls.length === 0) {
      return;
    }

    controls.forEach((control, index) => {
      control.setExpanded(index === 0);
    });

    const openFromHash = () => {
      const hashId = window.location.hash ? window.location.hash.slice(1) : "";
      if (!hashId) {
        return;
      }
      const target = controls.find((control) => control.article.id === hashId);
      if (!target) {
        return;
      }
      controls.forEach((control) => {
        control.setExpanded(control === target);
      });
      target.entry.scrollIntoView({
        block: "nearest",
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
  };

  const initPricingCurrency = () => {
    const widget = document.querySelector("[data-currency-widget]");
    const priceNodes = Array.from(document.querySelectorAll("[data-price-gbp], [data-price-gbp-min][data-price-gbp-max]"));
    if (!widget || priceNodes.length === 0) {
      return;
    }

    const choiceButtons = Array.from(widget.querySelectorAll("[data-currency-choice]"));
    const noteNode = widget.querySelector("[data-currency-note]");
    const prefKey = "wl-pricing-currency";
    const cacheKey = "wl-gbp-eur-rate-v1";
    const formatters = {
      GBP: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }),
      EUR: new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
    };

    let cachedRate = null;
    let cachedRateDate = "";
    let fetchInFlight = null;

    const modeSuffix = (mode) => {
      if (mode === "monthly") {
        return "per month";
      }
      if (mode === "one-off") {
        return "one-off";
      }
      return "";
    };

    const formatValue = (currency, gbp) => {
      const value = currency === "EUR" ? gbp * cachedRate : gbp;
      return formatters[currency].format(value);
    };

    const setButtonState = (currency) => {
      choiceButtons.forEach((btn) => {
        const isActive = btn.getAttribute("data-currency-choice") === currency;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", String(isActive));
      });
    };

    const setNote = (message) => {
      if (noteNode) {
        noteNode.textContent = message;
      }
    };

    const updatePrices = (currency) => {
      if (currency === "EUR" && !cachedRate) {
        return;
      }

      priceNodes.forEach((node) => {
        const mode = node.getAttribute("data-price-mode") || "";
        const suffix = modeSuffix(mode);
        const minGbp = node.getAttribute("data-price-gbp-min");
        const maxGbp = node.getAttribute("data-price-gbp-max");

        if (minGbp !== null && maxGbp !== null) {
          const minValue = Number(minGbp);
          const maxValue = Number(maxGbp);
          if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
            return;
          }
          const rangeText = `${formatValue(currency, minValue)}-${formatValue(currency, maxValue)}`;
          node.textContent = suffix ? `${rangeText} ${suffix}` : rangeText;
          return;
        }

        const gbp = Number(node.getAttribute("data-price-gbp"));
        if (!Number.isFinite(gbp)) {
          return;
        }

        const amountText = formatValue(currency, gbp);
        node.textContent = suffix ? `${amountText} ${suffix}` : amountText;
      });
    };

    const readRateCache = () => {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) {
          return false;
        }
        const parsed = JSON.parse(raw);
        if (
          !parsed ||
          typeof parsed.rate !== "number" ||
          !Number.isFinite(parsed.rate) ||
          typeof parsed.date !== "string" ||
          typeof parsed.storedAt !== "string"
        ) {
          return false;
        }
        const storedDate = new Date(parsed.storedAt);
        const now = new Date();
        const ageMs = now.getTime() - storedDate.getTime();
        if (!Number.isFinite(ageMs) || ageMs > 24 * 60 * 60 * 1000) {
          return false;
        }
        cachedRate = parsed.rate;
        cachedRateDate = parsed.date;
        return true;
      } catch {
        return false;
      }
    };

    const fetchRate = async () => {
      if (cachedRate) {
        return true;
      }
      if (readRateCache()) {
        return true;
      }
      if (fetchInFlight) {
        return fetchInFlight;
      }

      fetchInFlight = fetch("https://api.frankfurter.app/latest?from=GBP&to=EUR")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Rate request failed");
          }
          return response.json();
        })
        .then((payload) => {
          const rate = Number(payload?.rates?.EUR);
          const date = String(payload?.date || "");
          if (!Number.isFinite(rate) || rate <= 0 || !date) {
            throw new Error("Invalid rate payload");
          }
          cachedRate = rate;
          cachedRateDate = date;
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              rate,
              date,
              storedAt: new Date().toISOString(),
            })
          );
          return true;
        })
        .catch(() => false)
        .finally(() => {
          fetchInFlight = null;
        });

      return fetchInFlight;
    };

    const applyCurrency = async (currency) => {
      if (currency === "GBP") {
        updatePrices("GBP");
        setButtonState("GBP");
        setNote("UK prices shown in GBP.");
        localStorage.setItem(prefKey, "GBP");
        return;
      }

      setButtonState("EUR");
      setNote("Loading latest GBP to EUR rate...");
      const ok = await fetchRate();
      if (!ok || !cachedRate) {
        updatePrices("GBP");
        setButtonState("GBP");
        setNote("Live EUR conversion unavailable right now. Showing UK prices in GBP.");
        localStorage.setItem(prefKey, "GBP");
        return;
      }

      updatePrices("EUR");
      setButtonState("EUR");
      setNote(`Ireland prices shown in EUR. Indicative conversion from ECB reference data (${cachedRateDate}).`);
      localStorage.setItem(prefKey, "EUR");
    };

    choiceButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const currency = button.getAttribute("data-currency-choice");
        if (!currency) {
          return;
        }
        applyCurrency(currency);
      });
    });

    const preferred = localStorage.getItem(prefKey) === "EUR" ? "EUR" : "GBP";
    applyCurrency(preferred);
  };

  const initResponsiveTables = () => {
    const tables = Array.from(document.querySelectorAll(".pricing-table:not(.pricing-services-table)"));
    if (tables.length === 0) {
      return;
    }

    tables.forEach((table) => {
      const labels = Array.from(table.querySelectorAll("thead th")).map((header) =>
        (header.textContent || "").replace(/\s+/g, " ").trim()
      );

      Array.from(table.tBodies).forEach((tbody) => {
        Array.from(tbody.rows).forEach((row) => {
          if (row.classList.contains("pricing-group-row") || row.classList.contains("pricing-detail-row")) {
            return;
          }

          Array.from(row.cells).forEach((cell, index) => {
            if (cell.matches("th[scope='row']")) {
              return;
            }

            const label = labels[index];
            if (label) {
              cell.setAttribute("data-cell-label", label);
            }
          });
        });
      });
    });
  };

  initMethodAccordions();
  initWorkbenchCaseStudies();
  initPricingServiceDetails();
  initJournalAccordion();
  initResponsiveTables();
  initPricingCurrency();

  window.addEventListener("scroll", scheduleFrame, { passive: true });
  window.addEventListener("resize", scheduleFrame);
})();
