"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface SearchableComboboxProps {
  options: string[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  allLabel?: string
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Buscar...",
  emptyMessage = "No se encontraron resultados.",
  allLabel = "Todos",
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options

    const query = searchQuery.toLowerCase()
    return options.filter((option) => option.toLowerCase().includes(query))
  }, [options, searchQuery])

  const selectedLabel = value === "__ALL__" ? allLabel : value

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange("__ALL__")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between glass-panel border-white/10 text-white hover:bg-white/5 bg-transparent"
        >
          <span className="truncate">{selectedLabel}</span>
          <div className="flex items-center gap-1">
            {value !== "__ALL__" && (
              <X className="h-4 w-4 shrink-0 opacity-70 hover:opacity-100" onClick={handleClear} />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 glass-panel border-white/10 bg-zinc-900" align="start">
        <Command className="bg-transparent">
          <CommandInput
            placeholder={placeholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="text-white"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="text-zinc-400 py-6 text-center text-sm">{emptyMessage}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__ALL__"
                onSelect={() => {
                  onValueChange("__ALL__")
                  setOpen(false)
                  setSearchQuery("")
                }}
                className="cursor-pointer text-white data-[selected=true]:bg-[#FF6B6B]/20 data-[selected=true]:text-[#FF6B6B]"
              >
                <Check
                  className={cn("mr-2 h-4 w-4", value === "__ALL__" ? "opacity-100 text-[#FF6B6B]" : "opacity-0")}
                />
                <span>{allLabel}</span>
              </CommandItem>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onValueChange(option)
                    setOpen(false)
                    setSearchQuery("")
                  }}
                  className="cursor-pointer text-white data-[selected=true]:bg-[#FF6B6B]/20 data-[selected=true]:text-[#FF6B6B]"
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === option ? "opacity-100 text-[#FF6B6B]" : "opacity-0")}
                  />
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default SearchableCombobox
