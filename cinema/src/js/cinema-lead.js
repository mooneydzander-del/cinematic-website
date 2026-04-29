console.log("Cinema lead JS loaded");

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("cinema-lead-form");

  if (!form) {
    console.error("Cinema lead form not found");
    return;
  }

  console.log("Cinema lead form found and submit handler attached");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    console.log("Cinema lead form submitted");

    const formData = new FormData(form);

    const payload = {
      full_name:       String(formData.get("full_name")       || "").trim(),
      business_name:   String(formData.get("business_name")   || "").trim(),
      email:           String(formData.get("email")           || "").trim(),
      phone:           String(formData.get("phone")           || "").trim(),
      business_type:   String(formData.get("business_type")   || "").trim(),
      website_url:     String(formData.get("website_url")     || "").trim(),
      offer:           String(formData.get("offer")           || "").trim(),
      goal:            String(formData.get("goal")            || "").trim(),
      ad_platform:     String(formData.get("ad_platform")     || "").trim(),
      target_audience: String(formData.get("target_audience") || "").trim(),
      project_price:   Number(formData.get("project_price")   || 0),
      notes:           String(formData.get("notes")           || "").trim()
    };

    console.log("Submitting Cinema lead", payload);

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
  });
});
