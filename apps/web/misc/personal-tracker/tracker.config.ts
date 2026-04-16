export interface TrackerConfig {
  appTitle: string;
  appDescription: string;
  itemNoun: { singular: string; plural: string };
  /** Label on the "reset counter" button, e.g. "Hung out" or "Checked off" */
  actionLabel: string;
  /** Supabase table name */
  tableName: string;
  /** Shown when last_action is null */
  neverLabel: string;
  addDialogTitle: string;
  addInputPlaceholder: string;
  urgencyThresholds: {
    /** Days until "Check in" badge appears */
    checkin: number;
    /** Days until "Soon" badge appears */
    soon: number;
    /** Days until "Overdue" badge appears */
    overdue: number;
  };
}

export const config: TrackerConfig = {
  appTitle: 'Friend Tracker',
  appDescription: "See who you haven't hung out with lately",
  itemNoun: { singular: 'friend', plural: 'friends' },
  actionLabel: 'Hung out',
  tableName: 'personal_tracker_items',
  neverLabel: 'Never hung out',
  addDialogTitle: 'Add a Friend',
  addInputPlaceholder: "Enter friend's name",
  urgencyThresholds: { checkin: 3, soon: 7, overdue: 14 },
};
