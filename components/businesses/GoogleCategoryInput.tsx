"use client";

import { useState, useRef, useEffect } from "react";
import { GOOGLE_BUSINESS_CATEGORIES } from "@/lib/google-categories";

interface Props {
  categories: string[];
  onChange: (categories: string[]) => void;
}

export function GoogleCategoryInput({ categories, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setHighlighted(-1);
      return;
    }
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = GOOGLE_BUSINESS_CATEGORIES.filter((c) => {
      const lc = c.toLowerCase();
      return words.every((w) => lc.includes(w)) && !categories.includes(c);
    }).slice(0, 10);
    setSuggestions(matches);
    setHighlighted(-1);
  }, [query, categories]);

  function select(cat: string) {
    onChange([...categories, cat]);
    setQuery("");
    setSuggestions([]);
    setHighlighted(-1);
    inputRef.current?.focus();
  }

  function remove(cat: string) {
    onChange(categories.filter((c) => c !== cat));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && suggestions[highlighted]) {
        select(suggestions[highlighted]);
      }
    } else if (e.key === "Escape") {
      setSuggestions([]);
      setHighlighted(-1);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Type to search Google Business categories..."
          autoComplete="off"
        />

        {suggestions.length > 0 && (
          <ul
            ref={listRef}
            className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((cat, i) => (
              <li
                key={cat}
                onMouseDown={() => select(cat)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  i === highlighted ? "bg-primary/10 text-primary" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                {cat}
              </li>
            ))}
          </ul>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm"
            >
              {cat}
              <button
                type="button"
                onClick={() => remove(cat)}
                className="hover:text-primary/60 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
