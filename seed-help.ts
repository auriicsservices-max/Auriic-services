import { db } from './src/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

const helpData = [
  {
    id: 'getting-started',
    title: '1. Getting Started',
    content: 'Welcome to Aurrum Talent Insights!\n\nLog in with your provided credentials.\n\nRole Overview:\n- Admin: Full system access, including system settings and user management.\n- Team Leader: Manage your team, view analytics, and oversee operations.\n- Recruiter: Primary candidate sourcing, management, and pipeline updates.',
    order: 1,
    roles: ['admin', 'recruiter', 'team_leader']
  },
  {
    id: 'cv-parsing',
    title: '2. CV Parsing Guide',
    content: 'Our AI-powered CV parser automates resume data extraction.\n\n- How to upload: Use "Bulk Upload" for multiple files or "Add Candidate" for individual entries.\n- Supported formats: PDF, DOCX.\n- Workflow: Upload the file, wait for the AI to analyze, and review the structured data.\n- Editing: You can manually edit any parsed information if the AI missed data points or needs correction.',
    order: 2,
    roles: ['recruiter', 'team_leader', 'admin']
  },
  {
    id: 'candidate-management',
    title: '3. Candidate Management',
    content: 'Manage your talent pipeline effortlessly:\n\n- Add/Update: Click "Add Candidate" or open existing profiles to modify data.\n- Assign: Assign candidates to recruiters or departments.\n- Shortlist: Move candidates to the shortlist for focus review.\n- Follow-up: Use follow-up features to track communication statuses.',
    order: 3,
    roles: ['recruiter', 'team_leader', 'admin']
  },
  {
    id: 'follow-up',
    title: '4. Follow-Up Guide',
    content: 'Never miss an interaction with candidates.\n- Set date/time: Use the candidate follow-up interface to schedule tasks.\n- Reminders: The system automatically triggers reminders.\n- Notifications: Stay updated via in-app alerts.',
    order: 4,
    roles: ['recruiter', 'team_leader', 'admin']
  },
  {
    id: 'notifications',
    title: '5. Notifications',
    content: 'Stay updated on crucial activities.\n- Notification Badge: Alerts appear on the navigation bar when you have unread updates.\n- Types: Covers pipeline changes, new messages, and upcoming follow-ups.',
    order: 5,
    roles: ['recruiter', 'team_leader', 'admin']
  },
  {
    id: 'dashboard',
    title: '6. Dashboard Guide',
    content: 'Your central hub for insights.\n- Timezone: Ensure your timezone is set correctly in settings for accurate reminder tracking.\n- Analytics: View hiring trends, pipeline health, and recruitment speed graphs.\n- Filters: Use sidebar filters to refine the candidate view.',
    order: 6,
    roles: ['team_leader', 'admin']
  },
  {
    id: 'chat',
    title: '7. Internal Chat',
    content: 'Seamless team communication.\n- Message Flow: Collaborate directly with colleagues without leaving the platform.\n- Notifications: Alerts show up instantly for new messages.',
    order: 7,
    roles: ['recruiter', 'team_leader', 'admin']
  },
  {
    id: 'logs',
    title: '8. Team Activity Logs',
    content: 'Track every action taken in the system.\n- Visibility: Logs track changes to candidate statuses, user activities, and system configurations based on user permissions.',
    order: 8,
    roles: ['team_leader', 'admin']
  },
  {
    id: 'faq',
    title: '9. FAQ',
    content: 'Common questions answered:\n- Why did parsing fail? Ensure the file is not corrupted or scanned as an image. Try converting to text-based PDF.\n- Why is my file not uploading? If the file is too large (e.g., >5MB), parsing may fail due to size limits. Please compress the PDF/DOC file before uploading. The system displays a "File too large" error notification if the file exceeds the maximum allowed size.\n- Why is data missing? If critical data is missing, manually edit the profile using the "Edit" button.\n- Why aren\'t notifications appearing? Refresh your screen or check your browser notification settings.',
    order: 9,
    roles: ['recruiter', 'team_leader', 'admin']
  }
];

async function seedHelpData() {
  for (const section of helpData) {
    const { id, ...data } = section;
    await setDoc(doc(db, 'help_sections', id), data);
  }
}

seedHelpData().then(() => console.log('Seeded role-based help data'));
