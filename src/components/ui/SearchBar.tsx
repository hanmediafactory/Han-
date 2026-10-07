import React from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search items…",
  className = "",
}) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search
        size={16}
        className="absolute left-3.5 text-neutral-400 pointer-events-none"
      />
      <input
        aria-label={placeholder.replace(/…$/, "")}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2.5 bg-neutral-100/80 border border-neutral-200/80 rounded-xl text-xs font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-black transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 text-neutral-400 hover:text-black p-0.5 rounded-full"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
