(function () {
  "use strict";

  const POLL_INTERVAL = 1000;
  const MAX_POLLS = 30;
  const BUTTON_CLASS = "tag-copy-btn";

  // Matches git-describe tags like "2.12.1-57-gf1b9212" or simple semver like "2.16.0"
  // Used to find tags in sidebar job names like "2.16.0 builder" or "2.12.1-57-gf1b9212 auth"
  const TAG_PATTERN = /^(\d+\.\d+\.\d+(?:-\d+-g[0-9a-f]{7,})?)\s+\w+/;

  // Matches tags in main content headings like "production / 2.16.0 builder summary"
  const HEADING_TAG_PATTERN =
    /(?:staging|production)\s*\/\s*(\d+\.\d+\.\d+(?:-\d+-g[0-9a-f]{7,})?)/;

  // Matches tags in docker image references like "dg-builder:2.16.0"
  const DOCKER_TAG_PATTERN = /dg-\w+:(\d+\.\d+\.\d+(?:-\d+-g[0-9a-f]{7,})?)/;

  function getSidebarPane() {
    return document.querySelector(
      '.PageLayout-pane, [data-target="split-page-layout.pane"]'
    );
  }

  /**
   * Extract the build tag by scanning sidebar job names.
   * Jobs under a group look like: "get-build-tag", "env-check", "2.16.0 builder", "2.16.0 auth"
   * We look for the tag pattern in those job labels.
   */
  function extractTagFromSidebar() {
    const pane = getSidebarPane();
    if (!pane) return null;

    // Look through all text nodes / links in the sidebar
    const elements = pane.querySelectorAll("a, span, div");
    for (const el of elements) {
      const text = el.textContent.trim();
      const match = text.match(TAG_PATTERN);
      if (match) {
        return match[1];
      }
    }

    // Fallback: scan main content headings (e.g., "production / 2.16.0 builder summary")
    const headings = document.querySelectorAll("h2");
    for (const h of headings) {
      const match = h.textContent.match(HEADING_TAG_PATTERN);
      if (match) return match[1];
    }

    // Fallback: scan docker image tags in code blocks
    const codeBlocks = document.querySelectorAll("code, pre, .markdown-body");
    for (const block of codeBlocks) {
      const match = block.textContent.match(DOCKER_TAG_PATTERN);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Find all group header elements in the sidebar.
   * These are the collapsible group titles like "staging" or "production".
   * Returns an array of { element, name } objects.
   */
  function findGroupHeaders() {
    const pane = getSidebarPane();
    if (!pane) return [];

    const results = [];

    // The React-rendered sidebar has group headers as buttons or spans.
    // We look for leaf text nodes that match known group patterns.
    // Group headers typically are direct text elements with no tag-like content.
    const candidates = pane.querySelectorAll("button, span, div, h2, h3");
    for (const el of candidates) {
      const directText = getDirectText(el).trim();
      // Group names are single words like "staging", "production"
      // They won't contain "/" or digits at the start
      if (
        directText &&
        /^[a-z][a-z0-9_-]*$/i.test(directText) &&
        !TAG_PATTERN.test(directText) &&
        isGroupHeader(el, directText)
      ) {
        // Avoid duplicates - don't add if parent is already added
        if (!results.some((r) => r.element.contains(el) || el.contains(r.element))) {
          results.push({ element: el, name: directText });
        }
      }
    }

    return results;
  }

  function isGroupHeader(el, text) {
    const lower = text.toLowerCase();
    return lower === "staging" || lower === "production";
  }

  function getDirectText(el) {
    let text = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text;
  }

  function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).catch(function () {
      // Fallback for contexts where clipboard API is not available
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    });
  }

  function createCopyButton(tag) {
    const btn = document.createElement("button");
    btn.className = BUTTON_CLASS;
    btn.title = "Copy tag: " + tag;
    btn.setAttribute("aria-label", "Copy tag " + tag + " to clipboard");

    btn.innerHTML =
      '<svg class="copy-icon" aria-hidden="true" height="14" viewBox="0 0 16 16" version="1.1" width="14" fill="currentColor">' +
      '<path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>' +
      '<path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>' +
      "</svg>" +
      '<svg class="check-icon" aria-hidden="true" height="14" viewBox="0 0 16 16" version="1.1" width="14" fill="currentColor" style="display:none;">' +
      '<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>' +
      "</svg>";

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      copyToClipboard(tag).then(function () {
        var copyIcon = btn.querySelector(".copy-icon");
        var checkIcon = btn.querySelector(".check-icon");
        copyIcon.style.display = "none";
        checkIcon.style.display = "inline-block";
        btn.classList.add("copied");

        setTimeout(function () {
          copyIcon.style.display = "inline-block";
          checkIcon.style.display = "none";
          btn.classList.remove("copied");
        }, 2000);
      });
    });

    return btn;
  }

  function injectButtons() {
    // Already injected?
    if (document.querySelectorAll("." + BUTTON_CLASS).length > 0) return true;

    var tag = extractTagFromSidebar();
    if (!tag) return false;

    var headers = findGroupHeaders();
    if (headers.length === 0) return false;

    var injected = false;
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      var el = header.element;
      var btn = createCopyButton(tag);

      // Insert to the left of the group header text element
      var parent = el.parentElement;
      if (parent) {
        parent.insertBefore(btn, el);
      }
      injected = true;
    }

    return injected;
  }

  // Poll until the sidebar is loaded (React renders it async)
  var pollCount = 0;
  var pollTimer = setInterval(function () {
    pollCount++;
    if (injectButtons() || pollCount >= MAX_POLLS) {
      clearInterval(pollTimer);
    }
  }, POLL_INTERVAL);

  // Also observe DOM changes for SPA navigation
  var observer = new MutationObserver(function () {
    if (document.querySelectorAll("." + BUTTON_CLASS).length === 0) {
      injectButtons();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
