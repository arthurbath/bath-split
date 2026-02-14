import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface HouseholdSetupProps {
  onComplete: (displayName: string) => Promise<void>;
  onJoin: (displayName: string, inviteCode: string) => Promise<void>;
}

export function HouseholdSetup({ onComplete, onJoin }: HouseholdSetupProps) {
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    try {
      await onComplete(displayName.trim());
    } catch (err: any) {
      toast({
        title: 'Failed to create household',
        description: err?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !inviteCode.trim()) return;
    setLoading(true);
    try {
      await onJoin(displayName.trim(), inviteCode.trim());
    } catch (err: any) {
      toast({
        title: 'Failed to join household',
        description: err?.message || 'Invalid invite code or household is full.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Get Started</CardTitle>
          <CardDescription className="text-base">
            Create a new household or join an existing one with an invite code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create New</TabsTrigger>
              <TabsTrigger value="join">Join Existing</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label htmlFor="createName" className="text-sm font-medium text-foreground">
                    Your display name
                  </label>
                  <Input
                    id="createName"
                    placeholder='e.g. "Alice"'
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full gap-1.5" disabled={!displayName.trim() || loading}>
                  <Users className="h-4 w-4" />
                  {loading ? 'Creating…' : 'Create household'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join">
              <form onSubmit={handleJoin} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label htmlFor="joinName" className="text-sm font-medium text-foreground">
                    Your display name
                  </label>
                  <Input
                    id="joinName"
                    placeholder='e.g. "Bob"'
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="inviteCode" className="text-sm font-medium text-foreground">
                    Invite code
                  </label>
                  <Input
                    id="inviteCode"
                    placeholder="Enter invite code from your partner"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="font-mono tracking-widest"
                  />
                </div>
                <Button type="submit" className="w-full gap-1.5" disabled={!displayName.trim() || !inviteCode.trim() || loading}>
                  <UserPlus className="h-4 w-4" />
                  {loading ? 'Joining…' : 'Join household'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
