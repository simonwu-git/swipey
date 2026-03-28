'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrivacy } from '@/lib/privacy';

export function PrivacyToggle() {
  const { isPrivacyMode, togglePrivacy } = usePrivacy();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={togglePrivacy}
      aria-label={isPrivacyMode ? 'Show amounts' : 'Hide amounts'}
    >
      {isPrivacyMode ? (
        <EyeOff className="size-5" />
      ) : (
        <Eye className="size-5" />
      )}
    </Button>
  );
}
