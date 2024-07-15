(() => {
    checkCandidateExistsInCrm();

    const mainHeader = document.querySelector(
        "#a11y-main-content > div.resume-header-title > h2"
    );

    function insertCandidateExistsAlert() {
        const candidateExistsEl = document.createElement("p");
        candidateExistsEl.classList.add("candidat_exists_alert");
        candidateExistsEl.textContent = "Есть в CRM";
        mainHeader.insertAdjacentElement("afterend", candidateExistsEl);
    }

    function checkCandidateExistsInCrm() {
        const resumeId = getResumeId();
        chrome.runtime.sendMessage(
            {
                requestType: "checkCandidateExistsInCrm",
                resumeId,
            },
            (response) => {
                if (response.success && response.result) {
                    setTimeout(insertCandidateExistsAlert, 500);
                }
            }
        );
    }

    function getResumeId() {
        const url = document.location.href;
        const id = url.substring(url.lastIndexOf("/") + 1).split("?")[0];
        return id;
    }
})();
