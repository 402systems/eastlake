const API_BASE_URL = 'https://api.402systems.com/db-demo';

export type Player = {
  name: string;
  team: string;
  position: string;
  ppg: number;
};

export const getPlayers = async (): Promise<Player[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/get_all_players`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch players');
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const addPlayer = async (player: Player): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/insert_player`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(player),
    });

    if (!response.ok) {
      throw new Error('Failed to add player');
    }
  } catch (error) {
    console.error(error);
  }
};

export const deletePlayer = async (name: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/delete_player`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete player');
    }
  } catch (error) {
    console.error(error);
  }
};
