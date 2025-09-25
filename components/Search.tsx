"use client"

import { useEffect, useId, useState } from "react"
import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

interface SearchInputProps {
  onSearch?: (query: string) => void;
}

export default function SearchInput({ onSearch }: SearchInputProps = {}) {
  const id = useId()
  const [inputValue, setInputValue] = useState("")

  useEffect(() => {
    onSearch?.(inputValue);
  }, [inputValue, onSearch])

  return (
    <div className="">
      <div className="relative">
        <Input
          id={id}
          className="peer ps-9 pe-4 border border-border/50 focus-visible:ring-0"
          placeholder="Search..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
          <SearchIcon size={16} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
