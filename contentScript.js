(() => {
    checkCandidateExistsInCrm();

    const mainHeader = document.querySelector(
        "#a11y-main-content > div.resume-header-title > h2"
    );

    function insertCandidateExistsAlert(candidatePageUrl) {
        const candidateExistsEl = document.createElement("a");
        candidateExistsEl.classList.add("candidat_exists_alert");
        candidateExistsEl.textContent = "Есть в CRM";
        candidateExistsEl.href = candidatePageUrl;
        candidateExistsEl.target = "_blank"
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
                    const candidatePageUrl = `${response.crmAddress}Nui/ViewModule.aspx#CardModuleV2/CgrCandidatePage/edit/${response.candidateId}`;
                    setTimeout(() => insertCandidateExistsAlert(candidatePageUrl), 500);
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
