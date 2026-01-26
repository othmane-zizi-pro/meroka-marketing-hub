'use client';

import { Header } from '@/components/layout/Header';
import { CampaignCard } from '@/components/campaigns/CampaignCard';
import { Button } from '@/components/ui/button';
import { campaigns } from '@/lib/mock-data';
import { Plus } from 'lucide-react';

export default function CampaignsPage() {
  const employeeVoices = campaigns.find(c => c.id === 'campaign-1');
  const otherCampaigns = campaigns.filter(c => c.id !== 'campaign-1');

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Campaigns"
        subtitle="Manage coordinated marketing campaigns across channels"
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Featured Campaign */}
        {employeeVoices && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Featured Campaign</h2>
            <CampaignCard campaign={employeeVoices} featured />
          </div>
        )}

        {/* All Campaigns */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">All Campaigns</h2>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
