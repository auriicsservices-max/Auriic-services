import { saveTrainingCV } from "../src/services/trainingService";

const newCV = {
    "file_name": "Daniel Sanfelice - Resume - 2025.pdf",
    "candidate": {
      "name": "Daniel Sanfelice",
      "email": "sanfelic@gmail.com",
      "phone": "(650) 387-8584",
      "location": "San Diego, CA",
      "linkedin": "linkedin.com/in/danielsanfelice"
    },
    "summary": "Navy veteran and technical project manager with 15 years of experience in SaaS, IoT, cloud platforms, and enterprise integrations.",
    "skills": [
      "Data Analytics",
      "Cloud Platforms",
      "AWS",
      "GCP",
      "SQL",
      "Agile",
      "DevOps",
      "Jira",
      "Confluence",
      "Salesforce",
      "Grafana",
      "Tableau",
      "IoT",
      "Kafka",
      "Spark",
      "Flink"
    ],
    "experience": [
      {
        "company": "Wiliot Inc",
        "job_title": "Technical Project Manager - Software Development & Data Operations",
        "location": "San Diego, CA",
        "start_date": "December 2022",
        "end_date": "September 2025",
        "responsibilities": [
          "Led enterprise IoT data operations across supply chain projects.",
          "Designed scalable IoT observability and incident management frameworks.",
          "Led cross-functional teams and mentoring programs.",
          "Managed onboarding and deployment for large-scale projects."
        ]
      },
      {
        "company": "Argo AI",
        "job_title": "Autonomous Vehicle System Software Test Manager",
        "location": "San Diego, CA",
        "start_date": "April 2022",
        "end_date": "July 2022",
        "responsibilities": [
          "Managed AV testing team and fleet operations.",
          "Developed test protocols and incident logging procedures."
        ]
      },
      {
        "company": "Modal AI Robotics",
        "job_title": "Technical Program Manager",
        "location": "San Diego, CA",
        "start_date": "March 2020",
        "end_date": "April 2022",
        "responsibilities": [
          "Led software testing and system integration.",
          "Managed hardware and firmware iterations."
        ]
      },
      {
        "company": "United States Navy",
        "job_title": "Technical Program Manager",
        "location": "San Diego, CA",
        "start_date": "December 2011",
        "end_date": "December 2017",
        "responsibilities": [
          "Managed personnel and large-scale operations.",
          "Handled $21M equipment and operational programs."
        ]
      }
    ],
    "education": [
      {
        "institution": "San Diego State University",
        "location": "San Diego, CA",
        "degree": "Bachelor of Arts in International Security and Conflict Resolution",
        "year": null
      }
    ],
    "certifications": [
      "Scrum Certified Product Owner (SCPO)"
    ],
    "achievements": [
      "Led IoT projects worth $30M+ revenue.",
      "Managed deployments across 300+ sites and 10k+ devices."
    ]
};

async function run() {
    const data = {
        name: newCV.candidate.name,
        email: newCV.candidate.email,
        phone: newCV.candidate.phone,
        location: newCV.candidate.location,
        linkedin: newCV.candidate.linkedin,
        summary: newCV.summary,
        skills: newCV.skills,
        experience: newCV.experience,
        education: newCV.education,
        certifications: newCV.certifications,
        ats_score: 0,
        missing_keywords: [],
        suggestions: []
    };
    await saveTrainingCV(data, "system-admin");
    console.log(`CV for ${data.name} saved successfully`);
}

run();
