import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ to, label, className }) => {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size={label ? 'sm' : 'icon'}
      className={`rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors ${label ? 'gap-1.5 px-3 h-9' : 'w-9 h-9'} ${className ?? ''}`}
      onClick={() => (to ? navigate(to) : navigate(-1))}
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4 flex-shrink-0" />
      {label && <span className="text-xs font-bold">{label}</span>}
    </Button>
  );
};

export default BackButton;
