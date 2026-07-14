'use client';

import { useEffect, useState } from 'react';
import { Button } from '@eastlake/lib-core-ui/components/ui/button';

export function InviteCodeCard({
  getInviteCode,
  regenerateInviteCode,
  isBusy,
}: {
  getInviteCode: () => Promise<{ invite_code: string } | null>;
  regenerateInviteCode: () => Promise<{ invite_code: string } | null>;
  isBusy: boolean;
}) {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    getInviteCode().then((res) => res && setCode(res.invite_code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-2 font-semibold text-slate-900">Invite code</h3>
      <div className="flex items-center gap-3">
        <code className="rounded bg-slate-100 px-3 py-1.5 text-lg font-bold tracking-widest">
          {code ?? '········'}
        </code>
        <Button
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={async () => {
            const res = await regenerateInviteCode();
            if (res) setCode(res.invite_code);
          }}
        >
          Regenerate
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Share this code — friends enter it on the Join page.
      </p>
    </div>
  );
}
