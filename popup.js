const defaultCrmAddress = "https://autorec.crmgu.ru/";

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
        if (!activeTab.url.includes("hh.ru/resume")) {
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

function checkIsTokenExpired(accessTokenExpDate) {
    const currentDate = new Date().getTime() / 1000;
    return currentDate >= accessTokenExpDate;
}

function refreshHhAccessToken(hhRuRefreshToken) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                requestType: "refreshHhAccessToken",
                hhRuRefreshToken,
            },
            (response) => {
                resolve(response);
            }
        );
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
    const settings = await chrome.storage.sync.get([
        "crmAddress",
        "hhRuRefreshToken",
        "hhRuAccessTokenExpDate",
    ]);
    const crmAddress = settings.crmAddress || defaultCrmAddress;
    const refreshToken = settings.hhRuRefreshToken;
    const accessTokenExpDate = settings.hhRuAccessTokenExpDate;
    if (checkIsTokenExpired(accessTokenExpDate)) {
        await refreshHhAccessToken(refreshToken);
    }
    const resumeId = await getResumeId();
    if (!crmAddress) {
        throw new Error("Адрес ЦРМ не может быть пустым");
    }
    saveCandidateInCrm(crmAddress, resumeId);
}

function saveCandidateInCrm(crmAddress, resumeId) {
    chrome.runtime.sendMessage(
        {
            requestType: "saveCandidateInCrm",
            crmAddress,
            resumeId,
        },
        (response) => {
            console.log(response);
            if (response?.success) {
                alert("Кандидат успешно сохранен!");
                window.open(
                    `${crmAddress}Nui/ViewModule.aspx#CardModuleV2/CgrCandidatePage/edit/${response.candidateId}`
                );
            } else if (response.redirectToLoginInCrmPage) {
                window.open(response.redirectUrl);
            } else {
                console.log(response?.errorInfo);
                alert("Ошибка сохранения кандидата.");
            }
        }
    );
}

function hideSaveCandidateBlock() {
    authInHhBlock.classList.remove("hidden");
    saveCandidateInCrmBlock.classList.add("hidden");
}
