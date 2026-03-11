chrome.webNavigation.onHistoryStateUpdated.addListener(
  function (details) {
    if (details.frameId !== 0) return;

    chrome.scripting.insertCSS({
      target: { tabId: details.tabId },
      files: ["style.css"],
    });

    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: ["content.js"],
    });
  },
  {
    url: [
      {
        hostEquals: "github.com",
        pathPrefix: "/resumecompanion/",
        pathContains: "/actions/runs/",
      },
    ],
  }
);
