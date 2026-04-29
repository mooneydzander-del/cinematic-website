document.addEventListener("DOMContentLoaded", function () {
  console.log("Cinema global lead handler loaded");

  async function submitCinemaLead(form, event) {
    if (event) event.preventDefault();

    var formData = new FormData(form);

    /* Guard: skip if primary name field is empty (let inline validation handle it) */
    var nameCheck = String(formData.get("full_name") || formData.get("name") || "").trim();
    if (!nameCheck) return;

    console.log("Cinema lead form submitted", form);

    /* Detect gate-style 'contact' field (could be email or phone) */
    var contactVal = String(formData.get("contact") || "").trim();
    var contactIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactVal);

    var payload = {
      full_name:       String(formData.get("full_name")       || formData.get("name")                         || "").trim(),
      business_name:   String(formData.get("business_name")   || formData.get("business") || formData.get("businessName") || "").trim(),
      email:           String(formData.get("email")           || (contactIsEmail ? contactVal : "")            || "").trim(),
      phone:           String(formData.get("phone")           || (!contactIsEmail && contactVal ? contactVal : "") || "").trim(),
      business_type:   String(formData.get("business_type")   || "").trim(),
      website_url:     String(formData.get("website_url")     || formData.get("website")                       || "").trim(),
      offer:           String(formData.get("offer")           || "Get My Landing Page Plan").trim(),
      goal:            String(formData.get("goal")            || formData.get("details") || formData.get("message") || "not specified").trim(),
      ad_platform:     String(formData.get("ad_platform")     || formData.get("runningAds")                    || "").trim(),
      target_audience: String(formData.get("target_audience") || "").trim(),
      project_price:   Number(formData.get("project_price")   || 0),
      notes:           String(formData.get("notes")           || formData.get("message")                       || "").trim()
    };

    console.log("Submitting Cinema lead", payload);

    try {
      const response = await fetch("/api/cinema-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      console.log("Cinema lead response status", response.status);

      const result = await response.json();
      console.log("Cinema lead response data", result);

      if (!response.ok) {
        throw new Error(result.error || result.message || "Submission failed");
      }

      alert("Thank you! Your landing page request was received. We'll follow up shortly.");
      form.reset();
    } catch (error) {
      console.error("Cinema lead submit failed", error);
      alert("Something went wrong. Please try again or contact us directly.");
    }
  }

  document.addEventListener("submit", function (event) {
    const form = event.target;

    if (
      form &&
      form.tagName === "FORM" &&
      (
        form.id === "cinema-lead-form" ||
        form.classList.contains("cinema-lead-form") ||
        form.querySelector("#cinema-lead-submit") ||
        form.querySelector(".cinema-lead-submit")
      )
    ) {
      submitCinemaLead(form, event);
    }
  }, true);

  document.addEventListener("click", function (event) {
    const button = event.target.closest("#cinema-lead-submit, .cinema-lead-submit");

    if (!button) return;

    const form = button.closest("form");

    if (!form) {
      console.error("Cinema lead submit button clicked but no parent form found");
      return;
    }

    submitCinemaLead(form, event);
  }, true);
});
