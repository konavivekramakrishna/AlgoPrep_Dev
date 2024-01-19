document.addEventListener("DOMContentLoaded", function () {
  const beginGithubOAuthProcess = {
    init() {
      this.clientId = "9c31b60a94f973b3b90b";
      this.authUrl = "https://github.com/login/oauth/authorize";
      this.redirectUrl = "https://github.com/";
    },

    githubOAuth() {
      this.init();

      let url = `${this.authUrl}?client_id=${this.clientId}&scope=repo&redirect_uri=${this.redirectUrl}`;

      chrome.tabs.create(
        {
          url,
          active: true,
        },
        function () {
          window.close();
        }
      );
    },
  };

  const authButton = document.getElementById("authButton");

  if (authButton) {
    authButton.addEventListener("click", () => {
      beginGithubOAuthProcess.githubOAuth();
    });
  }

  isAuth().then((token) => {
    if (token === true) {
      document.getElementById("authButton").style.display = "none";
    }
  });
});

async function isAuth() {
  let res = await chrome.storage.local.get(["isAuthAlgoPrep"]);
  return res.isAuthAlgoPrep;
}

async function getAlgoToken() {
  let res = await chrome.storage.local.get(["token"]);
  return res.algoPrepToken;
}
