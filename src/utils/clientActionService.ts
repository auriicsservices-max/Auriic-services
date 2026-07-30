import { doc, updateDoc, arrayUnion, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logActivity } from '../services/activityService';

export interface SLAInfo {
  status: 'Pending' | 'On Time' | 'Warning' | 'Overdue' | 'Completed';
  label: string;
  badgeBg: string;
  indicatorColor: string;
  durationText: string;
  durationMs: number;
  isOverdue: boolean;
  elapsedHours: number;
  remainingHours: number;
  targetHours: number;
  percent: number;
}

/**
 * Calculate SLA Status and Metrics for a given Candidate
 */
export function getSLAInfo(candidate: any, targetHours: number = 48): SLAInfo {
  if (!candidate) {
    return {
      status: 'Pending',
      label: 'SLA Pending',
      badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      indicatorColor: 'bg-slate-400',
      durationText: 'N/A',
      durationMs: 0,
      isOverdue: false,
      elapsedHours: 0,
      remainingHours: targetHours,
      targetHours,
      percent: 0
    };
  }

  // SLA Start Timestamp
  const startTimeVal = candidate.slaStartTime || candidate.clientAssignedAt || candidate.clientActionTimestamp || candidate.createdAt;
  const slaStart = startTimeVal ? (startTimeVal.toDate ? startTimeVal.toDate() : new Date(startTimeVal)) : new Date();
  
  const isCompleted = candidate.clientStatus === 'accepted' || candidate.clientStatus === 'rejected' || candidate.slaCompletedTime || candidate.slaStatus === 'Completed';

  if (isCompleted) {
    const endVal = candidate.slaCompletedTime || candidate.clientActionTimestamp || candidate.updatedAt || new Date();
    const slaEnd = endVal ? (endVal.toDate ? endVal.toDate() : new Date(endVal)) : new Date();
    const durationMs = candidate.slaDurationMs || Math.max(0, slaEnd.getTime() - slaStart.getTime());
    const durationText = formatDuration(durationMs);

    return {
      status: 'Completed',
      label: `Completed (${durationText})`,
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      indicatorColor: 'bg-emerald-500',
      durationText,
      durationMs,
      isOverdue: false,
      elapsedHours: Math.round(durationMs / (1000 * 60 * 60)),
      remainingHours: 0,
      targetHours,
      percent: 100
    };
  }

  // Active Pending SLA
  const elapsedMs = Math.max(0, Date.now() - slaStart.getTime());
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const remainingHours = targetHours - elapsedHours;
  const percent = Math.min(100, Math.round((elapsedHours / targetHours) * 100));

  if (elapsedHours <= targetHours * 0.5) {
    // On Time (under 50% target)
    return {
      status: 'On Time',
      label: `On Time (${Math.max(0, Math.round(remainingHours))}h left)`,
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      indicatorColor: 'bg-emerald-500',
      durationText: formatDuration(elapsedMs),
      durationMs: elapsedMs,
      isOverdue: false,
      elapsedHours,
      remainingHours,
      targetHours,
      percent
    };
  } else if (elapsedHours <= targetHours) {
    // Warning (50% to 100% target)
    return {
      status: 'Warning',
      label: `SLA Warning (${Math.max(0, Math.round(remainingHours))}h left)`,
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      indicatorColor: 'bg-amber-500',
      durationText: formatDuration(elapsedMs),
      durationMs: elapsedMs,
      isOverdue: false,
      elapsedHours,
      remainingHours,
      targetHours,
      percent
    };
  } else {
    // Overdue (> 100% target)
    const lateHours = Math.round(elapsedHours - targetHours);
    return {
      status: 'Overdue',
      label: `SLA Overdue (${lateHours}h late)`,
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      indicatorColor: 'bg-rose-500',
      durationText: formatDuration(elapsedMs),
      durationMs: elapsedMs,
      isOverdue: true,
      elapsedHours,
      remainingHours: 0,
      targetHours,
      percent: 100
    };
  }
}

/**
 * Helper to format duration MS to human readable string
 */
export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export type ClientActionType = 
  | 'accept' 
  | 'reject' 
  | 'view_resume' 
  | 'download_resume' 
  | 'add_feedback' 
  | 'request_interview' 
  | 'status_change';

