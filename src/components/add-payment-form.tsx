
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Student, Book, AcademicYear, Payment } from "@/lib/data";
import { formatCurrency, cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const formSchema = z.object({
  studentId: z.string({ required_error: "Please select a student." }).min(1, "Please select a student."),
  academicYearId: z.string({ required_error: "Please select an academic year." }).min(1, "Please select an academic year."),
  bookIds: z.array(z.string()).min(1, "Please select at least one book."),
  amountPaid: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(['Cash', 'Mobile Money', 'Bank Transfer']),
});

type AddPaymentFormProps = {
  students: Student[];
  books: Book[];
  academicYears: AcademicYear[];
  payments: Payment[];
  onAddPayment: (data: { studentId: string, bookIds: string[], amountPaid: number, method: 'Cash' | 'Mobile Money' | 'Bank Transfer', academicYearId: string }) => void;
  onClose: () => void;
};

export function AddPaymentForm({ students, books, academicYears, payments, onAddPayment, onClose }: AddPaymentFormProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      academicYearId: academicYears[0]?.academicYearId || "",
      bookIds: [],
      amountPaid: "" as any,
      method: "Cash",
    },
  });

  const selectedStudentId = form.watch("studentId");
  
  const student = React.useMemo(() => {
    return students.find(s => s.studentId === selectedStudentId);
  }, [selectedStudentId, students]);

  const studentBooksWithBalance = React.useMemo(() => {
    if (!student) return [];
    
    // Books for student's current class
    const currentClassBooks = books.filter(b => b.class === student.class);

    // Books with existing payments (from any year)
    const booksWithPayments = books.filter(book =>
        payments.some(p =>
            p.studentId === student.studentId &&
            p.bookId === book.bookId
        )
    );

    // Combine and get unique books
    const relevantBooks = [...new Map([...currentClassBooks, ...booksWithPayments].map(item => [item.bookId, item])).values()];

    return relevantBooks
        .map(book => {
            // Calculate total paid across ALL academic years
            const paymentsForBook = payments.filter(p =>
                p.studentId === student.studentId &&
                p.bookId === book.bookId
            );
            const totalPaidForBook = paymentsForBook.reduce((sum, p) => sum + p.amountPaid, 0);
            const balance = book.price - totalPaidForBook;
            return { ...book, balance };
        })
        .filter(book => book.balance > 0) // Only show books that actually have an outstanding balance
        .sort((a,b) => a.bookTitle.localeCompare(b.bookTitle));

  }, [student, books, payments]);


  const selectedBookIds = form.watch("bookIds") || [];
  const totalBalanceForSelectedBooks = React.useMemo(() => {
      return studentBooksWithBalance
          .filter(book => selectedBookIds.includes(book.bookId))
          .reduce((total, book) => total + book.balance, 0);
  }, [selectedBookIds, studentBooksWithBalance]);
  
  React.useEffect(() => {
    form.resetField("bookIds");
    form.resetField("amountPaid");
  }, [selectedStudentId, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddPayment(values);
    onClose();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Student</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? students.find(
                            (student) => student.studentId === field.value
                          )?.studentName
                        : "Select a student"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" portalled={false} side="bottom" align="start">
                  <Command>
                    <CommandInput placeholder="Search student..." />
                    <CommandList>
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {students.map((student) => (
                          <CommandItem
                            key={student.studentId}
                            onSelect={() => {
                              form.setValue("studentId", student.studentId)
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                student.studentId === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {student.studentName} - {student.class}
                          </CommandItem>
                        ))}
                      </CommandGroup>
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
          name="academicYearId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Academic Year</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an academic year" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year.academicYearId} value={year.academicYearId}>
                      {year.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {student && (
          <>
            <FormField
              control={form.control}
              name="bookIds"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel>Outstanding Books for {student.studentName}</FormLabel>
                    <FormDescription>
                      Select the books for this payment.
                    </FormDescription>
                  </div>
                  <div className="rounded-md border">
                    <div className="p-4 space-y-2 max-h-[150px] overflow-y-auto">
                      {studentBooksWithBalance.length > 0 ? studentBooksWithBalance.map((book) => (
                        <FormField
                          key={book.bookId}
                          control={form.control}
                          name="bookIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={book.bookId}
                                className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 has-[:checked]:bg-muted/50"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(book.bookId)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), book.bookId])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== book.bookId
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal flex justify-between w-full cursor-pointer">
                                  <span>{book.bookTitle} ({book.class})</span>
                                  <div className="flex items-center gap-x-4">
                                    <span className="text-destructive font-medium">{formatCurrency(book.balance)} due</span>
                                    <span className="text-muted-foreground">{formatCurrency(book.price)}</span>
                                  </div>
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">This student has no outstanding book payments.</p>
                      )}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedBookIds.length > 0 && (
              <div className="rounded-md border bg-muted p-3 text-sm">
                  <div className="flex justify-between font-semibold">
                      <span>Total Balance for Selected Books</span>
                      <span>{formatCurrency(totalBalanceForSelectedBooks)}</span>
                  </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="amountPaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      placeholder={formatCurrency(0)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" className="w-full" disabled={!student}>
          Record Payment
        </Button>
      </form>
    </Form>
  );
}
