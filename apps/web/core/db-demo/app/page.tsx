'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@402systems/core-ui/components/ui/button';
import { Input } from '@402systems/core-ui/components/ui/input';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@402systems/core-ui/components/ui/table';
import {
  type Player,
  getPlayers,
  addPlayer,
  deletePlayer,
} from '../lib/db-demo';

export default function Page() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    team: '',
    position: '',
    ppg: '',
  });

  const fetchPlayers = useCallback(async () => {
    const players = await getPlayers();
    setPlayers(players);
  }, []);

  useEffect(() => {
    const f = async () => {
      await fetchPlayers();
    };
    f();
  }, [fetchPlayers]);

  const handleAddPlayer = async () => {
    if (
      newPlayer.name &&
      newPlayer.team &&
      newPlayer.position &&
      newPlayer.ppg
    ) {
      await addPlayer({
        name: newPlayer.name,
        team: newPlayer.team,
        position: newPlayer.position,
        ppg: parseFloat(newPlayer.ppg),
      });
      setNewPlayer({ name: '', team: '', position: '', ppg: '' });
      fetchPlayers();
    }
  };

  const handleDeletePlayer = async (name: string) => {
    await deletePlayer(name);
    fetchPlayers();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPlayer((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">NBA Players Database</h1>

      <div className="mb-4">
        <h2 className="mb-2 text-xl font-semibold">Add New Player</h2>
        <div className="flex items-center gap-2">
          <Input
            name="name"
            placeholder="Name"
            value={newPlayer.name}
            onChange={handleInputChange}
            className="w-full"
          />
          <Input
            name="team"
            placeholder="Team"
            value={newPlayer.team}
            onChange={handleInputChange}
            className="w-full"
          />
          <Input
            name="position"
            placeholder="Position"
            value={newPlayer.position}
            onChange={handleInputChange}
            className="w-full"
          />
          <Input
            name="ppg"
            type="number"
            placeholder="PPG"
            value={newPlayer.ppg}
            onChange={handleInputChange}
            className="w-full"
          />
          <Button onClick={handleAddPlayer}>Add Player</Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold">Player List</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>PPG</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => (
              <TableRow key={player.name}>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.team}</TableCell>
                <TableCell>{player.position}</TableCell>
                <TableCell>{player.ppg}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeletePlayer(player.name)}
                    size="icon"
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
