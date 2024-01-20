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

// Here, a Mutationobs1erver is created, which is a feature in the Web API that provides a way to react to changes in the DOM (Document Object Model). It takes a callback function as an argument, which will be invoked whenever a change in the DOM is detected.

//This method is used to find the first element in the document that matches the specified CSS selector. ooking for an element that has an attribute named data-e2e-locator with a value of "console-submit-button".

// data-e2e-locator is a custom data attribute. Custom data attributes are attributes in HTML that start with the prefix "data-" and can be used to store private data for the page or application.
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
      console.error("Error:", err);
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
          throw new Error(`HTTP error! Status: ${res.status}`);
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
    console.error("Error fetching data from LeetCode API:", error);
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

    let dataObjJson = await getDataJSON(
      solutionObj.username,
      solutionObj.token
    );

    console.log("dataObjJSON", dataObjJson);

    if (dataObjJson == false) {
      console.log("trying to create data.json file if not exists");

      await createDataJSON(solutionObj);
    } else {
      let { sha, content } = dataObjJson;
      console.log("sha", sha);
      console.log("conetent", content);

      console.log("should update data json file");
      await updateDataJSON(solutionObj, sha, content);
    }
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
    return false;
  }

  const data = await response.json();
  return data.sha; // Return the 'sha' property from the JSON response
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
      throw new Error(
        `Failed to create: ${response.status} ${response.statusText}`
      );
    } else {
      const data = await response.json();
      console.log(`File created. SHA: ${data.content.sha}`);
    }
  } catch (error) {
    console.error(error);
  }
}

// date
// questiontitle
// platform
// difficulty
// tags
// questiondescription
// code
// questionlink
// githublink

async function createDataJSON(createFileObj) {
  const url = `https://api.github.com/repos/${createFileObj.username}/AlgoPrep/contents/data.json`;

  let tempQuestionName = createFileObj.question.titleSlug;

  let content = {
    [tempQuestionName]: {
      date: new Date().toDateString(),
      questiontitle: createFileObj.question.titleSlug,
      code: createFileObj.solutionCode,
      question: question.content,
      platform: "leetcode",
      difficulty: createFileObj.question.difficulty,
      tags: createFileObj.tagArray,
      qlink: `https://leetcode.com/problems/${createFileObj.question.titleSlug}`,
      githublink: `https://github.com${createFileObj.username}/AlgoPrep/tree/main/${createFileObj.question.titleSlug}`,
    },
  };

  const encodedContent = btoa(JSON.stringify(content));

  const body = {
    message: `created json file`,
    content: encodedContent,
    branch: "main",
    committer: {
      name: createFileObj.username ?? "codewithunknown",
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
      throw new Error(
        `Failed to create: ${response.status} ${response.statusText}`
      );
    } else {
      const data = await response.json();
      console.log(`File created. SHA: ${data.content.sha}`);
    }
  } catch (error) {
    console.error(error);
  }
}

async function getDataJSON(username, token) {
  const url = `https://api.github.com/repos/${username}/AlgoPrep/contents/data.json`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer  ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // File not found
        return false;
      } else {
        console.log(response);
        throw new Error(
          `Failed to fetch: ${response.status} ${response.statusText}`
        );
      }
    } else {
      const data = await response.json();

      // Decode content from base64 and parse JSON
      const content = JSON.parse(atob(data.content));

      return {
        sha: data.sha,
        content: content,
      };
    }
  } catch (error) {
    console.error(error);
    return null; // Handle the error as needed in your application
  }
}

async function updateDataJSON(createFileObj, sha, alreadyContent) {
  const url = `https://api.github.com/repos/${createFileObj.username}/AlgoPrep/contents/data.json`;

  let tempQuestionName = createFileObj.question.titleSlug;

  alreadyContent[tempQuestionName] = {
    date: new Date().toDateString(),
    questiontitle: createFileObj.question.titleSlug,
    code: createFileObj.solutionCode,
    question: createFileObj.question.content,
    platform: "leetcode",
    difficulty: createFileObj.question.difficulty,
    tags: createFileObj.tagArray,
    qlink: `https://leetcode.com/problems/${createFileObj.question.titleSlug}`,
    githublink: `https://github.com/${createFileObj.username}/AlgoPrep/tree/main/${createFileObj.question.titleSlug}`,
  };

  const encodedContent = btoa(JSON.stringify(alreadyContent));

  const body = {
    message: `updated json file`,
    content: encodedContent,
    branch: "main",
    committer: {
      name: createFileObj.username ?? "codewithunknown",
      email: createFileObj.email ?? "notimportantupdatesonly@gmail.com",
    },
    sha: sha, // Pass the sha correctly for updating
  };

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createFileObj.token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.log(response);
      throw new Error(
        `Failed to update: ${response.status} ${response.statusText}`
      );
    } else {
      const data = await response.json();
      console.log(`File updated. New SHA: ${data.content.sha}`);
    }
  } catch (error) {
    console.error(error);
  }
}
