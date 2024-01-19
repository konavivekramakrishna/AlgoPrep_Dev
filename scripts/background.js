chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
  if (
    tab.url &&
    tab.url.startsWith("https://github.com/?code=") &&
    (await chrome.storage.local.get(["isAuthAlgoPrep"])).isAuthAlgoPrep !== true
  ) {
    let tempCode = String(tab.url).substring(25);
    console.log("code running");

    let data = {
      client_id: "9c31b60a94f973b3b90b",
      client_secret: "06f64fd493f23d6dde818ba8fad82a007f528354",
      code: tempCode,
      redirect_uri: "https://github.com",
    };

    await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((result) => {
        this.accessToken = result.access_token;

        chrome.storage.local.set({
          token: this.accessToken,
        });
        createRepo(this.accessToken);
        setAuthenticatedUserData(this.accessToken);
        chrome.storage.local.set({ isAuthAlgoPrep: true });
      })
      .catch((error) => {
        console.error("Error exchanging code for token:", error);
      });
  }
});

async function createRepo(token) {
  const url = `https://api.github.com/user/repos`;
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
  console.log("inside create");
  const body = JSON.stringify({
    name: "AlgoPrep",

    description:
      "This repository contains  collection of my solutions to various Coding Platforms Data Structures and Algorithms (DSA) problems. - Created using [AlgoPrep](https://github.com/konavivekramakrishna/AlgoPrep_Ex)",
  });
  const response = await fetch(url, { method: "POST", headers, body });
  if (response.status === 201) {
    console.log(`Repository  created successfully.`);
  } else if (response.status === 422) {
    console.log(`Repository  already exists.`);
  } else {
    console.log(`Failed to create repository .`);
  }
}

async function setAuthenticatedUserData(authToken) {
  const apiUrl = "https://api.github.com/user";

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${authToken}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();

      // Check if username and email are not already set in chrome.storage.local
      chrome.storage.local.get(["username", "email"], (result) => {
        if (!result.username) {
          chrome.storage.local.set({ username: userData.login }, () => {
            console.log("username value was set");
          });
        }

        if (!result.email && userData.email) {
          chrome.storage.local.set({ email: userData.email }, () => {
            console.log("email value was set");
          });
        }
      });

      // Return the values if needed
      // return { username: userData.login, email: userData.email };
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    // Return an appropriate value when there's an error
    return null;
  }
}
