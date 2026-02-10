(function () {
  "use strict";

  const POLL_INTERVAL = 1000;
  const MAX_POLLS = 30;
  const BUTTON_ID = "staging-tag-copy-btn";

  function extractTagFromSidebar() {
    // Strategy 1: Look in the sidebar job list for job names matching the pattern
    // Job names in sidebar look like: "staging / get-build-tag", "2.12.1-57-gf1b9212 builder", etc.
    // The tag appears in job names under the "staging" group like "2.12.1-57-gf1b9212 builder"
    const sidebarLinks = document.querySelectorAll(
      '[data-target="react-partial.reactRoot"] a, .PageLayout-pane a'
    );
    for (const link of sidebarLinks) {
      const text = link.textContent.trim();
      // Match patterns like "2.12.1-57-gf1b9212 builder" or "2.12.1-57-gf1b9212 auth"
      const match = text.match(
        /(\d+\.\d+\.\d+-\d+-g[0-9a-f]{7,})\s+\w+/
      );
      if (match) {
        return match[1];
      }
    }

    // Strategy 2: Look in the main content job summary headings
    // These have text like "staging / 2.12.1-57-gf1b9212 builder summary"
    const headings = document.querySelectorAll("h2");
    for (const h of headings) {
      const text = h.textContent.trim();
      const match = text.match(
        /staging\s*\/\s*(\d+\.\d+\.\d+-\d+-g[0-9a-f]{7,})/
      );
      if (match) {
        return match[1];
      }
    }

    // Strategy 3: Look in any element text for the tag pattern near "staging"
    const allText = document.body.innerText;
    const globalMatch = allText.match(
      /staging\s*\/\s*(\d+\.\d+\.\d+-\d+-g[0-9a-f]{7,})/
    );
    if (globalMatch) {
      return globalMatch[1];
    }

    // Strategy 4: Look for the tag pattern in docker image tags
    // e.g. "dg-builder:2.12.1-57-gf1b9212"
    const codeBlocks = document.querySelectorAll("code, pre, .markdown-body");
    for (const block of codeBlocks) {
      const text = block.textContent;
      const match = text.match(
        /dg-\w+:(\d+\.\d+\.\d+-\d+-g[0-9a-f]{7,})/
      );
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  function findStagingGroupHeader() {
    // The sidebar is rendered by React. The job groups have headers.
    // Look for elements that contain "staging" as a group label in the sidebar pane.

    // Strategy 1: Look for the group label rendered by the React partial in the sidebar
    const pane = document.querySelector(
      '.PageLayout-pane, [data-target="split-page-layout.pane"]'
    );
    if (!pane) return null;

    // Look for buttons/links that act as group toggles with text "staging"
    const candidates = pane.querySelectorAll(
      'button, [role="treeitem"], [role="button"], h2, h3, span, div'
    );
    for (const el of candidates) {
      // Check direct text content (not including children deeply)
      const directText = getDirectText(el).trim().toLowerCase();
      if (directText === "staging") {
        return el;
      }
    }

    // Strategy 2: broader search - any clickable element in pane with "staging"
    const allInPane = pane.querySelectorAll("*");
    for (const el of allInPane) {
      const text = el.textContent.trim();
      if (
        text === "staging" &&
        el.children.length === 0
      ) {
        return el;
      }
    }

    return null;
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

  function createCopyButton(tag) {
    const btn = document.createElement("button");
    btn.id = BUTTON_ID;
    btn.className = "staging-tag-copy-btn";
    btn.title = `Copy tag: ${tag}`;
    btn.setAttribute("aria-label", `Copy tag ${tag} to clipboard`);

    btn.innerHTML = `
      <svg class="copy-icon" aria-hidden="true" height="14" viewBox="0 0 16 16" version="1.1" width="14" fill="currentColor">
        <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path>
        <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
      </svg>
      <svg class="check-icon" aria-hidden="true" height="14" viewBox="0 0 16 16" version="1.1" width="14" fill="currentColor" style="display:none;">
        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
      </svg>
    `;

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(tag).then(
        function () {
          const copyIcon = btn.querySelector(".copy-icon");
          const checkIcon = btn.querySelector(".check-icon");
          copyIcon.style.display = "none";
          checkIcon.style.display = "inline-block";
          btn.classList.add("copied");

          setTimeout(function () {
            copyIcon.style.display = "inline-block";
            checkIcon.style.display = "none";
            btn.classList.remove("copied");
          }, 2000);
        },
        function (err) {
          console.error("Failed to copy tag:", err);
          // Fallback: use textarea approach
          const textarea = document.createElement("textarea");
          textarea.value = tag;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);

          const copyIcon = btn.querySelector(".copy-icon");
          const checkIcon = btn.querySelector(".check-icon");
          copyIcon.style.display = "none";
          checkIcon.style.display = "inline-block";
          btn.classList.add("copied");

          setTimeout(function () {
            copyIcon.style.display = "inline-block";
            checkIcon.style.display = "none";
            btn.classList.remove("copied");
          }, 2000);
        }
      );
    });

    return btn;
  }

  function injectButton() {
    // Don't inject twice
    if (document.getElementById(BUTTON_ID)) return true;

    const tag = extractTagFromSidebar();
    if (!tag) return false;

    const header = findStagingGroupHeader();
    if (!header) return false;

    const btn = createCopyButton(tag);

    // Insert the button to the left of the staging header
    const parent = header.parentElement;
    if (parent) {
      parent.insertBefore(btn, header);
    } else {
      header.prepend(btn);
    }

    return true;
  }

  // Poll until the sidebar is loaded (React renders it async)
  let pollCount = 0;
  const pollTimer = setInterval(function () {
    pollCount++;
    if (injectButton() || pollCount >= MAX_POLLS) {
      clearInterval(pollTimer);
    }
  }, POLL_INTERVAL);

  // Also observe DOM changes for SPA navigation
  const observer = new MutationObserver(function () {
    if (!document.getElementById(BUTTON_ID)) {
      injectButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
