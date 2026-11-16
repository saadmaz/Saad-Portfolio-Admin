import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

/** Standard search field for list pages. */
const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder, className }) => (
  <div className={cn('relative flex-1', className)}>
    <Search
      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
    <input
      type="search"
      aria-label={placeholder.replace(/\.+$|…$/, '')}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-border-strong focus:border-accent focus:outline-none [&::-webkit-search-cancel-button]:hidden"
    />
  </div>
);

export default SearchInput;
