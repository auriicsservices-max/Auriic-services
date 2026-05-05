import { saveTrainingCV } from "../src/services/trainingService.ts";

async function run() {
  const data = {
    "name": "Bryan Christian",
    "email": "bryanjchristian@gmail.com",
    "phone": "201-838-5004",
    "location": "Dumont, NJ",
    "sociallinks": "https://www.linkedin.com/in/bryan-c-99b3841a2",
    "summary": "Operations-driven Project Manager with over 15 years of experience leading large-scale telecom, network infrastructure, and technology integration projects.",
    "skills": [
      "Partner & Vendor Operations",
      "Program Delivery",
      "Fiber & Network Infrastructure",
      "Technical Project Management",
      "Process Optimization",
      "Cost & Risk Management",
      "KPI Development",
      "Cross-Functional Collaboration"
    ],
    "experience": [
      {
        "company": "Samsung – TeleWorld Solutions",
        "job_title": "Senior Project Manager – Telecom Infrastructure",
        "location": "Ridgefield Park, NJ",
        "start_date": "Aug 2021",
        "end_date": "Mar 2025",
        "responsibilities": [
          "Led multi-partner fiber and 5G network deployment programs across the NY Metro region.",
          "Implemented scalable processes that increased project velocity and reduced rework rates by 25%."
        ]
      }
    ],
    "education": [
      {
        "institution": "Saint Peter’s University",
        "location": "Jersey City, NJ",
        "degree": "Coursework in Biology and Telecommunications Systems"
      }
    ],
    "certifications": [
      "PMP Certification – In Progress",
      "OSHA 10-Hour Safety Training",
      "CCNA",
      "CWNA Training Completed"
    ],
    "ats_score": 90,
    "missing_keywords": ["Program Management"],
    "suggestions": ["Add metrics"]
  };
  await saveTrainingCV(data, "system-admin");
  console.log("CV saved successfully");
}

run();
