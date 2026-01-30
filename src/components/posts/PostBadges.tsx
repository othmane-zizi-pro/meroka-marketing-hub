'use client';

import { cn } from '@/lib/utils';

export type SourceType = 'ai_generated' | 'employee_composed';

interface PostBadgesProps {
  sourceType: SourceType;
  isEdited: boolean;
}

export function PostBadges({ sourceType, isEdited }: PostBadgesProps) {
  return (
    <div className="flex items-center gap-1.5">
      {sourceType === 'employee_composed' ? (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          "bg-green-100 text-green-800"
        )}>
          Original
        </span>
      ) : (
        <>
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            "bg-purple-100 text-purple-800"
          )}>
            AI-generated
          </span>
          {isEdited && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              "bg-amber-100 text-amber-800"
            )}>
              Edited
            </span>
          )}
        </>
      )}
    </div>
  );
}
