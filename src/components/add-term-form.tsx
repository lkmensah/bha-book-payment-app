"use client";

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
import type { AcademicYear } from "@/lib/data";

const formSchema = z.object({
  year: z.string().regex(/^\d{4}\/\d{4}$/, "Academic year must be in YYYY/YYYY format"),
});

type AddAcademicYearFormProps = {
  onAddAcademicYear: (academicYear: Omit<AcademicYear, "academicYearId">) => void;
  onClose: () => void;
};

export function AddAcademicYearForm({ onAddAcademicYear, onClose }: AddAcademicYearFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddAcademicYear(values);
    onClose();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Academic Year</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 2024/2025" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Add Academic Year
        </Button>
      </form>
    </Form>
  );
}
