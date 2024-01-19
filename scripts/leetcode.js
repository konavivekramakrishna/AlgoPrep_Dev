const languages = {
  Java: ".java",
  Python: ".py",
  "C++": ".cpp",
  JavaScript: ".js",
  Erlang: ".erl",
  TypeScript: ".ts",
  Swift: ".swift",
  "MS SQL Server": ".sql",
  "C#": ".cs",
  MySQL: ".sql",
  Racket: ".rkt",
  Kotlin: ".kt",
  PHP: ".php",
  Ruby: ".rb",
  Go: ".go",
  Dart: ".dart",
  Rust: ".rs",
  Elixir: ".ex",
  Oracle: ".sql",
  Python3: ".py",
  Javascript: ".js",
  Scala: ".scala",
  C: ".c",
};

const obs1 = new MutationObserver(function (_mutations, observer) {
  const submitButton = document.querySelector(
    '[data-e2e-locator="console-submit-button"]'
  );

  if (submitButton) {
    observer.disconnect();

    submitButton.addEventListener("click", () => func());
  }
});

async function func() {
  let iterations = 0;

  const intervalId = setInterval(async () => {
    try {
      if (await isSolutionAccepted()) {
        await getFromLeetCodeApi();

        // await createOrUpdateSolutionFile(solutionObj);

        clearInterval(intervalId);
      } else {
        iterations++;
        if (iterations > 20) {
          console.log("solution_is_not_accepted after 10 attempts");
          clearInterval(intervalId);
        }
      }
    } catch (err) {
      console.log("Error:", err);
      clearInterval(intervalId);
    }
  }, 1000);
}

setTimeout(() => {
  obs1.observe(document.body, {
    childList: true,
    subtree: true,
  });
}, 2100);

async function isSolutionAccepted() {
  const acceptedElem = document.querySelectorAll(
    '[data-e2e-locator="submission-result"]'
  );

  if (acceptedElem[0]) {
    console.log(acceptedElem[0]);

    return true;
  }
  return false;
}

console.log("its leetcode");

async function getFromLeetCodeApi() {
  try {
    let submissionId = await getSubmissionId();
    const submissionDetailsQuery = {
      query:
        "\n    query submissionDetails($submissionId: Int!) {\n  submissionDetails(submissionId: $submissionId) {\n    runtime\n    runtimeDisplay\n    runtimePercentile\n    runtimeDistribution\n    memory\n    memoryDisplay\n    memoryPercentile\n    memoryDistribution\n    code\n    timestamp\n    statusCode\n    lang {\n      name\n      verboseName\n    }\n    question {\n      questionId\n    title\n    titleSlug\n    content\n    difficulty\n    }\n    notes\n    topicTags {\n      tagId\n      slug\n      name\n    }\n    runtimeError\n  }\n}\n    ",
      variables: { submissionId },
      operationName: "submissionDetails",
    };

    const options = {
      method: "POST",
      headers: {
        cookie: document.cookie,
        "content-type": "application/json",
      },
      body: JSON.stringify(submissionDetailsQuery),
    };

    const data = await fetch("https://leetcode.com/graphql/", options)
      .then((res) => {
        if (!res.ok) {
          console.log(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((res) => res.data.submissionDetails);

    let emailValue = "";

    let userNameValue = "";

    let tokenValue = "";

    await chrome.storage.local.get(["email"]).then((result) => {
      emailValue = result.email;
      console.log(`Retrieved email value: ${emailValue}`);
    });

    await chrome.storage.local.get(["username"]).then((result) => {
      userNameValue = result.username;
      console.log(`Retrieved username value: ${userNameValue}`);
    });

    await chrome.storage.local.get(["token"]).then((result) => {
      tokenValue = result.token;
      console.log(`Retrieved tokenValue  : ${tokenValue}`);
    });

    let temp = {
      lang: languages[data.lang.verboseName],
      tagArray: await getTopicTags(),
      solutionCode: data.code,
      question: data.question,
      submissionId,
      username: userNameValue,
      email: emailValue,
      token: tokenValue,
    };

    console.log("new data from LeetCode API and formatted:", temp);

    await createOrUpdateSolutionFile(temp);

    return temp;
  } catch (error) {
    console.log("Error fetching data from LeetCode API:", error);
  }
}

async function getTopicTags() {
  // get all elems with href starting with "/tag/"

  const tagAnchorElems = document.querySelectorAll('a[href^="/tag/"]');

  const tagArray = Array.from(tagAnchorElems).map((elem) => {
    const href = elem.getAttribute("href");

    const tagName = href.replace("/tag/", "");

    return tagName.replace("/", "");
  });

  return tagArray;
}

async function getSubmissionId() {
  const submissionNode = document.getElementsByClassName("text-label-r");

  if (submissionNode.length > 0) {
    const urlParts = submissionNode[0].baseURI.split("/");
    urlParts.pop();

    const submissionId = urlParts.pop();

    return submissionId;
  } else {
    console.log("submission node not found");
    return "";
  }
}

// github functions

async function createOrUpdateSolutionFile(solutionObj) {
  let githubApi = "https://api.github.com/repos";

  let url = `${githubApi}/${solutionObj.username}/AlgoPrep/${solutionObj.question.titleSlug}/${solutionObj.question.titleSlug}.${solutionObj.lang}`;

  let folderInfo = await getFolderInfo(url, solutionObj.token);

  if (folderInfo.sha) {
    console.log("already folder exists");
    // should   solution.py
  } else {
    console.log("trying to create");

    // should pass content,filename,type

    await createFile(
      solutionObj,
      solutionObj.question.content,
      `README`,
      `.md`
    );
    await createFile(
      solutionObj,
      solutionObj.solutionCode,
      solutionObj.question.titleSlug,
      solutionObj.lang
    );
  }
}

async function getFolderInfo(url, token) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.log("err ->", response);
  }
  return await response.json();
}

async function createFile(createFileObj, content, fileName, type) {
  const url = `https://api.github.com/repos/${createFileObj.username}/AlgoPrep/contents/${createFileObj.question.titleSlug}/${fileName}${type}`;
  const encodedContent = btoa(content);

  const body = {
    message: `solved ${createFileObj.question.title}`,
    content: encodedContent,
    branch: "main",
    committer: {
      name: createFileObj.username,
      email: createFileObj.email ?? "notimportantupdatesonly@gmail.com",
    },
  };

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer  ${createFileObj.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.log(response);
      console.log(
        `Failed to create: ${response.status} ${response.statusText}`
      );
    } else {
      const data = await response.json();
      console.log(`File created. SHA: ${data.content.sha}`);
    }
  } catch (error) {
    console.log(error);
  }
}
