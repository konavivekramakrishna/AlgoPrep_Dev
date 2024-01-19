let solstatus = false;
let problemobject = {};
const codeLanguage = {
  C: ".c",
  "C++": ".cpp",
  "C#": ".cs",
  Java: ".java",
  Python: ".py",
  Python3: ".py",
  JavaScript: ".js",
  Javascript: ".js",
};

console.log("GeeksForGeeks Script Loaded");

function getSolutionLanguage() {
  const languageElement =
    document.getElementsByClassName("divider text")[0]?.innerText;
  const lang = languageElement.split("(")[0].trim();
  if (lang.length > 0 && codeLanguage[lang]) {
    return codeLanguage[lang];
  }
  return null;
}

function getProblemTitle() {
  const problemTitleElement = document.querySelector(
    '[class^="problems_header_content__title"] > h3'
  )?.innerText;
  if (problemTitleElement != null) {
    return problemTitleElement;
  }
  return "";
}

function getProblemDifficulty() {
  const problemDifficultyElement = document.querySelectorAll(
    '[class^="problems_header_description"]'
  )[0].children[0]?.innerText;
  if (problemDifficultyElement != null) {
    return problemDifficultyElement;
  }
  return "";
}

function getProblemStatement() {
  const problemStatementElement = document.querySelector(
    '[class^="problems_problem_content"]'
  );
  return `${problemStatementElement.outerHTML}`;
}

function getCompanyAndTopicTags(problemStatement) {
 
  const divTags = document.querySelectorAll('a[href^="/explore/?cat"]');

  // Create an array to store the content of each div tag
  const contentArray = [];

  // Extract and store the content of each div tag in the array
  divTags.forEach((divTag) => {
    contentArray.push(divTag.textContent.trim());
  });

  return contentArray;
}

const obs = new MutationObserver(function (_mutations, _observer) {
  const submitButton = document.querySelector(".problems_submit_button__6QoNQ");

 // console.log("DOMContentLoaded event triggered");

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      solstatus = false;
      const ps = setInterval(() => {
        const resultContainer = document.querySelector(
          ".problems_content_pane__nexJa"
        );

        if (
          resultContainer &&
          resultContainer.innerHTML.includes("Problem Solved Successfully")
        ) {
          const solutionLanguage = getSolutionLanguage();
          const problemTitle = getProblemTitle();
          const problemDifficulty = getProblemDifficulty();
          const problemStatement = getProblemStatement();
          const topics = getCompanyAndTopicTags(problemStatement);

          clearInterval(ps);

          let solution = null;

          chrome.runtime.sendMessage(
            { type: "getUserSolution" },
            async function (res) {
              let timesol = setInterval(async function () {
                solution = document.getElementById(
                  "extractedUserSolution"
                )?.innerText;
                if (solstatus == false && solution != null) {
                  console.log("Solution Language:", solutionLanguage);
                  console.log("Problem Title:", problemTitle);
                  console.log("Problem Difficulty:", problemDifficulty);
                  console.log("Problem Statement:", problemStatement);
                  console.log("Solution:", solution);
                  console.log("Topics:", topics);

                  let emailValue = "";

                  let userNameValue = "";

                  let tokenValue = "";

                  await chrome.storage.local.get(["email"]).then((result) => {
                    emailValue = result.email;
                    console.log(`Retrieved email value: ${emailValue}`);
                  });

                  await chrome.storage.local
                    .get(["username"])
                    .then((result) => {
                      userNameValue = result.username;
                      console.log(`Retrieved username value: ${userNameValue}`);
                    });

                  await chrome.storage.local.get(["token"]).then((result) => {
                    tokenValue = result.token;
                    console.log(`Retrieved tokenValue  : ${tokenValue}`);
                  });

                  const question = {
                    questionId: "1",
                    title: problemTitle,
                    titleSlug: problemTitle,
                    content: problemStatement,
                    difficulty: problemDifficulty,
                  };

                  problemobject.lang = solutionLanguage;
                  problemobject.tagArray = topics;
                  problemobject.solutionCode = solution;
                  problemobject.question = question;
                  problemobject.username = userNameValue;
                  problemobject.email = emailValue;
                  problemobject.token = tokenValue;

                  console.log(problemobject);

                  await createOrUpdateSolutionFile(problemobject);
                }
                chrome.runtime.sendMessage({ type: "deleteNode" }, function () {
                  console.log("deleteNode - Message Sent.");
                });
                clearInterval(timesol);
              }, 1000);
            }
          );
        } else {
          console.log("Problem not solved or result container not found");
        }
      }, 1000);
    });
  } else {
   // console.log("Submit button not found");
  }
});

setTimeout(() => {
  obs.observe(document.body, { childList: true, subtree: true });
}, 1000);

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