export interface DispatchClientActionParams {
  candidate: any;
  user: any; // Client user object
  actionType: ClientActionType;
  comments?: string;
  reasonCategory?: string;
  newClientStatus?: string;
  fullTeamList?: any[];
}

/**
 * Dispatch real-time Client Action:
 * 1. Updates Candidate status, SLA metrics & client interactions in Firestore
 * 2. Creates in-app notifications for assigned Recruiter & Admins with direct links
 * 3. Logs Activity Audit trail
 */
export async function dispatchClientAction({
  candidate,
  user,
  actionType,
  comments = '',
  reasonCategory = '',
  newClientStatus = '',
  fullTeamList = []
}: DispatchClientActionParams): Promise<void> {
  if (!candidate?.id) return;

  const nowIso = new Date().toISOString();
  const userName = user?.displayName || user?.name || user?.email || 'Client Partner';
  const userUid = user?.uid || '';

  // Get SLA status before action
  const slaInfo = getSLAInfo(candidate);

  let actionLabel = 'Client Action';
  let updatedStatus = candidate.clientStatus || 'pending_review';
  let updatedPipelineStage = candidate.pipelineStage || 'cv_upload';
  let shouldStopSLA = false;
  let notificationMessage = '';

  switch (actionType) {
    case 'accept':
      actionLabel = 'ACCEPTED Candidate';
      updatedStatus = 'accepted';
      updatedPipelineStage = 'Client Accepted';
      shouldStopSLA = true;
      notificationMessage = `Client (${userName}) ACCEPTED candidate "${candidate.fullName}". ${comments ? `Notes: ${comments}` : 'No notes provided'}`;
      break;

    case 'reject':
      actionLabel = 'REJECTED Candidate';
      updatedStatus = 'rejected';
      updatedPipelineStage = 'Client Rejected';
      shouldStopSLA = true;
      const reasonStr = reasonCategory ? ` [Reason: ${reasonCategory}]` : '';
      notificationMessage = `Client (${userName}) REJECTED candidate "${candidate.fullName}".${reasonStr} ${comments ? `Feedback: ${comments}` : 'No feedback provided'}`;
      break;

    case 'view_resume':
      actionLabel = 'Viewed Resume';
      notificationMessage = `Client (${userName}) VIEWED RESUME for candidate "${candidate.fullName}".`;
      break;

    case 'download_resume':
      actionLabel = 'Downloaded Resume';
      notificationMessage = `Client (${userName}) DOWNLOADED RESUME for candidate "${candidate.fullName}".`;
      break;

    case 'add_feedback':
      actionLabel = 'Added Feedback';
      notificationMessage = `Client (${userName}) ADDED FEEDBACK for candidate "${candidate.fullName}": "${comments}"`;
      break;

    case 'request_interview':
      actionLabel = 'Requested Interview';
      updatedStatus = 'shortlisted';
      updatedPipelineStage = 'Shortlisted for Interview';
      notificationMessage = `Client (${userName}) REQUESTED INTERVIEW for candidate "${candidate.fullName}". ${comments ? `Notes: ${comments}` : ''}`;
      break;

    case 'status_change':
      updatedStatus = newClientStatus || candidate.clientStatus || 'pending_review';
      if (updatedStatus === 'accepted') {
        actionLabel = 'ACCEPTED Candidate';
        updatedPipelineStage = 'Client Accepted';
        shouldStopSLA = true;
      } else if (updatedStatus === 'rejected') {
        actionLabel = 'REJECTED Candidate';
        updatedPipelineStage = 'Client Rejected';
        shouldStopSLA = true;
      } else {
        actionLabel = `Changed Status to "${updatedStatus.replace(/_/g, ' ')}"`;
      }
      notificationMessage = `Client (${userName}) CHANGED STATUS of candidate "${candidate.fullName}" to ${updatedStatus.replace(/_/g, ' ')}. ${comments ? `Notes: ${comments}` : ''}`;
      break;
  }

  // Calculate final SLA metrics if review completed
  let finalSlaStatus = slaInfo.status;
  let slaCompletedTime = candidate.slaCompletedTime || null;
  let slaDurationMs = candidate.slaDurationMs || null;

  if (shouldStopSLA) {
    finalSlaStatus = 'Completed';
    slaCompletedTime = nowIso;
    const slaStart = candidate.slaStartTime || candidate.clientAssignedAt || candidate.clientActionTimestamp || candidate.createdAt;
    const startMs = slaStart ? (slaStart.toDate ? slaStart.toDate().getTime() : new Date(slaStart).getTime()) : Date.now();
    slaDurationMs = Math.max(0, Date.now() - startMs);
  }

  const durationFormatted = slaDurationMs ? formatDuration(slaDurationMs) : slaInfo.durationText;

  // Build interaction audit log record
  const interactionRecord = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    action: actionLabel,
    actionType,
    status: updatedStatus,
    feedback: comments.trim(),
    reasonCategory: reasonCategory || null,
    timestamp: nowIso,
    userUid,
    userName,
    userRole: 'client',
    slaStatus: finalSlaStatus,
    slaDurationText: durationFormatted
  };

  const stageHistoryRecord = {
    stage: updatedPipelineStage,
    timestamp: nowIso,
    author: userName,
    comment: comments ? `[Client Action: ${actionLabel}] ${comments}` : `[Client Action: ${actionLabel}]`
  };

  // 1. Update Candidate Document in Firestore
  const candidateRef = doc(db, 'candidates', candidate.id);
  const updatePayload: any = {
    clientStatus: updatedStatus,
    pipelineStage: updatedPipelineStage,
    status: updatedPipelineStage,
    clientFeedback: comments.trim() || candidate.clientFeedback || '',
    clientActionTimestamp: nowIso,
    lastClientAction: actionLabel,
    slaStatus: finalSlaStatus,
    updatedAt: nowIso,
    clientInteractions: arrayUnion(interactionRecord),
    stageHistory: arrayUnion(stageHistoryRecord)
  };

  if (slaCompletedTime) {
    updatePayload.slaCompletedTime = slaCompletedTime;
    updatePayload.slaDurationMs = slaDurationMs;
  }

  await updateDoc(candidateRef, updatePayload);

  // 2. Identify Recipients for Real-Time Notification (Assigned Recruiter, Uploader, Admins/TLs)
  const recipientIds = new Set<string>();
  if (candidate.uploadedBy) recipientIds.add(candidate.uploadedBy);
  if (candidate.assignedTo) recipientIds.add(candidate.assignedTo);

  // Add all Admins, Team Leaders, and Recruiters
  if (fullTeamList && fullTeamList.length > 0) {
    fullTeamList.forEach(u => {
      if (u.role === 'admin' || u.role === 'team_leader' || u.role === 'developer' || u.role === 'recruiter') {
        const uid = u.uid || u.id;
        if (uid) recipientIds.add(uid);
      }
    });
  }

  // Create In-App Notification in Firestore for each recipient
  const notificationPromises = Array.from(recipientIds).map(async (recipientId) => {
    if (!recipientId || recipientId === userUid) return;

    try {
      await addDoc(collection(db, 'notifications'), {
        title: `Client ${actionLabel}: ${candidate.fullName}`,
        text: notificationMessage,
        message: notificationMessage,
        clientName: userName,
        candidateName: candidate.fullName,
        actionPerformed: actionLabel,
        comments: comments.trim(),
        dateTime: nowIso,
        senderId: userUid,
        senderName: userName,
        senderRole: 'client',
        recipientId,
        relatedCandidateId: candidate.id,
        candidateId: candidate.id,
        type: 'client_action',
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(`Failed to send notification to ${recipientId}:`, err);
    }
  });

  await Promise.all(notificationPromises);

  // 3. Log Audit Activity in activity_logs collection
  await logActivity(
    userName,
    userUid,
    'client',
    `Client Action: ${actionLabel}`,
    candidate.fullName || 'Candidate',
    candidate.uploadedBy || candidate.assignedTo || null,
    `Client performed ${actionLabel} on candidate ${candidate.fullName}. SLA Status: ${finalSlaStatus} (${durationFormatted}). Comments: ${comments || 'None'}`,
    'Client Portal',
    'Success',
    null,
    null,
    candidate.clientStatus || 'pending_review',
    updatedStatus
  );
}
