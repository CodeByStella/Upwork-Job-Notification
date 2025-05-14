interface UserType {
  id: string;
  username: string;
  subscribed: Date;
  isTrial: boolean;
  trialUsed: boolean;
  created: Date;
  isPremium: boolean;
  searchUrl: string;
  referral: string;
  invited_by: string;
}

export default UserType;
