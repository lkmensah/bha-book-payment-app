"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BookIcon } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

const formSchema = z.object({
  studentId: z.string().min(1, "Student ID is required."),
});

export default function ParentLookupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
        toast({ variant: "destructive", title: "Error", description: "System not ready. Please try again." });
        return;
    }
    setIsSubmitting(true);

    try {
        const studentRef = doc(firestore, "students", values.studentId.trim());
        const studentSnap = await getDoc(studentRef);

        if (studentSnap.exists()) {
            router.push(`/pay/${values.studentId.trim()}`);
        } else {
            toast({
                variant: "destructive",
                title: "Student Not Found",
                description: "The Student ID you entered does not exist. Please check and try again.",
            });
        }
    } catch (error) {
        console.error("Error verifying student ID:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "An error occurred while verifying the student ID.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <BookIcon className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Parent Payment Portal</CardTitle>
          <CardDescription>
            Enter your child&apos;s Student ID to view and pay for outstanding books.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Student ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "View Balances"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
