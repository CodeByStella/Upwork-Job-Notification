interface UserType {
  id: string;
  username: string;
  subscribed: Date;
  isTrial: boolean;
  trialUsed: boolean;
  created: Date;
  isPremium: boolean;
  searchUrl: string;
  notification: boolean;
}

export default UserType;
