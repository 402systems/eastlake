export interface TrackerConfig {
  appTitle: string;
  appDescription: string;
  itemNoun: { singular: string; plural: string };
  /** Label on the "reset counter" button */
  actionLabel: string;
  /** Shown when last_action is null */
  neverLabel: string;
  addModalTitle: string;
  addInputPlaceholder: string;
  urgencyThresholds: {
    checkin: number;
    soon: number;
    overdue: number;
  };
}

export const config: TrackerConfig = {
  appTitle: 'Friend Tracker',
  appDescription: "See who you haven't hung out with lately",
  itemNoun: { singular: 'friend', plural: 'friends' },
  actionLabel: 'Hung out',
  neverLabel: 'Never hung out',
  addModalTitle: 'Add a Friend',
  addInputPlaceholder: "Friend's name",
  urgencyThresholds: { checkin: 3, soon: 7, overdue: 14 },
};
