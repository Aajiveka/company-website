/** Candidate CV shape (subset of tblSubscriber* used by candidate-profile.aspx). */
export interface CandidateEducation {
  degree: string;
  institute: string;
  year: string;
}

export interface CandidateExperience {
  company: string;
  designation: string;
  from: string;
  to: string;
}

export interface CandidateProfile {
  subscriberId: number;
  fullName: string;
  email: string;
  mobile: string;
  gender: string;
  city: string;
  designation: string;
  totalExperience: string;
  photoUrl: string | null;
  skills: string[];
  education: CandidateEducation[];
  experience: CandidateExperience[];
}

/** A job the candidate has applied to (tblJobSubscriberMapping + status). */
export interface AppliedJob {
  jobId: number;
  designation: string;
  company: string;
  city: string;
  appliedOn: string;
  status: 'Applied' | 'Shortlisted' | 'Interview' | 'Rejected' | 'Selected';
}

/** Candidate document (tblSubscriberDocs / tblMstrDocuments). */
export interface CandidateDocument {
  documentId: number;
  name: string;
  status: 'Pending' | 'Uploaded' | 'Verified' | 'Rejected';
  uploadedOn: string | null;
}

/** Saved job alert. */
export interface JobAlert {
  alertId: number;
  keyword: string;
  location: string;
  frequency: 'Daily' | 'Weekly';
}
