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

// leetcode.js:84 <span data-e2e-locator=​"submission-result">​Accepted​</span>​
// leetcode.js:127 Retrieved email value: notimportantupdatesonly@gmail.com
// leetcode.js:132 Retrieved email value: codewithunknown
// leetcode.js:145 new data from LeetCode API and formatted: {lang: '.py', tagArray: Array(3), solutionCode: 'class Solution:\n    def containsDuplicate(self, nu…\n            hashset.add(n)\n        return False\n', question: {…}, submissionId: '1150284898', …}
// leetcode.js:52 sol obj {lang: '.py', tagArray: Array(3), solutionCode: 'class Solution:\n    def containsDuplicate(self, nu…\n            hashset.add(n)\n        return False\n', question: {…}, submissionId: '1150284898', …}email: "notimportantupdatesonly@gmail.com"lang: ".py"question: content: "<p>Given an integer array <code>nums</code>, return <code>true</code> if any value appears <strong>at least twice</strong> in the array, and return <code>false</code> if every element is distinct.</p>\n\n<p>&nbsp;</p>\n<p><strong class=\"example\">Example 1:</strong></p>\n<pre><strong>Input:</strong> nums = [1,2,3,1]\n<strong>Output:</strong> true\n</pre><p><strong class=\"example\">Example 2:</strong></p>\n<pre><strong>Input:</strong> nums = [1,2,3,4]\n<strong>Output:</strong> false\n</pre><p><strong class=\"example\">Example 3:</strong></p>\n<pre><strong>Input:</strong> nums = [1,1,1,3,3,4,3,2,4,2]\n<strong>Output:</strong> true\n</pre>\n<p>&nbsp;</p>\n<p><strong>Constraints:</strong></p>\n\n<ul>\n\t<li><code>1 &lt;= nums.length &lt;= 10<sup>5</sup></code></li>\n\t<li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>\n</ul>\n"difficulty: "Easy"questionId: "217"title: "Contains Duplicate"titleSlug: "contains-duplicate"[[Prototype]]: ObjectsolutionCode: "class Solution:\n    def containsDuplicate(self, nums: List[int]) -> bool:\n        hashset = set()\n\n        for n in nums:\n            if n in hashset:\n                return True\n            hashset.add(n)\n        return False\n"submissionId: "1150284898"tagArray: Array(3)0: "array"1: "hash-table"2: "sorting"length: 3[[Prototype]]: Array(0)username: "codewithunknown"[[Prototype]]: Object

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
