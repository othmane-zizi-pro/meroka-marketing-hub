'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Campaign } from '@/types';
import { Calendar, FileText, ArrowRight, Users } from 'lucide-react';

interface CampaignCardProps {
  campaign: Campaign;
  featured?: boolean;
}

const statusVariants: Record<string, 'default' | 'secondary' | 'success' | 'warning'> = {
  active: 'success',
  paused: 'warning',
  completed: 'secondary',
};

export function CampaignCard({ campaign, featured = false }: CampaignCardProps) {
  const href = campaign.id === 'campaign-1' ? '/campaigns/employee-voices' : '#';

  return (
    <Card className={featured ? 'border-primary' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {featured && <Users className="h-5 w-5 text-primary" />}
            <CardTitle className={featured ? 'text-lg' : 'text-base'}>
              {campaign.name}
            </CardTitle>
          </div>
          <Badge variant={statusVariants[campaign.status]}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </Badge>
        </div>
        <CardDescription className="mt-2">
          {campaign.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(campaign.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
              {campaign.endDate && (
                <> - {new Date(campaign.endDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{campaign.postCount} posts</span>
          </div>
        </div>
        {featured && (
          <Link href={href}>
            <Button className="mt-4 w-full gap-2">
              View Campaign
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
