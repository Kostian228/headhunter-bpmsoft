const resumeAddresses = [
    "hh.ru/resume",
    "rabota.by/resume",
    "hh1.az/resume",
    "hh.uz/resume",
    "hh.kz/resume",
    "headhunter.ge/resume",
    "headhunter.kg/resume",
];

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
const authInHeadhunterButton = document.getElementById("auth-in-hh-btn");
authInHeadhunterButton.addEventListener("click", navigateToAuthorizeInHhPage);

function onDOMContentLoaded() {
    checkIsAuthorizedInHh().then((result) => {
        if (result) {
            checkActivetabIsResume();
        }
    });
}

function checkActivetabIsResume() {
    getActiveTab().then((activeTab) => {
        const resumeAddress = resumeAddresses.find((a) =>
            activeTab.url.includes(a)
        );
        if (!resumeAddress) {
            saveCandidateInCrmBlock.classList.add("hidden");
            document
                .getElementById("go-to-resume-tab")
                .classList.remove("hidden");
        }
    });
}

function checkIsAuthorizedInHh() {
    return new Promise(function (resolve, reject) {
        chrome.storage.sync.get(["hhRuAccessToken"], function (items) {
            if (!items.hhRuAccessToken) {
                hideSaveCandidateBlock();
                resolve(false);
            }
            resolve(true);
        });
    });
}

function getActiveTab() {
    return new Promise((resolve) => {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                resolve(tabs[0]);
            }
        );
    });
}

function navigateToAuthorizeInHhPage() {
    chrome.runtime.sendMessage({
        requestType: "authorizeInHh",
    });
}

async function getResumeId() {
    const activeTab = await getActiveTab();
    const url = activeTab.url;
    const id = url.substring(url.lastIndexOf("/") + 1).split("?")[0];
    return id;
}

const saveCandidateInCrmButton = document.getElementById(
    "save-candidate-in-crm-btn"
);
saveCandidateInCrmButton.addEventListener("click", async () => {
    await saveCandidateClick();
});

const saveCandidateInCrmBlock = document.getElementById(
    "save-candidate-in-crm"
);
const authInHhBlock = document.getElementById("auth-in-hh");

async function saveCandidateClick() {
    const resumeId = await getResumeId();
    saveCandidateInCrm(resumeId);
}

function saveCandidateInCrm(resumeId) {
    chrome.runtime.sendMessage(
        {
            requestType: "saveCandidateInCrm",
            resumeId,
        },
        (response) => {
            console.log(response);
            if (response) {
                if (response.success) {
                    alert("Кандидат успешно сохранен!");
                    window.open(response.redirectUrl);
                } else if (response.redirectToLoginInCrmPage) {
                    window.open(response.redirectUrl);
                } else {
                    console.log(response.errorInfo);
                    alert("Ошибка сохранения кандидата.");
                }
            }
        }
    );
}

function hideSaveCandidateBlock() {
    authInHhBlock.classList.remove("hidden");
    saveCandidateInCrmBlock.classList.add("hidden");
}
