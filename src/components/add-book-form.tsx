
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Book } from "@/lib/data";
import { useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { CLASS_CATEGORIES, CLASS_ORDER } from "@/lib/class-order";

const formSchema = z.object({
  bookTitle: z.string().min(2, "Book title is required"),
  class: z.string().min(1, "Class is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
});

type AddBookFormProps = {
  onSave: (book: Omit<Book, "bookId"> | Book) => void;
  onClose: () => void;
  initialData?: Book;
};

export function AddBookForm({ onSave, onClose, initialData }: AddBookFormProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      bookTitle: "",
      class: "",
      price: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    } else {
      form.reset({
        bookTitle: "",
        class: "",
        price: 0,
      });
    }
  }, [initialData, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (initialData) {
        onSave({ ...initialData, ...values });
    } else {
        onSave(values);
    }
    onClose();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="bookTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Book Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mathematics 1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="class"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Class</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? CLASS_ORDER.find(c => c === field.value)
                        : "Select a class"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" portalled={false}>
                  <Command>
                    <CommandInput placeholder="Search class..." />
                    <CommandEmpty>No class found.</CommandEmpty>
                    <CommandList>
                        {CLASS_CATEGORIES.map((group) => (
                            <CommandGroup key={group.label} heading={group.label}>
                                {group.options.map((option) => (
                                    <CommandItem
                                        key={option}
                                        value={option}
                                        onSelect={(currentValue) => {
                                            form.setValue("class", currentValue === field.value ? "" : currentValue);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                option === field.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                        />
                                        {option}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {initialData ? 'Save Changes' : 'Add Book'}
        </Button>
      </form>
    </Form>
  );
}
