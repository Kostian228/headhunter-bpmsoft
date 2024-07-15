const clientId =
    "RF82RT46RGGVA96H0QBIBML84E4STR4K0RMQ4188B6EBNQU2Q4SA4NQ8Q7GA7TPJ";
const clientSecret =
    "V3FPUROINRRDBD9P6EN3UJFLNC21LB2TNEGNTETERRRRTR96SPS3HQDISGEHNE29";
const tokenUrl = "https://hh.ru/oauth/token";
const defaultCrmAddress = "https://autorec.crmgu.ru/";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.requestType === "saveCandidateInCrm") {
        saveCandidateInCrm(request.resumeId, sendResponse);
        return true;
    }
    if (request.requestType === "authorizeInHh") {
        navigateToAuthorizeInHhPage(clientId);
        return true;
    }
    if (request.requestType === "checkCandidateExistsInCrm") {
        checkCandidateExistsInCrm(request.resumeId, sendResponse);
        return true;
    }
});

async function saveCandidateInCrm(resumeId, sendResponse) {
    const settings = await chrome.storage.sync.get([
        "crmAddress",
        "hhRuRefreshToken",
        "hhRuAccessTokenExpDate",
    ]);
    const crmAddress = settings.crmAddress || defaultCrmAddress;
    chrome.cookies.get(
        { url: crmAddress, name: "BPMCSRF" },
        async function (csrfToken) {
            if (checkIsTokenExpired(settings.hhRuAccessTokenExpDate)) {
                await refreshAccessToken(tokenUrl, settings.hhRuRefreshToken);
            }
            const items = await chrome.storage.sync.get(["hhRuAccessToken"]);
            const accessToken = items.hhRuAccessToken;
            const requestBody = {
                accessToken,
                resumeId,
            };
            await getResumeRequest(
                requestBody,
                crmAddress,
                csrfToken,
                sendResponse
            );
        }
    );
}

async function checkCandidateExistsInCrm(resumeId, sendResponse) {
    const settings = await chrome.storage.sync.get(["crmAddress"]);
    const crmAddress = settings.crmAddress || defaultCrmAddress;
    if (!crmAddress) {
        throw new Error("Crm address cannot be empty.");
    }
    const checkCandidateExistsInCrmUrl = `${crmAddress}rest/CgrCheckCandidateExistsService/CheckCandidateExists/${resumeId}`;
    fetch(checkCandidateExistsInCrmUrl)
        .then((response) => response.json())
        .then((json) => {
            console.log(json);
            sendResponse(json);
        });
}

async function getResumeRequest(
    requestBody,
    crmAddress,
    csrfToken,
    sendResponse
) {
    const url = `${crmAddress}rest/CgrHeadhunterIntegrationService/GetResume`;
    fetch(url, {
        method: "POST",
        headers: {
            BPMCSRF: csrfToken?.value,
            "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify(requestBody),
    })
        .then((response) => {
            console.log(response);
            if (response.redirected) {
                sendResponse({
                    redirectToLoginInCrmPage: true,
                    redirectUrl: `${crmAddress}Login/Login.html`,
                });
                return;
            }
            return response.json();
        })
        .catch((error) => {
            const errorMessage = error.toString();
            sendResponse({
                success: false,
                errorInfo: {
                    message: errorMessage,
                },
            });
            throw new Error(errorMessage);
        })
        .then((json) => {
            console.log(json);
            sendResponse({
                success: true,
                redirectUrl: `${crmAddress}Nui/ViewModule.aspx#CardModuleV2/CgrCandidatePage/edit/${json.candidateId}`,
            });
        });
}

function checkIsTokenExpired(accessTokenExpDate) {
    const currentDate = new Date().getTime() / 1000;
    return currentDate >= accessTokenExpDate;
}

chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceivedCallBack,
    { urls: ["https://hh.ru/oauth/authorize?response_type=code*"] },
    ["responseHeaders"]
);

async function onHeadersReceivedCallBack(details) {
    if (details.statusCode === 302) {
        const location = details.responseHeaders.find(
            (header) => header.name === "location"
        )?.value;
        if (location) {
            const authorizationCode = location.split("code=")[1];
            await getAccessToken(
                tokenUrl,
                clientId,
                clientSecret,
                authorizationCode
            );
        }
    }
}

async function sendTokenRequest(url) {
    const response = await fetch(url, {
        method: "POST",
    });
    console.log(response);
    const json = await response.json();
    console.log(json);
    if (json.access_token) {
        saveAccessToken(json);
    }
}

function saveAccessToken(accessTokenResponse) {
    let tokenExpDate = new Date();
    tokenExpDate.setSeconds(
        tokenExpDate.getSeconds() + accessTokenResponse.expires_in
    );
    chrome.storage.sync.set({
        hhRuAccessToken: accessTokenResponse.access_token,
        hhRuAccessTokenExpDate: tokenExpDate.getTime() / 1000,
        hhRuRefreshToken: accessTokenResponse.refresh_token,
    });
}

async function getAccessToken(
    tokenUrl,
    clientId,
    clientSecret,
    authorizationCode
) {
    const url = `${tokenUrl}?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${authorizationCode}`;
    await sendTokenRequest(url);
}

async function refreshAccessToken(tokenUrl, refreshToken) {
    const url = `${tokenUrl}?grant_type=refresh_token&refresh_token=${refreshToken}`;
    await sendTokenRequest(url);
}

function navigateToAuthorizeInHhPage(clientId) {
    const tokenUrl = `https://hh.ru/oauth/authorize?response_type=code&client_id=${clientId}`;
    chrome.tabs.create({ url: tokenUrl, selected: true }, (tab) => {});
}
