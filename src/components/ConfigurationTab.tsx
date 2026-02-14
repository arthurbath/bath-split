import { useState } from 'react';
import { ManagedListSection } from '@/components/ManagedListSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Category } from '@/hooks/useCategories';
import type { Budget } from '@/hooks/useBudgets';
import type { LinkedAccount } from '@/hooks/useLinkedAccounts';
import type { Expense } from '@/hooks/useExpenses';

interface ConfigurationTabProps {
  categories: Category[];
  budgets: Budget[];
  linkedAccounts: LinkedAccount[];
  expenses: Expense[];
  partnerX: string;
  partnerY: string;
  inviteCode: string | null;
  onUpdatePartnerNames: (x: string, y: string) => Promise<void>;
  onAddCategory: (name: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string) => Promise<void>;
  onRemoveCategory: (id: string) => Promise<void>;
  onReassignCategory: (oldId: string, newId: string | null) => Promise<void>;
  onAddBudget: (name: string) => Promise<void>;
  onUpdateBudget: (id: string, name: string) => Promise<void>;
  onRemoveBudget: (id: string) => Promise<void>;
  onReassignBudget: (oldId: string, newId: string | null) => Promise<void>;
  onAddLinkedAccount: (name: string) => Promise<void>;
  onUpdateLinkedAccount: (id: string, name: string) => Promise<void>;
  onRemoveLinkedAccount: (id: string) => Promise<void>;
  onReassignLinkedAccount: (oldId: string, newId: string | null) => Promise<void>;
}

function PartnerNamesCard({ partnerX, partnerY, onSave }: {
  partnerX: string;
  partnerY: string;
  onSave: (x: string, y: string) => Promise<void>;
}) {
  const [nameX, setNameX] = useState(partnerX);
  const [nameY, setNameY] = useState(partnerY);
  const [saving, setSaving] = useState(false);
  const dirty = nameX !== partnerX || nameY !== partnerY;

  const handleSave = async () => {
    if (!nameX.trim() || !nameY.trim()) return;
    setSaving(true);
    try {
      await onSave(nameX.trim(), nameY.trim());
      toast({ title: 'Partner names updated' });
    } catch (e: any) {
      toast({ title: 'Failed to update', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Partner Names</CardTitle>
        <CardDescription>Set the names used for splitting expenses. These are labels — they don't need to match user accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Partner X</label>
            <Input value={nameX} onChange={e => setNameX(e.target.value)} placeholder="e.g. Alice" />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Partner Y</label>
            <Input value={nameY} onChange={e => setNameY(e.target.value)} placeholder="e.g. Bob" />
          </div>
          <Button onClick={handleSave} disabled={!dirty || saving || !nameX.trim() || !nameY.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InviteCard({ inviteCode }: { inviteCode: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast({ title: 'Invite code copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Invite Collaborators</CardTitle>
        </div>
        <CardDescription>
          Share this code so others can join your household and collaborate on the budget.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            readOnly
            value={inviteCode ?? 'Generating...'}
            className="font-mono text-lg tracking-widest text-center"
          />
          <Button variant="outline" size="icon" onClick={handleCopy} disabled={!inviteCode}>
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConfigurationTab({
  categories, budgets, linkedAccounts, expenses,
  partnerX, partnerY, inviteCode,
  onUpdatePartnerNames,
  onAddCategory, onUpdateCategory, onRemoveCategory, onReassignCategory,
  onAddBudget, onUpdateBudget, onRemoveBudget, onReassignBudget,
  onAddLinkedAccount, onUpdateLinkedAccount, onRemoveLinkedAccount, onReassignLinkedAccount,
}: ConfigurationTabProps) {
  return (
    <div className="space-y-6">
      <PartnerNamesCard partnerX={partnerX} partnerY={partnerY} onSave={onUpdatePartnerNames} />
      <InviteCard inviteCode={inviteCode} />
      <ManagedListSection
        title="Categories"
        description="Organize expenses into categories."
        items={categories}
        getUsageCount={(id) => expenses.filter(e => e.category_id === id).length}
        onAdd={onAddCategory}
        onUpdate={onUpdateCategory}
        onRemove={onRemoveCategory}
        onReassign={onReassignCategory}
      />
      <ManagedListSection
        title="Budgets"
        description="Define budget buckets like Fixed Essentials, Flexible, etc."
        items={budgets}
        getUsageCount={(id) => expenses.filter(e => e.budget_id === id).length}
        onAdd={onAddBudget}
        onUpdate={onUpdateBudget}
        onRemove={onRemoveBudget}
        onReassign={onReassignBudget}
      />
      <ManagedListSection
        title="Payment Methods"
        description="Track which payment method or account is used."
        items={linkedAccounts}
        getUsageCount={(id) => expenses.filter(e => e.linked_account_id === id).length}
        onAdd={onAddLinkedAccount}
        onUpdate={onUpdateLinkedAccount}
        onRemove={onRemoveLinkedAccount}
        onReassign={onReassignLinkedAccount}
      />
    </div>
  );
}
