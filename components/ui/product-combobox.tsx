"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ProductComboboxProps {
  products: { id: number; producto: string }[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ProductCombobox({
  products,
  value,
  onValueChange,
  disabled = false,
  placeholder = "Buscar producto...",
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filter products based on search query
  const filteredProducts = React.useMemo(() => {
    if (!searchQuery) return products

    const query = searchQuery.toLowerCase()
    return products.filter((product) => product.producto.toLowerCase().includes(query))
  }, [products, searchQuery])

  // Find selected product label
  const selectedLabel = products.find((p) => p.producto === value)?.producto

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between bg-background hover:bg-accent/50 border-border text-foreground"
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 popover-content-width" align="start">
        <Command className="bg-popover border border-border">
          <CommandInput
            placeholder="Buscar producto..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="text-foreground"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
              No se encontraron productos.
            </CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.producto}
                  onSelect={() => {
                    onValueChange(product.producto)
                    setOpen(false)
                    setSearchQuery("")
                  }}
                  className="cursor-pointer data-[selected=true]:bg-[#FF6B6B]/20 data-[selected=true]:text-[#FF6B6B]"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === product.producto ? "opacity-100 text-[#FF6B6B]" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{product.producto}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default ProductCombobox
