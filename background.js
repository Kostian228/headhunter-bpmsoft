const clientId =
    "RF82RT46RGGVA96H0QBIBML84E4STR4K0RMQ4188B6EBNQU2Q4SA4NQ8Q7GA7TPJ";
const clientSecret =
    "V3FPUROINRRDBD9P6EN3UJFLNC21LB2TNEGNTETERRRRTR96SPS3HQDISGEHNE29";
const tokenUrl = "https://hh.ru/oauth/token";

//chrome.storage.sync.clear();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.requestType === "saveCandidateInCrm") {
        chrome.cookies.get(
            { url: request.crmAddress, name: "BPMCSRF" },
            function (csrfToken) {
                getResumeRequest(
                    request.resumeId,
                    request.crmAddress,
                    csrfToken,
                    sendResponse
                );
            }
        );
        return true;
    }
    if (request.requestType === "authorizeInHh") {
        navigateToAuthorizeInHhPage(clientId);
        return true;
    }
    if (request.requestType === "refreshHhAccessToken") {
        refreshAccessToken(tokenUrl, request, hhRuRefreshToken);
        return true;
    }
});

function getResumeRequest(resumeId, crmAddress, csrfToken, sendResponse) {
    chrome.storage.sync.get(["hhRuAccessToken"], (items) => {
        const url = `${crmAddress}rest/CgrHeadhunterIntegrationService/GetResume`;
        const accessToken = items.hhRuAccessToken;
        const requestBody = {
            accessToken,
            resumeId,
        };
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
                sendResponse(json);
            });
    });
}

chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceivedCallBack,
    { urls: ["https://hh.ru/oauth/authorize?response_type=code*"] },
    ["responseHeaders"]
);

function onHeadersReceivedCallBack(details) {
    if (details.statusCode === 302) {
        const location = details.responseHeaders.find(
            (header) => header.name === "location"
        )?.value;
        if (location) {
            const authorizationCode = location.split("code=")[1];
            getAccessToken(tokenUrl, clientId, clientSecret, authorizationCode);
        }
    }
}

function sendTokenRequest(url) {
    fetch(url, {
        method: "POST",
    })
        .then((response) => {
            console.log(response);
            return response.json();
        })
        .then((json) => {
            console.log(json);
            saveAccessToken(json);
        });
}

function saveAccessToken(accessTokenResponse) {
    let tokenExpDate = new Date();
    tokenExpDate.setSeconds(
        tokenExpDate.getSeconds() + accessTokenResponse.expires_in
    );
    chrome.storage.sync.set({
        hhRuAccessToken: accessTokenResponse.access_token,
        hhRuAccessTokenExpDate: tokenExpDate.getTime(),
        hhRuRefreshToken: accessTokenResponse.refresh_token,
    });
}

function getAccessToken(tokenUrl, clientId, clientSecret, authorizationCode) {
    const url = `${tokenUrl}?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${authorizationCode}`;
    sendTokenRequest(url);
}

function refreshAccessToken(tokenUrl, refreshToken) {
    const url = `${tokenUrl}?grant_type=refresh_token&refresh_token=${refreshToken}`;
    sendTokenRequest(url);
}

function navigateToAuthorizeInHhPage(clientId) {
    const tokenUrl = `https://hh.ru/oauth/authorize?response_type=code&client_id=${clientId}`;
    chrome.tabs.create({ url: tokenUrl, selected: true }, (tab) => {});
}
