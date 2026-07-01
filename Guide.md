# Comprehensive CRM / Recruitment Management Guide

Welcome to the Aurrum CRM! This guide will help you understand the features and how to use the recruitment management software effectively.

## Table of Contents
1. [Authentication & Roles](#authentication--roles)
2. [Dashboard Overview](#dashboard-overview)
3. [Candidates Management](#candidates-management)
4. [Shortlist](#shortlist)
5. [Bulk Upload](#bulk-upload)
6. [Internal Chat & Collaboration](#internal-chat)
7. [Analytics & Reporting](#analytics--reporting)
8. [System Settings & User Management](#system-settings--user-management)

---

## Authentication & Roles
- **Login:** Users sign in seamlessly via Google Authentication.
- **Roles:** The CRM supports various roles such as **Admin**, **Team Leader**, and **Recruiter**.
- **Onboarding:** By default, new users need an invite. Admins must invite or approve a user so they have the proper role before they can interact with the candidate data.

## Dashboard Overview
The main dashboard is your control center. Here’s what you can do:
- **Notifications:** Click the bell icon at the top to see updates regarding candidate assignments or system alerts. Notifications display the specific user's name and role (e.g., "Hina Thakkar (Recruiter)") who triggered the action instead of a generic "System" label.
- **Timezone Widget:** Located on the dashboard, it helps you keep track of global team members or candidate timezones when setting up interviews.
- **Quick Theme Toggle:** Switch between Light and Dark mode for comfortable viewing.

## Candidates Management
This is the core of your recruitment process.
- **Adding Candidates:** Click on the "Add Candidate" button to open the form.
- **AI-Powered Parsing:** When uploading or creating candidates, the system utilizes advanced AI to automatically analyze resume text into a structured, clean format for consistent data management.
- **Editing / Updating:** Click on any candidate to open their details in the `CandidateModal`. You can log notes, update their pipeline stage (e.g., Screened, Interviewing, Offered), and keep information fresh.
- **CV Repository / Trainer:** Keep candidate resumes stored logically and utilize the CV Trainer features to extract or format skills.
- **Enhanced Data Columns:** The **Uploaded** column now clearly tracks the full date and local time of candidate entry rather than just the date.
- **Slick Pagination Controls:** Available on both the **header and footer** of the candidate table. You can customize the page size (20, 50, 100, 200 rows), jump to the first page, or step forward/backwards easily.

## Shortlist
- For high-priority candidates or specific job orders, you can add them to a **Shortlist**.
- Use the **Shortlist** module to group and track particular talents you want to keep separate from the general pool.

## Bulk Upload
If you have a spreadsheet filled with sourced candidates, you do not need to add them 1-by-1:
- Navigate to the **Bulk Upload** section.
- Upload an Excel (`.xlsx`) or CSV file containing your candidates.
- The system will process and import all candidates at once.
- *Note:* The maximum number of records you can upload at once is restricted to Admin users under **System Settings**.

## Internal Chat
Collaboration is built-in so you do not have to switch windows to talk to your colleagues.
- Use the **Internal Chat** to message team members, discuss specific candidates, and share updates securely within the CRM environment.

## Analytics & Reporting
- Access the **Analytics** view to monitor KPIs.
- Track metrics like placements over time, pipeline velocity, candidate sources, and team performance logically to improve recruitment strategies.

## System Settings & User Management
*(Requires Admin or Team Leader permissions)*
- **User Management:** Invite new team members, manage their roles (e.g., elevate a Recruiter to a Team Leader), or suspend access.
- **System Settings:** Configure workspace settings, manage bulk upload limits (Restricted to **Admins only**), and maintain system defaults.
- **Modern Activity Timeline & Log Review:** Accessible via Admin controls, the activity log provides an exhaustive, modern timeline UI.
  - **Granular Details:** Tracks User Name, Role, Initials/Avatar, Action, Module, Candidate Name, Purpose description, Before/After values, Date & Time, IP Address, Device/Browser metadata, and Status (Success/Failed/Warning).
  - **Interactive Filters:** Search by query or filter by User, Module, and Actions to audit compliance securely.
- **Migration Tool:** Provided for administrative scaling, allowing seamless data transition between environments.

---
*For any technical issues or permissions (e.g. "Missing permissions"), please contact the System Administrator (Admins listed in the database).*
