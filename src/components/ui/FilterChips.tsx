interface FilterChipsProps<T extends string> {
  options: T[];
  selected: T;
  onSelect: (option: T) => void;
  className?: string;
}

export function FilterChips<T extends string>({
  options,
  selected,
  onSelect,
  className = '',
}: FilterChipsProps<T>) {
  return (
    <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 ${className}`}>
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`filter-chip ${isSelected ? 'active' : ''}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
