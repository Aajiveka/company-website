/**
 * Two distinct status id spaces exist in the legacy schema and are easy to conflate:
 * tblMstrJobMappingStatus (a job application's progress) and tblMstrStatus (a candidate's
 * journey, used by tblSubscriberStatusHistory). Values below are read straight from
 * db/seed/tblMstrJobMappingStatus.psv and db/seed/tblMstrStatus.psv — never mix the two.
 */
export const JobMapStatus = {
  MAPPED: 1,
  SHORTLISTED: 2,
  INTERVIEW_SCHEDULED: 3,
  SELECTED: 4,
  REJECTED: 5,
  INTERVIEW_ATTENDED: 6,
  RESCHEDULE_REQUESTED: 7,
  RESCHEDULED: 8,
  INTERVIEW_NOT_ATTENDED: 9,
} as const;

/**
 * A job is Active or Closed, nothing else.
 *
 * spClientGetJoblisting reads tblClientJobs.StatusID as
 *   CASE WHEN StatusID = 1 THEN 'Active' ELSE 'Closed' END
 * and spClientManageJob writes 1 on insert. It is a flag, not a lookup — tblMstrStatus is
 * the CANDIDATE journey, and joining it made every job display "Account created".
 */
export const JOB_STATUS_ACTIVE = 1;

export const SubscriberStatus = {
  ACCOUNT_CREATED: 1,
  CANDIDATE_NOT_INTERESTED: 2,
  CV_CREATED: 3,
  CV_APPROVED: 4,
  MAPPED_TO_JOB: 5,
  SHORTLISTED: 6,
  INTERVIEW_SCHEDULED: 7,
  SELECTED: 13,
  REJECTED: 14,
  DOCUMENT_MAPPING: 15,
  NOT_ATTENDED: 29,
} as const;
