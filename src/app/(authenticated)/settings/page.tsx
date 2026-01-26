'use client';

import { Header } from '@/components/layout/Header';
import { AgentTrainer } from '@/components/settings/AgentTrainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { currentUser } from '@/lib/mock-data';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="Manage your profile and AI preferences" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your public profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar src={currentUser.avatar} alt={currentUser.name} size="lg" />
                <div>
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input defaultValue={currentUser.name} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input defaultValue={currentUser.email} disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Input defaultValue={currentUser.role} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Input defaultValue={currentUser.department} />
                </div>
              </div>

              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Agent Training Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">AI Agent Training</h2>
            <AgentTrainer />
          </div>
        </div>
      </div>
    </div>
  );
}
