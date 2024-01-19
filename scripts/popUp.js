document.getElementById("viewlivepage").addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("index.html"),
  });
});
